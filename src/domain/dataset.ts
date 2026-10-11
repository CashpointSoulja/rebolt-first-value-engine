import Papa from 'papaparse';
import {
  CHANNELS, EVENTS, SEGMENTS,
  type Dataset, type Event, type ImportResult, type Issue, type RowPartition,
  type Signup, type ValidationReport, type ValueEvidence,
} from './types';

export const SIGNUP_HEADERS: string[] = [
  'account_id', 'signup_at', 'eligibility', 'segment', 'channel', 'coverage',
];
export const EVENT_HEADERS: string[] = [
  'event_id', 'account_id', 'event_at', 'event_name', 'result_complete', 'value_evidence',
];
export const MAX_BYTES = 1024 * 1024;
export const MAX_ROWS = 10000;

// Synthetic IDs have a nonempty suffix and a maximum total length of 64.
// A true end-of-input assertion also rejects JavaScript's special final-newline
// match for "$", including newlines inside quoted CSV identifiers.
const accountIdPattern = /^syn_[A-Za-z0-9_-]{1,60}(?![\s\S])/;
const eventIdPattern = /^evt_[A-Za-z0-9_-]{1,60}(?![\s\S])/;
const evidenceValues: readonly ValueEvidence[] = [
  '', 'time_saved', 'rework_reduced', 'outcome_confirmed',
];

export interface Timestamp {
  iso: string;
  seconds: number;
  fraction: string;
}

/**
 * Parse a known-offset RFC3339 instant without Date's calendar rollover.
 * Leap seconds and RFC3339's unknown offset (-00:00) are not supported.
 * Preserve arbitrary fractional precision so boundary tests do not round it away.
 */
export function parseTimestamp(value: string): Timestamp | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || match[0] !== value) return null;
  const [, y, mo, d, h, mi, s, fractional = '', zone] = match;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]
    || hour > 23 || minute > 59 || second > 59 || zone === '-00:00'
  ) return null;
  let offset = 0;
  if (!/^[Zz]$/.test(zone)) {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
    offset = (offsetHour * 60 + offsetMinute) * (zone[0] === '+' ? 1 : -1);
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  date.setTime(date.getTime() - offset * 60000);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
  const fraction = fractional.replace(/0+$/, '');
  return {
    iso: `${date.toISOString().slice(0, 19)}.${fraction.padEnd(3, '0')}Z`,
    seconds: date.getTime() / 1000,
    fraction,
  };
}

export function compareTimestamps(a: Timestamp, b: Timestamp): number {
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  return a.fraction === b.fraction ? 0 : a.fraction < b.fraction ? -1 : 1;
}

type Table = Issue['table'];
interface CsvRow { row: number; cells: string[]; malformed: boolean }
interface ParsedTable { headers: string[]; rows: CsvRow[]; blocked: boolean }
interface Problem { code: string; message: string }
const emptyPartition = (): RowPartition => ({ received: 0, accepted: 0, duplicates: 0, quarantined: 0 });

function addIssue(report: ValidationReport, table: Table, row: number, problem: Problem, severity: Issue['severity'] = 'error') {
  report.issues.push({ table, row, ...problem, severity });
}

