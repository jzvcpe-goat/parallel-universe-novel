# P137 Loop Next Goal Local Rehydration

Status: active helper  
Boundary: local loop preparation, ignored assignment draft refresh  
Owner: release engineering  
Date: 2026-06-20

## Purpose

P121 correctly refuses to select the next goal from stale P113/P119/P120
artifacts after a new release head is committed. That strictness is needed:
otherwise the loop can accidentally route a new release from old runtime image
or operator-return evidence.

P137 adds a local-only helper for the common follow-on case: after a release
commit lands, the operator wants to continue the loop immediately, but local
runtime artifacts or the ignored assignment draft still point at the previous
head. The helper refreshes the current-head evidence chain, runs P121, and then
runs P122 so the selected next goal can execute without stale fixture-isolation
evidence.

## Command

```bash
npm run prepare:loop-next-goal-local
```

After the helper succeeds, execute the selected next goal directly. Do not run
P121 again between the helper and P123 unless P122 is rerun afterwards; a fresh
P121 artifact intentionally makes the previous P122 fixture-isolation artifact
stale.

## What It Runs

The helper uses existing gates instead of inventing a second routing path:

- P4 document core and deprecated-case checks.
- public projection, backward consistency and reference privacy checks.
- runtime completion refresh.
- current runtime image publish evidence.
- `prepare:remote-assignment-local` with `REMOTE_ASSIGNMENT_DRAFT_FORCE=true`.
- P85/P90 blocker evidence.
- P105/P106 fill-plan evidence.
- P117/P116 dry-run and apply-check evidence.
- P146 edge-only runtime intent env template evidence.
- P113 current-head image drift.
- P118/P119/P120 operator handoff and return evidence.
- P107 artifact coverage.
- P121 loop next-goal ledger.
- P122 operator-return fixture isolation for the same current P120/P121
  evidence chain.

## Boundary

P137 is intentionally not part of root `npm run test` because it can refresh
`deploy/runtime-production/remote-assignment.local.json`, which is an ignored
local operator file. It must not run in CI unless explicitly allowed for a
temporary diagnostic run.

P137 does not:

- create remote services;
- set GitHub variables;
- store provider credentials;
- promote live runtime;
- weaken P121/P132 current-head coherence;
- expose representative work names, `sourceRefs`, profile ids, kernel ids,
  provider prompt plumbing or secrets.

## Acceptance

1. `package.json` exposes `prepare:loop-next-goal-local`.
2. Root `npm run test` does not run `prepare:loop-next-goal-local`.
3. The helper emits `loop-next-goal-local-rehydration-*.json`.
4. The helper runs P121 after refreshing current-head P113/P119/P120 evidence.
5. The helper runs P122 after P121 so P123 can immediately consume the current
   fixture-isolation artifact.
6. The helper may update only ignored local assignment state; tracked files
   must remain unchanged unless the developer is actively editing code.
7. If P121 or P122 fails after this helper, the failure is a real evidence or
   policy disagreement rather than missing local artifacts.
8. If an operator manually reruns P121 after this helper, they must rerun P122
   before P123; P123 must reject a P122 artifact that references an older P121.
