# P15 Live Runtime Smoke Contract

## Goal

把“远端 Runtime 已经部署”转化成可重复验收的浏览器证据：只要提供真实的 API 与 Agent Runtime URL，脚本就能构建 live-mode Creator Studio，提交一句故事种子，并确认页面返回候选正文、追问和产品化状态。

## What This Proves

- API host is reachable through `GET /health`.
- Agent Runtime host is reachable through `GET /health`.
- Agent Runtime can pass a direct workflow preflight through `POST /v1/workflows/socratic-create`.
- Direct workflow preflight returns a public candidate response before the browser flow begins.
- Public Creator build uses `VITE_PUBLIC_RUNTIME_MODE=live`.
- Local creator fallback is disabled.
- Browser can submit a story seed through the live Agent Runtime.
- Returned content is a `candidate`, not canon.
- Candidate draft is long enough to be a real opening, not a status line.
- Follow-up questions stay within the 0-2 Socratic question limit.
- Public UI does not leak internal terms.

## Command

Default mode is safe for local and CI: if remote URLs are not configured, the script reports `skipped` and exits successfully.

```bash
npm run qa:live-runtime-browser
```

Local live-mode simulation:

```bash
npm run qa:live-runtime-local
```

This starts local FastAPI and Agent Runtime services, then runs the same `qa:live-runtime-browser` path with `ALLOW_INSECURE_RUNTIME_SMOKE=true`, `REQUIRE_PUBLIC_RUNTIME=true`, live frontend mode, and local fallback disabled. It also reuses the available backend virtualenv, Playwright module, and local Chrome executable when present. Use it before remote API/Agent URLs exist; it proves the direct workflow preflight, Tool Bridge, live build, and browser submit path are executable.

Required live mode:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run qa:live-runtime-browser
```

Optional seed override:

```bash
LIVE_RUNTIME_SMOKE_SEED="我想写一个雨夜悬疑故事，第一幕是一个人收到不该存在的证据，他必须在公开和隐瞒之间选择。开场要包含具体地点、人物压力、证据细节和一个无法立刻解释的反转。" \
npm run qa:live-runtime-browser
```

## Acceptance

1. API `/health` returns JSON with `status=ok` or `status=healthy`.
2. Agent Runtime `/health` returns JSON with `status=ok` or `status=healthy`.
3. Direct `POST /v1/workflows/socratic-create` returns `responseMode=public`.
4. Direct workflow preflight returns `candidateDraft.status=candidate`.
5. Direct workflow preflight candidate draft is 300-900 compact characters.
6. Direct workflow preflight follow-up questions count is 0-2.
7. Direct workflow preflight response does not include internal fields such as `runtimeArtifact`, `sourceRefs`, `kernelId`, `profileId`, `activeConstraints`, `activeKernels`, `sourceLabels`, `runTrace`, `ledger`, or `cost`.
8. `/create` shows “创作服务可用”.
9. Submit renders `creator-dialogue-thread`.
10. Browser candidate draft is 300-900 compact characters.
11. Browser follow-up questions count is 0-2.
12. Browser text does not include `system prompt`, `provider`, `fallback`, `rawHash`, `StateVector`, `AgentRun`, or `CHANGES JSON`.
13. The disconnected-service message is absent.
14. Local draft fallback message is absent.
15. Screenshot is written to `artifacts/visual-qa/`.

## Relationship To P13/P14

- P13 defines the public frontend boundary.
- P14 defines deployable API and Agent Runtime units.
- P15 proves those deployed units actually satisfy the Creator Studio product flow.

## Not Covered Yet

- Production database persistence.
- Payment, account merge, and reader live generation.
- Long-running model provider cost budgets.
- Canon commit; generated text remains candidate-only.