function parseTable(text: string, table: Table, expected: string[], report: ValidationReport): ParsedTable {
  const title = table === 'signups' ? 'Signups' : 'Events';
  const fatal = (message: string) => report.fatalErrors.push(`${title}: ${message}`);
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
    fatal('file exceeds the 1 MiB limit; it was not parsed and row counts are unavailable.');
    return { headers: [], rows: [], blocked: true };
  }
  // Array mode is intentional: Papa must not rename duplicate headers for us.
  const parsed = Papa.parse<string[]>(text, {
    header: false, delimiter: ',', dynamicTyping: false, skipEmptyLines: false,
  });
  // Papa's error row indexes precede skipEmptyLines filtering. Filter here instead
  // so a blank record cannot detach a malformed quote from its diagnostic row.
  const errorRows = new Set(parsed.errors.map(error => error.row));
  const records = parsed.data.map((cells, index) => ({ cells, index })).filter(({ cells, index }) =>
    errorRows.has(index) || cells.length !== 1 || cells[0] !== '',
  );
  const headers = records[0]?.cells ?? [];
  const rows = records.slice(1).map(({ cells, index }) => ({
    cells, row: index + 1, malformed: errorRows.has(index),
  }));
  report[table].received = rows.length;
  let blocked = false;
  if (new Set(headers).size !== headers.length) {
    fatal('duplicate headers are not permitted.');
    blocked = true;
  }
  if (headers.length !== expected.length || expected.some(header => !headers.includes(header))) {
    fatal('headers must contain exactly the documented columns, without extra or missing columns.');
    blocked = true;
  }
  if (parsed.errors.some(error => error.row === records[0]?.index || error.row === undefined)) {
    fatal('the CSV header or record structure is malformed.');
    blocked = true;
  }
  if (rows.length > MAX_ROWS) {
    fatal('file exceeds the 10000-data-row limit.');
    blocked = true;
  }
  if (blocked) report[table].quarantined = rows.length;
  return { headers, rows, blocked };
}

function at(parsed: ParsedTable, row: CsvRow, key: string): string {
  return row.cells[parsed.headers.indexOf(key)] ?? '';
}

function structuralProblems(parsed: ParsedTable, row: CsvRow): Problem[] {
  const problems: Problem[] = [];
  if (row.malformed) problems.push({ code: 'malformed_csv', message: 'Malformed quoted CSV record.' });
  if (row.cells.length !== parsed.headers.length) {
    problems.push({ code: 'column_count', message: 'Record has an unexpected number of columns.' });
  }
  return problems;
}

