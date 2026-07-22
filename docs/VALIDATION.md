# Parallel Universe Novel Validation

## 1. Executive Summary

本轮验证回答的是：当前仓库能否以可重复证据证明普通创作者可以进入候选创作流程、首轮关键追问不超过两个、候选与正史保持隔离，并通过受限工作流发现和局部修复可定位的文本问题。结论是：旧 `/create` 自然语言原型和新 `/creator/editor` 创作决策工作台均有代码与测试证据；V1 的两问意图、候选路径、单场景草稿、证据评价、局部修复、人工确认、本机原子提交和刷新恢复已跑通。真实第 20 章样本完成了 Planner、Architect、Writer、Auditor、Reviser、Observer 和 MiroFish 人物排练链；真实第 1-20 章归档完成了全部 19 个相邻章交接审计、两处内存副本局部修订验证，以及 6 个维度的非相邻长程线程审计和一次召回误判受限纠错。当前仍是原型与工作流证据，不是用户 PMF、专业文学质量、在线商业模式或生产上线证明。

## 2. Target User and Core Job

目标使用者是有故事想法、但不会写复杂提示词，也不熟悉专业写作软件和模型配置的普通创作者。仓库当前把核心任务表达为：用自然语言给出故事种子或从已有草稿/读者回声进入写作，在少量关键选择后得到可比较的叙事路径和单场景候选，由作者决定是否采用、修改或提交。

证据：

- `README.md`：明确描述自然语言故事种子、最多两个追问和 candidate-first 边界。
- `packages/agent-runtime/src/workflows.ts`：旧 `/create` 的 Socratic Create 工作流与候选输出。
- `app/src/apps/creator/routes/CreatorEditorRoute.tsx`：现有 Creator 写作台入口。
- `app/src/features/creator-decision/stateMachine.ts`：两问上限、意图锁定和生成范围约束。
- `docs/product/CREATOR_DECISION_WORKBENCH_V1.md`：新决策工作台的实现边界。

## 3. Product Hypotheses

| 假设 | 当前判断 | 证据边界 |
|---|---|---|
| H1：自然语言入口可以完成首轮创作启动 | 部分支持 | 已退役 `/create` 的 Socratic 工作流仍有代码与测试；V1 决策工作台当前从已有草稿、作品或回声上下文启动，尚未把独立一句话输入整合为当前 Creator 路由入口。 |
| H2：最多两个关键追问能平衡信息补充与流程摩擦 | 流程合同通过 | 10 个固定场景中完整输入为 0 问，其余为 2 问；尚无真实用户摩擦数据。 |
| H3：candidate-first 能保护作者控制权 | 通过 | 生成后 `activeDraftId` 仍为空；采用、修复和正史提交均需独立作者动作。 |
| H4：本地优先足以验证核心流程，但不等于验证在线商业模式 | 通过 | IndexedDB v9、工作区导入导出和本地浏览器 E2E 可复现；未据此声称成本下降或商业上线。 |
| H5：统一 Rubric 可以结构化记录多模型差异 | 方法已就绪 | 已有固定种子、六维 Rubric 和 CSV 模板；暂无真实多模型同题评分记录。 |

## 4. Validation Scope and Non-goals

本轮范围：原型流程、领域状态、候选/正式边界、本地持久化、失败保护、浏览器交互和后续模型输出比较方法。

本轮不证明：真实用户完成率、候选采纳率、留存、文学质量提升、模型优劣、统计显著性、实际成本下降、云端扩容、支付、生产可用性或 PMF。

静态预览或模型服务不可用时必须显示不可用状态或阻断原因。`referenceWritingAgent` 只用于协议与流程参考，不属于真实模型质量样本。

## 5. Test Matrix

| Case ID | 用户输入 | 系统路径 | 预期状态 | 实际状态 | 是否进入正式内容 | 证据路径 | 发现的问题 |
|---|---|---|---|---|---|---|---|
| VAL-01 | 信息完整的一句话场景 | 固定种子 -> 意图 -> 候选 -> 场景候选 | 0 个追问，生成后等待采用 | 离线结构通过；V1 独立一句话 UI 入口未整合 | 否 | `validation/results/reference-flow.json`、`packages/agent-runtime/src/workflows.test.ts` | H1 仍由旧 `/create` 与新工作台分别承担。 |
| VAL-02 | “末班车上发现前任钥匙，想写得难过一点” | 意图发现 -> 两问 -> 锁定 | 不超过两问，补齐选择与读者体验 | 2 问，通过 | 否 | `validation/story_seeds.json`、`validation/results/reference-flow.json` | 尚无真实用户对问题价值的主观反馈。 |
| VAL-03 | 禁火法律与求救目标冲突 | Context -> 硬约束筛选 -> 候选 | 违规候选不得展示 | 3 个展示候选均通过硬约束 | 否 | `app/tests/creator-decision-domain.ts`、`validation/results/reference-flow.json` | 参考适配器只证明规则执行，不证明真实模型能稳定遵守。 |
| VAL-04 | 用户拒绝回答关键追问 | 意图发现 -> 尝试锁定 | 阻断锁定，不生成正文、不写正史 | 通过，抛出 `intent_incomplete` | 否 | `app/tests/creator-decision-offline-validation.ts` | 尚未验证真实用户是否理解阻断文案。 |
| VAL-05 | 用户拒绝一个候选 | 候选列表 -> 拒绝 | 候选标记 rejected，其他路径保留 | 通过 | 否 | `app/tests/creator-decision-workflow.ts` | 跨会话候选偏好学习未实现。 |
| VAL-06 | 用户采用候选后手改正文，再采用局部修复 | 候选 -> 采用 -> 作者编辑 -> 评价 -> 修复 | 不覆盖已有修改，只改证据范围 | 浏览器 E2E 通过 | 仅在最后人工确认后 | `artifacts/qa/creator-decision-workbench/creator-decision-workbench.json` | 参考修复文本仍是确定性模板，不代表文学质量。 |
| VAL-07 | 重复进入同一故事 | 提交 -> 刷新 -> IndexedDB 恢复 | 正文和 canon revision 恢复，不重复确认 | 通过 | 已确认内容保留 | `artifacts/qa/creator-decision-workbench/creator-decision-workbench.json` | 多设备同步不是 V1 范围。 |
| VAL-08 | 本地模型/API 不可用 | Adapter/静态边界 | 不伪造真实生成，显示 blocked/error | 协议错误与静态边界有测试；真实 provider 断线 UI 未完整验证 | 否 | `app/tests/creator-decision-agent-adapter.ts`、`docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md` | 需要真实 provider outage E2E。 |
| VAL-09 | GitHub Pages Reader 静态预览 | `#/create` 或 `#/studio` | 旧创作入口退役并回到 Reader，不出现本地假生成 | 2026-07-14 本地 Pages QA 通过；两条旧路由均重定向 `#/library`，`localFallback: false` | 否 | `scripts/browser-pages-preview-e2e.mjs`、`artifacts/visual-qa/p13-public-pages-e2e-2026-07-14T03-58-24-098Z.png` | 当前公开 Pages 只证明 Reader 静态界面，不提供 Creator 或模型服务。 |
| VAL-10 | 长输入或非法结构化输出 | 长固定种子 / structured adapter | 单场景处理；非法 JSON、超时或 Schema 错误 fail closed | 长种子流程通过；非法输出测试通过 | 否 | `validation/results/reference-flow.json`、`app/tests/creator-decision-agent-adapter.ts` | 尚未做大规模长度、性能和上下文窗口压力测试。 |
| VAL-11 | 真实第 1-20 章相邻交接 | 4 个重叠窗口 -> 连续性 Auditor -> 独立复核 | 19 个交接完整覆盖；每个问题在前后章均有逐字证据 | 17 个交接通过；2 个问题被独立复核确认 | 否 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-campaign-verified-2026-07-16/summary.json` | 只覆盖相邻章，不能替代非相邻伏笔和人物弧光闭合。 |
| VAL-12 | 两个已确认跨章问题 | Reviser -> Repair Auditor -> 内存副本窗口复审 | 只改后章一个块；完整保留无关事实；不自动采用 | 2/2 候选通过；两个窗口复审均为 0 finding；归档未变化 | 否 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-repair-trial-2026-07-16/summary.json` | 证明两处局部问题可修，不代表全书达到专业质量。 |
| VAL-13 | 真实第 1-20 章非相邻因果、状态、承诺、伏笔和人物弧光 | Observer 两次全篇扫描 -> Auditor 逐项复核 | 每次覆盖全部 20 章和指定维度；线程证据可定位；`active` 只作中低置信召回候选 | 最新运行 13/13 条线程通过，4 条 `active`，0 条断裂 finding | 否 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json` | 0 finding 不证明所有线程均被发现或作品达到专业质量。 |
| VAL-14 | 首次长程审计中一条被驳回的状态判断 | 仅驳回线程 -> Observer 受限纠错 -> Auditor 再审 | 不得新增线程/finding，不得改变已通过线程，不得写正文或正史 | `active` 修正为 `progressed`，后续证据定位到第 14 章；1/1 再审通过 | 否 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-thread-reconciliation-2026-07-16/summary.json` | 只证明该次召回误判被纠正，不证明模型永不误判。 |
| VAL-15 | 已独立验证的长程线程卡进入本机记忆与当前 Context | 作者确认导入 -> IndexedDB -> Creator Route 重算 Canon 指纹 -> 正史证据重核 -> 作者手选 -> 路径比较 Context -> 工作区导出/删除/恢复 | 无确认不得写；revision 或逐字证据变化即排除；卡片初始未选；只有手选项进入 Context；不生成正文、不改 Canon、不写云端或发布 | Google Chrome 把真实第 1-20 章账本中的 13 条复核记录写入 schema v10；Route loader 返回 4 张 active 卡，初始全部未选。作者在产品界面显式选择 1 张并刷新，随后锁定意图、比较路径；Context 只包含该 1 张，另外 3 张为 0，第二次刷新后仍恢复。旧 revision 为 0，改动一处原文后降为 3，全删后 13 条及 4 张卡均由本次生成的 v10 工作区包恢复 | 否 | `scripts/browser-verified-long-range-thread-repository.mjs`、`scripts/browser-verified-long-range-thread-real-repository.mts`、`validation/creator-writing/verified-long-range-thread-repository-2026-07-17.json`、`validation/creator-writing/verified-long-range-thread-real-repository-2026-07-17.json`、`validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json` | Repository、Route、真实产品点击和 Context 的闭环已验证；候选比较仍使用确定性 reference Adapter，不证明真实模型文学质量。2026-07-15 旧归档整包的兼容恢复由 VAL-16 单独验证。 |
| VAL-16 | 2026-07-15 真实工作区包迁移至当前 schema v10 | Google Chrome 文件上传 -> 预览 -> 作者确认 -> 当前 schema 规范化 -> 指纹校验 -> Creator 第 20 章恢复 | 旧 Context 只能补为 stale，不得伪造当前指纹；20 章 Canon 块逐章不变；不得生成正文、采用候选、触发第 21 章、写云端或发布 | 1021 条记录确认导入；20 个非空 Canon 章节逐章块哈希一致、每章 3167-4105 个可见字符；25 个旧 Context 恢复为 `policy=0 / legacy-unfingerprinted`；Creator 显示“第 20 章已确认”，第 21 章动作只显示未触发，空 Canon 壳保持为空 | 否 | `scripts/browser-real-workspace-package-migration.mjs`、`validation/creator-writing/real-workspace-package-migration-2026-07-18.json`、`artifacts/visual-qa/real-workspace-package-migration/chapter-20-restored.png` | 证明该真实归档可兼容恢复，不证明所有未知历史版本都可无条件迁移；stale Context 必须由当前编译器重建后才能用于新生成。 |
| VAL-17 | 当前 Context 与 Review 经真实工作区 JSON 导出后仍保持完整性 | Google Chrome 第 20 章对话复审 -> Working Agent -> 本机工作区导出 -> 解包重算 Context 指纹 -> 核对 Review 绑定、正文与 Canon 哈希 | 导出前后 active Context 内容指纹一致；Review 必须绑定该指纹；正文与 Canon 不变；不得进入第 21 章、云端或发布 | 首次真实导出复现 `undefined` 属性导致的指纹漂移；修正 JSON 规范序列化并加入往返测试后，第二次真实导出的保存/重算指纹均为 `context-snapshot-content:430mwb`，Review 精确绑定，3 条结论均有正文定位，正文及 Canon 哈希保持不变 | 否 | `validation/creator-writing/computer-use-chapter-20-context-export-integrity-2026-07-18.json`、`app/tests/creator-conversation-recall.ts`、`artifacts/visual-qa/chapter-20-context-integrity-review-2026-07-18/chapter-20-newest-review-findings-2.png` | 工作区仍保留 2026-07-15 创建的第 21 章空会话/空 Canon 壳；本轮未访问或修改，不能表述为“从未存在第 21 章记录”。该验证不证明稳定文学质量提升。 |
| VAL-18 | 第 20 章 MiroFish 人物卡进入真实召回、独立审阅和局部修订门禁 | Google Chrome 对话排练 -> 作者只保存贺岚卡 -> 手动勾入 Context -> 独立文学审阅 -> 两轮 Reviser/Repair Auditor | 不稳定路由缺少近期场景时应在模型调用前阻断；稳定路由只带作者选中的 3 条记忆；排练卡不得自动改正文/状态/Canon；不合格修订不得进入采用区 | 不稳定路由以 `recent_scene_context_required` 在 Bridge 前阻断；稳定第 20 章恢复正文、Chapter 19 Canon、主角卡和贺岚排练卡。独立审阅找到 1 条保护项和 1 条跨章重复风险；首轮局部修订因目标、事实和权限问题被拒，受限重试保留 8 项事实后仍因把三方报告收窄为一方被拒。最终 0 候选采用、0 正文/Canon 写入 | 否 | `validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json`、`artifacts/visual-qa/computer-use-chapter-20-mirofish-workflow/local-repair-rejected-author-intent.png` | 证明人物卡进入真实工作流和修订门禁失败关闭；本次没有得到合格修订，不能宣称正文已改善或 MiroFish 带来稳定文学增益。 |

已满足一条完整正常路径和至少四条边界/失败路径的可复现要求：VAL-02、VAL-03、VAL-04、VAL-05、VAL-06、VAL-07、VAL-08、VAL-10。

## 6. Model Comparison Rubric

真实模型必须使用同一个 `seed_id`、等价 Context Snapshot、相同场景范围和同一提示版本运行，并分别记录以下维度；不计算综合文学分数。

| 维度 | 1 分 | 3 分 | 5 分 |
|---|---|---|---|
| 指令遵循 | 越过场景范围或忽略禁区 | 主任务完成但漏一项非致命约束 | 范围、必备元素和禁区全部满足 |
| 设定一致性 | 改写正史或人物知识 | 主线一致，有局部偏差 | 正史、时间、人物和信息边界全部一致 |
| 风格延续 | 视角/语体明显冲突 | 大体接近，有模板化表达 | 延续样本特征且不复制原文 |
| 情节推进 | 状态没有变化 | 有行动但后果弱 | 选择、阻力和不可逆后果清楚 |
| 内容冗余 | 大量重复，阻断阅读 | 有可删段落 | 每段承担明确叙事功能 |
| 可采纳性 | 必须整体重写 | 核心可用，需多处修改 | 可直接采用或只需一次局部修复 |

