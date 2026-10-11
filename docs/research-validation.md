# Research-stage validation

Checked 11 October 2026. **Independent concept by Ayo Ahmed; no Rebolt affiliation.** These are research-document and evidence-integrity checks, not application, product, conversion or operational tests.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| Official routes | PASS | www root 307 → aviation; aviation/brand/introduction/pitch/pilot/sitemap 200; CompanyOS probe redirects to authentication, not opened |
| Official literal assets | PASS | Downloaded CSS/SVG sources, hashes and byte counts; SVG XML root validation |
| Real desktop/mobile evidence | PASS | Three official pages at 1366×900 and 390×844; seven PNGs including a lower aviation section |
| Rendered font | PASS | H1 reports custom Helvetica Now Display Medium; declarations/license metadata retained without binaries |
| Reduced motion | PASS | Aviation Explore animation resolves to none under reduced-motion emulation |
| Visual guide | PASS | Four static documentation sheets, embedded evidence, printable four-page PDF; no product form or application code |
| Integrity helpers | PASS | 10 unit tests, including tampered hashes, path escape, missing evidence and non-self-contained guide rejection |
| Python lint | PASS | Flake8 on the three documentation scripts, 120-character line limit |
| Python syntax | PASS | All documentation scripts compile |
| Bundle validator | PASS | Required documents, asset/screenshot integrity, JSON, local links, embedded image labels, PDF signature, no bundled fonts and publication hygiene |

Command output is retained in [research-checks.txt](research-checks.txt). The bundle can be checked without network access using Python's standard library. Regenerating HTML uses `python3 scripts/build_visual_guide.py`; the PDF is a dated browser print export with no headers/footers or machine-path text. After printing, `python3 scripts/build_visual_guide.py --clean-pdf-metadata` normalizes author/creator metadata without changing PDF cross-reference offsets. PDF metadata and decompressed streams were audited before the final commit.

## Commands actually run

```sh
python3 scripts/build_visual_guide.py
python3 -m unittest discover -s scripts -p 'test_*.py' -v
flake8 scripts --max-line-length=120
python3 -m compileall -q scripts
python3 scripts/validate_research.py
git diff --check --cached
```

Real screenshots were visually inspected, not merely inferred from markup. The reference document was rendered at desktop and mobile widths and checked for horizontal overflow; print content was checked against footer bounds. Official captures are unaltered. Source fonts were inspected in memory and not vendored.

## Limits and deferred checks

No production UI, CSV parser, analytics engine, UTM builder, export implementation, billing flow, deployment, application tests or voiced demo exists yet. There is no application type-check configuration; Python syntax and lint checks cover only the documentation scripts. Future test obligations in the measurement contract are **planned**, not passed.

No Rebolt form was submitted. Public capability/outcome claims were not independently validated. Font license scope and production asset reuse rights remain unresolved. Repository publication is reported separately from local checks; no unverified remote or deployment URL is presented as live.
