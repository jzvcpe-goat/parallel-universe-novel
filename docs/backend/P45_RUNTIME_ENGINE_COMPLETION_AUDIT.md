# P45 Runtime Engine Completion Audit

Date: 2026-06-17

## Goal

建立一份机器可验证的 Runtime Engine 完成度审计。它不把当前产品误报为完全上线，而是把每个关键模块映射到当前文件、测试、脚本、CI artifact 和线上状态。

命令：

```bash
npm run check:runtime-engine-completion
```

该命令会生成 `artifacts/runtime/runtime-engine-completion-*.json`，并验证所有模块都有证据、状态、开放缺口和下一步 gate。

## Status Semantics

- `ready`: 当前 scope 内有测试、脚本或 CI artifact 证明可用，且没有 P45 级开放缺口。
- `partial`: 有可运行证据，但只覆盖候选态、本地 live、静态 Pages、局部服务或非生产链路。
- `blocked`: 关键外部条件未满足，例如远端 API/Agent 未配置、支付/法务/安全未进入生产验收。

`partial` 和 `blocked` 不代表失败；它们代表不能对外宣称该模块完成。

## Current Matrix

| Component ID | Module | Status | Evidence Summary | Open Gap |
| --- | --- | --- | --- | --- |
| `narrative-runtime-engine` | Narrative Runtime Engine | `partial` | `RuntimeArtifact` covers constraint set, kernel selection, scene plan, state preview, time consistency, quality brake, branch result. | Reader choice and Studio canon confirmation do not yet share a proven runtime trace. |
| `world-engine` | 世界引擎 | `partial` | Worldpack registry, `WorldBible`, frontend world/template data exist. | WorldInstance branch memory and relationship writeback are not yet proven through runtime facade. |
| `genre-kernel` | 类型内核 | `ready` | 21 `ConstraintProfile` + 21 `GenreKernel`, P4 scanner, runtime rule handshake, per-profile workflow tests. | Keep registry privacy and P4 scanner green. |
| `time-engine` | 时间引擎 | `partial` | `timeControls` and `timeConsistencyReport` exist inside runtime artifact. | Non-homogeneous Poisson and Hawkes simulation are not yet a durable backend engine. |
| `state-writeback` | 状态回写 | `partial` | `stateWritebackPreview`, Tool Bridge `stateDeltaCandidate`, smoke proves `canon_written=false` and `branch_written=false`. | Canon/branch commit and rollback are not proven. |
| `model-orchestration` | 多模型编排 | `partial` | Mastra agent contracts, provider abstraction, provider-agnostic config gate. | Public remote model/provider smoke and cost-aware routing are not yet proven. |
| `quality-brake` | 质量刹车 | `partial` | `qualityBrakeWorkflow`, `qualityBrakeReport`, tests for repair without committing candidate text. | Canon publishing is not yet gated by author confirmation plus quality brake. |
| `agent-eval` | Agent Eval | `partial` | Eval services, quality gate modules, scorer tests and dependency policy exist. | Learned evaluator/reranker are not promoted into public live release gate. |
| `codex-harness` | Codex Harness | `ready` | Root `npm run test`, smoke, CI artifact gate, sync manifest, release identity gate. | Keep CI evidence green on every release. |
| `web-reader-entry` | Web 阅读入口 | `partial` | `Home`, `Library`, `Story`, reader hooks and public UI boundary scan exist. | Reader choices do not yet traverse the same remote runtime facade. |
| `creator-studio` | 创作者工作台 | `partial` | `/create`, `socratic-create`, local live browser QA, 300+ candidate draft and 0-2 questions. | Public Pages still has remote runtime disabled until API/Agent HTTPS origins are configured. |
| `commercial-release-chain` | 商业化发布链路 | `blocked` | GitHub Pages deploy, `runtime-readiness-ledger`, `local-live-runtime-visual-qa`, `github-pages` artifacts. | Public live runtime, real payment provider, legal/privacy and production rollback owners remain unresolved. |

## Required Evidence Artifacts

The release chain must continue to produce:

- `runtime-readiness-ledger`
- `local-live-runtime-visual-qa`
- `github-pages`

The current artifact gate is `check:github-actions-artifacts`. P45 consumes the readiness ledger status but does not rewrite it.

## Privacy Boundary

This audit must not expose representative work names. It only accepts the public rule registry shape:

- `representativeWorks = encrypted_vault_only`
- `publicReferenceField = sourceRefs`

Do not paste source titles, author names, provider secrets, system prompts, raw state, candidate text, or private reference mappings into this document or the generated audit artifact.

## Acceptance

1. `package.json` exposes `check:runtime-engine-completion`.
2. Root `npm run test` includes `check:runtime-engine-completion`.
3. The script verifies all 12 P45 components.
4. Every non-ready component has at least one explicit `openGaps` item and a `nextGate`.
5. The script writes a timestamped `runtime-engine-completion` artifact.
6. The audit keeps the representative-work privacy contract intact.
