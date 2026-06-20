# P120 Remote Operator Return Intake

Status: active gate  
Boundary: deployment operator return intake, no service creation, no secret handling  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P119 creates a safe handoff packet for the deployment operator. P120 verifies
the material that comes back from that operator: the ignored assignment file,
environment dry-run state, image-drift state, live-readiness blockers and
activation-control blockers.

P120 is not a deployment tool. It does not create remote services, does not
write `deploy/runtime-production/remote-assignment.local.json`, does not set
GitHub variables, does not store provider credentials, does not promote live
runtime, and does not treat fixture evidence as production readiness.

In short: P120 does not create remote services and does not write
`deploy/runtime-production/remote-assignment.local.json`.

P120 must read P75 assignment evidence only from the current production path:
the tracked P138 edge-only projection, the ignored edge-only intent/compiled
contract, or the legacy local assignment when the operator explicitly chooses
full remote deployment.

```text
deploy/runtime-production/runtime-assignment.intent.example.json
deploy/runtime-production/runtime-assignment.intent.local.json
deploy/runtime-production/generated/remote-assignment.contract.json
deploy/runtime-production/remote-assignment.local.json
```

P81 fixture evidence may be newer, but it exists only to prove fixture safety
and must not decide the operator return state. In the default edge-only path,
remote Agent service id, origin, secret-store confirmation and health evidence
are not valid blockers.

## Commands

```bash
npm run check:remote-operator-return-intake
npm run check:remote-operator-return-intake-artifact
```

CI current-run content check:

```bash
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_REMOTE_OPERATOR_RETURN_INTAKE_ARTIFACT_REQUIRED=true \
npm run check:remote-operator-return-intake-artifact
```

## Inputs

P120 reads the latest evidence from:

- P119 remote operator readiness packet
- P75 remote assignment intake
- P117 remote assignment env dry-run
- P113 remote assignment image drift
- P85 remote runtime blocker ledger
- P78 remote activation control
- P23 live runtime readiness ledger

## Output

P120 emits:

- `artifacts/runtime/remote-operator-return-intake-*.json`
- `artifacts/runtime/remote-operator-return-intake-*.md`
- `artifacts/runtime/remote-operator-return-intake-attestation-*.json`

The JSON and Markdown are safe to share with a deployment operator. They include
the current assignment decision, preserved blockers, strict follow-up commands
and safe evidence pointers. They must not include secrets, candidate prose,
provider prompt plumbing, raw runtime state, private research titles, profile
ids or kernel ids.

## Decisions

- `operator_return_waiting_for_assignment`: the operator has not supplied a
  complete assignment yet.
- `operator_return_waiting_for_health`: the assignment shape is present, but
  remote health proof is not ready.
- `operator_return_ready_for_strict_activation`: the assignment intake is ready
  and the next strict activation gates can be run.

## Strict Follow-Up Chain

P120 only reports the next commands. It never runs strict promotion by itself.

```bash
npm run check:remote-runtime-assignment-intake
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
npm run check:remote-runtime-blockers
npm run check:runtime-completion-blocker-convergence
```

## Acceptance

1. `package.json` exposes both P120 scripts.
2. Root `npm run test` runs P120 after P119 artifact attestation and before
   local runtime image smoke evidence.
3. Pages workflow uploads `remote-operator-return-intake`.
4. Pages workflow downloads and checks the same current-run P120 artifact.
5. P43 metadata gate requires `remote-operator-return-intake` in current-run
   mode.
6. P107 counts `remote-operator-return-intake` as a downloaded content gate.
7. P16/P20/P45/P52 development docs include P120 in the remote activation
   chain.
8. P120 preserves blockers instead of calling the runtime ready.
9. P120 artifact flags prove no writes, service creation, GitHub variable
   mutation, credential storage, live promotion or fixture promotion.

## Failure Modes

- Missing P119 evidence means P120 fails; operator return intake cannot exist
  without a handoff packet.
- Missing P75/P117 evidence means P120 fails; operator return state cannot be
  interpreted without assignment intake and env dry-run proof.
- A newer fixture P75 artifact must be ignored; P120 must choose the P75
  artifact for the current P138 edge-only intent/contract or, only when
  explicitly selected, the ignored legacy local operator assignment.
- Missing remote health keeps P120 in waiting state; it must not promote live
  runtime.
- Any private field leakage fails artifact validation.
