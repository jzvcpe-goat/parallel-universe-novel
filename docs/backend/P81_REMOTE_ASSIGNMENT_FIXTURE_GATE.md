# P81 Remote Assignment Fixture Gate

Date: 2026-06-18

## Goal

P81 gives the deployment owner a safe contract fixture for remote runtime
assignment before real provider origins exist. It proves the assignment file can
produce an operator execution pack, while also proving the fixture is not being
mistaken for a live remote service.

Committed fixture:

```text
deploy/runtime-production/remote-assignment.fixture.json
```

Command:

```bash
npm run check:remote-assignment-fixture
```

## Fixture Boundary

The fixture uses reserved `.invalid` origins:

```text
https://api.parallel-universe-runtime.invalid
https://agent.parallel-universe-runtime.invalid
```

That means:

- P79 strict execution pack must be able to generate health commands, GitHub
  Variable commands, strict gate commands and rollback commands.
- P75 pending health must remain the expected assignment-intake result.
- The fixture must never be treated as live runtime proof.
- The fixture must never be copied into GitHub repository variables.

## What This Proves

- The assignment schema is complete enough to drive cutover instructions.
- API and Agent service ids, origins, images, dependency order and
  provider-secret-store confirmation flags are structurally valid.
- Pages variables match the service origins.
- `check:remote-assignment-execution-pack` can pass strict mode from a
  no-secret assignment fixture.
- `check:remote-runtime-assignment-intake` still blocks on health for reserved
  domains, so no fixture can accidentally satisfy live runtime readiness.

## What This Does Not Prove

- It does not deploy API or Agent Runtime.
- It does not prove provider health.
- It does not set GitHub Variables.
- It does not mark P75, P73, P76, P78 or P23 production-ready.
- It does not replace a real `remote-assignment.local.json` from the deployment
  owner.

## Acceptance

1. `remote-assignment.fixture.json` is committed and contains no secrets.
2. `check:remote-assignment-fixture` is exposed in `package.json`.
3. Root `npm run test` includes `check:remote-assignment-fixture`.
4. P79 strict execution pack returns `assignment_execution_pack_ready` with the
   fixture.
5. P75 assignment intake returns `remote_assignment_pending_health` with the
   fixture.
6. The generated P81 artifact contains no provider secrets, database URLs,
   model keys, system prompts, raw state or private reference mappings.
