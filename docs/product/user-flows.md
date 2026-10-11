# User flows and state transitions

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.** These are intended implementation flows, not verified browser observations. Exact labels must be confirmed in the [walkthrough review](walkthrough-script.md).

## 1. Open and understand the sample

1. Open the static workbench in its empty local-session state. Read the synthetic-only, independent-concept and local-processing notices.
2. Choose **Load synthetic sample**. This replaces the active dataset and restores the default settings together. The active dataset identity and fixed settings are visible.
3. Review total/population partitions, mature D, confirmed N, unknown U, non-converters F, bounds and coverage.
4. Review observed stage counts, signup-time segments and channels, including `unknown`.

Do not interpret a sample number as customer performance or a stage ratio as causal conversion.

## 2. Inspect and commit a two-table import

```text
last valid active dataset + active settings
                    |
       choose synthetic signup/event CSVs
                    v
            parse/validate draft
              /            \
   row/fatal errors       warnings only / valid
          |                        |
 show diagnostics;          explicit valid import
 preserve active state             |
          |                        v
    revise or cancel       replace dataset atomically;
                           recompute from active settings
```

- Import processing and diagnostics remain local. Never ask for real customer files. **Validate draft** does not apply it; only **Apply validated dataset** commits a successful candidate.
- Report received, accepted, exact duplicates and quarantined rows for **each** table.
- Exact duplicates may dedupe with warnings. Missing outcome coverage is allowed and becomes unknown.
- Row errors, conflicting IDs, schema errors, orphan/pre-signup/invalid events or fatal errors block commit. A diagnostic candidate can exist with `ok=false`; it is not active data.
- Keep the prior valid analysis visible with an explicit retained-state message. Do not render candidate metrics as committed results.
- A canceled or failed file read cannot clear active state. Re-importing corrected files may commit only after complete validation of both tables.

## 3. Edit cohort settings safely

1. Edit cohort start/end, observation cutoff, milestone window, completeness assumption and segment/channel filters in a draft.
2. Apply the draft only after `validateSettings` returns no errors.
3. On errors, associate messages with controls, announce the failure and retain the prior settings/results.
4. On success, commit the full settings object and recompute analysis atomically. Display updated contract context.

The default seven-day window is demonstrative, not Rebolt's pilot duration. Turning completeness off must not manufacture confirmed failures. Changing a segment filter changes the explicit population, not frozen signup attributes.

## 4. Investigate uncertainty before choosing a hypothesis

Review unknown coverage, eligibility and maturity separately. If data quality dominates, prioritize validating the measurement contract rather than labeling a stage drop as friction. A pending account remains outside mature D even if an early success is observed.

Inspect each proposed experiment's impact, confidence, effort, rationale, evidence, guardrails and stop/success criteria. The score orders hypotheses; it does not predict improvement.

## 5. Construct a URL and export a plan

1. Enter a synthetic `https://example.org/` destination and non-identifying UTM labels.
2. Validate and construct the URL locally. Preserve permitted existing query/hash values; report conflicts. Do not navigate or launch a campaign.
3. Select an experiment and supply a generic role owner (for example, `Growth owner`), hypothesis and review criteria. Do not enter contact details.
4. Validate the plan. Errors retain the draft and produce no valid export.
5. Use **Download JSON** or **Download CSV** locally. Read back both formats and check contract context, counts, definitions and identifier redaction. The export identifier describes aggregate/settings context, not raw dataset identity; row partitions are explicitly unavailable in `Analysis`.

An export is a proposed plan, not a completed experiment, integration or commercial action.

## 6. Empty, zero-denominator and reset paths

- With no eligible mature accounts, show D=0 and “not estimable”; no 0% conversion, infinite values or fabricated median.
- With immature-only data, show pending counts and no mature-cohort rate.
- With all outcomes unknown, show U=D, coverage 0 when D>0, bounds 0–100% and no definitive rate.
- Clearing the session restores an empty dataset and demonstration settings together. Loading the sample also restores demonstration settings. **Reset draft to active** only reverts draft settings. No imported data or settings are persisted by default; a refresh must not restore imported values from storage.

## Focus and announcements

Maintain logical focus after valid updates, announce validation and completion without stealing focus on every recomputation, and provide an accessible error summary or focused failing control on explicit invalid submission. Downloads and status messages must not trap focus. Verify the whole path using keyboard only and at 390px viewport width.
