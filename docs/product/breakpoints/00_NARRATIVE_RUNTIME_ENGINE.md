# 00 Narrative Runtime Engine

本文档定义平行宇宙小说后端的核心运行时中枢。它不是一个前端页面，也不是某个单独 agent，而是所有创作、阅读选择、分支生成和状态写回必须经过的服务层。

## 1. 产品定位

`Narrative Runtime Engine` 负责把用户的一句话、一次选择或一次创作者确认，转成可追踪、可评估、可回滚的叙事推进。

它解决的问题：

- 防止 `/create`、`/story`、`/studio` 各自绕过规则生成内容。
- 防止模型直接把候选内容写成正史。
- 防止题材约束、类型内核、时间一致性、质量刹车互相脱节。
- 防止后端能力有了，但前端入口和状态无法对应。

不做什么：

- 不在公共页面暴露 `kernel`、`constraint`、`quality brake`、`runtime` 等内部词。
- 不替代具体模型调用层。
- 不替代数据库。
- 不把大模型输出直接视为最终正文。

## 2. 必须负责的七件事

### 2.1 Constraint Evaluation

输入：

- 用户选择的题材、时代、地域感、叙事视角、禁用设定。
- `setting_cards.genre_constraints`
- `GENRE_CONSTRAINT_RULES.md`
- 当前世界状态、人物状态、章节状态。

输出：

- `ConstraintSet`
- `blocked_terms`
- `required_elements`
- `era_rules`
- `world_rules`
- `style_limits`
- `hard_fail_conditions`

验收标准：

- 用户前提条件能被抽象为可编辑约束，而不是写死在单一 prompt。
- 用户没要求时，不得出现时代错位职业、系统面板、游戏术语、平台词。
- 所有硬约束必须进入生成前 prompt 和生成后质量检查。

### 2.2 Kernel Selection

输入：

- 用户输入。
- 用户选择的主宇宙模板。
- 市场趋势扫描结果。
- 冻结 memo 小模型给出的题材参数。
- 人工编辑的 `GENRE_KERNEL_RULES.md`。

输出：

- `GenreKernel`
- `kernel_version`
- `kernel_source: human | memo | system`
- `kernel_confidence`

验收标准：

- 同一用户输入在不同题材下会选到不同内核。
- 内核选择结果可解释、可记录、可回放。
- 类型内核不会互相污染。

### 2.3 Scene Planning

输入：

- 当前章节目标。
- 类型内核。
- 已确认状态卡。
- 时间候选事件。
- 人物压力、伏笔成熟度、冲突阶段。

输出：

- `ScenePlan`
- `ChapterPlan`
- `required_state_refs`
- `candidate_events`
- `choice_slots`

验收标准：

- 生成正文前必须先有 scene plan。
- plan 只能给后端和 Studio 使用，不能污染读者正文。
- 每个 plan 必须能解释本章推进了什么冲突、人物、伏笔或规则。

### 2.4 State Writeback

输入：

- 用户回答。
- 模型生成正文。
- scene plan。
- 用户选择。
- 质量评估结果。

输出：

- `StoryStateCard`
- `StoryStateChange`
- `WorldInstance`
- `CharacterState`
- `RelationshipEvent`
- `MemoryFact`

验收标准：

- 所有回写都有来源：`human | memo | llm | system`。
- 未确认内容默认是 `candidate`。
- 进入 `canon` 或 `branch` 必须有质量结果和确认动作。
- 回写失败时必须整体回滚，不允许正文成功但状态丢失。

### 2.5 Time Consistency

输入：

- 章节时间线。
- `TimeCandidateEvent`
- 已发生事件。
- 世界规则。
- 人物当前位置和知识状态。

输出：

- `TimeConsistencyReport`
- `timeline_conflicts`
- `required_repair`
- `accepted_time_events`

验收标准：

- 同一人物不能在同一时间出现在不可能地点。
- 后文不能使用角色尚未知道的信息。
- 伏笔回收必须能找到历史事件来源。
- 时间冲突触发 rewrite 或 block。

### 2.6 Quality Brake

输入：

- 候选正文。
- scene plan。
- constraint set。
- time consistency report。
- state writeback preview。

输出：

- `QualityBrakeReport`
- `decision: candidate | rewrite | block | canon_ready | branch_ready`
- `reasons`
- `repair_prompt`

验收标准：

- 正文默认不能直接进入 canon。
- 时代错位、题材跑偏、内部词泄漏、AI 味严重、时间矛盾是一票否决。
- Studio 能看到原因，读者页只看到自然反馈。

### 2.7 Branch Generation

输入：

