# P117 Remote Assignment Env Dry-Run Gate

Status: active helper  
Boundary: Remote Runtime Assignment Boundary  
Date: 2026-06-19

## Goal

P117 gives the deployment operator a no-write preflight before P116 writes the
ignored `deploy/runtime-production/remote-assignment.local.json` file. It checks
the same non-secret `REMOTE_*` values that P116 can apply, but it never creates
remote services, writes local assignment state, sets GitHub variables, stores
provider secrets, marks remote health ready or promotes public live runtime.
It does not write `remote-assignment.local.json`.

This closes the gap between the P105 fill plan and P116 apply command: an
operator can validate field completeness, placeholder rejection, remote HTTPS
origin shape, secret-store confirmation flags and artifact redaction before any
local file changes.

P125 adds a positive strict fixture and negative fixture set around this gate so
the validator itself is proven before real operator service evidence arrives.
P128 adds the tracked local env template that operators copy before supplying
real evidence to this dry-run gate.

## Commands

CI/root-test mode with no operator environment values:

```bash
npm run check:remote-assignment-env-dry-run
```

GitHub Pages CI may inject `REMOTE_API_SECRETS_CONFIGURED=false` and
`REMOTE_AGENT_SECRETS_CONFIGURED=false` as public readiness flags. Those `false`
flags alone do not count as operator assignment input, so CI still passes as
`operator_env_not_supplied`. A `true` confirmation flag or any service/origin
field does enter operator-env validation and must be complete.

Strict operator preflight after exporting non-secret values:

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local
# Fill the ignored local env file before loading it.
set -a
. ./deploy/runtime-production/remote-assignment.env.local
set +a

REMOTE_OPERATOR_OWNER=<owner-id> \
REMOTE_OPERATOR_PROVIDER=<provider-name> \
REMOTE_RUNTIME_ENVIRONMENT=production \
REMOTE_API_SERVICE_ID=<provider-api-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id> \
REMOTE_API_ORIGIN=https://<api-host> \
REMOTE_AGENT_ORIGIN=https://<agent-host> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true \
npm run check:remote-assignment-env-dry-run
```

When the dry run is ready, the next write step remains P116:

```bash
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env
```

## Accepted Inputs

Required non-secret inputs:

- `REMOTE_OPERATOR_OWNER`
- `REMOTE_OPERATOR_PROVIDER`
- `REMOTE_API_SERVICE_ID`
- `REMOTE_AGENT_SERVICE_ID`
- `REMOTE_API_ORIGIN`
- `REMOTE_AGENT_ORIGIN`
- `REMOTE_API_SECRETS_CONFIGURED`
- `REMOTE_AGENT_SECRETS_CONFIGURED`

Optional non-secret input:

- `REMOTE_RUNTIME_ENVIRONMENT`

`REMOTE_API_SECRETS_CONFIGURED` and `REMOTE_AGENT_SECRETS_CONFIGURED` are
boolean confirmations that the hosting provider secret store has already been
configured. They are not secret values.

## Rejected Inputs

P117 rejects the same unsafe values as P116:

- partial operator env sets;
- `FILL_*`, `REPLACE_ME`, `YOUR_*`, `TODO_*` or `<...>` placeholders;
- `http://`, localhost, loopback, `.invalid`, `example.com`, path/query/hash
  origins;
- identical API and Agent origins;
- database URLs;
- Tool Bridge token values;
- model API keys;
- provider API tokens;
- private keys;
- system/provider prompt payloads;
- raw runtime state;
- `sourceRefs`, `profile.id`, `kernel.id` or reference-vault material.

## Output

The script writes a redacted artifact:

```text
artifacts/runtime/remote-assignment-env-dry-run-*.json
```

The artifact may include:

- current commit SHA;
- current P72 evidence path;
- whether required fields were supplied;
- missing env key names;
- boolean origin-shape checks;
- provider secret-store confirmation booleans;
- the next safe command.

The artifact must not include actual service ids, origins, provider tokens,
secret values, prompts, candidate text, raw state or reference-vault material.

## Decisions

- `operator_env_not_supplied`: CI/root-test mode; no operator env values were
  provided, or only CI default `false` secret-store flags were present, so the
  gate passes without pretending assignment is ready.
- `operator_env_waiting_for_secret_store_confirmation`: field shapes are valid,
  but one or both provider secret-store confirmations are `false`.
- `operator_env_ready_for_p116_apply`: all required non-secret env values are
  present, remote HTTPS origins are valid and distinct, and both provider
  secret-store confirmations are true.

## Acceptance

1. `package.json` exposes `check:remote-assignment-env-dry-run`.
2. Root `npm run test` includes `check:remote-assignment-env-dry-run`.
3. The gate writes only a redacted artifact and never writes
   `remote-assignment.local.json`.
4. With no operator env, the gate passes as `operator_env_not_supplied`.
5. With only CI default `false` secret-store flags, the gate still passes as
   `operator_env_not_supplied`.
6. With partial operator env, the gate fails before P116 can write anything.
7. With full operator env and false secret-store confirmations, the gate passes
   only as follow-up-required unless strict ready mode is requested.
8. With full operator env and true secret-store confirmations, the gate reports
   ready for P116 apply.
9. The artifact does not expose service ids, origins, secrets, provider prompt
   plumbing, reference-work material, `sourceRefs`, `profile.id` or `kernel.id`.
10. P125 runs a positive strict fixture and unsafe negative fixtures against
    P117 without writing `remote-assignment.local.json`.
11. P128 validates the copyable env template and ignored local env target used
    before real operator values are supplied.