完整定义和典型 Badcase 见 `validation/rubric.md`。记录模板位于 `validation/model_comparison.csv`。当前已有一个第 20 章真实 Working Agent 工作流样本，但没有同题多模型样本或人工盲评分，因此仍不填写模型分数或排名。

## 7. Reproducible Procedure

### 7.1 10 个固定场景的离线流程合同

```bash
npm install
npm run validate:creator-decision-offline
```

检查：`validation/results/reference-flow.json`。应显示 `seedCount: 10`、`twoQuestionCeilingPassed: true`、`candidateFirstPassed: true`、`canonIsolationPassed: true` 和 `directPromptBaselineCompared: true`，同时明确 `comparisonScope: deterministic_reference_flows_only`、`realModelQualityCompared: false`。无法公平比较的状态冲突、作者文本保留率和全文推翻次数保持 `null` 并附原因。

### 7.2 浏览器完整路径

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" \
  npm run qa:creator-decision-workbench
```

脚本会在临时端口启动 Creator QA build，依次执行：两问、意图锁定、三候选、场景候选、人工采用、正文修改、段落保护、证据评价、局部修复、再次评价、正史 Patch、人工确认、IndexedDB 原子提交和刷新恢复。

### 7.3 本地工作区导出/导入

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" \
  npm run qa:workspace-export-import
```

### 7.4 GitHub Pages 静态预览

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" \
  npm run qa:pages-browser
```

预期输出包含 `publicSurface: "reader"`、`retiredCreateRedirect: "#/library"`、`retiredStudioRedirect: "#/library"` 和 `localFallback: false`。这证明旧创作路由不会在静态环境伪造生成，不证明 Creator 或模型服务已上线。

### 7.5 已退役入口保留的自然语言工作流合同

```bash
npm --prefix packages/agent-runtime test
```

该测试验证候选正文、最多两个追问、设定卡和公开投影边界。它不是当前公开 Pages 路由，也不是 V1 决策工作台的浏览器 E2E。

### 7.6 真实模型比较

1. 从 `validation/story_seeds.json` 选择同一个 `seed_id`。
2. 通过待测真实 Adapter 运行，保存原始输入、输出、模型版本和提示版本。
3. 确认输出仍是候选，未写正史。
4. 由评审者按 `validation/rubric.md` 六维独立评分并定位 Badcase。
5. 只把真实记录写入 `validation/model_comparison.csv`。调用失败时写 `blocked`，不填分数。

当前已有一个本机第 20 章工作流记录，位置为 `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-quality-improvement-live-2026-07-15/`。它不是同题多模型比较，因此没有写入模型排名。

### 7.7 第 1-20 章连续性与局部修订试验

先启动本机 Working Agent：

```bash
npm run dev:creator-working-agent
```

再用作者导出的本机工作区运行：

```bash
npm run validate:creator-longform-continuity -- \
  --workspace <workspace.pufw.zip> \
  --outputDir <continuity-output> \
  --work work-arad-wayfarer \
  --from 1 \
  --to 20

npm run validate:creator-continuity-repair -- \
  --workspace <workspace.pufw.zip> \
  --campaignSummary <continuity-output>/summary.json \
  --outputDir <repair-output>
```

连续性脚本强制第 20 章停止线，完整覆盖每个相邻交接，并对首轮问题进行第二次独立证据复核。修订脚本只让通过复核的问题进入 `Reviser -> Repair Auditor`，通过候选仅应用于内存副本后重跑窗口审阅。两个脚本都校验输入归档哈希未变化。

### 7.8 第 1-20 章非相邻长程线程试验

保持同一个本机 Working Agent 运行，再执行：

```bash
npm run validate:creator-long-range-story-threads -- \
  --workspace <workspace.pufw.zip> \
  --outputDir <long-range-output> \
  --work work-arad-wayfarer \
  --from 1 \
  --to 20

npm run validate:creator-long-range-thread-reconciliation -- \
  --sourceSummary <rejected-long-range-output>/summary.json \
  --workspace <workspace.pufw.zip> \
  --outputDir <reconciliation-output>
