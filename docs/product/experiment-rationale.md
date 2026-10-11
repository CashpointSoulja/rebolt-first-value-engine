# Experiment rationale, UTM and export safeguards

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.** All recommendations are hypothetical plans based on synthetic observations.

## Why this workbench recommends hypotheses, not winners

The [role evidence](research-journey.md) supports acquisition-to-activation experimentation and measurement frameworks. It does not supply a benchmark, experiment result or Rebolt product gap. The owner-reported journey ends before authenticated use; it cannot establish a verified operational value milestone.

Rank proposals only after showing the measurement context. Missing outcomes can motivate an evidence-quality hypothesis, but cannot be relabeled customer friction.

| Hypothesis family | Synthetic signal that could motivate review | Proposed reversible action | Evidence limit / guardrail |
|---|---|---|---|
| Measurement readiness | U>0 or unclear coverage | Define the cutoff, completeness owner and value-evidence checklist | Improved observation is not improved conversion; stop if coverage cannot be trusted |
| Qualification-to-use-case handoff | Low observed qualification/setup counts relative to D | Draft a clearer use-case/owner/timeline handoff | Counts are not causal funnel loss; do not reproduce sign-in or claim to fix a missing feature |
| Setup-to-first-use guidance | Sparse recorded first use | Draft a focused checklist for a synthetic use case | Setup/use is not completed value; no real integration or operational instructions |
| Value-evidence capture | Use recorded without verified completed value | Clarify completion and approved evidence categories | Do not turn hypothetical labels into measured customer outcomes |
| Acquisition alignment | Signup-time channel/segment mix differs descriptively | Construct a tagged synthetic landing-message test plan | No visitor/spend denominator, campaign launch or causal channel attribution |

The current implemented proposals are `qualification-pilot`, `setup-use`, `use-evidence` and `completeness-repair`. The acquisition-alignment row is context for a possible future hypothesis, **not an additional implemented card**. With D=0, `rankExperiments` returns only `define-evidence` (“Needs definition and mature evidence”).

## Explainable priority rubric

```text
score = impact × confidence / effort
```

Each input is an ordinal integer 1–3:

| Input | 1 | 2 | 3 |
|---|---|---|---|
| Impact | No accounts affected by the selected descriptive gap | Gap affects fewer than half of D | Gap affects at least half of D |
| Confidence | Assumption / synthetic-only hypothesis | Reserved for relevant directional product-use evidence | Reserved for repeated relevant evidence and credible measurement path |
| Effort | Small reversible change | Several steps/dependencies | Cross-system/rollout coordination |

This is an implementation clarification of the archived candidate rubric: “impact” is **proposed scope**, not demonstrated business impact. The four descriptive affected counts are D−observed setup, D−observed first use, D−N and U respectively; they are not measured person-to-person stage transitions. Effort is respectively 2, 1, 2 and 1. Confidence remains **1 for every current synthetic proposal**; synthetic patterns alone never justify the reserved higher levels. The D=0 definition proposal uses 1/1/1.

Do not interpret a higher number as probability, percentage uplift, expected revenue or statistical confidence. Display all three inputs, each rationale, supporting evidence, action, audience, guardrails and the actual calculation. Example 3×1/2=1.5 is arithmetic only.

Sort by descending score, then ascending effort, then stable experiment ID. The ID is a display tie-break; equal scores still require manual review, not a claim of scientific superiority. With D=0, only definition work is proposed, and export rejects any campaign URL.

Before exporting an actionable plan, require a named hypothesis, audience, generic role owner, milestone, window, reversible action, guardrails, and success/stop criteria. `Experiment` holds proposal fields; `PlanInput` supplies editable owner/hypothesis/criteria. No real execution follows from exporting.

## UTM contract

`UTMInput` has `destination`, `source`, `medium`, `campaign`, `content`, `term`; `UTMResult` has `ok`, `url`, `errors`.

