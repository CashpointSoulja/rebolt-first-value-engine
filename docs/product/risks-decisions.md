# Risks and decision log

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.** All entries dated 11 October 2026 unless superseded. Decisions below define scope; they are not execution evidence.

## Decisions

| ID | Decision | Rationale / consequence |
|---|---|---|
| DEC01 | Preserve the original research bundle exactly; add implementation clarifications here | Historical provisional assumptions must not be retroactively rewritten as validated implementation |
| DEC02 | Treat exact official role research, public pilot guidance and owner reports as separate evidence classes | Avoid implying authenticated inspection or platform-wide signup behavior |
| DEC03 | Synthetic account unit; fixed cutoff/cohort and seven elapsed-day milestone window | Reproducible demonstration; not Rebolt's internal model or four-to-six-week pilot duration |
| DEC04 | `first_value_verified` needs completed result plus approved evidence | Setup/use alone is not value; evidence categories carry no measured amounts |
| DEC05 | Time maturity defines D; completeness defines outcome certainty | Prevent missing coverage from shrinking the denominator |
| DEC06 | Import/settings drafts are separate from active state; errors block atomic commit | Diagnostic candidates must never replace a last valid analysis |
| DEC07 | Browser-only computation, no default persistence or dataset upload | No backend, analytics, real integration or real customer CSVs |
| DEC08 | Frozen signup-time categories, explicit unknowns and observed stage counts | Avoid retroactive segmentation, monotonic funnel assumptions and causal attribution |
| DEC09 | Ordinal explainable ranking and local exported plans only | Score is not uplift/ROI; export is not experiment execution |
| DEC10 | Local Arial adaptation; preserve third-party ownership notices | Commercial font redistribution rights are unestablished |
| DEC11 | Existing authorized free Cloudflare context only, controlled by release owner | No new account, payment, permission change or key; unavailable access blocks deployment |
| DEC12 | Script only, with browser-verification gate | No video, outreach or fabricated running-application evidence |
| DEC13 | Export aggregate/settings-derived identity and reconciled row partitions | Whole-dataset report counts are copied into `Analysis`; export only explicitly selected numeric fields, never diagnostics or identifiers; identity is not a unique source fingerprint |

## Risks and controls

| ID | Risk | Control / acceptance IDs | Owner / status |
|---|---|---|---|
| RISK01 | Invalid rows disappear or replace valid state | Reconciled row partitions, quarantine diagnostics, explicit `ok` gate and atomic update; D08–D14 | Implementation/release owner; ingestion and browser rollback checks passed |
| RISK02 | Incomplete evidence is reported as failure | Separate time maturity, row coverage and completeness assumption; show U, bounds and coverage; M03–M10 | Measurement reviewer; metric suite and browser sample review passed |
| RISK03 | Pending converters inflate mature conversion | Keep early conversions pending until full window elapsed; M03 | Measurement reviewer; metric suite and browser sample review passed |
| RISK04 | A reported lead thank-you becomes fictional account activation | Preserve O01–O03 labels, unknown workspace journey and hypothetical taxonomy; M16/P02 | Product reviewer; documented boundary |
| RISK05 | Synthetic data is mistaken for real commercial performance | Visible notices, no uplift/causality/significance/ROI claim; M16/E02/P02 | Product reviewer; rendered notices reviewed |
| RISK06 | IDs, private text or unsafe payloads leak through URL/export | Restrictive schemas, safe text rendering, identifier rejection, formula-safe CSV and independent readback; U03/X01–X04 | Security/data reviewer; tools suite and browser download readback passed |
| RISK07 | Static app quietly persists or transmits input | No storage/analytics/upload; inspect runtime network/storage and bundle; P01 | Release owner; local-only traffic/storage review passed |
| RISK08 | Rebolt ownership or endorsement is misrepresented | Independent-concept/non-affiliation notices; literal permitted assets; no commercial fonts; B01/P02 | Release owner; original assets preserved and rendered adaptation reviewed |
| RISK09 | Appearance passes while keyboard/mobile workflow fails | Real desktop/390px, zoom, focus, reduced-motion and contrast checks; A01–A06 | Accessibility reviewer; scoped Chrome checks passed; screen readers and physical devices untested |
| RISK10 | CSV limits cause freeze or misleading partial accounting | 1 MiB byte cap and 10,000 records per table; fatal diagnostics and unavailable counters for unread input; D07/D10 | Implementation owner; ingestion boundaries tested |
| RISK11 | A broad domain test pass is mistaken for verified UI/export behavior | Separate automated, browser, export and deployment result sections; R02/R05 | Release owner; automated and browser evidence kept separate |
| RISK12 | Deployment requires paid/new/private infrastructure | Only existing authorized free static hosting; stop otherwise; R03/R04 | Release owner; blocked: no existing Cloudflare authorization |
| RISK13 | Concurrent code changes diverge from shared docs/types | Cross-check numeric limits, versions, ranking ties and setting validation before release | Implementation owners; integration and documentation contracts reconciled |
| RISK14 | Valid evidence could override diagnostic uncertainty | Invalid/quarantined evidence takes precedence and preserves affected units as U even with another valid value observation; M17 | Resolved and exercised in passing metric tests; missing coverage alone does not invalidate independently confirmed value |

## Unresolved product questions

Actual Rebolt entity model, value event, instrumentation coverage, authenticated onboarding, eligibility generality, billing policy and verified payment evidence remain unknown. No feature-absence conclusion follows. Resolving them requires separately authorized evidence, not speculative implementation or contact.

## Change discipline

Record date, decision, reason, impacted acceptance IDs and actual verification when changing scope. Milestone/denominator changes require an explicit version and reviewer sign-off. Preserve earlier evidence labels. Blocking failures in privacy, metric honesty, state atomicity or operational boundaries cannot be waived by rewording a test result.
