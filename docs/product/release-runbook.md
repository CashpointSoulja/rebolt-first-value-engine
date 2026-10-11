# Release and static deployment runbook

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

Status: automated checks and screenshot-only desktop/mobile review passed. **Cloudflare deployment is blocked:** no existing connector/credentials/login; the dashboard redirects to sign-in. No public deployment URL is claimed. The static build is prepared for owner-controlled upload; no video or outreach. See [actual evidence and limits](test-results.md). The following instructions do not authorize account, payment or permission changes.

## 1. Scope and source gate

- Confirm the current authorized implementation branch and scoped changes without replacing preserved research/guide/assets/fieldnotes.
- Confirm shared contracts, numeric input limits and metadata versions; resolve conflicts among concurrent changes.
- Review the [acceptance matrix](acceptance-criteria.md) and open [risks](risks-decisions.md). Keep application tests separate from historical research validation.
- Require synthetic-only data, independent/non-affiliation notices and local Arial adaptation. Do not publish contacts, auth material, raw responses, browser profiles, machine-specific paths or rejected input.
- Review tracked files, generated documents, exports, media metadata, proposed commit identity/messages and the final bundle for secrets and unwanted attribution. Preserve accurate third-party ownership.

## 2. Automated verification

Use the existing dependency lockfile and the authorized prepared environment; do not add dependencies just for this checklist. From the repository root, the current package scripts are:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Record each actual command, exit code, summary/counts and any failure in [test results](test-results.md). These commands are listed, **not reported as executed by this document**. If running focused tests, record their actual file/filter arguments and retain the full-suite obligation. `npm run test:coverage` is optional extra evidence when available; coverage percentage is not proof of correctness.

Inspect the generated static `dist` bundle for unsafe assets, secret/private content, accidental source data, remote font loads, analytics and operational integrations. Resolve failures rather than marking them passed.

## 3. Real application review

The release owner starts the actual built application in the authorized local environment; do not substitute the static research guide.

1. Review at 1366×900 and 390×844, then keyboard-only and reduced-motion conditions.
2. Verify sample/default context, N/D/U/F, bounds, partitions, segments and stage labels.
3. Commit a valid import; reject the invalid example; verify active identity/settings/results remain unchanged.
4. Submit invalid settings, then correct them. Demonstrate D=0 honestly.
5. Construct an example URL without visiting it. Export JSON/CSV and independently inspect their content.
6. Inspect network and browser storage during import/settings/URL/export and after refresh. No user input may be sent to the static host or third parties; no default restoration from storage.
7. Record measured contrast, focus behavior, viewport evidence and limitations. Screenshots must contain synthetic data only.

Follow the [script](walkthrough-script.md) as a review aid. No recording/video is authorized.

## 4. Cloudflare authorization and free-tier gate

Deployment may be attempted only by the release owner using **existing authenticated, explicitly authorized, free Cloudflare access**. Confirm the intended existing static project and cost limits before taking action. Do not register an account, change permissions, request credentials/API keys, add billing, purchase a plan, create paid resources or introduce backend/serverless bindings.

If access, project ownership or free status is uncertain, stop and report a deployment blocker. A successful local build does not establish deployment authorization.

## 5. Static deployment configuration

Deploy only the built static browser assets:

| Setting | Required boundary |
|---|---|
| Build command | `npm run build` using the existing approved repository/lockfile |
| Output directory | `dist` |
| Runtime | Static assets in the browser; no backend or real integration |
| Secrets/environment | None needed for application behavior; do not add private environment values |
| Storage/analytics | No imported-data persistence, analytics or remote validation |
| Fonts/assets | Local disclosed Arial fallback; no commercial font binaries or unauthorized asset changes |
| URL routing | Verify actual entry/refresh behavior; do not invent an API or add unneeded route infrastructure |

Use only the owner's available approved deployment route. No deployment CLI installation, account setup or API-token workaround is authorized by this document.

## 6. Post-deployment verification and release note

Only after an actual authorized deployment, record the verified URL, deployed revision, date, build result and observed limitations. Check HTTPS entry, static asset loads, refresh behavior, mobile/keyboard core flow and local-processing boundaries on that real deployment.

Recheck that no export, sample or notice implies real Rebolt affiliation, measured performance, operational action or launched campaigns. Do not publish an unverified URL, speculative uptime, fictional result or fabricated browser pass.

## 7. Rollback and handoff

If privacy/state/metric honesty or critical accessibility fails, stop publication and restore the prior verified static deployment **only with owner authorization**; otherwise disable the release through the owner's approved route. Do not modify unrelated projects or rewrite source history. Record the actual incident, affected acceptance IDs and retest needs.

Handoff includes the accepted dataset/schema versions, default contract, actual automated/browser evidence, deployment status, known limitations and local export readback. Outreach, registrations and video remain out of scope.
