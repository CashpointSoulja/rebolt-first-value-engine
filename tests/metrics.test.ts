import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { EVENT_HEADERS, importDataset, SIGNUP_HEADERS } from '../src/domain/dataset';
import { analyze, validateSettings } from '../src/domain/metrics';
import { invalidExampleCsv, loadSample } from '../src/domain/sample';
import { DEFAULT_SETTINGS, type Analysis, type Dataset, type Event, type MetricSettings, type Signup } from '../src/domain/types';

const signup = (id: string, changes: Partial<Signup> = {}): Signup => ({
  accountId: id, signupAt: '2026-09-01T00:00:00Z', eligibility: 'eligible',
  segment: 'enterprise', channel: 'organic', coverage: 'complete', ...changes,
});
const event = (accountId: string, changes: Partial<Event> = {}): Event => ({
  eventId: `evt_${accountId}`, accountId, eventAt: '2026-09-02T00:00:00Z',
  eventName: 'first_value_verified', resultComplete: true, valueEvidence: 'time_saved', ...changes,
});
const dataset = (signups: Signup[], events: Event[] = []): Dataset => ({
  id: 'synthetic_test_fixture', label: 'Synthetic test fixture', signups, events,
  uncertainAccountIds: [], conflictingSignupIds: [],
  report: {
    signups: { received: signups.length, accepted: signups.length, duplicates: 0, quarantined: 0 },
    events: { received: events.length, accepted: events.length, duplicates: 0, quarantined: 0 },
    issues: [], fatalErrors: [],
  },
});
function reconciles(analysis: Analysis) {
  const p = analysis.population;
  expect(p.total).toBe(p.outOfCohort + p.excluded + p.eligibilityUnknown + p.mature + p.pending + p.maturityUnknown);
  expect(analysis.D).toBe(p.mature);
  expect(analysis.N + analysis.U + analysis.F).toBe(analysis.D);
  for (const groups of [analysis.segments, analysis.channels]) {
    for (const key of ['N', 'D', 'U', 'F'] as const) {
      expect(groups.reduce((sum, group) => sum + group[key], 0)).toBe(analysis[key]);
    }
    expect(groups.reduce((sum, group) => sum + group.pending, 0)).toBe(p.pending);
  }
  for (const stage of analysis.stages) {
    expect(stage.denominator).toBe(analysis.D);
    expect(stage.count).toBeLessThanOrEqual(analysis.D);
  }
}

