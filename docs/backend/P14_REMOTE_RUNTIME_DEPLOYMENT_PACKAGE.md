# P14 Remote Runtime Deployment Package

## Goal

把 Creator Studio 的远端运行能力拆成两个可部署服务：

- FastAPI business runtime: 事实主权、Tool Bridge、状态预览、质量检查、后续持久化边界。
- Agent Runtime: Mastra-compatible workflow 编排、运行账本、候选正文生成、苏格拉底式追问。

本轮不绑定单一云厂商，不接生产数据库，不把 Agent Runtime 直接连数据库。

## Deployable Units

Production origin checklist:

- `deploy/runtime-production/host-profiles.json`
- `deploy/runtime-production/service-manifest.json`
- `deploy/runtime-production/origin.env.example`
- `npm run check:remote-host-target`
- `npm run check:remote-deploy-manifest`
- `npm run check:runtime-image-workflow`
- `npm run check:remote-origin-provisioning`

Published runtime images are owned by P71:

- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:runtime-latest`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:runtime-latest`

### FastAPI API

File: `deploy/api/Dockerfile`

Run shape:

```bash
docker build -t parallel-universe-api -f deploy/api/Dockerfile .
docker run --rm -p 8787:8787 \
  -e NARRATIVEOS_DEPLOY_ENV=production \
  -e DATABASE_URL=sqlite:////tmp/narrativeos_preview.db \
  -e NARRATIVEOS_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io \
  -e NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret> \
  parallel-universe-api
```

Health:

```bash
curl https://<api-host>/health
```

### Agent Runtime

File: `deploy/agent-runtime/Dockerfile`

The Agent Runtime image carries the internal Narrative OKF knowledge cards
under `docs/product/knowledge/narrative-okf`. They are agent-readable runtime
guidance only; public projection must still hide card bodies, source authority,
representative work names and provider prompt plumbing.

Run shape:

```bash
docker build -t parallel-universe-agent-runtime -f deploy/agent-runtime/Dockerfile .
docker run --rm -p 4111:4111 \
  -e NARRATIVEOS_DEPLOY_ENV=production \
  -e NODE_ENV=production \
  -e MASTRA_HOST=0.0.0.0 \
  -e MASTRA_PORT=4111 \
  -e MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host> \
  -e MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret> \
  -e MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io \
  parallel-universe-agent-runtime
```

Health:

```bash
curl https://<agent-host>/health
```

### Local Two-Service Preview

File: `deploy/runtime-preview/docker-compose.yml`

```bash
docker compose -f deploy/runtime-preview/docker-compose.yml up --build
```

Expected endpoints:

- `http://127.0.0.1:8787/health`
- `http://127.0.0.1:4111/health`

If those host ports are occupied, the preview compose supports:

```bash
RUNTIME_PREVIEW_API_PORT=18787 \
RUNTIME_PREVIEW_AGENT_PORT=14111 \
docker compose -f deploy/runtime-preview/docker-compose.yml up --build
```

Machine gate:

```bash
npm run check:runtime-preview-compose
```

That gate builds both containers, verifies API/Agent health and requires one
candidate-only creator workflow to pass through FastAPI Tool Bridge.

## Frontend Live Build

After both remote services are healthy:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_API_ORIGIN=https://<api-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-runtime-preview
```

Then build:

```bash
VITE_ROUTER_MODE=hash \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_API_ORIGIN=https://<api-host> \
npm --prefix app run build
cp app/dist/index.html app/dist/404.html
```

## Required Public Contract

1. `GET /health` passes for both API and Agent Runtime.
2. API CORS allows `https://jzvcpe-goat.github.io`.
3. Agent Runtime binds `0.0.0.0` in deploy environments and keeps `127.0.0.1` only as local default.
4. Agent Runtime uses `MASTRA_TOOL_BRIDGE_BASE_URL` to call FastAPI Tool Bridge; `FASTAPI_TOOL_BRIDGE_BASE_URL` is legacy compatibility only.
5. FastAPI Tool Bridge requires `Authorization: Bearer <shared-tool-bridge-secret>` and `Idempotency-Key`.
6. Protected deploy envs such as `production`, `live`, `staging`, `preview`, and `remote` reject the local `dev-local-token` default.
7. `NARRATIVEOS_TOOL_BRIDGE_TOKEN` and `MASTRA_TOOL_BRIDGE_TOKEN` must be the same non-default secret in the same environment.
8. Protected Agent Runtime deploys fail closed when FastAPI Tool Bridge is unreachable; they must not return local candidate drafts as if the backend accepted them.
9. Agent Runtime CORS is restricted with `MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io` for public preview.
10. Creator public build uses `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`.
11. AI outputs remain `candidate`; no canon write is performed by the public creator chain.
12. Any future persistent write must pass through FastAPI Tool Bridge with service-token auth and `Idempotency-Key`.

## Verification

```bash
npm run check:runtime-deploy-readiness
npm run check:runtime-preview-compose
npm run check:runtime-image-workflow
npm run check:remote-origin-provisioning
npm run check:public-runtime-preview
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

After remote URLs exist:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run qa:live-runtime-browser
```

## Next Breakpoint

P69 Remote Runtime Host Target Gate now owns the host-shape decision. Run:

```bash
npm run check:remote-host-target
```

Then pick/provision the actual remote host and secrets strategy from
`deploy/runtime-production/host-profiles.json`, and use
`deploy/runtime-production/service-manifest.json` as the concrete two-service
deployment contract. Validate it with:

```bash
npm run check:remote-deploy-manifest
```

Publish the runtime images before asking the remote host to pull them:

```bash
npm run check:runtime-image-workflow
gh workflow run "Publish Runtime Images" --repo jzvcpe-goat/parallel-universe-novel
```

Once host URLs exist, update GitHub Actions Pages build from:

```yaml
VITE_PUBLIC_RUNTIME_MODE: disabled
```

to:

```yaml
VITE_PUBLIC_RUNTIME_MODE: live
VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}
VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}
```
