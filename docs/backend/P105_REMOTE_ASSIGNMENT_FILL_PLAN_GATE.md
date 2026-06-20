# P105 Remote Assignment Fill Plan Gate

P105 turns the current remote-runtime blocker state into an operator fill plan.
It sits after P87/P89 handoff evidence and P85/P90 blocker evidence. The goal is
not to deploy services; the goal is to make the remaining deployment inputs
explicit, safe to share, and machine-checkable.

Command:

```bash
npm run check:remote-assignment-fill-plan
```

## Contract

The gate reads:

- P87 `remote-assignment-handoff` evidence for current image refs.
- P85 `remote-runtime-blockers` evidence for the current remaining stages.
- P90 blocker artifact attestation for current-head blocker consistency.
- `deploy/runtime-production/remote-assignment.schema.json`.
- `deploy/runtime-production/remote-assignment.example.json`.

It emits:

- `artifacts/runtime/remote-assignment-fill-plan-*.json`
- `artifacts/runtime/remote-assignment-fill-plan-*.md`

The artifact includes:

- target local assignment path:
  `deploy/runtime-production/remote-assignment.local.json`;
- current API and Agent Runtime image references;
- required non-secret fields for deployment ownership, API service, Agent
  Runtime service, origin execution, Pages variables and activation control;
- strict validation command sequence;
- boundary flags proving the gate does not write local assignment state.

## Boundary

P105 does not write `deploy/runtime-production/remote-assignment.local.json`.
It does not create remote services, set GitHub variables, store secrets, promote
live runtime, or treat fixture evidence as production readiness.

P108 Remote Assignment Local Boundary Guard owns the ignored local assignment
boundary after P105. It proves the fill plan still targets a Git-ignored local
file, that the committed example remains placeholder-only, and that fixture
evidence cannot unblock production readiness.

Forbidden in the fill-plan artifact:

- database URLs;
- Tool Bridge token values;
- model keys;
- private keys;
- provider API tokens;
- private prompt plumbing;
- raw runtime state;
- private research vault payloads.

## Required Fill Areas

| Area | Owner | Evidence |
| --- | --- | --- |
| Deployment ownership | deployment operator | owner, provider, environment |
| FastAPI service | deployment operator | service id, HTTPS origin, image, provider secret-store confirmation, `/health` |
| Agent Runtime service | deployment operator | service id, HTTPS origin, image, provider secret-store confirmation, dependency on API, `/health` |
| Remote origin execution | deployment operator | API and Agent origins plus service ids |
| Pages runtime variables | release owner | live mode and public runtime origins after health passes |
| Activation control | release owner | cutover attestation, rollback evidence and live browser QA |

## Validation Sequence

```bash
npm run check:remote-assignment-schema
npm run check:remote-assignment-env-dry-run
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers
```

## Acceptance

- `package.json` exposes `check:remote-assignment-fill-plan`.
- `package.json` exposes `check:remote-assignment-local-boundary`.
- Root `npm run test` runs it after
  `check:runtime-completion-blocker-convergence`.
- Root `npm run test` runs `check:remote-assignment-local-boundary` after the
  fill-plan artifact check.
- Pages workflow uploads `remote-assignment-fill-plan`.
- The generated artifact is operator-safe and redacted.
- The gate keeps current P85 blockers visible instead of declaring remote
  runtime ready. If a P112 local draft exists, only
  `remote-assignment-file-present` may become ready; assignment health, origin,
  live readiness, live trace, cutover and activation blockers must remain.
- In a clean checkout for the current `edge-only` topology, P85 may use the
  committed `runtime-assignment.intent.example.json` as projection evidence. In
  that case `remote-assignment-file-present` is not a current blocker, but the
  Data API / health / activation blockers must remain visible until operator
  evidence exists.
- P105 records the selected runtime assignment projection metadata in
  `upstreamEvidence.blockerLedger.runtimeAssignment` so P106 can validate the
  same clean-checkout edge-only boundary from the emitted artifact alone.
