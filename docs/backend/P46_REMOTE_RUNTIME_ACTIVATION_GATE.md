# P46 Remote Runtime Activation Gate

Date: 2026-06-17

## Goal

把 `commercial-release-chain` 的 blocked 状态拆成一张可执行的远程 Runtime 激活门禁。P46 不伪造上线，也不把静态 GitHub Pages 说成 live runtime；它只判断什么时候可以把公开 Creator 从 `disabled` 切到 `live`。

命令：

```bash
npm run check:remote-runtime-activation
```

该命令读取最近一次 `npm run audit:live-runtime-readiness` 生成的 readiness ledger，并写出：

```text
artifacts/runtime/remote-runtime-activation-*.json
```

## Release Decisions

- `hold_public_live_runtime_disabled`: 公开 Pages 必须继续保持静态/待连接模式。
- `can_enable_public_live_runtime`: 远端 API、远端 Agent、Creator workflow preflight 与 live QA 都已通过，可以把 GitHub repository variable `VITE_PUBLIC_RUNTIME_MODE` 切到 `live`。

## Activation Stages

| Stage | Owner | Required Checks | If Blocked |
| --- | --- | --- | --- |
| GitHub Pages runtime variables | release operator | `public-runtime-mode`, `api-origin`, `agent-origin`, `api-base-url`, `local-fallback-disabled` | 配置 repository variables；不要改前端代码绕过。 |
| Remote FastAPI and Agent health | backend runtime owner | `api-health`, `agent-health` | 修远端 `/health`、CORS、Tool Bridge secret 和 HTTPS hosting。 |
| Creator seed-to-candidate workflow | agent runtime owner | `creator-workflow-preflight` | 修 `/v1/workflows/socratic-create`，直到返回 public candidate、0-2 个追问且无内部字段。 |

## Evidence Chain

一次可以进入 live 的发布必须同时具备：

- `runtime-readiness-ledger` GitHub Actions artifact
- `local-live-runtime-visual-qa` GitHub Actions artifact
- `github-pages` GitHub Actions artifact
- `remote-runtime-activation-*.json` 本地或 CI 生成账本
- Pages workflow 成功完成
- `npm run check:github-actions-artifacts` 通过

## Privacy Boundary

P46 artifact 不允许包含：

- API key、token、数据库连接串、provider secret
- system prompt、raw state、StateVector
- 代表作品名、sourceRefs、reference-work-vault
- candidate 正文全文

它只保存阶段状态、检查 ID、公开 URL 状态和下一步动作。

## Acceptance

1. `package.json` 暴露 `check:remote-runtime-activation`。
2. Root `npm run test` 包含 `check:remote-runtime-activation`。
3. 脚本读取最新 readiness ledger，而不是重新发明一套环境判断。
4. 脚本输出 `releaseDecision`，并在未满足时返回 `passed_with_activation_blockers`。
5. P46 不因远程服务未配置而失败；它只在缺少证据结构、文档、脚本或隐私边界破坏时失败。
6. CI 仍由 Pages workflow 的 live 分支负责强制 `REQUIRE_LIVE_RUNTIME_READY=true`。
