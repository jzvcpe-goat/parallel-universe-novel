# Creator 写作辅助低认知负担开发交接

状态：`implementation_in_progress`

日期：2026-07-18

适用范围：Parallel Universe Novel / NarrativeOS Creator Pivot V2，本机 Creator 写作台

目标读者：产品、Creator 前端、创作决策领域层、本机 Working Agent、数据迁移与 QA

## 0.0 2026-07-18 实施进度更新

本文件已从纯交接进入分阶段实现，当前真实状态如下：

| 工作包 | 状态 | 真实边界 |
|---|---|---|
| WP0 合同冻结 | 已实现并通过定向门禁 | 已有偏好、原因码、推荐、advisory finding 和 `ExtendedCraftReview` Schema；advisory 无 `hard_block`。 |
| WP1 本地偏好与备份 | 已实现并通过刷新回归 | 偏好进入 IndexedDB v10 `meta` 与版本化工作区包；旧包默认关闭；设置面板支持显式启用、推荐/自选和最多两个镜头。修复了 hydration 前读取默认值导致刷新后误显关闭的问题。 |
| WP2 P0A 有界推荐器 | 领域与工作流已实现 | 只用现有 11 维；关闭时返回空；最多两个镜头；作者点名优先，其次使用已授权手选记忆和 Genre Kernel 规则；允许空推荐。 |
| WP3 P0A 低负担 UI | 核心链路已实现，仍未完整退出 | 已有临时推荐卡、自选镜头、单 finding 显露、原文定位、保持原文、类型明确的局部候选/diff 和“稍后处理”事件；尚缺完整 no-op/stale/error/刷新浏览器矩阵。 |
| WP4 P0B 扩展镜头 | 四个首批镜头已接真实链路 | POV、潜台词、节律、结尾已进入真实 Auditor prompt/parser、逐字证据校验和独立 advisory verify/reject；advisory 继续不进入 Canon blocker。单章真实运行通过不等于稳定文学质量提升。 |
| WP5 文学价值证据账本 | 已实现本机只读聚合与门禁 | 从已有 Review、Repair、事件、Canon Patch 以及 Chapter 1-20 的独立复核连续性/长程线程回执聚合覆盖度、作者选择和有界修订结果；关系一致性与作者信任在没有明确证据时保持 `not_measured`。不输出综合文学分，不保存正文。详见 `docs/research/CREATOR_LITERARY_VALUE_INFRASTRUCTURE_AUDIT_20260721.md`。 |

新增门禁：

```bash
npm run check:creator-writing-assistance
```

该门禁检查：最多两个镜头、关闭短路、无定时触发、advisory 不进入正文确认门禁、证据非空、本地偏好与工作区包边界，以及自动 RAG 继续关闭。

Google Chrome 已通过 `qa:workspace-export-import`，证明偏好可随真实本地工作区包导出、预览、确认导入和恢复。该结果证明合同和本地持久化可执行，不证明文学质量已稳定提升。

## 0.1 2026-07-19 真实写作台收据

Google Chrome Computer Use 在真实第 20 章本机工作区完成两轮作者操作：

1. 启用写作建议，选择 `视角距离 + 对话潜台词`，真实独立审阅返回两张可定位建议；作者点“保持原文”后只推进到下一张，正文未变化。
2. 刷新设置页后确认偏好恢复，再切换为 `句段节律 + 段尾兑现`；第二轮真实审阅触发 `literary_review_verification` 与 `advisory_craft_verification`，结果逐张回到时间线。
3. “定位原文”在手工编辑器中精确选中建议证据，随后取消，没有保存正文修改。

首轮真实调用还发现并修复两个不可由 mock 证明的问题：严格结构输出不接受可省略的 `extendedCraft`，以及设置页在 IndexedDB hydration 前读取默认偏好。当前合同改为根属性必需、未启用时显式 `null`；设置页在 hydration 后回填本地偏好。

证据：

- `validation/creator-writing/computer-use-writing-assistance-four-lens-2026-07-19.json`
- `artifacts/visual-qa/creator-writing-assistance-2026-07-19/chapter-20-dialogue-subtext-after-keep-original.png`
- `artifacts/visual-qa/creator-writing-assistance-2026-07-19/chapter-20-prose-rhythm-after-independent-verification.png`

该收据只证明四个镜头在一个真实章节上的可执行性、证据定位、单卡推进和 fail-closed 修复；不证明稳定提高文学质量、作者采纳率或专业编辑偏好。

## 0. 交接结论

本轮调研不建议继续增加一个可以自由生成全文的新 Agent。下一阶段应把已经存在的审阅、证据定位、局部修订和作者确认能力，整理成一层低打扰、可关闭、可按需选择的写作辅助。

产品原则浓缩为一句话：

> 写作搭档负责理解当前上下文、降低选择成本并提供候选；人类作者决定是否启用、关注什么、是否修改，以及什么最终成立。

开发必须同时满足两个条件：

