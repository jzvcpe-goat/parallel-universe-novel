# Creator Pivot V2 写作质量全网调研与 Skill 方案

日期：2026-07-18
适用产品：Parallel Universe Novel / NarrativeOS Creator Pivot V2
研究范围：小说与长篇叙事写作、读者反应、创意写作教学、人机共创、故事生成与文学质量评测
完整来源目录：[CREATIVE_WRITING_QUALITY_SOURCE_CATALOG_20260718.tsv](./CREATIVE_WRITING_QUALITY_SOURCE_CATALOG_20260718.tsv)

## 1. 结论先行

### 1.1 核心判断

Creator Pivot V2 已经具备相当完整的“写作质量治理骨架”，包括作者意图锁定、场景因果规划、候选优先、证据定位、11 维文学审阅、局部修订、人物状态、长程线程、人工召回、匿名比较、Canon 与发布确认边界。它当前最强的不是“替作者写得更华丽”，而是让写作过程可检查、可失败关闭、可回退，并把最终决定留给作者。

但该产品还不能被描述为“已证明稳定提升文学质量”。仓库自己的最新能力总表也明确记录：34 项能力中，31 项有生产 owner；自动 RAG 仍为 contract_only，MiroFish 为 conditional，稳定文学质量提升与专业人类盲评仍为 false。当前的真实模型样本、单章通过、匿名逐维偏好和本机连续性修复，证明的是机制可执行及边界有效，不是跨题材、跨模型、跨作者的文学效果成立。

置信度：可靠。依据是 2026-07-18 的仓库权威能力表、实际 owner、验证收据与明确 non-claims，而不是对 UI 的推测。

### 1.2 调研规模

- 总计 138 条专业内容：英文 70 条，中文 68 条。
- A1：58 条同行评审论文。
- A2：21 条大学、出版社、学术著作章节或明确标注的预印本。
- A3：48 条中文期刊元数据页，用于覆盖面和后续全文导航，不支撑强因果结论。
- B：11 条作家协会、专业写作机构或大学写作中心的实践文章。
- 主题覆盖：创意写作教学、作者意图、情节与因果、人物与能动性、叙事视角、对话、节奏与悬念、情绪与共情、现场细节、意象与隐喻、文体与声音、类型文学、长篇连续性、检索记忆、修订、匿名比较、AI 共创和整书级评测。

对 35 条按序号分层抽取的链接做了实时可达性检查：29 条返回 200、1 条返回 302、1 条返回 202、4 条由出版平台返回 403。403 代表访问控制，不能直接判为链接失效。目录未发现重复 URL，全部 138 行字段完整。

置信度：可靠。统计来自本地来源目录的机械检查；链接状态是 2026-07-18 的时间切片。

### 1.3 最值得做的产品动作

现在不应该再增加一个可以自由生成全文的“第九个 Agent”。更有价值的是增加一层研究支持、作者可选、证据定位的“扩展写作镜头”，把当前 11 维没有独立表达的方向补出来：

1. 叙事视角与聚焦稳定性。
2. 对话个体声线、言外之意和行动功能。
3. 句法、段落和声音节律。
4. 意象、隐喻和主题推进。
5. 情绪弧线、共情距离和人物关系温度。
6. 结尾兑现、余韵和下一章驱动力。
7. 整书级结构、人物弧和读者体验。
8. 文化语境、类型传统与中文表达特异性。

这些方向首先应作为 advisory lenses，不应直接升级为 hard block；只有经过冻结样本、专业编辑盲评、作者采纳和负向样本验证后，才适合进入新的领域 Schema 或门禁。

置信度：可靠。研究和产品能力对照都支持“先补诊断镜头、后扩硬门禁”，但每一镜头的具体权重仍需实证。

## 2. 研究方法与边界

### 2.1 检索策略

检索同时覆盖中文和英文：

- 英文研究面：ACL Anthology、ACM、AAAI、JAIR、SAGE、Taylor & Francis、Frontiers、PLOS、Oxford Academic、大学机构库与专业写作中心。
- 中文研究面：中国作家网、中国社会科学网、上海大学创意写作平台、中国社会科学院大学、北京师范大学、高等教育出版社、中文期刊索引与大学机构库。
- 学术发现与去重：公开 Web 搜索与 OpenAlex 元数据。
- 关键词族：creative writing、fiction craft、narrative planning、coherence、focalization、dialogue、voice、suspense、pacing、empathy、imagery、revision、human-AI co-writing、story evaluation，以及对应中文词族。

