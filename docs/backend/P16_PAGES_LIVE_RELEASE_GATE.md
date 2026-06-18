# P16 Pages Live Release Gate

## Goal

让 GitHub Pages 从静态预览模式切换到 live 模式时具备硬门禁：CI 先通过 `qa:live-runtime-local` 证明本地 FastAPI + Agent Runtime + live-mode 浏览器链路可执行；只有远端 API 与 Agent Runtime URL 都配置好，`audit:live-runtime-readiness`、`check:live-cutover-attestation`、`check:live-rollback-rehearsal`、`check:remote-runtime-activation-control` 和 `qa:live-runtime-browser` 全部通过，CI 才会构建 live Creator Studio。

## Default State

GitHub Pages 默认仍是静态预览：

```yaml
VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}
VITE_ALLOW_LOCAL_CREATOR_FALLBACK: false
```

如果没有配置 GitHub repository variables，公开页面会显示“创作服务待连接”，不会生成本地假正文。

## Required GitHub Repository Variables

在仓库 `Settings -> Secrets and variables -> Actions -> Variables` 中配置：

| Variable | Example | Required For Live |
| --- | --- | --- |
| `VITE_PUBLIC_RUNTIME_MODE` | `live` | yes |
| `VITE_API_ORIGIN` | `https://api.example.com` | yes |
| `VITE_API_BASE_URL` | `https://api.example.com/v1` | optional |
| `VITE_AGENT_RUNTIME_BASE_URL` | `https://agent.example.com` | yes |
| `REMOTE_API_SERVICE_ID` | `api-service-id` | yes |
| `REMOTE_AGENT_SERVICE_ID` | `agent-service-id` | yes |
| `REMOTE_API_SECRETS_CONFIGURED` | `true` | yes |
| `REMOTE_AGENT_SECRETS_CONFIGURED` | `true` | yes |

Do not set `VITE_ALLOW_LOCAL_CREATOR_FALLBACK` in repository variables. The workflow hard-codes it to `false`.
The `REMOTE_*` variables are non-secret attestation values only. Do not put
database URLs, Tool Bridge token values, model keys, private keys or provider
API tokens in repository variables.

Live release is enabled only by setting GitHub repository variables such as:

```bash
VITE_PUBLIC_RUNTIME_MODE=live
VITE_API_ORIGIN=https://<api-host>
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host>
```

## Workflow Gate

Before the build step, `.github/workflows/pages.yml` runs:

```bash
npx playwright install chromium
npm run check:public-runtime-preview
npm run qa:live-runtime-local
# GitHub Actions uploads artifact: local-live-runtime-visual-qa
if [ "$VITE_PUBLIC_RUNTIME_MODE" = "live" ]; then
  REQUIRE_PUBLIC_RUNTIME=true npm run check:public-runtime-preview
  REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
  REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
  npm run check:live-rollback-rehearsal
  REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
  REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser
fi
# After all evidence uploads: CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true npm run check:github-actions-artifacts
```

This proves:

- Local FastAPI + Agent Runtime can execute the same live-mode Creator browser path.
- Local live-mode visual evidence is downloadable from the `local-live-runtime-visual-qa` artifact.
- The same run contains `runtime-readiness-ledger`, `live-cutover-attestation`, `live-rollback-rehearsal`, `remote-runtime-activation-control`, `remote-assignment-execution-pack`, `remote-assignment-fixture-gate`, `reference-privacy`, `local-live-runtime-visual-qa`, and `github-pages` artifacts.
- API health is reachable.
- Agent Runtime health is reachable.
- Agent workflow preflight can return a public candidate.
- Remote service ids and provider secret-store confirmation flags are attested without exposing secret values.
- Creator Studio can submit a story seed in live mode.
- A candidate draft is returned.
- Public UI still hides internal implementation terms.

## Acceptance

1. `npm run check:pages-live-release-gate` passes.
2. Static mode still deploys with no remote Runtime variables.
3. CI always runs `qa:live-runtime-local` before evaluating remote live mode.
4. CI uploads local live-mode screenshots as `local-live-runtime-visual-qa`.
5. CI verifies current-run artifacts through `check:github-actions-artifacts`.
6. Live mode fails if any required remote URL is missing.
7. Live mode fails if `check:live-cutover-attestation` cannot prove assignment, origin execution, provisioning and readiness.
8. Live mode must always leave a `live-rollback-rehearsal` artifact proving rollback commands and static preview health.
9. Live mode must always leave a `remote-runtime-activation-control` artifact proving final cutover blockers are known.
10. Every Pages run must leave a `reference-privacy` artifact proving built output, public rules and Git history did not expose private representative work names.
11. Every Pages run must upload `remote-assignment-execution-pack` so the deployment owner sees the latest service-assignment command bundle or blocker.
12. Every Pages run must upload `remote-assignment-fixture-gate` proving the no-secret assignment fixture can generate a strict P79 pack while P75 stays pending health.
13. Live mode fails if browser submission cannot create a candidate draft.
14. Live mode never enables local fallback.

## Operational Rule

Do not change public GitHub Pages to live mode by editing frontend code. Change only repository variables, let CI run the gate, and roll back by setting `VITE_PUBLIC_RUNTIME_MODE=disabled`.
