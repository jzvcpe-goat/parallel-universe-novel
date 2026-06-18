# P63 Production Public Publish Gate

Date: 2026-06-17

## Goal

P63 moves the Reader branch chain from P62 private production persistence into a
Reader-visible public branch release. It still does not prove remote live
runtime, paid commercial launch, legal approval automation, or fitted
TimeEngine telemetry. The goal is to prove the first production public publish
boundary in the backend runtime chain.

Command:

```bash
npm run check:public-branch-publish
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/public-publish`
- `GET /v1/timeline/worldlines/{worldline_id}/branches/public-publish`

`POST` 输入：

- Header: `Idempotency-Key`
- `branch_commit_id`
- `release_owner_id`
- `ops_reviewer_id`
- `rollback_owner_id`
- `confirmed`
- `public_publish_enabled`
- `remote_runtime_trace_ref`
- `legal_audit_ref`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P62 `production_branch_table_private`。
3. 如果传入 `branch_commit_id`，必须与当前 worldline 最新 private commit 一致。
4. 必须提供与 P62 private commit 一致的 `release_owner_id`。
5. 必须提供 `ops_reviewer_id`。
6. 必须提供 `rollback_owner_id`。
7. 必须显式 `confirmed = true`。
8. 必须显式 `public_publish_enabled = true`。
9. 必须提供 `Idempotency-Key`。

`POST` 输出：

- `status = published_public`
- `capability_mode = production_public_publish_gate`
- `write_scope = reader_visible_branch_release`
- `public_release_id`
- `branch_commit_id`
- `commit_draft_id`
- `authorization_id`
- `branch_publish_candidate_id`
- `release_owner_id`
- `ops_reviewer_id`
- `rollback_owner_id`
- `visibility_status = reader_visible`
- `reader_visibility_enabled = true`
- `public_publish_enabled = true`
- `production_public_publish = true`
- `tables_written = ["public_branch_releases", "analytics_events"]`
- `rollback_plan.method = mark_public_branch_release_withdrawn`

## Database Boundary

P63 introduces `public_branch_releases`:

- ORM row: `PublicBranchReleaseRow`
- Migration: `backend/db/migrations/0014_public_branch_releases.sql`
- Bootstrap schema: `backend/db/postgres_schema.sql`

The repository writes `public_branch_releases` and an `analytics_events` audit
event in the same transaction. Idempotent replay returns the same
`public_release_id` and does not create a second Reader-visible release row.

## Write Boundary

P63 is a Reader visibility gate:

- requires P62 private production branch commit,
- writes durable `public_branch_releases`,
- writes audit event,
- exposes `reader_visibility_enabled = true`,
- exposes `/loom.public_branch_release_summary`,
- does not enable remote live runtime,
- does not fit TimeEngine production telemetry,
- does not replace paid launch/legal/security readiness.

## Acceptance

1. `backend/src/narrativeos/persistence/db.py` defines `PublicBranchReleaseRow`.
2. `backend/db/migrations/0014_public_branch_releases.sql` exists.
3. `backend/db/postgres_schema.sql` includes `public_branch_releases`.
4. `backend/src/narrativeos/persistence/repositories.py` exposes `persist_public_branch_release`.
5. `backend/src/narrativeos/services/product_runtime.py` exposes `publish_public_branch`.
6. API exposes public publish POST/GET.
7. Missing P62 commit returns `production_branch_commit_required`.
8. Missing `Idempotency-Key` returns `idempotency_key_required`.
9. Mismatched release owner returns `release_owner_mismatch`.
10. Missing ops reviewer returns `ops_reviewer_id_required`.
11. Missing rollback owner returns `rollback_owner_id_required`.
12. Missing confirmation returns `public_publish_confirmation_required`.
13. Missing public publish switch returns `public_publish_enabled_required`.
14. Successful call writes `reader_visible_branch_release`.
15. `/loom` exposes `public_branch_release_summary`.
16. `check:public-branch-publish` is part of root `npm run test`.

## Next Gate Status

P64 now implements **TimeEngine Telemetry Fit Gate**:

- public release after P63,
- latest durable TimeEngine candidate ledger,
- fit operator confirmation,
- `production_time_engine_fit`,
- `/loom.time_engine_fit_summary`.

The next unresolved gate should move to **Remote Live Runtime Trace Gate**:

- remote FastAPI HTTPS origin,
- remote Agent Runtime HTTPS origin,
- live Creator workflow preflight,
- public Pages runtime vars,
- Reader branch publish trace continuity against remote runtime,
- public release artifact evidence with no internal terms.
