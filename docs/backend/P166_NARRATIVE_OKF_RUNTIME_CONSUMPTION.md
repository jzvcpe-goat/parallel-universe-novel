# P166 Narrative OKF Runtime Consumption

Status: active contract gate  
Boundary: internal agent-runtime knowledge consumption, no public projection leak  
Owner: product architecture + agent runtime  
Date: 2026-06-25

## Purpose

P165 made the Narrative OKF cards machine-checkable. P166 makes them
runtime-consumable without turning them into a second rules engine.

The agent runtime may load the cards as internal guidance for orchestration and
workflow behavior. `genre-runtime-rules.v1.json` remains the runtime rule truth,
and FastAPI remains the business fact owner. OKF cards cannot write canon,
cannot bypass Tool Bridge, and cannot expose private reference material.

## Command

```bash
npm run check:narrative-okf-runtime-consumption
```

## Runtime Contract

P166 adds a read-only OKF loader in `packages/agent-runtime/src/okf.ts`.

The loader may expose:

- card ids;
- card titles;
- runtime boundary labels;
- internal card bodies inside the agent runtime process.

The public runtime summary may expose only:

- version;
- card count;
- card ids;
- public projection and representative-work privacy flags.

Public Creator Studio and Reader responses must not expose card bodies,
`source_authority`, representative work names, source mappings, provider prompt
plumbing, profile ids, kernel ids or raw runtime state.

## Checks

P166 verifies that:

1. `package.json` exposes `check:narrative-okf-runtime-consumption`.
2. Root `npm run test` runs P166 after P165 and before runtime artifact checks.
3. The agent runtime builds with `okf.ts`.
4. The loader reads exactly the seven active OKF cards.
5. `socraticCreateWorkflow` carries an internal `okfKnowledge` summary.
6. Public projection omits `okfKnowledge`, card bodies and source authority.
7. `agentRuntimeMeta.narrativeOkf` exposes only a safe summary.
8. Release sync includes the P166 doc, gate and runtime loader.

## Non-Goals

P166 does not:

- change ConstraintProfile or GenreKernel selection;
- make OKF cards the runtime truth;
- create new provider prompts;
- expose internal card bodies to users;
- create or configure remote services;
- promote candidate story text to canon.

## Acceptance

1. `npm run check:narrative-okf-runtime-consumption` passes.
2. `npm --workspace @narrativeos/agent-runtime test` passes.
3. `npm run test` passes.
4. Public projection and reference privacy gates still pass.
5. The selected live blocker remains external managed Data API/operator
   evidence, not missing OKF runtime consumption.
