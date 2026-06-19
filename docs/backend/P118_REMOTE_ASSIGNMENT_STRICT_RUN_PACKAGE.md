# P118 Remote Assignment Strict-Run Package

Status: active helper gate  
Scope: P117/P116/P75/P79/P73/P66/P23/P76/P78 operator execution chain  
Boundary: does not deploy services, write local assignment state, set GitHub variables or mark live runtime ready

## Why This Exists

P105 gives the deployment operator a fill plan. P118 turns that plan into a
strict-run package: one ordered, machine-checkable sequence that can be handed to
the operator once real remote API and Agent Runtime services exist.

This is not a readiness claim. It keeps the remote runtime blockers visible
until strict health, origin, readiness, cutover and activation gates pass.

## Commands

```bash
npm run check:remote-assignment-strict-run-package
npm run check:remote-assignment-strict-run-package-artifact
```

Current-run CI artifact mode:

```bash
CHECK_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-strict-run-package-artifact
```

## Inputs

P118 reads current evidence from:

- P105 `remote-assignment-fill-plan`;
- P106 `remote-assignment-fill-plan-attestation`;
- P116 `remote-assignment-env-apply` in check mode;
- P117 `remote-assignment-env-dry-run`;
- P113 `remote-assignment-image-drift`;
- P75 `remote-runtime-assignment-intake`;
- P79 `remote-assignment-execution-pack`;
- P73 `remote-origin-execution`;
- P66 `remote-origin-provisioning`;
- P23 `live-runtime-readiness`;
- P76 `live-cutover-attestation`;
- P78 `remote-activation-control`;
- P85 `remote-runtime-blockers`;
- P96 `runtime-completion-blocker-convergence`.

## Outputs

P118 emits:

- `artifacts/runtime/remote-assignment-strict-run-package-*.json`
- `artifacts/runtime/remote-assignment-strict-run-package-*.md`
- `artifacts/runtime/remote-assignment-strict-run-package-attestation-*.json`

The package contains:

- current API and Agent Runtime image references;
- target local assignment path:
  `deploy/runtime-production/remote-assignment.local.json`;
- ordered strict commands for the operator;
- current blocked stage ids;
- redacted upstream evidence metadata only.

## Strict Run Sequence

```bash
npm run check:runtime-image-publish-evidence
npm run check:remote-assignment-fill-plan
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env
npm run check:remote-assignment-image-drift
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers
npm run check:runtime-completion-blocker-convergence
```

## Boundary

P118 does not write `deploy/runtime-production/remote-assignment.local.json`.
It does not create remote services, set GitHub variables, store provider
secrets, promote live runtime, or treat fixture evidence as production
readiness.

Forbidden in P118 artifacts:

- database URLs;
- Tool Bridge token values;
- model keys;
- private keys;
- provider API tokens;
- private prompt plumbing;
- raw runtime state;
- private research vault payloads;
- representative work names or source-reference mappings.

## Local vs CI Blockers

Local runs may have the ignored P112 assignment draft, so
`remote-assignment-file-present` can be ready while
`remote-assignment-health-ready` remains blocked.

CI intentionally does not own that ignored local file. A current-run GitHub
artifact may preserve `remote-assignment-file-present` as blocked. The P118
artifact checker accepts either shape, but it never allows `activation-control`
to disappear until strict live cutover gates pass.

## Acceptance

- `package.json` exposes both P118 scripts.
- Root `npm run test` runs P118 after `check:remote-assignment-image-drift`.
- Pages workflow uploads `remote-assignment-strict-run-package`.
- Pages workflow downloads and checks the same current-run P118 artifact.
- P107 CI artifact content coverage counts P118 as a downloaded content gate.
- P20/P45/P52 development docs list P118 in the remote activation chain.
- P118 artifact flags prove no writes, service creation, GitHub variable
  mutation, secret storage, fixture promotion or live runtime promotion.
- P118 keeps remote blockers visible instead of calling remote runtime ready.
