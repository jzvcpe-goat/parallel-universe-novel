# P25 Deployment Execution and Rollback Rehearsal

## Decision

P25 is complete as a preview / staging deployment rehearsal.

The current Vite + React + TypeScript frontend and FastAPI `/v1` backend were deployed to reachable Vercel preview / RC targets, smoked remotely, browser-tested remotely, CORS-checked, and rollback / restore dry-run evidence was captured.

This is not approval for public paid production launch. The API preview still uses a sqlite database under `/tmp`, and the schema lifecycle reports `pending_migrations`. Production launch remains blocked until a persistent database, migration apply plan, backup / restore rehearsal, custom domain CORS, real payment-provider operations, privacy/legal review and security audit are signed off.

## Deployed Targets

Frontend preview:

```text
https://app-638zzda7k-james-projects-97742675.vercel.app
deployment id: dpl_CnWCxRcF8ahqj3zkB3eXs23GfDLW
target: preview
status: Ready
```

Backend API preview / RC:

```text
https://pun-api-p25.vercel.app
deployment id: dpl_4JgqtJT9TBmgmCAGp5tjcuvvdBTs
status: Ready
```

Note: Vercel reports the `pun-api-p25` project target as `production` because it owns the project alias. Product status remains preview / RC only; it is not the public production API.

## Commands Run

Backend preview deploy:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
rm -rf /tmp/pun-api-p25
mkdir -p /tmp/pun-api-p25
cp -R artifacts/deploy/parallel-universe-vercel-backend-api-20260613T201820Z/. /tmp/pun-api-p25/
npx --yes vercel deploy /tmp/pun-api-p25 --yes --target preview --format json \
  -e DATABASE_URL=sqlite:////tmp/narrativeos_beta_p25.db \
  -e 'NARRATIVEOS_ALLOWED_ORIGIN_REGEX=https://(([a-z0-9-]+\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+|integration-harness-[a-z0-9-]+|pun-p25-[a-z0-9-]+)\.vercel\.app' \
  -e NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions \
  -e NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger
```

Frontend preview deploy:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN=https://pun-api-p25.vercel.app \
VITE_API_BASE_URL=https://pun-api-p25.vercel.app/v1 \
./scripts/deploy-vercel-preview.sh
```

Remote API smoke:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://pun-api-p25.vercel.app
```

## Remote Smoke Evidence

Remote API smoke passed against `https://pun-api-p25.vercel.app`.

Full launch-readiness gate also passed after P25 documentation updates:

```text
artifacts/integration/launch-readiness-20260614T043013Z.json
```

Gate coverage:

- frontend alignment / backend bridge / copy boundary / design-system checks
- frontend lint, build and moderate audit
- backend targeted tests: `37 passed, 2 warnings`
- OpenAPI contract
- remote API smoke against `https://pun-api-p25.vercel.app`

Key smoke signals:

- `world_count: 12`
- `trend_count: 6`
- `weekly_scan_trends: 6`
- `monthly_scan_trends: 6`
- `subscription_tiers: 3`
- `checkout_status: completed`
- `account_snapshot_resume: continue_reading`
- `merge_public_state: merged`
- `data_export_state: ready`
- `delete_preview_state: requires_confirmation`
- `delete_confirm_state: deleted`
- `delete_sessions_revoked: 1`
- `creator_turn_count: 4`

## Remote Browser QA

Remote browser QA passed for:

- `/`
- `/library`
- `/story`
- `/create`
- `/settings`
- `/studio`

Evidence:

```text
artifacts/visual-qa/p25-remote-routes-mqda04cd/
artifacts/visual-qa/p25-remote-routes-mqda04cd/p25-remote-browser-qa.json
```

Acceptance notes:

- `consoleErrors: []`
- `failures: []`
- `/settings` login path enabled `导出我的数据` and `删除账号`.
- Public routes did not expose the forbidden internal terms checked by the P24/P25 QA pass.

## Health and CORS Evidence

