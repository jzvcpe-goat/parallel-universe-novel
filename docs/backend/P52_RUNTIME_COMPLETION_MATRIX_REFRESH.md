# P52 Runtime Completion Matrix Refresh

Date: 2026-06-17

## Goal

Refresh the P45 completion audit after P49 and P51. The matrix must not keep stale gaps after new proof exists, and it must not overclaim production readiness.

## Updates

P49 changed time-engine status evidence:

- deterministic TimeEngine exists in Agent Runtime,
- candidate event density uses Poisson/Hawkes-style pressure,
- `candidateEvents.source = time_engine`,
- P57/P58 now add FastAPI candidate ledger plus branch publish candidate consumption,
- remaining gap is fitted event-density in production public branch publish, not absence of simulation or candidate service.

P51 changed state-writeback and quality-brake evidence:

- `/v1/canon/commit` requires `Idempotency-Key` for confirmed writes,
- repeated keys replay the same idempotent canon ledger record,
- commit records declare `write_scope = canon_ledger_only`,
- commit records include `rollback_plan`,
- P59 now proves a single-probe database transaction rollback fixture for Reader branch publish candidates,
- remaining gap is production public branch publish, durable multi-table WorldInstance writeback, and production operator auth.

P55 changed world-engine/state-writeback evidence:

- Reader choices now produce `world_instance_patch_candidate_only`,
- snapshot/worldline endpoints expose `world_instance_writeback_summary`,
- P58 now adds branch publish candidate linkage,
- remaining gap is production public branch publish plus durable multi-table writeback, not absence of a WorldInstance patch candidate.

P56 changed Studio/state-writeback evidence:

- `/v1/quality/evaluate` returns `studio_trace` and `quality_report_hash`,
- `/v1/canon/commit` stores the same trace in the `canon_ledger_only` record,
- idempotent replay returns the same ledger record,
- remaining gap is remote live commit, production operator authorization and durable multi-table publish, not absence of a Studio confirmation trace.

P57 changed time-engine evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/time-engine/candidates`,
- candidate events are persisted as `time_event_candidate_ledger_only`,
- repeated requests replay the same `time_engine_run_id`,
- `/v1/timeline/worldlines/{id}/time-engine` and `/loom` expose the latest candidate ledger,
- remaining gap is production public branch publish and production telemetry fitting, not absence of a durable FastAPI candidate service or P59 rollback fixture.

P58 changed Reader branch publish evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-candidate`,
- the gate requires `Idempotency-Key`,
- the gate consumes existing `route_choice_ledger_only` and latest `time_event_candidate_ledger_only`,
- successful calls write only `branch_publish_candidate_ledger_only`,
- `/loom` exposes `branch_publish_summary`.

P59 Database Transaction Rollback Fixture changed rollback evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-rollback-fixture`,
- the fixture requires `Idempotency-Key`,
- the fixture requires latest `branch_publish_candidate_ledger_only`,
- repository `prove_analytics_event_transaction_rollback` verifies insert-visible-before-rollback and `persisted_after_rollback = false`,
- successful calls return `write_scope = rollback_fixture_only`,
- remaining gap is production public branch publish and durable multi-table WorldInstance branch commit, not absence of rollback proof.

P60 Branch Publish Authorization Gate changed authorization evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-authorization`,
- the gate requires `Idempotency-Key`,
- the gate requires latest `branch_publish_candidate_ledger_only`,
- the request must include `operator_id` and `confirmed = true`,
- successful calls write only `branch_publish_authorization_ledger_only`,
- `/loom` exposes `branch_publish_authorization_summary`,
- remaining gap is production public branch publish and durable multi-table WorldInstance branch commit, not absence of operator authorization proof.

## Verification

Run:

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
```

`check:runtime-completion-refresh` prevents these stale claims from returning:

- time simulation not implemented,
- canon commit and rollback not proven at all,
- quality brake not connected to author confirmation.
- Studio quality evaluation and canon commit not linked by a shared trace.
- TimeEngine not implemented as a durable backend candidate ledger.
- Reader branch publish candidate gate not connected to TimeEngine candidate events.
- Database transaction rollback fixture not proven after branch publish candidate.
- Branch publish operator authorization not proven after rollback fixture.

## Boundary

The refreshed matrix keeps these modules partial:

- Narrative Runtime Engine,
- World Engine,
- Time Engine,
- State Writeback,
- Quality Brake,
- Reader Web,
- Creator Studio,
- Commercial Release Chain.

That is intentional: P49/P51/P57/P58/P59/P60 improve proof quality, but they do not replace live remote runtime, legal/payment readiness, production public branch publish, durable multi-table WorldInstance branch commit, or fitted TimeEngine telemetry.