```

首个脚本分别扫描因果/状态和承诺/弧线，要求两次 pass 都覆盖全部章节，再由独立 Auditor 逐项复核。只有被驳回项可进入一次受限纠错；第二个脚本用于复现该路径，并要求同一工作区哈希、已通过线程完全保留、不得新增线程或 finding。正文、证据引文和线程标签保留在本机临时目录；仓库摘要只写哈希、计数和状态。

### 7.9 第 20 章场景机制重复阻断试验

使用真实第 20 章锁定意图、已选路径和第 19 章人工召回，运行 `Architect -> independent Auditor`。第一次骨架虽然更换了五轴标签，但 Auditor 仍定位到“受限核验、机械险情、近同职责救援、关键调查信息永久失去、保留受限合法入口”的重复拓扑。系统只允许一次 Architect 受限重构；第二次审校仍拒绝后，Planner 生成“权限协商主导 / 限时核验主导 / 关系服从主导”三条作者重决策选项。localhost bridge 最终返回 HTTP `409 author_decision_required`，`requiresAuthorSelection` 为 `true`，`writerInvoked` 为 `false`，没有运行 Writer、没有生成新正文、没有采用候选或提交 Canon。

仓库只保存状态、问题类别、审校结论和本机输入/响应哈希；完整提示、骨架和逐字证据留在本机临时目录。证据见 `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-scene-mechanism-gate-2026-07-16/summary.json`。该结果证明的是重复门禁能够阻止换皮生成，不证明第 20 章已经获得新正文；下一步必须由作者改变至少一个锁定的核心创作条件。

随后补充的确定性领域 fixture 验证了通用选择链：409 决策会保存为可恢复的本地事件；未确认、伪造 option id、旧 decision id 和重复消费均失败关闭；有效选择只生成新的锁定 AuthorIntent revision，把旧 Context、候选、草稿、评价、修复和 Patch 标为 `stale`，并回到 `candidate_search`。新候选中必须有一条完整携带作者选择的五轴签名。

角色管线 fixture 进一步验证了 Architect 的执行边界：初次骨架偏离作者所选五轴时，只允许一次 Architect 修订；修订后精确匹配才进入 Writer。另一条失败夹具让 Architect 连续两次忽略选择，运行时返回 `scene_author_direction_not_honored`，管线只有 Architect/Auditor 四步，没有 Planner 或 Writer。这些通用 fixture 均没有产生真实新正文或 Canon 写入，也不表示作者已经为真实第 20 章选择了任何一项。

正文执行 fixture 继续校验作者方向没有在 Writer 阶段丢失：通过样本运行 `Architect -> Auditor -> Architect -> Auditor -> Writer -> prose Auditor`；五轴语义中的代价轴被拒绝时，管线在首次 prose Auditor 停止，没有第二次 Writer 或整章重写；伪造正文引文仅获得一次 Auditor-only 定位修正，第二次仍无法定位后失败关闭。通过响应还必须把独立 prose Auditor 结果传到应用层，并转换成只含五轴期望值、block、offset 和 hash 的本地回执；fixture 验证回执不含原始引文、诊断和理由，且旧草稿不带回执时仍可解析。三条均是确定性通用夹具，不是第 20 章的新正文或作者选择。

### 7.10 冻结原创单场景真实正文执行试验

为区分“协议夹具通过”和“真实 Working Agent 写作链通过”，仓库提供一个与现有作品、第 20 章及第 21 章都无关的冻结原创场景。运行 `npm run validate:creator-author-direction-prose` 会在本机临时目录启动 localhost bridge，并以真实 `codex` 依次执行 `Architect -> structure Auditor -> Writer -> prose Auditor`。输入固定作者所选五轴为资源压力、协商冲突、职责交付、义务代价和关系变化；不读取真实章节，不替作者选择作品方向。

2026-07-16 的一次真实运行共执行 4 个角色调用和 1 次 Writer，返回 2959 个可见字符，长度与完整结尾门禁通过。独立 prose Auditor 对五个轴和作者选择的调整均给出可在正文逐字定位的证据，因此 HTTP 200 返回候选。仓库只保存输入/正文/证据哈希、字数、角色顺序和门禁结论；完整 prompt、正文和逐字证据在写入摘要后随临时目录删除。该真实运行证明冻结输入的角色管线可执行；应用适配器 fixture 另行证明通过结果能转换为本地证据回执，两类证据不能合并解释为真实用户已经采用候选。该样本不证明普遍文学质量、真实用户采纳率或模型排名。

证据：`validation/creator-ui/author-direction-prose-real-trial-2026-07-16/summary.json`。脱敏与边界检查：`npm run check:creator-author-direction-prose-trial`。

### 7.11 冻结原创单场景同模型匿名对照

运行 `npm run validate:creator-frozen-paired-quality` 会让同一个真实本地 Working Agent 在同一锁定意图、Context Snapshot、人工召回、作者所选场景方向和目标长度下，分别执行 `direct Writer` 与 `Architect -> structure Auditor -> Writer -> prose Auditor`。生成顺序随机，比较前再随机映射为 Candidate A/B；首轮文学 Auditor 和第二名独立复核者都看不到生成路径。两名 Auditor 分别检查连续性、张力、信息控制、人物能动性、声线、新鲜度、题材兑现、重复、解释负担、场景细节和节奏，不计算综合文学分，也不宣布总赢家。

2026-07-16 的最新真实运行生成 3004 与 3243 个可见字符，两条候选都通过完整结尾和硬约束门禁；工作流候选携带最终正文的五轴方向回执。第二名独立 Auditor 确认：工作流在张力、人物能动性和题材兑现 3 个维度占优，直接 Writer 在声线、重复、解释负担和节奏 4 个维度占优，连续性、信息控制、新鲜度和现场细节 4 个维度平局。此前一次同输入重跑中，工作流候选被两名 Auditor 确认为连续性硬失败；当时摘要只记录 `continuity`，无法区分遗漏因果后果与违背正史。运行时因此新增硬约束原因码，并要求第二名 Auditor 原样确认状态、违规类型和原因；最新样本两边均为 `none / no_violation`。信息边界改为“可观察证据 -> 有限推断 -> 保留未知”并增加独立结构审阅后，最新样本的信息控制由先前确认工作流较弱变为平局，但单次变化不能证明稳定提升。两条候选均未采用，正文、A/B 明文映射、逐字评价和诊断只存在于本机临时目录，汇总后删除。

证据：`validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json`。脱敏与边界检查：`npm run check:creator-frozen-paired-quality-trial`。

### 7.12 冻结原创三场景同模型匿名 campaign

运行 `npm run validate:creator-frozen-paired-quality-campaign` 会按顺序对资源协商、环境撤退和信息潜入三个互不共享情节的冻结原创场景执行 7.11 的完整对照。三个场景分别锁定不同的压力源、冲突发动机、人物能动姿态、代价和结尾模式；每场都有因果、人物知识和时间线人工召回。聚合只统计第二名 Auditor 已确认的逐维偏好和原因码，不保存正文、A/B 明文映射、逐字证据、诊断或综合分。

2026-07-16 的真实 campaign 中，直接 Writer 长度为 3160、2814、2859，Architect/Writer 工作流长度为 3017、3072、2976，均满足 2700-3400 可见字符门禁并有完整结尾。工作流在张力、人物能动性、类型兑现和现场细节四项均为 3/3 占优；连续性为 3 场平局；信息控制为 2 场平局、1 场首轮判断被独立复核拒绝。声线为工作流 2 场、直接 Writer 1 场；新鲜度为直接 Writer 1 场、2 场平局；重复和解释负担各为双方 1 场、1 场被拒绝；节奏为工作流 2 场、直接 Writer 1 场。两条路径硬约束均为 3/3 通过。工作流自身没有同一已确认败因跨两个场景重复，因此没有依据单次输项修改角色提示。

证据：`validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json`。逐子凭证、脱敏、公平性和不写入检查：`npm run check:creator-frozen-paired-quality-campaign`。跨种子调优资格由 `app/src/features/creator-decision/pairedQualityCampaign.ts` 计算并由 checker 独立重算：文学败因至少跨两个不同 fixture 才要求人工审查，单个工作流硬失败立即要求审查，`automaticPromptMutationAllowed` 恒为 `false`。当前结果为 `hold_current_workflow / no_repeated_workflow_weakness`。三场仍不足以证明跨题材稳定性、模型排名或统计性文学提升，也不能替代专业作者/编辑盲评。

### 7.13 冻结原创六场景文学审阅与局部修订 campaign

运行 `npm run validate:creator-frozen-paired-quality-literary-repair-campaign` 会复用 7.12 的三个原始子凭证，并对三个新增冻结原创场景执行完整的 Architect/Writer 路径、11 维文学审阅、最多两轮单块局部修订、独立 Repair Auditor，以及与 direct Writer 的匿名双 Auditor 对照。文学审阅 finding 必须逐字定位最终正文；若且仅若首轮结果因证据无法定位而失败，同一 Auditor 角色可执行一次 `literary_review_revision`，只能修正或删除无效 finding，不能新增问题、提高严重度或置信度、修改正文、采用候选、写正史、打开下一章或发布。第二次仍无法定位时失败关闭。

三个新增场景的工作流最终长度为 3105、2916 和 3007 个可见字符；每场最多采用两个局部修订候选，共 6 次，6/6 通过各自独立 Repair Auditor。修订分别覆盖节奏、重复和解释负担问题，未进行整章重写，也未覆盖作者文字。这里的“采用”只表示试验运行器把已复核的局部候选应用到匿名比较副本，不表示真实作者采用、正史写入或公开发布。

六场聚合结果为：连续性 6 场平局；工作流在张力和现场细节各 5 场占优，在声线、类型兑现和节奏各 4 场占优；人物能动性、新鲜度和重复各 3 场占优；信息控制 2 场占优、3 场平局、1 场首轮判断被复核拒绝。direct Writer 在节奏和重复各 2 场占优，其余维度也保留逐项负结果。两条路径硬约束均为 6/6 通过。工作流的 `language_repetitive` 与 `pacing_overextended` 各跨两个不同 fixture 重复，因此领域判定变为 `review_workflow_change / repeated_workflow_weakness`；`automaticPromptMutationAllowed` 仍为 `false`，不能根据模型自评自动改提示词。

证据：`validation/creator-ui/frozen-paired-quality-six-seed-literary-repair-rerun-2026-07-16/summary.json`。完整子凭证、边界、重用来源、局部修订轮数和聚合重算由 `npm run check:creator-frozen-paired-quality-literary-repair-campaign` 验证。该 campaign 没有保存原始正文、盲评映射或逐字诊断，没有读取或修改第 20/21 章，没有候选采纳、Canon 写入、云端写入或发布。六个模型审阅样本仍不能证明统计性文学提升，也不能替代专业作者/编辑盲评。

### 7.14 段落经济性边界跟进重跑

7.13 暴露出 `language_repetitive` 与 `pacing_overextended` 各跨两个 fixture 重复。经人工审查后，Writer 和文学 Auditor 增加静态“段落经济性边界”：除必要停顿外，每段应推进行动、信息、关系或代价；连续段落不能只换说法重复同一事实、情绪、决定或压力；Architect 的 causalChain 不能被逐项展开成镜头清单。该改动写在源码并由角色 fixture 与工作台 gate 固定，不由模型自动生成，也不允许 campaign 自动改 prompt。

跟进 campaign 复用前三个原始子凭证作为哈希一致的锚点，只重新运行玻璃肺耐力、档案庭拒绝和闸门牺牲三个扩展场景。档案庭场景此前在重复和节奏均偏好 direct Writer；新运行在完成解释负担与重复两次单块修订后，这两项及节奏均偏好工作流。闸门场景的节奏偏好工作流，重复首轮判断被第二 Auditor 拒绝；玻璃肺场景的重复偏好工作流，但节奏仍偏好 direct Writer。三个新场景分别执行 0、2、2 次局部修订，所有实际执行的 4 次修订均通过独立 Repair Auditor，没有整章重写。

六凭证混合聚合中，连续性仍为 6/6 平局，两条路径硬约束仍为 6/6 通过。工作流在张力 4 场、人物能动性 4 场、声线 4 场、类型兑现 5 场、现场细节 5 场和节奏 4 场获偏好。`language_repetitive` 不再跨场景重复，但 `pacing_overextended` 仍出现在信息潜入旧锚点与玻璃肺新场景，`voice_flattened` 出现在资源协商旧锚点与档案庭新场景。因此领域判定仍为 `review_workflow_change / repeated_workflow_weakness`，不能自动推广或自动改 prompt。

证据：`validation/creator-ui/frozen-paired-quality-six-seed-prose-economy-rerun-2026-07-17/summary.json`；复算命令：`npm run check:creator-frozen-paired-quality-prose-economy-campaign`。运行中一次文学 Auditor 超时和一次结构审阅证据二次无法定位都严格失败关闭；随后只各人工重跑一次。由于前三个场景没有按新 prompt 重跑、模型采样非确定且没有专业人类盲评，结果只能支持继续人工审查，不能证明段落经济性边界稳定提升文学质量。局部修订会删除旧方向回执，修订后候选仍需重新执行五轴方向审阅，匿名比较不构成可采用门禁。

### 7.15 作者指定文学审阅重点

`WritingAgent.reviewDraft` 与 `CreationDecisionWorkflow.reviewDraft` 现在接受可选的 `focusDimensions`。合法值只能来自既有 11 维文学注册表；本地 Working Agent 将其作为 Auditor 的检查优先级，并把规范化结果保存为 `requestedFocusDimensions`。指定重点不减少连续性、知识边界和其他硬约束检查，不要求最低 finding 数量，也不能由上一次 campaign 的弱点自动选择。验证凭证固定记录 `reviewFocusSource: human_specified` 和 `automaticFocusSelectionPerformed: false`。

一次冻结原创“玻璃肺耐力”真实运行由人工指定 `pacing,voice`。Auditor 在两维各返回 1 条可逐字定位的非自动修订 finding，`actionableFindingCount` 为 0，因此没有启动 Reviser；direct Writer 与工作流候选分别为 2936 和 2952 个可见字符，两边硬约束均通过。该结果证明重点参数真实进入审阅且不会为了重点强制改文，不证明文本质量普遍提升。

失败证据同样保留在结论中：玻璃肺首次运行在匿名比较阶段因 `pacing:candidate_b` 证据块无法定位而失败关闭，随后只人工重跑一次成功；档案庭首次运行因 Auditor 拒绝后 Reviser 返回未变化候选而失败，唯一人工重跑又因场景重决策返回未知问题码而失败。没有第三次重跑，也没有执行第 6 场，因此不存在“重点审阅六场 campaign 完成”的结论。

成功凭证：`validation/creator-ui/frozen-paired-quality-six-seed-focused-review-rerun-2026-07-17/trials/04-frozen-original-glass-lung-endurance-v1.json`；复算命令：`npm run check:creator-frozen-paired-quality-focused-review-trial`。凭证未保存原始正文、盲评映射或逐字诊断，没有读取或修改第 20/21 章，没有候选采纳、Canon、云端写入或发布。

### 7.16 文学修订失败隔离与场景选项问题码纠正

7.15 的失败样本暴露出两个编排问题。第一，局部 Reviser 在 Auditor 拒绝后若返回与被拒绝候选相同的修订，整次匿名评价会中断。现在 `executeBoundedOptionalLocalRepair` 把初始修订失败、独立审阅失败、Auditor 指导修订失败分别记录为未应用状态，原候选保持不变并可继续评价；失败修订不会被当作通过或写回正文。故障注入覆盖初始失败、独立审阅不可用、修订不变化和二次审阅通过，命令为 `npx tsx scripts/test-frozen-paired-quality-local-repair.mts`。

第二，场景重决策选项可能生成 Schema 合法、但不属于两轮独立审校的 `addressesIssueCodes`。运行时现在把真实代码集合明确传给同一 Planner，只允许一次语义纠正；纠正不能新增问题、事实、正文或作者选择。fixture 证明首次未知码可被纠正为 `superficial_difference` 并返回 `409 author_decision_required`，全程无 Writer；持续返回未知码的 fixture 在第二个 Planner 回合后失败关闭，同样无 Writer。命令为 `npm run test:creator-working-agent-roles`。

这些测试使用确定性故障注入，没有重跑档案庭真实场景，也没有新增真实文学质量样本。它们证明失败隔离和边界成立，不证明文本质量已提升。测试没有读取或修改第 20/21 章，没有作者选择、候选采用、人物卡保存、Canon、云端写入或发布。

### 7.17 匿名比较证据纠正完整性

7.15 的玻璃肺首次运行还暴露出匿名比较证据无法定位。代码原本已有一个 Auditor 纠正回合，但领域校验只抛出首个无效 block id，并会把所有 `CreationDecisionError` 都交给模型尝试纠正。现在领域函数 `pairedLiteraryComparisonEvidenceIssues` 会一次枚举 11 个维度和两个硬约束项中的全部无效 Candidate A/B block id；Adapter 仅在错误码严格等于 `evidence_missing` 时调用 `paired_literary_comparison_revision`。维度顺序、候选顺序、原因码语义和 comparison identity 等非证据错误直接失败关闭，不能让模型把合同错误修成另一种判断。

确定性 Adapter 测试让首轮结果同时包含两个无效 block id，证明第二次请求收到完整两项清单且修订后通过；另一条 fixture 使用错误维度顺序，证明只产生一次请求、不会启动纠正。命令为 `npm run test:creator-paired-literary-comparison`。原玻璃肺场景没有再次运行，因此这里只证明纠正输入完整和边界收紧，不证明该真实失败已经恢复，也不增加文学质量样本。

同一测试还覆盖第二名独立复核 Auditor：复核结果同时引用两条无效证据时，`paired_literary_comparison_verification_revision` 只获得受影响候选侧的完整问题清单。领域断言冻结每项 `decision`、`confirmedPreference`、`confirmedReasonCode` 以及硬约束状态、违规类型和原因码；尝试借纠正改变文学判断会失败。非证据复核错误不会启动纠正，第二次证据仍无效也会关闭。该回合不会替代第二名 Auditor 的独立性，只修其证据定位。

2026-07-18 又在 `frozen-original-glass-lung-endurance-v1` 上执行一次显式、测试专用的真实故障注入。桥接层只在 `PUF_CREATOR_TEST_INJECT_PAIRED_VERIFICATION_EVIDENCE_FAILURE=1` 且非生产环境时，把第二 Auditor 首轮复核中 `continuity` 的一个 Candidate A block id 替换为不存在的值，并单独留下不含正文的注入回执；decision、偏好、原因码和硬约束语义均未改。完整流程共执行 16 次真实 Working Agent 调用，领域层拒绝坏证据后恰好执行一次 `paired_literary_comparison_verification_revision`，随后完成独立复核。两个候选分别为 2711 与 2721 个可见字符，结尾完整；局部 exposition 修订通过效果与作者方向复核，但匿名逐维结果仍是混合判断，未声明综合赢家，也不能据此声称稳定文学提升。没有读取或修改第 20/21 章、采用候选、写 Repository/Canon、写云端或发布。证据：`validation/creator-ui/frozen-paired-quality-verifier-evidence-revision-real-trial-2026-07-18/summary.json`；检查命令：`npm run check:creator-paired-verification-revision-real-trial`。

### 7.18 第六冻结场景失败、结构审阅收紧与原场景重跑

2026-07-17 对尚未运行的 `frozen-original-floodgate-sacrifice-v1` 做了一次真实 Working Agent 尝试，人工指定审阅重点为 `pacing,voice`。运行在 Writer 前的结构审阅阶段终止，最终错误为 `scene_architecture_review_architecture_evidence_missing`：原实现虽然允许同一 Auditor 做一次证据纠正，但只传首个错误字符串，而且没有冻结纠正前后的文学/结构判断；纠正结果再次返回无法定位的架构证据。该次运行没有生成 `summary.json`，没有匿名比较、文学结论、正文采用、正史写入、公开发布或第 21 章访问，也没有重跑。

随后运行时改为一次枚举全部 `executionQualityChecks.architectureEvidence`、`issues.architectureEvidence` 和 `issues.recentSceneEvidence` 错误引用，并同时提供从当前场景骨架与近期场景 summary/signature 确定性抽取的 path/value 证据目录。纠正只能从问题要求的来源目录选择完整 value，不能重新抄写、截断或拼接；运行时会以 `scene_architecture_review_evidence_revision_catalog_mismatch` 拒绝目录外引用。只有错误码精确为结构审阅证据缺失时可进入一次纠正；顶层 decision、五轴判断、信息边界、执行质量 decision/diagnosis、问题数量/顺序/code/axis/diagnosis、rationale 和所有未受影响证据均被冻结。确定性角色夹具证明：三处同时错误可完整传给同一 Auditor 并从目录修复；纠正时偷改 decision 会以 `scene_architecture_review_evidence_revision_semantic_change` 关闭；第二次仍返回目录外证据会以 `scene_architecture_review_evidence_revision_catalog_mismatch` 关闭；后两条路径均停在 Writer 前。命令为 `node scripts/test-creator-working-agent-role-pipeline.mjs`。

2026-07-18 使用同一个 `frozen-original-floodgate-sacrifice-v1` 和同样的人工重点 `pacing,voice` 重跑原失败场景。完整流程执行 30 次真实 Working Agent 调用：结构 Auditor 首轮后触发一次 Architect 修订，第二次结构审阅通过并进入 Writer；两个候选分别为 2831 和 3014 个可见字符，结尾完整。工作流的两次单块修订虽经 Reviser 和独立 Repair Auditor 通过，但修后文学复核仍检测到目标维度问题，因此全部以 `reverted_target_dimension_persisted` 回退，`appliedRepairCount=0`。匿名独立复核确认工作流在信息控制、新鲜度和解释负担上占优，但在张力、声线、类型兑现、重复与节奏上偏好 Direct Writer；连续性首轮偏好和工作流硬约束首轮失败均被第二 Auditor 驳回。该回执证明原结构证据失败已在真实调用中恢复，不证明工作流文学质量稳定提升。没有采用候选、修改 Repository/Canon、读取第 20/21 章、写云端或发布。证据：`validation/creator-ui/frozen-paired-quality-floodgate-structure-review-rerun-2026-07-18/summary.json`；检查命令：`npm run check:creator-floodgate-structure-review-rerun`。

### 7.19 声线试验负结果与局部修订预算继续

针对六场聚合中跨场景重复的 `voice_flattened`，先人工加入了一份从现有角色卡与 22 维状态摘取的 Writer 声线证据视图，并在 `frozen-original-archive-tribunal-refusal-v1` 上指定 `voice,pacing` 做一次真实复跑。该次运行完成 12 次本机角色调用；工作流候选 2997 字，文学审阅定位 1 条 voice finding 和 1 条 continuity hard block。hard block 的两次单块候选均被 Repair Auditor 拒绝，旧循环随即停止，voice finding 未进入 Reviser。匿名双审仍以 `voice_flattened` 偏好直接 Writer；节奏维度则偏好工作流。证据为 `validation/creator-ui/frozen-paired-quality-character-voice-evidence-archive-2026-07-17/summary.json`。

这一结果暴露的是修订调度缺陷，而不是声线提升。运行时随后保留失败候选和失败 disposition，但不再让一个 finding 的失败吞掉整个两轮预算；同一 finding 已被记录为 attempted，下一轮只能处理另一个可定位问题。故障注入覆盖初始 Reviser 失败、独立 Auditor 不可用、Auditor 指导修订失败、明确 reject、长度/结尾越界和成功应用，失败路径都继续使用未修改候选。

同一冻结场景再做一次明确标注的调度跟进。该次完成 16 次本机角色调用、2 次文学审阅：voice 单块修订经两次 Reviser 和独立 Auditor 后应用；第二个 repetition 候选虽然审校通过，但因正文长度/结尾合同被丢弃。最终方向回执按规则失效，不能直接采用。匿名双审仍以 `voice_flattened` 偏好直接 Writer，并以 `pacing_overextended` 偏好直接 Writer；两条路径硬约束均通过。因此声线证据提示没有晋升为默认能力并已从运行时回滚；保留的是经真实调用证明可工作的“失败后继续下一个 finding”调度。证据为 `validation/creator-ui/frozen-paired-quality-character-voice-repair-followup-archive-2026-07-17/summary.json`。两次样本均未读取真实章节、采用正文、写正史、访问第 21 章或发布。

### 7.20 局部修订后的文学效果复核

7.19 的真实负结果说明 Repair Auditor 的 `pass` 只证明替换块保持了列明事实、范围和连续性，不能证明目标文学问题从全文消失。质量试验运行器现会在长度与完整结尾门禁之后，对内存中的修订候选执行一次独立全文文学复核；若同一目标维度仍存在 active `hard_block` 或 `revision_candidate`，修订不会保留，而是记录 `reverted_target_dimension_persisted` 并继续使用修订前候选。通过时该复核结果直接复用为下一轮审阅，避免重复调用。`scripts/test-frozen-paired-quality-local-repair.mts` 已覆盖目标维度仍活跃时回退、只有其他维度问题时保留，以及所有既有失败隔离路径。

同一 archive-tribunal 冻结场景随后做了一次受控真实复跑，共 16 次本机角色调用、4 次文学审阅，其中 2 次为修后效果复核。节奏替换已通过事实保持审校，但修后仍有 1 条 active 节奏 finding，因此被回退；声线替换修后为 0 条 active 声线 finding，才被保留。最终匿名双审偏好工作流的声线，仍以 `pacing_overextended` 偏好直接 Writer；两条路径硬约束均通过。证据为 `validation/creator-ui/frozen-paired-quality-post-repair-efficacy-archive-2026-07-17/summary.json`。本次没有读取真实章节、采用候选、写入 Repository/Canon、访问第 20/21 章、修改云端或发布。该单次随机生成样本只证明效果门禁真实执行，不能把声线偏好归因于这一项改动，也不能证明跨场景文学提升。

### 7.21 局部修订后的作者方向复核

7.20 保留声线修订后，旧方向回执按正文 revision 规则失效，说明“目标文学维度已改善”仍不足以让修后候选进入作者采用门禁。运行时现复用同一份五轴正文 Auditor 合同，新增独立的 `scene_author_direction_draft_review` 操作：只读取锁定意图和修后正文，逐项核验 pressureSource、conflictEngine、agencyPattern、costPattern、endingPattern 与 `proposedAdjustment`，通过后把逐字证据重新映射为 block/offset/hash 回执。拒绝记录 `reverted_author_direction_not_retained`，调用或证据映射失败则失败关闭，均继续使用修订前候选。角色夹具已证明该独立操作的 pass/reject 都只调用 Auditor、`canonCommitAllowed=false`。

同一 archive-tribunal 冻结场景随后进行一次真实复跑，共 15 次本机角色调用、4 次文学审阅和 2 次修后效果复核。两次修订分别针对 continuity 与 repetition，但目标维度复核后各仍有 1 条 active finding，因此均记录 `reverted_target_dimension_persisted`；`postRepairDirectionReviewCount=0`，新增方向复核没有被越级调用。候选正文没有改变，所以初始五轴方向回执仍有效，`finalDirectionReceiptRetained=true`。最终匿名双审在声线维度以 `voice_flattened` 偏好直接 Writer，在节奏维度以 `pacing_overextended` 偏好工作流，两条路径硬约束均通过。证据为 `validation/creator-ui/frozen-paired-quality-post-repair-direction-review-archive-2026-07-17/summary.json`。该次运行证明前置门禁次序和未触达行为，不证明修后方向回执已被真实模型重建，也不证明文学提升。

### 7.22 作者重点进入局部修订调度

7.21 的真实收据还显示：操作者指定 `voice,pacing`，但两轮修订依次落在 continuity 与 repetition。continuity 是 hard block，优先处理正确；repetition 与重点维度同属普通可修订问题时，旧排序仍按固定维度和置信度运行，说明重点只影响了审阅提示和记录，没有完整影响后续动作。调度器现固定为“hard block -> 作者 focus 顺序 -> 置信度 -> 默认维度顺序”。确定性测试覆盖：低置信 hard block 仍高于重点普通问题；重点 voice 高于非重点 high-confidence repetition；多个重点遵守作者给定顺序；无重点时保持旧顺序。本轮不重跑随机真实样本，因此只证明调度规则，不宣称声线或节奏已改善。

### 7.23 单章文学 finding 的独立语义复核

7.21 的真实样本中，首名文学 Auditor 提出的 continuity hard block 直接占用了第一轮局部修订预算，而最终匿名双审又确认两条路径的连续性硬约束均通过。两次审阅的任务和上下文不同，不能据此判定其中一次错误；但它暴露出单名模型 Auditor 的高风险 finding 不应仅凭引文可定位就直接驱动有限修订预算。现在，模型提出且证据可定位的 `hard_block` 与 `revision_candidate` 会进入第二名独立 Auditor 的 `literary_review_verification`：逐条只能 `verify` 或 `reject`，finding id、维度、严重度、位置和证据块均冻结，不能新增 finding、使用综合文学分数、修改正文或触发任何写入。被驳回的模型 finding 在局部修订调度前移除；确定性规则产生的 finding 不交给模型复核，仍保持权威。

领域测试覆盖确认、驳回、篡改维度和跨证据块引用；Adapter 测试覆盖“证据修正后再语义复核”、驳回后不进入修订，以及第二次证据错误失败关闭；角色管线证明该操作和唯一 schema 修复回合都只使用 Auditor。回执只保存 verified/rejected id，不保留原始复核文本。

随后对 archive-tribunal 冻结场景只运行一次真实样本，共 19 次本机角色调用、3 次文学审阅和 3 次独立 finding 复核；第二 Auditor 确认 7 条、驳回 1 条模型 finding。作者重点为 `voice,pacing`，两轮局部修订分别针对 voice 与 pacing：voice 候选被事实/连续性 Auditor 拒绝，pacing 候选虽通过局部审校但全文复核仍有 1 条 active pacing finding，因此两轮均未保留，`appliedRepairCount=0`。匿名双审偏好工作流的连续性、信息控制、人物能动性、新鲜度、现场细节和节奏，偏好直接 Writer 的张力、类型兑现和重复，声线持平，解释负担首轮偏好被复核驳回；工作流硬约束通过，直接 Writer 被确认违反一项显式硬约束。证据为 `validation/creator-ui/frozen-paired-quality-literary-finding-verification-archive-2026-07-17/summary.json`。这次样本证明独立复核真实执行并能驳回 finding，不证明第二名 Auditor 必然正确、修订有效、整体文学质量提升或统计优势。

### 7.24 修后作者方向回执的隔离真实验证

整条随机质量试验仍没有修订候选同时通过“局部事实保持 -> 目标文学维度消失 -> 作者方向仍成立”三道门禁，因此不能靠反复重跑去碰一个通过样本。为单独验证最后一段能力，新增冻结原创 bounded-repair 夹具：五个正文块只替换其中一个，修后正文交给真实 `scene_author_direction_draft_review` Auditor，应用再使用生产映射函数把逐字证据重建为当前块的 offset/hash 回执。唯一一次运行通过：五个机制轴全部有可定位证据，作者调整有 3 条可定位证据，生成 `scene-draft-direction-receipt.v1`，所有证据都映射到修后块；只有 1 次 Auditor 调用，`canonCommitAllowed=false`。

证据为 `validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json`；复算命令为 `npm run check:creator-post-repair-direction-receipt-trial -- --require-pass`。收据不保存修前/修后正文、逐字证据或原始审阅，且 Repository、候选采用、Canon、第 20/21 章、云端和发布边界全部为 false。这证明“已有合格修后候选时，真实方向复核与回执重建可执行”，不证明自动局部修订已稳定通过前两道门禁，也不证明文学质量提升。

### 7.25 修后效果证据驱动的单次重试

此前多次真实样本出现“局部候选通过事实保持审校，但全文复核仍发现同一文学维度问题”。旧流程只能回退，无法使用这份更新、更精确的逐字证据。质量运行器现允许每个外层 finding 最多一次效果复核引导重试：新 finding 必须与原目标同维度、处于 active hard/revision 状态、非低置信、只引用一个未保护块；重试只执行一次 Reviser 和一次独立 Repair Auditor，不再允许 Auditor 引导第三版。重试后重新检查长度、完整结尾、全文目标维度和作者方向；任一步失败、拒绝或目标仍存在，都恢复进入该外层 finding 前的候选。

确定性测试证明跨维度、受保护、多块或低置信 finding 不能触发重试，并覆盖单次 Reviser/Auditor 的通过、拒绝与失败关闭。随后只对 archive-tribunal 冻结场景运行一次真实样本；本次首轮 exposition 修订已经依次通过 Repair Auditor、全文效果复核和作者方向复核，因此 `efficacyGuidedRetryCount=0`，正确没有越级调用重试。最终工作流候选保留修订和方向回执，但匿名双审仍偏好直接 Writer 的重复、解释负担和节奏；两条路径硬约束均通过。证据为 `validation/creator-ui/frozen-paired-quality-efficacy-guided-retry-archive-2026-07-17/summary.json`。该次运行证明新逻辑没有破坏正常成功路径，不证明效果引导重试已被真实模型触发，也不证明整体文学提升。

### 7.26 效果引导重试的隔离真实触发尝试

为避免反复运行随机正文去碰触发条件，新增一个 2842 字符的冻结原创夹具，在三个未保护块中放置同一段可定位重复：第一次局部修订只处理一个块，完整复核应在剩余两个块中继续定位 `repetition`，从而触发一次且仅一次同维度重试。脚本使用真实本机 Working Agent、Reviser、Repair Auditor、全文文学 Auditor、独立 finding Auditor 和作者方向 Auditor；收据只允许保存哈希、计数、角色操作和边界，不保存正文、引文或诊断。

首次真实尝试在第一次局部候选通过审校、准备应用到内存草稿时以 `draft_revision_conflict` 终止。复核确认不是运行时 `LiteraryReview` 版本语义错误，而是新夹具把缺少 `currentDraftRevision` 的精简 session 强转为完整 `CreationSession`，令草稿 revision 变为非有限值。脚本随后改为构造完整 session、显式固定 `baseDraftRevision=0`，并断言草稿版本为整数且从 0 递增到 1；回归测试进一步证明 review 与 repair proposal 都绑定当前草稿版本 1，且能应用到版本 1。失败凭证保留在 `validation/creator-ui/efficacy-guided-repair-real-trial-2026-07-17/failed-attempt.json`。

修正后只进行了一次真实重跑。冻结原创夹具 2842 个可见字符，人工植入同一重复块 3 次；运行完成 10 次本机角色调用。首轮修订经过两次 Reviser 和两次局部 Repair Auditor 后通过，全文文学复核仍确认 1 条 active repetition finding，因此按同一维度、单证据块、非保护块规则触发一次效果引导重试。重试的 Reviser 与 Repair Auditor 均执行成功，但第二次全文文学复核确认 2 条 active repetition finding，系统因此回退冻结原候选，且没有越级运行作者方向复核。凭证为 `validation/creator-ui/efficacy-guided-repair-real-trial-rerun-2026-07-17/summary.json`；复算命令为 `npm run check:creator-efficacy-guided-repair-trial -- --evidence validation/creator-ui/efficacy-guided-repair-real-trial-rerun-2026-07-17/summary.json --require-trigger`。该负结果证明效果引导重试和恶化回退在真实模型链中可执行，不证明局部修订提升文学质量；没有读取真实章节、采用候选、写 Repository/Canon、访问第 20/21 章、写云端或发布。

该负样本进一步暴露出重试上下文不足：旧重试仍以普通 `initial` 修订身份调用，只向 Reviser 和 Repair Auditor提供目标块与相邻块，因此它们不能检查重复是否被迁移到同章更远位置。运行时现新增独立的 `efficacy_retry` 修订身份。只有该身份会把同章其余块作为只读 `chapterComparisonBlocks`，并把当前同维度 active findings 作为 `sameDimensionFindings` 同时交给 Reviser 与独立 Repair Auditor；对 repetition，候选必须产生新的行动、信息、关系或已付代价变化，不能只换词复述，也不能把问题迁移到别块。普通局部修订仍只读取目标块和邻块。纯函数、Adapter payload、真实 prompt 与角色管线回归均已通过；强化后没有再次运行模型，因此不得声称重复修订效果已经改善。

随后只对强化后的上下文合同运行一次同夹具真实样本。该次完成 8 次本机角色调用：首次修订后全文文学复核确认 2 条 active repetition findings，旧选择器仍挑其中一条进入 `efficacy_retry`；重试后仍为 2 条，系统回退原候选且没有运行方向复核。凭证为 `validation/creator-ui/efficacy-guided-repair-chapter-context-rerun-2026-07-17/summary.json`。这说明扩大比较上下文没有让本次问题继续增加，但单样本不能证明是上下文合同造成，也没有清除目标维度。更重要的是，它暴露出单块重试的范围错误：当同一维度已有多个 active findings 时，一次局部替换不可能承诺清零整个维度。选择器现要求同维度恰好只有一个 active hard/revision finding，且该 finding 只能定位一个非保护块；多个位置、跨块、受保护或低置信问题均不再触发效果重试，直接回退原候选。确定性测试和完整角色管线已通过；该选择器收紧后没有再次运行模型。

### 7.27 统一候选质量门禁

此前 Canon Patch 路径会检查 hard block、确定性违规、Patch revision 和正文证据，但这些判断分散在 Workflow 与 Repository，且没有统一证明 LiteraryReview 对应当前正文，也没有在作者已经锁定五轴方向时要求当前 revision 的方向回执。现在 `candidateQualityGate.ts` 形成纯领域组合门禁，并同时接入 `proposeCanonPatch` 与 `validateCanonCommit`：意图必须锁定且 revision 一致，draft/review 必须是 session 当前对象，review 必须指向当前 draft revision；active hard block、active revision candidate、确定性违规或绑定当前 review/draft revision 且仍为 `proposed` 的局部修订都会阻断；存在 `sceneMechanismDirection` 时，五个轴值必须与作者选择一致，每个轴及作者调整证据都必须仍能用 block/offset/hash 定位当前正文。作者明确忽略 revision candidate，或拒绝/采用修订后，门禁可重新评估；旧 revision 修订不会污染当前候选。`taste_note` 和 `preserve` 不构成强制修订。

确定性测试覆盖完整通过、缺少方向回执、旧 review revision、轴值不一致、正文证据范围内变化、hard block、active revision candidate、确定性违规、待处理局部修订阻断，以及明确忽略/拒绝后恢复。合法的证据范围之后追加文字不会被误判为旧引文变化。命令为 `npm --prefix app run test:creator-decision-domain`。完整决策工作流 fixture 进一步证明：真实审阅留下 revision candidate 时先在 Agent 调用前阻断，逐条执行作者忽略动作后才解锁；待处理 RepairProposal 同样在 Agent 前阻断。即使直接请求 Repository 提交，也不会改变本机 Canon 或追加部分确认/提交事件。该测试不调用模型、不采用正文、不写入新的 Repository/Canon 状态、不访问第 20/21 章、不写云端或发布；它证明放行合同被两个真实入口共用，不证明文学质量已经提升。

### 7.28 开源 RAG 的本地调用链启动

自动 RAG 仍未完成，但开源调用链已不再停在 splitter-only。当前固定 `@langchain/textsplitters@1.0.1`、`@lancedb/lancedb@0.31.0` 和 `@huggingface/transformers@4.2.0`。产品代码只配置上游中文分块、LanceDB `ngram` FTS、元数据预过滤、向量查询、LanceDB `RRFReranker`，以及 multilingual E5 的 `query:` / `passage:` 前缀、mean pooling 和 normalization；不实现相似度、BM25、RRF、向量索引、embedding 或 reranker 算法。

冻结合成基准包含 30 条查询，覆盖因果、人物知识、时间线和未兑现承诺四组；33 条语料包含对应事实以及错误作品、错误支线和未来章节诱饵。`npm run test:creator-rag-bootstrap` 证明查询引用完整、至少六条查询带人工硬包含、每条相关事实都有来源定位，且 LangChain 对三个中文长记录实际产生 9 个符合字符上限的块，作品、支线、章节、authority、revision 和 locator 元数据全部保留。`npm run test:creator-rag-benchmark-evaluator` 证明独立指标器能计算 Recall@10、Precision@3、错误作品/支线/未来章节泄漏、来源定位覆盖率和人工硬包含率；负夹具真实让三类泄漏各出现一次，并使 locator 与人工包含率低于 100%。该指标器不参与召回或排序。`npm run check:creator-rag-bootstrap` 固定依赖和代码边界。

`npm run test:creator-rag-lancedb-wiring` 已在本机真实建立临时 LanceDB 表与中文 FTS 索引，并运行向量查询、作品/支线/章节过滤和上游 RRF；该烟测只证明上游 API wiring，不使用它的固定向量声称检索质量。直接 Hugging Face 下载因 `ECONNRESET` 失败后，`npm run validate:creator-rag-local-benchmark` 使用与 Hugging Face q8 ONNX/tokenizer SHA-256 相符的固定 ModelScope commit 下载模型，并在本地再次校验哈希。30 条真实本地查询得到 Recall@10 `1.0`、Precision@3 `0.3222`（29/30 条相关来源进入前三）、三类泄漏 `0`、locator 与人工硬包含率 `1.0`；模型缓存态 P50/P95 约 `7.7/10.5 ms`，模型加载加索引约 `2.1 s`，观测 RSS 增量约 `392 MB`，索引约 `98 KB`。首轮冷下载收据未保留，因此不声明冷启动性能。这仍是冻结合成集，不是第 1-20 章真实语料质量证明；自动 RAG 继续标记为 `contract_only`，人工召回目录仍是唯一可用入口。

`npm run validate:creator-rag-real-thread-evidence` 随后读取第 1-20 章长程线程审计的私有证据账本，逐项要求 Observer 结果已被独立 Auditor 判为 `verify`，并核对初始与后续证据完全一致。运行只把 13 张真实证据卡装入临时索引，另加错误作品、错误支线和第 21 章三个合成诱饵；13/13 张目标卡进入前三，Recall@10 `1.0`、Precision@3 `0.3333`，三类泄漏 `0`，locator 与人工硬包含率 `1.0`。缓存态 P50/P95 约 `8.6/40.6 ms`，模型加载加索引约 `2.4 s`，观测 RSS 增量约 `394 MB`。提交的收据只含源文件哈希、维度计数、指标和副作用边界，不含正文、证据引文或线程标签；工作区、候选、Canon、云端、发布和第 21 章均未改变。该运行不是 20 章全文索引，查询只有 13 条且来自作者侧提醒，因此仍不足以启用产品自动召回。

`npm run validate:creator-rag-full-manuscript -- --workspace <local-workspace.pufw.zip> --ledger <private-thread-ledger.json>` 又对冻结本地包中的第 1-20 章全部 1,195 个已采用正文块执行只读索引。运行先核对工作区包 SHA-256、20 章逐章正文哈希和既有清单，再从 13 条独立复核线程派生 35 条私有查询；收据不保存正文、查询或线程名称。真实全文 Recall@10 为 `0.8429`、Precision@3 为 `0.2571`、25/35 条命中前三。精确源证据查询 Recall@10 为 `1.0`，但语义上下文查询为 `0.7308`，最新证据语义查询为 `0.7778`。三类泄漏为 `0`，locator 和人工选择纳入率为 `1.0`。该结果证明完整语料调用链可运行，也证明当前语义召回不足；它不是功能完成证据。

`npm run check:creator-rag-full-manuscript` 只验证真实语料、哈希、查询数、泄漏、定位、隐私和无副作用边界，因此通过。`npm run check:creator-rag-full-manuscript:activation` 另行要求总体 Recall@10 `>= 0.95`、语义上下文 `>= 0.90`、最新证据语义 `>= 0.90`、前三命中率 `>= 0.85`；当前四项均失败，自动召回保持关闭。运行没有读取或生成第 21 章正文，没有改变工作区、已采用正文、Canon、云端或发布状态。

同一冻结语料随后使用社区 ONNX 导出的 `BAAI/bge-reranker-v2-m3` q8 模型做上游交叉编码器对照。运行先由现有 LanceDB 混合检索/RRF 取 20 个候选，再把 35×20 个 query-passage 配对交给 Transformers.js 的序列分类模型；产品代码不实现或变换相关性分数。总体 Recall@10 提升到 `0.9143`，语义上下文提升到 `0.8462`，最新证据语义提升到 `0.8889`，前三命中率提升到 `0.7429`。四项都优于基线，但仍低于冻结激活门槛；缓存态查询 P50/P95 约 `4.37/5.14 s`。三类泄漏仍为 `0`，locator 和人工硬包含仍为 `1.0`，所有写入副作用为 `false`。因此 `npm run check:creator-rag-bge-comparison` 通过证据完整性检查，而 `npm run check:creator-rag-bge-comparison:activation` 必须失败；该路径没有接入 Creator Route，也不能称为可用自动 RAG。

块级对照进一步把 LanceDB/RRF 的前 40 个候选块交给同一 BGE 模型，再按上游 logit 取每章最高块。总体 Recall@10 达到 `0.9714`，语义上下文 `0.9231`，最新证据 `1.0`，说明章内候选块选择确实是漏召来源；前三命中率只到 `0.80`，仍低于 `0.85`，P50/P95 延迟约 `8.74/9.94 s`，也远高于本地交互暂定的 P95 `2 s` 目标。`npm run check:creator-rag-bge-chunk-comparison` 因语料、哈希、指标、零泄漏和零写入证据完整而通过；其 activation gate 必须因 top-3 和延迟失败。该实验仍未进入 Creator Route、Context Snapshot 或作者交互。

`npm run test:creator-shadow-recall-service` 进一步证明自动结果只会形成 `creator-shadow-recall-proposal.v1`：所有候选均为 `unselected`，要求作者选择，并明确记录没有改变 Context、草稿、Canon 或发布。提案候选故意不提供 `ManualRecallItem` 所需的 `id` 和 `statement`，未知来源、元数据不一致、遗漏人工硬包含和未来章节会整次失败关闭。只有 `confirmCreatorShadowRecallSelection()` 接收 `authorConfirmed: true` 后才会重新核对来源 revision 和定位，生成 `confirmed_not_applied` 的人工召回条目；未确认、未知提案或来源更新均拒绝，转换本身仍不改 Context。`npm run test:creator-rag-lancedb-wiring` 还把提案与确认服务接到真实临时 LanceDB 表，实际经过上游 FTS、向量检索、过滤和 RRF 后再次确认结果不会自动应用；固定二维向量只用于 wiring，不构成质量证明。

同一测试命令还运行 `creator-shadow-recall-context.ts`。应用层只接受结构完整、同作品同支线的 `confirmed_not_applied` 回执，将已选条目与 manifest 合并后调用现有 `compileContextSnapshot()`；调用方原始 Source 不会被修改，Context fingerprint 会随选择变化，未选来源不会进入 Context。已有 manifest revision 冲突、错误支线或 selected-source 计数被篡改都会失败关闭。该测试证明后端四段边界“检索 -> 未选提案 -> 作者确认 -> Context 编译”，不证明 Chrome 中已经存在触发控件、确认交互或本地持久化。

`creator-shadow-recall-query.ts` 固定作者对话到检索查询的入口：作者当前问题不可为空，意图必须锁定；因果查询携带行动、选择、代价和本章变化，人物查询携带所知禁区与延迟揭示，时间线查询携带当前章和起止状态，承诺查询携带读者已知、怀疑和本章不得解决项。四组按固定顺序分别调用上游 retriever，批次明确记录没有跨组融合和自动选择。真实 LanceDB wiring 也执行了四组调用并验证错误作品不会进入同作品结果；该固定向量 smoke 只证明调用和边界，不证明四类查询的真实语料召回率。

为避免不同记忆职责在同一次查询中互相污染，`memoryGroup` 现在从来源记录传播到 LangChain chunk、LanceDB row 和返回结果；四类自动查询分别通过 LanceDB `.where` 增加组别预过滤。bootstrap 验证 chunk 保留分组，真实临时 LanceDB smoke 验证每组 proposal 中不存在其他组来源。人工硬包含不受自动组别过滤影响，仍按作品、支线、章号和 authority 单独校验。该验证证明元数据隔离，不证明真实作品上的分组召回率。

### 7.29 已验证长程线程到人工召回目录

`longRangeThreadRecall.ts` 复用现有长程 Review 和 Verification 验证器，只把两轮证据定位一致、独立复核为 `verify`、状态仍为 `active`、置信度为中/低且来源章早于当前章的线程投影为候选。候选固定为 `unselected`、`authorSelectionRequired: true`，并带来源正史 block 定位；`progressed/fulfilled/broken` 不会伪装成活跃提醒。篡改复核证据、当前/未来章来源、未知候选、重复 identity 或未确认选择都会失败关闭。

真实运行重新读取冻结第 1-20 章工作区和私有线程账本，13 条已验证线程中 4 条 `active` 线程形成候选，并实际经过现有 `buildCreatorRecallCandidates()`；目录仍为 4 张且全部 `recommended=false`。真实 Chrome Repository 运行完成 13 条记录的 IndexedDB v10 持久化、Creator Route loader 投影、Canon 指纹漂移失效、逐字证据变化排除和当前工作区包恢复。随后同一隔离会话进入真实 Creator 页面，作者显式勾选其中 1 张，刷新后选择仍在；路径比较后当前 Context 只包含所选 1 张，另外 3 张未选来源为 0。收据只保存哈希、数量与分组，不保存线程文字。全过程未生成正文、采用候选、改变 Canon、写云端、发布或读取/生成第 21 章正文。

### 7.30 Google Chrome 手选召回到 Context

登录态 Creator QA 现在会在真实 Google Chrome 中操作当前对话式写作台，而不是直接调用领域函数：先对一张章节召回卡执行明确取消，等待 `manual-recall-selections` 写入 IndexedDB v10，刷新后确认取消仍保持；再由作者重新勾选，第二次确认选择已持久化。随后使用键盘逐字输入自然语言故事种子、在最多两个问题内锁定意图，并显式点击“比较不同方向”。

候选搜索完成后，所选来源真实进入当前 `ContextSnapshot.manualRecallItems`；测试同时从页面 `data-recall-in-context` 状态和 IndexedDB `contextSnapshots` 两处核对，再刷新一次确认 Context 与 3 条互不重复、默认未选的候选路径均可恢复。勾选、取消、刷新和候选比较都没有生成正文、采用候选、提交 Canon、访问第 21 章、写云端或发布。选择变化曾因动态 React `key` 重建召回栏并丢失键盘焦点；该键已删除，Chrome 现验证从复选框按 `Tab` 能继续到来源定位按钮。

通用章节召回证据：`validation/creator-writing/creator-editor-manual-recall-context-2026-07-18.json`；复现命令：`CREATOR_QA_ROUTE=/creator/editor PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" npm run qa:local-creator-authenticated-routes`。真实长程线程证据：`validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json`；复现命令：`PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" npm run qa:verified-long-range-thread-real-repository`。后者使用真实第 1-20 章 Canon 和 13 条独立复核线程，但登录与云端目录来自隔离 QA facade，候选比较使用确定性 reference Adapter；它证明真实语料的产品交互、持久化、排除与 Context 接线，不证明真实模型文学质量。

### 7.31 真实旧工作区包兼容恢复

`creatorLocalWorkspacePackage.ts` 现在会在预览、冲突判断和导入哈希之前，通过现有 decision repository 的 schema owner 统一规范化 decision records。旧 `contextSnapshots` 缺失的 `compilationPolicyVersion`、`sourceFingerprint` 和 `contentFingerprint` 会分别补为 `0`、`legacy-unfingerprinted` 和 `legacy-unfingerprinted`；它们因此保持 stale，不能冒充当前 Context，也不会绕过下一次 Context 重编译。

真实 Google Chrome 从空的 schema v10 工作区上传并确认导入 `<local-workspace-package>`。1021 条记录通过写后指纹校验；第 1-20 章 Canon 的内容块与源包逐章完全一致，每章可见字符为 3167-4105；25 条旧 Context 均保留 stale 标记。随后同一会话进入第 20 章 Creator 路由，产品显示“第 20 章已确认”和未触发的“开始第 21 章”按钮；第 21 章只存在空 Canon 壳。全过程不生成正文、不采用候选、不写云端、不发布。证据：`validation/creator-writing/real-workspace-package-migration-2026-07-18.json`；复现命令：`PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" npm run qa:real-workspace-package-migration`。

