# Runtime dependencies and ownership

**Independent concept by Ayo Ahmed. Not affiliated with Rebolt.**

React and React DOM render the interface; Papa Parse parses CSV; Lucide supplies ordinary interface icons. Their bundled runtime license texts, including React's scheduler, are preserved in [third-party licenses](../../public/third-party-licenses.txt) and copied into the static build.

These software licenses do not apply to Rebolt's logos, captured CSS, screenshots, published material or commercial fonts. The archived [third-party research notices](../third-party-notices.md) remain intact. Application typography uses local Arial; no commercial font binaries are bundled.

The lockfile fixes the installed dependency tree. The initial test-tool dependency audit reported seven advisories; patched Vitest and coverage 4.1.11 replaced 2.1.9. The subsequent full audit reported zero vulnerabilities. This is a point-in-time registry audit, not a guarantee against future vulnerabilities. No test UI server is deployed; production is static Vite output.

Node.js 22 LTS is the verified runtime. An npm optional-peer resolver crash during the test-tool upgrade was worked around with `npm install --legacy-peer-deps`; this does not skip application tests or the dependency security audit. Actual checks are recorded in [test results](test-results.md).