“全网搜索”在本报告中的准确含义是：公开互联网、公开索引、出版商摘要页和机构库。它不包括绕过登录、付费墙或数据库许可获取全文。无法阅读全文的中文期刊项被标为 A3，仅用于证明研究方向存在和提供后续取全文入口。

### 2.2 纳入标准

纳入内容至少满足一项：

- 同行评审研究或明确的学术会议论文。
- 大学课程、写作中心、出版社教材说明或专业作家机构文章。
- 直接研究小说写作、叙事接受、故事生成、写作共创或文学评测。
- 能映射到 Creator 的现有能力或明确缺口。

排除：

- 单纯 SEO 清单、没有作者或机构信息的泛建议。
- 只谈语法纠错、商业文案或学术论文写作，且无法迁移到小说创作的内容。
- 无法核对标题或来源页的二手转述。
- 把单一模型自评当成文学质量证据的材料。

### 2.3 证据等级

| 等级 | 用途 | 可支撑的结论 |
| --- | --- | --- |
| A1 | 同行评审论文 | 方法、实验结果和限定范围内的因果/比较判断 |
| A2 | 大学、出版社、学术章节、预印本 | 设计启发、理论框架；预印本结论需标“可能” |
| A3 | 中文期刊元数据页 | 方向覆盖、全文导航；不单独支撑强结论 |
| B | 专业作家/写作机构实践文章 | 工艺启发和作者工作流，不当作普遍因果规律 |

## 3. Pivot V2 当前产品与后端能力真相

权威入口是 [CREATOR_WRITING_BACKEND_CAPABILITY_MAP.md](../backend/CREATOR_WRITING_BACKEND_CAPABILITY_MAP.md)、[CREATOR_DECISION_WORKBENCH_V1.md](../product/CREATOR_DECISION_WORKBENCH_V1.md) 和 [creator-working-agent-role-runtime.md](../agent-protocol/creator-working-agent-role-runtime.md)。

### 3.1 产品定位

- Creator 是 localhost-only 作者工作台，不是云端自动写作服务。
- 草稿、写作资产、方法卡、未公开上下文和运行记录留在本机。
- 任何候选正文都不能自动采用、改 Canon 或发布。
- 作者选择的召回项是硬包含；自动检索不能覆盖作者选择。
- 工作流只处理单场景、选定节拍或局部文本，不承诺一次生成多章。
- Reader 反馈只作为 External Echo 输入，不能成为创作产品的永久中心。

置信度：可靠。以上是仓库 P0 与 Pivot V2 的明确合同。

### 3.2 已实现的质量能力

| 能力群 | 当前状态 | 研究对照 |
| --- | --- | --- |
| 两问式意图发现与锁定 | implemented | 符合人机共创研究中“在规划与写作阶段都保留人工控制”的方向 |
| Planner 多路径候选 | implemented | 对应 distinct plans、controllability 和 pairwise choice |
| Architect 因果骨架与信息边界 | implemented | 对应 plot causality、character intention 和 suspense information control |
| Writer 单场景候选 | implemented | 候选与 Canon 分离，避免生成即写回 |
| 11 维文学审阅 | implemented | 连续性、张力、信息控制、能动性、声线、新鲜度、类型、重复、解释负担、现场细节、节奏 |
| 独立复核和证据纠正 | implemented | 降低自审自证；但不等于审阅者一定正确 |
| 单块局部修订 | implemented | 与 revision-as-targeted-change 一致，避免整章漂移 |
| 匿名 A/B 逐维比较 | implemented | 比综合总分更可解释，也更接近 pairwise human preference |
| 22 维人物状态 | implemented | 对人物欲望、知识、误信、关系、选择和代价提供可审计状态 |
| 相邻章连续性与长程线程 | implemented | 支持 1–20 章窗口和非相邻线程候选 |
| 人工召回目录 | implemented | 作者控制优先；来源、章节和证据定位失败关闭 |
| 自动 RAG | contract_only | 全文基线已跑，但质量与延迟没有同时过门槛，产品触发未接线 |
| MiroFish 群像排练 | conditional | 只能形成候选卡，需外部进程和作者确认 |
| Genre Kernel、Constraint Profile、TimeEngine | implemented | 类型与约束进入可审计运行层，时间引擎仍为 candidate-only |
| Canon Patch 与下一章门禁 | implemented | 只有作者显式确认后才能原子提交 |