### 7.32 本机旧正文覆盖保护

第 20 章 Computer Use 修订曾暴露一个真实负向场景：操作者把较早导出的整章正文重新写入当前草稿，短暂恢复了已经压缩过的对白。跨标签 CAS 能阻止过期 revision，却不能识别同一标签主动提交的历史整章。当前本地 Repository 因此保留最近五个正文历史版本，编辑器保存前用 Web Crypto SHA-256 检查完整正文；若提交内容精确命中历史版本且不同于当前正文，则失败关闭，不推进 revision、不替换 canonical body，也不写 Canon、云端或发布。

真实 Google Chrome 从空 IndexedDB v10 依次完成初始保存、第一写入者更新、第二标签过期写入冲突、冲突后新保存，再在同一标签提交初始历史正文。历史提交被拒绝，持久 revision 保持 `3`，较新的正文保持不变；随后提交全新正文成功推进到 revision `4`。最终保留 3 条历史正文，未超过 5 条上限。确定性服务测试同时证明已知回退转为用户可见拒绝，而未知错误不会被吞掉。证据：`app/tests/creator-editor-stale-draft-guard.ts`、`scripts/browser-local-db-cross-tab.mjs`、`artifacts/qa/local-db-cross-tab.json`；复现命令：`PLAYWRIGHT_CHROMIUM_EXECUTABLE="<chrome-binary>/Contents/MacOS/Google Chrome" npm run qa:local-db-cross-tab`。

