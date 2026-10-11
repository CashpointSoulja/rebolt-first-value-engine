import { compareTimestamps, parseTimestamp, type Timestamp } from './dataset';
import {
  CHANNELS, EVENTS, SEGMENTS,
  type Analysis, type Dataset, type Event, type MetricSettings, type Outcome,
  type Population, type SegmentResult, type Signup,
} from './types';

const labels: Record<string, string> = {
  enterprise: 'Enterprise', mid_market: 'Mid-market', small_business: 'Small business',
  unknown: 'Unknown', organic: 'Organic', paid_search: 'Paid search',
  partner: 'Partner', outbound: 'Outbound',
  qualified_lead: 'Qualified lead', pilot_setup: 'Pilot setup',
  first_use: 'First use', first_value_verified: 'Verified first value',
};
const valueEvidence = new Set(['time_saved', 'rework_reduced', 'outcome_confirmed']);

export function validateSettings(settings: MetricSettings): string[] {
  const errors: string[] = [];
  const start = parseTimestamp(settings.cohortStart);
  const end = parseTimestamp(settings.cohortEnd);
  const cutoff = parseTimestamp(settings.cutoff);
  if (!start) errors.push('Cohort start must be a valid RFC3339 instant with a known timezone offset.');
  if (!end) errors.push('Cohort end must be a valid RFC3339 instant with a known timezone offset.');
  if (!cutoff) errors.push('Observation cutoff must be a valid RFC3339 instant with a known timezone offset.');
  if (start && end && compareTimestamps(start, end) >= 0) errors.push('Cohort start must be before its exclusive end.');
  if (end && cutoff && compareTimestamps(end, cutoff) > 0) errors.push('Cohort end must not be after the observation cutoff.');
  if (!Number.isInteger(settings.windowDays) || settings.windowDays < 1 || settings.windowDays > 365) {
    errors.push('The observation window must be a whole number from 1 to 365 days.');
  }
  if (typeof settings.assumeComplete !== 'boolean') errors.push('The completeness assumption must be true or false.');
  if (settings.segment !== 'all' && !(SEGMENTS as readonly string[]).includes(settings.segment)) {
    errors.push('Segment filter must be a documented category or all.');
  }
  if (settings.channel !== 'all' && !(CHANNELS as readonly string[]).includes(settings.channel)) {
    errors.push('Channel filter must be a documented category or all.');
  }
  return errors;
}

interface Tally { D: number; N: number; U: number; pending: number; converterHours: number[] }
const tally = (): Tally => ({ D: 0, N: 0, U: 0, pending: 0, converterHours: [] });

function outcome(count: Tally): Outcome {
  const { N, D, U } = count;
  const hours = [...count.converterHours].sort((a, b) => a - b);
  const middle = Math.floor(hours.length / 2);
  return {
    N, D, U, F: D - N - U,
    coverage: D ? (D - U) / D : null,
    lower: D ? N / D : null,
    upper: D ? (N + U) / D : null,
    rate: D && U === 0 ? N / D : null,
    medianHours: hours.length ? (hours[(hours.length - 1) >> 1] + hours[middle]) / 2 : null,
  };
}

function results(groups: Map<string, Tally>): SegmentResult[] {
  return [...groups].map(([key, count]) => ({
    key, label: labels[key], ...outcome(count), pending: count.pending,
  }));
}

function completeValue(event: Event): boolean {
  return event.eventName === 'first_value_verified' && event.resultComplete === true
    && valueEvidence.has(event.valueEvidence);
}

function addWindow(start: Timestamp, days: number): Timestamp {
  return { ...start, seconds: start.seconds + days * 86400 };
}

/**
 * Analyze a snapshot without changing it or the caller's settings.
 * Invalid settings throw, so the caller must validate drafts before committing.
 * Population.total includes all unique signup units; attribute/date-filtered
 * units are counted in outOfCohort. Conflicting/undated units stay visible.
 */