### 3.3 当前证据不能推出什么

以下说法不成立：

- “有 11 维审阅，所以文学质量已被证明。”
- “有匿名 A/B，所以工作流整体优于直接 Writer。”
- “1–20 章连续性候选通过，所以 Canon 已经修复。”
- “自动 RAG 有 benchmark，所以已经上线。”
- “MiroFish 运行过，所以人物塑造普遍提高。”
- “单章 3000 字样本通过，所以可稳定写 100 章。”

反例：仓库已有匿名 campaign 出现工作流在张力、能动性、类型和现场细节占优，而直接 Writer 在声线、重复、解释负担或节奏上占优；局部修订也出现过目标维度仍存在甚至恶化后回退。这说明流程有真实取舍，不能压成单一“更好”。

置信度：可靠。反例来自当前仓库的负向收据和 non-claims。

## 4. 研究综合：什么真正影响写作质量

### 4.1 规划有效，但规划必须服务人物选择

Narrative Planning、Strategies for Structuring Story Generation、Re3 和 DOC 都支持“先有结构化计划，再分段写作/修订”对连贯性有帮助。Re3 的人评报告显示，相比同基座直接生成，整体情节连贯性提高 14 个百分点、与初始 premise 的相关性提高 20 个百分点。

但计划不能只是一串事件。Intent-based planning 的核心是让人物行动能够被欲望、目标和代价解释；否则情节逻辑成立，人物仍像被作者推着走。中文创作资料也反复强调：人物不是情节容器，人物关系与选择才使故事获得意义。

产品含义：

- 保留 Architect 的因果链和人物知识边界。
- 每个 beat 不只写“发生什么”，还要写“谁作出不可替代的选择、为什么、付出什么”。
- 禁止把 causalChain 逐项扩写成机械镜头清单。

置信度：可靠。规划有益的方向有多项同行评审支持；具体增益不能直接外推到本产品模型。

### 4.2 作者控制不是礼貌层，而是质量机制

Plan, Write, and Revise 报告：在规划和写作阶段增加人工协作，相比更少互动的基线，故事质量提高 10%–50%，用户投入和满意度也提高。TaleBrush、Creative Wand 和不同 scaffolding 研究都指出，用户需要能表达全局与局部意图，并理解、修正系统方向。

2026 年 Directional Alignment 预印本对 87 篇人机共写故事的分析提出：人类更常引入语义新颖性并决定发展方向，模型更像连贯性维持者和扩写器。这与 Creator 的候选优先、作者锁定五轴、作者确认 Canon 的定位一致。

风险与反例：Co-Writing with Opinionated Language Models 发现模型建议可能影响用户观点。这说明“作者可以拒绝”还不够，系统还要避免把首个流畅候选做成默认答案。

产品含义：

- 默认提供 2–3 条机制真正不同的路径，不把第一条当推荐答案。
- 记录作者原始意图与模型建议的差异。
- 采用、忽略 finding、改 Canon 和发布继续保持不同动作。

置信度：可靠；87 篇故事的 2026 结论属于预印本，具体影响强度标为可能。

### 4.3 长篇质量不能由单章平均值代替

LongStoryEval 使用 600 部新出版书、平均约 121K tokens 的材料，归纳了 8 个顶层评审维度，并比较 aggregation、incremental-update 和 summary 三种整书评法。其结果说明：聚合评法在细节诊断上更强，摘要评法效率更高。

LitBench 的结果进一步提醒：现成通用 LLM judge 与人类偏好的一致率并不够高。报告中的最强现成 judge 约 73%，专门训练的评审模型约 78%。这不足以把模型审阅当作真值。

产品含义：

- 当前相邻章和长程线程是必要但不充分的。
- 需要增加 chapter-level、arc-level、book-level 三层汇总，不应把 11 维单章 finding 简单平均。
- 专业编辑盲评和作者采纳必须成为外部校准面。

置信度：可靠。数据来自 2025/2026 同行评审论文；不能直接把其模型或权重移植进 Creator。