1. 作者可以关闭新增文学辅助、使用系统推荐或自行选择审阅镜头。
2. 关闭文学辅助不能关闭候选、正文、Canon、发布之间的现有安全边界。

本交接的 P0 不是“同时上线八个新审阅镜头”，而是先完成低认知负担编排层：

- 写作中零强制弹窗。
- 只在自然检查点提供建议。
- 每个检查点默认只显露一张卡。
- 每次最多推荐两个审阅镜头。
- 每张卡只提供一个最小修改实验。
- 作者可以保持原文、看一个局部方案或稍后处理。
- 新增 advisory finding 不进入现有 Canon blocker 计算。

## 1. 权威资料与证据边界

### 1.1 本轮调研

- 完整报告：[Creator Pivot V2 写作质量全网调研与 Skill 方案](../research/CREATIVE_WRITING_QUALITY_RESEARCH_AND_SKILL_PLAN_20260718.md)
- 138 条来源目录：[CREATIVE_WRITING_QUALITY_SOURCE_CATALOG_20260718.tsv](../research/CREATIVE_WRITING_QUALITY_SOURCE_CATALOG_20260718.tsv)
- 已安装 Skill：`<local-codex-writing-skill>`

来源快照：

- 总计 138 条专业内容。
- 英文 70 条，中文 68 条。
- A1 同行评审论文 58 条。
- A2 大学、出版社、学术章节或明确预印本 21 条。
- A3 中文期刊元数据页 48 条，只用于覆盖面和全文导航。
- B 类作家协会、专业写作机构或大学写作中心实践文章 11 条。

以上统计是来源目录的机械结果。它证明调研覆盖，不证明每个新镜头都能稳定提高文学质量。

### 1.2 当前产品权威入口

- [Creator Writing Backend Capability Map](../backend/CREATOR_WRITING_BACKEND_CAPABILITY_MAP.md)
- [创作决策工作台 V1 实现说明](./CREATOR_DECISION_WORKBENCH_V1.md)
- [Creator Working Agent Role Runtime](../agent-protocol/creator-working-agent-role-runtime.md)
- [Quality Brake Contract](./knowledge/narrative-okf/quality-brake.md)
- [Creator RAG Open-Source Adoption Boundary](../data-contracts/creator-rag-open-source-boundary.md)
- [Creator Validation](../VALIDATION.md)
- [Creator UI Execution Blueprint](./CREATOR_UI_EXECUTION_BLUEPRINT.md)

### 1.3 当前可确认与不可确认

可靠：当前产品已经有作者意图锁定、Context Snapshot、11 维文学审阅、证据定位、第二 Auditor 复核、单块局部修订、修后全文复核、作者方向复核、匿名比较、22 维人物状态、相邻章连续性、长程线程、人工召回、Canon Patch 和明确确认边界。

可能：新的视角、潜台词、节律、意象、主题、情绪和结尾镜头可以作为非阻断建议接入当前工作流。

不确定：当前没有专业编辑盲评、普通作者长期采纳、跨题材大样本和统计性质量提升证明。开发完成只能声明“功能与边界可执行”，不能声明“已稳定提高文学质量”。

## 2. 产品决策

### 2.1 两层权限模型

#### A. 作品安全层

该层沿用现有产品合同，不能被新增开关关闭：

- 私有草稿与运行记录留在本机。
- 生成正文始终先是候选。
- 候选不能自动成为作者正文。
- 作者正文与 Canon 分离。
- Canon 和发布必须显式确认。
- 已锁定的作者方向、人物知识边界和确定性事实不能被候选绕过。
- 作者手选召回仍为硬包含。
- 自动 RAG 不因本功能而启用。

#### B. 文学辅助层

该层由作者控制：

- 是否启用新增写作辅助。
- 使用上下文推荐还是自定义镜头。
- 本轮、仅本章或项目级范围。
- 是否查看诊断。
- 是否生成局部候选。
- 是否采纳、手动修改、忽略或保持原文。
- 是否进入深度审阅、匿名比较或长篇检查。

产品语义不是“所有功能都可以关闭”，而是：作者可以关闭“写作搭档告诉我怎么写”，但不能关闭“写作搭档不得擅自替我决定”。

### 2.2 `0-1-3` 认知负担预算

- `0`：正文输入过程中零强制弹窗、零定时审阅、零自动抢焦点。
- `1`：一个自然检查点默认只显露一个当前最有行动价值的问题。
- `3`：作者最多面对三个主动作：`保持原文`、`看一个局部方案`、`稍后处理`。

额外限制：

- 一次上下文推荐最多两个镜头。
- 一张建议卡最多一个默认实验。
- 没有高价值发现时允许完全无输出。
- 同一 draft revision 不重复显示同一建议。
- 不以提高卡片数量、点击量或采纳率作为成功目标。

### 2.3 辅助模式

建议只保留三个持久模式，不增加复杂模式矩阵：

| 模式 | 行为 | 默认显露 |
| --- | --- | --- |
| `off` | 不运行新增 advisory 分析，不展示文学建议卡 | 无 |
| `recommended` | 在自然检查点分析有界上下文，推荐最多两个镜头 | 一张推荐卡 |
| `custom` | 使用作者选定的镜头；仍保留全部现有硬边界 | 一张结果卡 |

