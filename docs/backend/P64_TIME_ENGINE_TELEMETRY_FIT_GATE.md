# P64 TimeEngine Telemetry Fit Gate

Date: 2026-06-17

## Goal

P64 turns the durable TimeEngine candidate ledger into a production telemetry
fit after a Reader-visible public branch release exists. It still does not
prove remote live runtime, paid launch, or provider-side model adaptation. The
goal is to make event-density fitting a durable backend artifact instead of a
demo-only calculation.

Command:

```bash
npm run check:time-engine-telemetry-fit
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/time-engine/telemetry-fit`
- `GET /v1/timeline/worldlines/{worldline_id}/time-engine/telemetry-fit`

`POST` 输入：

- Header: `Idempotency-Key`
- `public_release_id`
- `time_engine_run_id`
- `fit_operator_id`
- `confirmed`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P63 `reader_visible_branch_release`。
3. 必须已经存在 latest `time_event_candidate_ledger_only`。
4. 如果传入 `public_release_id`，必须与当前 worldline 最新 public release 一致。
5. 如果传入 `time_engine_run_id`，必须与当前 worldline 最新 TimeEngine run 一致。
6. 必须提供 `fit_operator_id`。
7. 必须显式 `confirmed = true`。
8. 必须提供 `Idempotency-Key`。

`POST` 输出：

- `status = fitted_candidate`
- `capability_mode = production_time_engine_fit_gate`
- `write_scope = production_time_engine_fit`
- `telemetry_fit_id`
- `time_engine_run_id`
- `public_release_id`
- `branch_commit_id`
- `fit_operator_id`
- `sample_size`
- `fit_summary.mode = production_time_engine_fit`
- `tables_written = ["time_engine_telemetry_fits", "analytics_events"]`

## Database Boundary

P64 introduces `time_engine_telemetry_fits`:

- ORM row: `TimeEngineTelemetryFitRow`
- Migration: `backend/db/migrations/0015_time_engine_telemetry_fits.sql`
- Bootstrap schema: `backend/db/postgres_schema.sql`

The repository writes `time_engine_telemetry_fits` and an `analytics_events`
audit event in the same transaction. Idempotent replay returns the same
`telemetry_fit_id` and does not create a second fit row.

## Fit Boundary

P64 is a telemetry fitting gate:

- reads latest durable TimeEngine candidate ledger,
- reads latest Reader-visible public release,
- stores deterministic fitted `mu/alpha/beta` summary,
- exposes `/loom.time_engine_fit_summary`,
- does not call a remote model,
- does not tune production model weights,
- does not prove remote live runtime trace.

## Acceptance

1. `backend/src/narrativeos/persistence/db.py` defines `TimeEngineTelemetryFitRow`.
2. `backend/db/migrations/0015_time_engine_telemetry_fits.sql` exists.
3. `backend/db/postgres_schema.sql` includes `time_engine_telemetry_fits`.
4. `backend/src/narrativeos/persistence/repositories.py` exposes `persist_time_engine_telemetry_fit`.
5. `backend/src/narrativeos/services/product_runtime.py` exposes `fit_time_engine_telemetry`.
6. API exposes telemetry-fit POST/GET.
7. Missing public release returns `public_branch_release_required`.
8. Missing `Idempotency-Key` returns `idempotency_key_required`.
9. Missing fit operator returns `fit_operator_id_required`.
10. Missing confirmation returns `time_engine_fit_confirmation_required`.
11. Successful call writes `production_time_engine_fit`.
12. `/loom` exposes `time_engine_fit_summary`.
13. `check:time-engine-telemetry-fit` is part of root `npm run test`.

## Next Gate

P65 should be **Remote Live Runtime Trace Gate**:

- configure public Pages live mode variables,
- connect remote FastAPI HTTPS origin,
- connect remote Agent Runtime HTTPS origin,
- prove remote Creator seed-to-candidate workflow,
- prove Reader branch release trace continuity against remote runtime,
- keep public UI free of internal terms.