- Accept only validated HTTP(S) destinations; no executable schemes, embedded credentials or secret/personal values.
- Source, medium and campaign are required; content and term are optional. Each label has a 100-character input bound, and destination has a 2,048-character bound. Encode parameters, not string-concatenated HTML.
- Preserve permitted existing unrelated query values and fragments. Matching existing UTM values may remain; conflicting values are errors, never silently overwritten. Duplicate query/fragment keys and sensitive/private-looking fields are rejected.
- Use synthetic destinations such as `https://example.org/learn?topic=sample#overview`. Do not visit the generated destination.
- Return visible errors for invalid inputs; do not call a network service, open an account or launch a campaign.

An encoded URL is still capable of carrying identifying information; syntactic validity alone is not a privacy guarantee.

## Export contract

`exportPlan(analysis, settings, experiment, input, identifiers)` returns `{ok, json, csv, errors}`. The `identifiers` argument supplies known identifiers for leakage prevention, not content to publish. Reject unsafe/incomplete drafts; do not offer a successful download when `ok=false`.

Both local formats must communicate:

- Synthetic-data and independent-concept notices; non-affiliation.
- An aggregate-derived dataset/settings identifier, metric/milestone definition version and qualifying-value rule.
- Cohort bounds, cutoff, window, active filters and completeness assumption.
- N/D/U/F, coverage, bounds, definitive-rate availability, population partitions and exclusions.
- Experiment identity, audience, action, hypothesis, score inputs/calculation and rationale/evidence.
- Generic proposed owner, guardrails, success/stop criteria and optional constructed campaign URL.
- A plain statement that this is a plan, not a launched campaign, measured result, integration or operational action.

### Implemented format and limitations

- Plan version `synthetic-activation-plan/1`; metric `synthetic-first-value-metric/1`; milestone `synthetic-first-value-verified/1`; status `proposed_not_executed`.
- JSON stores explicit contract, observations, selection, population, outcomes, stages, breakdowns, timing and experiment sections. CSV is a quoted **`field,value`** flattening of the same object using dot paths and CRLF records.
- `dataset.identifier` is `aggregate-v1-…`, derived from selected aggregates/settings. It is **not** the imported dataset ID, a cryptographic hash or a unique raw-source fingerprint. Two different sources may share those aggregates.
- `Analysis` carries copied whole-dataset signup/event row counts. Export marks `dataset.rowPartitions.status` as `reconciled` and includes received, accepted, duplicates and quarantined counts before cohort/attribute filters. Invalid arithmetic blocks export; diagnostics and identifiers are never copied.
- Owner is required and bounded to 80 characters; hypothesis/guardrails/stop/success criteria are each required and bounded to 600. URLs are allowed only through the validated optional `campaignUrl`, not embedded in planning text.
- Export rejects inconsistent analysis/settings and a proposal that no longer exactly matches the current ranked proposal. There is no clock-derived generated-at value; the same inputs produce deterministic content.

Deterministic serialization and guarded export behavior passed the tools suite. Both formats were downloaded and independently read back during real-browser review; see [actual results and limits](test-results.md).

## Safety and reproducibility

- Never export imported account IDs, event IDs, raw rows, private details, rejected cells or arbitrary dataset attributes. Check known identifiers and synthetic-ID patterns across free text and URL encodings.
- `safeCsvCell` must quote/escape CSV and neutralize spreadsheet formula-leading characters, including dangerous content hidden by leading whitespace. JSON must use proper serialization; UI previews must render plain text, not injected markup.
- Validate generic owner and hypothesis/criteria text, length and unsafe/private-looking content. Validation does not authorize entering real data.
- The same inputs must yield deterministic ranking and reproducible plan context. Any generated-at timestamp, if present, must be clearly metadata rather than an implicit observation cutoff.
- Read exported JSON and CSV independently before release. A download event alone does not prove content integrity.