默认值：

- 首次使用 `enabled=false`。
- 作者第一次明确启用后，默认选择 `recommended`。
- `深度审阅` 是一次性动作，不是第四个常驻模式。
- 单次和本章覆盖不改变项目默认值。

## 3. 目标创作流程

### 3.1 写作中

作者输入正文时：

- 不实时调用文学审阅。
- 不依据停顿时间触发分析。
- 不在正文上叠加大量波浪线、分数或维度徽标。
- 不要求先选 2–4 个术语化镜头才能继续写。
- 不改变编辑器布局或正文起始位置。

### 3.2 自然检查点

允许触发推荐或审阅入口的事件：

1. 候选正文生成完成。
2. 作者明确说“审一下”“看看节奏”“检查对白”等。
3. 作者主动点击“看看这一章”。
4. 作者完成一场或一章并主动进入检查动作。
5. 作者准备正文确认时，沿用现有安全门禁；不自动追加文学建议。

禁止作为 P0 触发器：

- 输入停顿若干秒。
- 每保存一次草稿。
- 每修改一段正文。
- 每切换浏览器标签。
- 每进入写作台。

### 3.3 推荐模式

推荐流程：

```text
当前写作阶段 + 作者明确表达 + 锁定意图 + Genre Kernel
  + 当前 draft revision + 已选择召回 + 最近显式偏好
  -> 有界推荐器
  -> 0 至 2 个镜头 + 可解释原因
  -> 作者开始审阅 / 自己选择 / 本次不启用
```

示例文案：

> 本章主要靠对话和隐瞒推进冲突。建议这次关注：潜台词、人物声线。
>
> `按建议看看`　`自己选择`　`本次不用`

推荐只降低选择成本，不自动成为审阅结论，也不自动开启局部修订。

### 3.4 结果显露

普通建议卡：

> 有一处对白可能把双方真正想隐瞒的事说得太透。
>
> `定位原文`　`看一个局部方案`　`这是有意的`

硬边界卡继续使用现有安全语义：

> 这里像是人物提前知道了尚未发生的事。需要处理后才能进入正文确认。
>
> `定位原文`　`看处理方向`

两者不能使用相同颜色、相同阻断文案或相同确认逻辑。

### 3.5 局部修订

当作者点击“看一个局部方案”时：

- 复用现有 `Reviser -> Auditor`。
- 一次只替换一个证据块。
- 原文与候选以内联 diff 或紧邻对照展示。
- 只给一个默认候选；需要第二个版本时由作者主动请求。
- 作者可采用、手动改、放弃。
- 失败或引入新的硬问题时回退。
- 不自动覆盖作者正文，不自动改 Canon。

## 4. 上下文推荐器

### 4.1 P0 推荐器边界

P0 使用确定性、可解释的有界推荐器，不增加新的模型角色。推荐器只决定“这次先看什么”，不判断“写得好不好”。

输入只允许来自当前有效工作流：

- 当前作品、支线、章节和 draft revision。
- 当前阶段：候选完成、作者主动审阅、章节完成。
- 锁定作者意图。
- 当前 Genre Kernel / Constraint Profile。
- 当前 Context Snapshot 中已经授权的内容。
- 作者手动选择的召回。
- 作者当前输入中的明确审阅词。
- 作者显式保存的辅助偏好。

不允许：

- 主开关关闭时读取正文做 advisory 分析。
- 自动扫描作者未选择的历史章节。
- 自动检索未授权文本。
- 使用未来章节、其他作品或失效 Context。
- 根据一次“本轮忽略”偷偷形成永久偏好。

### 4.2 推荐优先级

从高到低：

1. 作者明确说出的关注点。
2. 作者自定义的项目镜头。
3. 当前工作阶段的固定推荐。
4. 有界文本结构信号。
5. Genre Kernel 的类型相关镜头。
6. 作者显式设置的抑制偏好。

同分时保持固定顺序，禁止随机变化。最多返回两个镜头；没有强信号时返回空推荐。

### 4.3 P0 原因码

建议先冻结以下原因码：

```text
explicit_author_focus
dialogue_dense_scene
chapter_ending_checkpoint
viewpoint_transition_signal
pacing_concern_signal
repetition_concern_signal
genre_kernel_match
author_project_default
author_suppressed_lens
no_strong_recommendation
```

每条推荐必须保留原因码，但产品界面只展示作者可理解的一句话。

### 4.4 现有解析入口

当前 `creatorEditorConversationReviewService.ts` 已能把作者输入映射到 11 个 `LiteraryDimension`。P0 应扩展该入口，而不是新建第二套自由文本命令系统。

首期可以直接复用：

- 因果、连续性 -> `continuity`
- 张力、冲突 -> `tension`
- 人物所知 -> `information_control`
- 人物选择 -> `character_agency`
- 声线、文风 -> `voice`
- 重复 -> `repetition`
- 解释过多 -> `exposition`
- 场景细节 -> `scene_detail`
- 节奏、拖沓 -> `pacing`