### 4.4 视角与聚焦必须独立于“信息控制”

中英文资料一致认为，视角至少包含：

- 谁在讲。
- 谁在感知。
- 叙述者知道多少。
- 叙述距离远近。
- 何时、为何发生视角切换。

2023 年眼动研究发现，第三人称通常比第一人称读取更慢，尤其在内聚焦条件下；叙述声音切换也会改变阅读时间。这个结果支持“视角是阅读加工机制”，不只是代词选择。

但 2026 年另一项实验没有发现第一/第三人称对多项共情、认同和拟社会互动有显著影响。反例说明：不能建立“第一人称必然更沉浸”的硬规则。

产品含义：

- 新增 advisory lens：pov_focalization。
- 检查视角持有者、可知范围、感官来源、心理访问权、叙述距离和切换动机。
- 发现视角跳变时引用具体 block；只在明确破坏理解或人物知识边界时映射为 hard issue。

置信度：可靠。研究对“影响阅读加工”有支持，对“必然增强共情”不支持。

### 4.5 人物质量来自选择、关系和可解释矛盾

现有 22 维人物状态是很好的底层结构，尤其覆盖欲望、目标、恐惧、错误信念、秘密、知识、关系立场、信任、义务、最近选择和已付代价。

研究与专业创作资料补充了三个产品目前没有独立检查的方向：

1. 人物不是状态字段之和，而是矛盾在压力下如何转成选择。
2. 人物关系应通过互动改变，不应主要靠叙述者解释。
3. 共情取决于文本因素和读者因素的交互，不能由模型宣称“感人”来证明。

产品含义：

- 人物审阅加入 desire–defense–choice–cost–aftereffect 链。
- 区分“人物状态一致”与“人物在本章发生有意义的可见选择”。
- 情感质量先以证据和读者试读校准，不建立模型自评总分。

置信度：可靠。人物目标、能动性和关系证据有多源支持；具体共情效果需真实读者验证。

### 4.6 对话质量不能只归入声线

中文对话研究、Purdue 人物写作指南和专业小说课程共同指向：

- 对话要暴露目标、关系和阻力。
- 不同人物应有不同词汇、句长、回避方式和礼貌策略。
- 好对话并不复制真实口语，而是保留选择性的不完整、打断、偏题和言外之意。
- 对话、动作、环境和思想需要交织，避免“问答机器”。

Creator 当前 voice、repetition、information_control 能捕捉部分问题，但没有独立表达：

- 每句台词的言语行为。
- 表层目标与隐藏目标。
- 权力关系变化。
- 回避、误解和沉默的功能。
- 角色之间可辨识的节奏和语用习惯。

产品含义：

- 新增 dialogue_subtext advisory lens。
- 输出最多 3 个高价值问题，不做逐句润色。
- 只有台词违反人物知识、Canon 或硬约束时进入现有 hard gate；其余保持作者品味建议。

置信度：可能。工艺共识强，但“最佳对白”高度受类型、文化与作者风格影响。

### 4.7 文体质量需要节律、意象和主题三个独立面

当前 prose economy 能防止连续段落重复同一事实、情绪或压力，这是必要的负面门禁。但“不重复”不等于有文体。

研究与专业资料显示：

- 句法长度、重音、重复与变奏会影响声音和阅读速度。
- 感官意象能支持心理模拟，但堆叠感官词不自动提高沉浸。
- 隐喻和意象需要在语境中形成意义网络，而不是装饰。
- 主题应通过人物选择、代价和反复变化的意象推进，而不是结尾总结。

产品含义：

- 新增 prose_rhythm、imagery_system、theme_progression 三个 advisory lens。
- 检查“变奏”而不是简单禁止重复。
- 只给局部证据和可选策略，不自动模仿名家或重写作者声音。

置信度：可能。方向有叙事学、文体学和读者研究支持；具体风格判断不可完全客观化。

### 4.8 节奏应看信息、行动和情绪的相对速度

中英文节奏研究都表明，节奏不是“句子越短越快”。它由多个层面共同构成：

- 故事时间与叙述时间之比。
- 场景、概述、省略、停顿的切换。
- 信息释放与不确定性。
- 行动密度、选择密度和后果到达速度。
- 段落和句法节律。

