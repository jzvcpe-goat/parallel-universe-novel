# P51 State Writeback Safety Gate

Date: 2026-06-17

## Goal

Close the most dangerous state-writeback gap before full production persistence: AI output stays candidate-only until explicit human confirmation, quality gate pass, and an idempotent commit request.

P51 does not claim complete multi-table canon persistence. It proves the current product runtime cannot casually duplicate or bypass canon ledger writes.

## Commit Rules

`POST /v1/canon/commit` now follows these rules:

1. Unconfirmed requests are blocked with `confirmation_required`.
2. Confirmed requests require `Idempotency-Key`.
3. Canon commits require `quality_gate.can_commit_canon = true`.
4. Same `Idempotency-Key` returns the same ledger record with `idempotent_replay = true`.
5. Written records declare `write_scope = canon_ledger_only`.
6. Written records include a `rollback_plan` for pre-publication rollback.

The Creator and Reader runtime remains candidate-only until that chain passes.

## Frontend Contract

Studio commit calls send a deterministic `idempotencyKey` through `runtimeApi.commitCanon`. The public Creator surface still does not expose canon write internals, provider details, raw state, or system prompt data.

## Verification

Run:

```bash
npm run check:state-writeback-safety
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
npm run test
```

The new gate checks:

- FastAPI accepts `Idempotency-Key` on `/v1/canon/commit`,
- `ProductRuntimeService.commit_canon` blocks missing keys for confirmed writes,
- repeated keys replay an existing ledger,
- tests cover missing-key, first-write, and replay behavior,
- Studio sends idempotency keys,
- written records include `rollback_plan`.

## Remaining Gap

P51 intentionally leaves these as future work:

- durable multi-table canon transaction rollback,
- multi-table canon/branch commit,
- Reader public branch publish / durable multi-table WorldInstance writeback tied to Creator run ledger,
- production auth/permission boundary for publish operators.

## P98 Follow-Up

P98 closes the canon-specific database transaction gap for confirmed Studio canon promotion while keeping the P51 safety controls:

- `/v1/canon/commit` still requires `Idempotency-Key`, explicit confirmation and a passing quality gate.
- Confirmed canon promotion now writes `production_canon_commits` and `analytics_events`.
- The response uses `write_scope = production_canon_promotion` and preserves `ledger_write_scope = canon_ledger_only` for compatibility with the P51 ledger.
- P98 still does not claim remote live runtime trace, Reader-visible branch release, paid launch, or durable multi-table WorldInstance writeback.
