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

## Release Ordering

Pages does not deploy directly from `push`. A main branch push first runs
`Publish Runtime Images`; after that workflow succeeds for the same head,
`Deploy Creator Studio Preview` starts from a `workflow_run` event and checks
out `github.event.workflow_run.head_sha`. Manual `workflow_dispatch` is still
available for explicit operator reruns.

This ordering is enforced by `check:release-workflow-ordering` so Pages cannot
create current-run release artifacts against stale P72 image evidence.

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
# After P43 metadata gate: CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED=true npm run check:public-privacy-artifacts
# After P92 privacy artifact content gate: CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED=true npm run check:remote-assignment-artifacts
# After P93 assignment artifact content gate: CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED=true npm run check:remote-assignment-handoff-artifact
# After P89 handoff content gate: CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED=true npm run check:remote-runtime-blockers-artifact
# After P90 blocker content gate: CHECK_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_REQUIRED=true npm run check:remote-assignment-fill-plan-artifact
# Root release gate: npm run check:ci-artifact-content-coverage
# Root local-boundary gate: npm run check:remote-assignment-local-boundary
# Root repo-variable boundary gate: npm run check:github-runtime-variable-boundary
# Root placeholder sentinel gate: npm run check:runtime-placeholder-sentinel
```

This proves:

- Local FastAPI + Agent Runtime can execute the same live-mode Creator browser path.
- Local live-mode visual evidence is downloadable from the `local-live-runtime-visual-qa` artifact.
- The same run contains `runtime-readiness-ledger`, `live-cutover-attestation`, `live-rollback-rehearsal`, `remote-runtime-activation-control`, `remote-assignment-handoff`, `remote-assignment-schema`, `remote-assignment-execution-pack`, `remote-assignment-fixture-gate`, `remote-runtime-blockers`, `remote-assignment-fill-plan`, `reference-privacy`, `public-projection-privacy`, `local-live-runtime-visual-qa`, and `github-pages` artifacts.
- The `remote-assignment-handoff` artifact content passes P89 structural,
  privacy and current-head image checks.
- The `remote-runtime-blockers` artifact content passes P90 current-head,
  privacy and cross-gate consistency checks.
- The `remote-assignment-fill-plan` artifact content passes P106 current-head,
  privacy and operator-boundary checks.
- P107 proves every Pages artifact is owned by a downloaded content gate,
  pre-upload generator gate, built bundle privacy scan or visual evidence path.
- P108 proves the ignored `remote-assignment.local.json` boundary stays local,
  template-only and impossible to satisfy with fixture data.
- P109 GitHub Runtime Variable Boundary Guard proves repository variables stay
  limited to public runtime configuration and non-secret attestation. Do not put
  database URLs, Tool Bridge token values, model keys, private keys or provider
  API tokens in repository variables.
  Do not put database URLs, Tool Bridge token values, model keys, private keys or provider API tokens in repository variables.
- P110 Runtime Placeholder Sentinel Guard proves `FILL_*`, `REPLACE_ME`,
  `YOUR_*`, `TODO_*` and `<...>` placeholders cannot pass as real remote
  service ids, origins, assignment evidence or GitHub repository variables.
- The `reference-privacy` and `public-projection-privacy` artifact contents pass
  P92 redaction and zero-violation checks.
- The `remote-assignment-schema`, `remote-assignment-execution-pack` and
  `remote-assignment-fixture-gate` contents pass P93 structure and public
  boundary checks.
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
11. Every Pages run must leave a `public-projection-privacy` artifact proving built output and public projections did not expose profile/kernel ids, source refs, provider prompt plumbing, vault metadata or deprecated case logic.
12. Every Pages run must upload `remote-assignment-handoff` so the deployment owner sees the current-image assignment template before filling the ignored local assignment file.
13. Every Pages run must upload `remote-assignment-schema` so the deployment owner sees whether the assignment template, fixture and local contract are schema-valid.
14. Every Pages run must upload `remote-assignment-execution-pack` so the deployment owner sees the latest service-assignment command bundle or blocker.
15. Every Pages run must upload `remote-assignment-fixture-gate` proving the no-secret assignment fixture can generate a strict P79 pack while P75 stays pending health.
16. Every Pages run must upload `remote-runtime-blockers` so the release owner sees one normalized blocker ledger across P23/P65/P66/P72/P75/P76/P78/P79.
17. Every Pages run must upload `remote-assignment-fill-plan` so the deployment
    owner sees one current, operator-safe field checklist and strict validation
    sequence before touching the ignored local assignment file.
18. Every Pages run must run `check:remote-assignment-handoff-artifact` after
    P43 so handoff artifact content is validated, not only its presence.
19. Every Pages run must run `check:public-privacy-artifacts` after P43 so
    privacy artifact content is validated, not only its presence.
20. Every Pages run must run `check:remote-assignment-artifacts` after P92 so
    assignment schema, execution pack and fixture artifacts are content-checked.
21. Every Pages run must run `check:remote-runtime-blockers-artifact` after P89
    so the blocker ledger is current, privacy-safe and consistent with P72/P80/P81/P89.
22. Every Pages run must run `check:remote-assignment-fill-plan-artifact` after
    P90 so the fill plan is current, privacy-safe and still preserves live
    runtime blockers before deploy.
23. Root `npm run test` must run `check:ci-artifact-content-coverage` so no
    Pages artifact is only uploaded without an explicit verification owner.
24. Root `npm run test` must run `check:remote-assignment-local-boundary` so
    ignored local assignment state cannot be committed or replaced by fixture data.
25. Root `npm run test` must run `check:github-runtime-variable-boundary` so
    GitHub repository variables cannot contain database URLs, Tool Bridge token
    values, model keys, private keys, provider API tokens or unknown runtime
    variables.
26. Root `npm run test` must run `check:runtime-placeholder-sentinel` so handoff
    placeholders cannot be mistaken for remote runtime evidence.
27. Live mode fails if browser submission cannot create a candidate draft.
28. Live mode never enables local fallback.

## Operational Rule

Do not change public GitHub Pages to live mode by editing frontend code. Change only repository variables, let CI run the gate, and roll back by setting `VITE_PUBLIC_RUNTIME_MODE=disabled`.