### 7.33 手动召回到正文遵循的真实门禁

“作者勾选记忆卡并进入 Context”只证明输入边界成立，不能证明 Writer 在正文中正确执行。当前真实 `WritingAgent.reviewDraft()` 会在存在手动召回时额外调用独立 Auditor，对每个已选来源逐项返回 `fulfilled / respected / violated / omitted`；非遗漏项必须提供可定位正文证据。应用把证据重建为 block、offset 和 hash，生成 `manual-recall-adherence-receipt.v1` 并随 `LiteraryReview` 通过本地 Repository 严格 schema 往返。`violated` 或 `omitted` 会转换成确定性违规并进入现有候选/正史质量门禁。一次证据定位错误只允许 Auditor 修正定位，不能改来源、分组、状态或总决定；第二次失败关闭。门禁不只信任派生违规数组：Canon Patch 提案与原子确认都会重新读取当前 Context，直接检查回执缺失、来源/分组/顺序错配、拒绝状态及正文证据漂移；即使人为清空 `deterministicViolations` 也不能绕过。每份新 Review 还绑定 Context ID、编译策略、源指纹及完整内容指纹；测试证明在保留旧 ID/源指纹时篡改硬约束仍会令 Review 失效。旧 Review 可迁移读取，但其 legacy 绑定不能授权 Canon，必须重新审阅。

2026-07-18 的冻结原创单场真实运行使用实际本机 Working Agent，先通过生产 `draftScene` 生成 3063 个可见字符，再通过生产 `reviewDraft` 完成独立审阅。流程共 8 次真实角色调用；3 张人工召回卡分别覆盖因果、人物知识和时间线，均返回可定位证据并通过，未触发证据纠正。运行没有读取真实第 20/21 章、采用候选、写 Repository/Canon、写云端或发布；自动 RAG 保持关闭。该结果证明一个真实单场景工作流可以执行并被门禁约束，不证明长文文学质量已经稳定提升。

复现：`npm run validate:creator-manual-recall-adherence`；复核现有凭证：`npm run check:creator-manual-recall-adherence-real-trial`。证据：`validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json`。

