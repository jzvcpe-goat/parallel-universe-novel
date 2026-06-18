# P43 CI Artifact Evidence Gate

Date: 2026-06-17

## Goal

把 GitHub Actions 的上线证据从“日志里看见通过”升级成可自动核验的 artifact gate。当前 Pages workflow 必须留下十四类可下载证据：

- `runtime-readiness-ledger`
- `live-cutover-attestation`
- `live-rollback-rehearsal`
- `remote-runtime-activation-control`
- `remote-assignment-handoff`
- `remote-assignment-schema`
- `remote-assignment-execution-pack`
- `remote-assignment-fixture-gate`
- `remote-runtime-blockers`
- `remote-assignment-fill-plan`
- `reference-privacy`
- `public-projection-privacy`
- `local-live-runtime-visual-qa`
- `github-pages`

## Command

检查最新成功 run。为了兼容 P76 引入前的旧成功 run，本地默认只强制旧三类 artifact：

```bash
npm run check:github-actions-artifacts
```

检查当前 CI run。CI 当前 run 必须包含十四类 artifact，包括 `live-cutover-attestation`、`live-rollback-rehearsal`、`remote-runtime-activation-control`、`remote-assignment-handoff`、`remote-assignment-schema`、`remote-assignment-execution-pack`、`remote-assignment-fixture-gate`、`remote-runtime-blockers`、`remote-assignment-fill-plan`、`reference-privacy` 和 `public-projection-privacy`：

```bash
CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:github-actions-artifacts
```

本地默认如果无法访问 GitHub API 会 `skipped`；CI 使用 `CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true`，无法检查或缺 artifact 都会失败。

P43 只证明 artifact 元数据存在。`reference-privacy` 和
`public-projection-privacy` 的 JSON 内容由 P92 再下载核验，
`remote-assignment-schema`、`remote-assignment-execution-pack` 和
`remote-assignment-fixture-gate` 的 JSON/Markdown 内容由 P93 再下载核验，
`remote-assignment-handoff` 的 JSON 内容由 P89 再下载核验，
`remote-runtime-blockers` 的 JSON 内容由 P90 再下载核验：

```bash
CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:public-privacy-artifacts

CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-artifacts

CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-handoff-artifact

CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-runtime-blockers-artifact
```

## What This Proves

- `runtime-readiness-ledger` exists and is non-empty.
- `live-cutover-attestation` exists and is non-empty.
- `live-rollback-rehearsal` exists and is non-empty.
- `remote-runtime-activation-control` exists and is non-empty.
- `remote-assignment-handoff` exists and is non-empty.
- `remote-assignment-schema` exists and is non-empty.
- `remote-assignment-execution-pack` exists and is non-empty.
- `remote-assignment-fixture-gate` exists and is non-empty.
- `remote-runtime-blockers` exists and is non-empty.
- `remote-assignment-fill-plan` exists and is non-empty.
- `reference-privacy` exists and is non-empty.
- `public-projection-privacy` exists and is non-empty.
- `local-live-runtime-visual-qa` exists and is non-empty.
- `github-pages` exists and is non-empty.
- None of the required artifacts are expired.

## Public Boundary

This gate only checks artifact metadata: artifact names, sizes, expiration state, run id, and head sha. It does not download artifact contents, and it must not print provider secrets, system prompts, database URLs, representative work mappings, or candidate text. P92 is the content attestation gate for `reference-privacy` and `public-projection-privacy`; P93 is the content attestation gate for `remote-assignment-schema`, `remote-assignment-execution-pack`, and `remote-assignment-fixture-gate`; P89 is the content attestation gate for `remote-assignment-handoff`; P90 is the content attestation gate for `remote-runtime-blockers`; P91 owns the assignment schema generator.

## Workflow Placement

`.github/workflows/pages.yml` runs the current-run gate after:

1. `Upload local live runtime visual QA`
2. `Upload runtime readiness ledger`
3. `Upload live cutover attestation`
4. `Upload live rollback rehearsal`
5. `Upload remote runtime activation control`
6. `Upload remote assignment handoff`
7. `Upload remote assignment schema gate`
8. `Upload remote assignment execution pack`
9. `Upload remote assignment fixture gate`
10. `Upload remote runtime blocker ledger`
11. `Upload remote assignment fill plan`
12. `Upload reference privacy evidence`
13. `Upload public projection privacy evidence`
14. `Upload artifact`

That placement proves the same run that will deploy Pages also produced the required evidence package.

## Acceptance

1. `package.json` exposes `check:github-actions-artifacts`.
2. `scripts/check-github-actions-artifacts.mjs` checks the latest successful run by default.
3. The script can check the current CI run when `CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true`; current-run mode requires `live-cutover-attestation`, `live-rollback-rehearsal`, `remote-runtime-activation-control`, `remote-assignment-handoff`, `remote-assignment-schema`, `remote-assignment-execution-pack`, `remote-assignment-fixture-gate`, `remote-runtime-blockers`, `remote-assignment-fill-plan`, `reference-privacy` and `public-projection-privacy`.
4. The workflow runs the current-run gate with `CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true`.
5. Missing, expired, or empty required artifacts fail the gate.
6. Pages workflow runs P92, P93, P89 and P90 after P43 so public privacy
   artifacts, assignment evidence artifacts, `remote-assignment-handoff` and
   `remote-runtime-blockers` content are validated separately from artifact
   metadata.
