# P20 Remote Runtime Activation Runbook

Date: 2026-06-17

## Goal

把公开 Creator Studio 从静态预览推进到 live runtime。P20 不伪装远端服务已经接好；它定义部署方需要完成的 API、Agent Runtime、CORS、GitHub repository variables、live smoke、回滚和验收证据。

Current state from P19:

- GitHub Pages deploys successfully.
- Repository variables are not configured for live runtime.
- Public site is therefore `VITE_PUBLIC_RUNTIME_MODE=disabled`.
- Public `/create` must show “创作服务待连接” until this runbook is completed.

## Service Ownership

| Surface | Owner | Public URL Requirement | Responsibility |
| --- | --- | --- | --- |
| FastAPI runtime | backend/runtime deployment | `https://<api-host>` | Business state, Tool Bridge, quality check, candidate-only state preview. |
| Agent Runtime | agent/workflow deployment | `https://<agent-host>` | Socratic workflow, candidate drafting, run ledger, calls FastAPI through Tool Bridge. |
| GitHub Pages | frontend release | `https://jzvcpe-goat.github.io/parallel-universe-novel/` | Static Creator Studio shell and live runtime configuration. |

## Runtime Environment

Use `deploy/runtime-production/origin.env.example` as the operator checklist.
Validate it with:

```bash
npm run check:remote-origin-provisioning
```

FastAPI required environment:

```bash
NARRATIVEOS_DEPLOY_ENV=production
DATABASE_URL=<production-or-preview-database-url>
NARRATIVEOS_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io
NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>
NARRATIVEOS_CREATOR_DIALOGUE_DIR=<persistent-or-mounted-session-dir>
NARRATIVEOS_CANON_LEDGER_DIR=<persistent-or-mounted-ledger-dir>
```

Optional provider environment, only when real model calls are enabled:

```bash
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_API_KEY=<secret>
NARRATIVEOS_CREATOR_BASE_URL=https://<provider-compatible-base-url>
NARRATIVEOS_CREATOR_MODEL=<model-name>
```

Agent Runtime required environment:

```bash
NARRATIVEOS_DEPLOY_ENV=production
NODE_ENV=production
MASTRA_HOST=0.0.0.0
MASTRA_PORT=4111
MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>
MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>
MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io
```

`FASTAPI_TOOL_BRIDGE_BASE_URL` is supported only as a legacy fallback. New deployments must use `MASTRA_TOOL_BRIDGE_BASE_URL`.

## CORS Contract

FastAPI:

- Must allow `https://jzvcpe-goat.github.io`.
- Must keep `NARRATIVEOS_ALLOWED_ORIGINS` environment-driven for future staging domains.
- Must not require browser clients to see provider, prompt, database, or fallback details.

Agent Runtime:

- Must allow `https://jzvcpe-goat.github.io` through `MASTRA_ALLOWED_ORIGINS`.
- Must allow request headers `Content-Type`, `Authorization`, and `Idempotency-Key`.
- Should avoid wildcard CORS in public deployment unless the host platform terminates and rewrites CORS separately.

## Health Contract

FastAPI:

```bash
curl -fsS https://<api-host>/health
```

Expected:

```json
{"status":"ok"}
```

Agent Runtime:

```bash
curl -fsS https://<agent-host>/health
```

Expected:

```json
{"status":"ok","service":"narrativeos-agent-runtime"}
```

## Tool Bridge Contract

Agent Runtime must call FastAPI through:

- `POST /v1/tools/runtime/socratic-turn`
- `POST /v1/tools/runtime/quality-check`
- `POST /v1/tools/runtime/state-preview`

Every write-like Tool Bridge call must include `Idempotency-Key`. Public creator generation remains `candidate`; it must not write canon or branch content.