function groupsById(parsed: ParsedTable, key: string, pattern: RegExp): CsvRow[][] {
  const groups = new Map<string, CsvRow[]>();
  const unidentified: CsvRow[][] = [];
  for (const row of parsed.rows) {
    const id = at(parsed, row, key);
    if (!pattern.test(id)) {
      unidentified.push([row]);
      continue;
    }
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  return [...groups.values(), ...unidentified];
}

function hasConflict(group: CsvRow[]): boolean {
  const first = JSON.stringify(group[0].cells);
  return group.some(row => JSON.stringify(row.cells) !== first);
}

function groupStructure(parsed: ParsedTable, group: CsvRow[], problems: Problem[]) {
  for (const row of group) {
    for (const problem of structuralProblems(parsed, row)) {
      if (!problems.some(existing => existing.code === problem.code)) problems.push(problem);
    }
  }
}

function quarantine(report: ValidationReport, table: Table, group: CsvRow[], problems: Problem[]) {
  report[table].quarantined += group.length;
  for (const row of group) {
    for (const problem of problems) addIssue(report, table, row.row, problem);
  }
}

function accept(report: ValidationReport, table: Table, group: CsvRow[]) {
  report[table].accepted += 1;
  report[table].duplicates += group.length - 1;
  for (const row of group.slice(1)) {
    addIssue(report, table, row.row, {
      code: 'exact_duplicate', message: 'Exact duplicate record was counted once.',
    }, 'warning');
  }
}

function readSignup(parsed: ParsedTable, row: CsvRow): { value: Signup; problems: Problem[] } {
  const problems = structuralProblems(parsed, row);
  const field = (name: string) => at(parsed, row, name);
  const accountId = field('account_id');
  const time = parseTimestamp(field('signup_at'));
  const eligibility = field('eligibility') || 'unknown';
  const segment = field('segment') || 'unknown';
  const channel = field('channel') || 'unknown';
  const coverage = field('coverage') || 'unknown';
  if (!accountIdPattern.test(accountId)) problems.push({
    code: 'account_id', message: 'Account ID must use the synthetic prefix and contain 5–64 permitted characters.',
  });
  if (!time) problems.push({
    code: 'signup_at', message: 'Signup timestamp must be a valid RFC3339 calendar instant with a known timezone offset.',
  });
  if (!['eligible', 'excluded', 'unknown'].includes(eligibility)) problems.push({
    code: 'eligibility', message: 'Eligibility is outside the documented categories.',
  });
  if (!(SEGMENTS as readonly string[]).includes(segment)) problems.push({
    code: 'segment', message: 'Segment is outside the documented categories.',
  });
  if (!(CHANNELS as readonly string[]).includes(channel)) problems.push({
    code: 'channel', message: 'Channel is outside the documented categories.',
  });
  if (!['complete', 'unknown'].includes(coverage)) problems.push({
    code: 'coverage', message: 'Coverage is outside the documented categories.',
  });
  // Diagnostic placeholders retain only safe, valid attributes; never hostile input.
  return {
    value: {
      accountId: accountIdPattern.test(accountId) ? accountId : '',
      signupAt: time?.iso ?? '',
      eligibility: eligibility === 'eligible' || eligibility === 'excluded' ? eligibility : 'unknown',
      segment: (SEGMENTS as readonly string[]).includes(segment) ? segment as Signup['segment'] : 'unknown',
      channel: (CHANNELS as readonly string[]).includes(channel) ? channel as Signup['channel'] : 'unknown',
      coverage: coverage === 'complete' ? 'complete' : 'unknown',
    },
    problems,
  };
}

function readEvent(parsed: ParsedTable, row: CsvRow): { value: Event | null; problems: Problem[] } {
  const problems = structuralProblems(parsed, row);
  const field = (name: string) => at(parsed, row, name);
  const eventId = field('event_id');
  const accountId = field('account_id');
  const time = parseTimestamp(field('event_at'));
  const eventName = field('event_name');
  const complete = field('result_complete');
  const evidence = field('value_evidence');
  if (!eventIdPattern.test(eventId)) problems.push({
    code: 'event_id', message: 'Event ID must use the synthetic prefix and contain 5–64 permitted characters.',
  });
  if (!accountIdPattern.test(accountId)) problems.push({
    code: 'account_id', message: 'Account ID must use the synthetic prefix and contain 5–64 permitted characters.',
  });
  if (!time) problems.push({
    code: 'event_at', message: 'Event timestamp must be a valid RFC3339 calendar instant with a known timezone offset.',
  });
  if (!(EVENTS as readonly string[]).includes(eventName)) problems.push({
    code: 'event_name', message: 'Event name is outside the documented categories.',
  });
  if (!['', 'true', 'false'].includes(complete)) problems.push({
    code: 'result_complete', message: 'Result completeness must be true, false, or blank.',
  });
  if (!(evidenceValues as readonly string[]).includes(evidence)) problems.push({
    code: 'value_evidence', message: 'Value evidence is outside the hypothetical evidence categories.',
  });
  if (eventName === 'first_value_verified' && (complete !== 'true' || !evidenceValues.includes(evidence as ValueEvidence) || evidence === '')) {
    problems.push({
      code: 'first_value_evidence',
      message: 'Verified first value requires a complete result and a permitted hypothetical evidence category.',
    });
  }
  return {
    value: problems.length || !time ? null : {
      eventId, accountId, eventAt: time.iso, eventName: eventName as Event['eventName'],
      resultComplete: complete === 'true', valueEvidence: evidence as ValueEvidence,
    },
    problems,
  };
}

function fingerprint(value: unknown): string {
  // A reproducibility label, not a cryptographic integrity or anonymity guarantee.
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Pure, local-only validation of both CSVs. Never commits a dataset.
 * Any error blocks import; a non-null candidate may contain diagnostic-only
 * signup placeholders. Only candidates returned with ok=true may become active.
 * Empty records without parse errors are skipped; all data records reconcile.
 */
export function importDataset(signupsCsv: string, eventsCsv: string): ImportResult {
  const report: ValidationReport = {
    signups: emptyPartition(), events: emptyPartition(), issues: [], fatalErrors: [],
  };
  const signupTable = parseTable(signupsCsv, 'signups', SIGNUP_HEADERS, report);
  const eventTable = parseTable(eventsCsv, 'events', EVENT_HEADERS, report);
  const signups: Signup[] = [];
  const events: Event[] = [];
  const uncertain = new Set<string>();
  const conflicts = new Set<string>();
  const reservedIds = new Set(signupTable.rows.map(row => at(signupTable, row, 'account_id')));

  if (!signupTable.blocked) {
    for (const group of groupsById(signupTable, 'account_id', accountIdPattern)) {
      const id = at(signupTable, group[0], 'account_id');
      if (hasConflict(group)) {
        quarantine(report, 'signups', group, [{
          code: 'conflicting_id', message: 'Conflicting signup ID: all records for this ID were quarantined.',
        }]);
        conflicts.add(id);
        uncertain.add(id);
        continue;
      }
      const { value, problems } = readSignup(signupTable, group[0]);
      groupStructure(signupTable, group, problems);
      if (problems.length) {
        quarantine(report, 'signups', group, problems);
        if (!value.accountId) {
          let suffix = 0;
          do {
            value.accountId = `syn_quarantined_row_${group[0].row}_${suffix++}`;
          } while (reservedIds.has(value.accountId));
          reservedIds.add(value.accountId);
          // Without a stable ID, no event can reliably establish this unit's value.
          value.signupAt = '';
        }
        uncertain.add(value.accountId);
      } else {
        accept(report, 'signups', group);
      }
      signups.push(value);
    }
  }
  const signupMap = new Map(signups.map(signup => [signup.accountId, signup]));
  const markUncertain = (group: CsvRow[]) => {
    for (const row of group) {
      const id = at(eventTable, row, 'account_id');
      if (signupMap.has(id) || conflicts.has(id)) uncertain.add(id);
      // Unassignable invalid events may affect any unit; do not assume failures.
      if (!accountIdPattern.test(id)) {
        for (const signup of signups) uncertain.add(signup.accountId);
      }
    }
  };
  if (!eventTable.blocked) {
    for (const group of groupsById(eventTable, 'event_id', eventIdPattern)) {
      if (hasConflict(group)) {
        quarantine(report, 'events', group, [{
          code: 'conflicting_id', message: 'Conflicting event ID: all records for this ID were quarantined.',
        }]);
        markUncertain(group);
        continue;
      }
      const { value, problems } = readEvent(eventTable, group[0]);
      groupStructure(eventTable, group, problems);
      const signup = signupMap.get(at(eventTable, group[0], 'account_id'));
      const signupTime = signup && parseTimestamp(signup.signupAt);
      if (!signup) problems.push({
        code: 'orphan_event', message: 'Event has no unambiguous signup record in this import.',
      });
      else if (!signupTime) problems.push({
        code: 'signup_unusable', message: 'Event cannot be ordered against an unknown signup timestamp.',
      });
      else if (value && compareTimestamps(parseTimestamp(value.eventAt)!, signupTime) < 0) problems.push({
        code: 'pre_signup_event', message: 'Event occurs before its signup and was quarantined.',
      });
      if (problems.length || !value) {
        quarantine(report, 'events', group, problems);
        markUncertain(group);
      } else {
        accept(report, 'events', group);
        events.push(value);
      }
    }
  }
  const ok = report.fatalErrors.length === 0 && !report.issues.some(issue => issue.severity === 'error');
  const contents = {
    signups, events, uncertainAccountIds: [...uncertain].sort(), conflictingSignupIds: [...conflicts].sort(),
  };
  const candidate: Dataset | null = report.fatalErrors.length ? null : {
    id: `synthetic-${fingerprint(contents)}`, label: 'Imported synthetic dataset', ...contents, report,
  };
  return { ok, candidate, report };
}
