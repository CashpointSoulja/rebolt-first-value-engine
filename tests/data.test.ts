import Papa from 'papaparse';
import { describe, expect, it, vi } from 'vitest';
import { EVENT_HEADERS, importDataset, MAX_BYTES, MAX_ROWS, SIGNUP_HEADERS } from '../src/domain/dataset';
import { invalidExampleCsv, loadSample, sampleCsv } from '../src/domain/sample';
import type { ImportResult } from '../src/domain/types';

const signup = ['syn_one', '2026-09-01T00:00:00Z', 'eligible', 'enterprise', 'organic', 'complete'];
const event = ['evt_one', 'syn_one', '2026-09-02T00:00:00Z', 'first_value_verified', 'true', 'time_saved'];
const signups = (rows: string[][] = [signup]) => Papa.unparse([SIGNUP_HEADERS, ...rows]);
const events = (rows: string[][] = [event]) => Papa.unparse([EVENT_HEADERS, ...rows]);
const replace = (row: string[], index: number, value: string) => row.map((cell, position) => position === index ? value : cell);
function reconciles(result: ImportResult) {
  for (const partition of [result.report.signups, result.report.events]) {
    expect(partition.received).toBe(partition.accepted + partition.duplicates + partition.quarantined);
  }
}

describe('transactional local CSV import', () => {
  it('imports normalized synthetic records and never calls a network function', () => {
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    try {
      const result = importDataset(signups(), events());
      expect(result.ok).toBe(true);
      expect(result.candidate?.signups[0].signupAt).toBe('2026-09-01T00:00:00.000Z');
      expect(result.candidate?.events[0].eventAt).toBe('2026-09-02T00:00:00.000Z');
      expect(result.report.signups).toEqual({ received: 1, accepted: 1, duplicates: 0, quarantined: 0 });
      expect(network).not.toHaveBeenCalled();
      reconciles(result);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('supports reordered headers, BOM, quoted cells, CRLF and empty physical lines', () => {
    const ordered = Papa.unparse([
      [...SIGNUP_HEADERS].reverse(), [...signup].reverse(),
    ], { quotes: true });
    const result = importDataset(`\uFEFF${ordered}\r\n\r\n`, `\uFEFF${events()}\r\n`);
    expect(result.ok).toBe(true);
    expect(result.candidate?.signups[0].accountId).toBe('syn_one');
    expect(result.report.signups.received).toBe(1);
    reconciles(result);
  });

  it('accepts header-only tables without inventing data rows', () => {
    const result = importDataset(signups([]), events([]));
    expect(result.ok).toBe(true);
    expect(result.candidate?.signups).toEqual([]);
    expect(result.candidate?.events).toEqual([]);
    reconciles(result);
  });

  it.each([
    ['duplicate', [...SIGNUP_HEADERS.slice(0, -1), 'channel']],
    ['extra', [...SIGNUP_HEADERS, 'unexpected_column']],
    ['missing', SIGNUP_HEADERS.slice(0, -1)],
    ['wrong case', replace(SIGNUP_HEADERS, 0, 'Account_id')],
    ['whitespace', replace(SIGNUP_HEADERS, 0, ' account_id')],
    ['prototype key', replace(SIGNUP_HEADERS, 0, '__proto__')],
    ['constructor key', replace(SIGNUP_HEADERS, 0, 'constructor')],
    ['malicious key', replace(SIGNUP_HEADERS, 0, '=HYPERLINK("blocked")')],
  ])('rejects %s headers with no raw values in diagnostics', (_, headers) => {
    const result = importDataset(Papa.unparse([headers, signup]), events());
    expect(result.ok).toBe(false);
    expect(result.candidate).toBeNull();
    expect(result.report.fatalErrors.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.report)).not.toContain('HYPERLINK');
    expect(JSON.stringify(result.report)).not.toContain('__proto__');
    reconciles(result);
  });

  it('does not lose quote errors after blank lines when decoded values appear valid', () => {
    const text = `${EVENT_HEADERS.join(',')}\n\n${event.slice(0, -1).join(',')},"time_saved`;
    const result = importDataset(signups(), text);
    expect(result.ok).toBe(false);
    expect(result.report.events).toEqual({ received: 1, accepted: 0, duplicates: 0, quarantined: 1 });
    expect(result.report.issues.some(issue => issue.code === 'malformed_csv')).toBe(true);
    expect(result.candidate?.uncertainAccountIds).toContain('syn_one');
    reconciles(result);
  });

  it('does not hide malformed quote errors inside a decoded duplicate group', () => {
    const text = `${events()}\r\n${event.slice(0, -1).join(',')},"time_saved`;
    const result = importDataset(signups(), text);
    expect(result.ok).toBe(false);
    expect(result.report.events).toEqual({ received: 2, accepted: 0, duplicates: 0, quarantined: 2 });
    expect(result.report.issues.some(issue => issue.code === 'malformed_csv')).toBe(true);
    reconciles(result);
  });

  it('retains malformed otherwise-empty records rather than treating them as whitespace', () => {
    const result = importDataset(`${signups()}\r\n"`, events([]));
    expect(result.ok).toBe(false);
    expect(result.report.signups.received).toBe(2);
    expect(result.report.signups.quarantined).toBe(1);
    reconciles(result);
  });

  it('validates both files even when one schema is fatal', () => {
    const result = importDataset('unexpected_column\nsynthetic_only', events([replace(event, 3, 'not_an_event')]));
    expect(result.ok).toBe(false);
    expect(result.report.events.quarantined).toBe(1);
    expect(result.report.issues.some(issue => issue.code === 'event_name')).toBe(true);
    expect(result.candidate).toBeNull();
    reconciles(result);
  });

  it('rejects event header duplicates and missing event headers', () => {
    for (const headers of [[...EVENT_HEADERS, 'event_id'], EVENT_HEADERS.slice(1)]) {
      const result = importDataset(signups(), Papa.unparse([headers, event]));
      expect(result.ok).toBe(false);
      expect(result.candidate).toBeNull();
      expect(result.report.signups.accepted).toBe(1);
      reconciles(result);
    }
  });

  it.each([
    ['missing fields', 'syn_one,2026-09-01T00:00:00Z'],
    ['extra fields', `${signup.join(',')},unexpected`],
    ['unterminated quote', '"syn_one,2026-09-01T00:00:00Z,eligible,enterprise,organic,complete'],
    ['malformed quote', '"syn_one"oops,2026-09-01T00:00:00Z,eligible,enterprise,organic,complete'],
    ['blank cells', ',,,,,'],
  ])('quarantines %s without silently dropping a record', (_, row) => {
    const result = importDataset(`${SIGNUP_HEADERS.join(',')}\n${row}`, events([]));
    expect(result.ok).toBe(false);
    expect(result.report.signups).toEqual({ received: 1, accepted: 0, duplicates: 0, quarantined: 1 });
    reconciles(result);
  });

  it.each(['enterprise\nunknown', 'enterprise,unknown', 'enterprise"unknown', '<script>synthetic_only</script>'])(
    'parses escaped or multiline fields but rejects unsupported category payload %s',
    value => {
      const result = importDataset(signups([replace(signup, 3, value)]), events([]));
      expect(result.ok).toBe(false);
      expect(result.report.signups.received).toBe(1);
      expect(result.report.issues.some(issue => issue.code === 'segment')).toBe(true);
      expect(JSON.stringify(result.candidate)).not.toContain(value);
      reconciles(result);
    },
  );

  it('rejects empty files and malformed headers', () => {
    for (const text of ['', '"account_id,signup_at', 'account_id;signup_at;eligibility;segment;channel;coverage']) {
      const result = importDataset(text, events([]));
      expect(result.ok).toBe(false);
      expect(result.candidate).toBeNull();
      reconciles(result);
    }
  });

  it('maps blank signup categories to unknown and a blank result to false', () => {
    const result = importDataset(signups([[signup[0], signup[1], '', '', '', '']]),
      events([[event[0], event[1], event[2], 'first_use', '', '']]));
    expect(result.ok).toBe(true);
    expect(result.candidate?.signups[0]).toMatchObject({
      eligibility: 'unknown', segment: 'unknown', channel: 'unknown', coverage: 'unknown',
    });
    expect(result.candidate?.events[0].resultComplete).toBe(false);
  });

  it.each([
    [2, 'true'], [3, 'other'], [4, 'direct'], [5, 'false'], [5, 'partial'],
  ])('rejects unsupported signup category in column %s', (index, value) => {
    const result = importDataset(signups([replace(signup, index, value)]), events([]));
    expect(result.ok).toBe(false);
    expect(result.report.signups.quarantined).toBe(1);
    reconciles(result);
  });

  it.each(['syn_', 'one', 'syn.bad', 'syn_one two', '=syn_one', 'syn_é', 'syn_one\n', `syn_${'x'.repeat(61)}`])(
    'rejects invalid account ID %s and retains a safe diagnostic unit',
    id => {
      const result = importDataset(signups([replace(signup, 0, id)]), events([]));
      expect(result.ok).toBe(false);
      expect(result.candidate?.signups).toHaveLength(1);
      expect(result.candidate?.signups[0].accountId).toMatch(/^syn_quarantined_row_/);
      expect(result.candidate?.signups[0].signupAt).toBe('');
      expect(result.report.issues.some(issue => issue.code === 'account_id')).toBe(true);
      reconciles(result);
    },
  );

  it('accepts 64-character synthetic IDs with the permitted suffix alphabet', () => {
    const id = `syn_${'a_-Z09'.repeat(10)}`;
    const result = importDataset(signups([replace(signup, 0, id)]),
      events([[`evt_${'a_-Z09'.repeat(10)}`, id, ...event.slice(2)]]));
    expect(result.ok).toBe(true);
  });

  it.each(['evt_', 'event_one', 'evt_one two', 'evt_one\n', `evt_${'x'.repeat(61)}`, '@evt_one'])('rejects invalid event ID %s', id => {
    const result = importDataset(signups(), events([replace(event, 0, id)]));
    expect(result.ok).toBe(false);
    expect(result.candidate?.uncertainAccountIds).toContain('syn_one');
    expect(result.report.events.quarantined).toBe(1);
    reconciles(result);
  });

  it('ensures generated diagnostic IDs cannot collide with supplied synthetic IDs', () => {
    const result = importDataset(signups([
      replace(signup, 0, ''), replace(signup, 0, 'syn_quarantined_row_2_0'),
    ]), events([]));
    expect(result.candidate?.signups).toHaveLength(2);
    expect(new Set(result.candidate?.signups.map(row => row.accountId)).size).toBe(2);
  });

  it.each([
    '2026-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-04-31T00:00:00Z',
    '2026-00-01T00:00:00Z', '2026-13-01T00:00:00Z', '2026-09-00T00:00:00Z',
    '2026-09-01T24:00:00Z', '2026-09-01T00:60:00Z', '2026-09-01T00:00:60Z',
    '2026-09-01T00:00:00', '2026-09-01', '2026-09-01 00:00:00Z',
    '2026-9-1T00:00:00Z', '2026-09-01T00:00:00+24:00', '2026-09-01T00:00:00+00:60',
    '2026-09-01T00:00:00-00:00', '2026-09-01T00:00:00+0000', '2026-09-01T00:00:00.Z',
    '0000-01-01T00:00:00Z', '0001-01-01T00:00:00+01:00', '9999-12-31T23:59:59-01:00',
    '2026-09-01T00:00:00Z unexpected', '2026-09-01T00:00:00Z\n',
  ])('rejects invalid or unsupported timestamp %s without date rollover or guessed zones', timestamp => {
    const signupResult = importDataset(signups([replace(signup, 1, timestamp)]), events([]));
    expect(signupResult.ok).toBe(false);
    expect(signupResult.candidate?.signups[0].signupAt).toBe('');
    const eventResult = importDataset(signups(), events([replace(event, 2, timestamp)]));
    expect(eventResult.ok).toBe(false);
    expect(eventResult.report.issues.some(issue => issue.code === 'event_at')).toBe(true);
    reconciles(signupResult);
    reconciles(eventResult);
  });

  it.each([
    ['2000-02-29T00:00:00Z', '2000-02-29T00:00:00.000Z'],
    ['2024-02-29T00:00:00Z', '2024-02-29T00:00:00.000Z'],
    ['2026-09-01T05:30:00+05:30', '2026-09-01T00:00:00.000Z'],
    ['2026-08-31T20:00:00-04:00', '2026-09-01T00:00:00.000Z'],
    ['2026-09-01t00:00:00z', '2026-09-01T00:00:00.000Z'],
    ['2026-09-01T00:00:00.123456789000Z', '2026-09-01T00:00:00.123456789Z'],
    ['2026-09-01T00:00:00.1+00:00', '2026-09-01T00:00:00.100Z'],
    ['0099-01-01T00:00:00Z', '0099-01-01T00:00:00.000Z'],
  ])('normalizes a valid instant %s without losing precision', (timestamp, normalized) => {
    const result = importDataset(signups([replace(signup, 1, timestamp)]), events([]));
    expect(result.ok).toBe(true);
    expect(result.candidate?.signups[0].signupAt).toBe(normalized);
  });

  it('deduplicates exact valid records with warnings and reconciles both tables', () => {
    const result = importDataset(signups([signup, signup]), events([event, event, event]));
    expect(result.ok).toBe(true);
    expect(result.report.signups).toEqual({ received: 2, accepted: 1, duplicates: 1, quarantined: 0 });
    expect(result.report.events).toEqual({ received: 3, accepted: 1, duplicates: 2, quarantined: 0 });
    expect(result.report.issues.every(issue => issue.severity === 'warning')).toBe(true);
    expect(result.candidate?.events).toHaveLength(1);
    reconciles(result);
  });

  it('does not call normalized but non-exact records exact duplicates', () => {
    const result = importDataset(signups([
      signup, replace(signup, 1, '2026-09-01T01:00:00+01:00'),
    ]), events([]));
    expect(result.ok).toBe(false);
    expect(result.report.signups.quarantined).toBe(2);
    expect(result.report.signups.duplicates).toBe(0);
  });

  it('quarantines all conflicting signup records, including exact repeats within a conflict', () => {
    const result = importDataset(signups([signup, signup, replace(signup, 3, 'mid_market')]), events());
    expect(result.ok).toBe(false);
    expect(result.candidate?.signups).toEqual([]);
    expect(result.candidate?.conflictingSignupIds).toEqual(['syn_one']);
    expect(result.candidate?.uncertainAccountIds).toEqual(['syn_one']);
    expect(result.report.signups).toEqual({ received: 3, accepted: 0, duplicates: 0, quarantined: 3 });
    expect(result.report.events.quarantined).toBe(1);
    reconciles(result);
  });

  it('detects ID conflicts even when one conflicting row has an invalid payload', () => {
    const result = importDataset(signups([signup, replace(signup, 1, 'invalid')]), events([]));
    expect(result.candidate?.conflictingSignupIds).toEqual(['syn_one']);
    expect(result.report.signups.quarantined).toBe(2);
    expect(result.report.signups.accepted).toBe(0);
  });

  it('quarantines event ID conflicts across accounts and marks both outcomes uncertain', () => {
    const result = importDataset(signups([signup, replace(signup, 0, 'syn_two')]),
      events([event, event, replace(event, 1, 'syn_two')]));
    expect(result.ok).toBe(false);
    expect(result.candidate?.events).toEqual([]);
    expect(result.candidate?.uncertainAccountIds).toEqual(['syn_one', 'syn_two']);
    expect(result.report.events).toEqual({ received: 3, accepted: 0, duplicates: 0, quarantined: 3 });
    reconciles(result);
  });

  it('quarantines repeated invalid records rather than accepting one as a duplicate', () => {
    const invalid = replace(event, 3, 'not_an_event');
    const result = importDataset(signups(), events([invalid, invalid]));
    expect(result.ok).toBe(false);
    expect(result.report.events).toEqual({ received: 2, accepted: 0, duplicates: 0, quarantined: 2 });
    reconciles(result);
  });

  it('accounts for orphan events but does not invent a signup population for them', () => {
    const result = importDataset(signups(), events([replace(event, 1, 'syn_orphan')]));
    expect(result.ok).toBe(false);
    expect(result.report.events.quarantined).toBe(1);
    expect(result.report.issues.some(issue => issue.code === 'orphan_event')).toBe(true);
    expect(result.candidate?.signups).toHaveLength(1);
    expect(result.candidate?.uncertainAccountIds).not.toContain('syn_orphan');
    reconciles(result);
  });

  it('does not infer a failure when invalid event account IDs are unassignable', () => {
    const result = importDataset(signups(), events([replace(event, 1, '')]));
    expect(result.ok).toBe(false);
    expect(result.candidate?.uncertainAccountIds).toContain('syn_one');
  });

  it('quarantines pre-signup events, including submillisecond boundaries', () => {
    const result = importDataset(signups([replace(signup, 1, '2026-09-01T00:00:00.0002Z')]),
      events([replace(event, 2, '2026-09-01T00:00:00.0001Z')]));
    expect(result.ok).toBe(false);
    expect(result.report.issues.some(issue => issue.code === 'pre_signup_event')).toBe(true);
    expect(result.candidate?.uncertainAccountIds).toEqual(['syn_one']);
    reconciles(result);
  });

  it('allows an event at exactly its signup instant with an equivalent offset', () => {
    const result = importDataset(signups(), events([replace(event, 2, '2026-09-01T05:30:00+05:30')]));
    expect(result.ok).toBe(true);
  });

  it.each([
    [3, 'checkout_complete'], [4, 'TRUE'], [4, '1'], [4, 'false'], [4, ''],
    [5, ''], [5, '100_hours'], [5, '=FORMULA()'],
  ])('rejects unsupported or incomplete first-value evidence at column %s', (column, value) => {
    const result = importDataset(signups(), events([replace(event, column, value)]));
    expect(result.ok).toBe(false);
    expect(result.report.events.quarantined).toBe(1);
    expect(result.candidate?.uncertainAccountIds).toContain('syn_one');
    expect(JSON.stringify(result.report)).not.toContain('FORMULA');
    reconciles(result);
  });

  it.each(['time_saved', 'rework_reduced', 'outcome_confirmed'])('accepts hypothetical evidence category %s with complete result', evidence => {
    expect(importDataset(signups(), events([replace(event, 5, evidence)])).ok).toBe(true);
  });

  it('enforces UTF-8 byte limits independently for both files without retaining input', () => {
    const huge = 'é'.repeat(MAX_BYTES / 2 + 1);
    expect(huge.length).toBeLessThan(MAX_BYTES);
    for (const result of [importDataset(huge, events([])), importDataset(signups(), huge)]) {
      expect(result.ok).toBe(false);
      expect(result.candidate).toBeNull();
      expect(result.report.fatalErrors.some(message => message.includes('1 MiB'))).toBe(true);
      reconciles(result);
    }
    expect(importDataset(' '.repeat(MAX_BYTES), events([])).report.fatalErrors.join()).not.toContain('1 MiB');
  });

  it('allows exactly 10000 data rows and quarantines an entire over-limit table', () => {
    const rows = Array.from({ length: MAX_ROWS }, (_, index) => replace(signup, 0, `syn_${index}`));
    const valid = importDataset(signups(rows), events([]));
    expect(valid.ok).toBe(true);
    expect(valid.report.signups.accepted).toBe(MAX_ROWS);
    reconciles(valid);
    const invalid = importDataset(signups([...rows, replace(signup, 0, 'syn_over_limit')]), events([]));
    expect(invalid.ok).toBe(false);
    expect(invalid.candidate).toBeNull();
    expect(invalid.report.signups).toEqual({ received: MAX_ROWS + 1, accepted: 0, duplicates: 0, quarantined: MAX_ROWS + 1 });
    reconciles(invalid);
  });

  it('counts event rows against the same limit even if every row is a duplicate', () => {
    const result = importDataset(signups(), events(Array.from({ length: MAX_ROWS + 1 }, () => event)));
    expect(result.ok).toBe(false);
    expect(result.report.events.received).toBe(MAX_ROWS + 1);
    expect(result.report.events.quarantined).toBe(MAX_ROWS + 1);
    reconciles(result);
  });

  it('roundtrips the sample and keeps a deliberately invalid draft separate from it', () => {
    const active = loadSample();
    const snapshot = JSON.stringify(active);
    const csv = sampleCsv();
    const valid = importDataset(csv.signups, csv.events);
    expect(valid.ok).toBe(true);
    expect(valid.candidate?.id).toBe(active.id);
    expect(valid.candidate?.signups).toEqual(active.signups);
    expect(valid.candidate?.events).toEqual(active.events);
    const badCsv = invalidExampleCsv();
    const invalid = importDataset(badCsv.signups, badCsv.events);
    expect(invalid.ok).toBe(false);
    expect(invalid.candidate).not.toBeNull();
    expect(JSON.stringify(active)).toBe(snapshot);
    reconciles(valid);
    reconciles(invalid);
  });
});
