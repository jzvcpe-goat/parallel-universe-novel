# P116 Remote Assignment Env Apply Gate

Status: active helper  
Boundary: Remote Runtime Assignment Boundary  
Date: 2026-06-19

## Goal

P112 prepares an ignored `remote-assignment.local.json` draft with current GHCR
image refs. P75 then expects the deployment owner to fill real service ids,
HTTPS origins and provider secret-store confirmations. P116 removes the riskiest
manual step: instead of hand-editing JSON, the operator can apply a controlled
set of non-secret `REMOTE_*` environment variables into the ignored assignment
file.

P117 should be run before the apply command when operator values are available.
It validates the same non-secret environment values without writing the local
assignment file, so bad origins, placeholders, partial input and accidental
secret-looking values are caught before P116 changes ignored state.

P126 validates the P116 write path through a temporary fixture target. It uses
`REMOTE_RUNTIME_ASSIGNMENT_FILE` to prove safe synthetic inputs can be applied
without writing the production ignored assignment file.

P128 provides the tracked local env template for real operator evidence:
`deploy/runtime-production/remote-assignment.env.example`. Operators should
copy it to the ignored `deploy/runtime-production/remote-assignment.env.local`,
fill only non-secret evidence, run P117, then run this apply command.

P129 allows P116 to read that ignored local env file directly through
`REMOTE_ASSIGNMENT_ENV_FILE`, so operators no longer have to export or source
the values manually. The loader only accepts ignored
`deploy/runtime-production/*.env.local` files and never records the values in
artifacts.

This gate does not create remote services, write GitHub repository variables,
store provider secrets, mark health checks ready, or enable public live runtime.
It only writes the local assignment file after explicit confirmation.

## Commands

Read-only wiring check for CI and root test:

```bash
npm run check:remote-assignment-env-apply
```

No-write operator input dry run:

```bash
npm run check:remote-assignment-env-dry-run
```

Local template preparation:

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local \
npm run check:remote-assignment-env-dry-run
```

Apply from the ignored local env file:

```bash
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local \
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true \
npm run apply:remote-assignment-env
```

Apply operator-provided non-secret values:

```bash
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true \
REMOTE_OPERATOR_OWNER=<owner-id> \
REMOTE_OPERATOR_PROVIDER=<provider-name> \
REMOTE_RUNTIME_ENVIRONMENT=production \
REMOTE_API_SERVICE_ID=<provider-api-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id> \
REMOTE_API_ORIGIN=https://<api-host> \
REMOTE_AGENT_ORIGIN=https://<agent-host> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
npm run apply:remote-assignment-env
```

The target file remains:

```text
deploy/runtime-production/remote-assignment.local.json
```

and it stays ignored by Git.

## Accepted Inputs

P116 accepts only these environment variables as assignment evidence:

- `REMOTE_OPERATOR_OWNER`
- `REMOTE_OPERATOR_PROVIDER`
- `REMOTE_RUNTIME_ENVIRONMENT`
- `REMOTE_API_SERVICE_ID`
- `REMOTE_AGENT_SERVICE_ID`
- `REMOTE_API_ORIGIN`
- `REMOTE_AGENT_ORIGIN`
- `REMOTE_API_SECRETS_CONFIGURED`
- `REMOTE_AGENT_SECRETS_CONFIGURED`
- `REMOTE_ASSIGNMENT_ENV_FILE`

`REMOTE_API_SECRETS_CONFIGURED` and `REMOTE_AGENT_SECRETS_CONFIGURED` are
boolean confirmations that the hosting provider secret store has already been
configured. They are not secret values.

`REMOTE_ASSIGNMENT_ENV_FILE` is a loader path, not assignment evidence. It must
point to an ignored `deploy/runtime-production/*.env.local` file. The tracked
`.env.example` template is rejected as input.

## Rejected Inputs

P116 rejects:

- missing required `REMOTE_*` values;
- `FILL_*`, `REPLACE_ME`, `YOUR_*`, `TODO_*` or `<...>` placeholders;
- `http://`, localhost, loopback, `.invalid`, `example.com`, path/query/hash
  origins;
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
artifacts/runtime/remote-assignment-env-apply-*.json
```

The artifact may include:

- current commit SHA;
- current P72 evidence path;
- whether required fields were applied;
- whether provider secret-store confirmation flags are true or false.

The artifact must not include actual service ids, origins, provider tokens,
secret values, prompts, candidate text, raw state or reference-vault material.

## Next Strict Step

After applying operator inputs, run:

```bash
npm run check:remote-runtime-assignment-intake
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
```

If health is not ready yet, P75 should move from `remote_assignment_incomplete`
to `remote_assignment_pending_health`. It should only reach
`remote_assignment_ready` after both remote `/health` endpoints respond.

## Acceptance

1. `package.json` exposes `apply:remote-assignment-env`.
2. `package.json` exposes `check:remote-assignment-env-apply`.
3. Root `npm run test` includes `check:remote-assignment-env-apply`.
4. Check mode never writes the local assignment file.
5. Apply mode requires `REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true`.
6. Apply mode writes only the ignored local assignment file.
7. Apply mode refreshes image refs from current P72 runtime image evidence.
8. Apply mode rejects secrets, placeholders and non-remote origins.
9. The redacted P116 artifact does not expose operator service ids or origins.
10. P126 proves the apply path with a temporary fixture target and leaves the
    production ignored assignment unchanged.
11. P128 proves the operator env template stays non-secret, copyable and
    ignored before real values are applied.
12. P129 proves P116 can load the ignored local env file directly, rejects
    tracked templates or unsupported keys, and keeps artifacts value-redacted.
