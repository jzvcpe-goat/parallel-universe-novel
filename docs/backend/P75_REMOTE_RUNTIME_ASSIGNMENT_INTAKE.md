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

The committed template is:

```text
deploy/runtime-production/remote-assignment.example.json
```

The committed contract fixture is:

```text
deploy/runtime-production/remote-assignment.fixture.json
```

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
- `remote_assignment_incomplete`: assignment file exists, but service ids, origins, image refs, or provider-secret-store confirmations are missing.
- `remote_assignment_pending_health`: assignment fields are present, but one or both remote `/health` checks are not ready.
- `remote_assignment_ready`: service ids, origins, image refs, provider-secret-store confirmations and health checks are ready.

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

## Acceptance

- `.gitignore` ignores `deploy/runtime-production/remote-assignment.local.json`.
- `.gitignore` ignores `deploy/runtime-production/remote-assignment.*.local.json`.
- `remote-assignment.example.json` is committed and contains placeholders only.
- `remote-assignment.schema.json` is committed and checked before P75/P79.
- `package.json` exposes `check:remote-runtime-assignment-intake`.
- `package.json` exposes `check:remote-assignment-local-boundary`.
- Root `npm run test` includes `check:remote-runtime-assignment-intake`.
- Root `npm run test` includes `check:remote-assignment-local-boundary`.
- Missing assignment files produce `remote_assignment_missing` without blocking normal CI.
- Strict mode fails until assignment is `remote_assignment_ready`.
- The fixture with reserved `.invalid` origins stays at
  `remote_assignment_pending_health`.
- Generated artifacts do not contain provider secrets, database URLs, model keys, system prompts, raw state or private reference mappings.
