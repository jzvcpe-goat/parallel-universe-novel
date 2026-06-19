# P91 Remote Assignment Schema Gate

## Purpose

P91 gives the operator-filled `remote-assignment.local.json` a stable schema
contract before P75 health checks and P79 command generation run. Earlier gates
already produce handoff templates and command packs. P91 prevents simple
operator mistakes from reaching those gates:

- wrong gate or repository,
- unsupported fields,
- missing `api` or `agent` service sections,
- malformed origins, image refs or Pages variables,
- missing Agent -> API dependency,
- secret or provider prompt leakage.

P91 does not deploy services, call providers, set GitHub variables, check remote
health, store secrets or mark public live runtime ready.

## Files

```text
deploy/runtime-production/remote-assignment.schema.json
deploy/runtime-production/remote-assignment.example.json
deploy/runtime-production/remote-assignment.fixture.json
deploy/runtime-production/remote-assignment.local.json
```

The local file remains ignored by Git and is the only place an operator records
the real non-secret service assignment.

## Command

```bash
npm run check:remote-assignment-schema
```

Strict mode for an operator-filled local assignment:

```bash
REQUIRE_REMOTE_ASSIGNMENT_SCHEMA_READY=true npm run check:remote-assignment-schema
```

Custom path:

```bash
REMOTE_RUNTIME_ASSIGNMENT_FILE=/path/to/remote-assignment.local.json \
npm run check:remote-assignment-schema
```

## Decisions

- `remote_assignment_schema_waiting_for_local_assignment`: template and fixture
  are valid, but the ignored local assignment file does not exist yet.
- `remote_assignment_schema_incomplete`: the ignored local assignment has the
  expected safe shape, but still contains placeholders, missing remote origins
  or false provider secret-store confirmations. This is the expected P112 draft
  state and is not live-ready.
- `remote_assignment_schema_invalid`: committed schema/template/fixture or the
  local assignment violates the contract.
- `remote_assignment_schema_ready`: the operator-filled local assignment has the
  expected shape and is safe to pass to P75/P79.

## Public Boundary

The generated artifact contains only file names, issue ids, status and boundary
flags. It does not print local assignment contents, database URLs, Tool Bridge
token values, model keys, provider API tokens, private keys, system prompts, raw
runtime state, reference-work vault contents, `sourceRefs`, `profile.id` or
`kernel.id`.

## Acceptance

- `package.json` exposes `check:remote-assignment-schema`.
- Root `npm run test` runs P91 before P75 and P79.
- Pages workflow uploads `remote-assignment-schema`.
- P43 current-run artifact gate requires `remote-assignment-schema`.
- P75/P79 docs link to P91 as the schema preflight.
- Normal CI passes without `remote-assignment.local.json`; strict mode fails
  until the local assignment is filled and schema-valid.
