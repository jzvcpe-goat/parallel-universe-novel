# P15 Live Runtime Smoke Contract

## Goal

把“远端 Runtime 已经部署”转化成可重复验收的浏览器证据：只要提供真实的 API 与 Agent Runtime URL，脚本就能构建 live-mode Creator Studio，提交一句故事种子，并确认页面返回候选正文、追问和产品化状态。

## What This Proves

- API host is reachable through `GET /health`.
- Agent Runtime host is reachable through `GET /health`.
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
LIVE_RUNTIME_SMOKE_SEED="我想写一个雨夜悬疑故事，第一幕是一个人收到不该存在的证据。" \
npm run qa:live-runtime-browser
```

## Acceptance

1. API `/health` returns JSON with `status=ok` or `status=healthy`.
2. Agent Runtime `/health` returns JSON with `status=ok` or `status=healthy`.
3. `/create` shows “创作服务可用”.
4. Submit renders `creator-dialogue-thread`.
5. Candidate draft is 300-900 compact characters.
6. Follow-up questions count is 0-2.
7. Browser text does not include `system prompt`, `provider`, `fallback`, `rawHash`, `StateVector`, `AgentRun`, or `CHANGES JSON`.
8. The disconnected-service message is absent.
9. Local draft fallback message is absent.
10. Screenshot is written to `artifacts/visual-qa/`.

## Relationship To P13/P14

- P13 defines the public frontend boundary.
- P14 defines deployable API and Agent Runtime units.
- P15 proves those deployed units actually satisfy the Creator Studio product flow.

## Not Covered Yet

- Production database persistence.
- Payment, account merge, and reader live generation.
- Long-running model provider cost budgets.
- Canon commit; generated text remains candidate-only.
