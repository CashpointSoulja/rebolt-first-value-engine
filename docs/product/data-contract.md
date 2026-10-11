# Implementation data and interface contract

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.** Contract scope: synthetic, local-only CSV processing. This is not Rebolt's data model.

Authoritative TypeScript shapes: [`src/domain/types.ts`](../../src/domain/types.ts). The archived [measurement proposal](../measurement-contract.md) is preserved; this document defines strict implementation commit rules.

## Public module interfaces

```ts
// dataset.ts
importDataset(signupsCsv: string, eventsCsv: string): ImportResult
SIGNUP_HEADERS: string[]
EVENT_HEADERS: string[]
MAX_BYTES: number
MAX_ROWS: number

// metrics.ts
analyze(dataset: Dataset, settings: MetricSettings): Analysis
validateSettings(settings: MetricSettings): string[]

// sample.ts
loadSample(): Dataset
sampleCsv(): { signups: string; events: string }
invalidExampleCsv(): { signups: string; events: string }

// tools.ts
rankExperiments(analysis: Analysis): Experiment[]
buildUTM(input: UTMInput): UTMResult
exportPlan(
  analysis: Analysis, settings: MetricSettings, experiment: Experiment,
  input: PlanInput, identifiers: string[]
): PlanResult
safeCsvCell(value: string): string
```

These functions have no authorized network or persistence side effects. The UI owns draft/active state and explicit file downloads.

## CSV v1

The exact header sets are:

```csv
account_id,signup_at,eligibility,segment,channel,coverage
```

```csv
event_id,account_id,event_at,event_name,result_complete,value_evidence
```

Missing, repeated or unexpected column names are errors, not an invitation to ignore or retain arbitrary fields. Column order may vary; the exact names may not. A UTF-8 BOM and valid CSV quoting must be handled deliberately. Reject malformed quoting and inconsistent record width. Empty tables may contain headers only; empty physical lines are skipped and the header is not a data record. Never infer IDs, timestamps or enums from free text.

### Signup records

| CSV field | TypeScript field | Valid values / rule |
|---|---|---|
| `account_id` | `accountId` | Required; `^syn_[A-Za-z0-9_-]+$`; implementation bounds suffix to 1–60 characters, total length ≤64 |
| `signup_at` | `signupAt` | Required valid RFC3339 instant with `Z` or numeric timezone offset; no timezone-naive date/time |
| `eligibility` | `eligibility` | `eligible`, `excluded`, `unknown`; blank → `unknown` |
| `segment` | `segment` | `enterprise`, `mid_market`, `small_business`, `unknown`; blank → `unknown` |
| `channel` | `channel` | `organic`, `paid_search`, `partner`, `outbound`, `unknown`; blank → `unknown` |
| `coverage` | `coverage` | `complete`, `unknown`; blank → `unknown` |

`excluded` is an explicit synthetic eligibility category. Do not infer exclusion from a missing value or an inconvenient outcome. Freeze segment and channel at signup.

### Event records

| CSV field | TypeScript field | Valid values / rule |
|---|---|---|
| `event_id` | `eventId` | Required; `^evt_[A-Za-z0-9_-]+$`; implementation bounds suffix to 1–60 characters, total length ≤64 |
| `account_id` | `accountId` | Required matching synthetic account ID; orphan references are errors |
| `event_at` | `eventAt` | Required RFC3339 instant; no event before its signup |
| `event_name` | `eventName` | `qualified_lead`, `pilot_setup`, `first_use`, `first_value_verified` |
| `result_complete` | `resultComplete` | `true`, `false`; blank → `false`; no other tokens |
| `value_evidence` | `valueEvidence` | `time_saved`, `rework_reduced`, `outcome_confirmed`, or blank |

Evidence categories are hypothetical labels, not measured time, reduced defects or real customer outcomes. The [event dictionary](event-dictionary.md) specifies which combinations establish value.

All timestamps represent instants; compare normalized UTC instants, including equivalent offsets and calendar validity. The parser supports fractional seconds without rounding away window-boundary precision; leap seconds and RFC3339's unknown offset `-00:00` are not supported. File-provided labels, timestamps and IDs must never be rendered as executable HTML. Synthetic prefixes are a constraint, not a guarantee that arbitrary user input is safe to publish.

## Limits

Read back from `dataset.ts`: **`MAX_BYTES = 1,048,576` (1 MiB) per table input**, **`MAX_ROWS = 10,000` data records per table**. The exported constants remain the single source for UI copy and boundary tests. Byte limits use UTF-8 encoded input, not JavaScript character count; row limits exclude the header and skipped empty physical lines. Inputs exactly at the limits are permitted if otherwise valid.

Oversized byte inputs are rejected before parsing; their zero row counters mean **not read / unavailable**, not an empty file. A row-limit violation after parsing quarantines the parsed data records. Fatal errors return no candidate. These boundaries are exercised in the passing ingestion suite; see [actual results](test-results.md).

## Validation report and reconciliation

```ts
RowPartition = { received, accepted, duplicates, quarantined }
Issue = { table, row, code, message, severity }
ValidationReport = { signups, events, issues, fatalErrors }
ImportResult = { ok, candidate, report }
```

For **each** table:

```text
received = accepted + duplicates + quarantined
```

- A received record occupies exactly one bucket. Duplicate or invalid events must not disappear from accounting.
- Exact duplicate records may collapse with warnings. A conflicting stable ID is not “latest wins”; quarantine the conflict and flag affected accounts.
- An orphan, pre-signup, unsupported, malformed or otherwise invalid event remains accounted for. Mark an identifiable affected account uncertain in diagnostic candidates.
- `uncertainAccountIds` and `conflictingSignupIds` preserve diagnostic uncertainty; they are not exported account lists.
- Missing coverage alone is permitted. It is an unknown-outcome condition, not a row error or automatic non-conversion.
- A row named `first_value_verified` without `true` completion and an approved nonblank evidence category is a validation error, quarantined rather than accepted as verified value.
- Messages identify table/row/reason without copying private-looking rejected values into UI, logs or exports.

`ok=true` requires no row errors and no fatal errors. A candidate may be non-null while `ok=false`: it exists only to explain the rejected draft. Warnings alone may permit commit.

## Active-state invariant

Commit both validated tables as **one dataset**; never replace only signups or only events. On any import error, cancellation or failed read, keep the last valid active dataset and settings. A quarantined diagnostic candidate never becomes active. Validate settings separately and commit the full settings draft only on success. Recompute results from the accepted dataset/settings pair, not mixed old/new pieces.

## Local data and output boundary

No dataset upload, fetch beacon, analytics event, remote validation, backend, browser storage or default persistence is authorized. Bundle assets may load from the static host; imported contents, identifiers and plan drafts must not be transmitted. No real customer CSV is acceptable even if local.

Explicit downloads are local outputs; they must not contain account/event identifiers, raw rows, unknown columns or rejected values. Free-text plan fields allow only synthetic non-identifying planning content, rendered as text. UTM construction is not navigation. See [export safeguards](experiment-rationale.md).