export function analyze(dataset: Dataset, settings: MetricSettings): Analysis {
  const errors = validateSettings(settings);
  if (errors.length) throw new Error(errors.join(' '));
  const start = parseTimestamp(settings.cohortStart)!;
  const end = parseTimestamp(settings.cohortEnd)!;
  const cutoff = parseTimestamp(settings.cutoff)!;
  const population: Population = {
    total: 0, outOfCohort: 0, excluded: 0, eligibilityUnknown: 0,
    mature: 0, pending: 0, maturityUnknown: 0,
  };
  const overall = tally();
  const segments = new Map<string, Tally>(SEGMENTS.map(key => [key, tally()]));
  const channels = new Map<string, Tally>(CHANNELS.map(key => [key, tally()]));
  const stageCounts = new Map(EVENTS.map(name => [name, 0]));
  const uncertain = new Set(dataset.uncertainAccountIds);
  const signupMap = new Map<string, Signup | null>();
  for (const signup of dataset.signups) {
    if (!signupMap.has(signup.accountId)) signupMap.set(signup.accountId, signup);
    else if (JSON.stringify(signupMap.get(signup.accountId)) !== JSON.stringify(signup)) {
      signupMap.set(signup.accountId, null);
    }
  }
  for (const id of dataset.conflictingSignupIds) signupMap.set(id, null);
  const eventMap = new Map<string, Event[]>();
  for (const event of dataset.events) {
    const events = eventMap.get(event.accountId) ?? [];
    events.push(event);
    eventMap.set(event.accountId, events);
  }
  population.total = signupMap.size;

  for (const [id, signup] of signupMap) {
    const signupTime = signup && parseTimestamp(signup.signupAt);
    if (!signup || !signupTime) {
      population.maturityUnknown += 1;
      continue;
    }
    if (
      compareTimestamps(signupTime, start) < 0 || compareTimestamps(signupTime, end) >= 0
      || (settings.segment !== 'all' && signup.segment !== settings.segment)
      || (settings.channel !== 'all' && signup.channel !== settings.channel)
    ) {
      population.outOfCohort += 1;
      continue;
    }
    if (signup.eligibility === 'excluded') {
      population.excluded += 1;
      continue;
    }
    if (signup.eligibility !== 'eligible') {
      population.eligibilityUnknown += 1;
      continue;
    }
    const grouped = [
      overall, segments.get(signup.segment) ?? segments.get('unknown')!,
      channels.get(signup.channel) ?? channels.get('unknown')!,
    ];
    const windowEnd = addWindow(signupTime, settings.windowDays);
    if (compareTimestamps(windowEnd, cutoff) > 0) {
      population.pending += 1;
      for (const count of grouped) count.pending += 1;
      continue;
    }
    population.mature += 1;
    let earliest: Timestamp | null = null;
    let invalidObservation = false;
    const reached = new Set<Event['eventName']>();
    for (const event of eventMap.get(id) ?? []) {
      const time = parseTimestamp(event.eventAt);
      if (
        !time || compareTimestamps(time, signupTime) < 0
        || !(EVENTS as readonly string[]).includes(event.eventName)
        || (event.eventName === 'first_value_verified' && !completeValue(event))
      ) {
        invalidObservation = true;
        continue;
      }
      if (compareTimestamps(time, windowEnd) >= 0 || compareTimestamps(time, cutoff) > 0) continue;
      reached.add(event.eventName);
      if (completeValue(event) && (!earliest || compareTimestamps(time, earliest) < 0)) earliest = time;
    }
    for (const name of reached) stageCounts.set(name, stageCounts.get(name)! + 1);
    for (const count of grouped) {
      count.D += 1;
      // Quarantined/invalid evidence makes the affected diagnostic unit unknown,
      // even if another accepted observation appears to confirm value. Missing
      // coverage alone does not invalidate an otherwise confirmed converter.
      if (uncertain.has(id) || invalidObservation) {
        count.U += 1;
      } else if (earliest) {
        count.N += 1;
        const fractionalSeconds = Number(`0.${earliest.fraction || '0'}`) - Number(`0.${signupTime.fraction || '0'}`);
        count.converterHours.push((earliest.seconds - signupTime.seconds + fractionalSeconds) / 3600);
      } else if (!settings.assumeComplete || signup.coverage !== 'complete') {
        count.U += 1;
      }
    }
  }
  const notices = [
    'Synthetic accounts and hypothetical value-evidence categories only; not measured customer outcomes.',
    'Maturity uses elapsed time at the fixed cutoff. Outcome completeness is assessed separately.',
    'Stages are observed reached-counts against the mature denominator, not a monotonic funnel or causal ratios.',
    'The time-to-value median includes confirmed converters only, not pending, unknown, or non-converting units.',
    'The chosen observation window is demonstrative, not the four-to-six-week pilot advertised by Rebolt.',
  ];
  if (!settings.assumeComplete) notices.push('Completeness is not assumed: every unconfirmed mature outcome is unknown.');
  if (overall.U) notices.push('The overall conversion rate is not definitive; retain unknown outcomes and report bounds.');
  if (!overall.D) notices.push('No eligible mature units: rates, bounds, coverage, and median are not estimable.');
  if (population.maturityUnknown) notices.push('Conflicting or undated signup units remain in the unknown-maturity population.');
  if (settings.segment !== 'all' || settings.channel !== 'all') {
    notices.push('Out-of-cohort includes signup-time attribute-filter exclusions; unknown signup conflicts cannot be assigned to a filter.');
  }
  if (dataset.report.fatalErrors.length || dataset.report.issues.some(issue => issue.severity === 'error')) {
    notices.push('Diagnostic candidate only: validation errors block this dataset from becoming active.');
  }
  return {
    ...outcome(overall), population, datasetId: dataset.id, notices,
    rowPartitions: { signups: { ...dataset.report.signups }, events: { ...dataset.report.events } },
    stages: EVENTS.map(name => ({ name, label: labels[name], count: stageCounts.get(name)!, denominator: overall.D })),
    segments: results(segments), channels: results(channels),
  };
}
