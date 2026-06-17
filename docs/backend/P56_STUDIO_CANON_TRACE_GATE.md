# P56 Studio Canon Trace Gate

Date: 2026-06-17

## Goal

P56 proves the local Studio confirmation chain:

```text
quality/evaluate -> operator confirmation -> canon/commit -> canon ledger
```

The proof is intentionally scoped to the product runtime service contract. It
does not claim public live runtime, production operator authorization, or durable
multi-table canon publishing.

## Contract

`POST /v1/quality/evaluate` now returns a public-safe `studio_trace`:

- `trace_id`
- `source_run_id`
- `project_id`
- `session_id`
- `world_id`
- `world_version_id`
- `candidate_id`
- `chapter_id`
- `quality_report_hash`
- `quality_gate_status`
- `quality_gate_decision`
- `write_scope = evaluation_only`
- `steps`
- `next_required = ["operator_confirmation", "idempotency_key"]`

`POST /v1/canon/commit` writes the same trace into the canon ledger when all
commit requirements pass:

- explicit `confirmed = true`
- `quality_report`
- `Idempotency-Key`
- quality gate readiness

The committed ledger record includes:

- `source_run_id`
- `quality_report_hash`
- `studio_trace`
- `idempotency_key_hash`
- `write_scope = canon_ledger_only`
- `rollback_plan`

## Non-Claims

P56 is not:

- a durable multi-table transaction,
- a remote live runtime proof,
- production operator authorization,
- public branch publish,
- learned evaluator promotion.

## Verification

```bash
npm run check:studio-canon-trace
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

The gate verifies that the backend API, service, tests, frontend Studio client,
P45 audit, and P47 trace document all carry the same Studio trace vocabulary.

