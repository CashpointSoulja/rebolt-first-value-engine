# Proposed measurement contract

**All definitions here are provisional. None is an observed Rebolt event schema or benchmark.** Independent concept by Ayo Ahmed. Scope awaits product-use notes; no analysis engine or synthetic CSV fixtures have been implemented.

## Population, time and data-quality accounting

- Choose one unit explicitly: synthetic account/workspace proposed; confirm rather than mix people with workspaces. One cohort entry per unit, earliest non-conflicting valid signup.
- Require stable synthetic signup/entity and event IDs. Collapse exact duplicates; quarantine conflicting IDs. Do not silently keep the latest row.
- Require RFC3339 timestamps with offsets; normalize instants to UTC. A missing timezone is invalid, not guessed. Record a cohort timezone separately.
- Use half-open cohort boundaries and milestone window `[signup, signup + W)`. A **7-day** W is only a candidate demonstration parameter, not a Rebolt standard. Actual pilot timelines must not be conflated with it.
- Use a declared observation cutoff and completeness watermark, not the timestamp of the newest event. Mature means `signup + W <= cutoff` with adequate coverage. Without a trusted cutoff/completeness statement, maturity/outcome is unknown.
- Define exclusions before analysis. Exclude only positively identified internal/test/duplicate entities under that policy. An unknown eligibility status remains a separate population.
- Report received/accepted/exact-duplicate/quarantined row counts and eligible/excluded/eligibility-unknown unit counts separately. Row partitions must reconcile; invalid events can leave an otherwise valid unit outcome-unknown rather than erase it.
- Reject malformed schemas, IDs, timestamps and unsupported events with row-level reasons. Quarantine orphan or pre-signup events. Missing channel/segment remains **unknown**, not organic.
- Freeze segment attributes at signup. Do not retrospectively move units into a successful segment or compare unlike denominators.

## First-value milestone and denominator contract

`first_value_verified` is a **placeholder proposed event**, not an actual Rebolt event. Product-use notes must define the action, required evidence and prerequisite journey. Keep setup, onboarding completion, first use and successful value realization distinct; never equate app creation with value automatically.

For eligible mature units:

- `D`: all units meeting the declared eligible/mature population rules.
- `N`: confirmed first-value outcomes inside W.
- `U`: units whose outcomes remain unknown because evidence/coverage is insufficient.
- `F = D - N - U`: confirmed non-converters under the same window and coverage contract.

Only when `U = 0` is `N / D` a definitive overall rate. When `U > 0`, show `N`, `D`, `U`, coverage `(D-U)/D` and bounds `N/D` to `(N+U)/D`. A known-outcome-only rate `N/(D-U)` must be explicitly labeled and must not replace the overall denominator. If D is zero, show **not estimable**, not 0%.

Example **synthetic arithmetic only**: D=10, N=4, U=2 → coverage 80%, overall activation bounds 40–60%, known-outcome-only conversion 4/8=50%. This is not Rebolt performance or a dataset test result.

Immature units belong in a pending population, even if an early success is visible; show those counts without comparing their rate to a mature cohort. Time-to-first-value medians are **among confirmed converters only**, with pending/non-converter/unknown counts alongside them. Do not treat a converter median as a population median.

## Acquisition, onboarding and billing

Signup/event CSVs permit attributed-signup counts, not visitor conversion, CAC or ROAS without visitors, spend and verified revenue evidence. Stored signup-touch UTMs are a proposed attribution rule, not causal credit.

Onboarding uses its own entry/eligibility/window. Checkout starts, payment confirmations and subscription state are different milestones. A billing click is not revenue. Signup-to-paid and checkout-start-to-paid each need their own explicit denominator and observation horizon. No real payments or payment-provider connections are in scope.

## Explainable experiment priority — proposed rubric

First gate on a named hypothesis, audience, measurable milestone, owner, fixed window, data/behavior guardrails and reversible action. Missing definitions produce **needs definition**, not an automatic ranking.

Candidate score: `impact × evidence-confidence / effort`, each ordinal 1–3.

| Input | 1 | 2 | 3 |
|---|---|---|---|
| Impact | Convenience | Documented obstacle | Documented blocker to chosen value milestone |
| Confidence | Assumption | Relevant product-use notes/directional evidence | Repeated relevant evidence and credible measurement path |
| Effort | Small reversible change | Several steps/dependencies | Cross-system/rollout coordination |

Display inputs, rationale, source, dependencies and calculation. Example 3×1/2=1.5 is a **heuristic ranking**, not expected uplift. Ties: lower effort, then manual review. Scores are subjective; they do not imply causal effects, significance, power, monetary ROI or comparability across different objectives.

## UTM and export obligations — proposed

UTM builder: validate an http/https destination, preserve existing query/hash, encode values, flag conflicts and exclude secrets or personal identifiers. Produce a URL only; do not visit it or launch a campaign.

Activation-plan export: include hypothesis, audience/segment, metric version, milestone definition, dataset identifier, observation window/cutoff, N/D/U, completeness/exclusions, score inputs/rationale, proposed owner, action, guardrails, success/stop criteria and synthetic-data notice. Format awaits scope. CSV spreadsheet-formula injection must be handled; free text must not create executable HTML/links or leak imported identifiers.

## Future tests — planned, not run

- Wrong headers, blank IDs, quoted commas, multiline fields, BOMs, size/row limits and invalid timestamps.
- Equivalent offsets, timezone-naive rejection, exact boundary signup/event dates and cohort cutoff.
- Duplicate versus conflicting IDs, orphan/pre-signup events and unknown event names.
- Empty datasets, all excluded, all immature, zero denominator and unknown eligibility/completeness.
- Unknown outcomes, converter-only medians, segment reconciliation and no retroactive mutation.
- Known arithmetic fixtures; deterministic score ties/export output; UTM query/hash and conflict handling.
- Formula injection, malicious free text, identifier leakage and no-network CSV boundary.
- Keyboard use, focus/contrast, reduced motion, 1366px desktop/390px mobile and independent export readback.

These are acceptance obligations for later implementation. Research-bundle checks are documented separately and do not satisfy them.