## 5. 镜头范围与上线顺序

### 5.1 P0A：先验证低负担交互骨架

P0A 不新增文学维度，先使用现有 11 维完成：

- 总开关。
- 推荐 / 自定义模式。
- 最多两个焦点。
- 单卡显露。
- 保持原文 / 局部方案 / 稍后处理。
- 局部修订与失效传播。
- 认知负担事件记录。

目的：先证明作者可以不离开正文流程完成一次审阅与决定。

### 5.2 P0B：首批四个 advisory lenses

低负担骨架通过后，接入：

1. `pov_focalization`：视角持有者、可知范围、感官来源、叙述距离和切换动机。
2. `dialogue_subtext`：表层言语行为、隐藏目标、回避、权力变化、沉默和人物节奏。
3. `prose_rhythm`：句段加速与停顿、重复与变奏、节律是否服务当前压力。
4. `ending_payoff`：发生了什么变化、代价是否落地、什么问题关闭、什么压力与余味保留。

选择这四项的原因：它们可以分别映射到现有 voice、information control、repetition、pacing 和 tension，又有清晰证据定位，主观文化风险低于直接评判主题或共情。

### 5.3 P1：第二批 advisory lenses

- `imagery_system`
- `theme_progression`
- `emotional_arc`
- `cultural_specificity`

这些镜头可以不依赖专业编辑实时参与而进入 Beta，但必须保持非阻断建议，并通过作者行为数据校准显露频率。

### 5.4 P2：长篇层

- Chapter：现有 11 维 + 作者选择的 advisory lenses。
- Arc：人物弧、承诺与伏笔、冲突机制变奏、主题和情绪走势。
- Book：整体因果、节奏分布、人物完成度、结尾兑现、风格一致性和读者体验假设。

不把章节分数平均成整书结论，不把 active thread 自动标为缺陷。

## 6. 领域合同设计

### 6.1 关键架构决策

不要把 advisory lens 直接加入现有 `LiteraryDimension` 和 `LiteraryReview.findings`。

原因：当前 `candidateQualityGate.ts` 会把 active `revision_candidate` 计入正文确认门禁。如果新增审美建议共用该集合，普通的节律、潜台词或结尾取舍可能意外阻断 Canon。

推荐做法：在现有 `LiteraryReview` 上增加可选的 sibling payload，复用同一个 draft、Context、revision、指纹和 stale 生命周期，但保持独立严重度与门禁语义。

### 6.2 建议 TypeScript 合同

```ts
export const advisoryLensIds = [
  'pov_focalization',
  'dialogue_subtext',
  'prose_rhythm',
  'imagery_system',
  'theme_progression',
  'emotional_arc',
  'ending_payoff',
  'cultural_specificity',
] as const

export type AdvisoryLensId = typeof advisoryLensIds[number]

export type WritingAssistLensId = LiteraryDimension | AdvisoryLensId

export interface CreatorWritingAssistPreferences {
  schemaVersion: 'creator-writing-assist-preferences.v1'
  enabled: boolean
  selectionMode: 'recommended' | 'custom'
  projectLensIds: WritingAssistLensId[]
  triggerPolicy: 'natural_checkpoints_only'
  suppressedLensIds: WritingAssistLensId[]
}

export interface WritingAssistRecommendation {
  schemaVersion: 'writing-assist-recommendation.v1'
  sessionId: string
  contextSnapshotId: string
  draftId: string
  draftRevision: number
  lensIds: WritingAssistLensId[]
  reasonCodes: string[]
  status: 'proposed' | 'accepted' | 'dismissed' | 'stale'
  generatedAt: string
}

export interface AdvisoryCraftFinding {
  id: string
  lensId: AdvisoryLensId
  severity: 'revision_candidate' | 'taste_note' | 'preserve'
  evidence: LiteraryEvidence[]
  diagnosis: string
  readerEffectHypothesis: string
  authorTradeoff: string
  smallestExperiment: string
  mappedExistingDimensions: LiteraryDimension[]
  confidence: 'high' | 'medium' | 'low'
  verification: 'unverified' | 'verified' | 'rejected'
  status: 'active' | 'dismissed' | 'resolved' | 'stale'
}

export interface ExtendedCraftReview {
  schemaVersion: 'extended-craft-review.v1'
  requestedLensIds: AdvisoryLensId[]
  findings: AdvisoryCraftFinding[]
  compositeLiteraryScoreUsed: false
}

export interface LiteraryReview {
  // Existing fields remain unchanged.
  extendedCraft?: ExtendedCraftReview
}
```

### 6.3 不变式

- `AdvisoryCraftFinding.severity` 不包含 `hard_block`。
- advisory finding 不进入 `candidateQualityGate`。
- 如果 advisory 分析发现真实 Canon、知识边界或锁定方向问题，必须另外形成现有 `LiteraryFinding`，走现有证据校验和第二 Auditor 复核。
- `readerEffectHypothesis` 必须明确是推断，不能写成已观察的读者事实。
- `mappedExistingDimensions` 只用于路由和解释，不自动升级严重度。
- draft、intent、Context 或 Canon revision 变化时，extended craft 与原审阅一起 stale。
- 证据无法映射到当前正文时不显示建议。
- 不计算综合文学分。

