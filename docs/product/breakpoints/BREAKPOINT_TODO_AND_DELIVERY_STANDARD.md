# 平行宇宙小说一级断点 TODO 与交付标准

本文档用于把产品方案拆成团队可逐项填写、修改和扩展的一级断点。每个断点都必须回答同一组问题，避免前端、后端、模型、运营各做一套互相对不上的东西。

相关可编辑规则文档：

- `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- `docs/product/rules/GENRE_KERNEL_RULES.md`

## 0. 总体判断

平行宇宙小说不是普通 AI 写作工具。它的产品核心是：

1. 用户通过阅读或创作进入一个世界。
2. 每一次选择、回答或确认都会改变世界状态。
3. AI 生成内容先进入候选态。
4. 质量刹车和人工确认决定内容能否进入正史或分支。
5. 类型内核、时间引擎、状态回写和多模型编排共同保证故事不崩。
6. Web 阅读入口服务普通用户，创作者工作台服务作者和运营，内部系统能力不能泄漏到公共页面。

## 1. 统一填写框架

每个一级断点必须按以下结构填写。

### 1.1 产品决策

说明这个模块解决什么用户问题，以及它为什么是平行宇宙小说的核心。

团队填写：

- 目标用户：
- 用户问题：
- 产品价值：
- 不做什么：

### 1.2 人工输入

说明哪些内容必须由人确认，不能由模型自动决定。

团队填写：

- 用户必须输入：
- 创作者必须确认：
- 运营必须配置：
- 允许用户覆盖的规则：

### 1.3 系统生成

说明哪些内容可以由模型、Memo 小模型、规则引擎或算法自动生成。

团队填写：

- LLM 动态生成：
- Memo 冻结模型提供：
- 规则引擎计算：
- 时间引擎模拟：
- 质量系统评估：

### 1.4 后端接口和数据

说明需要哪些 API、数据表、状态字段和事件。

团队填写：

- API：
- 数据模型：
- 状态枚举：
- 事件日志：
- 权限边界：

### 1.5 前端入口和 UX

说明用户在哪里看到这个能力，以及普通用户和创作者看到的差异。

团队填写：

- 普通用户入口：
- 创作者入口：
- Studio / Ops 入口：
- 移动端表现：
- 禁止出现的内部词：

### 1.6 验收标准

说明什么证据能证明这个模块真的可用。

团队填写：

- 单元测试：
- API 测试：
- 浏览器 QA：
- 样例 session：
- 日志 / 状态截图：
- 一票否决项：

## 2. 一级断点总览

| 编号 | 一级断点 | 决定什么 | 当前优先级 | 主要交付物 |
|---|---|---|---|---|
| 00 | Narrative Runtime Engine | 统一编排约束、内核、场景、状态、时间、质量和分支 | P0 | `00_NARRATIVE_RUNTIME_ENGINE.md` |
| 01 | 世界引擎 | 世界如何生成、分支、记忆和延续 | P0 | `WORLD_ENGINE_SPEC.md` |
| 02 | 类型内核 | 各题材如何保持节奏、动机和高潮不崩 | P0 | `GENRE_KERNEL_RULES.md` |
| 03 | 时间引擎 | 剧情事件如何平缓、爆发、余波 | P1 | `TIME_ENGINE_SPEC.md` |
| 04 | 状态回写 | AI 写完后哪些内容进入长期状态 | P0 | `STATE_WRITEBACK_SPEC.md` |
| 05 | 多模型编排 | 不同模型负责什么任务 | P0 | `MODEL_ORCHESTRATION_SPEC.md` |
| 06 | 质量刹车 | 什么内容可进入候选、分支或正史 | P0 | `QUALITY_BRAKE_POLICY.md` |
| 07 | Agent Eval | 如何证明 Agent 没跑偏 | P1 | `AGENT_EVAL_PLAN.md` |
| 08 | Codex Harness | 工程执行闭环与日志状态标准 | P1 | `CODEX_HARNESS_RUNBOOK.md` |
| 09 | Web 阅读入口 | 普通用户第一眼如何进入阅读和选择 | P0 | `WEB_READER_ENTRY_SPEC.md` |
| 10 | 创作者工作台 | 作者如何创作、确认、发布 | P0 | `CREATOR_WORKBENCH_SPEC.md` |
| 11 | 商业化发布链路 | 产品如何收费、发布、上线、回滚 | P1 | `COMMERCIAL_RELEASE_CHAIN.md` |

## 3. P0 待办清单

### 3.0 Narrative Runtime Engine

目标：建立所有创作、阅读选择、分支生成和状态写回的统一后端运行时，防止各接口绕过约束、内核、时间一致性和质量刹车。

TODO：

- [ ] 定义 `NarrativeRuntimeEngine` 的服务边界。
- [ ] 定义统一执行链：constraint evaluation -> kernel selection -> scene planning -> candidate draft -> time consistency -> state writeback preview -> quality brake -> branch/canon/candidate commit。
- [ ] 定义 `/create`、`/story`、`/studio` 分别通过 runtime facade 调用哪些能力。
- [ ] 定义 `NarrativeRun`、`RuntimeStep`、`ConstraintSet`、`KernelSelection`、`ScenePlan`、`TimeConsistencyReport`、`QualityBrakeReport`、`BranchGenerationResult`。
- [ ] 定义失败、重试、人工确认和回滚机制。
- [ ] 定义公共页面不得直接调用 kernel、quality、time candidate 等内部接口。

交付标准：

- `/create` 的故事种子推进、`/story` 的读者选择、`/studio` 的人工确认都能落到同一条 runtime run trace。
- 用户题材约束会在生成前和生成后各执行一次。
- 内核选择、场景计划、时间检查、质量刹车和状态回写都有可追踪证据。
- 状态提交必须是事务化的：正文、状态卡、事件、分支不能只成功一部分。
- 读者公共页面不出现 runtime、kernel、constraint、quality brake、time candidate 等内部词。

### 3.1 世界引擎

目标：定义世界、分支、记忆、关系和时间线的主数据结构。

TODO：

- [ ] 定义 `WorldTemplate` 的必填字段。
- [ ] 定义 `WorldInstance` 如何记录用户选择、分支、记忆和关系。
- [ ] 定义 `canon / branch / candidate` 三种状态的转换规则。
- [ ] 定义用户选择如何影响个人世界线和公共世界线。
- [ ] 定义世界记忆的最小可用字段：人物、地点、规则、伏笔、关系、事件。
- [ ] 定义哪些世界状态普通用户可见，哪些只在 Studio / Ops 可见。

交付标准：

- 有一份可实现的数据模型。
- 至少 3 个主宇宙模板能落到同一套结构。
- 用户完成一次选择后，系统能保存分支、记忆和下一步状态。
- 前端 `/story` 和后端世界状态字段一一对应。

### 3.2 类型内核

目标：定义每类题材如何驱动生成和校验。

TODO：

- [ ] 人工确认首批类型内核列表。
- [ ] 为每个类型内核填写 thesis、pacing、event structure。
- [ ] 补齐人物动机规则、冲突规则、高潮回收规则。
- [ ] 将 `GENRE_KERNEL_RULES.md` 作为人工编辑源。
- [ ] 建立 `GenreKernel` 与 `WorldTemplate.kernelId` 的映射。
- [ ] 定义类型内核进入生成 prompt 和质量评估的方式。

交付标准：

- 每个上线主宇宙都有对应 `GenreKernel`。
- 类型内核能被 `/create` 和 `/story` 共同引用。
- 一个题材的规则不会污染另一个题材。
- 修改 `GENRE_KERNEL_RULES.md` 后，团队能明确同步到代码或数据库的位置。

### 3.3 状态回写

目标：定义 AI 生成后哪些内容进入长期状态，哪些只作为临时草稿。

TODO：

- [ ] 定义 `setting_cards` 的正式 schema。
- [ ] 区分人工输入、Memo 冻结模型、LLM 动态生成、系统自动派生四类来源。
- [ ] 定义人物、场景、世界规则、冲突、伏笔、章纲如何回写。
- [ ] 定义哪些字段自动回写，哪些字段必须人工确认。
- [ ] 定义回写失败、冲突、覆盖和撤销机制。
- [ ] 定义回写后的前端展示方式。

交付标准：

- `/creator/dialogue` 每轮响应都能产生可追踪的状态变更。
- 用户回答能在下一段正文和状态卡中同时体现。
- 回写内容有来源标记。
- 未确认内容不会直接成为正史。

### 3.4 多模型编排

目标：让创作入口可适配任意大模型，并为不同任务选择不同模型。

TODO：

- [ ] 固化 provider-agnostic adapter 合同。
- [ ] 区分 creator、judge、reranker、memo、image、embedding 等任务。
- [ ] 定义每个任务的模型能力要求：JSON、streaming、tool calling、低延迟、低成本。
- [ ] 定义 provider fallback 顺序。
- [ ] 定义 Studio / Ops 显示模型状态的字段。
- [ ] 定义公共页面禁止展示的模型内部信息。

交付标准：

- DeepSeek、OpenAI-compatible、本地模型至少能通过统一配置接入。
- Ops 能看到 provider、model、fallback、latency、capability profile。
- 公共 `/create` 不出现 provider/API/model/system prompt 等内部词。
- provider 切换不要求改前端。

### 3.5 质量刹车

目标：所有 AI 内容先进入候选态，经过质量评估和确认后才能进入正史或分支。

TODO：

- [ ] 定义 `QualityBrakeReport` schema。
- [ ] 定义评分维度：节奏、人物一致性、时间一致性、伏笔连贯、AI 味、题材约束。
- [ ] 定义一票否决项：时代错位、系统词泄漏、题材跑偏、禁用词、前后矛盾。
- [ ] 定义 candidate、rewrite、block、canon、branch 的转换规则。
- [ ] 将 `GENRE_CONSTRAINT_RULES.md` 接入质量刹车。
- [ ] 定义服务端最终净化层和人工确认点。

交付标准：

- 生成内容默认不是 canon。
- 禁用词和时代错位能被拦截或替换。
- 质量报告可被 Studio 展示。
- 至少有一组失败样例能触发 rewrite 或 block。

### 3.6 Web 阅读入口

目标：普通用户以阅读和选择进入产品，而不是先看到后台逻辑。

TODO：

- [ ] 定义首页信息架构：推荐、分类、主宇宙、开始阅读。
- [ ] 定义 `/story` 阅读页布局：左索引、中阅读、右抽屉。
- [ ] 定义选择后的反馈：世界线、后果、下一段、保存状态。
- [ ] 定义移动端折叠逻辑。
- [ ] 定义公共页面禁止出现的内部词。
- [ ] 定义阅读入口和创作入口的边界，避免重叠。

交付标准：

- 首页不出现阅读正文大段残留。
- `/story` 一页能舒适阅读至少 200 字，并支持滚动或翻页。
- 读者选择能更新世界状态。
- 公共页面不泄漏后端、provider、PRD、system prompt、fallback 等词。

### 3.7 创作者工作台

目标：创作者以自然语言创作，Studio / Ops 承接复杂系统能力。

TODO：

- [ ] 定义 `/create` 的自然语言对话 SOP。
- [ ] 定义每轮最多追问数量。
- [ ] 定义何时生成正文、何时生成章纲、何时生成设定卡。
- [ ] 定义故事笔记、推理辅助、质量反馈的展示位置。
- [ ] 定义 `/studio` 只显示创作者和运营需要的系统信息。
- [ ] 定义候选片段、质量评分、发布门禁、回滚入口。

交付标准：

- `/create` 不像表单流水账，而是苏格拉底式自然语言对话。
- 用户三分钟内能看到第一段正文。
- 每轮最多两个必要问题。
- 用户回答能立即进入下一段正文。
- Studio / Ops 不污染普通用户路径。

## 4. P1 待办清单

### 4.1 时间引擎

目标：用事件密度、连锁爆发、伏笔成熟度和人物压力驱动剧情节奏。

TODO：

- [ ] 定义时间单位：章、场景、剧情日、世界时间。
- [ ] 定义非齐次泊松过程的剧情阶段强度函数。
- [ ] 定义 Hawkes 自激发事件的参数：`mu / alpha / beta`。
- [ ] 定义伏笔成熟度、人物压力、关系债如何影响事件强度。
- [ ] 定义低权重事件只更新状态，高权重事件展开为正文。
- [ ] 定义时间引擎输出如何进入质量刹车。

交付标准：

- 同一世界能生成平缓、爆发、余波三种事件节奏。
- 重大事件后能产生短期连锁事件。
- 时间线不会自动生成与当前正史冲突的事件。
- 时间引擎可被 Studio 查看和调参。

### 4.2 Agent Eval

目标：用自动化评估证明 Agent 能按 SOP 创作，不跑偏。

TODO：

- [ ] 定义 eval case 结构。
- [ ] 覆盖题材识别、约束应用、禁用词、时代错位、自然对话、状态回写。
- [ ] 定义成功阈值和失败样本库。
- [ ] 定义不同 provider 的横向比较方式。
- [ ] 定义每次 prompt / model / rule 改动后的回归流程。
- [ ] 定义 eval 结果如何进入发布门禁。

交付标准：

- 至少覆盖 10 个真实创作场景。
- 每个 P0 题材至少有 1 个正例和 1 个失败例。
- Eval 报告能指出失败原因。
- 失败样例能复现。

### 4.3 Codex Harness

目标：让工程执行按 plan -> code -> tool -> observe -> fix -> status 循环落地。

TODO：

- [ ] 定义每个任务的执行日志格式。
- [ ] 定义工具调用、测试、浏览器 QA、报告的证据路径。
- [ ] 定义失败修复循环的停止条件。
- [ ] 定义前端、后端、模型、产品文档的统一交付目录。
- [ ] 定义上线前必须跑的 check list。
- [ ] 定义 handoff 包格式。

交付标准：

- 每个 goal 都有明确 objective、验收标准和证据。
- 测试、截图、session、报告不散落。
- 失败原因能被复盘。
- 不重复开发，不把外部前端直接并入主线。

### 4.4 商业化发布链路

目标：定义从可用原型到可收费、可发布、可回滚产品的链路。

TODO：

- [ ] 定义免费用户权益。
- [ ] 定义会员权益。
- [ ] 定义付费触发点：阅读后、选择后、创作后、模板解锁前。
- [ ] 定义作品版权和共创内容提示。
- [ ] 定义发布流程：draft -> candidate -> approved -> published。
- [ ] 定义上线验收、回滚和事故处理。

交付标准：

- 支付和权益状态能影响阅读 / 创作权限。
- 付费入口不打断核心体验。
- 作品发布有人工确认。
- 有生产上线 gate 和 rollback runbook。

## 5. 输入来源矩阵

| 内容类型 | 人手动填入 | Memo 冻结模型 | LLM 动态生成 | 系统/规则引擎 |
|---|---|---|---|---|
| 故事种子 | 必须 | 不提供 | 可扩写 | 不生成 |
| 主角姓名 | 推荐人工 | 不提供 | 可建议 | 不强制 |
| 主角缺口 | 必须确认 | 提供类型参考 | 可提案 | 校验是否缺失 |
| 场景 | 可人工指定 | 提供高压场景库 | 可生成 | 校验时代/题材一致 |
| 世界规则 | 必须确认关键禁忌 | 提供题材规则 | 可扩写 | 约束和冲突检测 |
| 人物功能位 | 可人工改 | 提供默认功能位 | 可生成候选 | 检查重复和缺位 |
| 节奏 | 可选择偏好 | 提供题材节拍 | 可调整语速 | 时间引擎控制 |
| 章末钩子 | 可确认 | 提供密度参数 | 可生成 | 质量刹车评分 |
| 禁用词 / 禁忌设定 | 必须可人工指定 | 可提供类型禁忌 | 不应覆盖 | 一票否决 |
| 正史确认 | 必须人工或明确规则确认 | 不决定 | 不决定 | 状态转换执行 |

## 6. 发布级验收总标准

一个断点可以进入开发完成态，必须同时满足：

- 有产品决策文档。
- 有 schema 或接口定义。
- 有前端入口或明确说明该断点仅限 Studio / Ops。
- 有后端状态或持久化方案。
- 有至少一个成功样例。
- 有至少一个失败样例。
- 有自动测试或 QA 脚本。
- 有浏览器证据，如果涉及用户界面。
- 有不泄漏内部词的检查，如果涉及公共页面。
- 有 handoff 说明。

## 7. 文档交付目录建议

建议团队按以下结构继续填写：

```text
docs/product/breakpoints/
00_NARRATIVE_RUNTIME_ENGINE.md
01_WORLD_ENGINE.md
02_GENRE_KERNEL.md
03_TIME_ENGINE.md
04_STATE_WRITEBACK.md
05_MODEL_ORCHESTRATION.md
06_QUALITY_BRAKE.md
07_AGENT_EVAL.md
08_CODEX_HARNESS.md
09_WEB_READER_ENTRY.md
10_CREATOR_WORKBENCH.md
11_COMMERCIAL_RELEASE_CHAIN.md
BREAKPOINT_TODO_AND_DELIVERY_STANDARD.md

docs/product/rules/
GENRE_CONSTRAINT_RULES.md
GENRE_KERNEL_RULES.md
```

## 8. 推荐执行顺序

第一阶段，先补 P0 闭环：

1. Narrative Runtime Engine
2. 世界引擎
3. 状态回写
4. 质量刹车
5. 创作者工作台
6. Web 阅读入口
7. 多模型编排
8. 类型内核

第二阶段，再补 P1 能力：

1. 时间引擎
2. Agent Eval
3. Codex Harness
4. 商业化发布链路

## 9. 当前下一步

建议下一步由产品侧先填写：

- `00_NARRATIVE_RUNTIME_ENGINE.md`
- `01_WORLD_ENGINE.md`
- `04_STATE_WRITEBACK.md`
- `06_QUALITY_BRAKE.md`

这三份决定产品是不是平行宇宙小说，而不是普通 AI 写作工具。
