# P98 Canon Promotion Transaction Gate

## Goal

P98 closes the local state-writeback gap left by P51: a confirmed Studio canon commit is no longer only a JSON ledger record. The commit now proves and then writes a production database promotion row plus an audit event in one repository transaction.

This is still not a remote live runtime proof and it does not publish Reader-visible text. It only proves that local confirmed canon promotion can be persisted and audited without relying on a loose file-only ledger.

## Runtime Contract

`POST /v1/canon/commit` keeps the P51 safety requirements:

- `confirmed = true`
- `Idempotency-Key`
- `quality_gate.can_commit_canon = true`
- shared `studio_trace`
- pre-publication `rollback_plan`

When these requirements pass, the runtime now:

1. Builds the same `studio_trace` and quality report hash used by `/v1/quality/evaluate`.
2. Runs a rollback fixture against `production_canon_commits` and `analytics_events`.
3. Persists the confirmed canon promotion into `production_canon_commits`.
4. Writes an audit row into `analytics_events` in the same repository transaction.
5. Writes the compatibility canon ledger with `ledger_write_scope = canon_ledger_only`.

The public response reports:

- `write_scope = production_canon_promotion`
- `ledger_write_scope = canon_ledger_only`
- `tables_written = ["production_canon_commits", "analytics_events"]`
- `multitable_rollback_fixture.rollback_verified = true`
- `production_canon_commit_id`

## Privacy Boundary

P98 does not expose provider details, prompts, private runtime vectors, private reference titles, or vault contents. It only exposes operational write-scope and transaction-proof metadata already allowed in Studio/Ops runtime gates.

## Commands

```bash
npm run check:canon-promotion-transaction
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
npm run check:state-writeback-safety
```

## Remaining Boundaries

- Remote live runtime trace remains held by P65 until API and Agent HTTPS origins are configured.
- Reader-visible branch release remains separate from Studio canon promotion.
- Paid commercial launch and legal release packets remain out of scope for P98.