Every Tool Bridge call must also include `Authorization: Bearer <shared-tool-bridge-secret>`. Configure the same value in `NARRATIVEOS_TOOL_BRIDGE_TOKEN` on FastAPI and `MASTRA_TOOL_BRIDGE_TOKEN` on Agent Runtime. Do not expose this secret to the browser or GitHub Pages build variables.

In protected deploy envs (`production`, `live`, `staging`, `preview`, `remote`), both services reject the local `dev-local-token` default. If the secret is missing or left as `dev-local-token`, Tool Bridge calls must fail before any runtime state preview is accepted.

Protected Agent Runtime deploys also fail closed when FastAPI Tool Bridge is unreachable. A live creator request must not return a local candidate draft unless FastAPI accepted the Tool Bridge call.

## GitHub Repository Variables

Set only repository variables, not frontend code defaults:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body live
gh variable set VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>
gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<agent-host>
```

Optional:

```bash
gh variable set VITE_API_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>/v1
```

Do not set `VITE_ALLOW_LOCAL_CREATOR_FALLBACK`. The workflow hard-codes it to `false`.

## Activation Sequence

1. Deploy FastAPI with `NARRATIVEOS_DEPLOY_ENV=production`, `NARRATIVEOS_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io`, and `NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>`.
2. Deploy Agent Runtime with `NARRATIVEOS_DEPLOY_ENV=production`, `NODE_ENV=production`, `MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>`, `MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>`, and `MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io`.
3. Verify both health endpoints.
4. Run local strict config check:

```bash
REQUIRE_PUBLIC_LIVE_CONFIG=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-live-config
```

5. Run public runtime preview check:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-runtime-preview
```

6. Generate the readiness ledger:

```bash
REQUIRE_LIVE_RUNTIME_READY=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run audit:live-runtime-readiness
```

7. Run Live Smoke:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run qa:live-runtime-browser
```

8. Set GitHub repository variables.
9. Push or manually dispatch `Deploy Creator Studio Preview`.
10. Confirm GitHub Actions build and deploy jobs are green. In live mode, the workflow must run `REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness` before `qa:live-runtime-browser`.
11. Open public `/#/create` and verify it shows `创作服务可用`.

## Live Smoke

The live browser smoke must prove:

- API `/health` returns ok.
- Agent `/health` returns ok.
- Creator Studio builds with `VITE_PUBLIC_RUNTIME_MODE=live`.
- `/create` displays `创作服务可用`.
- Submitting a seed returns a 300-900 character candidate draft.
- Follow-up question count is 0-2.
- Public UI does not show provider, system prompt, fallback, raw state, database, or internal runtime labels.
- Candidate output does not write canon or branch state.

## Rollback

Fast rollback to static preview:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled
gh workflow run "Deploy Creator Studio Preview" --repo jzvcpe-goat/parallel-universe-novel
```

Optional cleanup if a host is unsafe or compromised:

```bash
gh variable delete VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel
gh variable delete VITE_API_BASE_URL --repo jzvcpe-goat/parallel-universe-novel
gh variable delete VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel
```

Rollback acceptance:

- GitHub Pages deploy succeeds.
- Public `/create` displays `创作服务待连接`.
- Submitting a seed does not create a local fake draft.

## Acceptance Evidence

Capture and attach:

- API health response.
- Agent health response.
- `npm run check:public-live-config` output.
- `npm run check:public-runtime-preview` output.
- `npm run audit:live-runtime-readiness` output and generated `artifacts/runtime/live-runtime-readiness-*.json`.
- GitHub Actions `runtime-readiness-ledger` artifact.
- `npm run smoke:creator-chain` output, or `npm run test` output proving the smoke ran inside the root gate.
- `npm run qa:live-runtime-browser` output and screenshot path.
- GitHub Actions run URL.
- Public URL proof after deploy.
- Rollback command and result, if rollback was tested.

## Privacy And Product Boundary

Do not expose provider names, API keys, model names, system prompts, raw state, representative work names, source evidence mappings, or decrypted reference vault content in public Creator/Reader UI.