### 6.4 Agent 调用

- 不新增角色；继续使用 Auditor。
- 只有作者启用并选择 advisory lens 时，`literary_review` 才接收 `requestedAdvisoryLensIds`。
- P0B 可以在同一次文学审阅返回 sibling payload，避免额外的自由生成 Agent。
- 准备显露的 active advisory `revision_candidate` 应由第二 Auditor verify/reject，减少低价值提示。
- 第二复核只能验证或驳回，不得偷改镜头、证据、诊断或修改方向。
- 复核结果只控制“是否值得显示”，不控制 Canon。

## 7. 本地数据与隐私

### 7.1 P0A 无需升级 IndexedDB 版本

当前本地数据库为 v10。P0A 可以：

- 在 `meta` 增加 `writing-assist-preferences`。
- 继续使用现有 `literaryReviews`、`repairProposals` 和 `creationDecisionEvents`。
- 使用已有 `requestedFocusDimensions` 保存本次现有维度选择。
- 将推荐本身作为可重算的临时 ViewModel；事件只保存镜头、原因码、scope 和时间，不保存新增正文副本。

### 7.2 P0B 推荐继续使用现有 review store

将 `extendedCraft` 作为 `LiteraryReview` 的 optional sibling，可避免仅为 advisory 新建 store 和升级 v11，同时自然复用：

- review 与 Context 绑定。
- draft revision 绑定。
- stale 传播。
- 工作区导出与恢复。
- 当前 review 选择。

实现时必须更新 Zod schema、workspace package schema 和 round-trip fixture，确保旧 v10 记录仍可读取。

### 7.3 偏好形成边界

- “本次忽略”只影响当前 review，不形成永久偏好。
- 只有作者点击“以后少提醒我”或在创作设置中修改，才写入 `suppressedLensIds`。
- 偏好不是 Canon、人物状态或写作资产。
- 偏好只留在本机，并进入版本化工作区备份。
- 清除辅助偏好不删除正文、审阅或 Canon。

## 8. 前端交接

### 8.1 创作设置

当前设置只保存显示偏好。新增独立组件，不把写作辅助塞进 `CreatorWorkspacePreferencesPanel`：

- 建议新增：`app/src/components/creator/CreatorWritingAssistancePreferencesPanel.tsx`
- 接入：`app/src/apps/creator/routes/CreatorSettingsRoute.tsx`
- 读取：`creatorSettingsLoadService.ts`
- 写入：`creatorSettingsActionService.ts`
- 本地 owner：`creatorLocalSettingsRepository.ts`
- 备份：`creatorLocalWorkspacePackage.ts`

面板只展示：

- 写作建议总开关。
- `按本章推荐` / `自己选择`。
- 自定义镜头列表。
- 只在自然检查点出现。
- 已抑制镜头及恢复动作。

不得展示模型、provider、地址、凭据、prompt 或工程开关。

### 8.2 写作台

主要接入点：

- `CreatorEditorRoute.tsx`：组装偏好、上下文与作者动作。
- `creatorEditorConversationReviewService.ts`：解析作者明确关注点。
- `useCreationDecisionSession.ts`：调用 review、保存 focus、处理 stale。
- `CreatorConversationTimeline.tsx`：推荐卡、单张 finding、局部候选与作者决定。
- `CreatorDecisionStagePanel.tsx`：如该视图仍为兼容 owner，只同步领域状态，不另建一套推荐规则。

### 8.3 推荐卡组件

建议新增共享组件：

```text
CreatorWritingAssistRecommendationCard
CreatorWritingAssistFindingCard
CreatorWritingAssistLensPicker
CreatorWritingAssistInlineDiff
```

组件约束：

- 不使用嵌套 Card 堆叠。
- 不占用正文顶部高度。
- 不以浮层遮挡编辑器。
- 状态包括 loading、empty、success、error、stale、dismissed。
- reduced motion 下无进入动画。
- 推荐和 finding 使用 `aria-live="polite"`，硬阻断使用现有明确状态区。
- 中等视口必须保持正文优先。

### 8.4 产品文案

使用作者语言：

- `写作建议`
- `这次关注`
- `按建议看看`
- `自己选择`
- `本次不用`
- `定位原文`
- `看一个局部方案`
- `保持原文`
- `以后少提醒我`

不要在产品界面使用：

- advisory lens
- focalization
- schema
- confidence score
- Agent / AI / 模型 / LLM
- 后端 / 接口 / 数据库 / 回写
- hard block / revision candidate

术语可以留在领域层、日志和本交接文档。

## 9. 后端与领域层交接

### 9.1 现有 owner

