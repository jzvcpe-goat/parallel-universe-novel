# P128 Operator Assignment Env Template Gate

Status: active gate  
Boundary: operator assignment evidence preparation, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P123 describes the eight non-secret operator evidence fields. P125 proves the
no-write validator. P126 proves the write helper against an isolated temporary
target. P128 closes the remaining handoff gap: the operator needs one tracked,
copyable template that can be filled locally without hand-editing JSON and
without placing secret values in the repository, logs, artifacts or Pages
variables.

P128 does not deploy anything. It does not write
`deploy/runtime-production/remote-assignment.local.json`, does not create
remote services, does not set GitHub variables, does not store provider
credentials and does not promote public live runtime.

P129 follows this gate by proving P117 and P116 can load the ignored local env
copy directly through `REMOTE_ASSIGNMENT_ENV_FILE`. P130 follows P129 by
verifying P121/P123/P129 command consistency.

## Files

Tracked template:

```text
deploy/runtime-production/remote-assignment.env.example
```

Ignored local copy:

```text
deploy/runtime-production/remote-assignment.env.local
```

The tracked template is intentionally not a ready assignment. Service ids and
origins stay blank. Secret-store confirmations default to `false` until the
operator has configured the provider-side secret store.

## Operator Sequence

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local

# Fill only non-secret evidence in the local file.
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local \
REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true \
npm run check:remote-assignment-env-dry-run
REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local \
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true \
npm run apply:remote-assignment-env
npm run check:remote-runtime-assignment-intake
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

## Template Rules

The tracked template must:

- include exactly the P117/P116 accepted non-secret env keys;
- leave owner, provider, service ids and origins blank;
- set `REMOTE_RUNTIME_ENVIRONMENT=production`;
- set secret-store confirmations to `false`;
- never contain concrete service ids, origins, provider tokens, bridge tokens,
  model keys, database strings, private keys, prompt payloads, raw runtime
  state, rule identifiers or private title material;
- be paired with `.gitignore` entries that keep the local copy untracked.

## Command

```bash
npm run check:operator-assignment-env-template
```

## Acceptance

1. `package.json` exposes `check:operator-assignment-env-template`.
2. Root `npm run test` runs P128 after P126, then P129 and P130 before dependency audit.
3. The tracked `.env.example` contains exactly the accepted assignment env
   keys and no concrete operator values.
4. The local `.env.local` target is ignored by Git.
5. P128 writes a redacted artifact:
   `artifacts/runtime/operator-assignment-env-template-*.json`.
6. The artifact does not expose service ids, origins, provider credentials,
   prompt plumbing, raw state, private title material or rule identifiers.
7. P129 proves the ignored env file can be loaded by P117/P116 without manual
   shell sourcing and without leaking values.
8. P130 proves the loop handoff commands still point at the P129 env-file flow.

## Why This Exists

Without P128, the operator handoff is mechanically correct but still easy to
misuse: a person could hand-edit JSON, accidentally paste provider credentials
into a tracked file, or skip the dry-run sequence. The template turns the
handoff into a repeatable local-only SOP while preserving the existing
P117/P116/P75 safety boundary.