同日又执行了一次随机生成顺序、随机盲测标签的真实 A/B：两臂使用同一 session、锁定意图、候选、长度合同和 Working Agent，作者资料层唯一差异是是否带入 4 张手选长程记忆；每臂使用独立 Context 身份。带记忆候选为 2959 个可见字符，独立召回审校对 causal、character knowledge、timeline、promise 得到 4/4 `fulfilled/respected`；不带记忆候选为 2858 字，只得到 1/4，另有 1 项明确违反和 2 项遗漏。匿名首审与第二 Auditor 对 11 个文学维度逐项复核，确认带记忆候选在连续性、张力、人物能动性、声线、新鲜度、重复、现场细节和节奏 8 个维度占优，3 个维度持平；硬约束复核确认带记忆臂通过、不带记忆臂因正史连续性冲突失败。流程实际执行 14 次本地角色调用，正文与盲测映射未入仓库，未采用候选、未改 Canon、未读写第 20/21 章、未写云端或发布。该结果证明一次受控运行中的记忆效应，不证明跨题材、跨模型或长篇稳定提升，也不启用自动 RAG。

复现：`npm run validate:creator-manual-recall-effect`；复核现有凭证：`npm run check:creator-manual-recall-effect-real-trial`。证据：`validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json`。

为避免把单个成功样例误写成产品能力，又以相同方法新增“档案庭制度拒绝”和“潮钟闸门倒计时牺牲”两个冻结原创场景。三个场景共形成 3 组随机生成顺序、随机匿名标签、独立第二 Auditor 复核的 A/B，实际执行 44 次本地角色调用并产生 6 个不同正文哈希。手选记忆臂在三组的 causal、character knowledge、timeline、promise 遵循数量都高于缺失臂；33 个文学维度首审经独立复核后，19 项确认偏向手选记忆、4 项确认偏向无记忆、7 项确认持平，另有 3 项首审偏好被复核驳回并保留为未确认。潮钟场景额外让两臂都进入生产 `reviewDraft`，完整执行文学审阅、受限证据纠正、actionable finding 独立复核和召回遵循审阅；手选臂保留 1 个连续性 hard block，以及说明负担和节奏 revision candidate；无召回臂保留重复与说明负担 revision candidate，没有为了通过试验而伪造 hard block。统一候选门禁逐项映射当前 active finding，分别以 `1 hard + 2 revision` 和 `2 revision` 拒绝两臂，没有 Context、意图或召回接线阻断，也没有候选被采用。另两组没有执行这条完整产品审阅路径，聚合中保持 `fullProductReview: null`，不能借潮钟结果替它们声称完成。一次真实运行在 17 次角色调用后因试验错误地强制每臂必须有 hard block 而失败关闭；失败收据保留无正文的调用清单，验收随后改为要求门禁计数精确匹配审阅，而不是诱导审阅制造严重问题。三组没有综合文学分、没有总赢家，也没有因结果不理想而筛除运行。聚合 gate 会重新打开三个底层 receipt、重算哈希并核对角色 manifest、独立 Context、临时数据边界和第 20/21 章未访问。该 campaign 扩大了效应证据，但样本仍小、场景仍冻结、模型运行仍为单一当前环境，因此 `stableLiteraryQualityImprovementProven` 继续为 `false`，自动 RAG 继续关闭。

复现新增两组：`npm run validate:creator-manual-recall-effect-archive-tribunal`、`npm run validate:creator-manual-recall-effect-floodgate`；聚合与复核：`npm run build:creator-manual-recall-effect-campaign && npm run check:creator-manual-recall-effect-real-campaign`。聚合证据：`validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json`。

## 8. Evidence Inventory

| 证据 | 路径 |
|---|---|
| V1 领域对象与状态机 | `app/src/features/creator-decision/` |
| 本地 Repository 与迁移 | `app/src/local-db/creatorLocalDecisionRepository.ts` |
| 旧正文覆盖保护与跨标签 CAS | `app/tests/creator-editor-stale-draft-guard.ts`、`scripts/browser-local-db-cross-tab.mjs`、`artifacts/qa/local-db-cross-tab.json` |
| 真实 20 章旧工作区包兼容恢复 | `validation/creator-writing/real-workspace-package-migration-2026-07-18.json`、`artifacts/visual-qa/real-workspace-package-migration/chapter-20-restored.png` |
| 第 20 章 Context JSON 导出完整性负样本、修复与真实 Chrome 复验 | `validation/creator-writing/computer-use-chapter-20-context-export-integrity-2026-07-18.json`、`artifacts/visual-qa/chapter-20-context-integrity-review-2026-07-18/chapter-20-newest-review-findings-2.png` |
| 第 20 章正文质量前后链路 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-quality-improvement-live-2026-07-15/summary.json` |
| 作者指定节奏/声线审阅重点单场凭证 | `validation/creator-ui/frozen-paired-quality-six-seed-focused-review-rerun-2026-07-17/trials/04-frozen-original-glass-lung-endurance-v1.json` |
| 局部文学修订失败隔离与故障注入 | `scripts/frozen-paired-quality-local-repair.mts`、`scripts/test-frozen-paired-quality-local-repair.mts` |
| 场景重决策问题码唯一纠正 fixture | `scripts/creator-working-agent-bridge.mjs`、`scripts/test-creator-working-agent-role-pipeline.mjs` |
| 匿名比较与独立复核的完整证据问题枚举、唯一纠正和语义冻结 | `app/src/features/creator-decision/pairedLiteraryComparison.ts`、`app/src/features/creator-decision/localWorkingAgent.ts`、`app/tests/creator-paired-literary-comparison.ts` |
| 声线试验负结果 | `validation/creator-ui/frozen-paired-quality-character-voice-evidence-archive-2026-07-17/summary.json` |
| finding 失败后继续剩余修订预算的真实跟进 | `validation/creator-ui/frozen-paired-quality-character-voice-repair-followup-archive-2026-07-17/summary.json`、`scripts/frozen-paired-quality-local-repair.mts` |
| 局部修订后的目标维度效果复核与回退 | `scripts/frozen-paired-quality-local-repair.mts`、`scripts/run-creator-frozen-paired-quality-trial.mts`、`scripts/test-frozen-paired-quality-local-repair.mts` |
| 修后文学效果复核真实凭证 | `validation/creator-ui/frozen-paired-quality-post-repair-efficacy-archive-2026-07-17/summary.json` |
| 修后作者方向独立复核与回执重建 | `app/src/features/creator-decision/localWorkingAgent.ts`、`scripts/creator-working-agent-bridge.mjs`、`scripts/run-creator-frozen-paired-quality-trial.mts`、`scripts/test-creator-working-agent-role-pipeline.mjs` |
| 手动召回正文遵循的真实生产工作流、领域门禁与严格落库往返 | `app/src/features/creator-decision/manualRecallAdherence.ts`、`app/src/features/creator-decision/localWorkingAgent.ts`、`app/tests/creator-manual-recall-adherence.ts`、`scripts/creator-working-agent-bridge.mjs`、`scripts/run-creator-manual-recall-adherence-trial.mts`、`scripts/check-creator-manual-recall-adherence-real-trial.mjs`、`validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json` |
| 手动召回有无的真实随机盲测效应 | `scripts/run-creator-manual-recall-effect-trial.mts`、`scripts/check-creator-manual-recall-effect-real-trial.mjs`、`validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json` |
| 手动召回三场景真实效应 campaign 与反 Demo gate | `scripts/build-creator-manual-recall-effect-campaign.mjs`、`scripts/check-creator-manual-recall-effect-real-campaign.mjs`、`validation/creator-ui/manual-recall-effect-archive-tribunal-real-trial-2026-07-18/summary.json`、`validation/creator-ui/manual-recall-effect-floodgate-real-trial-2026-07-18/summary.json`、`validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json` |
| 修后方向复核真实未触达凭证 | `validation/creator-ui/frozen-paired-quality-post-repair-direction-review-archive-2026-07-17/summary.json` |
| 修后方向回执隔离真实重建凭证 | `validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json`、`scripts/run-creator-post-repair-direction-receipt-trial.mts`、`scripts/check-creator-post-repair-direction-receipt-trial.mjs` |
| 修后效果证据驱动单次重试合同与真实未触达凭证 | `scripts/frozen-paired-quality-local-repair.mts`、`scripts/test-frozen-paired-quality-local-repair.mts`、`scripts/run-creator-frozen-paired-quality-trial.mts`、`validation/creator-ui/frozen-paired-quality-efficacy-guided-retry-archive-2026-07-17/summary.json` |
| 修后效果重试隔离真实触发脚本与失败凭证 | `scripts/run-creator-efficacy-guided-repair-trial.mts`、`scripts/check-creator-efficacy-guided-repair-trial.mjs`、`validation/creator-ui/efficacy-guided-repair-real-trial-2026-07-17/failed-attempt.json` |
| 统一候选质量门禁 | `app/src/features/creator-decision/candidateQualityGate.ts`、`app/src/features/creator-decision/canonPatch.ts`、`app/src/features/creator-decision/creationDecisionWorkflow.ts`、`app/tests/creator-candidate-quality-gate.ts` |
| 开源 RAG 本地调用链与全文阻断证据 | `app/src/integrations/creator-rag/creatorChineseTextSplitter.ts`、`app/src/integrations/creator-rag/creatorLocalEmbedding.ts`、`app/src/integrations/creator-rag/creatorLanceDbRetriever.ts`、`app/src/integrations/creator-rag/creatorLocalBgePairScorer.ts`、`app/src/integrations/creator-rag/creatorShadowRecallService.ts`、`app/src/apps/creator/routes/creatorEditorShadowRecallQueryService.ts`、`app/src/apps/creator/routes/creatorEditorShadowRecallContextService.ts`、`scripts/run-creator-rag-full-manuscript-benchmark.mts`、`scripts/check-creator-rag-bge-base-comparison.mjs`、`validation/creator-rag/full-manuscript-bge-v2-m3-chunk-comparison-2026-07-17.json`、`validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2026-07-18.json`、`validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2-2026-07-18.json`、`validation/creator-rag/full-manuscript-bge-base-pool20-comparison-2026-07-18.json`、`validation/creator-rag/full-manuscript-bge-base-pool24-comparison-2026-07-18.json`、`validation/creator-rag/full-manuscript-bge-base-pool28-comparison-2026-07-18.json`、`validation/creator-rag/community-reranker-compatibility-audit-2026-07-18.json` |
| 作者重点驱动局部修订调度 | `scripts/frozen-paired-quality-local-repair.mts`、`scripts/run-creator-frozen-paired-quality-trial.mts`、`scripts/test-frozen-paired-quality-local-repair.mts` |
| 单章文学 finding 独立语义复核 | `app/src/features/creator-decision/literaryReviewVerification.ts`、`validation/creator-ui/schemas/literary-review-verification.schema.json`、`app/tests/creator-literary-review-verification.ts`、`app/tests/creator-decision-agent-adapter.ts`、`scripts/test-creator-working-agent-role-pipeline.mjs` |
| 单章文学 finding 独立语义复核真实凭证 | `validation/creator-ui/frozen-paired-quality-literary-finding-verification-archive-2026-07-17/summary.json` |
| 第 20 章状态记忆审校链路 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-quality-improvement-live-2026-07-15/state-memory-summary.json` |
| 第 20 章 MiroFish 人物排练链路 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-quality-improvement-live-2026-07-15/character-rehearsal-sparse-card-summary.json` |
| MiroFish 合成外部运行、证据提炼与双审收缩 | `validation/creator-ui/mirofish-synthetic-runtime-rerun-2026-07-17/README.md`、`initial-auditor-response.json`、`final-auditor-response.json`、`bridge-response.json` |
| MiroFish 真实第 20 章 Context 一轮人物排练 | `validation/creator-writing/chapter-20-mirofish-character-rehearsal-2026-07-18.json`、`scripts/check-creator-chapter-20-mirofish-rehearsal.mjs` |
| MiroFish 人物卡进入真实第 20 章召回、审阅与修订失败关闭 | `validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json`、`artifacts/visual-qa/computer-use-chapter-20-mirofish-workflow/local-repair-rejected-author-intent.png` |
| 34 项写作能力非 Demo 证据审计 | `validation/creator-writing/capability-evidence-audit-2026-07-17.json`、`scripts/check-creator-writing-capability-evidence.mjs` |
| 已验证长程线程到人工召回目录的真实投影 | `app/src/features/creator-decision/longRangeThreadRecall.ts`、`app/tests/creator-long-range-thread-recall.ts`、`scripts/validate-creator-long-range-thread-recall-projection.mts`、`scripts/check-creator-long-range-thread-recall-projection.mjs`、`validation/creator-writing/long-range-thread-recall-projection-2026-07-17.json` |
| 真实第 1-20 章长程卡在 Creator UI 中手选并进入 Context | `scripts/browser-verified-long-range-thread-real-repository.mts`、`validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json`、`artifacts/visual-qa/verified-long-range-thread-author-selection/real-long-range-thread-selected-in-context.png` |
| 第 20 章场景机制重复阻断 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-scene-mechanism-gate-2026-07-16/summary.json` |
| 场景重决策选择与失效传播 fixture | `app/tests/creator-decision-workflow.ts`、`app/src/features/creator-decision/sceneAuthorDecision.ts` |
| 冻结原创单场景真实作者方向正文试验 | `validation/creator-ui/author-direction-prose-real-trial-2026-07-16/summary.json` |
| 冻结原创单场景同模型匿名对照 | `validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json` |
| 冻结原创三场景同模型匿名 campaign | `validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json` |
| 冻结原创六场景文学审阅与局部修订 campaign | `validation/creator-ui/frozen-paired-quality-six-seed-literary-repair-rerun-2026-07-16/summary.json` |
| 段落经济性边界跟进重跑 | `validation/creator-ui/frozen-paired-quality-six-seed-prose-economy-rerun-2026-07-17/summary.json` |
| 跨种子工作流调优资格合同与测试 | `app/src/features/creator-decision/pairedQualityCampaign.ts`、`app/tests/creator-paired-quality-campaign.ts` |
| 质量工作流运行账本 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-20-quality-improvement-live-2026-07-15/README.md` |
| 第 1-20 章相邻连续性审计与独立复核 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-campaign-verified-2026-07-16/summary.json` |
| 两处跨章问题的局部候选与内存复审 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-repair-trial-2026-07-16/summary.json` |
| 第 1-20 章非相邻长程线程审计与独立复核 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json` |
| 被驳回长程线程的受限纠错与再审 | `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-thread-reconciliation-2026-07-16/summary.json` |
| 1-20 章写作质量工作流总账 | `validation/creator-ui/conversation-recall-2026-07-14/20-chapter-writing-quality-workflow-ledger-2026-07-16.md` |
| IndexedDB Schema | `app/src/local-db/schema.ts`、`creatorLocalDb.ts` |
| Route/hook/controller | `app/src/apps/creator/routes/` |
| 工作台 UI | `app/src/components/creator/workspace/CreatorDecision*.tsx` |
| 单元/集成测试 | `app/tests/creator-decision-*.ts` |
| 浏览器 E2E 脚本 | `scripts/browser-creator-decision-workbench.mjs` |
| E2E 状态证据 | `artifacts/qa/creator-decision-workbench/creator-decision-workbench.json` |
| E2E 截图 | `artifacts/qa/creator-decision-workbench/creator-decision-workbench.png` |
| 固定场景 | `validation/story_seeds.json` |
| 离线结果 | `validation/results/reference-flow.json` |
| Rubric / 比较模板 | `validation/rubric.md`、`validation/model_comparison.csv` |
| 旧 `/create` 流程 | `packages/agent-runtime/src/workflows.ts`、`workflows.test.ts` |
| 静态预览边界 | `scripts/browser-pages-preview-e2e.mjs`、`docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md` |
| 静态预览截图 | `artifacts/visual-qa/p13-public-pages-e2e-2026-07-14T03-58-24-098Z.png` |

