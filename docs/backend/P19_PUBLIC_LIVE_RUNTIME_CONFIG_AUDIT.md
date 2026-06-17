# P19 Public Live Runtime Config Audit

Date: 2026-06-17

## Goal

把公开 GitHub Pages 从“静态 Creator Studio 可打开”推进到“live runtime 配置状态可审计”。本轮不假装远端服务已经接上；它明确记录当前断点，并给出切换 live 的硬门禁。

## Current Audit Result

Repository variables inspected with:

```bash
gh variable list --repo jzvcpe-goat/parallel-universe-novel
gh secret list --repo jzvcpe-goat/parallel-universe-novel
```

Current result:

- No repository variables were listed.
- No repository secrets were listed.
- GitHub Pages therefore remains in `VITE_PUBLIC_RUNTIME_MODE=disabled`.
- Public Creator Studio may render the creation surface, but must display the product-facing disconnected state and must not generate local fake drafts.

## Live Requirements

To enable public live creation, configure repository variables under GitHub Actions variables:

| Variable | Required | Rule |
| --- | --- | --- |
| `VITE_PUBLIC_RUNTIME_MODE` | yes | Must be `live`. |
| `VITE_API_ORIGIN` | yes | Must be a remote HTTPS FastAPI origin. |
| `VITE_AGENT_RUNTIME_BASE_URL` | yes | Must be a remote HTTPS Agent Runtime origin. |
| `VITE_API_BASE_URL` | optional | If set, must be remote HTTPS. |

Do not configure `VITE_ALLOW_LOCAL_CREATOR_FALLBACK` in repository variables. The Pages workflow hard-codes it to `false`.

## New Gate

`npm run check:public-live-config` validates:

- Pages workflow reads runtime mode and remote URLs from repository variables.
- Pages workflow keeps local creator fallback disabled.
- Pages workflow runs `qa:live-runtime-browser` when live mode is enabled.
- P13/P16 docs describe the live runtime contract.
- Package scripts expose the live runtime checks.
- When `REQUIRE_PUBLIC_LIVE_CONFIG=true`, missing or non-HTTPS runtime URLs fail immediately.

Optional live repository audit:

```bash
CHECK_GITHUB_REPO_VARS=true npm run check:public-live-config
```

Strict live gate:

```bash
REQUIRE_PUBLIC_LIVE_CONFIG=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-live-config
```

## Release Rule

The public site can be considered live only after all of these pass:

1. `CHECK_GITHUB_REPO_VARS=true npm run check:public-live-config`
2. `REQUIRE_PUBLIC_RUNTIME=true npm run check:public-runtime-preview`
3. `REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser`
4. GitHub Actions Pages deploy succeeds with `VITE_PUBLIC_RUNTIME_MODE=live`
5. Public `/#/create` displays `创作服务可用`

Until then, the product state is “public static preview with live runtime not connected.”

