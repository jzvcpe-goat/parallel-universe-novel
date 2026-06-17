# P53 Reader Branch Trace Gate

Date: 2026-06-17

## Goal

Reader choices must no longer be only local UI state. The Reader route now writes a branch trace into the existing backend ledger while keeping public publishing gated.

## Contract

`POST /v1/scene/advance` accepts:

- `session_id`
- `choice_id`
- `freeform_intent`
- `worldline_id`
- `branch_id`
- `source_run_id`

When the reader continuation succeeds and `choice_id` is present, the runtime writes a `route_choices` record with:

- `source_run_id`
- `worldline_id`
- `branch_id`
- `choice_id`
- `chapter_id`
- `write_scope = route_choice_ledger_only`
- rollback metadata

The response includes `branch_writeback`. `/v1/reader/snapshot` and `/v1/timeline/worldlines/{id}/loom` include `branch_writeback_summary`.

## Non-Claims

This is not public branch publish. It does not write canon. It does not yet provide full WorldInstance relationship writeback. It does not prove remote live Reader generation.

## Acceptance

Run:

```bash
npm run check:reader-branch-trace
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

The gate requires:

1. `route_choices` persistence through `save_route_choice`.
2. `list_route_choices` surfaced through worldline summary.
3. `/v1/scene/advance` returns `branch_writeback`.
4. Reader UI sends `source_run_id`, `worldline_id`, and `branch_id` without showing internal trace words.
5. P45 matrix names the remaining gap as branch publish / transaction rollback, not absence of Reader persistence.
