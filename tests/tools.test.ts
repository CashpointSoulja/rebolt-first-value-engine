import Papa from 'papaparse';
import { describe, expect, it, vi } from 'vitest';
import { buildUTM, exportPlan, rankExperiments, safeCsvCell } from '../src/domain/tools';
import { analyze } from '../src/domain/metrics';
import { loadSample } from '../src/domain/sample';
import { DEFAULT_SETTINGS, EVENTS } from '../src/domain/types';
import type { Analysis, Outcome, PlanInput, UTMInput } from '../src/domain/types';

// Every fixture in this file is synthetic.
function outcome(N: number, D: number, U: number, medianHours: number | null = N ? 12 : null): Outcome {
  return {
    N, D, U, F: D - N - U, medianHours,
    coverage: D ? (D - U) / D : null, lower: D ? N / D : null,
    upper: D ? (N + U) / D : null, rate: D && !U ? N / D : null,
  };
}

function fixture(): Analysis {
  return {
    ...outcome(4, 10, 2),
    rowPartitions: { signups: { received: 16, accepted: 16, duplicates: 0, quarantined: 0 },
      events: { received: 23, accepted: 20, duplicates: 1, quarantined: 2 } },
    datasetId: 'syn_fixture_private_identifier', notices: ['evt_fixture_not_exported'],
    population: {
      total: 16, outOfCohort: 1, excluded: 1, eligibilityUnknown: 1,
      mature: 10, pending: 2, maturityUnknown: 1,
    },
    stages: EVENTS.map((name, index) => ({
      name, label: 'syn_fixture_label_not_exported', count: [8, 5, 6, 4][index], denominator: 10,
    })),
    segments: [
      { key: 'enterprise', label: 'syn_fixture_label_not_exported', ...outcome(2, 5, 1), pending: 1 },
      { key: 'unknown', label: 'Unknown', ...outcome(2, 5, 1), pending: 1 },
    ],
    channels: [
      { key: 'organic', label: 'Organic', ...outcome(2, 4, 1), pending: 1 },
      { key: 'unknown', label: 'Unknown', ...outcome(2, 6, 1), pending: 1 },
    ],
  };
}

function emptyFixture(): Analysis {
  return {
    ...outcome(0, 0, 0), datasetId: 'empty', notices: [],
    rowPartitions: { signups: { received: 3, accepted: 3, duplicates: 0, quarantined: 0 },
      events: { received: 0, accepted: 0, duplicates: 0, quarantined: 0 } },
    population: { total: 3, outOfCohort: 0, excluded: 0, eligibilityUnknown: 0, mature: 0, pending: 3, maturityUnknown: 0 },
    stages: EVENTS.map(name => ({ name, label: name, count: 0, denominator: 0 })),
    segments: [{ key: 'unknown', label: 'Unknown', ...outcome(0, 0, 0), pending: 3 }],
    channels: [{ key: 'unknown', label: 'Unknown', ...outcome(0, 0, 0), pending: 3 }],
  };
}

function planInput(analysis = fixture()): PlanInput {
  const experiment = rankExperiments(analysis)[0];
  return {
    owner: 'Growth lead', hypothesis: experiment.hypothesis,
    guardrails: experiment.guardrails, stopCriteria: experiment.stopCriteria,
    successCriteria: experiment.successCriteria,
  };
}

function utm(overrides: Partial<UTMInput> = {}): UTMInput {
  return {
    destination: 'https://example.invalid/start?lang=en#details',
    source: 'synthetic search', medium: 'paid & search', campaign: 'pilot / learn',
    content: '', term: '', ...overrides,
  };
}

function exportFixture(overrides: Partial<PlanInput> = {}) {
  const analysis = fixture();
  return exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(analysis)[0], { ...planInput(), ...overrides }, ['syn_fixture_private_identifier']);
}

