# Executed checks and release evidence

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Date: 11 October 2026. Scope: `implementation/first-value-workbench`, based on audited research commit `772e5b1a3d30658f3d304d82ca8bfbe151c7c688`. All fixtures and outputs are synthetic. Owner-reported research is not application-test evidence.

## Automated checks — executed

Environment: Linux, Node.js 22.23.3, npm 10.9.9, TypeScript 5.7, Vitest 4.1.11, Vite 6.4.4. Commands ran from the repository root.

| Command | Actual result |
|---|---|
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm test` | Exit 0; 3 files, 292 tests passed, no failures or skips |
| `npm run test:coverage` | Exit 0; the same 292 tests passed |
| `npm run build` | Exit 0; 1,585 modules transformed; static HTML/CSS/JS output produced |
| `npm audit` | Exit 0; zero reported vulnerabilities in the installed tree |
| `npm ci --legacy-peer-deps --no-fund` | Exit 0; clean lockfile installation, 216 packages added; subsequent checks passed |
| `python3 scripts/validate_research.py` | Exit 0; 9 evidence/link/publication checks passed |
| `python3 -m unittest discover -s scripts -p 'test_*.py'` | Exit 0; 10 research integrity helper tests passed |

Domain coverage from the executed V8 run: **97.74% statements, 95.33% branches, 100% functions, 99.01% lines**. This covers domain modules, not UI automation or complete accessibility conformance.

Test allocation: ingestion 104, metrics 56, tools/export 132. Covered cases include malformed/malicious CSV, quotes/BOM/headers/limits, strict timestamps and offsets, exact versus conflicting duplicates, orphan/pre-signup events, reconciliation, half-open boundaries, unknown/mature/pending populations, segmentation, safe UTM query/hash/conflicts, deterministic output and HTML/formula/identifier export rejection.

### Resolved failures and retest history

- Initial full-project typecheck failed because the React Vite plugin and Vitest configuration resolved incompatible Vite types. Separate build/test configurations resolved the integration error; typecheck, lint, tests and build subsequently passed.
- An npm optional-peer resolver crashed during the test-tool upgrade. `npm install --legacy-peer-deps` completed; the lockfile is preserved. Tests and the full security audit subsequently passed.
- Initial dependency audit reported seven advisories, including test-tool dependencies. Patched Vitest/coverage 4.1.11 replaced 2.1.9; the subsequent audit reported zero vulnerabilities.
- **M17 resolved:** quarantined or invalid evidence makes the affected diagnostic unit unknown even when another accepted event appears to confirm value. Independently confirmed conversion can remain confirmed when only observation coverage is missing. Both cases are tested; no invalid candidate becomes active.
- Export now receives explicit copied whole-dataset row partitions. Counts reconcile before filters, invalid arithmetic blocks export, and only the four numeric fields per table are serialized. No diagnostic text or raw identifiers are copied. Two additional regression tests raised the suite from 290 to 292.
- The research validator now excludes dependency/generated/private working folders. Original visual guides, literal assets, source evidence and fieldnotes are unchanged.

## Sample readback

At default fixed cutoff `2026-10-11T00:00:00Z`, seven-day window, documented completeness assumption and all signup-time categories:

- 17 unique signup units = 10 mature + 3 pending + 2 excluded + 1 eligibility unknown + 1 out of cohort.
- D=10, N=4, U=2, F=4; D=N+U+F.
- Coverage 80%; bounds 40–60%; definitive rate unavailable while U>0.
- Observed mature reached-counts: qualified lead 8, pilot setup 6, first use 5, verified first value 4. These are not a forced sequential funnel.
- Converter-only median: 60 hours.

These are fixture outputs, not Rebolt customer performance or a claim about the actual Rebolt pilot duration.

## Browser checks — executed

Real Chrome review at **1366×900 desktop and 390×844 mobile** used screenshots only. No application defect was observed in the exercised flows; no video was created.

Verified empty/sample states; metric/population/stage reconciliation; independent nonmonotonic stages; combined segment/channel filtering; CSV downloads, file/paste validation and explicit apply; invalid-import/settings rollback; cutoff/cohort/window/completeness; zero denominator; experiment selection and stale-selection clearing; required/bounded/unsafe plan input; inert UTM query/hash handling and clipboard readback; deterministic JSON/CSV aggregate-only downloads with whole-dataset row partitions; reset/reload; readable literal logo and responsive internal table scrolling.

Keyboard/focus, reduced motion, native 200% zoom and nine representative contrast combinations passed. Observed application requests remained local-only, storage was empty and no runtime page errors were captured. This is scoped runtime evidence, not a guarantee against all possible network activity or complete accessibility conformance.

Three harness issues (CSV quoting comparison, ambiguous locator and incorrect expected two-day-window result) were corrected and rerun. Native-zoom automated captures were blank; actual desktop capture supplied zoom evidence, and ordinary affected screenshots were recaptured. These were not application failures.

**Untested:** screen readers, physical mobile devices, other browser engines and the denied-clipboard-permission fallback. Sanitized browser report and selected screenshots are delivered separately from the repository; working browser artifacts are not published wholesale.

## Deployment and publication — separate gates

**Cloudflare deployment blocked.** No provisioned Cloudflare secrets, credential environment entries, saved Wrangler login or installed Cloudflare integration were found. Opening the existing browser at the dashboard redirected to the signed-out login page. No login attempt, account, token, paid action or permission change was requested. No verified public deployment URL exists.

Static output exists after the successful build and is delivered as an upload-ready archive. Publication audits cover generated metadata, text, preserved research and Ayo Ahmed commit identity. Only the implementation branch may be pushed; remote commit/readback evidence is reported at handoff after publication, rather than inferred from these local checks. A local preview is not a deployment.

## Limits

No authenticated Rebolt workspace, real account/event data, customer result, real experiment, real payment, external integration, outreach or video was used. Screen-reader assistive-technology conformance and live-host verification are not implied by automated checks. The deidentified owner-reported entry-path observations in [research and journey](research-journey.md) remain separately labeled.
