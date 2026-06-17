# P27 Blocked Launch Handoff

## Decision

P27 produces a blocked launch handoff package.

The product is preview-ready but not public-production-ready. P25 proved the preview / staging pair. P26 proved the production release gate and returned `blocked`. P27 packages the evidence, runbooks, blockers and commands so backend, ops and product owners can continue without ambiguity.

## Current Preview Pair

Frontend:

```text
https://app-638zzda7k-james-projects-97742675.vercel.app
deployment id: dpl_CnWCxRcF8ahqj3zkB3eXs23GfDLW
```

API:

```text
https://pun-api-p25.vercel.app
deployment id: dpl_4JgqtJT9TBmgmCAGp5tjcuvvdBTs
```

Preview evidence:

```text
artifacts/visual-qa/p25-remote-routes-mqda04cd/
artifacts/integration/p25-deployment-execution/
artifacts/integration/launch-readiness-20260614T043013Z.json
```

## Handoff Rule

The current product frontend remains:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/app
Vite + React + TypeScript
```

No external frontend should be merged into this line without subagent approval. The blocked launch package is not a UI redesign package and not a duplicate frontend package.

## Blocked Production Items

The package preserves these blockers:

1. Custom frontend and API domains are not present in the current Vercel scope.
2. `app` and `pun-api-p25` have no persistent Vercel env vars.
3. API preview uses sqlite under `/tmp`, not a persistent production database.
4. Production migration apply/stamp and restore drill require a real `DATABASE_URL`.
5. Payment provider remains `web_stub` until real provider credentials, webhook secret, price map and operational acceptance are supplied.
6. Privacy/legal and security approvals are missing.
7. Product-owner alias approval and rollback owner are missing.

## Included Artifacts

Core docs:

- `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md`
- `docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md`
- `docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md`
- `docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md`
- `docs/product/P27_OPERATOR_RUNBOOK_20260613.md`
- `docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md`
- `docs/design-system/DEVELOPMENT_NOTES.md`

Evidence:

- `artifacts/integration/p25-deployment-execution/`
- `artifacts/integration/p26-production-resource-audit.json`
- `artifacts/integration/launch-readiness-20260614T043013Z.json`
- `artifacts/visual-qa/p25-remote-routes-mqda04cd/`

Scripts and config:

- `scripts/check-production-release-gate.mjs`
- `scripts/check-blocked-launch-handoff.mjs`
- `scripts/check-launch-readiness.sh`
- `scripts/smoke-deployed-api.sh`
- `scripts/package-vercel-preview.sh`
- `scripts/package-vercel-backend-api.sh`
- `app/vercel.json`
- `app/package.json`

## Excluded Items

The package intentionally excludes:

- `node_modules`
- `dist`
- `.env` files
- Vercel local state
- backend virtualenvs
- source archives unrelated to P25-P27
- external frontend packages
- secrets or provider credentials

## Package Acceptance

The handoff package is acceptable only if:

1. `npm --prefix app run check:production-gate` passes.
2. `npm --prefix app run check:blocked-launch` passes.
3. `node scripts/check-design-system-boundary.mjs` passes.
4. `node scripts/check-backend-compatibility-bridge.mjs` passes.
5. Package file list contains no `node_modules`, `dist/`, `.env`, `.vercel`, virtualenv or external frontend source.
6. Secret scan on package contents finds no live API keys or webhook secrets.
7. Manifest says `public_paid_production_launch: blocked`.

## Next Step

P28 should be chosen by the product owner:

1. `Production Resource Provisioning`: if domains, database, provider credentials and approvals are supplied.
2. `Blocked Launch Review Meeting`: if the team needs to assign owners and dates for the blockers before more engineering work.
