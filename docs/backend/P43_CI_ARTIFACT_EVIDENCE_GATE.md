# P43 CI Artifact Evidence Gate

Date: 2026-06-17

## Goal

把 GitHub Actions 的上线证据从“日志里看见通过”升级成可自动核验的 artifact gate。当前 Pages workflow 必须留下十类可下载证据：

- `runtime-readiness-ledger`
- `live-cutover-attestation`
- `live-rollback-rehearsal`
- `remote-runtime-activation-control`
- `remote-assignment-execution-pack`
- `remote-assignment-fixture-gate`
- `reference-privacy`
- `public-projection-privacy`
- `local-live-runtime-visual-qa`
- `github-pages`

## Command

检查最新成功 run。为了兼容 P76 引入前的旧成功 run，本地默认只强制旧三类 artifact：

```bash
npm run check:github-actions-artifacts
```

检查当前 CI run。CI 当前 run 必须包含十类 artifact，包括 `live-cutover-attestation`、`live-rollback-rehearsal`、`remote-runtime-activation-control`、`remote-assignment-execution-pack`、`remote-assignment-fixture-gate`、`reference-privacy` 和 `public-projection-privacy`：

```bash
CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:github-actions-artifacts
```

本地默认如果无法访问 GitHub API 会 `skipped`；CI 使用 `CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true`，无法检查或缺 artifact 都会失败。

## What This Proves

- `runtime-readiness-ledger` exists and is non-empty.
- `live-cutover-attestation` exists and is non-empty.
- `live-rollback-rehearsal` exists and is non-empty.
- `remote-runtime-activation-control` exists and is non-empty.
- `remote-assignment-execution-pack` exists and is non-empty.
- `remote-assignment-fixture-gate` exists and is non-empty.
- `reference-privacy` exists and is non-empty.
- `public-projection-privacy` exists and is non-empty.
- `local-live-runtime-visual-qa` exists and is non-empty.
- `github-pages` exists and is non-empty.
- None of the required artifacts are expired.

## Public Boundary

This gate only checks artifact metadata: artifact names, sizes, expiration state, run id, and head sha. It does not download artifact contents, and it must not print provider secrets, system prompts, database URLs, representative work mappings, or candidate text.

## Workflow Placement

`.github/workflows/pages.yml` runs the current-run gate after:

1. `Upload local live runtime visual QA`
2. `Upload runtime readiness ledger`
3. `Upload live cutover attestation`
4. `Upload live rollback rehearsal`
5. `Upload remote runtime activation control`
6. `Upload remote assignment execution pack`
7. `Upload remote assignment fixture gate`
8. `Upload reference privacy evidence`
9. `Upload public projection privacy evidence`
10. `Upload artifact`

That placement proves the same run that will deploy Pages also produced the required evidence package.

## Acceptance

1. `package.json` exposes `check:github-actions-artifacts`.
2. `scripts/check-github-actions-artifacts.mjs` checks the latest successful run by default.
3. The script can check the current CI run when `CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true`; current-run mode requires `live-cutover-attestation`, `live-rollback-rehearsal`, `remote-runtime-activation-control`, `remote-assignment-execution-pack`, `remote-assignment-fixture-gate`, `reference-privacy` and `public-projection-privacy`.
4. The workflow runs the current-run gate with `CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true`.
5. Missing, expired, or empty required artifacts fail the gate.
