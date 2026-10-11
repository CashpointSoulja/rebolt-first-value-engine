# Rebolt First Value Engine

**Independent concept by Ayo Ahmed. Not affiliated with, endorsed by or built for Rebolt.**

An independent, browser-only **GTM experiment workbench** for synthetic acquisition-to-first-value analysis, not an aircraft operational tool. No operational integration, billing integration, real customer data or campaign execution.

## Run the workbench

Use Node.js 22 LTS. Install and start from this branch:

```sh
npm install --legacy-peer-deps
npm run dev
```

The initial state is empty. Choose **Load synthetic sample**, or download the two CSV templates, use only synthetic IDs and explicitly validate then apply. Imported files remain in memory; reload clears them. Do not upload real business data.

```sh
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run preview
```

See [product documentation](docs/product/index.md), [actual test results](docs/product/test-results.md), [release runbook](docs/product/release-runbook.md) and [walkthrough script](docs/product/walkthrough-script.md). Deployment status is recorded separately; a local preview is not a public deployment. No video or outreach has been produced.

## Read first

- [Brand guide](docs/brand-guide.md): current aviation appearance, literal assets, typography, colors, layout and motion evidence.
- [Visual brand reference](docs/brand-visual-guide.html): self-contained documentation with real official-site captures; not a proposed product screen.
- [Visual reference PDF](docs/brand-visual-guide.pdf).
- [Product brief](docs/product-brief.md): intended job, boundaries and decisions pending product-use notes.
- [Evidence register](docs/evidence-register.md): official claims versus assumptions and unknowns.
- [Separate CompanyOS material](docs/companyos-variant.md): generic brand and platform material, not the current aviation homepage.
- [Proposed measurement contract](docs/measurement-contract.md): explicit populations, maturity, uncertainty and test obligations.
- [Research validation](docs/research-validation.md): actual checks, scope and limitations.
- [Contribution instructions](AGENTS.md) and [third-party notices](docs/third-party-notices.md).

## Implemented scope

Validated **synthetic** signup/event CSVs; transactional draft/apply; mature, pending, excluded and unknown populations; N/D/U/F, coverage and bounds; first-value milestones; signup-time segmentation; explainable experiment priority; guarded local UTM construction; deterministic JSON/CSV activation plans without raw identifiers. No claims about missing Rebolt features are made.

The default synthetic example uses a fixed UTC cutoff and seven-day observation window, not Rebolt's advertised four-to-six-week pilot timeline. Its 17 units reconcile to 10 mature, 3 pending, 2 excluded, 1 unknown eligibility and 1 out of cohort. Mature outcomes are N=4, U=2, F=4: coverage 80%, bounds 40–60%, with no definitive conversion rate. Converter-only median is 60 hours. None is measured customer performance.

The audited [research commit](https://github.com/CashpointSoulja/rebolt-first-value-engine/commit/772e5b1a3d30658f3d304d82ca8bfbe151c7c688) and `research/rebolt-foundation` remain preserved. Implementation is isolated on `implementation/first-value-workbench`; archived research-only wording describes that earlier stage. Literal official logo cues are used with non-affiliation notices; typography is a disclosed local Arial adaptation, with no commercial font binaries.

## Verify the research bundle

```sh
python3 scripts/validate_research.py
```

This checks evidence integrity, document links and publication hygiene. It does not test an application or validate Rebolt's marketing outcomes.