| 能力 | 现有 owner | 本轮要求 |
| --- | --- | --- |
| 审阅入口 | `CreationDecisionWorkflow.reviewDraft` | 接收可选 advisory lens，不改变现有 focus |
| 审阅合同 | `types.ts` / `schemas.ts` | 添加 optional sibling payload |
| 本机角色调用 | `localWorkingAgent.ts` | 仅在启用时传 advisory lens |
| 现有 11 维审阅 | `referenceWritingAgent.ts` / Auditor | 保持现有门禁语义 |
| finding 复核 | literary finding verification | advisory 使用独立 receipt 或独立 id 空间 |
| 局部修改 | `proposeRepair` / Reviser / Repair Auditor | 继续单块替换 |
| 正文确认门禁 | `candidateQualityGate.ts` | 明确忽略 extended craft |
| 失效传播 | `creationDecisionWorkflow.ts` | review stale 时 sibling 一起 stale |
| 本地持久化 | `creatorLocalDecisionRepository.ts` | optional field round-trip |

### 9.2 必须增加的防误接测试

至少加入以下断言：

1. active advisory `revision_candidate` 不阻断 Canon。
2. 同证据对应现有 `hard_block` 时仍阻断 Canon。
3. advisory finding 不能伪装成现有 `LiteraryDimension`。
4. assistant off 时不发 advisory 请求。
5. draft revision 变化后旧推荐和 extended craft 都不可显示或采用。
6. advisory repair 仍需通过事实保持、目标维度和作者方向复核。
7. advisory repair 被拒绝后原文保持不变。
8. 自动 RAG 仍为 disabled。

## 10. 工作包与依赖顺序

### WP0. 合同冻结

交付：

- `CreatorWritingAssistPreferences`。
- recommendation reason code 枚举。
- advisory lens 枚举。
- `ExtendedCraftReview` sibling 方案。
- gate 不变式测试。
- 产品文案表。

退出条件：产品、前端、领域层对“可选辅助”和“不可关闭安全边界”没有歧义。

### WP1. 本地偏好与备份

交付：

- meta key 和 repository。
- 设置页面板。
- 默认关闭、显式启用。
- 项目默认和本章临时覆盖。
- 导出、预览、导入、回滚 round-trip。

依赖：WP0。

### WP2. P0A 有界推荐器

交付：

- 扩展现有 conversation review parser。
- stage / explicit focus / Genre Kernel reason codes。
- 最多两个镜头。
- 空推荐支持。
- 关闭时零 advisory 调用。

依赖：WP0、WP1。

### WP3. P0A 低负担 UI

交付：

- 推荐卡。
- 自定义镜头选择。
- 单 finding 显露。
- `保持原文 / 看一个局部方案 / 稍后处理`。
- 原文定位和局部 diff。
- no-op、stale、error 状态。

依赖：WP2、现有 review / repair。

### WP4. P0B 扩展文学镜头

交付：

- POV、潜台词、节律、结尾四项合同。
- optional `extendedCraft` schema。
- Auditor prompt / parser / evidence validation。
- active advisory finding 的独立 verify/reject。
- candidate quality gate 隔离测试。

依赖：WP0、WP3。

### WP5. 认知负担事件与偏好抑制

交付：

- 推荐显示、开始、忽略、定位、请求候选、采纳、手动修改、返回写作事件。
- 只记录 lens、reason code、scope、时间和 revision，不复制正文。
- “以后少提醒我”的显式持久化。
- 本地汇总 ViewModel。

依赖：WP1、WP3。

### WP6. P1/P2 扩展

交付：

- 意象、主题、情绪、文化镜头。
- arc/book 层聚合。
- 冻结样本、作者行为和后续专业人评校准计划。

依赖：P0A/P0B 真实使用证据。

## 11. 验收场景

### AC1. 默认关闭

Given 新工作区没有辅助偏好，

When 作者打开写作台并持续输入，

Then 不出现推荐卡、不运行 advisory 分析、不改变正文布局；现有候选、Canon 和发布边界保持有效。

### AC2. 推荐模式

Given 作者已启用“按本章推荐”，

When 作者完成一个对话密集场景并主动点击“看看这一章”，

Then 系统最多推荐两个镜头，解释原因，不自动生成修改。

### AC3. 自定义模式

Given 作者选择“节奏”和“结尾”，

When 发起审阅，

Then 只把这两项作为当前 advisory focus；其余现有安全门禁不被缩减。

### AC4. 单卡显露

Given 审阅返回多个 advisory finding，

When 结果进入写作台，

Then 默认只显示排序最高的一项，其余折叠为“还有 N 项”；不得自动滚动或抢占正文焦点。

### AC5. 保持原文

Given finding 属于 `taste_note` 或 advisory `revision_candidate`，

When 作者点击“这是有意的”，

Then 当前 finding 被 dismiss，正文、Canon 和项目偏好不变；只有点击“以后少提醒我”才写偏好。

### AC6. 局部候选

Given 作者请求一个局部方案，

When Reviser 和独立复核通过，

Then UI 显示一个证据块 diff；作者未确认前正文不变。

### AC7. 真实硬问题