describe('rankExperiments', () => {
  it('gives deterministic, explicit 1–3 ordinal factors, arithmetic and synthetic rationales', () => {
    const analysis = fixture();
    const original = JSON.stringify(analysis);
    const ranked = rankExperiments(analysis);
    expect(ranked).toEqual(rankExperiments(structuredClone(analysis)));
    expect(JSON.stringify(analysis)).toBe(original);
    expect(ranked).toHaveLength(4);
    for (const experiment of ranked) {
      for (const value of [experiment.impact, experiment.confidence, experiment.effort]) {
        expect([1, 2, 3]).toContain(value);
      }
      expect(experiment.score).toBe(experiment.impact * experiment.confidence / experiment.effort);
      expect(experiment.rationale.impact).toContain('/10');
      expect(experiment.rationale.confidence).toContain('N=4, D=10, U=2');
      expect(experiment.rationale.effort).toContain('10 mature synthetic units');
      expect(experiment.evidence).toContain('not a sequential funnel');
      expect(experiment.action).toMatch(/Propose/);
    }
    expect(ranked.map(row => row.id)).toEqual(expect.arrayContaining([
      'qualification-pilot', 'setup-use', 'use-evidence', 'completeness-repair',
    ]));
    expect(ranked.map(row => row.score)).toEqual(ranked.map(row => row.score).sort((a, b) => b - a));
  });

  it('ties impact inputs to the selected synthetic analysis and retains completeness repair at U=0', () => {
    const analysis = fixture();
    const repair = rankExperiments(analysis).find(row => row.id === 'completeness-repair')!;
    expect(repair.impact).toBe(2);
    const complete = { ...analysis, ...outcome(4, 10, 0) };
    expect(rankExperiments(complete).find(row => row.id === 'completeness-repair')!.impact).toBe(1);
    const uncertain = { ...analysis, ...outcome(0, 10, 10) };
    expect(rankExperiments(uncertain)[0].id).toBe('completeness-repair');
  });

  it('gates campaigns when D=0 instead of ranking acquisition proposals', () => {
    const ranked = rankExperiments(emptyFixture());
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('define-evidence');
    expect(ranked[0].title).toMatch(/Needs definition/);
    expect(ranked[0].action).toContain('Do not promote or launch a campaign');
    expect(ranked[0].evidence).toContain('not estimable');
  });
});

