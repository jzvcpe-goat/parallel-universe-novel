# P130 Operator Assignment Loop Command Consistency

Status: active gate  
Boundary: operator assignment handoff command consistency, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P129 made the operator handoff safer by replacing shell-state dependent
`source` steps with an explicit ignored env file:

```text
REMOTE_ASSIGNMENT_ENV_FILE
```

P130 makes sure that the loop router, operator intake packet and env-file
loader documentation all give the same command sequence. This prevents an older
legacy apply flag, tracked template path, or partial dry-run command from
reappearing in the next-goal artifact.

P130 does not deploy anything. It does not write
`deploy/runtime-production/remote-assignment.local.json`, does not create
remote services, does not set GitHub variables, does not store provider
credentials and does not promote live runtime. P132 follows P131 by verifying
that this P130 artifact points at current-head P119 readiness and P121 ledger
evidence.

## Required Command Sequence

When P121 selects `operator-assignment-evidence-intake`, the public handoff
sequence must be:

```bash
cp deploy/runtime-production/remote-assignment.env.example \
  deploy/runtime-production/remote-assignment.env.local
# Fill the ignored local env file with non-secret operator evidence.
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

The same normalized commands must appear in:

- `docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md`
- P118 generated strict-run artifacts
- P119 generated operator readiness artifacts
- `scripts/check-remote-assignment-strict-run-package.mjs`
- `scripts/check-remote-operator-readiness-packet.mjs`
- `scripts/check-loop-next-goal-ledger.mjs`
- P121 generated JSON/Markdown artifacts
- `docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md`
- `docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md`
- `docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md`

## Command

```bash
npm run check:operator-assignment-loop-command-consistency
```

P131 then validates that the P130 JSON proof is uploaded by Pages and
download-checked as current-run release evidence:

```bash
npm run check:operator-assignment-loop-command-consistency-artifact
```

P132 then validates current-head coherence:

```bash
npm run check:operator-assignment-current-head-coherence
```

## Acceptance

1. `package.json` exposes `check:operator-assignment-loop-command-consistency`.
2. Root `npm run test` runs P130 after P129, then P131, P132 and P133 before dependency audit.
3. P121 generated artifacts include the env-file strict dry-run command.
4. P121 generated artifacts include the env-file apply command with
   `REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true`.
5. P118/P119 operator packets, P121, P123 and P129 docs use the same command
   sequence.
6. The old apply-env flag command is absent from P118/P121/P123/P129 docs and
   relevant checker scripts.
7. P130 artifact remains redacted and contains no service ids, origins,
   provider credentials, prompt plumbing, private reference material, profile
   ids, kernel ids or `sourceRefs`.
8. P131 validates the uploaded P130 artifact content in the current Pages run.
9. P132 validates that P130 points at current-head P119 and P121 artifacts.

## Failure Modes

- If P121 still emits the old apply flag, P130 fails before dependency audit.
- If P123 handoff docs drift away from P121 artifacts, P130 fails.
- If P129 operator instructions point at the tracked `.env.example` as runtime
  input, P130 fails.
- If a future script reintroduces the old apply command, P130 fails.