悬念研究还提示，不确定性与预测活动是重要成分；但“把答案藏久一点”并不必然制造悬念，若人物目标和风险不清楚，只会制造困惑。

产品含义：

- 保留 pacing 与 information_control 分离。
- 扩展审阅说明：指出慢在哪里、慢的功能是什么、删减会损失什么。
- 结尾检查“状态变化 + 未完成压力 + 余韵”，避免统一 cliffhanger。

置信度：可靠。宏观机制有多项实验和叙事学支持；具体节奏偏好受类型影响。

### 4.9 中文写作不能只做英文 rubric 翻译

COIG-Writer 预印本报告了中文与英文创意写作能力之间很大的跨语言迁移差距，并强调过程监督与语言表达要同时保留。虽然其具体 89.26 个百分点差距仍需更多复现，但方向与中文创意写作资料一致：创作能力具有文化、文体和语用依赖。

中文资料特别强调：

- 声口、人称与叙事距离的联动。
- 留白、虚笔、含蓄与意在言外。
- 章回、笔记体、网文类型节拍等本土结构传统。
- 汉语句法、四字格、重复、对偶和节奏既可能是风格，也可能是模板化。
- 网络文学中的读者介入会改变创作节奏和类型兑现。

产品含义：

- Genre Kernel 需要语言/文化 variant，而不是只翻译标签。
- 中文对白和节律检查不能照搬英文句长阈值。
- 不应把“更高词汇多样性”直接当作更高质量。

置信度：可能。文化依赖方向可靠；COIG-Writer 的具体数值来自预印本，标为可能。

### 4.10 检索能保护连续性，但不能决定创作

Re3、DOC 和长篇评测支持反复注入结构与当前故事状态。Creator 当前人工召回目录、Context Snapshot、长程线程、人物状态和 Canon 指纹已经覆盖这条原则。

自动 RAG 当前仍不能上线的判断是正确的：现有实测没有一组配置同时达到质量与延迟门槛；而错误召回会以“看起来很相关”的方式污染人物知识、时间线和未采用候选。

产品含义：

- 继续以人工选择为唯一有效产品路径。
- 自动检索先作为 shadow recall，不写入 Context。
- 激活前除 Recall@10、Precision@3、延迟外，还要验证错误章节污染、候选措辞污染和作者取消选择后的清除。

置信度：可靠。仓库已有真实全文基线与负向边界。

## 5. 能力覆盖与缺口矩阵

| 写作质量方向 | 当前覆盖 | 判断 | 下一步 |
| --- | --- | --- | --- |
| 作者意图与方向 | 强 | 已实现两问、锁定和五轴回执 | 保持，不增加隐式默认答案 |
| 因果与场景结构 | 强 | Architect + 独立结构 Auditor | 增加“人物选择为何不可替代”的提示 |
| 人物能动性 | 强 | 11 维 + 22 状态 | 增加矛盾到选择的可见链 |
| 人物知识与信息边界 | 强 | Context、Observer、Auditor | 保持硬门禁 |
| 相邻章连续性 | 强 | 真实 1–20 章窗口 | 增加 Canon 后复跑，不把候选通过写成正史 |
| 非相邻长程线程 | 中强 | 线程候选与人工选择 | 后续校准召回率和作者有用性 |
| 自动检索 | 未激活 | contract_only | 继续 shadow，过现有门槛后再接线 |
| 类型兑现 | 强 | Genre Kernel + quality dimension | 加中文/文化 variant |
| 重复、解释负担 | 强 | prose economy + review | 区分有意复沓和模板重复 |
| 节奏 | 中强 | 独立 dimension | 增加故事时间/叙述时间、场景/概述分析 |
| 新鲜度 | 中 | 有 dimension，定义仍偏抽象 | 用机制差异与意象变奏替代“新颖词汇” |
| 场景细节 | 中强 | sensory anchors + scene_detail | 防止感官词堆叠 |
| 视角/聚焦 | 弱覆盖 | 被 voice/info control 间接覆盖 | 新增 advisory lens |
| 对话潜台词与语用 | 弱覆盖 | 被 voice/repetition 间接覆盖 | 新增 advisory lens |
| 句法与段落节律 | 缺口 | 无独立检查 | 新增 advisory lens |
| 意象与隐喻系统 | 缺口 | 无独立检查 | 新增 advisory lens |
| 主题推进 | 缺口 | 无独立检查 | 新增 advisory lens |
| 情绪弧线与共情距离 | 弱覆盖 | 有 emotionalState，无读者层 | 新增 advisory lens + 读者测试 |
| 幽默、反讽、不可靠叙述 | 缺口 | 无独立合同 | 先纳入类型特定参考 |
| 结尾兑现与余韵 | 中 | endingPattern、完整结尾门禁 | 新增 payoff/aftertaste advisory |
| 整书级结构和体验 | 缺口 | 章/窗口/线程，不是整书审阅 | 建三层评审与摘要聚合 |
| 专业编辑盲评 | 未验证 | false | 建立外部人评基线 |
| 作者采纳与完成率 | 未验证 | false | 记录采纳、忽略、撤回与完成时间 |
| 文化语境与中文特异性 | 弱覆盖 | 类型规则为主 | 建中文 craft cards 和反例库 |

