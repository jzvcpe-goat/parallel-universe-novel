# P121 Loop Next Goal Ledger

Status: active gate  
Boundary: engineering loop routing, no deployment side effects  
Owner: release engineering  
Date: 2026-06-19

## Purpose

P121 turns the current evidence chain into a machine-readable next goal. It is
not another remote-runtime implementation path. It reads the already validated
P4, privacy, reference-vault, P85 blocker, P119/P120 operator-handoff and
runtime completion artifacts, then outputs the next concrete engineering goal
and the guardrails that prevent duplicate work.

The intent is to keep the loop honest after a gate passes:

- if public privacy or P4 consistency regresses, repair that first;
- if operator return evidence is still waiting for assignment, the next goal is
  the P138 edge-only runtime assignment compiler intake, not the older
  full-remote Agent Runtime env-apply path;
- if operator return evidence is still waiting for remote health, the next goal
  is remote health evidence intake;
- if remote health and assignment are ready, the next goal is strict activation
  proof;
- if live runtime is already proven, the next goal moves to paid launch/legal
  readiness and learned-eval strict ownership.

P121 does not create services, does not write
`deploy/runtime-production/remote-assignment.local.json`, does not set GitHub
variables, does not store credentials, does not promote live runtime, and does
not edit rule/kernel content.

P121 is immediately followed by P122, which checks that the P120 evidence used
to select the next goal came from the ignored local operator assignment and not
from the no-secret fixture path.

When the selected goal is `operator-assignment-evidence-intake`, P122 is
followed by P123, which packages the exact non-secret operator assignment
evidence required by the P138 `edge-only` runtime assignment compiler. P124
then validates the uploaded P123 artifact content in the same Pages run. P147
packages the edge-only operator evidence request, and P148 proves the returned
Data API evidence transition in a fixture without claiming production
readiness. P128 and P129 remain as legacy full-remote env/apply compatibility
gates; they are not the current edge-only unblock. P130 then verifies that P121
and P123 publish the same P138 compiler command sequence and that the legacy
apply flag cannot return as the primary route. P131 then validates the uploaded
P130 artifact content in the same Pages run. P132 then verifies that P119, P120,
P121, P123, P130 and P131 all point at the same current head. P133 still keeps
the legacy transition fixture covered so older full-remote workflows remain
mechanically safe, but it is not allowed to override the P138 edge-only selected
goal.

## Command

```bash
npm run check:loop-next-goal-ledger
```

If a new release head was just committed and local artifacts still point at an
older head, refresh the local loop evidence first:

```bash
npm run prepare:loop-next-goal-local
```

That helper may refresh the ignored local assignment draft, so it is local-only
and not part of root `npm run test`. It also runs P122 after P121, so the
selected goal can immediately consume current fixture-isolation evidence instead
of failing on a stale P122 artifact.

If the operator wants to both rehydrate local evidence and run the current
assignment-intake tail, use:

```bash
npm run prepare:loop-next-goal-local-tail
```

That sealed local command runs P137 and then P123/P124/P147/P147 artifact in
order. It exists specifically to avoid rerunning P121 between P137 and P123.

## Inputs

P121 reads the latest local evidence from:

- P4 document core
- P4 deprecated case logic
- public projection privacy
- backward consistency sweep
- reference privacy
- P85 remote runtime blocker ledger
- P119 remote operator readiness packet
- P120 remote operator return intake
- P113 remote assignment image drift for the current head
- runtime completion refresh

## Output

P121 emits:

- `artifacts/runtime/loop-next-goal-ledger-*.json`
- `artifacts/runtime/loop-next-goal-ledger-*.md`

The artifacts are safe for project handoff. They include the selected next goal,
why it was selected, explicit non-goals, acceptance gates and commands. They
must not expose private title lists, runtime internals, provider prompt
plumbing, profile ids, kernel ids, source reference pointers, secrets or
candidate prose.

## Current Expected Next Goal

When P120 reports `operator_return_waiting_for_health`, P121 must select:

`remote-health-evidence-intake`

When P120 reports `operator_return_waiting_for_assignment`, P121 must select:

`operator-assignment-evidence-intake`

Completion criteria for that goal:

1. P140 prepares the P138 intent outside Git-tracked files at
   `deploy/runtime-production/runtime-assignment.intent.local.json`;
2. `npm run remote-assignment:prepare` compiles the ignored local intent into
   generated contract, legacy env, handoff evidence, ledger patch and remote
   health request artifacts;
3. `npm run check:edge-only-data-api-evidence-readiness` diagnoses whether the
   remaining local Data API evidence gap is service id, origin, configuration
   or health proof before the compiler path continues;
4. `npm run check:remote-runtime-assignment-intake` accepts the generated
   `edge-only` contract without requiring a fake Agent Runtime service;
5. `npm run remote-health:check` verifies the reader/data edge contract rather
   than a full remote AI generation service;
6. `npm run check:remote-operator-return-intake` moves the loop toward health
   evidence;
7. `npm run check:loop-next-goal-ledger` stops selecting assignment intake
   after complete edge-only evidence is present;
8. frontend HTTPS origin is inferred from the current GitHub Pages repository
   unless explicitly overridden;
9. managed data API service id, HTTPS origin, publishable/RLS configuration and
   `health_probe` evidence are confirmed by the operator;
10. remote Agent Runtime absence is explicit: AI generation stays on the
   user-owned edge device and the reader cannot trigger cloud AI generation;
11. P75 can reach `remote_assignment_ready` for the `edge-only` contract;
12. P148 proves that returned Data API evidence can move P75 from pending
    health to ready only inside a cleaned-up fixture;
13. P73/P66/P23/P65/P76/P78 strict gates can run without relying on fixtures;
14. public Pages remains privacy-clean and no internal model or rule identifiers
   leak to Reader or Creator UI.

Current edge-only command sequence:

```bash
npm run prepare:runtime-assignment-intent-env-local
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard
npm run check:edge-only-data-api-evidence-readiness
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

## Acceptance

1. `package.json` exposes `check:loop-next-goal-ledger`.
2. Root `npm run test` runs P121 after P120 and CI artifact content coverage,
   then P122, P123, P124, P147, P148, P125, P126, P128, P129, P130, P131, P132
   and P133 before dependency audit.
3. P121 emits JSON and Markdown artifacts.
4. P121 selects the next goal from current-head P119/P120/P113 evidence, not
   hardcoded wishful thinking or stale operator packets.
5. P121 preserves no-duplicate-work guardrails: do not merge another frontend,
   do not rewrite P4 constraints, do not vendor an alternate agent framework,
   do not create remote services from CI, and do not promote live runtime.
6. The artifact names the remaining blocker class without exposing secrets,
   private title lists or prompt plumbing.
