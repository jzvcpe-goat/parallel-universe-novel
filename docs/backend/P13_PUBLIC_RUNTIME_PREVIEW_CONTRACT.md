# P13 Public Runtime Preview Contract

## Goal

把公开 GitHub Pages 前端从“静态可打开”推进到“运行能力边界可验证”。本轮不把 GitHub Pages 当作后端宿主：GitHub Pages 只发布 Creator Studio 静态包；候选正文生成、状态预览和质量检查必须通过远端 FastAPI + Agent Runtime 服务完成。

## Current State

- GitHub Pages 已可打开首页和 `#/create`。
- 本地完整链路已可跑通：Creator Studio -> Agent workflow -> FastAPI Tool Bridge -> Runtime facade -> candidate draft。
- 公开静态页在没有远端服务时必须保持真实边界：可以展示入口和创作输入，但不能生成本地假正文。

## Runtime Boundary

### Frontend Build Modes

| Mode | Required Env | Behavior |
| --- | --- | --- |
| Local dev | none | 默认使用 `http://127.0.0.1:4111`，方便本地 `npm run dev`。 |
| Public static preview | `VITE_PUBLIC_RUNTIME_MODE=disabled` and `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false` | 显示“创作服务待连接”，提交后保留输入并提示稍后再试。 |
| Public live preview | remote `VITE_AGENT_RUNTIME_BASE_URL`, remote `VITE_API_ORIGIN`, `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false` | 调用远端 workflow，返回 candidate 正文、追问、设定卡和质量预览。 |

### Non-Negotiable Rules

1. Public builds must never default to `127.0.0.1` as the Agent Runtime.
2. Public builds must not fall back to local draft generation.
3. Public UI must not expose provider, system prompt, raw state, fallback, trace object names, database terms, or implementation labels.
4. Every write-like runtime call must stay candidate-only until the author confirms.
5. Any backend write path that can become persistent later must require `Idempotency-Key`.

## Deployment Shape

```text
GitHub Pages
  Creator Studio static app
  VITE_ROUTER_MODE=hash
  VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false
  VITE_PUBLIC_RUNTIME_MODE=disabled or live

Remote API host
  FastAPI business runtime
  /health
  /v1/tools/runtime/socratic-turn
  /v1/tools/runtime/draft
  /v1/tools/runtime/quality-check
  /v1/tools/runtime/state-preview

Remote Agent host
  Mastra-compatible workflow runtime
  /health
  /v1/workflows/socratic-create
  /v1/workflows/state-preview
  /v1/workflows/quality-brake
```

## Acceptance

### Static Public Preview

- `/#/create` renders directly.
- Home CTA enters `#/create`.
- The page displays product copy equivalent to “创作服务待连接”.
- Submit preserves the user input.
- No fake dialogue thread is rendered.

### Live Public Preview

- `REQUIRE_PUBLIC_RUNTIME=true npm run check:public-runtime-preview` passes with remote HTTPS env values.
- Browser submission creates a candidate draft of 300-800 Chinese characters.
- Questions count is 0-2.
- Returned setting cards include story seed, character gap, scene/world pressure, conflict, and next hook.
- Quality preview can warn or block but must not commit canon.

## Commands

```bash
npm run check:public-runtime-preview
npm run qa:pages-browser
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run qa:creator-browser
```

For a future live preview gate:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_AGENT_RUNTIME_BASE_URL=https://agent.example.com \
VITE_API_ORIGIN=https://api.example.com \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-runtime-preview
```

## Backlog After This Contract

1. Pick the remote host for FastAPI and Agent Runtime.
2. Add CORS allowlist for the GitHub Pages origin.
3. Add deployment secrets and environment variables.
4. Add live browser QA against the remote preview.
5. Only after live QA passes, change `VITE_PUBLIC_RUNTIME_MODE` from `disabled` to `live`.