## 6. 产品建议

### P0：先用 Skill 扩展诊断，不改后端门禁

1. 每轮只选择 2–4 个写作重点；硬约束始终全开。
2. 使用扩展镜头检查视角、对白、节律、意象、主题、情绪和结尾。
3. 每个判断必须定位正文证据，并区分 hard issue、revision candidate、taste note、preserve。
4. 扩展镜头默认只能产生 taste note 或 revision candidate 建议，不能自动阻止 Canon。
5. 修订仍走现有单块 Reviser -> Auditor，最多两轮，失败回退。
6. 作者确认前不改变正文、人物状态、Canon 或发布状态。

### P1：建立 ExtendedCraftReview 合同

建议字段：

- povFocalization
- dialogueSubtext
- proseRhythm
- imagerySystem
- themeProgression
- emotionalArc
- endingPayoff
- culturalSpecificity

每项包含：

- status：clear / examine / revise
- evidenceLocators
- diagnosis
- readerEffectHypothesis
- authorTradeoff
- suggestedExperiment
- mappedExistingDimensions

约束：

- 不新增综合总分。
- readerEffectHypothesis 必须明确是推断，不得伪装成读者事实。
- 新维度不自动升级 hard block。
- 只有违反 Canon、人物知识、作者锁定方向或确定性合同，才映射到现有硬门禁。

### P2：建立真实效果验证

最小 campaign：

- 30 个冻结原创种子。
- 至少 6 个类型，每类 5 个。
- 中文与英文各半，避免把英文工艺直接翻译。
- 三条路径：直接 Writer、当前 workflow、workflow + 新 skill。
- 匿名随机 A/B/C。
- 专业编辑、目标读者、作者本人三组评价。
- 记录逐维偏好、hard violation、修订采纳率、撤回率、完成时间、作者控制感。
- 不使用综合分决定上线；预先声明 primary dimensions 和 stop conditions。

### P3：整书级评测

采用三层结构：

1. Chapter：现有 11 维 + 扩展镜头。
2. Arc：人物弧、承诺/伏笔、冲突机制变奏、主题和情绪走势。
3. Book：整体因果、人物完成度、节奏分布、结尾兑现、读者体验与风格一致性。

聚合时保留证据和冲突意见；既提供 detail-first 聚合，也提供 summary-first 快速审阅，不把模型 judge 当作真值。

## 7. 新 Skill 的产品定义

Skill 名称：improve-creator-writing-quality
安装位置：<local-codex-writing-skill>

### 7.1 触发场景

- 规划下一场或下一章。
- 生成前检查作者意图与 Context。
- 审阅候选正文。
- 诊断“为什么不够像小说”或“为什么读起来平”。
- 做局部修订、匿名比较或跨章检查。
- 把研究方法映射到 Creator 现有后端动作。

### 7.2 不应触发的扩张

- 自动采用候选。
- 自动改 Canon。
- 自动发布。
- 自动启用 RAG。
- 模仿在世作家或从受保护文本抽取风格指纹。
- 用综合文学分替代作者判断。
- 把 advisory lens 伪装成产品已实现门禁。

### 7.3 工作流

