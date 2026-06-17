# P23 Live Runtime Readiness Ledger

Date: 2026-06-17

## Goal

把 public live runtime 的上线断点从口头判断变成可重复生成的证据账本。P23 不假设远端 FastAPI 或 Agent Runtime 已经部署；它记录当前配置、健康检查、GitHub repository variables 是否存在、阻塞项和下一步动作。

## Command

```bash
npm run audit:live-runtime-readiness
```

默认行为：

- 生成 `artifacts/runtime/live-runtime-readiness-<timestamp>.json`。
- 当前未配置 live 远端时返回 `status: blocked`，但命令本身仍然退出成功，方便 CI 持续记录断点。
- 不读取或打印 provider secret、API key、system prompt、数据库连接串或任何模型私密配置。

强门禁行为：

```bash
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
```

当以下条件任一不满足时退出失败：

- `VITE_PUBLIC_RUNTIME_MODE=live`
- `VITE_API_ORIGIN` 是 remote HTTPS
- `VITE_AGENT_RUNTIME_BASE_URL` 是 remote HTTPS
- `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`
- FastAPI `/health` 返回 ok 或 healthy
- Agent Runtime `/health` 返回 ok 或 healthy

## Ledger Shape

账本包含：

- `repo`
- `publicUrl`
- `repoVariables.checked`
- `repoVariables.present`
- `runtimeConfig`
- `health.api`
- `health.agent`
- `checks`
- `blockedChecks`
- `commands`

它只记录上线事实，不承诺业务能力。正式切 live 仍必须继续跑：

```bash
npm run check:public-live-config
REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser
```

## Product Boundary

Creator/Reader public UI 只允许展示产品化状态，例如“创作服务可用”或“创作服务待连接”。P23 账本可以进入内部交接包，但不能在公共页面展示：

- provider
- system prompt
- fallback
- raw state
- database
- Tool Bridge payload
- representative work mapping

## Acceptance

- `package.json` 暴露 `audit:live-runtime-readiness`。
- 根目录 `npm run test` 包含该审计命令。
- GitHub Pages workflow 在默认 public build 中生成账本，在 `VITE_PUBLIC_RUNTIME_MODE=live` 时使用 `REQUIRE_LIVE_RUNTIME_READY=true` 强制通过账本后才运行 live browser smoke。
- GitHub Pages workflow 使用 `actions/upload-artifact` 上传 `artifacts/runtime/live-runtime-readiness-*.json`，即使 live gate 失败也保留证据。
- `scripts/check-runtime-activation-package.mjs` 反向检查脚本、文档和 runbook。
- P20 activation runbook 把 readiness ledger 纳入 activation sequence 与验收证据。
