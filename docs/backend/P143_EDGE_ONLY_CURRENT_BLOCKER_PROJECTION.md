# P143 Edge-Only Current Blocker Projection

Status: active local consistency gate  
Boundary: current edge-only blocker projection only  
Owner: release engineering  
Date: 2026-06-20

## Purpose

P143 prevents the current P142 edge-only launch path from drifting back into
legacy full-remote Agent requirements. P141/P142 made the managed Data API the
only production evidence still missing for the zero-cost Reader cloud path. The
legacy full-remote assignment files and fixtures still exist for compatibility,
but they must not decide the current blocker ledger.

This gate does not provision infrastructure, fill operator evidence, promote
live runtime, or rewrite P73/P66/P23. It only checks the public projection of
the current blockers after P76 and P85 have run.

## Command

```bash
npm run check:edge-only-current-blocker-projection
```

## What It Checks

1. The selected P75 assignment intake is the edge-only runtime intent or
   generated edge-only contract.
2. P76 no longer reports remote Agent blocked stages when current P75 proves
   edge-only topology.
3. P85 selects the current edge-only assignment evidence, not a fixture or
   legacy full-remote draft.
4. P85 exposes Data API blockers:
   - `data-api-service-id`
   - `data-api-origin`
   - `data-api-secrets-ready`
   - `data-api-health-ready`
5. P85 does not ask for `REMOTE_AGENT_*` variables, remote Agent health, remote
   Agent origin, or remote Agent service proof in the current edge-only ledger.

## Compatibility Boundary

P143 deliberately does not delete or reinterpret these older flows:

- `deploy/runtime-production/remote-assignment.local.json`
- `deploy/runtime-production/remote-assignment.fixture.json`
- P79 remote assignment execution pack
- P81 fixture contract
- P91 legacy assignment schema

Those gates may still prove the historical full-remote path. They just cannot
override the current P142 edge-only blocker projection.

## Acceptance

- `package.json` exposes `check:edge-only-current-blocker-projection`.
- Root `npm run test` runs P143 after P85/P90/P96 and the existing P105/P106
  fill-plan pair, so it does not interrupt the historical release-gate order.
- P143 writes `artifacts/runtime/edge-only-current-blocker-projection-*.json`.
- P143 fails if P76 or P85 reintroduces remote Agent blocker ids, required
  inputs, or `REMOTE_AGENT_*` variable requirements into the current edge-only
  projection.
- P143 passes while P142 is still incomplete, as long as the remaining blockers
  are Data API / public runtime evidence blockers.