1. 确认作品、支线、章节、当前正文、Canon、锁定意图和人工召回。
2. 区分任务类型：plan / draft / review / repair / compare / long-form audit。
3. 选择 2–4 个优先镜头；硬约束与 11 维仍完整执行。
4. 对 plan 检查 choice–cost–consequence；对 draft 保持候选边界。
5. 对 review 输出可定位 finding，不给总分。
6. 对 gap lenses 只给 advisory 诊断和小实验。
7. 修订只替换一个证据块，保留事实、人物知识、作者方向和保护文本。
8. 修后重跑目标维度、全文效果和作者方向复核。
9. 交给作者采用、拒绝、忽略或继续修改。
10. 只有现有产品门禁和作者确认共同通过，才进入 Canon Patch。

## 8. Skill 质量量表

每次输出至少回答：

- 作者真正要保留什么？
- 本场谁做了不可替代的选择？
- 代价与后果是否落到正文？
- 哪些信息是人物可知、读者可知、必须保留未知？
- 哪个问题有逐字证据？
- 这是硬错误、可修订问题、品味选择还是应保护之处？
- 修改会牺牲什么？
- 当前后端能执行什么，哪些只能给建议？
- 作者最终要做哪个决定？

扩展镜头不要求每次全部运行。只有任务相关时才读取对应 reference，避免把写作变成 19 项检查表。

## 9. 失败模式与防护

| 失败模式 | 防护 |
| --- | --- |
| 规则越多，文本越平 | 每轮最多 2–4 个 focus；其余只做硬约束 |
| 第一候选锚定作者 | 匿名、多路径、无默认推荐 |
| 模型自审自证 | 独立 Auditor + 证据定位 + 人工决定 |
| 修订解决 A、破坏 B | 单块替换、事实保持、全文复核、方向复核 |
| 追求词汇多样性导致做作 | 不使用 TTR 或生僻词率作为质量目标 |
| 第一人称被误判为更共情 | 视角检查只评功能和稳定性，不设人称优劣 |
| 感官词堆叠冒充现场感 | 感官细节必须参与行动、判断、关系或代价 |
| 自动召回污染 Context | 自动 RAG 保持关闭；人工选择为硬包含 |
| 中文被英文 rubric 扁平化 | 使用中文声口、留白、虚笔、章法和类型反例 |
| 专家模型成为最终裁判 | 模型只给证据与假设；人类盲评和作者采纳校准 |

## 10. 验证标准

Skill 结构验证：

- SKILL.md frontmatter 只有 name 和 description。
- agents/openai.yaml 与实际用途一致。
- SKILL.md 少于 500 行，详细知识放 references。
- 每个 reference 从 SKILL.md 一层可达。
- 官方 quick_validate.py 通过。

前向任务验证：

1. “给第 21 章设计三个机制不同的场景方向。”
2. “只审阅这段对白的潜台词，不改正文。”
3. “检查这段第三人称限知是否跳视角。”
4. “把这个 repetition finding 做单块修订，保留人物所知与作者五轴。”
5. “比较两个候选，不给综合分。”
6. “检查 1–20 章人物弧，但不要把 active thread 当成缺陷。”

通过条件：

- 不越过候选/Canon/发布边界。
- 不把自动 RAG 写成 implemented。
- 输出证据定位和修改取舍。
- 能明确区分现有能力与 advisory gap。
- 不用研究结论替作者做审美决定。

## 11. 研究局限

- 中文公开全文比例低于英文；48 条 A3 元数据仅用于覆盖面，后续若要做学术出版级综述，应取得授权全文再编码。
- 不同研究对象包含短篇、长篇、影视、游戏叙事和非虚构，迁移到长篇中文小说时要标注适用边界。
- 2025–2026 的部分工作为预印本，特别是 COIG-Writer、Directional Alignment 和 StoryComposerAI，具体数值需要复现。
- 文学质量包含不可完全客观化的品味、文化和作者目标。该报告设计的是更好的决策与验证，不是文学真值函数。
- 当前仓库仍缺专业编辑盲评、普通作者完成率、长期采纳率和跨模型成本数据。

## 12. 代表性来源

完整 138 条见来源目录。以下是直接影响产品方案的锚点：

