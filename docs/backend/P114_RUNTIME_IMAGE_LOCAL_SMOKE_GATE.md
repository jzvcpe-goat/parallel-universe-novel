# P114 Runtime Image Local Smoke Gate

Status: active gate  
Boundary: Remote Runtime Image Execution Boundary  
Date: 2026-06-19

## Goal

P72 proves the current commit published API and Agent Runtime images to GHCR.
P113 proves the ignored local assignment draft points at those current images.
P114 adds one more deployment proof: when the images are available locally, run
the exact GHCR images as a two-service stack and prove:

- FastAPI `/health` returns ok or healthy;
- Agent Runtime `/health` returns ok or healthy;
- Agent Runtime can call FastAPI through the Tool Bridge;
- one Socratic creator workflow returns a candidate draft and at most two
  questions;
- the smoke artifact contains only public image refs and summarized health /
  workflow metadata.

This gate does not create remote services, set provider secrets, write GitHub
runtime variables, enable public live runtime mode or write canon.

## Command

Default wiring / opportunistic local smoke:

```bash
npm run check:runtime-image-local-smoke
```

Strict release-operator smoke:

```bash
REQUIRE_RUNTIME_IMAGE_LOCAL_SMOKE=true RUNTIME_IMAGE_LOCAL_SMOKE_PULL=true npm run check:runtime-image-local-smoke
```

## Contract

The gate validates:

1. `package.json` exposes `check:runtime-image-local-smoke`.
2. Root `npm run test` includes `check:runtime-image-local-smoke`.
3. Current-head P72 runtime image evidence exists.
4. The current API and Agent Runtime GHCR image refs can be read from P72.
5. Source workspace without git passes only as `source_workspace_no_git`.
6. If Docker is unavailable, default mode records `docker_daemon_unavailable`
   and strict mode fails.
7. If images are not local, default mode records `images_not_local` and strict
   mode pulls them.
8. If registry access fails, default mode records
   `container_registry_unavailable` and strict mode fails.
9. If both images are available, the gate runs the real images, probes health,
   executes one candidate-only workflow, and removes containers/network after
   the run.

## Why P68 Is Not Enough

P68 builds from local Dockerfiles. That is useful for deploy package coverage,
but it can fail on Docker Hub base-image metadata even when GHCR images are
already built and published. P114 tests the exact published GHCR images that a
remote provider will deploy.

## Public Boundary

P114 artifacts may include:

- current commit hash;
- public GHCR image refs;
- ephemeral local host ports;
- summarized health statuses;
- candidate draft length and question count.

P114 artifacts must not include database URLs, Tool Bridge token values, model
keys, provider API tokens, private keys, system prompts, raw runtime state,
candidate body text, `sourceRefs`, `profile.id`, `kernel.id`, plaintext
reference works or reference-vault material.

## Acceptance

1. `npm run check:runtime-image-local-smoke` passes or skips with a declared
   non-strict reason.
2. Strict mode passes whenever Docker and GHCR access are available.
3. Strict mode fails when the current GHCR images cannot be pulled or run.
4. Root `npm run test` includes P114 without making static preview CI depend on
   live registry availability.
5. P115 uploads and content-checks the P114 artifact as
   `runtime-image-local-smoke` in the Pages evidence chain.
6. P114 is synced to the source workspace and documented in development notes.