- 用户选择。
- 当前世界线。
- 当前章节和状态卡。
- 分支约束。
- 质量结果。

输出：

- `Worldline`
- `WorldInstance`
- `BranchState`
- `NextSceneSeed`
- `ReaderProgress`

验收标准：

- 每次选择都能生成或更新世界线。
- 分支不是简单文案替换，而是状态、人物关系、时间线同时变化。
- 读者能继续阅读，创作者能在 Studio 追踪分支原因。

## 3. 推荐执行管线

```text
UserInput / ReaderChoice / CreatorConfirm
  -> Constraint Evaluation
  -> Kernel Selection
  -> Scene Planning
  -> Candidate Draft
  -> Time Consistency Check
  -> State Writeback Preview
  -> Quality Brake
  -> Human Confirm or Auto Branch Policy
  -> State Writeback Commit
  -> Branch / Canon / Candidate Result
```

## 4. 后端 API 建议

公共 facade：

- `POST /v1/runtime/create`
- `POST /v1/runtime/advance`
- `POST /v1/runtime/confirm`
- `GET /v1/runtime/runs/{run_id}`

内部或 Studio API：

- `POST /v1/runtime/evaluate-constraints`
- `POST /v1/runtime/select-kernel`
- `POST /v1/runtime/plan-scene`
- `POST /v1/runtime/check-time`
- `POST /v1/runtime/quality-brake`
- `POST /v1/runtime/commit-state`

原则：

- 前端公共页面只调用 facade。
- Studio / Ops 可以读取运行证据。
- 禁止公共页面直接调用 quality、kernel、time event 等内部接口。

## 5. 数据模型建议

最小数据对象：

- `NarrativeRun`
- `RuntimeStep`
- `ConstraintSet`
- `KernelSelection`
- `ScenePlan`
- `StateWritebackPreview`
- `TimeConsistencyReport`
- `QualityBrakeReport`
- `BranchGenerationResult`

`NarrativeRun` 必填字段：

- `id`
- `user_id`
- `surface: create | story | studio | ops`
- `world_id`
- `worldline_id`
- `input_type: seed | answer | reader_choice | creator_confirm | retry`
- `status: running | awaiting_human | candidate_ready | committed | blocked | failed`
- `current_step`
- `selected_kernel_id`
- `constraint_set_id`
- `quality_decision`
- `created_at`
- `updated_at`

## 6. 与现有后端包的关系

可以复用：

- `GenreKernelV1`
- `TimeCandidateEvent`
- `WorldTemplate`
- `WorldInstance`
- `StoryStateCard`
- `StoryStateChange`
- `ChapterChoice`
- `SceneAdvanceResponse`
- content safety / editorial style / manuscript audit
- `UserLlmRuntime`

必须重构：

- `apps/api/app/main.py` 中的编排逻辑。
- `apps/api/app/agents/chapter.py` 中的章节生成逻辑。
- 直接暴露给前端的内部 time candidate、quality、kernel 接口。

## 7. 前端 UX 边界

读者页看到：

- 下一段正文。
- 一个自然语言选择结果。
- 阅读进度。
- 可理解的分支提示。

创作页看到：

- 对话式追问。
- 可确认的设定卡。
- 下一段正文。
- 风格、人物、场景、规则的自然语言状态。

Studio / Ops 看到：

- Runtime run trace。
- 约束命中。
- 内核选择。
- 质量报告。
- 时间一致性报告。
- 分支和发布证据。

公共页面禁止出现：

- runtime
- kernel
- constraint
- quality brake
- time candidate
- memo distillation
- backend
- PRD
- API

## 8. 一票否决项

- 前端页面绕过 Runtime Engine 直接调用生成接口。
- 模型输出未过质量刹车就写成 canon。
- 用户题材约束没有进入生成前和生成后双重检查。
- 状态写回与正文生成不是同一事务或同一 run。
- 读者公共页面暴露内部工程词。
- 不能复现一次创作推进的完整 run trace。

## 9. 交付标准

后端交付：

- `NarrativeRuntimeEngine` 服务。
- facade API。
- run trace 存储。
- 七个步骤的单元测试。
- create/story 两条端到端测试。

前端交付：

- `/create` 只通过 runtime facade 推进创作。
- `/story` 只通过 runtime facade 提交选择。
- `/studio` 能查看 run trace，但不影响公共页面。

验收证据：

- 一条用户故事种子生成首段正文。
- 一次用户追问回答完成状态回写。
- 一次读者选择生成分支。
- 一次质量失败触发 rewrite 或 block。
- 一次时间冲突被拦截。
- 一次 runtime run trace 可导出。
