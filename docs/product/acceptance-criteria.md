# Acceptance matrix

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Every row below is a **test obligation**, not a passed result. The release owner must attach actual command/browser evidence in [test results](test-results.md). “Unit” means deterministic domain tests; “UI” means the real rendered workbench, not the archived research guide. No automated result substitutes for manual desktop/mobile, focus and download review.

## Data and atomic state

| ID | Requirement / expected result | Test obligation |
|---|---|---|
| D01 | Exact signup/event header sets; unexpected, duplicate or missing columns rejected | Unit: each schema mutation; UI: useful table/row diagnostic without raw unsafe value |
| D02 | BOM, quoted commas, escaped quotes and valid multiline CSV parsed correctly; broken quoting/width rejected | Unit: parser fixtures and malformed records; confirm no hidden column |
| D03 | Account/event IDs use `syn_`/`evt_` prefixes and allowed suffixes | Unit: blank, malformed, wrong-prefix and valid IDs; privacy-like free text rejected |
| D04 | Only shared enums accepted; blank segment/channel/coverage/eligibility → unknown | Unit: every enum, unsupported value, empty field; unknown is not organic/eligible/complete |
| D05 | `result_complete` accepts true/false/blank false; evidence is enum-only | Unit: invalid tokens, blank completion and invalid evidence |
| D06 | Timestamps are valid RFC3339 instants with offsets | Unit: equivalent offsets, missing zone, impossible date, invalid time, leap-date and boundary cases |
| D07 | Exported byte/row limits enforced consistently | Unit: at-limit and one-over for each table, UTF-8 multibyte sizing, header not counted as data; UI matches constants |
| D08 | Exact duplicates may dedupe with warnings; conflicting IDs cannot be latest-wins | Unit: identical and conflicting signup/event records, conflict affecting multiple accounts; deterministic report |
| D09 | Orphan, pre-signup and invalid events stay accounted; affected valid account becomes uncertain in candidate | Unit: each defect and combination; orphan never invents a signup |
| D10 | Received=accepted+duplicates+quarantined for each table | Unit: valid, invalid, duplicate/conflict mixtures, header-only and fatal parsing cases; explain unavailable candidates |
| D11 | Any row/fatal error means `ok=false`; warnings alone may permit valid commit | Unit: candidate-with-errors, fatal-without-candidate, warnings-only; no loss of issue severity |
| D12 | Invalid import/cancel/read failure keeps the previous active data/settings | UI: load sample, record identity/results, reject invalid example, compare unchanged active identity/results |
| D13 | Both tables commit as a single dataset; no partial replacement | UI: one valid/one invalid file and corrected retry; prior pair stays active until complete success |
| D14 | Invalid settings retain active settings/results | Unit: `validateSettings` invalid cases; UI: end-before-start, bad cutoff/window, visible error and corrected retry |
| D15 | Missing outcome coverage is accepted and exposed as unknown | Unit/UI: unknown coverage with/without trusted qualifying success; never drop time-mature denominator |

## Measurement

| ID | Requirement / expected result | Test obligation |
|---|---|---|
| M01 | Fixed defaults match shared types, not wall clock/newest event | Unit: exact default values; UI: visible cutoff 2026-10-11, seven-day window and cohort |
| M02 | Cohort and milestone windows are half-open | Unit: signup at cohort start/end; events at signup/window end; maturity exactly at cutoff |
| M03 | Time maturity is separate from completeness | Unit: mature unknown coverage, pending with early value, disabled completeness assumption |
| M04 | Population total reconciles all six buckets | Unit: outside cohort, excluded, eligibility unknown, mature, pending, maturity unknown; filter convention explicit |
| M05 | D=mature and F=D−N−U; no negative/impossible counts | Unit: hand-calculated mixed fixture, all eligible/unknown/excluded/empty conditions |
| M06 | Verified value requires correct event, completion and approved evidence | Unit: all evidence enums, blank/false completion, blank evidence, setup/use-only, out-of-window/post-cutoff records |
| M07 | Earliest qualifying event per account counts once | Unit: repeat and unordered events, earlier nonqualifying event, offset-equivalent times |
| M08 | D>0 and U>0 show bounds/coverage, no definitive rate | Unit: D=10,N=4,U=2 → F=4, coverage=.8, bounds=.4–.6, rate=null; UI labels/counts |
| M09 | D=0 means not estimable, never 0% | Unit: empty/all excluded/all pending; UI: narrow immature cohort, no NaN/Infinity |
| M10 | All unknown is not all failed | Unit: D>0,U=D → F=0, coverage=0, bounds=0–1, rate=null |
| M11 | Median is confirmed mature converters only | Unit: odd/even converter counts, no converter null, pending/unknown/non-converters excluded; UI label |
| M12 | Stages are observed distinct reached-counts against D | Unit: nonmonotonic events and missing predecessors; UI no guaranteed funnel/adjacent conversion language |
| M13 | Segment/channel attributes are frozen at signup and retain unknowns | Unit: all category buckets and filters; no mutation by later event |
| M14 | Segment and channel partitions each reconcile overall D/N/U/F/pending | Unit: mixed/unknown/filtered fixtures, sparse/zero groups; null rules hold independently |
| M15 | Every cohort rate presents counts and exclusions/context | UI: headline, stages, segment/channel rows and exported context; unknowns cannot hide behind a tooltip |
| M16 | Acquisition/billing claims stay within available data | Copy/export review: no visitor conversion, CAC/ROAS, payment/revenue, causal or significance claims |
| M17 | Diagnostic uncertainty from quarantined/conflicting evidence cannot silently become a confirmed outcome | Unit: valid value event plus independently invalid/conflicting evidence stays U; actual execution is recorded in test results |

