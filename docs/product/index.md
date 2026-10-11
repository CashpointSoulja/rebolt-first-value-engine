# First Value Engine — implementation documentation

**Independent concept by Ayo Ahmed. Not affiliated with or endorsed by Rebolt.**

Status: scoped synthetic-data implementation; application checks and browser review are tracked separately from documentation. All dataset examples and computed outputs are synthetic, not customer results.

## Read in order

1. [Research and journey evidence](research-journey.md): official public sources, owner-reported observations and unknowns.
2. [PRD: problem, ICP and JTBD](prd.md): scope, priorities and non-goals.
3. [User flows](user-flows.md): draft, active and error states.
4. [Data contract](data-contract.md), [event dictionary](event-dictionary.md) and [metric contract](metric-contract.md): shared implementation interfaces and arithmetic.
5. [Experiment rationale](experiment-rationale.md): explainable prioritization, constructed links and exported plans.
6. [Acceptance matrix](acceptance-criteria.md), [accessibility](accessibility.md) and [risks and decisions](risks-decisions.md): release obligations.
7. [Actual check record](test-results.md), [release runbook](release-runbook.md) and [walkthrough script](walkthrough-script.md): evidence and release gates.
8. [Runtime dependencies and ownership](dependencies.md): shipped library licenses, dependency audit and verified setup.

## Which document governs what?

- The original [brand guide](../brand-guide.md), [evidence register](../evidence-register.md), [research-stage brief](../product-brief.md), [provisional measurement contract](../measurement-contract.md), research assets and fieldnotes remain preserved historical evidence. Their research-only status and unresolved assumptions describe that stage, not a completed implementation.
- These product documents clarify the authorized implementation, especially **time maturity versus outcome completeness**, strict import commit gating and the local-only data boundary.
- [Shared types](../../src/domain/types.ts) define field names, enums and default settings. Public module signatures are recorded in the data contract. Any implementation/documentation discrepancy is a release issue, not permission to alter the shared contract silently.
- Acceptance criteria are obligations, not passed tests. A screenshot of the research guide does not validate the running application.

## Boundaries

The browser processes synthetic CSV data locally, with no default persistence, analytics, uploads, backend, real integration or real payment. A static host necessarily serves application assets; this does not authorize sending dataset values to it. Exports are user-requested local files. UTM links are constructed strings, not launched campaigns.

The workbench is not an aircraft operational tool. It must not produce maintenance decisions, repair instructions, airworthiness advice, work orders, reservations or operational write-backs. Rebolt's advertised commercial/billing preparation is separate from this concept's GTM journey analysis.

Typography uses a local **Arial fallback as an adaptation**, not a claimed reproduction of commercial Helvetica Now Display. No commercial font binaries are redistributed. Preserve [third-party ownership notices](../third-party-notices.md).
