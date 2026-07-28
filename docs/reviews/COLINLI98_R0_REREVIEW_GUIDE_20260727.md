# ColinLi98 R0 复审指南

**适用 PR：** [#1 Creator MVP R0](https://github.com/jzvcpe-goat/parallel-universe-novel/pull/1)
**复审对象：** `431f7ca5bbea1ddaad3a55f816f5eed8eff667da`
**状态：** Draft / `CHANGES_REQUESTED` / `BLOCKED`
**目的：** 只核验 ColinLi98 于 2026-07-27 提出的剩余 P1、P2；不在 R0 增加新功能，不把 R1 或云端工作混入本次审阅。

## 1. 复审结论应回答什么

本次复审不需要判断 Creator 是否已经生产上线，也不需要判断文学质量是否已经提升。它只需要回答：

1. Agent 可访问的 `apply_suggestion` 是否只能创建候选采用请求，而不能自己确认、不能写入 Canon。
2. 独立于 Agent 的作者确认控件是否存在，且一次确认只能消费一次 receipt、执行一次采用。
3. R0 公共证据清单是否已对当前审阅基线闭合：所有被列为 R0 证据的文件都有 hash，旧 packet 不再伪装为当前批准依据，依赖审计数字有可复现命令。
4. 当前 PR 是否仍遵守 R0 边界：不含数据库迁移、RLS、支付、部署、私密正文或“质量已经提升”的无证据声明。

若以上任一项不成立，应继续 `CHANGES_REQUESTED`。只有两项都成立且无新的 P0/P1 时，才可给独立批准。

## 2. Colin 第二轮意见与修复映射

| 原意见 | 严重级别 | 当前修复 | 复审文件 |
|---|---:|---|---|
| `apply_suggestion` 申请 receipt 后在同一 Agent 调用内自确认，仍能直接进入 `applyCandidate()` | P1 | Agent 路径现在只结束于 `awaiting_confirmation`；作者控件另行确认并消费 receipt | `app/src/agent-surface/operationFlow.ts`、`app/src/components/creator/workspace/CreatorCommandCandidate.tsx`、`app/src/components/creator/CreatorAppFrame.tsx` |
| 两项公共证据缺 hash；旧 packet 引用不存在的 head；依赖审计数字陈旧 | P2 | hash inventory 升级为 schema v3 并收录两项文件；旧 packet 标记为历史材料；状态账本更新当前 audit 命令和结果 | `docs/reviews/CREATOR_MVP_R0_EVIDENCE_HASHES_20260722.json`、`docs/reviews/CREATOR_MVP_R0_REVIEW_MANIFEST_20260722.md`、`docs/reviews/CREATOR_MVP_CODE_REVIEW_PACKET_20260722.md`、`docs/reviews/CREATOR_MVP_CURRENT_STATUS_LEDGER_20260722.md` |

## 3. P1：候选采用必须由作者独立确认

### 3.1 需要成立的边界

```text
Agent 选择 apply_suggestion
  -> 创建 receipt
  -> 记录 awaiting_confirmation
  -> 停止

作者点击“作者确认采用”
  -> UI 自己的确认回调确认 receipt
  -> 消费一次 receipt
  -> 调用 applyCandidate
  -> 写入成功或失败生命周期
```

以下路径必须不存在：

```text
Agent 调用 apply_suggestion
  -> confirmCreatorAgentConfirmation
  -> applyCandidate
```

这条规则保障“模型只能提出 Candidate；作者确认后才可进入 Canon”。候选本身不是 Canon，候选采用也不能被 manifest 的描述、Agent 的参数或同一次工具调用代替作者手势。

### 3.2 静态代码复核

请在当前 head 检查：

```bash
git show --stat 431f7ca
git show 431f7ca -- app/src/agent-surface/operationFlow.ts
git show 431f7ca -- app/src/components/creator/workspace/CreatorCommandCandidate.tsx
git show 431f7ca -- app/src/components/creator/CreatorAppFrame.tsx
```

预期：

- `executeCreatorCommandCandidateApplyFlow` 返回或记录 `awaiting_confirmation` 后停止；该函数不自行调用 `confirmCreatorAgentConfirmation`。
- 作者确认控件的 slot 是 `creator-author-confirm-candidate`，但该控件没有 `data-agent-action`。
- Agent 仍可选择候选，但只能触发 `apply_suggestion` 的请求阶段。
- 作者确认阶段调用 `confirmCreatorCommandCandidateApplyFlow`，并在确认期间禁用重复点击。
- receipt 被确认并消费后，第二次确认不得再次应用同一候选。

### 3.3 自动化复核

在干净依赖环境运行：

```bash
npm run check:agent-execution
npm run check:agent-surface
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run qa:agent-action-surface
```

浏览器检查的合格条件：

1. Agent 选择候选后，操作日志只能到达 `requested`、`awaiting_confirmation`。
2. 在作者未点击确认前，不得出现 `started`、`succeeded`，也不得调用 `applyCandidate`。
3. 作者点击非 Agent-addressable 的确认控件后，日志才可进入 `started`、`succeeded`。
4. 结果包含 `consumedCandidateConfirmations: 1`；同一 receipt 不能再次生效。

### 3.4 应拒绝批准的 P1 反例

下列任一情况都说明 P1 仍未修复：

- 候选按钮本身既带 `data-agent-action` 又直接调用 `applyCandidate`。
- `apply_suggestion` 的一次调用中确认并消费 receipt。
- 作者确认按钮也可以被 Agent manifest 或 `data-agent-action` 直接定位执行。
- 缺少 pending、mismatched、consumed receipt 的拒绝测试。
- 同一候选/receipt 连续点击能应用两次。

## 4. P2：公共证据必须对当前 R0 语义闭合

### 4.1 当前证据规则

公共证据必须只包含可公开、可重放的契约、固定种子和测试资产；不得包含私密草稿正文、作者工作区、模型运行日志或未发布生成文本。

R0 证据 hash 清单目前采用 schema v3，包含九项已批准证据，其中新增：

```text
scripts/fixtures/creator-frozen-paired-quality-fixture.mts
validation/story_seeds.json
```

`.json` schema 文件是源代码契约，不因其存在就自动成为 R0 evidence。证据范围以 manifest 和 hash inventory 的显式条目为准。

### 4.2 自动化复核

```bash
npm run check:creator-r0-evidence-hashes
git diff --check origin/main...HEAD
npm audit --omit=dev --json
```

预期：

- evidence hash gate 报告 `PASS`，并验证九项文件。
- 清单没有 `Pending final hash`。
- `CREATOR_MVP_CODE_REVIEW_PACKET_20260722.md` 明确为历史/已替代材料，不可作为当前 head 的批准证据。
- 当前依赖审计的原始结果以 `npm audit --omit=dev --json` 为准；截至 2026-07-27 的账本记录为 `8 high / 4 moderate / 2 low / 14 total`。该数字是待分类风险，不是“安全已完成”的声明。

### 4.3 应拒绝批准的 P2 反例

- manifest 或 allowlist 仍把未 hash 文件列为批准证据。
- hash inventory 只覆盖部分声明证据，或 hash 与当前 bytes 不匹配。
- 当前批准文档仍以不存在的 commit/head 表述为事实。
- 用“CI 通过”替代私密文学质量的测量结论。
- 把 `npm audit` 输出解释成已完成 dependency hardening。

## 5. R0 范围复核

R0 是冻结的 Creator MVP 审阅包，允许回归修复和证据更正，不接受新功能。

### R0 包含

- Candidate-first、作者确认、Canon 与发布包的边界。
- localhost-only 写入和私密草稿留在本机的约束。
- 22 维状态、手动召回、独立评价、局部修订的已有契约和测试入口。
- 公共 CI、证据 hash、diff hygiene、secret scan。

### R0 不包含

- 云端数据库 migration、RLS、发布事务、支付、部署或生产运行时。
- 多章自动正文生成或任何未经作者确认的正史写入。
- 将单次测试或静态 gate 表述为“文学质量已提升”。
- 对外部平台自动发布的完成声明。

若本 PR 新增上述排除项，请将对应工作移入 R1-D 或独立团队工作包，而非为求合并混进 R0。

## 6. 复审命令集

```bash
git fetch origin
git switch review/creator-mvp-r0-20260722
git pull --ff-only
git rev-parse HEAD

npm ci --include=optional
npm --prefix app ci --include=optional

npm run check:creator-r0-evidence-hashes
npm run check:agent-execution
npm run check:agent-surface
npm run check:pivot
npm run test:creator:full
npm --prefix app run lint -- --max-warnings=0
npm --prefix app run build:creator
git diff --check origin/main...HEAD
```

可选但建议从含空格或非 ASCII 的 checkout 路径执行 `check:pivot` 和 `test:creator:full`，以回归验证 Colin 第一轮发现的 `fileURLToPath` 路径处理问题。

## 7. 批准、合并和冻结顺序

### 7.1 复审通过的最低条件

1. Colin 或另一名独立协作者对**最新 head**给出 `APPROVED`。
2. PR 中没有未解决讨论。
3. 三项 GitHub CI 在同一最新 head 上全绿：Local Creator MVP boundary、Diff hygiene、Secret scan。
4. PR 从 Draft 切换为 Ready for review。

在任意代码或文档 commit 推送后，旧批准不再覆盖新 head；必须重新核对 approval 和 CI 的 head SHA。

### 7.2 仅在满足 7.1 后执行

```bash
gh pr ready 1
gh pr merge 1 --merge
git fetch origin main --tags
git switch main
git pull --ff-only origin main
git tag -a creator-mvp-r0 -m "Creator MVP R0 approved baseline"
git push origin creator-mvp-r0
```

随后记录：合并 commit SHA、最终 CI run 链接、批准记录、tag SHA，并更新状态账本。

### 7.3 R0 冻结规则

`creator-mvp-r0` 建立后，R0 只接受回归修复。以下工作必须在独立 R1 PR 进行：

- R1-A：作者意图、手动召回、单场景 Candidate、独立审阅、局部修订、人工采用、状态更新、发布包的完整 workflow。
- R1-B：固定故事种子、盲测、成对比较和可定位正文证据；不使用综合文学分数，不宣称质量提升。
- R1-C：逐项分类 dependency advisories，区分生产可达性、开发依赖、可升级项和接受风险项。
- R1-D：团队负责的云端 schema、RLS、发布事务、支付和部署。

## 8. 复审记录模板

```md
## R0 re-review at <latest-head>

### P1 candidate confirmation
- [ ] Agent action stops at awaiting_confirmation.
- [ ] Author-only confirmation control has no data-agent-action.
- [ ] Browser test proves one author confirmation applies once.

### P2 evidence closure
- [ ] Nine public evidence files hash successfully.
- [ ] No pending hash remains in approved inventory.
- [ ] Historical packet is not used as current approval evidence.
- [ ] Dependency snapshot is reproducible and not overclaimed.

### Scope and release gate
- [ ] No DB/payment/deployment/private manuscript was added.
- [ ] CI is green on this head.
- [ ] No unresolved discussion remains.

Decision: APPROVED / CHANGES_REQUESTED
```

## 9. 当前客观状态

- **可靠：** Colin 已完成第二轮审阅，并识别出最后的 P1/P2。
- **可靠：** `431f7ca` 是为处理这两项而推送的后续 head，当前尚未得到基于该 head 的独立批准。
- **可靠：** R0 仍是 Draft、`CHANGES_REQUESTED`、`BLOCKED`；不能合并、不能打 `creator-mvp-r0` tag、不能以 R0 名义开始叠加 R1 功能。
- **不确定：** 复审后是否会发现新的问题，必须以 reviewer 在最新 head 上的正式状态为准。