Given advisory 分析发现人物拥有不可得知识，

When 该问题被映射到现有 information control finding 并完成复核，

Then 使用现有硬边界流程；不能仅以 advisory 卡绕过。

### AC8. Stale

Given 一张建议绑定 draft revision 4，

When 作者手动修改正文形成 revision 5，

Then旧推荐、旧 finding 和旧局部候选不可继续采用，必须重新分析。

### AC9. 关闭后无残留

Given 作者关闭写作建议，

When 返回写作台，

Then 不再出现新的 advisory 推荐；现有历史收据可保留但不主动展示。

### AC10. 备份恢复

Given 作者导出包含辅助偏好的工作区，

When 在空工作区预览并确认导入，

Then 偏好与 review optional payload 可校验恢复；旧 v10 包仍可读取。

## 12. 认知负担指标

### 12.1 主指标

- 每千字主动打断次数。
- 每章默认显露的建议卡数量。
- 从建议出现到重新输入正文的时间。
- 从候选完成到作者确认正文的总时间。
- 一次处理需要的点击或确认次数。
- 同一镜头连续被拒绝或忽略的次数。
- 作者主动展开深度审阅的比例。
- 第二轮继续创作率。

### 12.2 质量与安全护栏

- 建议证据可定位率。
- advisory finding 复核驳回率。
- 局部修订回退率。
- 修订后现有 hard constraint 回归失败率。
- stale 建议误用次数，目标为 0。
- advisory 误阻断 Canon 次数，目标为 0。
- 未经确认正文/Canon/发布写入次数，目标为 0。

### 12.3 不应作为单一成功指标

- 建议数量。
- 点击率。
- 候选生成次数。
- 建议采纳率。
- 模型自评质量分。

采纳率变高可能来自更强的默认锚定，不能单独证明体验或质量改善。

## 13. 验证与测试计划

### 13.1 单元和领域测试

- preferences default / save / reset / scope override。
- recommendation max-two、空推荐、固定排序和抑制。
- off 模式不调用 advisory。
- ExtendedCraftReview Zod round-trip。
- advisory 不进入 candidate quality gate。
- stale propagation。
- local repair fact preservation。
- workspace package backward-compatible round-trip。
- product copy 不出现禁用术语。

### 13.2 浏览器验证

必须使用真实 Creator 路径验证：

1. 关闭 -> 写作中无打断。
2. 推荐 -> 一张推荐卡 -> 开始审阅。
3. 自定义 -> 选择两项 -> 审阅。
4. 多 finding -> 默认只显露一项。
5. 定位原文 -> 编辑器保持焦点和滚动位置可理解。
6. 看局部方案 -> diff -> 放弃，正文不变。
7. 看局部方案 -> 采用 -> 旧审阅 stale -> 重新审阅。
8. 关闭辅助 -> 正文确认安全门禁仍有效。
9. 中等视口正文不被顶部或侧栏卡片挤出首屏。
10. reduced motion 和键盘操作可用。

### 13.3 建议新增门禁

```text
npm run check:creator-writing-assistance
npm run qa:creator-writing-assistance
```

门禁至少检查：

- UI 不直接枚举工程术语。
- 推荐不超过两个镜头。
- advisory severity 无 hard_block。
- candidate quality gate 不读取 `extendedCraft.findings`。
- 自动 RAG 状态未被改变。
- 写作中没有 timer-based review trigger。
- 推荐、finding 和 repair 都绑定当前 revision。

### 13.4 现有相关检查

实现阶段按修改范围运行：

```bash
npm run check:creator-writing-capability-evidence
npm run check:creator-product-boundary
npm run check:no-custom-rag
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run check:slicing
npm run check:pivot
npm --prefix app run lint
npm --prefix app run build:creator
```

文档交接不声称这些实现门禁已经针对新功能通过；它们是开发完成后的退出条件。

### 13.5 本次交接验证收据

2026-07-18 对本文件执行：

- Markdown 结构检查：PASS，代码围栏成对，所有相对链接存在，无行尾空白。
- 来源目录机械复核：PASS，138 条；英文 70、中文 68；A1 58、A2 21、A3 48、B 11。
- `npm run check:creator-writing-capability-evidence`：PARTIAL / BLOCKED。

能力证据门禁的本次结果：

- `check:creator-chapter-20-mirofish-rehearsal`：PASS，仍为 `candidateOnly=true`、`literaryGainProven=false`。
- `check:creator-manual-recall-effect-real-trial`：PASS，仍为单配对测量且 `automaticRetrievalEnabled=false`。
- `check:creator-manual-recall-effect-real-campaign`：因缺少 `validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json` 停止。

该缺口不是本文件引入的实现回归，但意味着当前 checkout 不能声称整套 capability evidence gate 已绿。后续开发者应先恢复或重新生成权威 campaign artifact，再使用该总门禁作为发布证据；不要用单配对 PASS 代替 campaign 结论。

## 14. 发布、回退与声明边界

### 14.1 发布顺序

