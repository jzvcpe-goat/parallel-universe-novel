# P75 Remote Runtime Assignment Intake

## Purpose

P75 gives the remote deployment owner a durable, non-secret intake file for the
actual API and Agent Runtime service assignment. P74 generates a handoff pack;
P75 is where the deployment owner records the concrete service ids, HTTPS
origins, image refs and provider-secret-store confirmation needed by P73.

The actual assignment file is local-only and ignored by Git:

```text
deploy/runtime-production/remote-assignment.local.json
```

P108 Remote Assignment Local Boundary Guard keeps this ignored local assignment
boundary under test. The local file may exist on an operator machine, but it must
not be committed, uploaded as a public artifact, or replaced by fixture data.
P110 Runtime Placeholder Sentinel Guard also proves `FILL_*`, `REPLACE_ME`,
`YOUR_*`, `TODO_*` and `<...>` placeholders cannot be mistaken for real service
ids or remote HTTPS origins.

The committed template is:

```text
deploy/runtime-production/remote-assignment.example.json
```

The committed contract fixture is:

```text
deploy/runtime-production/remote-assignment.fixture.json
```

P138/P140 add a higher-level compiler path for topology-aware deployment
evidence:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
deploy/runtime-production/generated/remote-assignment.contract.json
```

When `runtime_mode=edge-only`, P75 prefers the generated contract; if the
contract is not compiled yet, it reads the ignored runtime intent directly and
projects the remaining blockers from that source. In that topology, remote Agent
absence is expected evidence, not a missing service id. The legacy
`remote-assignment.local.json` full-remote draft is used only when the operator
explicitly passes `REMOTE_RUNTIME_ASSIGNMENT_FILE` or when no edge-only intent
exists.

The fixture uses reserved `.invalid` origins. It is only for validating the
assignment shape and P79 command generation. It must produce
`remote_assignment_pending_health`, not `remote_assignment_ready`; the fixture
cannot unblock production readiness.

Machine anchor: fixture cannot unblock production readiness.

## Command

Schema preflight:

```bash
npm run check:remote-assignment-schema
```

```bash
npm run check:remote-runtime-assignment-intake
```

Optional env-based apply helper:

```bash
npm run check:remote-assignment-env-dry-run
```

```bash
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true \
REMOTE_OPERATOR_OWNER=<owner-id> \
REMOTE_OPERATOR_PROVIDER=<provider-name> \
REMOTE_API_SERVICE_ID=<provider-api-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id> \
REMOTE_API_ORIGIN=https://<api-host> \
REMOTE_AGENT_ORIGIN=https://<agent-host> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
npm run apply:remote-assignment-env
```

Strict mode:

```bash
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
```

Custom path:

```bash
REMOTE_RUNTIME_ASSIGNMENT_FILE=/path/to/remote-assignment.local.json \
npm run check:remote-runtime-assignment-intake
```

## Decisions

- `remote_assignment_missing`: no local assignment file exists yet.
- `remote_assignment_incomplete`: assignment evidence exists, but required
  service ids, origins, image refs or configuration confirmations are missing.
  In edge-only mode this means frontend/data API evidence, not remote Agent
  evidence.
- `remote_assignment_pending_health`: assignment fields are present, but the
  required health proof is not ready. In edge-only mode this is the managed data
  API health probe; the remote Agent health check is not required.
- `remote_assignment_ready`: service ids, origins, image refs, provider-secret-store confirmations and health checks are ready.

For a P138 `edge-only` contract, `remote_assignment_ready` means the frontend
and managed data API evidence is complete and the remote Agent absence boundary
is explicit. Remote health is then checked by `npm run remote-health:check`.

## Assignment Rules

The local assignment file may contain:

- provider name,
- deployment owner,
- API service id,
- Agent Runtime service id,
- API HTTPS origin,
- Agent Runtime HTTPS origin,
- current API and Agent Runtime image refs,
- `providerSecretsConfigured: true` confirmation flags,
- public Pages variables to write only after health passes.

The local assignment file must not contain:

- `DATABASE_URL` value,
- Tool Bridge token value,
- model API key,
- provider API token,
- private key,
- system prompt payload,
- raw runtime state,
- reference-work vault contents.

## P73 Export

When the assignment is filled, the P75 artifact emits export commands for P73:

```bash
export REMOTE_API_SERVICE_ID=<provider-api-service-id>
export REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id>
export REMOTE_API_ORIGIN=https://<api-host>
export REMOTE_AGENT_ORIGIN=https://<agent-host>
export REMOTE_API_SECRETS_CONFIGURED=true
export REMOTE_AGENT_SECRETS_CONFIGURED=true
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
```

For GitHub Actions live cutover, P76 can use non-secret repository variables
instead of the ignored local assignment file:

```text
REMOTE_API_SERVICE_ID
REMOTE_AGENT_SERVICE_ID
REMOTE_API_SECRETS_CONFIGURED=true
REMOTE_AGENT_SECRETS_CONFIGURED=true
```

Then run:

```bash
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
```

## Boundary

P75 does not choose a provider, create a service, write GitHub Pages live
variables, store secrets, or mark public live runtime ready. It only proves that
the operator-provided remote service assignment is complete enough to run P73
and P66 in strict mode.

P116 `apply:remote-assignment-env` is only a safer way to fill this same ignored
local assignment file from non-secret operator environment variables. It must
not accept secret values, and it does not replace P75 readiness checks.

P117 `check:remote-assignment-env-dry-run` is the no-write preflight for the
same non-secret environment variables. It catches partial env sets, placeholder
values, invalid origins and secret-looking material before P116 writes ignored
local state.

P138 `remote-assignment:prepare` is the preferred path for edge-only topology.
It must not fabricate `REMOTE_AGENT_SERVICE_ID` or `REMOTE_AGENT_ORIGIN`.

## Acceptance

- `.gitignore` ignores `deploy/runtime-production/remote-assignment.local.json`.
- `.gitignore` ignores `deploy/runtime-production/remote-assignment.*.local.json`.
- `remote-assignment.example.json` is committed and contains placeholders only.
- `remote-assignment.schema.json` is committed and checked before P75/P79.
- `package.json` exposes `check:remote-runtime-assignment-intake`.
- `package.json` exposes `apply:remote-assignment-env`.
- `package.json` exposes `check:remote-assignment-env-apply`.
- `package.json` exposes `check:remote-assignment-env-dry-run`.
- `package.json` exposes `check:remote-assignment-local-boundary`.
- `package.json` exposes `check:runtime-placeholder-sentinel`.
- Root `npm run test` includes `check:remote-runtime-assignment-intake`.
- Root `npm run test` includes `check:remote-assignment-env-apply`.
- Root `npm run test` includes `check:remote-assignment-env-dry-run`.
- Root `npm run test` includes `check:remote-assignment-local-boundary`.
- Root `npm run test` includes `check:runtime-placeholder-sentinel`.
- Missing assignment files produce `remote_assignment_missing` without blocking normal CI.
- Strict mode fails until assignment is `remote_assignment_ready`.
- `FILL_*` placeholders produce `remote_assignment_incomplete`, not
  `remote_assignment_pending_health`.
- The fixture with reserved `.invalid` origins stays at
  `remote_assignment_pending_health`.
- Generated artifacts do not contain provider secrets, database URLs, model keys, system prompts, raw state or private reference mappings.
