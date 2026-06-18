# P69 Remote Runtime Host Target Gate

Date: 2026-06-18

## Goal

P69 turns the remote runtime hosting choice into a machine-checkable deployment
target package. It does not claim that remote origins are already provisioned.
It decides the deployment shape that P66 must later verify.

Command:

```bash
npm run check:remote-host-target
```

## Decision

The preferred first live-preview target is:

```text
docker-compatible-two-service-paas
```

This means:

- FastAPI and Agent Runtime remain separate services.
- Both services are built from the checked-in Dockerfiles.
- The host platform gives each service a remote HTTPS origin.
- Secrets stay in the hosting provider secret store:
  `provider_secret_store_only`.
- GitHub Pages receives only public `VITE_*` origin variables.
- Agent Runtime never connects directly to the database.

## Source Of Truth

```text
deploy/runtime-production/host-profiles.json
```

The file defines:

- the default host target,
- allowed deployment profiles,
- API and Agent service boundaries,
- required runtime variables,
- secret-only variables,
- public Pages variables,
- activation order.

## Relationship To P66

P69 answers:

```text
Where and how should the two runtime services be hosted?
```

P66 answers:

```text
Are the chosen remote HTTPS origins and Pages variables actually ready?
```

So the order is:

1. Run `check:remote-host-target`.
2. Run `check:remote-deploy-manifest`.
3. Provision the selected host target.
4. Run `check:remote-origin-provisioning`.
5. Run `audit:live-runtime-readiness`.
6. Run `qa:live-runtime-browser`.

## Secret Boundary

The following variables are provider-secret-store only:

- `NARRATIVEOS_TOOL_BRIDGE_TOKEN`
- `MASTRA_TOOL_BRIDGE_TOKEN`
- `DATABASE_URL`
- future model provider API keys

They must not be committed and must not be GitHub Pages variables.

GitHub Pages may only receive:

- `VITE_PUBLIC_RUNTIME_MODE`
- `VITE_API_ORIGIN`
- `VITE_AGENT_RUNTIME_BASE_URL`
- optional `VITE_API_BASE_URL`
- forced false `VITE_ALLOW_LOCAL_CREATOR_FALLBACK`

## Acceptance

1. `deploy/runtime-production/host-profiles.json` exists.
2. The default target is `docker-compatible-two-service-paas`.
3. Every profile defines separate API and Agent services.
4. API uses `deploy/api/Dockerfile`, port `8787`, and `/health`.
5. Agent uses `deploy/agent-runtime/Dockerfile`, port `4111`, and `/health`.
6. API secret env contains `NARRATIVEOS_TOOL_BRIDGE_TOKEN`.
7. Agent secret env contains `MASTRA_TOOL_BRIDGE_TOKEN`.
8. No profile exposes service secrets as public env.
9. Activation order feeds P66 Remote Runtime Origin Provisioning Gate.
10. Root `npm run test` includes `check:remote-host-target`.
