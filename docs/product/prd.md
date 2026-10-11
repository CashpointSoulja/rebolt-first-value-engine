# PRD — synthetic first-value experiment workbench

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Status: scoped implementation specification, 11 October 2026. Acceptance and actual execution evidence are recorded separately. This document clarifies rather than edits the archived [research-stage brief](../product-brief.md).

## Problem, ICP and JTBD

**Problem hypothesis:** a growth/product operator examining signup-to-value journeys can mistake setup for value, incomplete evidence for failure, or immature cohorts for mature ones. A local synthetic workbench should expose those distinctions before proposing an experiment.

**Primary ICP:** a hands-on B2B growth engineer or product/growth operator responsible for acquisition-to-activation experiments and cross-product onboarding measurement. **Secondary reviewer:** a product or engineering partner checking the metric definition and experiment handoff. These are intended users, not observed Rebolt customers.

**JTBD:** “When a synthetic cohort's route to value is unclear, help me fix the measurement contract, see what is known and unknown, and export a reviewable next experiment without overstating the evidence.”

The exact public growth role supports this problem area; deidentified owner reports motivate journey uncertainty, not a missing-feature claim. See [evidence and journey](research-journey.md).

## Product outcome and success criteria

Deliver a reproducible **planning** workflow, not a growth outcome:

- A reviewer can identify the unit, cohort boundaries, cutoff, window, eligibility, maturity and evidence coverage without reverse-engineering a percentage.
- Every displayed cohort rate includes N, D, U and relevant exclusions; zero denominator is not shown as zero conversion.
- Invalid CSV/settings drafts cannot replace the last valid analysis.
- The same accepted data/settings produce reproducible analysis and explainable heuristic ranking.
- A local export records the metric context, proposed owner, hypothesis, guardrails and reconciled whole-dataset row partitions without account/event identifiers. Its aggregate-derived identifier is not a raw-dataset fingerprint.

These are acceptance objectives. No baseline, uplift target, significance result, ROI or actual commercial performance is claimed.

## Scope and priority

| Priority | Requirement | Why |
|---|---|---|
| P0 | Built-in labeled synthetic sample and valid/invalid CSV examples | Demonstrate the workflow without real data |
| P0 | Strict two-table local import, row diagnostics and reconciled accounting | Prevent silent data loss or invalid active state |
| P0 | Draft settings with explicit valid commit and frozen default cutoff | Reproducible analysis rather than moving “today” |
| P0 | Mature/pending/unknown partitions, N/D/U/F, bounds, coverage and converter-only median | Distinguish time, evidence and outcome |
| P0 | Observed stages and frozen signup-time segment/channel breakdowns including unknowns | Honest descriptive analysis, not a causal funnel |
| P0 | Explainable experiment ranking, UTM construction and safe local JSON/CSV plan exports | Turn diagnosis into a reviewable proposed action |
| P0 | Keyboard operability, visible focus, readable contrast, mobile review and error recovery | Make the core workflow usable without a pointer |
| P0 | Local-only, no-default-persistence boundary and synthetic-only notices | Limit data exposure |
| Deferred | Visitor conversion, CAC, ROAS, revenue, signup-to-paid, A/B assignment and statistical inference | Required populations, spend, payment and experimental evidence are absent |

## Non-goals

No authenticated Rebolt recreation, missing-feature claim, live campaigns, real billing, API integration, backend, secrets, personal or business datasets, aircraft maintenance decisions, repair advice, airworthiness advice, work orders, inventory reservations or operational write-backs. No outreach, registration, application submission or video.

This workbench does not implement Rebolt's advertised maintenance commercial/billing preparation. A checkout click would not prove paid conversion; the current event schema has no payment event.

## UX and design constraints

- Clearly distinguish active data/settings from a draft import or form. Preserve prior valid state on every rejected update.
- Prioritize contract context and uncertainty beside metrics, not solely in tooltips or footnotes.
- Show bounded lists of diagnostics accessibly without exposing rejected raw content.
- Label stage counts as observed reached-counts against the same mature D; stages need not be monotonic.
- Use aviation-inspired charcoal/amber presentation as an independent adaptation, not a native product screen. Amber is emphasis, never a maintenance safety state.
- Use literal official assets only where permitted and clearly identify third-party ownership. Use local Arial; disclose the typography adaptation. Do not redistribute commercial fonts.

## Constraints, dependencies and release gate

The shared [types](../../src/domain/types.ts) and [contracts](data-contract.md) fix module interfaces and enums. This is a static browser bundle with no default persistence or dataset network transmission. Release is limited to an existing authorized free Cloudflare context; lack of such access blocks deployment rather than authorizing a new account, payment or key.

The [acceptance matrix](acceptance-criteria.md) is the definition of done. The release owner must record actual automated and browser results, inspect exported files, verify data boundaries and review the independent-concept notice. Open failures block release; documentation alone does not satisfy them.