describe('measurement contract', () => {
  it('reproduces the required synthetic arithmetic and stage counts at fixed defaults', () => {
    const result = analyze(loadSample(), DEFAULT_SETTINGS);
    expect(result).toMatchObject({
      D: 10, N: 4, U: 2, F: 4, coverage: 0.8, lower: 0.4, upper: 0.6, rate: null, medianHours: 60,
      population: {
        total: 17, outOfCohort: 1, excluded: 2, eligibilityUnknown: 1,
        mature: 10, pending: 3, maturityUnknown: 0,
      },
    });
    expect(result.stages.map(stage => stage.count)).toEqual([8, 6, 5, 4]);
    expect(result.segments.find(group => group.key === 'unknown')?.D).toBe(2);
    expect(result.channels.find(group => group.key === 'unknown')?.D).toBe(2);
    reconciles(result);
  });

  it('does not mutate either dataset or settings while analyzing/filtering', () => {
    const data = loadSample();
    const settings = { ...DEFAULT_SETTINGS };
    const before = JSON.stringify({ data, settings });
    analyze(data, settings);
    analyze(data, { ...settings, segment: 'enterprise' });
    expect(JSON.stringify({ data, settings })).toBe(before);
  });

  it('treats all unconfirmed outcomes as unknown when completeness is not assumed', () => {
    const result = analyze(loadSample(), { ...DEFAULT_SETTINGS, assumeComplete: false });
    expect(result).toMatchObject({ D: 10, N: 4, U: 6, F: 0, coverage: 0.4, lower: 0.4, upper: 1, rate: null });
    reconciles(result);
  });

  it('uses a definitive overall rate only when all mature outcomes are known', () => {
    const result = analyze(dataset([signup('syn_one'), signup('syn_two')], [event('syn_one')]), DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 2, N: 1, U: 0, F: 1, coverage: 1, lower: 0.5, upper: 0.5, rate: 0.5 });
    reconciles(result);
  });

  it('keeps confirmed converters when only coverage is unknown', () => {
    const data = dataset([signup('syn_one', { coverage: 'unknown' })], [event('syn_one')]);
    const result = analyze(data, { ...DEFAULT_SETTINGS, assumeComplete: false });
    expect(result).toMatchObject({ D: 1, N: 1, U: 0, F: 0, coverage: 1, rate: 1 });
    reconciles(result);
  });

  it.each(['quarantined', 'invalid', 'both'])('keeps %s evidence unknown even alongside an accepted value event', reason => {
    const data = dataset([signup('syn_one')], [event('syn_one')]);
    if (reason !== 'invalid') data.uncertainAccountIds = ['syn_one'];
    if (reason !== 'quarantined') data.events.push(event('syn_one', {
      eventId: 'evt_invalid', resultComplete: false,
    }));
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result).toMatchObject({
      D: 1, N: 0, U: 1, F: 0, coverage: 0, rate: null, medianHours: null,
    });
    // Accepted observations remain reached-counts, not guaranteed conversions.
    expect(result.stages[3].count).toBe(1);
    reconciles(result);
  });

  it('retains all affected outcomes and unit partitions in the rejected example candidate', () => {
    const csv = invalidExampleCsv();
    const imported = importDataset(csv.signups, csv.events);
    expect(imported.ok).toBe(false);
    const result = analyze(imported.candidate!, DEFAULT_SETTINGS);
    expect(result).toMatchObject({
      D: 9, N: 2, U: 3, F: 4, medianHours: 84,
      population: { total: 17, mature: 9, maturityUnknown: 1 },
    });
    expect(result.stages[3].count).toBe(3);
    reconciles(result);
    expect(analyze(loadSample(), DEFAULT_SETTINGS)).toMatchObject({ D: 10, N: 4, U: 2, F: 4 });
  });

  it('does not select a valid value observation over quarantined conflicting or pre-signup events', () => {
    const signupsCsv = Papa.unparse([
      SIGNUP_HEADERS,
      ['syn_one', '2026-09-01T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['syn_two', '2026-09-01T00:00:00Z', 'eligible', 'unknown', 'unknown', 'complete'],
    ]);
    const eventsCsv = Papa.unparse([
      EVENT_HEADERS,
      ['evt_good_one', 'syn_one', '2026-09-02T00:00:00Z', 'first_value_verified', 'true', 'time_saved'],
      ['evt_good_two', 'syn_two', '2026-09-02T00:00:00Z', 'first_value_verified', 'true', 'time_saved'],
      ['evt_conflict', 'syn_one', '2026-09-02T00:00:00Z', 'pilot_setup', '', ''],
      ['evt_conflict', 'syn_two', '2026-09-02T00:00:00Z', 'pilot_setup', '', ''],
      ['evt_early', 'syn_one', '2026-08-31T00:00:00Z', 'first_use', '', ''],
    ]);
    const imported = importDataset(signupsCsv, eventsCsv);
    expect(imported.ok).toBe(false);
    expect(imported.report.events).toEqual({ received: 5, accepted: 2, duplicates: 0, quarantined: 3 });
    const result = analyze(imported.candidate!, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 2, N: 0, U: 2, F: 0, medianHours: null });
    reconciles(result);
  });

  it('never turns unknown coverage into a confirmed failure', () => {
    const result = analyze(dataset([signup('syn_one', { coverage: 'unknown' })]), DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 1, N: 0, U: 1, F: 0, coverage: 0, lower: 0, upper: 1, rate: null });
  });

  it.each([
    ['empty', dataset([])],
    ['all excluded', dataset([signup('syn_one', { eligibility: 'excluded' })])],
    ['all unknown eligibility', dataset([signup('syn_one', { eligibility: 'unknown' })])],
    ['all pending', dataset([signup('syn_one', { signupAt: '2026-10-10T00:00:00Z' })])],
    ['all out of cohort', dataset([signup('syn_one', { signupAt: '2026-08-31T00:00:00Z' })])],
    ['unknown signup date', dataset([signup('syn_one', { signupAt: '' })])],
  ])('reports not estimable, not zero percent, for a %s denominator', (_, data) => {
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 0, N: 0, U: 0, F: 0, coverage: null, lower: null, upper: null, rate: null, medianHours: null });
    reconciles(result);
  });

  it('includes the cohort start and excludes its end with equivalent offsets', () => {
    const result = analyze(dataset([
      signup('syn_before', { signupAt: '2026-08-31T23:59:59.999Z' }),
      signup('syn_at_start', { signupAt: '2026-09-01T05:30:00+05:30' }),
      signup('syn_before_end', { signupAt: '2026-10-10T23:59:59.999Z' }),
      signup('syn_at_end', { signupAt: '2026-10-10T20:00:00-04:00' }),
    ]), DEFAULT_SETTINGS);
    expect(result.population).toMatchObject({ total: 4, outOfCohort: 2, mature: 1, pending: 1 });
    reconciles(result);
  });

  it('defines maturity only by the full elapsed window, independent of coverage', () => {
    const data = dataset([
      signup('syn_exact', { signupAt: '2026-10-04T00:00:00Z', coverage: 'unknown' }),
      signup('syn_pending', { signupAt: '2026-10-04T00:00:00.000000001Z' }),
      signup('syn_mature', { signupAt: '2026-10-03T23:59:59.999999999Z' }),
    ], [event('syn_pending', { eventAt: '2026-10-05T00:00:00Z' })]);
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 2, N: 0, U: 1, F: 1, population: { mature: 2, pending: 1 } });
    reconciles(result);
  });

  it.each([
    ['2026-09-01T00:00:00Z', 1],
    ['2026-09-07T23:59:59.999999999Z', 1],
    ['2026-09-08T00:00:00Z', 0],
    ['2026-09-08T00:00:00.000000001Z', 0],
    ['2026-10-12T00:00:00Z', 0],
  ])('uses half-open event windows for %s', (time, expected) => {
    const result = analyze(dataset([signup('syn_one')], [event('syn_one', { eventAt: time })]), DEFAULT_SETTINGS);
    expect(result.N).toBe(expected);
    expect(result.F).toBe(1 - expected);
    expect(result.stages[3].count).toBe(expected);
    reconciles(result);
  });

  it('does not round fractional signup and window boundaries to milliseconds', () => {
    const data = dataset([signup('syn_one', { signupAt: '2026-09-01T00:00:00.0002Z' })], [
      event('syn_one', { eventAt: '2026-09-08T00:00:00.0001Z' }),
    ]);
    expect(analyze(data, DEFAULT_SETTINGS).N).toBe(1);
    data.events[0].eventAt = '2026-09-08T00:00:00.0002Z';
    expect(analyze(data, DEFAULT_SETTINGS).N).toBe(0);
  });

  it('does not let events at or after the cutoff establish value outside the window', () => {
    const result = analyze(dataset([
      signup('syn_one', { signupAt: '2026-10-04T00:00:00Z' }),
      signup('syn_two', { signupAt: '2026-10-04T00:00:00Z' }),
    ], [
      event('syn_one', { eventAt: '2026-10-11T00:00:00Z' }),
      event('syn_two', { eventAt: '2026-10-12T00:00:00Z' }),
    ]), DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 2, N: 0, U: 0, F: 2 });
  });

  it.each([
    { resultComplete: false },
    { valueEvidence: '' as const },
    { valueEvidence: 'unsupported' as Event['valueEvidence'] },
    { eventAt: '2026-09-01' },
    { eventAt: '2026-08-31T23:59:59Z' },
  ])('does not accept incomplete, invalid or pre-signup verified events: %j', changes => {
    const result = analyze(dataset([signup('syn_one')], [event('syn_one', changes)]), DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 1, N: 0, U: 1, F: 0, medianHours: null });
    expect(result.stages[3].count).toBe(0);
  });

  it('keeps setup, first use and verified first value distinct; reached counts need not be monotonic', () => {
    const data = dataset([signup('syn_one'), signup('syn_two')], [
      event('syn_one', { eventName: 'first_use', resultComplete: false, valueEvidence: '' }),
      event('syn_two'),
    ]);
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result.stages.map(stage => stage.count)).toEqual([0, 0, 1, 1]);
    expect(result).toMatchObject({ D: 2, N: 1, U: 0, F: 1 });
  });

  it('deduplicates reached accounts and uses each converter’s earliest valid event', () => {
    const data = dataset([signup('syn_one'), signup('syn_two'), signup('syn_three')], [
      event('syn_one', { eventId: 'evt_later', eventAt: '2026-09-05T00:00:00Z' }),
      event('syn_one', { eventId: 'evt_earlier', eventAt: '2026-09-02T00:00:00Z' }),
      event('syn_two', { eventAt: '2026-09-04T00:00:00Z' }),
      event('syn_three', { eventAt: '2026-09-03T00:00:00Z' }),
    ]);
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 3, N: 3, medianHours: 48 });
    expect(result.stages[3].count).toBe(3);
  });

  it('calculates medians only among confirmed converters, including zero-hour conversions', () => {
    const data = dataset([
      signup('syn_one'), signup('syn_two'), signup('syn_failure'), signup('syn_unknown', { coverage: 'unknown' }),
      signup('syn_pending', { signupAt: '2026-10-10T00:00:00Z' }),
    ], [
      event('syn_one', { eventAt: '2026-09-01T00:00:00Z' }), event('syn_two'),
      event('syn_pending', { eventAt: '2026-10-10T00:00:00Z' }),
    ]);
    const result = analyze(data, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 4, N: 2, U: 1, F: 1, medianHours: 12 });
    expect(result.population.pending).toBe(1);
    reconciles(result);
  });

  it('reconciles frozen signup-time segment and channel groups with unknowns and filters', () => {
    const data = loadSample();
    for (const segment of ['all', 'enterprise', 'mid_market', 'small_business', 'unknown'] as const) {
      for (const channel of ['all', 'organic', 'paid_search', 'partner', 'outbound', 'unknown'] as const) {
        const result = analyze(data, { ...DEFAULT_SETTINGS, segment, channel });
        reconciles(result);
        if (segment !== 'all') expect(result.segments.filter(group => group.key !== segment).every(group => group.D === 0)).toBe(true);
        if (channel !== 'all') expect(result.channels.filter(group => group.key !== channel).every(group => group.D === 0)).toBe(true);
      }
    }
  });

  it('does not silently shrink the population when signup dates or IDs conflict', () => {
    const signupsCsv = Papa.unparse([
      SIGNUP_HEADERS,
      ['syn_conflict', '2026-09-01T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['syn_conflict', '2026-09-02T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['syn_invalid_date', '2026-02-30T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['', '2026-09-01T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['syn_valid', '2026-09-01T00:00:00Z', 'eligible', '', '', 'complete'],
    ]);
    const imported = importDataset(signupsCsv, EVENT_HEADERS.join(','));
    expect(imported.ok).toBe(false);
    expect(imported.candidate).not.toBeNull();
    const result = analyze(imported.candidate!, DEFAULT_SETTINGS);
    expect(result.population).toMatchObject({ total: 4, maturityUnknown: 3, mature: 1 });
    expect(result.notices.some(notice => notice.includes('Diagnostic candidate'))).toBe(true);
    reconciles(result);
  });

  it('keeps affected valid units unknown in diagnostic candidates without counting orphans as units', () => {
    const signupsCsv = Papa.unparse([
      SIGNUP_HEADERS,
      ['syn_one', '2026-09-01T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'],
      ['syn_two', '2026-09-01T00:00:00Z', 'eligible', 'unknown', 'unknown', 'complete'],
    ]);
    const eventsCsv = Papa.unparse([
      EVENT_HEADERS,
      ['evt_one', 'syn_one', '2026-09-02T00:00:00Z', 'first_value_verified', 'false', 'time_saved'],
      ['evt_orphan', 'syn_orphan', '2026-09-02T00:00:00Z', 'first_value_verified', 'true', 'time_saved'],
    ]);
    const imported = importDataset(signupsCsv, eventsCsv);
    const result = analyze(imported.candidate!, DEFAULT_SETTINGS);
    expect(result).toMatchObject({ D: 2, N: 0, U: 1, F: 1, population: { total: 2 } });
    reconciles(result);
  });

  it('retains conflicting units as unknown when a segment filter cannot classify them', () => {
    const data = dataset([signup('syn_one')]);
    data.conflictingSignupIds = ['syn_conflict'];
    const result = analyze(data, { ...DEFAULT_SETTINGS, segment: 'small_business' });
    expect(result.population).toMatchObject({ total: 2, outOfCohort: 1, maturityUnknown: 1 });
    reconciles(result);
  });

  it('does not select a winning signup when given direct conflicting rows', () => {
    const result = analyze(dataset([
      signup('syn_one'), signup('syn_one', { segment: 'small_business' }), signup('syn_one'),
    ]), DEFAULT_SETTINGS);
    expect(result.population).toMatchObject({ total: 1, maturityUnknown: 1 });
    reconciles(result);
  });

  it('keeps each partition reconciled across multiple windows and completeness settings', () => {
    for (const windowDays of [1, 7, 14, 30, 365]) {
      for (const assumeComplete of [true, false]) {
        reconciles(analyze(loadSample(), { ...DEFAULT_SETTINGS, windowDays, assumeComplete }));
      }
    }
  });
});