## 9. Findings and Product Decisions

| 原设计 | 发现 | 调整 | 当前结果 |
|---|---|---|---|
| 让用户先配置大量信息 | 内容出现前的摩擦过高 | 只问会改变场景走向的关键问题，最多两个 | 完整输入 0 问，模糊/部分输入 2 问；真实用户摩擦待测 |
| 生成结果可能直接进入编辑区 | 容易覆盖作者已有文字 | 生成先保存为未采用结果，采用是独立作者动作 | 浏览器 E2E 证明采用前正文不变 |
| 用一个总分判断文学质量 | 总分掩盖问题类型且难定位 | 七类 finding 独立记录，必须引用正文证据 | 无证据 finding 被过滤；无综合文学分数 |
| 局部问题触发全文改写 | 会破坏作者修改与受保护段落 | RepairProposal 只作用于证据范围 | E2E 完成局部修复并保留已保护段落 |
| 模型可推断状态并写正史 | 推断可能越权或过期 | 模型只能提 Patch，作者确认后本机原子提交 | 提交前无 canon；刷新后不重复确认 |
| 直接上在线服务验证 | 会把流程问题和部署成本混在一起 | 先用本地 Repository、参考 Adapter 和固定场景验证；公开 Pages 只保留 Reader 静态面 | 核心流程可重复；旧创作路由回到 Reader；在线成本和商业模式仍未验证 |
| 只描述未来对照实验 | 无法复现“直接提示”和新闭环的流程差异 | 先用确定性流程对照，再以同模型、同输入、随机顺序和匿名标签运行直接 Writer 与 Architect/Writer 工作流 | 确定性流程对照与三种子真实匿名 campaign 均已记录；仍无专业人类盲评或统计性提升证明 |
| 在顶部堆叠新步骤 UI | 中等视口正文起点被推低 | 决策步骤进入现有右栏 | Route QA 后正文保持在可用首屏内 |
| 单章审阅无法发现章节交接丢失 | 追兵数量和人物代词问题都跨越相邻章 | 增加双章逐字证据审计与第二次独立复核 | 19 个交接全覆盖，2 个问题确认，0 个无证据 finding |
| 跨章问题可能诱发整章重写 | 连续性问题通常只落在后章一个块 | 复用单块 Reviser 与事实保留 Auditor，并在内存副本重跑窗口 | 2/2 候选通过，两个原问题均未在复审中重现；未自动采用 |
| 相邻窗口看不到十余章跨度的因果与承诺 | 长程状态可能已推进，也可能只是待召回，二者不能混为缺陷 | 增加两次全篇 Observer 扫描、六维线程状态和独立 Auditor 复核 | 最新运行 13/13 条线程通过，4 条保留为召回候选，0 条断裂 finding |
| 长程抽取可能把已有推进误判为仍活跃 | 首次运行有一条线程在后续章节已有证据 | 只允许被驳回线程进行一次受限纠错，再由独立 Auditor 复核 | 该线程由 `active` 修正为 `progressed`，1/1 通过；未新增事实或修改正文 |
| 五轴标签变化可能掩盖同一事件拓扑 | 第 20 章真实样本中，机械险情、职责救援、证据损失仍被换名复用 | 在 Writer 前增加独立场景结构 Auditor；一次 Architect 重构后仍重复，由 Planner 提供 2-3 个机制解锁选项 | 真实运行返回 `409 author_decision_required` 和 3 条选项，Writer 未运行，未生成或采用正文 |
| 重决策选项在刷新后丢失或被伪造 | 仅返回 409 无法形成可恢复、可校验的后续动作 | 用本地事件保存来源 decision/session/intent/revision；只允许显式确认已提供的 option id，并让旧派生链统一失效 | fixture 覆盖未确认、伪造、过期、重复消费和有效选择；有效选择回到候选搜索，0 次正文或 Canon 写入 |
| 作者选择五轴方向后 Architect 仍可自由替换 | 只靠 prompt 要求无法证明模型真正遵守 | 运行时精确比较五个轴；允许一次 Architect 修订，二次偏离则在 Planner/Writer 前失败关闭 | 成功夹具为 `Architect -> Auditor -> Architect -> Auditor -> Writer`；失败夹具停在第二次 Auditor，Writer 未运行 |
| Writer 可能在正文中丢失已通过的作者方向 | 骨架签名正确不证明正文真正执行 | Writer 后增加独立逐轴正文证据 Auditor；语义拒绝不重写，引文错误仅允许一次 Auditor-only 修正 | 通过、语义拒绝、二次无法定位三条夹具全部通过；0 次 Canon 写入 |
| 通过的方向审阅只留在临时运行日志 | 刷新恢复后的候选无法说明五轴门禁为何放行，正文修改后还可能误用旧结论 | bridge 返回通过审阅；应用把逐字引文映射为 block/offset/hash 回执并随本地候选保存；任何正文编辑或局部修订删除旧回执 | 新草稿回执可解析且不含原始审阅文本；旧草稿保持兼容；无法定位证据失败关闭；变更后的 draft revision 必须重新审阅 |
| Writer 输出需要结构修复时，旧方向审阅可能先于最终正文 | 修复后的正文与旧引文位置不再一致，外层 Normalizer 会丢失方向回执；一次真实运行中 Normalizer 后仍只有 2556 个可见字符 | 把长度和完整句门禁收进同一场景 pipeline；Normalizer 必须先完成最小结构修复；若只剩轻微长度不足，Writer 仅追加一个受差值限制的同场景段落；prose Auditor 最后审最终正文；Writer 的 `stateProposals` 强制为 `[]` | 角色 fixture 锁定 `Writer -> Normalizer -> Writer:length_completion -> Auditor`；追加前后均重跑长度与完整结尾门禁，冻结真实对照中的工作流候选保留最终方向回执 |
| Architect 可能让人物的结论跑在现场证据前面 | 两次早期真实匿名对照都把 `inference_outpaces_evidence` 定位为工作流的信息控制弱项 | Architect 显式拆分可观察证据、有限推断和保留未知；独立 structure Auditor 在 Writer 前逐项复核，拒绝后只允许一次 Architect 修订 | 拒绝/修订 fixture 通过；三种子 campaign 中信息控制为 2 场平局和 1 场首轮判断被复核拒绝，尚无稳定优劣结论 |
| 只比较“有无工作流”容易用体感挑胜者 | 场景骨架可能强化部分维度，同时削弱另一些维度；一次中间运行还出现经复核的工作流连续性硬失败 | 同模型、同输入、随机生成顺序和匿名标签，11 维分开判断并由第二 Auditor 复核；维度与硬约束均使用不可静默替换的枚举原因码 | 最新单样本为工作流 3 维、直接 Writer 4 维、4 维平局，两边硬约束通过；没有综合分或总赢家，中间负结果保留在验证结论中 |
| 单一种子可能把偶然偏好误当成工作流收益 | 同一场景重跑结果会波动，且不同冲突机制可能放大不同优缺点 | 增加三个互不共享情节的冻结原创种子；每场独立匿名生成、比较和二次复核；只在同一工作流败因跨至少两个种子重复后才允许调优 | 工作流在四个维度均为 3/3 占优，两路硬约束均为 3/3 通过；工作流败因无重复，故本轮不做单样本提示调优，也不宣布总赢家 |
| 文学审阅发现问题但缺少真实局部修订证据 | 只列 finding 不能证明问题能在不重写全文的情况下被修复；首轮模型引文也可能无法逐字定位 | 新增同角色一次证据纠错、最多两轮单块 Reviser、每轮独立 Repair Auditor，并把修订后正文重新送入匿名比较 | 三个新增场景共 6 次局部修订，6/6 通过独立复核且无整章重写；六场聚合暴露重复与节奏两个跨场景弱点，要求人工审查工作流，禁止自动改 prompt |
| 重复与节奏弱点已经跨场景复现 | 只靠局部修订容易在初稿中保留逐拍展开与同义复述 | 人工增加段落经济性边界并只重跑三个扩展场景；旧三场保持为锚点 | 重复不再是跨场景工作流弱点，但节奏仍重复且声线成为新弱点；结果不支持自动推广，修订后方向回执仍需重建 |
| 可选局部修订失败会吞掉原候选评价 | Reviser 或 Repair Auditor 的局部失败不等于原候选不可比较 | 隔离修订失败，记录未应用 disposition，并继续保留原候选 | 四类确定性故障注入通过；没有把失败修订冒充质量提升 |
| Repair Auditor 通过但目标文学问题仍存在 | 事实保持和范围审校不能证明全文声线、节奏等维度已经改善 | 修订后重跑独立全文文学审阅；目标维度仍有 active hard/revision finding 就回退原候选 | retain/revert 确定性测试通过；真实复跑中节奏替换被回退、声线替换被保留；只证明门禁执行，不证明普遍提升 |
| 修后候选丢失作者方向回执 | 正文 revision 变化后旧五轴引文不能继续授权；文学维度改善也不证明作者所选机制仍被执行 | 目标维度通过后再由独立 Auditor 复核五轴和作者调整，并为修后正文重建可定位回执；拒绝或故障回退原候选 | standalone Auditor 的 pass/reject 与失败关闭合同已通过确定性测试；一次真实复跑的两次修订都先被文学效果门禁回退，证明未越级调用，但尚无真实修后回执重建样本 |
| 作者指定重点没有影响修订预算 | `voice,pacing` 已进入审阅，但真实收据的普通修订仍优先选择 repetition | 保留 hard block 最高优先级；同一严重度内先按 `focusDimensions`，再按置信度和默认维度排序 | 四条确定性排序断言通过；未重跑随机样本，不声称文本结果改善 |
| 单名文学 Auditor 的高风险 finding 可直接消耗修订预算 | 引文可定位只证明证据存在，不证明问题的文学语义判断可靠；不同审阅任务可能对同一硬约束得出不同结论 | 对模型提出的 actionable finding 增加第二名独立 Auditor 的逐条 verify/reject；冻结语义字段，驳回项在修订前移除，确定性 finding 不受影响 | 确定性测试通过；一次真实样本的 3 次复核确认 7 条、驳回 1 条，证明复核真实执行，但不证明复核者必然正确或质量提升 |
| 修后全文复核仍发现同维度问题时只能回退 | 更新后的逐字证据比首轮 finding 更接近剩余问题，但无限重试会导致局部重写循环 | 只允许同维度、单一未保护块、非低置信 finding 做一次 Reviser + 独立 Auditor 重试；随后重跑全文效果和作者方向门禁 | 确定性边界通过；一次真实样本首轮修订即通过，重试正确未触达，真实触发效果仍待验证 |
| 重决策选项可能引用审校不存在的问题码 | JSON Schema 只能限制枚举，不能证明代码来自本次两轮审校 | 把真实 allowedIssueCodes 交给同一 Planner，最多一次语义纠正 | 可纠正路径返回作者选择阻断；持续错误路径在 Writer 前关闭 |
| 匿名比较纠正回合只看到首个无效证据 | 同一输出可能跨多个维度引用错误 block，逐个报错浪费唯一纠正机会 | 领域层一次枚举全部缺失证据；只有 `evidence_missing` 能进入一次纠正 | 两个同时错误的 block id 完整传入；非证据合同错误 0 次纠正 |
| 第二名复核 Auditor 的证据错误会中断双审链 | 独立复核没有受限证据纠正，单个错误 id 会丢失整次逐维判断 | 增加独立的 verification evidence revision，并冻结所有文学与硬约束语义 | 多证据错误可一次纠正；语义变更和非证据错误均失败关闭 |
| MiroFish 语义修订只靠提示词保留首审已验证候选 | 模型可能在删除被拒项时顺手改写已经通过的人物卡或其证据 | 增加确定性 preservation gate：已验证 proposal 与绑定 evidence 必须深度一致，修订不能新增 proposal identity | 2026-07-17 合成实跑首审验证 2 张人物卡、拒绝 1 张设定卡；修订原样保留人物卡并删除设定卡，终审通过。篡改候选、篡改证据和新增 identity 的回归测试均失败关闭 |
| MiroFish 只有合成数据，无法证明能读取真实创作上下文 | 合成角色通过只能证明适配器和证据链工作，不能证明真实章节输入不会泄漏正文或越过作者边界 | 用冻结第 20 章 Working Agent prompt 运行 1 轮，只导出两名作者选定角色和确认事实；公开收据只保留哈希与计数 | 7 条直接访谈证据形成 2 张人物候选和 2 张设定候选；受限修订后到达作者候选边界。正文、卡片、22 维状态、Canon、第 21 章、云端和发布均未改变；文学增益仍未证明 |

## 10. Current Limitations

- 暂无真实用户完成率、到首候选时间、退出节点、采用/修改/拒绝比例和第二轮创作意愿。
- 暂无专业编辑或作者对文学质量的盲评。
- 已完成六个冻结原创种子的随机匿名比较与双 Auditor 复核，其中三个新增种子还执行文学审阅和局部修订；样本仍少、题材仍受控且没有专业人类评审，不能证明跨题材稳定性、模型排名或统计性文学提升。
- 第 20 章场景机制试验正确阻断了重复骨架，但尚未在作者修改核心意图后生成并完成相邻章盲审，因此不能宣称该章重复问题已修复。
- 非相邻审计覆盖了六个长程维度，但活跃线程仍只是人工召回候选；0 条断裂 finding 不等于所有承诺、伏笔和人物弧光都已发现或闭合。
- 第 1-20 章全文 RAG 已真实测量；40 块 BGE 对照把总体 Recall@10 提升到 `0.9714`、语义上下文提升到 `0.9231`、最新证据语义提升到 `1.0`，但前三命中率仅 `0.80`，P95 查询约 `9.94 s`。自动召回仍关闭，当前可用路径仍是人工召回目录和结构化证据卡。
- 13 条真实复核线程已在隔离 Chrome 工作区持久化并完成导出/删除/恢复，作者也已在产品界面从 4 张真实长程卡中手选 1 张并让它单独进入 Context。2026-07-15 旧归档的 1021 条记录已通过当前 v10 整包恢复；其中 25 条旧 Context 只以 stale 状态保存，必须由当前编译器重建，不能直接作为新生成上下文。
- 已有“直接 Writer vs Architect/Writer 工作流”的六种子匿名对照；暂无大样本跨题材重复、专业作者/编辑盲评或真实用户采纳结果。
- 段落经济性跟进只重跑三个扩展场景，前三个是旧 prompt 的锚点；这不是六场全量受控前后对照。
- 暂无真实 provider 断线、限流和恢复的完整 UI E2E。
- 暂无多设备同步、在线扩容、实际成本和商业化数据。
- V1 独立一句话输入尚未与 `/creator/editor` 合并；旧 `/create` 仅保留工作流代码与测试，公开 Pages 路由已经退役并重定向 Reader。
- 静态 GitHub Pages 只验证 Reader 界面和退役路由行为，不是模型服务或生产 Creator 的证明。
- MiroFish 的两次合成运行与一次冻结真实第 20 章 Context 运行证明调用、访谈证据过滤和候选边界可执行，不证明人物排练能稳定提高正文文学质量；正式使用仍需 AGPL 分发审查、作者逐卡采用和真实作者盲评。
- 最新真实产品流只保存并手选了一张贺岚排练卡；它进入独立审阅上下文后，两轮局部修订都被作者意图门禁拒绝。当前只能证明人物排练、人工召回和修订失败关闭接通，不能证明排练卡已改善正文。
- 证据成熟度审计覆盖能力总表全部 34 项，其中 18 项有受限真实模型运行、6 项有真实本机运行、7 项只有确定性执行证据、1 项有真实章节上下文的条件外部运行、1 项是被激活门禁阻断的真实全文测量、1 项只是历史路径；这些不得用 `implemented` 一词扩张为稳定真实模型效果或可商用完成。

