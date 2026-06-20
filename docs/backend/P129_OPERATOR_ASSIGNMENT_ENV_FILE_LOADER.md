# P129 Operator Assignment Env File Loader

Status: active gate  
Boundary: operator assignment evidence loading, no tracked writes  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P128 gives the deployment operator a tracked template and an ignored local
target:

```text
deploy/runtime-production/remote-assignment.env.example
deploy/runtime-production/remote-assignment.env.local
```

Before P129, the operator still had to `source` the local file into the shell.
That created a fragile manual step: the dry run could use one shell state while
the apply step used another. P129 closes that gap by letting both P117 and P116
explicitly load the ignored local env file through:

```text
REMOTE_ASSIGNMENT_ENV_FILE
```

P129 does not deploy anything. It does not write tracked files, does not write
the production ignored assignment during fixture tests, does not create remote
services, does not set GitHub variables, does not store provider secrets and
does not promote live runtime.

After P138, P129 is a legacy full-remote compatibility gate. The current
edge-only production unblock uses the runtime assignment intent compiler:
`deploy/runtime-production/runtime-assignment.intent.local.json` plus
`npm run remote-assignment:prepare`. P129 remains in root test so an explicitly
chosen full-remote fallback can still be validated without shell-state drift.

P130 follows this gate and verifies that P121 and P123 use the same P138
edge-only command sequence. The legacy apply-env flag is not a valid primary
operator command. P132 follows P131 and verifies the resulting operator
assignment evidence chain still points at the current release head.

## Loader Rule

The loader only accepts paths that satisfy all of these rules:

- inside `deploy/runtime-production/`;
- end in `.env.local`;
- match `deploy/runtime-production/*.env.local`;
- ignored by Git;
- contain only the accepted P116/P117 non-secret assignment keys;
- do not point at the tracked `.env.example` template.

Unsupported keys, unignored files and tracked templates are rejected before any
assignment write can happen.

## Operator Sequence

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local

# Fill only non-secret evidence in the ignored local file.
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

## Command

```bash
npm run check:operator-assignment-env-file-loader
```

## Acceptance

1. `package.json` exposes `check:operator-assignment-env-file-loader`.
2. Root `npm run test` runs P129 after P128, then P130, P131, P132 and P133 before dependency audit.
3. P117 can load a safe ignored `.env.local` fixture through
   `REMOTE_ASSIGNMENT_ENV_FILE` and report ready for P116 apply.
4. P116 can load the same ignored `.env.local` fixture and write only a
   temporary assignment target.
5. P129 rejects the tracked `.env.example` template as runtime input.
6. P129 rejects unsupported env keys.
7. P129 rejects unignored env file paths.
8. P129 removes all temporary fixture files.
9. P129 artifacts and command output do not include env values, service ids,
   origins, provider credentials, prompt plumbing or private reference material.
10. P130 verifies the post-P129 loop command sequence and rejects legacy apply
    command drift.
11. P132 verifies current-head coherence after the P130/P131 evidence pair.

## Public Boundary

P129 artifacts may record:

- whether a local env file was loaded;
- the ignored file path;
- which env key names were present;
- which fixture checks passed or were rejected.

P129 artifacts must never record:

- actual service ids;
- actual origins;
- provider credentials;
- model keys;
- database strings;
- Tool Bridge tokens;
- system/provider prompt payloads;
- representative work material;
- profile ids, kernel ids or `sourceRefs`.
