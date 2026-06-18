# P79 Remote Assignment Execution Pack

## Purpose

P79 converts the ignored, non-secret P75 assignment file into an operator-ready
execution pack. It is the bridge between "remote services have been assigned"
and "the deployment owner has the exact commands for health checks, strict
gates, GitHub Variables, Pages dispatch and rollback."

P79 does not deploy services, mutate GitHub Variables, store secrets, call a
provider API, or mark public live runtime ready. It only generates a safe command
bundle and checklist from the assignment evidence.

## Command

```bash
npm run check:remote-assignment-execution-pack
```

Strict mode:

```bash
REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack
```

Custom assignment file:

```bash
REMOTE_RUNTIME_ASSIGNMENT_FILE=/path/to/remote-assignment.local.json \
npm run check:remote-assignment-execution-pack
```

## Decisions

- `assignment_execution_waiting_for_assignment`: no local assignment file exists
  yet.
- `assignment_execution_incomplete`: assignment exists, but service ids, HTTPS
  origins, image refs, provider-secret-store flags or Pages variables are not
  complete enough to produce a cutover pack.
- `assignment_execution_pack_ready`: the assignment can produce health commands,
  strict gate commands, GitHub Variable commands and rollback commands.

## Generated Artifacts

The check emits:

```text
artifacts/runtime/remote-assignment-execution-pack-*.json
artifacts/runtime/remote-assignment-execution-pack-*.md
```

The Markdown artifact is the operator handoff. It includes:

- API and Agent health commands,
- GitHub repository variable commands,
- strict P75/P73/P76/P78 commands,
- rollback commands,
- ordered operator checklist.

## Public Boundary

P79 may include:

- service ids,
- HTTPS origins,
- GHCR image refs,
- provider-secret-store confirmation flags,
- safe GitHub variable commands.

P79 must not include:

- database URLs,
- Tool Bridge token values,
- model keys,
- provider API tokens,
- private keys,
- system prompts,
- raw runtime state,
- reference-work vault contents.

## Acceptance

- `package.json` exposes `check:remote-assignment-execution-pack`.
- Root `npm run test` includes `check:remote-assignment-execution-pack`.
- Missing assignment files produce `assignment_execution_waiting_for_assignment`
  without failing normal CI.
- Strict mode fails until an execution pack is ready.
- The generated JSON and Markdown artifacts contain no secrets.
- P78 links to this pack as the next action when it is waiting for assignment.