## Experiments, URLs and exports

| ID | Requirement / expected result | Test obligation |
|---|---|---|
| E01 | Score is impact×confidence/effort with 1–3 inputs and individual rationales | Unit: score calculation/range; UI: inputs, evidence, action, guardrails and criteria visible |
| E02 | Ranking/ties are deterministic and scores are heuristic | Unit: repeat calls/tie fixtures; UI no expected-uplift/ROI/confidence-probability claim |
| E03 | Zero/unknown evidence does not invent a bottleneck | Unit/UI: D=0 and U=D explanations; missing measurement definitions are explicit |
| U01 | UTM destination is validated HTTP(S), with required labels encoded | Unit: allowed schemes, invalid/credentialed URL, reserved characters and optional values |
| U02 | Existing query/hash preserved; conflicting UTMs reported | Unit: unrelated query + fragment, each existing/conflicting UTM, repeated parameters |
| U03 | URL privacy and no-navigation boundary | Unit: identifying/secret-like content and encoded ID cases; UI/network: construct without requesting destination |
| X01 | Export requires complete safe plan inputs | Unit/UI: missing owner/hypothesis/criteria, unsafe text, invalid campaign URL; no successful output on errors |
| X02 | JSON/CSV include aggregate-derived context ID, metric versions, N/D/U/F, completeness/exclusions and rationale | Unit/readback: no raw-dataset-fingerprint claim; reconciled whole-dataset row counts exported without diagnostics or raw IDs; UI: inspect both downloads independently |
| X03 | Exports contain no imported IDs, raw rows or private content | Unit: known-ID and prefix-pattern leakage through text/URL encoding; readback of every output field |
| X04 | CSV formula injection and HTML injection are neutralized | Unit: `=`, `+`, `-`, `@`, leading whitespace/control cases, quotes/newlines; UI previews are text |
| X05 | Outputs are reproducible plans, not completed actions | Unit: same inputs stable where promised; UI/export wording makes synthetic/proposed status explicit |

## Accessibility, data boundaries and delivery

| ID | Requirement / expected result | Test obligation |
|---|---|---|
| A01 | Complete core path works with keyboard only and visible focus | UI: sample/import/settings/ranking/UTM/export; no traps or obscured focus |
| A02 | Labeled inputs, semantic headings/tables and associated errors | DOM/accessibility review: labels, names, table headers, status regions, error summary/control association |
| A03 | Updates announced appropriately without excessive focus changes | UI + assistive-technology review: invalid submit, successful apply/import/export and retained-state messages |
| A04 | Readable contrast; no color-only status | Measured contrast: text 4.5:1 (large text 3:1), required UI/focus graphics 3:1; amber context labels |
| A05 | Responsive desktop/mobile and zoom behavior | Actual 1366×900 and 390×844 review; 200% zoom, 320 CSS px reflow, table scrolling without whole-page clipping |
| A06 | Reduced motion and target size | Emulated reduced motion + keyboard review; interactive targets at least 24×24 CSS px or valid spacing exception |
| P01 | No uploads, analytics, third-party validation or default persistence | Browser network/storage review during import/settings/UTM/export and refresh; distinguish asset requests from user-data transmission |
| P02 | Synthetic-only and independent/non-affiliation notices visible | UI/export/docs review; no real details or misleading customer evidence |
| B01 | Brand adaptation disclosed; no commercial font redistribution | Bundle/file review + rendered-font check for local Arial fallback; literal permitted assets and third-party notice |
| R01 | Research originals/assets/fieldnotes unchanged | Version-control diff of preserved paths; no generated replacements |
| R02 | Available lint, typecheck, focused/full tests and build run | Record exact commands, exit codes, totals and failures; never infer a pass from documentation |
| R03 | Static deployment only through authorized existing free context | Owner confirms host/account scope and free limits; no backend, secrets, new account, payment or permission change |
| R04 | Publication review and rollback documented | Inspect tracked content, metadata, authorship/messages and bundle; record approved URL only after actual verification |
| R05 | Walkthrough grounded in actual running UI | Complete the script's preflight and evidence checklist; no video or outreach is authorized |

## Release decision

All P0 obligations must have explicit pass evidence or an approved, documented limitation that does not violate privacy, measurement honesty, import atomicity or product boundaries. Those four categories are hard blockers. Pending tests remain pending; an owner report and a direct executed check must never share an unlabeled result.
