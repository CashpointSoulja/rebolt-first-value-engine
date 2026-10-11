# Implementation metric contract

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.** All examples below are synthetic arithmetic, not fixture execution or customer performance.

This clarifies the preserved [provisional contract](../measurement-contract.md): **time maturity is independent of outcome completeness**. In particular, incomplete outcome coverage must not remove a time-mature eligible account from D.

## Settings and unit

One unit is one synthetic account, not a person, event or real customer workspace. Use a fixed dataset identity and the accepted settings snapshot.

| `MetricSettings` field | Default from shared types | Meaning |
|---|---|---|
| `cohortStart` | `2026-09-01T00:00:00Z` | Inclusive signup cohort start |
| `cohortEnd` | `2026-10-11T00:00:00Z` | Exclusive signup cohort end |
| `cutoff` | `2026-10-11T00:00:00Z` | Declared observation instant; not the newest event or current clock |
| `windowDays` | `7` | Elapsed days after each signup; unrelated to Rebolt's four-to-six-week pilot |
| `assumeComplete` | `true` | Explicit synthetic completeness assumption; never silently fills an unknown row's coverage |
| `segment` | `all` | `all` or a member of `SEGMENTS` |
| `channel` | `all` | `all` or a member of `CHANNELS` |

Interpret a day as 24 hours of elapsed time and compare UTC instants, not local calendar-day boundaries. Cohort membership is `[cohortStart, cohortEnd)`; milestone membership is `[signup, signup + W)`. Full-window maturity occurs when `signup + W <= cutoff`. An event exactly at the window end is excluded; one exactly at signup is included if otherwise valid.

`validateSettings` requires valid known-offset timestamps, `cohortStart < cohortEnd <= cutoff`, an integer `windowDays` from **1 to 365**, boolean `assumeComplete`, and supported filters. It returns errors rather than mutating settings. `analyze` throws for invalid settings; the UI must validate before committing, not turn invalid settings into a valid zero-population result.

## Population partition

`population.total` includes **all unique signup units**, including conflicting-ID diagnostic units. Date/attribute filter mismatches count as `outOfCohort`, not removed from total:

```text
total = outOfCohort + excluded + eligibilityUnknown
        + mature + pending + maturityUnknown
```

Every account belongs to exactly one bucket under the implementation's precedence:

1. Conflicting or undated signup units are `maturityUnknown` before filters; their signup attributes cannot safely classify them.
2. Validly dated units outside the date cohort or selected segment/channel are `outOfCohort`.
3. Remaining positively excluded units are `excluded`.
4. Remaining unresolved eligibility is `eligibilityUnknown`, not inferred eligible or excluded.
5. Remaining eligible units with a full elapsed window are `mature`; the rest are `pending`.

Filters may not silently remove unknown category members when `all` is selected. Report the selected cohort/filter context and explain that `outOfCohort` includes attribute-filter exclusions. Conflicting or unreliable signup timing in rejected diagnostic candidates must not yield a definitive mature outcome.

An early converter that is not yet time-mature remains **pending**, outside mature D. Outcome coverage alone does not cause `pending` or `maturityUnknown`.

## Outcomes among eligible time-mature accounts

```text
D = population.mature
N = accounts with confirmed qualifying first value
U = accounts whose value outcome is unknown
F = D - N - U
coverage = (D - U) / D
lower = N / D
upper = (N + U) / D
```

- A trusted qualifying event can confirm value. An identifiable account affected by invalid/conflicting evidence must remain uncertain in diagnostic analysis, not turn into a confident success or failure.
- With no confirmed value, **F requires complete, trusted outcome observation for the full window**. Unknown row coverage or a disabled completeness assumption cannot manufacture a failure.
- `resultComplete=false` means a particular candidate result was not completed; it does not establish complete observation of the account's entire window.
- Unknown eligibility, pending and maturity-unknown units remain visible outside D. Do not quietly shrink D to known outcomes.

**Open source-review discrepancy:** the current metric code prioritizes any qualifying event before checking `uncertainAccountIds`/invalid observations, and a current test explicitly expects that override. The stricter requirement above keeps accounts affected by invalid/conflicting evidence unknown in diagnostic candidates. Resolve and retest that policy before release; unknown coverage alone is not the same as quarantined/conflicting evidence. See [verification gaps](test-results.md).

| Condition | Required display |
|---|---|
| D>0, U=0 | Definitive synthetic rate N/D; show N, D, U, F, coverage and exclusions |
| D>0, U>0 | Bounds N/D to (N+U)/D and coverage; no definitive overall rate |
| D=0 | Rate, bounds and coverage are `null` / “not estimable”, never 0% |
| N=0 | Converter median is `null` / unavailable, not zero hours |

If a known-outcome-only fraction N/(D−U) is ever displayed, explicitly label its different denominator and never replace the primary bounds or D. The shared `Outcome` type has no separate known-outcome-only-rate field; it is not a required headline.

### Worked arithmetic, not actual test results

For D=10, N=4, U=2: F=4, coverage=80%, lower=40%, upper=60%, and `rate=null`. Reducing U is a measurement change, not evidence that a product intervention improved conversion.

For D=3, N=0, U=3: F=0, coverage=0%, bounds 0–100%, `rate=null`. For D=0, all fractional outputs are not estimable.

## Time-to-first-value

Compute hours from signup to the earliest qualifying value event for **confirmed mature converters only**. The median is the middle value, or the mean of the two middle values for an even count. Show the converter-only label and accompanying N/pending/non-converter/unknown context. This is not a population median or a time-to-value estimate for excluded, pending or unknown units.

## Stages and segment reconciliation

- Each stage is a distinct-account observed reached-count with denominator D, not adjacent-stage conversion or guaranteed monotonic order.
- Freeze segment/channel from signup. Never move successful units retrospectively.
- Include explicit `unknown` segment and channel buckets.
- Within the same selected population, segment D/N/U/F totals and channel D/N/U/F totals must independently equal their overall counterparts; pending totals must also reconcile. Each group applies the same null/bounds rules.
- Segment percentages are descriptive, not causal acquisition credit or statistically significant comparisons. Sparse groups must not gain apparent certainty by hiding their denominators.

## Version and export discipline

The implemented export declares metric **`synthetic-first-value-metric/1`**, milestone **`synthetic-first-value-verified/1`** and plan **`synthetic-activation-plan/1`**. It retains settings, counts, completeness assumptions, exclusions and population context without extending shared input types.

Its `aggregate-v1-…` identifier describes selected aggregates/settings, **not the original dataset ID or a unique raw-dataset fingerprint**. Row-partition counts are not present in `Analysis`; the export explicitly marks them unavailable and directs reviewers to the active import report rather than inventing them. See the [export contract](experiment-rationale.md). Require explicit new versioning and review before changing the milestone rule or denominator.
