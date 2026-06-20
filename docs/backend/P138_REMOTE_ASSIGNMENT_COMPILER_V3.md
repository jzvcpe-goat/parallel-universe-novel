# P138 Remote Assignment Compiler v3

## Purpose

P138 upgrades the old remote-assignment handoff from manually filling eight
`REMOTE_*` fields into a topology-aware compiler. The deployment operator now
fills one ignored intent file:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
```

The committed example is:

```text
deploy/runtime-production/runtime-assignment.intent.example.json
```

The compiler can represent three runtime modes:

- `edge-only`: cloud hosts the reader frontend and managed data API; AI writing
  happens only on the user's own edge device.
- `hybrid`: cloud has a remote agent runtime, but selected generation can still
  be edge/local.
- `full-remote`: cloud has both API and Agent runtime.

The immediate production unblock is `edge-only`. In that mode, the absence of a
remote Agent service is not a missing field. It is explicit boundary evidence.

## Commands

Compile all local artifacts:

```bash
RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
```

Run the no-write compiler gate:

```bash
npm run check:runtime-assignment-compiler
```

Validate the generated contract:

```bash
npm run remote-assignment:validate
```

Check live managed data health:

```bash
npm run remote-health:check
```

## Generated Local Artifacts

P140 prepares the ignored local intent before the compiler runs:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
```

All generated artifacts live under ignored local state:

```text
deploy/runtime-production/generated/remote-assignment.contract.json
deploy/runtime-production/generated/remote-assignment.legacy.env
deploy/runtime-production/generated/operator-assignment-evidence.md
deploy/runtime-production/generated/loop-next-goal-ledger.patch.json
deploy/runtime-production/generated/remote-health-evidence.request.json
deploy/runtime-production/generated/remote-health-evidence.result.json
```

`remote-assignment:legacy-env` also updates the ignored compatibility file:

```text
deploy/runtime-production/remote-assignment.env.local
```

## Edge-Only Rules

For `edge-only`, the generated legacy env must include:

```text
REMOTE_RUNTIME_MODE=edge-only
REMOTE_AGENT_REMOTE_REQUIRED=false
REMOTE_AI_GENERATION_CLOUD_RUNTIME=false
REMOTE_READER_CAN_TRIGGER_AI=false
REMOTE_AGENT_SERVICE_ID=
REMOTE_AGENT_ORIGIN=
REMOTE_AGENT_SECRETS_CONFIGURED=false
```

The old checker must not demand a fake `REMOTE_AGENT_SERVICE_ID`, fake
`REMOTE_AGENT_ORIGIN`, or fake `REMOTE_AGENT_SECRETS_CONFIGURED=true`.

## Secret Boundary

The contract must preserve:

```yaml
frontend_secret_keys_allowed: false
service_role_in_frontend_allowed: false
writer_password_in_frontend_allowed: false
cloud_ai_api_keys_allowed: false
```

Allowed public/browser config is limited to public origins and Supabase
publishable/anon-with-RLS access. Do not place service-role keys, writer
passwords, model keys, database URLs, Tool Bridge tokens, provider API tokens,
or private reference-work material in the intent, generated artifacts, public
repo, or browser bundle.

## Acceptance

- `.gitignore` ignores the local intent and generated artifacts.
- `package.json` exposes `prepare:runtime-assignment-intent` and
  `check:runtime-assignment-intent-prep`.
- `package.json` exposes the compiler, validator, legacy-env, evidence,
  ledger-patch, health-check, prepare, and compiler-check scripts.
- Root `npm run test` includes `check:runtime-assignment-intent-prep` before
  `check:runtime-assignment-compiler`.
- Root `npm run test` includes `check:runtime-assignment-compiler`.
- `check:remote-assignment-env-dry-run` is mode-aware.
- `check:remote-runtime-assignment-intake` can accept an edge-only generated
  contract without requiring remote Agent service evidence.
- `check:live-cutover-attestation` treats remote Agent absence as expected only
  when a ready P75 edge-only contract exists.