describe('settings validation is separate from active settings', () => {
  it('accepts defaults and offset-equivalent settings', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, cutoff: '2026-10-10T20:00:00-04:00' })).toEqual([]);
  });

  it.each<Partial<MetricSettings>>([
    { cohortStart: '2026-09-01' },
    { cohortEnd: '2026-09-31T00:00:00Z' },
    { cutoff: '2026-10-11T00:00:00' },
    { cutoff: '2026-10-10T00:00:00Z' },
    { cohortStart: DEFAULT_SETTINGS.cohortEnd },
    { cohortStart: '2026-10-12T00:00:00Z' },
    { windowDays: 0 }, { windowDays: -1 }, { windowDays: 1.5 },
    { windowDays: 366 }, { windowDays: NaN }, { windowDays: Infinity },
    { assumeComplete: 'true' as unknown as boolean },
    { segment: 'unsupported' as MetricSettings['segment'] },
    { channel: 'unsupported' as MetricSettings['channel'] },
  ])('rejects invalid drafts without changing active settings: %j', changes => {
    const active = { ...DEFAULT_SETTINGS };
    const snapshot = JSON.stringify(active);
    const draft = { ...active, ...changes };
    expect(validateSettings(draft).length).toBeGreaterThan(0);
    expect(() => analyze(loadSample(), draft)).toThrow();
    expect(JSON.stringify(active)).toBe(snapshot);
    expect(analyze(loadSample(), active).D).toBe(10);
  });
});
