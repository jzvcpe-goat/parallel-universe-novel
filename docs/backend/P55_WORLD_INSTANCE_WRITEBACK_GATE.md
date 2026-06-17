# P55 WorldInstance Writeback Candidate Gate

Date: 2026-06-17

## Goal

Reader choices should produce a WorldInstance relationship and memory writeback
candidate, not just a route-choice ledger record. P55 keeps the write in
candidate scope: it proves that the runtime can derive and read back a
relationship/memory patch from `StepRecord.state_before` and
`StepRecord.state_after`, without claiming canon write or public branch publish.

## Contract

When `POST /v1/scene/advance` succeeds with a `choice_id`, the service writes a
`route_choices` payload containing:

- `source_run_id`
- `worldline_id`
- `branch_id`
- `write_scope = route_choice_ledger_only`
- `world_instance_patch_candidate`

The `world_instance_patch_candidate` contains:

- `write_scope = world_instance_patch_candidate_only`
- state refs touched by the candidate patch
- added world facts
- added open promises
- changed relationship edges
- added route fingerprints
- current snapshot counts for facts, promises, relationship edges, and route
  fingerprint
- rollback plan for discarding the candidate before public publish

`/v1/reader/snapshot` and `/v1/timeline/worldlines/{id}/loom` expose
`world_instance_writeback_summary` so the Reader/Studio surfaces can verify that
the candidate patch is attached to the same worldline.

## Non-Claims

P55 is not public branch publish. It does not write canon. It does not prove a
multi-table database transaction rollback. It does not prove remote live Reader
generation. The candidate patch is still private runtime state until a later
publish gate confirms it.

## Acceptance

Run:

```bash
npm run check:world-instance-writeback
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

The gate requires:

1. `ProductRuntimeService.advance_scene` attaches
   `world_instance_patch_candidate`.
2. The patch is derived from `state_before` and `state_after`.
3. The patch uses `world_instance_patch_candidate_only`.
4. Snapshot/worldline endpoints return `world_instance_writeback_summary`.
5. P45 keeps the remaining gap explicit: this is not public branch publish and
   not production transaction rollback proof.
