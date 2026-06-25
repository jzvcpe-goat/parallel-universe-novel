# P167 OKF Runtime Image Context

Status: active contract gate  
Boundary: Agent Runtime Docker image context for internal OKF cards  
Owner: product architecture + runtime packaging  
Date: 2026-06-25

## Purpose

P165 made Narrative OKF cards machine-checkable. P166 made them consumable by
the Agent Runtime. P167 closes the deployment gap: the Agent Runtime container
must carry the same internal OKF knowledge cards that local development uses.

This is not a new public surface. The OKF cards remain internal
agent-readable guidance, and public projection still hides card bodies,
source authority, representative work names and provider prompt plumbing.

## Command

```bash
npm run check:okf-runtime-image-context
```

## Runtime Packaging Contract

`deploy/agent-runtime/Dockerfile` must copy:

```dockerfile
COPY docs/product/knowledge/narrative-okf /app/docs/product/knowledge/narrative-okf
```

The image already copies `docs/product/rules`; P167 adds the OKF knowledge
directory because `packages/agent-runtime/src/okf.ts` loads the cards at
process startup.

## Checks

P167 verifies that:

1. The Agent Runtime Dockerfile copies the Narrative OKF card directory.
2. `check:runtime-preview-compose` and deployment readiness gates assert that
   copy.
3. Root `npm run test` runs P167 after P166 and before runtime artifact checks.
4. The release sync manifest keeps the Dockerfile, P167 doc and P167 gate in
   source/release parity.
5. The generated artifact does not contain card body text, representative work
   names, source mappings, provider prompts or secrets.

## Non-Goals

P167 does not:

- change `genre-runtime-rules.v1.json`;
- make OKF cards the runtime truth;
- expose OKF card bodies to Creator Studio or Reader Web;
- copy the encrypted reference vault key into the image;
- create remote services;
- write canon.

## Acceptance

1. `npm run check:okf-runtime-image-context` passes.
2. `npm run check:runtime-preview-compose` passes.
3. Runtime Images publish for the current head.
4. Pages deploy reaches a successful run for the current head.
5. Public projection and reference privacy gates remain green.