- [LongStoryEval](https://aclanthology.org/2025.acl-long.799/)
- [LitBench](https://aclanthology.org/2026.eacl-long.362/)
- [Re3](https://aclanthology.org/2022.emnlp-main.296/)
- [DOC](https://aclanthology.org/2023.acl-long.190/)
- [Collective Critics](https://aclanthology.org/2024.emnlp-main.1046/)
- [Plan, Write, and Revise](https://aclanthology.org/N19-4016/)
- [Choose Your Own Adventure](https://aclanthology.org/2021.naacl-main.279/)
- [Narrative Planning: Balancing Plot and Character](https://doi.org/10.1613/jair.2989)
- [Narrative Voice and Focalization Eye-Movement Study](https://doi.org/10.1080/0163853X.2023.2260247)
- [First- or Third-Person and Literary Engagement](https://doi.org/10.1177/02762374261451144)
- [Textual and Reader Factors in Narrative Empathy](https://doi.org/10.1177/0963947020927134)
- [TaleBrush](https://johnr0.github.io/publications/TaleBrush_CHI2022/)
- [Creative Wand](https://doi.org/10.1609/aiide.v18i1.21946)
- [Fiction-Writing Mode](https://aclanthology.org/2023.eacl-main.128/)
- [COIG-Writer](https://arxiv.org/abs/2510.14763)
- [《世界创意写作大会论文集》](https://cyxz.shu.edu.cn/Portals/501/%E4%B8%96%E7%95%8C%E5%8D%8E%E6%96%87%E5%88%9B%E6%84%8F%E5%86%99%E4%BD%9C%E7%A0%94%E7%A9%B6%E7%AC%AC%E4%B8%80%E8%BE%91.pdf)
- [《小说写作教程》：心手合一讲故事](https://www.chinawriter.com.cn/n1/2025/0903/c404030-40556024.html)
- [李浩：小说的角度设计](https://www.chinawriter.com.cn/n1/2022/1103/c404030-32558141.html)
- [《无声的细节》](https://www.chinawriter.com.cn/n1/2024/0813/c404030-40297924.html)
- [跨文化传播场域中人机协同创意写作研究](https://www.cssn.cn/skgz/bwyc/202406/t20240611_5757862.shtml)

## 13. 验证收据

### Skill 结构

命令：

    <repository-root>/backend/.venv/bin/python \
      <local-codex-skill-validator> \
      <local-codex-writing-skill>

结果：Skill is valid。

补充检查：

- SKILL.md 161 行，低于 500 行上限。
- frontmatter 只有 name 与 description。
- agents/openai.yaml 已生成，default prompt 显式引用 skill 名。
- 4 个 reference 均从 SKILL.md 一层可达。
- 未残留 TODO 或模板占位符。

### 当前产品能力证据

命令：

    npm run check:creator-writing-capability-evidence

结果：PASS。

关键收据：

- capabilityCount：34。
- real_model_measured：17。
- real_local_runtime：6。
- deterministic_verified：8。
- real_context_external_measured：1。
- real_corpus_measured_blocked：1。
- historical_only：1。
- automaticRagEnabled：false。
- stableLiteraryQualityImprovementProven：false。
- professionalHumanBlindReviewCompleted：false。
- chapter21OrLaterAccessed：false。

同一门禁同时确认：13 条真实长程线程记录与 1-of-4 作者选择路径通过；多组 RAG 对照均保留 automaticRetrievalEnabled=false；MiroFish 收据保持 candidateOnly=true 和 literaryGainProven=false。

### 来源目录

- TSV 字段检查：138/138 行均为 8 个字段。
- 语言断言：英文 70、中文 68。
- 证据等级断言：A1 58、A2 21、A3 48、B 11。
- 重复 URL：0。
- 分层抽取 35 条链接的实时状态：29 个 200、1 个 302、1 个 202、4 个出版平台 403。
- git diff --check：通过。

## 14. 最终判断

最适合 Creator Pivot V2 的“写作质量 skill”不是一个秘方提示词，也不是更大的自动生成器。它应当是一层研究支持的质量导演：

- 用产品已有的结构、状态、证据和作者确认做硬底座。
- 用新扩展镜头补视角、对白、节律、意象、主题、情绪和整书体验。
- 对未实现的能力保持 advisory。
- 通过匿名比较、负向样本、专业人评和作者采纳逐步把有效镜头升级为合同。

这条路线与产品“作者拥有创作权、本机优先、候选先于正史、证据先于结论”的定位一致，也比继续堆 Agent 更可能产生可验证的写作质量提升。