Artifacts:

```text
artifacts/integration/p25-deployment-execution/health.json
artifacts/integration/p25-deployment-execution/cors-preflight.txt
```

Results:

- `GET https://pun-api-p25.vercel.app/health` returned `{"status":"ok"}`.
- `OPTIONS https://pun-api-p25.vercel.app/v1/auth/login` from `https://app-638zzda7k-james-projects-97742675.vercel.app` returned HTTP 200.
- CORS response included:
  - `access-control-allow-origin: https://app-638zzda7k-james-projects-97742675.vercel.app`
  - `access-control-allow-credentials: true`
  - `access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`

## Rollback Rehearsal

P25 rehearsed rollback at command and restore-plan level. It did not change the live alias or perform destructive restore.

Frontend rollback command shape:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN=https://pun-api-p19.vercel.app \
VITE_API_BASE_URL=https://pun-api-p19.vercel.app/v1 \
./scripts/deploy-vercel-preview.sh
```

Frontend alias rollback shape, only after product-owner approval:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx --yes vercel alias set app-i7x25dxxi-james-projects-97742675.vercel.app parallel-universe-novel-p0.vercel.app
```

Backend API rollback options:

1. Fast preview rollback: redeploy frontend with `VITE_API_ORIGIN=https://pun-api-p19.vercel.app`.
2. API alias rollback, only after operator approval: move the accepted API alias to the previously accepted API deployment.
3. Production rollback, not rehearsed here: restore latest verified persistent database backup, then redeploy or alias API traffic.

Known previous API rollback target:

```text
https://pun-api-p19.vercel.app
deployment id: dpl_7pTCdAfqQEziqEDXJf6bZ9vts2ky
```

## Runtime Backup and Restore Dry-run

Artifacts:

```text
artifacts/integration/p25-deployment-execution/runtime-backup.json
artifacts/integration/p25-deployment-execution/runtime-restore-dry-run.json
artifacts/integration/p25-deployment-execution/recovery-drill.json
artifacts/integration/p25-deployment-execution/migration-dry-run.json
```

Runtime backup:

- `status: completed`
- `backend: sqlite`
- `database_url: sqlite:////tmp/narrativeos_beta_p25.db`
- `schema_lifecycle_status: pending_migrations`

Restore dry-run:

- `status: planned`
- `dry_run: true`
- `restore_decision: ready_to_restore`
- `restore_decision_hints: ["restore_ready_for_operator_verification"]`
- `target_database: /tmp/narrativeos_beta_p25.db`

Recovery drill:

- `status: ready`
- verification commands:
  - `GET /health`
  - `GET /v1/ops/schema-lifecycle`
  - `GET /v1/ops/data-integrity`
  - `GET /v1/ops/provider-runtime-metrics`
  - `bash scripts/run_cross_pack_merge_gate.sh`

Migration dry-run:

- `status: pending_migrations`
- `schema_matches_migrations: true`
- latest available migration: `0012_runtime_hotspot_indexes`
- pending migrations: `12`

## Production Blockers

P25 does not clear these blockers:

1. Persistent production database provisioning and migration apply plan.
2. Backup / restore drill against that persistent database, not sqlite under `/tmp`.
3. Custom production domain CORS and cookie/security acceptance.
4. Real payment-provider credentials, return URL, callback, refund, dispute and cancellation operations.
5. Privacy/legal review for data export and account deletion.
6. Security audit and incident runbook rehearsal.
7. Product-owner acceptance of the exact public production alias.

## P26 Recommendation

P26 should be `Public Production Release Gate`.

Done when:

1. Persistent database is provisioned, migrated and backup-drilled.
2. Custom production domain and API domain pass CORS/cookie/security checks.
3. Real payment provider is configured and callback/return/refund/dispute paths are tested.
4. Privacy/legal and security review have explicit approval artifacts.
5. Frontend and API aliases are promoted only after product-owner approval.
6. Rollback is rehearsed against the production-like database and previous accepted deployment.