describe('buildUTM', () => {
  it('preserves unrelated query/hash, encodes fields and never mutates input', () => {
    const input = utm({ content: 'amber=card', term: 'result + evidence' });
    const original = { ...input };
    const result = buildUTM(input);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    const url = new URL(result.url);
    expect(url.hash).toBe('#details');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('utm_source')).toBe('synthetic search');
    expect(url.searchParams.get('utm_medium')).toBe('paid & search');
    expect(url.searchParams.get('utm_campaign')).toBe('pilot / learn');
    expect(url.searchParams.get('utm_content')).toBe('amber=card');
    expect(url.searchParams.get('utm_term')).toBe('result + evidence');
    expect(result.url).toContain('%26');
    expect(result.url).toContain('%2F');
    expect(input).toEqual(original);
    expect(result).toEqual(buildUTM(input));
  });

  it('allows http and identical preexisting UTM values without duplication', () => {
    const result = buildUTM(utm({
      destination: 'http://example.invalid/?utm_source=synthetic+search&utm_content=kept#section',
    }));
    expect(result.ok).toBe(true);
    const url = new URL(result.url);
    expect(url.searchParams.getAll('utm_source')).toEqual(['synthetic search']);
    expect(url.searchParams.get('utm_content')).toBe('kept');
    expect(url.hash).toBe('#section');
  });

  it.each([
    'javascript:alert(1)', 'data:text/plain,synthetic', 'ftp://example.invalid/',
    '//example.invalid/', '/relative', 'https:example.invalid',
    `https://fixture:placeholder${'@'}example.invalid/`,
    'https://example.invalid/?lang=en&lang=fr',
    'https://example.invalid/?lang=en&LANG=en',
    'https://example.invalid/?lang=en&%6cang=en',
    'https://example.invalid/?%2575tm_source=synthetic+search',
    'https://example.invalid/?ｕｔｍ_source=synthetic+search',
    'https://example.invalid/?utm_source=conflict',
    'https://example.invalid/?utm_source=synthetic+search&utm_source=synthetic+search',
    'https://example.invalid/?utm_content=old',
    'https://example.invalid/\nmalicious',
    'https://example.invalid/%250a',
    'https://example.invalid/?account_id=fixture',
    'https://example.invalid/?api%255fkey=fixture',
    'https://example.invalid/?session=fixture',
    'https://example.invalid/?auth_code=fixture',
    'https://example.invalid/?access_key=fixture',
    'https://example.invalid/?signature=fixture',
    'https://example.invalid/?next=https%3A%2F%2Fexample.invalid%2F%3Ftoken%3Dfixture',
    'https://example.invalid/#token=fixture',
    'https://example.invalid/#/route?customer_id=fixture',
    'https://example.invalid/#lang=en&lang=fr',
    'https://example.invalid/syn_fixture',
    'https://example.invalid/#evt_fixture',
    'https://example.invalid/?q=%3Cb%3Esynthetic%3C%2Fb%3E',
    `https://example.invalid/?q=${['synthetic', 'example.invalid'].join('%40')}`,
    `https://example.invalid/?q=${'0'.repeat(10)}`,
    'https://example.invalid/?q=000%2F000%2F0000',
    `https://example.invalid/?q=${'٠'.repeat(10)}`,
    `https://example.invalid/${'a'.repeat(2100)}`,
    'https://example.invalid/\\path',
  ])('rejects unsafe destinations without echoing their content: %s', destination => {
    const result = buildUTM(utm({ destination, content: 'new' }));
    expect(result.ok).toBe(false);
    expect(result.url).toBe('');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.join(' ')).not.toContain(destination);
  });

  it.each([
    '', ' ', '<b>synthetic</b>', '%253Cb%253Esynthetic', '&lt;b&gt;',
    'evt_synthetic', 'syn_synthetic', 'fixture\u200bvalue',
    ['synthetic', 'example.invalid'].join('@'), '0'.repeat(10),
    'https://example.invalid/', 'a'.repeat(101),
  ])('rejects unsafe required campaign text', campaign => {
    const result = buildUTM(utm({ campaign }));
    expect(result).toMatchObject({ ok: false, url: '' });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts harmless fragment parameters and case-insensitive existing UTM keys', () => {
    const result = buildUTM(utm({
      destination: 'https://example.invalid/?grid=compact&UTM_SOURCE=synthetic+search#/details?view=compact',
    }));
    expect(result.ok).toBe(true);
    expect(new URL(result.url).hash).toBe('#/details?view=compact');
    expect(new URL(result.url).searchParams.getAll('UTM_SOURCE')).toHaveLength(1);
    expect(new URL(result.url).searchParams.get('grid')).toBe('compact');
  });

  it('keeps constructed URLs within the same bound used by export validation', () => {
    const result = buildUTM(utm({ destination: `https://example.invalid/${'z'.repeat(2000)}` }));
    expect(result).toMatchObject({ ok: false, url: '' });
    expect(result.errors).toContain('Constructed campaign URL exceeds the 2048-character limit.');
  });

  it.each([
    'https://localhost/', 'https://workbench/', 'https://demo.internal/',
    'https://demo.local/', 'http://127.0.0.1/', 'https://[::1]/',
    'https://example.invalid/?otp=fixture', 'https://example.invalid/?pin=fixture',
    'https://example.invalid/?jwt=fixture', 'https://example.invalid/token/fixture',
    'https://example.invalid/#/details?utm_source=conflict',
    'https://example.invalid/?q=password%3Dfixture',
    'https://example.invalid/?q=Bearer%20synthetic-placeholder',
  ])('rejects private-looking destinations, credential payloads and fragment UTM ambiguity', destination => {
    expect(buildUTM(utm({ destination }))).toMatchObject({ ok: false, url: '' });
  });

  it.each([
    'password=synthetic-placeholder', 'Authorization: Bearer synthetic-placeholder',
    'api_key: synthetic-placeholder', 'otp=synthetic-placeholder',
    ['/', 'tmp', '/', 'synthetic-only'].join(''), ['C:', '\\', 'synthetic-only'].join(''),
  ])('rejects credential-like and filesystem-like campaign fields', campaign => {
    expect(buildUTM(utm({ campaign }))).toMatchObject({ ok: false, url: '' });
  });

  it('constructs campaign strings without visiting or fetching the destination', () => {
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    try {
      const built = buildUTM(utm());
      expect(built.ok).toBe(true);
      expect(exportFixture({ campaignUrl: built.url }).ok).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('safeCsvCell', () => {
  it.each(['=SUM(1,2)', '+1', '-1', '@SUM(1)', ' \t=1', '\r\n+1', '\u0000-1', '\u200b@SUM(1)', '\ufeff=1', '＝1'])(
    'neutralizes formula prefixes, including whitespace/control variants', value => {
      expect(safeCsvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );
  it('quotes commas, quotes, blank cells and multiline content', () => {
    expect(safeCsvCell('plain')).toBe('"plain"');
    expect(safeCsvCell('a,b')).toBe('"a,b"');
    expect(safeCsvCell('a"b')).toBe('"a""b"');
    expect(safeCsvCell('line\nline')).toBe('"line\nline"');
    expect(safeCsvCell('')).toBe('""');
  });
});

describe('exportPlan', () => {
  it('rejects invalid row accounting rather than exporting inferred counts', () => {
    for (const invalid of [NaN, Infinity, -1, 1.5, 100]) {
      const analysis = fixture();
      analysis.rowPartitions.events.received = invalid;
      expect(exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(fixture())[0], planInput(), []).ok).toBe(false);
    }
  });

  it('copies only aggregate row counts, never diagnostics or injected report properties', () => {
    const analysis = fixture();
    Object.assign(analysis.rowPartitions.signups, { secret: 'syn_hidden', issues: ['evt_hidden'] });
    const result = exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(analysis)[0], planInput(), []);
    expect(result.ok).toBe(true);
    expect(result.json).not.toContain('hidden');
    expect(JSON.parse(result.json).dataset.rowPartitions.signups).toEqual({ received: 16, accepted: 16, duplicates: 0, quarantined: 0 });
  });

  it('exports deterministic aggregate-only JSON and complete flattened CSV without a clock', () => {
    const analysis = fixture();
    const settings = { ...DEFAULT_SETTINGS };
    const input = { ...planInput(), campaignUrl: buildUTM(utm()).url };
    const experiment = rankExperiments(analysis)[0];
    const before = JSON.stringify({ analysis, settings, input, experiment });
    const result = exportPlan(analysis, settings, experiment, input, ['syn_fixture_private_identifier']);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result).toEqual(exportPlan(structuredClone(analysis), { ...settings }, structuredClone(experiment), { ...input }, ['syn_fixture_private_identifier']));
    expect(JSON.stringify({ analysis, settings, input, experiment })).toBe(before);
    const plan = JSON.parse(result.json);
    expect(plan.status).toBe('proposed_not_executed');
    expect(plan.metric.version).toBe('synthetic-first-value-metric/1');
    expect(plan.metric.milestone.version).toBe('synthetic-first-value-verified/1');
    expect(plan.dataset.identifier).toMatch(/^aggregate-v1-[a-f0-9]{8}$/);
    expect(plan.dataset.rowPartitions.status).toBe('reconciled');
    expect(plan.dataset.rowPartitions.signups).toEqual(analysis.rowPartitions.signups);
    expect(plan.dataset.rowPartitions.events).toEqual(analysis.rowPartitions.events);
    expect(plan.population).toEqual(analysis.population);
    expect(plan.selection).toMatchObject({ segment: 'all', channel: 'all' });
    expect(plan.outcomes).toMatchObject({
      N: 4, D: 10, U: 2, F: 4, coverage: 0.8, lowerBound: 0.4, upperBound: 0.6, definitiveRate: null,
    });
    expect(plan.observations).toMatchObject({
      cutoff: '2026-10-11T00:00:00.000Z', windowDays: 7,
      cohortStart: '2026-09-01T00:00:00.000Z', cohortEndExclusive: '2026-10-11T00:00:00.000Z',
    });
    expect(plan.metric.completeness.assumeComplete).toBe(true);
    expect(plan.timing.label).toContain('confirmed converters only');
    expect(plan.timing.medianHours).toBe(12);
    expect(plan.experiment.scoreMath).toBe(`${experiment.impact} * ${experiment.confidence} / ${experiment.effort} = ${experiment.score}`);
    expect(plan.experiment.campaignUrl).toBe(input.campaignUrl);
    expect(plan.credit).toBe('Independent concept by Ayo Ahmed');
    expect(plan.nonAffiliation).toContain('Not affiliated');
    for (const forbidden of ['syn_fixture', 'evt_fixture', 'generatedAt', 'createdAt']) {
      expect(result.json).not.toContain(forbidden);
      expect(result.csv).not.toContain(forbidden);
    }
    expect(result.csv).toContain('"outcomes.U","2"');
    expect(result.csv).toContain('"dataset.rowPartitions.signups.received","16"');
    expect(result.csv).toContain('"experiment.owner","Growth lead"');
    expect(result.csv).toContain('"metric.milestone.version","synthetic-first-value-verified/1"');
    expect(result.csv.endsWith('\r\n')).toBe(true);
  });

  it('does not hash source identifiers, arbitrary labels, notices or array ordering', () => {
    const initial = fixture();
    const changed = fixture();
    changed.datasetId = 'evt_another_private_id';
    changed.notices = ['<b>must not be copied</b>'];
    changed.segments.reverse();
    changed.channels.reverse();
    changed.stages.reverse();
    changed.segments[0].label = 'syn_injected_label';
    const first = exportPlan(initial, DEFAULT_SETTINGS, rankExperiments(initial)[0], planInput(), []);
    const second = exportPlan(changed, DEFAULT_SETTINGS, rankExperiments(changed)[0], planInput(), []);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
  });

  it.each([
    ['owner', ''], ['owner', 'a'.repeat(81)], ['hypothesis', 'a'.repeat(601)],
    ['guardrails', '<script>synthetic</script>'], ['stopCriteria', '&lt;b&gt;synthetic'],
    ['successCriteria', 'Inspect %253Cscript%253E'],
    ['owner', ['synthetic', 'example.invalid'].join('@')],
    ['owner', '0'.repeat(10)], ['owner', 'syn_fixture_private_identifier'],
    ['guardrails', 'evt_new_synthetic_id'], ['stopCriteria', 'https://example.invalid/'],
    ['hypothesis', 'Read example.invalid'], ['successCriteria', 'synthetic\nline'],
    ['owner', 'Synthetic\u200brole'], ['hypothesis', '=SUM(1,2)'],
    ['hypothesis', ' +formula'], ['hypothesis', '-formula'], ['hypothesis', '@formula'],
    ['hypothesis', '%3Dformula'], ['hypothesis', '＝formula'],
  ])('rejects unsafe plan text in %s atomically', (key, value) => {
    const result = exportFixture({ [key]: value });
    expect(result.ok).toBe(false);
    expect(result.json).toBe('');
    expect(result.csv).toBe('');
    expect(result.errors.length).toBeGreaterThan(0);
    if (value.length > 3) expect(result.errors.join(' ')).not.toContain(value);
  });

  it('rejects current identifiers, including encoded variants, in text and campaign URLs', () => {
    const analysis = fixture();
    for (const input of [
      { ...planInput(), hypothesis: 'Review current-fixture-key evidence' },
      { ...planInput(), guardrails: 'Exclude current%2Dfixture%2Dkey from the plan' },
      { ...planInput(), campaignUrl: 'https://example.invalid/current-fixture-key' },
    ]) {
      const result = exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(analysis)[0], input, ['current-fixture-key']);
      expect(result).toMatchObject({ ok: false, json: '', csv: '' });
    }
  });

  it.each([
    'javascript:alert(1)', 'https://example.invalid/?token=synthetic',
    'https://example.invalid/?a=one&a=two', 'https://example.invalid/#evt_synthetic',
  ])('rejects unsafe optional campaign URLs', campaignUrl => {
    expect(exportFixture({ campaignUrl })).toMatchObject({ ok: false, json: '', csv: '' });
  });

  it('rejects tampered experiment content and score instead of copying arbitrary properties', () => {
    const analysis = fixture();
    const experiment = rankExperiments(analysis)[0];
    for (const changed of [
      { ...experiment, action: 'syn_must_not_escape' },
      { ...experiment, score: 99 },
      { ...experiment, rationale: { ...experiment.rationale, impact: '<b>synthetic</b>' } },
    ]) {
      const result = exportPlan(analysis, DEFAULT_SETTINGS, changed, planInput(), []);
      expect(result).toMatchObject({ ok: false, json: '', csv: '' });
    }
  });

  it('retains null zero-denominator metrics, pending units and a no-campaign evidence plan', () => {
    const analysis = emptyFixture();
    const experiment = rankExperiments(analysis)[0];
    const result = exportPlan(analysis, DEFAULT_SETTINGS, experiment, planInput(analysis), []);
    expect(result.errors).toEqual([]);
    const plan = JSON.parse(result.json);
    expect(plan.outcomes).toMatchObject({
      N: 0, D: 0, U: 0, F: 0, coverage: null, lowerBound: null, upperBound: null, definitiveRate: null, status: 'not_estimable',
    });
    expect(plan.population.pending).toBe(3);
    expect(plan.experiment.priorityStatus).toBe('needs_definition_and_evidence');
    expect(plan.timing.medianHours).toBeNull();
    expect(exportPlan(analysis, DEFAULT_SETTINGS, experiment, {
      ...planInput(analysis), campaignUrl: 'https://example.invalid/',
    }, []).ok).toBe(false);
  });

  it('rejects inconsistent aggregate partitions, derived rates and unsupported categories', () => {
    const changes: ((analysis: Analysis) => void)[] = [
      analysis => { analysis.population.total++; },
      analysis => { analysis.F++; },
      analysis => { analysis.rate = 0.4; },
      analysis => { analysis.coverage = 1; },
      analysis => { analysis.segments[0].key = 'arbitrary_category'; },
      analysis => { analysis.channels[0].D++; },
      analysis => { analysis.stages[0].count = 11; },
      analysis => { analysis.stages[0].denominator = 9; },
      analysis => { analysis.segments[0].pending++; },
    ];
    for (const change of changes) {
      const analysis = fixture();
      change(analysis);
      expect(exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(analysis)[0], planInput(), []).ok).toBe(false);
    }
  });

  it('accepts nonmonotonic observed stage counts and unknown completeness without inventing failure', () => {
    const analysis = fixture();
    Object.assign(analysis, outcome(4, 10, 6));
    analysis.segments.forEach(row => Object.assign(row, outcome(row.N, row.D, row.D - row.N)));
    analysis.channels.forEach(row => Object.assign(row, outcome(row.N, row.D, row.D - row.N)));
    const result = exportPlan(analysis, { ...DEFAULT_SETTINGS, assumeComplete: false }, rankExperiments(analysis)[0], planInput(), []);
    expect(result.ok).toBe(true);
    const plan = JSON.parse(result.json);
    expect(plan.stages.counts.map((row: { reached: number }) => row.reached)).toEqual([8, 5, 6, 4]);
    expect(plan.outcomes.U).toBe(6);
    expect(plan.metric.completeness.assumeComplete).toBe(false);
  });

  it('rejects invalid settings without altering supplied settings or returning partial files', () => {
    const analysis = fixture();
    for (const settings of [
      { ...DEFAULT_SETTINGS, cutoff: 'invalid' },
      { ...DEFAULT_SETTINGS, cohortStart: '2026-02-31T00:00:00Z' },
      { ...DEFAULT_SETTINGS, windowDays: 0 },
      { ...DEFAULT_SETTINGS, cohortEnd: DEFAULT_SETTINGS.cohortStart },
      { ...DEFAULT_SETTINGS, cutoff: '2026-10-10T24:00:00Z' },
      { ...DEFAULT_SETTINGS, cutoff: '2026-10-10T00:00:00Z' },
      { ...DEFAULT_SETTINGS, cutoff: '2026-10-11T00:00:00-00:00' },
    ]) {
      const original = { ...settings };
      expect(exportPlan(analysis, settings, rankExperiments(analysis)[0], planInput(), [])).toMatchObject({
        ok: false, json: '', csv: '',
      });
      expect(settings).toEqual(original);
    }
  });

  it('rejects detectable stale filter and completeness snapshots', () => {
    const analysis = fixture();
    for (const settings of [
      { ...DEFAULT_SETTINGS, segment: 'enterprise' as const },
      { ...DEFAULT_SETTINGS, channel: 'organic' as const },
      { ...DEFAULT_SETTINGS, assumeComplete: false },
    ]) {
      expect(exportPlan(analysis, settings, rankExperiments(analysis)[0], planInput(), []).ok).toBe(false);
    }
  });

  it('preserves fractional timestamp precision and normalizes equivalent offsets deterministically', () => {
    const analysis = fixture();
    const result = exportPlan(analysis, {
      ...DEFAULT_SETTINGS, cutoff: '2026-10-11T01:00:00.123456+01:00',
    }, rankExperiments(analysis)[0], planInput(), []);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.json).observations.cutoff).toBe('2026-10-11T00:00:00.123456Z');
    expect(result).toEqual(exportPlan(analysis, {
      ...DEFAULT_SETTINGS, cutoff: '2026-10-11T00:00:00.123456Z',
    }, rankExperiments(analysis)[0], planInput(), []));
  });

  it('exports actual shared sample analysis, including selected filters and absent completeness', () => {
    const dataset = loadSample();
    for (const settings of [
      { ...DEFAULT_SETTINGS },
      { ...DEFAULT_SETTINGS, segment: 'enterprise' as const, channel: 'organic' as const },
      { ...DEFAULT_SETTINGS, assumeComplete: false },
    ]) {
      const analysis = analyze(dataset, settings);
      const identifiers = [
        dataset.id,
        ...dataset.signups.map(row => row.accountId), ...dataset.events.map(row => row.eventId),
      ];
      for (const experiment of rankExperiments(analysis)) {
        const input: PlanInput = {
          owner: 'Synthetic growth owner', hypothesis: experiment.hypothesis,
          guardrails: experiment.guardrails, stopCriteria: experiment.stopCriteria,
          successCriteria: experiment.successCriteria,
        };
        const result = exportPlan(analysis, settings, experiment, input, identifiers);
        expect(result.errors).toEqual([]);
        expect(result.ok).toBe(true);
        const plan = JSON.parse(result.json);
        expect(plan.selection).toMatchObject({ segment: settings.segment, channel: settings.channel });
        expect(plan.outcomes).toMatchObject({ D: analysis.D, N: analysis.N, U: analysis.U, F: analysis.F });
        for (const output of [result.json, result.csv]) {
          expect(output).not.toMatch(/(?:syn|evt)_[a-z0-9_-]+/i);
          for (const identifier of identifiers) expect(output).not.toContain(identifier);
        }
      }
    }
  });

  it.each([
    'password=synthetic-placeholder', 'Authorization: Bearer synthetic-placeholder',
    '"api_key": "synthetic-placeholder"', 'otp=synthetic-placeholder',
    ['/', 'tmp', '/', 'synthetic-only'].join(''), ['C:', '\\', 'synthetic-only'].join(''),
  ])('rejects credential-like or filesystem-like plan strings without echoing them', hypothesis => {
    const result = exportFixture({ hypothesis });
    expect(result).toMatchObject({ ok: false, json: '', csv: '' });
    expect(result.errors.join(' ')).not.toContain(hypothesis);
  });

  it('includes overall converter timing in the aggregate reproducibility label', () => {
    const first = fixture();
    const second = fixture();
    second.medianHours = 13;
    const before = exportPlan(first, DEFAULT_SETTINGS, rankExperiments(first)[0], planInput(), []);
    const after = exportPlan(second, DEFAULT_SETTINGS, rankExperiments(second)[0], planInput(), []);
    expect(before.ok).toBe(true);
    expect(after.ok).toBe(true);
    expect(JSON.parse(before.json).dataset.identifier).not.toBe(JSON.parse(after.json).dataset.identifier);
  });

  it('rejects converter medians that cannot belong to the selected window', () => {
    const analysis = fixture();
    analysis.medianHours = DEFAULT_SETTINGS.windowDays * 24 + 1;
    expect(exportPlan(analysis, DEFAULT_SETTINGS, rankExperiments(analysis)[0], planInput(), [])).toMatchObject({
      ok: false, json: '', csv: '',
    });
  });

  it('independently parses CSV and reads back every JSON leaf, including punctuation', () => {
    const exported = exportFixture({ hypothesis: 'Inspect the synthetic "result, evidence" checklist.' });
    expect(exported.ok).toBe(true);
    const expected: string[][] = [['field', 'value']];
    const walk = (value: unknown, path: string) => {
      if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value);
        if (!entries.length) expected.push([path, Array.isArray(value) ? '[]' : '{}']);
        for (const [key, child] of entries) walk(child, path ? `${path}.${key}` : key);
      } else {
        expected.push([path, value === null ? 'null' : String(value)]);
      }
    };
    walk(JSON.parse(exported.json), '');
    const parsed = Papa.parse<string[]>(exported.csv, { skipEmptyLines: true });
    expect(parsed.errors).toEqual([]);
    expect(parsed.data).toEqual(expected);
    expect(parsed.data.every(row => row.length === 2)).toBe(true);
  });
});
