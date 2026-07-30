# ColinLi98 R1-A0 审阅 Handoff

**仓库：** [jzvcpe-goat/parallel-universe-novel](https://github.com/jzvcpe-goat/parallel-universe-novel)

**Draft PR：** [#9 R1-A0: integrate author-controlled writing workflow](https://github.com/jzvcpe-goat/parallel-universe-novel/pull/9)

**目标分支：** `main`

**审阅分支：** `codex/r1-a0-writing-workflow-integration`

**代码实现 commit：** `630caa7dcc3da19c206952621183ddced4c94865`

**R0 基线 tag：** `creator-mvp-r0`

**负责人：** James

**独立 Reviewer：** ColinLi98

> 审阅时以 PR #9 显示的最新 HEAD 为准。本 handoff 在代码实现 commit
> 之后补入，因此 PR 最新 HEAD 可能只比 `630caa7` 多一份 handoff 文档。
> Reviewer 必须核对最新 HEAD 的 CI，不以本文件记录代替 GitHub 实际状态。

## 1. 这次需要 Colin 做什么

在 PR #9 阶段，Colin 只需要独立审核，不需要另写一套功能，也不能把数据库、
支付或部署改动混入 R1-A0。R1-A0 审阅结束后，Colin 将作为 R1-D owner，
按独立工作包处理数据库安全、支付和部署。

1. 在干净 checkout 中定位 PR #9 的最新 HEAD。
2. 阅读本文件列出的核心实现和安全边界。
3. 运行最小命令集，核对 CI 上传的 JSON 和截图证据。
4. 对发现的问题直接在 PR #9 留 inline comment 或 review comment。
5. 无 P0/P1、CI 全绿且讨论清零时提交 `APPROVED`；否则提交
   `CHANGES_REQUESTED`，写明文件、行号、复现步骤和预期行为。

Colin 不应：

- 在自己的非仓库目录中根据文字说明重新实现。
- 用旧的本地附件或旧 commit 代替 PR #9 最新 HEAD。
- 在 PR #9 修改数据库 migration、RLS、支付、部署或 Reader 公开投影。
- 因单次参考 Adapter PASS 宣称文学质量已经提升。
- 合并 PR、打 tag 或启动下一工作包。

## 2. R1-A0 解决了什么

R0 已有作者意图、手动召回、候选、审阅、修订、Canon 和发布包的分散能力，
但缺少一条与当前对话式 Creator UI 对齐、可刷新恢复、可由浏览器重复验证的
完整作者工作流。

R1-A0 串起：

```text
一句自然语言创作意图
  -> 最多两次关键追问
  -> 作者锁定意图
  -> 作者手动选择记忆卡
  -> 比较 1-3 个不同候选
  -> 生成单场景 Candidate
  -> 作者采用并可手工编辑
  -> 独立审阅定位正文证据
  -> 只生成证据块的局部修改 Candidate
  -> 作者确认采用
  -> 重新审阅
  -> 作者确认 Canon Patch
  -> 人物 / 设定边界 / 长期线程状态原子更新
  -> 作者确认发布包
  -> 停止，不公开提交
```

## 3. 核心文件与所有权

| 文件 | 本次职责 | Reviewer 重点 |
| --- | --- | --- |
| `app/src/features/creator-decision/referenceWritingAgent.ts` | 确定性参考 Adapter 的召回回执、局部修订与独立校验、三类 Canon 状态提案 | 是否有无证据推断、越界改写或自动写 Canon |
| `scripts/browser-creator-decision-workbench.mjs` | 当前 Creator 对话界面的完整 Chrome 工作流与运行断言 | 是否真实点击作者确认；是否在公开提交前停止 |
| `scripts/check-creator-r1-a0-writing-workflow.mjs` | R1-A0 结构门禁 | 是否保护真实边界，而非只匹配无意义变量名 |
| `.github/workflows/mvp-checks.yml` | Linux Chromium 运行和 artifact 上传 | 最新 HEAD 是否真实运行，失败时是否仍保留证据 |
| `docs/launch/070_R1_A0_WRITING_WORKFLOW_INTEGRATION.md` | 范围、验收和非结论 | 是否存在越界完成声明 |
| `package.json` | R1-A0 gate 与 QA 命令入口 | 是否进入 `check:pivot` |

相关既有边界：

| 边界 | 文件 |
| --- | --- |
| Candidate quality gate | `app/src/features/creator-decision/candidateQualityGate.ts` |
| Canon 原子提交与版本检查 | `app/src/features/creator-decision/canonPatch.ts` |
| Creation workflow 编排 | `app/src/features/creator-decision/creationDecisionWorkflow.ts` |
| 手动召回回执 | `app/src/features/creator-decision/manualRecallAdherence.ts` |
| 局部修订意图保护 | `app/src/features/creator-decision/localRepairIntentPreservation.ts` |

## 4. 必须成立的产品边界

### 4.1 Candidate 不得自动进入正文

- 场景生成后，作者采用前不得出现 active draft。
- 局部修改只形成 Candidate；作者点击“采用这一处修改”后才产生新草稿 revision。
- Agent、参考 Adapter 和浏览器脚本都不能代替作者确认。

### 4.2 审阅必须有当前正文证据

- 每条生效 finding 必须指向当前 `blockId` 和 offsets。
- 手动记忆卡只有在当前正文能逐字定位承接证据时才可 `pass`。
- 找不到证据时必须 `omitted/reject`，不得用语义相似猜测补齐。
- 不使用综合文学分数。

### 4.3 局部修订不得重写全文

- `proposeRepair` 只能处理 finding 指向的 evidence block。
- `reviewRepair` 必须独立检查 scope、正文变化和作者意图保留。
- 非目标正文块必须保持不变。
- 未通过独立 repair review 的 Candidate 不得采用。

### 4.4 Canon 必须由作者确认并检查版本

- 模型只能提出 `CanonStatePatch`。
- 作者确认前不得改变本机 Canon。
- Commit 必须核对 Canon revision、draft revision、stale 状态和 evidence block。
- 单次 Patch 应保留有正文证据的人物 22 维状态、设定信息边界和长期 promise/thread 状态。
- 刷新后不得重复提交，同一工作流只能得到一份 Canon revision 1。

### 4.5 发布包不是公开发布

- R1-A0 允许作者准备、审阅和确认发布包。
- 浏览器脚本禁止点击 `submit_publish_bundle`。
- 最终 `publishReceipts` 必须为 `0`。
- Agent operation log 不得出现 started/succeeded 的公开提交动作。

## 5. 干净复审步骤

Reviewer 应使用真实 Git checkout，不要在普通文件夹中运行。

```bash
git clone https://github.com/jzvcpe-goat/parallel-universe-novel.git
cd parallel-universe-novel
git fetch origin
git switch --detach origin/codex/r1-a0-writing-workflow-integration

git status --short
git rev-parse HEAD
git merge-base --is-ancestor creator-mvp-r0 HEAD
```

预期：

- `git status --short` 无输出。
- HEAD 与 PR #9 当前 `headRefOid` 完全一致。
- 当前 HEAD 以 `creator-mvp-r0` 为祖先。

安装依赖：

```bash
npm ci --include=optional
npm --prefix app ci --include=optional
```

最小审阅命令：

```bash
npm run check:creator-r1-a0-writing-workflow
npm run check:pivot
npm run test:creator:full
npm run build:creator
git diff --check creator-mvp-r0...HEAD
```

macOS Google Chrome 复核：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npm run qa:creator-r1-a0-writing-workflow
```

Linux/CI 使用 Playwright Chromium，不要求 Google Chrome 路径。

## 6. CI 与运行证据

PR #9 当前代码实现曾在以下 GitHub Actions run 全绿：

[MVP Creator Checks run 30522525352](https://github.com/jzvcpe-goat/parallel-universe-novel/actions/runs/30522525352)

该 run 包含：

- `Local Creator MVP boundary`
- `Agent action browser boundary`
- `R1-A0 writing workflow`
- `Diff hygiene`
- `Secret scan`

Reviewer 仍应检查 PR 最新 HEAD 的新一轮同名 checks。`R1-A0 writing workflow`
job 必须提供 `r1-a0-writing-workflow-evidence` artifact，其中包含：

```text
creator-decision-workbench.json
creator-decision-workbench.png
```

JSON 至少应满足：

```text
status = pass
gate = R1_A0_WRITING_WORKFLOW_INTEGRATION
questionCount <= 2
candidateCount between 1 and 3
manualRecallAdherence.decision = pass
reviewEvidenceCount > 0
canon.revision = 1
canon.state.characters is not empty
canon.state.world.informationBoundaries is not empty
canon.state.promises is not empty
exactly one publish bundle is author_confirmed
publishReceipts = 0
publicSubmitExecuted = false
```

本地 artifact 位于 `artifacts/`，该目录被 Git 忽略；它不是公共源码，也不能替代
GitHub 对当前 HEAD 生成的 artifact。

## 7. Hard Negative 检查

请特别检查这些反例是否仍被阻断：

1. 作者未确认就采用场景 Candidate。
2. 作者手工修改后，旧 review 或旧 repair 仍可继续生效。
3. 手动召回没有正文证据却返回 `pass`。
4. repair 修改 finding 以外的正文块。
5. repair 没有变化或与 finding/block 不匹配却通过。
6. Canon revision 或 draft revision 冲突时仍提交。
7. 刷新后再次出现 Canon 确认，造成重复 revision。
8. 发布包未由作者确认就公开提交。
9. 私密正文进入普通 Agent operation log。
10. 浏览器脚本通过直接操作 IndexedDB 伪造作者确认。

任一反例成立，应提交 `CHANGES_REQUESTED`。

## 8. 范围与非结论

R1-A0 不包含：

- 数据库 migration、RLS、云端发布事务。
- 支付、部署或生产上线。
- Reader 公开投影调整。
- 自动 RAG 或自研检索实现。
- 多章自动正文生成。
- 文学质量提升结论。

确定性参考 Adapter 只证明工作流编排、安全边界和可重复测试。固定故事种子盲测、
成对比较、具体正文证据和质量结论属于 R1-B。依赖 advisory 分类属于 R1-C。
云端数据库、安全、支付和部署属于团队负责的 R1-D。

## 9. 审阅结论模板

```md
## R1-A0 review at <latest-head>

### Workflow integration
- [ ] One natural-language intent reaches a locked author intent with <= 2 blocking questions.
- [ ] Manual recall enters the persisted Context Snapshot only after author selection.
- [ ] Candidate generation stays candidate-only until author adoption.
- [ ] Review findings and recall adherence have locatable current-manuscript evidence.
- [ ] Local repair is independently checked and only applied after author adoption.

### Canon and publication boundaries
- [ ] Canon requires author confirmation and revision checks.
- [ ] Character, setting-boundary and long-range promise state are evidence-backed.
- [ ] Refresh does not duplicate Canon.
- [ ] Publish bundle reaches author_confirmed without public submission or receipt.

### Engineering evidence
- [ ] PR latest HEAD matches the reviewed checkout.
- [ ] Five GitHub checks are green on that HEAD.
- [ ] R1-A0 JSON and screenshot artifact are downloadable and internally consistent.
- [ ] No database/payment/deployment/Reader projection change is present.

Decision: APPROVED / CHANGES_REQUESTED

Findings:
- <severity> <file:line> <problem> <reproduction> <expected behavior>
```

## 10. 合并门槛

本 handoff 不授权自动合并。只有全部满足后，项目负责人才能决定把 PR 转为 Ready 并合并：

1. ColinLi98 或另一名独立 Reviewer 对 PR 最新 HEAD 提交正式 `APPROVED`。
2. PR 讨论全部 resolved。
3. 五项 CI 在同一最新 HEAD 全绿。
4. 没有 P0/P1 未解决问题。
5. PR 仍保持 R1-A0 范围，没有混入 R1-B/R1-C/R1-D。

任何新 commit 都会改变审阅对象；旧 approval 不应自动覆盖未经复核的新 HEAD。

## 11. 审阅完成后的 Colin 工作包

R1-A0 审阅结束后，Colin 的下一职责见：

```text
docs/reviews/COLINLI98_R1_D_CLOUD_PAYMENT_DEPLOYMENT_HANDOFF_20260730.md
```

R1-D 必须从更新后的 `main` 创建独立分支，不得继续提交到 PR #9。
