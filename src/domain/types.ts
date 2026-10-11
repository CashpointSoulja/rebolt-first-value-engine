export const SEGMENTS = ['enterprise', 'mid_market', 'small_business', 'unknown'] as const;
export const CHANNELS = ['organic', 'paid_search', 'partner', 'outbound', 'unknown'] as const;
export const EVENTS = ['qualified_lead', 'pilot_setup', 'first_use', 'first_value_verified'] as const;
export type Segment = typeof SEGMENTS[number];
export type Channel = typeof CHANNELS[number];
export type EventName = typeof EVENTS[number];
export type Eligibility = 'eligible' | 'excluded' | 'unknown';
export type Coverage = 'complete' | 'unknown';
export type ValueEvidence = 'time_saved' | 'rework_reduced' | 'outcome_confirmed' | '';
export interface Signup {
  accountId: string; signupAt: string; eligibility: Eligibility;
  segment: Segment; channel: Channel; coverage: Coverage;
}
export interface Event {
  eventId: string; accountId: string; eventAt: string; eventName: EventName;
  resultComplete: boolean; valueEvidence: ValueEvidence;
}
export interface RowPartition { received: number; accepted: number; duplicates: number; quarantined: number }
export interface Issue { table: 'signups' | 'events'; row: number; code: string; message: string; severity: 'error' | 'warning' }
export interface ValidationReport {
  signups: RowPartition; events: RowPartition; issues: Issue[]; fatalErrors: string[];
}
export interface Dataset {
  id: string; label: string; signups: Signup[]; events: Event[]; report: ValidationReport;
  uncertainAccountIds: string[]; conflictingSignupIds: string[];
}
export interface ImportResult { ok: boolean; candidate: Dataset | null; report: ValidationReport }
export interface MetricSettings {
  cohortStart: string; cohortEnd: string; cutoff: string; windowDays: number;
  assumeComplete: boolean; segment: 'all' | Segment; channel: 'all' | Channel;
}
export const DEFAULT_SETTINGS: MetricSettings = {
  cohortStart: '2026-09-01T00:00:00Z', cohortEnd: '2026-10-11T00:00:00Z',
  cutoff: '2026-10-11T00:00:00Z', windowDays: 7, assumeComplete: true,
  segment: 'all', channel: 'all',
};
export interface Population {
  total: number; outOfCohort: number; excluded: number; eligibilityUnknown: number;
  mature: number; pending: number; maturityUnknown: number;
}
export interface Outcome {
  N: number; D: number; U: number; F: number; coverage: number | null;
  lower: number | null; upper: number | null; rate: number | null; medianHours: number | null;
}
export interface SegmentResult extends Outcome { key: string; label: string; pending: number }
export interface StageCount { name: EventName; label: string; count: number; denominator: number }
export interface Analysis extends Outcome {
  rowPartitions: { signups: RowPartition; events: RowPartition };
  population: Population; stages: StageCount[];
  segments: SegmentResult[]; channels: SegmentResult[];
  datasetId: string; notices: string[];
}
export interface Experiment {
  id: string; title: string; hypothesis: string; audience: string; action: string;
  impact: 1 | 2 | 3; confidence: 1 | 2 | 3; effort: 1 | 2 | 3; score: number;
  rationale: { impact: string; confidence: string; effort: string }; evidence: string;
  guardrails: string; stopCriteria: string; successCriteria: string;
}
export interface PlanInput {
  owner: string; hypothesis: string; guardrails: string; stopCriteria: string;
  successCriteria: string; campaignUrl?: string;
}
export interface PlanResult { ok: boolean; json: string; csv: string; errors: string[] }
export interface UTMInput {
  destination: string; source: string; medium: string; campaign: string; content: string; term: string;
}
export interface UTMResult { ok: boolean; url: string; errors: string[] }
