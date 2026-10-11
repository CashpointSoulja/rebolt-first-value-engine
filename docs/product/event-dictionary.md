# Synthetic event dictionary

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Exported milestone version: **`synthetic-first-value-verified/1`**; event name **`first_value_verified`**. Export metadata does not add a field to the shared `Event` type. The taxonomy is hypothetical and is not an observed Rebolt schema.

| `event_name` | Intended interpretation | What it does not establish |
|---|---|---|
| `qualified_lead` | A synthetic account reached a qualification observation | A created workspace, product use, signed agreement or revenue |
| `pilot_setup` | Synthetic setup for a defined use case | Completed value, real integration, a scheduled pilot or the length of an actual pilot |
| `first_use` | An initial synthetic product-use observation | A completed use-case result, value evidence or activation by itself |
| `first_value_verified` | A candidate observation of a completed synthetic use-case result | Value unless the completion/evidence conditions below are also met |

Every event requires the stable synthetic IDs and timestamp specified by the [data contract](data-contract.md). There are no arbitrary event names, payload attributes, customer messages, payment amounts, currency fields or operational records.

## Verified first value

A qualifying value event must satisfy **all** of:

1. `eventName === 'first_value_verified'`.
2. `resultComplete === true`.
3. `valueEvidence` is `time_saved`, `rework_reduced` or `outcome_confirmed`.
4. The account and event are valid and attributable under the data-quality contract.
5. The event instant is in `[signupAt, signupAt + windowDays)` and observable at the declared cutoff.

| Evidence category | Hypothetical meaning | Prohibited reading |
|---|---|---|
| `time_saved` | The synthetic result is tagged with time-related evidence | Measured minutes/hours saved, real productivity or ROI |
| `rework_reduced` | The synthetic result is tagged with rework-related evidence | A measured reduction in defects or maintenance risk |
| `outcome_confirmed` | A synthetic result is tagged as confirmed | A real customer's endorsement, payment or safe operational outcome |

Blank/false completion or blank evidence does **not** satisfy first value. The importer quarantines such a `first_value_verified` row as `first_value_evidence`, blocks commit and flags the affected account for diagnostic uncertainty. Other allowed event names may carry false/blank completion without claiming verified value. An incomplete candidate observation is not, on its own, proof of failure; failure requires the separate complete-window coverage contract.

Repeated qualifying events count the account once. Choose its earliest qualifying in-window instant for converter time-to-first-value. Setup and first-use events cannot substitute for missing verified value.

## Stage counts are observations, not an ordered funnel

The four allowed names supply stage rows. Count distinct eligible **mature** accounts with an observed qualifying stage event inside their window; all stage denominators are the same mature D. The verified-value stage applies the completion/evidence rule above.

Do not infer missing predecessor events, enforce monotonic counts by rewriting data or divide adjacent stages as if they were a guaranteed funnel. A unit can have verified value without a recorded `first_use`. Different instrumentation and incomplete coverage can change the observed shape.

## Explicitly absent from this schema

No visitor population, spend, checkout, payment confirmation, subscription lifecycle, revenue, experiment assignment or operational aircraft action. Therefore no visitor-to-signup, CAC, ROAS, paid conversion, causal attribution or significance calculation is available. A future billing contract would need separate authorized scope, events, entry population, window and payment evidence.