## 11. Next-stage User Validation Plan

下一阶段以真实文本质量测试和小规模用户观察为重点，只先定义采集项，不预填目标数字：

- 首次候选完成率。
- 从进入工作台到首个候选的时间。
- 两个关键追问中的退出与跳过位置。
- 候选的采用、修改后采用、拒绝和混合行为。
- 每个候选被拒绝的原因。
- 六维 Rubric 的逐项评分和可定位 Badcase。
- 作者是否理解“候选、当前草稿、正史 Patch、已提交正史”的区别。
- 局部修复的接受/拒绝与二次修改。
- 第二轮创作意愿与回访使用。
- 同一真实模型下，直接提示词与决策工作台的对照结果。

在获得真实记录前，不宣称用户效果、文学质量提升、成本下降或 PMF。

## 2026-07-18 Real Computer Use Chapter 20 recall and conversational review

- Google Chrome Computer Use opened the Creator settings surface, chose the archived `.pufw.zip`, reviewed additions/conflicts/unchanged counts, selected `use-import`, and passed the author confirmation gate before repository apply. The UI reported 1020 changed records and 1 unchanged record; the package-level migration receipt still accounts for all 1021 records.
- The restored Chapter 20 workspace initially exposed five selected recall items. Real checkbox actions reduced that set to exactly two: Chapter 19 local Canon and the Lu Chenzhou character card. Refresh retained both selections and the approximately eight-percent context indicator. Chapter 18, the old team, old timeline, and subway card remained excluded.
- The author then typed one natural-language command in the existing conversation composer: review only the current Chapter 20 manuscript, do not generate prose or change Canon, focus on likely causal misreading, cite locatable text, and use only the two selected recalls. The command was routed to `reviewDraft(['continuity'])`; it was not treated as a generic rewrite request.
- With no Working Agent bridge, the same path truthfully returned only a local deterministic rules check. The UI was corrected to label that state `本机规则检查` rather than implying an independent model review.
- With the repository's existing local Codex CLI bridge enabled, the same Chrome action executed `literary_review`, one evidence-only `literary_review_revision`, and `literary_review_verification`. The UI displayed three evidence-located findings. A second Auditor verified one actionable exposition issue and rejected one unsupported information-control hard block. No composite literary score was produced.
- The bridge prompt contained the requested `continuity` focus and only the current intent, current Chapter 20 Canon, selected Chapter 19 Canon, and selected character card. It did not include the four deselected memories.
- No prose was edited or adopted, no Canon or historical state was committed, Chapter 21 was not opened, and no cloud, publication, database, payment, or deployment write occurred. Evidence is `validation/creator-writing/computer-use-chapter-20-recall-review-2026-07-18.json` plus the two `chapter-20-working-agent-review*.png` screenshots under `artifacts/visual-qa/computer-use-chapter-20-recall/`.
- This proves a real author-operated recall and review workflow with evidence correction and independent verification. It does not prove stable literary-quality improvement, professional blind-review agreement, automatic RAG readiness, PMF, or production readiness.

### Context export-integrity defect and verified rerun

- A further Google Chrome Computer Use rerun asked the existing conversation workflow to check Chapter 20 causality, character knowledge, and timeline using only Chapter 19 Canon and the Lu Chenzhou character card. The real Working Agent returned evidence-located findings without editing prose, generating a candidate, preparing a Canon Patch, or publishing.
- The first product UI export exposed a real persistence defect: runtime fingerprint serialization included object properties whose values were `undefined`, while workspace JSON export omitted them. The stored active Context fingerprint therefore did not match a recomputation over the exported record. This failed the intended backup roundtrip even though the in-memory review binding was valid.
- `contextCompiler.ts` now uses JSON-compatible canonical serialization, and `creator-conversation-recall.ts` requires a current Context to remain current after `JSON.stringify`, parse, and Schema parsing. After hot reload, the same Chrome workflow rebuilt Context, reran the review, and exported again through the Local Workspace UI.
- In the second package, active Context `context-snapshot:1f6umd5` stores and recomputes `context-snapshot-content:430mwb`; the active Review binds that exact ID and fingerprint. Its three findings are all `preserve`, all have locatable prose evidence, and no composite literary score is used.
- Chapter 20 Canon remains revision 20 with the same accepted-block hash `88bd2a6568bbccf2a56245166de25b10fe8a822208b1def111c730bad1a81615`; the local draft body checksum and timestamp also remain unchanged. The package contains a pre-existing empty Chapter 21 session and empty Canon shell created on 2026-07-15, but this rerun did not access or modify either. The correct claim is therefore “Chapter 21 was not accessed or changed by this run,” not “no Chapter 21 record exists.”
- Evidence: `validation/creator-writing/computer-use-chapter-20-context-export-integrity-2026-07-18.json` and screenshots under `artifacts/visual-qa/chapter-20-context-integrity-review-2026-07-18/`.

### Author-operated repair and re-review continuation

- The actionable exposition finding spanned four prose blocks. The product correctly refused to synthesize a multi-paragraph replacement and showed only the evidence plus a local direction. The author then entered edit mode and changed the manuscript manually through Google Chrome Computer Use.
- The first manual compression removed the original four-block repetition finding, but the next independent review identified a new, locatable knowledge-timing problem: the revised sentence stated that only the transfer number remained before the third board had been examined. The author replaced it with `陆沉舟看着新墨渗入纸纹，转而望向尚未核验的第三块木条。`
- The following review confirmed that the knowledge-timing problem was gone and protected the transfer-number and authority boundaries, while locating one remaining near-range repetition in the two negative-boundary dialogue paragraphs. The author compressed those paragraphs into one line: `塞文盯着她落笔的位置：“到场和拆分成立；那枚雨沟铜垫圈仍不能归入这批货。”`
- The closeout review protected the causal/action chain and the final evidence boundary. Its only remaining revision candidate was explicitly an author style tradeoff: keep the functional emotional echo for aftertaste, or compress it to make the last sentence land harder. The workflow did not auto-resolve that choice.
- Each saved edit invalidated the old review and old Canon diff. No model prose was inserted, no Canon commit was invoked, and Chapter 21 remained unopened. The selected recalls stayed at exactly two and the UI continued to show an eight-percent context boundary.
- Evidence is `validation/creator-writing/computer-use-chapter-20-manual-edit-rereview-2026-07-18.json` and `artifacts/visual-qa/computer-use-chapter-20-recall/chapter-20-manual-edit-rereview.png`.
- This is real workflow evidence for bounded human editing and repeated independent review. It is not evidence of stable literary improvement across chapters, professional blind-review agreement, or production readiness.

### Current-workspace Chapters 1-20 continuity audit and candidate repair

- A fresh workspace export from the actual Google Chrome Creator session contained 87 local records and 20 accepted Canon chapters. The long-form continuity campaign inspected all 19 adjacent transitions in four overlapping windows, used six real Working Agent calls and two independent verification calls, and retained locatable evidence on both sides of every finding.
- The accepted Canon baseline produced 17 passing transitions and two independently verified revision candidates: Chapter 11 -> 12 mislabeled the cost of waiting for a recheck as a waiver, and Chapter 19 -> 20 repeated the same rescue-success/evidence-loss closure. There were zero hard blocks and no composite literary score.
- Google Chrome Computer Use repaired both targets only in the local draft. Chapter 12 now says the character lost the earlier treatment slot by waiting for the recheck; its independent review returned three protected findings and zero revision candidates. Chapter 20 required four evidence-located review iterations: the first retained three compression candidates, the next exposed repeated return-authority language, and the third exposed repeated formal closure plus an overpromised ledger resolution. After sentence-level compression, the final review returned one protected causal/action chain with four evidence blocks and zero revision candidates.
- During the Chapter 20 continuation, a full-body write sourced from the earlier export temporarily restored one superseded dialogue compression and was saved to the local draft. The operator detected it before final review, rebuilt the current draft, and reran the review on the corrected text. No author text was lost, but the incident is retained as negative workflow evidence rather than hidden.
- A final Google Chrome reload restored the corrected final sentence, the one protected finding with zero revision candidates, and exactly two author-selected recalls. The operator located the exact final sentence inside the reloaded editor instead of relying on the pre-refresh React state; the restored state is retained in `chapter-20-final-persistence-after-reload.png`.
- The Chapter 12 Badcase exposed a retrieval-boundary fault: the historical chapter card still carried the uncommitted candidate label `先签弃权` into later Context even though it was marked non-Canon. Historical recall statements now exclude candidate titles and candidate narrative mechanisms. The separate mechanism signature remains available to the repetition gate, while locked constraints, committed state and locatable accepted ending evidence remain available to authors.
- Neither repair was committed to Canon. A Canon-based campaign rerun would therefore still read the original accepted chapters and must not be reported as repaired. Chapter 21 was not opened; automatic RAG remains disabled; no cloud, database, payment, deployment or publication write occurred.
- Evidence: `validation/creator-writing/computer-use-chapter-12-20-continuity-repair-2026-07-18.json`, `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-current-workspace-2026-07-18/summary.json`, and the screenshots under `artifacts/visual-qa/computer-use-continuity-repair-2026-07-18/`, including `chapter-20-final-polish-rereview.png`.

## 2026-07-18 Chapter 20 stale-repair invalidation and negative evidence

- A real Google Chrome Computer Use run exposed an invalid local-repair overpass: the initial repetition repair reached the Repair Auditor with zero same-chapter comparison blocks. The resulting suggestion repeated the diagnosed command-list mechanism. It remained unadopted and did not change the manuscript or Canon.
- Initial repetition repairs now receive the same comparison evidence and author-intent preservation requirements as efficacy retries. Separately, every new literary review persistently marks all older RepairProposal and CanonPatch records stale; the UI only exposes a proposed repair bound to the current active Review.
- The post-fix Chapter 20 rerun executed a real `literary_review` and `manual_recall_adherence_review` against three author-selected recall cards. It returned one `preserve` finding and a passing recall-adherence decision. The previous repair disappeared, and no replacement repair was generated because no locatable revision candidate remained.
- This is deliberately negative evidence: the system did not create a candidate merely to demonstrate the feature. It proves stale-proposal invalidation, active-review filtering and a fail-closed no-op result; it does not prove stable literary-quality improvement.
- No repair was adopted, no manuscript or Canon change was made, no Canon Patch was prepared, and no cloud, database, payment, deployment, publication or Chapter 21 action occurred. Evidence: `validation/creator-writing/computer-use-chapter-20-local-repair-invalidation-2026-07-18.json` and `artifacts/visual-qa/computer-use-chapter-20-repair-invalidation-2026-07-18/chapter-20-rereview-stale-repair-removed.jpg`.

## 2026-07-18 Open-source Chinese embedding comparison

- The offline full-manuscript runner added an evaluation-only `bge-small-zh-v1.5` option while retaining multilingual E5-small as the product default. It uses the existing community Transformers.js ONNX export, official Chinese retrieval instruction, upstream mean pooling and normalization, and the existing LanceDB/RRF path. No retrieval or ranking algorithm was reimplemented.
- The q8 model, tokenizer, config and tokenizer-config files were pinned to revision `75c43b069aac4d136ba6bc1122f995fedcfd2781` and verified by SHA-256 before the run.
- Against the same frozen Chapters 1-20 and 35 private queries, Recall@10 was `0.8571`, context Recall@10 `0.7692`, latest-evidence Recall@10 `0.7778`, top-three hit rate `0.6857`, and cached P95 query latency about `16.6 ms`.
- The evidence gate passes, while the activation gate fails all four quality targets. Automatic retrieval remains disabled; the product still requires explicit manual recall selection.
- The receipt contains hashes and aggregate measurements only. It did not change the workspace, accepted manuscript, Canon, cloud data or publication state and did not read or change Chapter 21 manuscript content. Evidence: `validation/creator-rag/full-manuscript-bge-small-zh-v1.5-comparison-2026-07-18.json` and `scripts/check-creator-rag-bge-small-zh-comparison.mjs`.

## 2026-07-18 Chapter 20 local Canon persistence closeout

- Google Chrome Computer Use completed the Chapter 20 author workflow through evidence-located review, bounded manual editing, Canon Patch preparation, the explicit author confirmation dialog and local atomic commit. The final manuscript contains 3368 characters and retains all three intended repairs: command authority returns to He Lan, rune authority returns to Severn, and the ending states concrete gains and irreversible loss without the old abstract `因为救险正确` judgement.
- The real run exposed two persistence defects instead of hiding them. A pending 700 ms author-edit timer could overwrite a newly committed session back to drafting, and an older route draft could overwrite a newer decision draft during restore. `creatorEditorAuthorEditGuard.ts` now rejects stale timers by phase, draft identity, revision and manuscript, and applies a restored decision manuscript only when it is newer than the route draft or the editor is empty.
- After the fix, the author confirmed the six evidence-bounded state operations. Waiting beyond the timer window and refreshing Google Chrome still showed `第 20 章已确认`, restored the local decision session and retained exactly two author-selected recall sources. Opening the full manual editor after refresh verified all three repairs, no old abstract ending and no replacement-character corruption.
- The run also retained two negative model/input outcomes. Chinese selected-text typing produced transient corruption and was cancelled without saving; the first Canon Patch response had an invalid structure and failed closed before one bounded retry returned a valid patch. Review finding counts varied across repeated model runs, so the product continues to use locatable evidence plus author judgement rather than a finding count or composite literary score.
- Full `test:creator`, `check:pivot`, writing-capability evidence, the Creator build and `git diff --check` pass. The capability audit reports 34 capabilities and zero demo-only capabilities claimed complete. Automatic RAG remains disabled, stable literary improvement and professional blind-review agreement remain unproven, and the MiroFish path remains conditional.
- Chapter 21 was neither opened nor generated. No cloud, database, payment, deployment, publication or public Canon write occurred. Evidence: `validation/creator-writing/computer-use-chapter-20-canon-persistence-quality-final-2026-07-18.json`.