1. 内部 flag 下完成 P0A。
2. 先验证开关、推荐、单卡、局部方案和关闭路径。
3. 再接入四个 P0B advisory lenses。
4. 观察认知负担护栏，再决定是否扩大镜头和自动显露范围。
5. 没有真实作者行为数据前，不默认开启项目级深度审阅。

### 14.2 回退

- 关闭内部 flag 后，写作台回到现有 11 维审阅入口。
- 保留 optional 字段向后兼容；旧记录继续可读。
- 关闭辅助不删除历史正文、审阅、修订或 Canon。
- 如果 advisory 误进入 gate，立即停用 extended craft 读取，保留现有 `LiteraryReview.findings` 权威性。

### 14.3 可以声明

- 作者可以选择关闭、使用推荐或自定义写作建议。
- 推荐使用当前授权上下文，最多给出两个镜头。
- 每个显露建议有正文证据和局部实验。
- 任何修改仍需作者决定。
- advisory 不改变 Canon 或发布边界。

### 14.4 不可以声明

- 已证明稳定提升文学质量。
- 等同于专业编辑。
- 模型建议代表读者真实感受。
- 自动 RAG 已上线。
- 一本书可以由综合分裁决。
- 开启更多镜头一定更好。

## 15. 明确不做

- 不新增自由生成全文的 Agent。
- 不自动采用第一候选。
- 不自动重写整章。
- 不自动改 Canon 或发布。
- 不启用自动 RAG。
- 不默认运行 MiroFish。
- 不输出文学总分或排行榜。
- 不把八个镜头同时展示成检查清单。
- 不以平均句长、词汇多样性或感官词密度替代文学判断。
- 不模仿在世作家或从受保护作品提取风格指纹。
- 不把一次忽略静默学习成永久作者偏好。

## 16. 开发完成定义

P0A 完成需要同时满足：

- 作者可以关闭、推荐、自定义。
- 关闭时新增 advisory 调用为 0。
- 推荐最多两个镜头且原因可解释。
- 一个自然检查点默认只显露一张卡。
- 一个建议最多一个局部实验。
- 作者可保持原文且不形成隐式永久偏好。
- 新增功能不改变现有候选、Canon、发布和手选召回边界。
- 本地偏好可备份恢复。
- 真实浏览器验证正文不被打断或挤压。

P0B 完成还需要：

- 四个 advisory lens 均有独立合同和证据定位。
- advisory severity 不包含 hard block。
- active advisory finding 不阻断 Canon。
- 真正的硬问题能回到现有 11 维门禁。
- 局部候选通过现有事实保持、全文效果和作者方向复核。
- 负向 fixture 证明无 finding、finding 被拒绝和修订回退都能安全 no-op。

## 17. 下一位开发者的第一步

不要再重复 WP0-WP2，也不要继续增加镜头 prompt。按以下顺序收尾：

1. 已完成：advisory `revision_candidate` 通过明确的联合类型进入现有 `Reviser -> Auditor`；未验证、非 revision candidate 或 stale 建议会失败关闭，不再强转成现有硬维度 finding。
2. 已完成：线性时间线提供 `看一个局部方案 / 稍后处理`，一次只显示一个原文/候选 diff；正文只有在作者点击采用后才生成新 revision，拒绝与稍后均不改正文。
3. 下一步：增加 recommendation/finding 的 no-op、stale、error 和刷新浏览器矩阵；事件只记录 lens、reason、scope、revision 和时间，不复制正文。
4. 下一步：用冻结章节做候选前后盲评；没有跨样本偏好证据前，继续保持“质量提升未证明”。
5. 通过上述退出条件后再评估 P1/P2 镜头，不扩张自动 RAG、Agent 数量或章节生成范围。

### 17.1 2026-07-19 advisory 局部修订收口

- 新增 `LocalRepairFinding` 联合类型与 `advisoryCraftRepairAdapter.ts`。`mappedExistingDimensions` 只保留为解释信息，不形成硬性维度或 Canon 门禁。
- `RepairProposal.findingSource` 对新记录标记 `existing_product` 或 `advisory_lens`；字段保持 optional，使旧 v10 修订记录仍可读取。
- advisory 局部候选复用现有 Reviser 和独立 Auditor，仍只允许一个证据块、一个完整替代候选和一次作者决定。
- 时间线使用现有 shadcn Button/Badge 展示原文与局部候选；采用、拒绝、稍后处理均为明确动作，不新增页面 CSS。
- advisory 待决候选明确排除在 Canon 与下一章阻断之外；现有硬性修订候选的阻断行为不变。
- advisory 采用、拒绝、保持原文和稍后处理事件只记录 finding/lens/reason/scope/revision，不复制原文或候选正文。
- 领域测试证明生成候选不会覆盖正文、拒绝保持正文不变、采用后旧审阅 stale、稍后处理可恢复为下次重新审阅的问题；这仍不是稳定文学质量提升证明。

下一阶段最大风险已经从“功能是否接通”转为“局部方案是否真有帮助、是否覆盖作者修改、是否造成额外认知负担”。
