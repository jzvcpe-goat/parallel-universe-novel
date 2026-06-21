# P130 Operator Assignment Loop Command Consistency

Status: active gate  
Boundary: operator assignment handoff command consistency, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P138 changed the current production unblock from a full-remote API plus Agent
Runtime assignment into an `edge-only` runtime assignment compiler flow. The
reader frontend and managed data API are cloud-hosted; AI writing/generation
stays on the user-owned edge device.

P130 makes sure that the loop router and operator intake packet both publish
that same P140 -> P138 command sequence. This prevents an older legacy apply flag,
tracked template path, or full-remote Agent Runtime command from reappearing as
the primary next-goal artifact. P128/P129 still cover the legacy full-remote
env/apply path, but that path is fallback compatibility only.

P130 does not deploy anything. It does not write
`deploy/runtime-production/remote-assignment.local.json`, does not create
remote services, does not set GitHub variables, does not store provider
credentials and does not promote live runtime. P132 follows P131 by verifying
that this P130 artifact points at current-head P119 readiness and P121 ledger
evidence.

## Required Command Sequence

When P121 selects `operator-assignment-evidence-intake`, the public handoff
sequence must prepare the ignored intent first, verify local health-input
hygiene, then run the edge-only compiler:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
```

```bash
npm run prepare:runtime-assignment-intent-env-local
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
npm run prepare:edge-only-data-api-strict-intake
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

The same normalized commands must appear in:

- `scripts/check-loop-next-goal-ledger.mjs`
- P121 generated JSON/Markdown artifacts
- `docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md`
- `docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md`
- `scripts/check-operator-assignment-evidence-intake.mjs`
- `docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md`

The legacy full-remote env/apply sequence may remain documented in P128/P129,
P116/P117 and older strict-run material, but it must not be the selected P121
acceptance-gate sequence for edge-only launch.

Legacy full-remote compatibility still uses `REMOTE_ASSIGNMENT_ENV_FILE` to
load `deploy/runtime-production/remote-assignment.env.local` into P117/P116.
That loader is retained for fallback validation only; it is not the edge-only
selected goal.

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
3. P121 generated artifacts include `remote-assignment:prepare`.
4. P121 generated artifacts include `prepare:runtime-assignment-intent`.
5. P121 generated artifacts include `check:edge-only-data-api-local-secret-guard`.
6. P121 generated artifacts include `remote-health:check`.
7. P121 generated artifacts include `prepare:edge-only-data-api-strict-intake`.
8. P121 and P123 docs/scripts use the same edge-only command sequence.
9. The old apply-env flag command is absent from P118/P121/P123/P129 docs and
   relevant checker scripts as a primary command.
10. P130 artifact remains redacted and contains no service ids, origins,
   provider credentials, prompt plumbing, private reference material, profile
   ids, kernel ids or `sourceRefs`.
11. P131 validates the uploaded P130 artifact content in the current Pages run.
12. P132 validates that P130 points at current-head P119 and P121 artifacts.

## Failure Modes

- If P121 still emits the old apply flag, P130 fails before dependency audit.
- If P123 handoff docs drift away from P121 artifacts, P130 fails.
- If P121 stops routing assignment intake through P138
  `remote-assignment:prepare`, P130 fails.
- If a future script reintroduces the old apply flag as the selected primary
  command, P130 fails.
