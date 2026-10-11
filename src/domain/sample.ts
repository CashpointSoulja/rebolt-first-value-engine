import Papa from 'papaparse';
import { EVENT_HEADERS, importDataset, SIGNUP_HEADERS } from './dataset';
import { CHANNELS, SEGMENTS, type Dataset, type EventName } from './types';

/**
 * Deterministic synthetic arithmetic fixture, not customer or Rebolt performance.
 * At the shared defaults: D=10, N=4, U=2, F=4 and 17 total signup units.
 */
export function sampleCsv(): { signups: string; events: string } {
  const signups: string[][] = [];
  const events: string[][] = [];
  const signupDates = [
    ...Array.from({ length: 10 }, (_, index) => `2026-09-${String(index + 7).padStart(2, '0')}T00:00:00Z`),
    '2026-10-06T00:00:00Z', '2026-10-08T00:00:00Z', '2026-10-10T00:00:00Z',
    '2026-09-12T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-14T00:00:00Z',
    '2026-08-31T00:00:00Z',
  ];
  const accountId = (number: number) => `syn_${String(number).padStart(3, '0')}`;
  signupDates.forEach((date, index) => {
    const number = index + 1;
    signups.push([
      accountId(number), date,
      number === 14 || number === 15 ? 'excluded' : number === 16 ? 'unknown' : 'eligible',
      SEGMENTS[index % SEGMENTS.length], CHANNELS[index % CHANNELS.length],
      number === 9 || number === 10 ? 'unknown' : 'complete',
    ]);
  });
  const addEvent = (number: number, name: EventName, hours: number) => {
    events.push([
      `evt_${String(events.length + 1).padStart(3, '0')}`, accountId(number),
      new Date(Date.parse(signupDates[number - 1]) + hours * 3600000).toISOString(),
      name, name === 'first_value_verified' ? 'true' : 'false',
      name === 'first_value_verified'
        ? ['time_saved', 'rework_reduced', 'outcome_confirmed'][(number - 1) % 3] : '',
    ]);
  };
  for (let number = 1; number <= 8; number += 1) addEvent(number, 'qualified_lead', 1);
  for (let number = 1; number <= 6; number += 1) addEvent(number, 'pilot_setup', 2);
  for (let number = 1; number <= 5; number += 1) addEvent(number, 'first_use', 4);
  for (let number = 1; number <= 4; number += 1) addEvent(number, 'first_value_verified', number * 24);
  // An observed early success stays pending until this signup's full window ends.
  addEvent(11, 'first_value_verified', 24);
  return {
    signups: Papa.unparse({ fields: SIGNUP_HEADERS, data: signups }),
    events: Papa.unparse({ fields: EVENT_HEADERS, data: events }),
  };
}

export function loadSample(): Dataset {
  const csv = sampleCsv();
  const imported = importDataset(csv.signups, csv.events);
  if (!imported.ok || !imported.candidate) throw new Error('Synthetic reference fixture failed validation.');
  return { ...imported.candidate, label: 'Synthetic reference · 17 accounts' };
}

/** Deliberately invalid draft for demonstrating all-or-nothing import. */
export function invalidExampleCsv(): { signups: string; events: string } {
  const csv = sampleCsv();
  return {
    signups: `${csv.signups}\r\nsyn_001,2026-09-07T00:00:00Z,eligible,small_business,organic,complete`,
    events: `${csv.events}\r\nevt_invalid_example,syn_002,2026-09-10T00:00:00Z,first_value_verified,false,time_saved`,
  };
}
