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
evidence required before the loop can move to remote health. P124 then validates
the uploaded P123 artifact content in the same Pages run. P125 then validates
the P117 env dry-run validator with a positive strict fixture and negative
fixtures before real operator evidence is applied. P126 then validates the P116
apply helper with a temporary fixture target so the write path is also proved
without touching the production ignored assignment.

## Command

```bash
npm run check:loop-next-goal-ledger
```

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

1. operator-filled assignment evidence exists outside Git-tracked files;
2. API and Agent Runtime HTTPS origins are present;
3. provider-side secret-store confirmations are true;
4. both `/health` endpoints are reachable;
5. P75 can reach `remote_assignment_ready`;
6. P73/P66/P23/P65/P76/P78 strict gates can be run without relying on fixtures;
7. public Pages remains privacy-clean and no internal model or rule identifiers
   leak to Reader or Creator UI.

## Acceptance

1. `package.json` exposes `check:loop-next-goal-ledger`.
2. Root `npm run test` runs P121 after P120 and CI artifact content coverage,
   then P122, P123, P124, P125 and P126 before dependency audit.
3. P121 emits JSON and Markdown artifacts.
4. P121 selects the next goal from current evidence, not hardcoded wishful
   thinking.
5. P121 preserves no-duplicate-work guardrails: do not merge another frontend,
   do not rewrite P4 constraints, do not vendor an alternate agent framework,
   do not create remote services from CI, and do not promote live runtime.
6. The artifact names the remaining blocker class without exposing secrets,
   private title lists or prompt plumbing.
