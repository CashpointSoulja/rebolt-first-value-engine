import { CHANNELS, EVENTS, SEGMENTS } from './types';
import { parseTimestamp } from './dataset';
import { validateSettings } from './metrics';
import type {
  Analysis, Experiment, MetricSettings, Outcome, PlanInput, PlanResult,
  SegmentResult, UTMInput, UTMResult,
} from './types';

const METRIC_VERSION = 'synthetic-first-value-metric/1';
const MILESTONE_VERSION = 'synthetic-first-value-verified/1';
const CONTROLS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const FORMULA = /^[\s\p{Cc}\p{Cf}]*[=+\-@]/u;
const SYNTHETIC_ID = /(?:syn|evt)_[a-z0-9_-]+/i;
const URL_IN_TEXT = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:https?|javascript|data|mailto|tel):|www\.|\b[a-z0-9-]+\.(?:[a-z]{2,24})(?:\b|\/))/i;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const SYNTHETIC_NOTICE = 'Synthetic demonstration only; not customer performance or Rebolt benchmarks.';
const PRIORITY_NOTICE = 'Ordinal heuristic only; no significance, causal attribution, expected uplift or ROI. Stages are observed reached-counts, not a sequential funnel.';

function count(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function impactFor(affected: number, denominator: number): 1 | 2 | 3 {
  return affected === 0 ? 1 : affected * 2 >= denominator ? 3 : 2;
}

/** Reversible proposals, never a claim that an observed count establishes a cause. */
export function rankExperiments(analysis: Analysis): Experiment[] {
  const D = count(analysis.D);
  const U = Math.min(count(analysis.U), D);
  if (D === 0) {
    return [{
      id: 'define-evidence', title: 'Needs definition and mature evidence',
      hypothesis: 'Defining the synthetic milestone and observation coverage could make a later experiment assessable.',
      audience: 'Synthetic cohort awaiting an eligible mature denominator.',
      action: 'Propose a local milestone and coverage review. Do not promote or launch a campaign.',
      impact: 1, confidence: 1, effort: 1, score: 1,
      rationale: {
        impact: 'D=0: no assessable mature population; convenience-level definition work only.',
        confidence: 'D=0: no mature outcome evidence; the hypothesis remains an assumption.',
        effort: `D=0 with ${count(analysis.population.pending)} pending units: one reversible local definition review.`,
      },
      evidence: 'D=0; rate, bounds and coverage are not estimable. Priority is gated on definition and mature evidence.',
      guardrails: 'Synthetic data only. No campaign promotion, external contact or operational action.',
      stopCriteria: 'Stop if a milestone, eligible cohort or trusted observation cutoff cannot be defined.',
      successCriteria: 'A versioned milestone, declared coverage and at least one eligible mature synthetic unit permit reassessment.',
    }];
  }

  const reached = (name: typeof EVENTS[number]) =>
    Math.min(count(analysis.stages.find(stage => stage.name === name)?.count ?? 0), D);
  const qualified = reached('qualified_lead');
  const setup = reached('pilot_setup');
  const use = reached('first_use');
  const N = Math.min(count(analysis.N), D);
  const evidence = `Synthetic mature population: N=${N}, D=${D}, U=${U}, F=${count(analysis.F)}. Qualified=${qualified}/${D}; setup=${setup}/${D}; first use=${use}/${D}. Counts do not establish ordering, individual transitions or causality.`;

  type Draft = Omit<Experiment, 'confidence' | 'score' | 'evidence'>;
  const draft = (
    id: string, title: string, hypothesis: string, audience: string, action: string,
    affected: number, affectedLabel: string, effort: 1 | 2 | 3, effortReason: string,
    successCriteria: string,
  ): Draft => ({
    id, title, hypothesis, audience, action,
    impact: impactFor(affected, D), effort,
    rationale: {
      impact: `${affected}/${D} mature units ${affectedLabel}. Proposed scope rubric: none=1, below half=2, at least half=3; not demonstrated business impact.`,
      confidence: `1: synthetic N=${N}, D=${D}, U=${U}; observed counts support a research question, not a validated behavioral hypothesis.`,
      effort: `${effort}: ${effortReason} Review scope is ${D} mature synthetic units with ${U} unknown outcomes; effort is an assumption, not measured labor.`,
    },
    guardrails: 'Local synthetic rehearsal only. Preserve the cohort and unknown outcomes; no outreach, billing, integrations or aircraft operational decisions.',
    stopCriteria: 'Stop if evidence cannot be recorded without private data, if definitions drift or if proposed work crosses the local synthetic boundary.',
    successCriteria,
  });
  const drafts: Draft[] = [
    draft(
      'qualification-pilot', 'Qualification-to-pilot handoff',
      'A reversible use-case and pilot-readiness checklist could clarify the next step for qualified synthetic accounts.',
      'Eligible synthetic accounts in the selected signup-time segment and channel; inspect qualification and pilot setup separately.',
      'Propose a local pilot-readiness checklist with a use case, role owner and explicit setup next step; withdraw the checklist after review.',
      D - setup, 'have no observed pilot setup', 2,
      'Checklist definition and a handoff rehearsal are two reversible steps.',
      'Record pilot_setup reached-counts against the same mature denominator and separately inspect qualified_lead evidence; require definition review before any later trial.',
    ),
    draft(
      'setup-use', 'Setup-to-first-use rehearsal',
      'A short first-use checklist could clarify the transition from a configured synthetic pilot to a meaningful initial use.',
      'Eligible synthetic accounts in the selected signup-time population; setup is not assumed to imply first use.',
      'Propose a removable first-use checklist and rehearse it locally on a synthetic use case.',
      D - use, 'have no observed first use', 1,
      'One removable checklist is a small reversible intervention.',
      'Inspect first_use reached-counts against the fixed mature denominator, preserving unknown outcomes and keeping first use distinct from verified value.',
    ),
    draft(
      'use-evidence', 'Use-to-evidenced-value review',
      'A structured result-and-evidence prompt could clarify whether a synthetic first use satisfies the proposed value milestone.',
      'Eligible synthetic accounts in the selected signup-time population; first use alone is not verified value.',
      'Propose a removable result-completeness prompt plus a review of the hypothetical evidence category.',
      D - N, 'lack confirmed first value, including unknown outcomes', 2,
      'Prompt design and evidence review are separate reversible steps.',
      'Review first_value_verified only with resultComplete=true and a permitted evidence category; show N, D, U, F and bounds without a performance claim.',
    ),
    draft(
      'completeness-repair', 'Repair outcome completeness before interpreting gaps',
      'A local coverage audit could resolve ambiguous synthetic outcomes without treating missing evidence as failure.',
      'Selected synthetic cohort, prioritizing unknown outcomes while retaining the entire mature denominator.',
      'Propose an audit of coverage and milestone evidence in a copy of the synthetic fixture; never mark coverage complete without supporting evidence.',
      U, 'have unknown outcomes', 1,
      'One local coverage audit is reversible and does not change campaign behavior.',
      'Reconcile D=N+U+F; resolve unknown evidence only when supported and retain the original cohort and audit notes.',
    ),
  ];
  // Stable identifier is a display tie-break only; equal scores still need manual review.
  return drafts.map(item => ({
    ...item, confidence: 1 as const, score: item.impact / item.effort,
    evidence: `${evidence} ${PRIORITY_NOTICE} Equal scores require manual review.`,
  })).sort((a, b) => b.score - a.score || a.effort - b.effort || (a.id < b.id ? -1 : 1));
}

function decoded(value: string): string | null {
  let result = value.normalize('NFKC');
  for (let pass = 0; pass < 4; pass++) {
    if (!/%[0-9a-f]{2}/i.test(result)) return result;
    try {
      result = decodeURIComponent(result).normalize('NFKC');
    } catch {
      return null;
    }
  }
  return /%[0-9a-f]{2}/i.test(result) ? null : result;
}

function hasPrivateData(value: string, identifiers: string[] = []): boolean {
  if (value.includes('@') || SYNTHETIC_ID.test(value)) return true;
  if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(value)) return true;
  if (/\b[0-9a-f]{24,}\b/i.test(value)) return true;
  // Catch recognizable credential snippets even when hidden in a harmless
  // query value or a free-text plan field. These are conservative guards, not
  // a guarantee that arbitrary prose contains no private information.
  if (/\b(?:bearer|basic)\s+[a-z0-9+/_=-]{8,}/i.test(value)) return true;
  for (const match of value.matchAll(/([\p{L}][\p{L}\p{N}_.-]{0,48})["']?\s*[:=](?=\s*\S)/gu)) {
    if (sensitiveKey(match[1])) return true;
  }
  // Rooted filesystem paths have no role in synthetic campaign/plan text.
  if (/(?:^|[\s"'=(])(?:[a-z]:[\\/]|~[\\/]|\\\\|\/[^\s/])/i.test(value)) return true;
  const phoneCandidates = value.match(/\+?\p{Nd}[\p{Nd}\s()./\p{Pd}]{5,}\p{Nd}/gu) ?? [];
  if (phoneCandidates.some(candidate => (candidate.match(/\p{Nd}/gu)?.length ?? 0) >= 7)) return true;
  const lower = value.toLowerCase();
  return identifiers.some(identifier => {
    const normalized = decoded(identifier);
    return normalized !== null && normalized.length > 0 && lower.includes(normalized.toLowerCase());
  });
}

function unsafeText(value: string, identifiers: string[] = []): boolean {
  const normalized = decoded(value);
  return normalized === null || CONTROLS.test(normalized) || /[<>]/.test(normalized)
    || /&(?:lt|gt|#\d+|#x[0-9a-f]+);/i.test(normalized)
    || hasPrivateData(normalized, identifiers);
}

function sensitiveKey(key: string): boolean {
  const normalized = decoded(key);
  if (normalized === null) return true;
  const compact = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
  return /(?:email|phone|mobile|contact|address|password|passwd|secret|token|credential|auth|session|cookie|apikey|accesskey|privatekey|account|customer|identifier|username|firstname|lastname|fullname)/.test(compact)
    || /^(?:id|uid|user|name|fname|lname|first|last|key|code|otp|pin|jwt|login|person|client|recipient|tel|ssn|dob|signature|sig|gclid|fbclid|msclkid)$/.test(compact)
    || /(?:user|person|client|visitor|device|tracking|campaign|recipient)id$/.test(compact);
}

function publicLookingHost(hostname: string): boolean {
  // No DNS lookup is performed. Require a domain-shaped host, not an IP literal,
  // single-label intranet address, or recognizable local/private suffix.
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host.includes('.') && !/^\d+(?:\.\d+){3}$/.test(host)
    && !/(?:^|\.)(?:localhost|local|internal|intranet|lan|home|corp)$/.test(host)
    && host.length <= 253
    && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function checkedURL(destination: string): { url: URL | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof destination !== 'string' || !destination || destination.length > 2048
      || /\s|\\/.test(destination) || unsafeText(destination)) {
    return { url: null, errors: ['Destination must be a bounded public URL without private data, markup or control characters.'] };
  }
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return { url: null, errors: ['Destination must be an absolute http or https URL.'] };
  }
  if (!['http:', 'https:'].includes(url.protocol) || !/^https?:\/\//i.test(destination) || !url.hostname) {
    errors.push('Only absolute http and https destinations are allowed.');
  }
  if (!publicLookingHost(url.hostname)) errors.push('Destination must use a public-looking domain, not a local host or IP address.');
  if (url.username || url.password) errors.push('Destination credentials are not allowed.');
  const path = decoded(url.pathname);
  const pathParts = path?.split('/').filter(Boolean) ?? [];
  if (pathParts.slice(0, -1).some(sensitiveKey)) {
    errors.push('Destination path must not contain identity or credential fields.');
  }
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    const normalizedKey = decoded(key)?.toLowerCase() ?? '';
    if (seen.has(normalizedKey)) errors.push('Duplicate query parameters are not allowed.');
    seen.add(normalizedKey);
    if (normalizedKey !== key.normalize('NFKC').toLowerCase()
        || ((UTM_KEYS as readonly string[]).includes(normalizedKey) && key.toLowerCase() !== normalizedKey)) {
      errors.push('Query keys must not use nested encoding or disguised UTM names.');
    }
    if (sensitiveKey(key) || unsafeText(value) || unsafeText(key) || URL_IN_TEXT.test(decoded(value) ?? '')) {
      errors.push('Query parameters must not contain sensitive keys or private data.');
    }
  }
  // Hashes may carry client-side query parameters; apply the same policy there.
  const hash = decoded(url.hash.slice(1));
  if (hash === null) errors.push('Destination fragment is invalid.');
  else {
    const hashParams = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
    if (hashParams.includes('=')) {
      const hashSeen = new Set<string>();
      for (const [key, value] of new URLSearchParams(hashParams)) {
        const normalizedKey = decoded(key)?.toLowerCase() ?? '';
        if (hashSeen.has(normalizedKey)) errors.push('Duplicate fragment parameters are not allowed.');
        hashSeen.add(normalizedKey);
        if ((UTM_KEYS as readonly string[]).includes(normalizedKey)) {
          errors.push('UTM parameters belong in the query, not an ambiguous fragment.');
        }
        if (sensitiveKey(key) || unsafeText(value) || unsafeText(key) || URL_IN_TEXT.test(decoded(value) ?? '')) {
          errors.push('Fragment parameters must not contain sensitive keys or private data.');
        }
      }
    }
  }
  return { url: errors.length ? null : url, errors: [...new Set(errors)] };
}

/** Constructs a string locally. No navigation or network operation occurs. */
export function buildUTM(input: UTMInput): UTMResult {
  const { url, errors } = checkedURL(input.destination);
  const values = [input.source, input.medium, input.campaign, input.content, input.term];
  const labels = ['Source', 'Medium', 'Campaign', 'Content', 'Term'];
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.length > 100 || (index < 3 && !value.trim())
        || unsafeText(value) || URL_IN_TEXT.test(decoded(value) ?? '')) {
      errors.push(`${labels[index]} must be bounded campaign text without URLs, markup, controls or private data.`);
    }
  });
  if (!url || errors.length) return { ok: false, url: '', errors };
  UTM_KEYS.forEach((key, index) => {
    const value = values[index].trim();
    const existingKey = [...url.searchParams.keys()].find(candidate => decoded(candidate)?.toLowerCase() === key);
    if (existingKey && value && url.searchParams.get(existingKey) !== value) {
      errors.push('Existing UTM values conflict with the requested campaign fields.');
    } else if (!existingKey && value) {
      url.searchParams.append(key, value);
    }
  });
  if (url.toString().length > 2048) errors.push('Constructed campaign URL exceeds the 2048-character limit.');
  return errors.length
    ? { ok: false, url: '', errors: [...new Set(errors)] }
    : { ok: true, url: url.toString(), errors: [] };
}

/** Always quote cells; prefix dangerous formulas even behind whitespace or controls. */
export function safeCsvCell(value: string): string {
  const protectedValue = FORMULA.test(value.normalize('NFKC')) ? `'${value}` : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function validOutcome(outcome: Outcome): boolean {
  const { N, D, U, F, coverage, lower, upper, rate, medianHours } = outcome;
  if (![N, D, U, F].every(value => Number.isSafeInteger(value) && value >= 0) || N + U + F !== D) return false;
  const equal = (actual: number | null, expected: number | null) =>
    expected === null ? actual === null : typeof actual === 'number' && Math.abs(actual - expected) < 1e-10;
  return equal(coverage, D ? (D - U) / D : null)
    && equal(lower, D ? N / D : null) && equal(upper, D ? (N + U) / D : null)
    && equal(rate, D && U === 0 ? N / D : null)
    && (N === 0 ? medianHours === null : medianHours !== null && Number.isFinite(medianHours) && medianHours >= 0);
}

function validBreakdown(rows: SegmentResult[], keys: readonly string[], analysis: Analysis): boolean {
  if (new Set(rows.map(row => row.key)).size !== rows.length) return false;
  if (!rows.every(row => keys.includes(row.key) && validOutcome(row)
      && Number.isSafeInteger(row.pending) && row.pending >= 0)) return false;
  return (['N', 'D', 'U', 'F'] as const).every(key =>
    rows.reduce((sum, row) => sum + row[key], 0) === analysis[key])
    && rows.reduce((sum, row) => sum + row.pending, 0) === analysis.population.pending;
}

function validAnalysis(analysis: Analysis): boolean {
  const population = analysis.population;
  const partitions = [
    population.outOfCohort, population.excluded, population.eligibilityUnknown,
    population.mature, population.pending, population.maturityUnknown,
  ];
  return validOutcome(analysis)
    && ['signups', 'events'].every(table => {
      const row = analysis.rowPartitions?.[table as 'signups' | 'events'];
      return row && [row.received, row.accepted, row.duplicates, row.quarantined]
        .every(value => Number.isSafeInteger(value) && value >= 0)
        && row.received === row.accepted + row.duplicates + row.quarantined;
    })
    && [population.total, ...partitions].every(value => Number.isSafeInteger(value) && value >= 0)
    && partitions.reduce((sum, value) => sum + value, 0) === population.total
    && population.mature === analysis.D
    && analysis.stages.length === EVENTS.length
    && new Set(analysis.stages.map(stage => stage.name)).size === EVENTS.length
    && analysis.stages.every(stage => EVENTS.includes(stage.name)
      && Number.isSafeInteger(stage.count) && stage.count >= 0 && stage.count <= analysis.D
      && stage.denominator === analysis.D)
    && validBreakdown(analysis.segments, SEGMENTS, analysis)
    && validBreakdown(analysis.channels, CHANNELS, analysis);
}

function boundedPlanText(value: string, max: number, identifiers: string[]): boolean {
  if (typeof value !== 'string' || !value.trim() || value.length > max || unsafeText(value, identifiers)) return false;
  const normalized = decoded(value);
  return normalized !== null && !FORMULA.test(normalized) && !URL_IN_TEXT.test(normalized);
}

function outcomeFields(outcome: Outcome) {
  return {
    N: outcome.N, D: outcome.D, U: outcome.U, F: outcome.F,
    lowerBound: outcome.lower, upperBound: outcome.upper,
    coverage: outcome.coverage, definitiveRate: outcome.rate,
  };
}

function breakdownFields(rows: SegmentResult[], keys: readonly string[]) {
  // Only shared enum keys are exported. Imported labels and arbitrary extra properties are never copied.
  return keys.flatMap(key => {
    const row = rows.find(candidate => candidate.key === key);
    return row ? [{
      key, ...outcomeFields(row), pending: row.pending,
      converterOnlyMedianHours: row.medianHours,
    }] : [];
  });
}

function aggregateId(value: unknown): string {
  // Deliberately hashes aggregates, not raw IDs or datasetId; not a security/content fingerprint.
  let hash = 2166136261;
  for (const character of JSON.stringify(value)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return `aggregate-v1-${hash.toString(16).padStart(8, '0')}`;
}

function asCsv(plan: object): string {
  const rows: string[][] = [['field', 'value']];
  const visit = (value: unknown, path: string) => {
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);
      if (!entries.length) rows.push([path, Array.isArray(value) ? '[]' : '{}']);
      else entries.forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    } else {
      rows.push([path, value === null ? 'null' : String(value)]);
    }
  };
  visit(plan, '');
  return rows.map(row => row.map(safeCsvCell).join(',')).join('\r\n') + '\r\n';
}

/** Exported output is an inert, aggregate-only proposal, reproducible without a clock. */
export function exportPlan(
  analysis: Analysis, settings: MetricSettings, experiment: Experiment,
  input: PlanInput, identifiers: string[],
): PlanResult {
  const errors: string[] = [];
  if (!validAnalysis(analysis)) errors.push('Analysis partitions, outcome arithmetic or category definitions are invalid.');
  if (validateSettings(settings).length) errors.push('Metric settings are invalid.');
  if ((!settings.assumeComplete && analysis.F > 0)
      || (settings.segment !== 'all' && analysis.segments.some(row => row.key !== settings.segment && (row.D > 0 || row.pending > 0)))
      || (settings.channel !== 'all' && analysis.channels.some(row => row.key !== settings.channel && (row.D > 0 || row.pending > 0)))) {
    errors.push('Analysis and selected filters or completeness settings do not match. Recalculate before export.');
  }
  // Exact event membership is validated before timing becomes a floating-point
  // summary; allow equality here because a subsecond value can round to W.
  if ([analysis, ...analysis.segments, ...analysis.channels].some(row =>
    row.medianHours !== null && row.medianHours > settings.windowDays * 24)) {
    errors.push('Converter timing is outside the selected observation window. Recalculate before export.');
  }
  const fields = [
    ['owner', 'Owner', 80], ['hypothesis', 'Hypothesis', 600],
    ['guardrails', 'Guardrails', 600], ['stopCriteria', 'Stop criteria', 600],
    ['successCriteria', 'Success criteria', 600],
  ] as const;
  for (const [key, label, maximum] of fields) {
    if (!boundedPlanText(input[key], maximum, identifiers)) {
      errors.push(`${label} must be nonempty bounded text without private data, identifiers, URLs, markup, controls or formulas.`);
    }
  }
  const expected = rankExperiments(analysis).find(candidate => candidate.id === experiment.id);
  if (!expected || !(Object.keys(expected) as (keyof Experiment)[]).every(key =>
    key === 'rationale'
      ? (['impact', 'confidence', 'effort'] as const).every(factor => expected.rationale[factor] === experiment.rationale?.[factor])
      : expected[key] === experiment[key])) {
    errors.push('Select an unchanged experiment from the current analysis ranking.');
  }
  let campaignUrl: string | null = null;
  if (input.campaignUrl) {
    const checked = checkedURL(input.campaignUrl);
    const normalized = decoded(input.campaignUrl);
    if (!checked.url || normalized === null || hasPrivateData(normalized, identifiers)) {
      errors.push('Campaign URL must pass public destination and privacy validation.');
    } else {
      campaignUrl = checked.url.toString();
    }
    if (analysis.D === 0) errors.push('Campaign URLs are not allowed until a mature denominator is defined.');
  }
  if (errors.length || !expected) return { ok: false, json: '', csv: '', errors };

  const population = {
    total: analysis.population.total, outOfCohort: analysis.population.outOfCohort,
    excluded: analysis.population.excluded, eligibilityUnknown: analysis.population.eligibilityUnknown,
    mature: analysis.population.mature, pending: analysis.population.pending,
    maturityUnknown: analysis.population.maturityUnknown,
  };
  const observations = {
    cohortStart: parseTimestamp(settings.cohortStart)!.iso,
    cohortEndExclusive: parseTimestamp(settings.cohortEnd)!.iso,
    cutoff: parseTimestamp(settings.cutoff)!.iso, timezone: 'UTC',
    windowDays: settings.windowDays,
    windowRule: 'Half-open [signup, signup + window); only events observed by the cutoff qualify.',
    demonstrationWindowNotice: 'Demonstrative window, not Rebolt four-to-six-week pilot guidance.',
  };
  const selection = { segment: settings.segment, channel: settings.channel, attributes: 'Frozen signup-time fields, including unknowns.' };
  const outcomes = {
    ...outcomeFields(analysis),
    status: analysis.D === 0 ? 'not_estimable' : analysis.U > 0 ? 'bounded_unknown_outcomes' : 'definitive_within_synthetic_contract',
    partitionRule: 'D=N+U+F; F is confirmed non-converters, never unknown outcomes.',
    coverageRule: '(D-U)/D; null when D=0.',
    boundsRule: 'N/D through (N+U)/D; null when D=0. Overall rate is definitive only when U=0 and D>0.',
  };
  const stages = EVENTS.map(name => {
    const stage = analysis.stages.find(candidate => candidate.name === name)!;
    return { name, reached: stage.count, denominator: stage.denominator };
  });
  const breakdowns = {
    segments: breakdownFields(analysis.segments, SEGMENTS),
    channels: breakdownFields(analysis.channels, CHANNELS),
  };
  const aggregate = {
    population, outcomes, stages, breakdowns, converterOnlyMedianHours: analysis.medianHours,
    observations, selection, assumeComplete: settings.assumeComplete,
  };
  const plan = {
    planVersion: 'synthetic-activation-plan/1', status: 'proposed_not_executed',
    syntheticNotice: SYNTHETIC_NOTICE,
    credit: 'Independent concept by Ayo Ahmed',
    nonAffiliation: 'Not affiliated with or endorsed by Rebolt.',
    dataBoundary: 'Local-only synthetic planning; no upload, URL visit, campaign launch, integration or operational write-back.',
    dataset: {
      identifier: aggregateId(aggregate),
      identifierBasis: 'Selected aggregates and metric settings only; not a raw-dataset fingerprint or unique source identity.',
      rowPartitions: {
        status: 'reconciled',
        scope: 'Whole imported dataset, before cohort and attribute filters.',
        ...Object.fromEntries((['signups', 'events'] as const).map(table => {
          const row = analysis.rowPartitions[table];
          return [table, { received: row.received, accepted: row.accepted,
            duplicates: row.duplicates, quarantined: row.quarantined }];
        })),
        expectedRule: 'For each table: received=accepted+duplicates+quarantined.',
      },
    },
    metric: {
      version: METRIC_VERSION, unit: 'synthetic account', denominator: 'All eligible mature units in the selected cohort.',
      milestone: {
        version: MILESTONE_VERSION, event: 'first_value_verified', resultComplete: true,
        permittedEvidence: ['time_saved', 'rework_reduced', 'outcome_confirmed'],
        evidenceNotice: 'Hypothetical categories only, not measured amounts or customer outcomes.',
      },
      maturityRule: 'Full window elapsed at cutoff. Maturity is independent of outcome completeness.',
      completeness: {
        assumeComplete: settings.assumeComplete,
        policy: 'The active setting and per-unit coverage determine whether absent outcomes can be known; incomplete or uncertain evidence remains unknown.',
        unknownOutcomes: analysis.U,
      },
    },
    selection, observations, population, outcomes,
    stages: { interpretation: 'Observed reached-counts against D; not guaranteed monotonic conversion or causal ratios.', counts: stages },
    breakdowns,
    timing: {
      label: 'Median time to first value among confirmed converters only.',
      medianHours: analysis.medianHours, confirmedConverters: analysis.N,
      pending: population.pending, confirmedNonConverters: analysis.F,
      unknownOutcomes: analysis.U, maturityUnknown: population.maturityUnknown,
    },
    experiment: {
      id: expected.id, title: expected.title,
      hypothesis: input.hypothesis.trim(), audience: expected.audience,
      evidence: expected.evidence,
      priorityStatus: analysis.D === 0 ? 'needs_definition_and_evidence' : 'hypothesis_for_review',
      scoreInputs: {
        impact: { value: expected.impact, rationale: expected.rationale.impact },
        confidence: { value: expected.confidence, rationale: expected.rationale.confidence },
        effort: { value: expected.effort, rationale: expected.rationale.effort },
      },
      score: expected.score,
      scoreMath: `${expected.impact} * ${expected.confidence} / ${expected.effort} = ${expected.score}`,
      scoreNotice: PRIORITY_NOTICE,
      owner: input.owner.trim(), guardrails: input.guardrails.trim(),
      mandatoryGuardrails: expected.guardrails,
      stopCriteria: input.stopCriteria.trim(), successCriteria: input.successCriteria.trim(),
      action: expected.action, campaignUrl,
    },
  };
  return { ok: true, json: JSON.stringify(plan, null, 2) + '\n', csv: asCsv(plan), errors: [] };
}
