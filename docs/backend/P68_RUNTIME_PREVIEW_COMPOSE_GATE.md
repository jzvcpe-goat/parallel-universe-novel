# P68 Runtime Preview Compose Gate

Date: 2026-06-18

## Goal

P68 closes the gap between local process smoke tests and a deployable runtime
shape. It proves the FastAPI runtime and Agent Runtime can boot as two
containers from the checked-in deployment package, pass health checks, and run
one candidate-only Socratic creation turn through the FastAPI Tool Bridge.

Command:

```bash
npm run check:runtime-preview-compose
```

## Decision

The successful decision is:

- `runtime_preview_compose_passed`: Docker Compose built and started both
  services, API health passed, Agent Runtime health passed, and Agent Runtime
  accepted one creator workflow through FastAPI Tool Bridge.

The non-success decision is:

- `runtime_preview_compose_not_executed`: Docker is unavailable or the check was
  explicitly skipped. The artifact reason may also be
  `container_registry_unavailable` when Docker Hub or the configured container
  registry cannot be reached. In strict mode any non-success result is a
  failure.

Strict mode:

```bash
REQUIRE_RUNTIME_PREVIEW_COMPOSE=true npm run check:runtime-preview-compose
```

## Runtime Shape

P68 uses `deploy/runtime-preview/docker-compose.yml`.

Container ports stay stable:

- FastAPI container: `8787`
- Agent Runtime container: `4111`

Host ports are configurable so local developer ports do not collide:

```bash
RUNTIME_PREVIEW_API_PORT=18787 \
RUNTIME_PREVIEW_AGENT_PORT=14111 \
npm run check:runtime-preview-compose
```

## Assertions

The gate verifies:

1. `deploy/api/Dockerfile` builds a FastAPI runtime with
   `NARRATIVEOS_DEPLOY_ENV=production`, copies `docs/product/rules`, and binds
   `0.0.0.0:8787`.
2. `deploy/agent-runtime/Dockerfile` builds the Agent Runtime with
   `NARRATIVEOS_DEPLOY_ENV=production`, `NODE_ENV=production`, copies
   `docs/product/rules`, copies `docs/product/knowledge/narrative-okf`, and
   binds `0.0.0.0:4111`.
3. `deploy/runtime-preview/docker-compose.yml` wires Agent Runtime to FastAPI
   through `MASTRA_TOOL_BRIDGE_BASE_URL=http://api:8787`.
4. Both services expose healthy `/health` endpoints after container startup.
5. `POST /v1/workflows/socratic-create` returns a readable `candidate` draft.
6. The workflow run trace includes a successful FastAPI Tool Bridge turn.
7. Candidate creation remains candidate-only; no canon or branch write is
   accepted by this gate.

## Artifact Boundary

The generated artifact may include:

- service names,
- host ports,
- health status,
- candidate draft length,
- question count,
- whether Tool Bridge accepted the turn.

It must not include:

- candidate prose body,
- provider secrets,
- database URLs,
- Tool Bridge token values,
- system prompts,
- raw runtime state,
- private reference vault names or mappings.

## Relationship To Remote Gates

P68 does not replace remote hosting. It sits before P66/P65:

- P68 proves the deployment package can run as containers locally.
- P66 proves public HTTPS origins and GitHub Pages variables are provisioned.
- P65 proves the public Pages app may claim a remote live runtime trace.

Until P66 reaches `ready_for_public_live_runtime`, public GitHub Pages should
remain in non-live runtime mode.

## Acceptance

1. `package.json` exposes `check:runtime-preview-compose`.
2. Root `npm run test` includes `check:runtime-preview-compose`.
3. Docker Compose smoke writes a privacy-safe artifact under
   `artifacts/runtime/`.
4. API and Agent Runtime health both pass.
5. Agent Runtime workflow returns candidate prose through FastAPI Tool Bridge.
6. GitHub Actions runs the gate before Pages build.
