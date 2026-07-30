# 创作决策工作台 V1 实现说明

## 1. 实现边界

V1 已整合进现有 `/creator/editor`，没有创建平行编辑器、第二套设计系统或新的公开投影。它只处理本机未发布创作数据，不修改 Reader、Supabase 认证、部署配置和云端发布事务。

当前可验证的是工作流、状态、持久化、人工确认和界面交互。`referenceWritingAgent` 是确定性的本机参考适配器，用于证明协议可运行，不代表真实模型文本质量已经通过。

## 2. 规格对象与真实所有者

| 规格对象 | 真实文件/模块 | 所有权 |
|---|---|---|
| CreationSession、AuthorIntentContract、ContextSnapshot、NarrativeCandidate | `app/src/features/creator-decision/types.ts` | 领域类型 |
| SceneDraftResult、LiteraryReview、RepairProposal、CanonStatePatch | `app/src/features/creator-decision/types.ts` | 领域类型 |
| 22 维人物状态与路径白名单 | `characterState.ts` | 人物状态契约 |
| 角色群像排练与证据提案 | `characterSimulation.ts`、`miroFishCharacterSimulationAdapter.ts` | 可选外部模拟边界 |
| 排练调用与作者确认后保存人物卡 | `creatorCharacterRehearsalService.ts` | 非 UI 用例与本机写入边界 |
| Zod Schema | `app/src/features/creator-decision/schemas.ts` | 运行时校验 |
| 状态机、两问上限、失效传播 | `app/src/features/creator-decision/stateMachine.ts` | 纯领域规则 |
| 场景重决策选择 | `app/src/features/creator-decision/sceneAuthorDecision.ts` | 待选事件恢复、来源 revision 校验、作者选择与新意图修订 |
| Context Snapshot | `app/src/features/creator-decision/contextCompiler.ts` | 上下文编译 |
| 候选筛选、差异检测、混合与选择 | `app/src/features/creator-decision/candidateSearch.ts` | 候选决策 |
| 场景级正文和选区应用 | `app/src/features/creator-decision/sceneDrafting.ts` | 正文 Patch |
| 证据评价和局部修复 | `app/src/features/creator-decision/literaryReview.ts` | 文学评价 |
| 正史 Patch 与确认规则 | `app/src/features/creator-decision/canonPatch.ts` | 正史边界 |
| 纵向工作流 | `app/src/features/creator-decision/creationDecisionWorkflow.ts` | 用例编排 |
| 模型协议与参考实现 | `structuredAgentCall.ts`、`referenceWritingAgent.ts` | Adapter 边界 |
| 本地 Repository 与原子提交 | `app/src/local-db/creatorLocalDecisionRepository.ts` | 本机数据 |
| IndexedDB Schema v10 | `app/src/local-db/schema.ts`、`creatorLocalDb.ts` | 本机存储；v10 增加作者确认后的已验证长程线程记录 |
| Route 适配 | `useCreatorEditorDecisionWorkbench.ts` 及相邻 controller/adapter | UI 编排 |
| 工作台 UI | `app/src/components/creator/workspace/CreatorDecision*.tsx` | 现有 Creator 设计系统 |
| 正文选区、保护和证据定位 | `CreatorEditorManuscriptStage.tsx` | 编辑器交互 |

## 3. 状态迁移

```text
intent_discovery
  -> intent_locked
  -> candidate_search
  -> candidate_selected
  -> drafting
  -> reviewing
  -> canon_patch_pending
  -> canon_committed
```

- 作者重开意图会回到 `intent_discovery`，并让旧 Context、候选、草稿、评价、修复和 Patch 失效。
- 场景结构在一次受限重构后仍重复时，Planner 只能提出 2–3 条解锁方向。选项只能逐字引用两轮独立审校真实输出的问题码；未知码只允许同一 Planner 纠正一次，第二次仍错就在 Writer 前关闭。阻断结果先写入本地事件；作者明确选择后才创建新的锁定意图 revision，旧派生链全部失效并回到 `candidate_search`。伪造、过期或重复选择均失败关闭，且该动作不调用 Writer、不写正文或 Canon。
- 更换候选会让依赖旧候选的正文及后续对象失效。
- 作者修改正文会让旧评价、修复和正史 Patch 失效。
- 评价存在 `hard_block`、确定性违规或证据失效时，不得准备正史 Patch。
- 只有作者显式确认后，Repository 才在同一 IndexedDB 事务中提交正文、Patch、正史状态、会话和事件。
- 提交后 `proposedCanonPatchId` 清空，刷新页面不会再次出现同一个确认动作。

## 4. 两问式作者意图

系统只追问会改变场景走向的阻断信息，并通过 `.slice(0, 2)` 固定首轮最多两个问题。作者可以选择预设答案或提供自定义答案；意图未完整时不能锁定，也不能进入候选搜索。锁定后，任何修改都必须先显式重开意图。

## 5. Context Snapshot 与候选

Context Snapshot 把当前正史 revision、Kernel revision、Constraint revision、22 维人物状态、关系压力、时间、承诺、伏笔、世界规则、回归案例和有限风格样本冻结为一次生成输入，并保留 manifest。22 维分别是地点、时间位置、身体状态、情绪、主导欲望、即时目标、当前意图、恐惧、创伤触发、防御方式、信念、错误信念、知识、秘密、资源、能力、限制、关系立场、信任、义务、最近选择和已付代价。

Observer 与状态 Auditor 都通过后仍不能直接构造状态 Patch。纯领域边界会再次核对人物路径以及承诺、伏笔、时间线和因果来源 ID：人物必须存在于当前活动人物或本地 Canon，推进/兑现的承诺与伏笔必须存在于 Context Snapshot，新建项不能冒用旧来源，时间线与因果不能引用其他章节。任何不一致都在状态操作生成前失败关闭，避免模型之间相互确认一个并不存在的长期记忆。

人物上下文采用“锁定主角基线 + 作者手动选择增量”的规则。锁定意图中的主角始终进入 Context Source；作者从召回目录手动选择的次要角色卡会连同其人物状态、已知、误信和资源进入结构化 Context Snapshot，不能被主角/禁知角色过滤或通用上下文裁剪删除。未选择、错误作品、错误支线或失效人物卡仍不得进入。

候选搜索最多展示三个非支配且真正不同的方案。候选差异由冲突机制、信息释放、代价、节奏等策略轴判断；重试后若仍只有两个有效方案，不复制相似方案凑满三个。作者可以选择、拒绝或混合候选。若作者刚完成一次场景重决策，至少一条新候选必须完整采用作者锁定的五轴机制签名；否则输出无效。进入场景构筑后，Architect 也必须在五个轴上精确实现该选择；一次受限修订后仍不一致，运行时在 Writer 前失败关闭，不用模型的替代方案覆盖作者决定。

对于携带作者场景重决策的生成，Writer 产出后还必须经过独立正文执行 Auditor。Auditor 按五轴和 `proposedAdjustment` 分别给出正文逐字证据；语义不符时拒绝该候选，不自动重写整章。无法定位的证据只允许一次 Auditor-only 修正，第二次仍失败就关闭本次返回。通过结果会在应用层转换为 `SceneDraftDirectionReceipt`：本地候选只保存五轴期望值、正文 block、块内 offset 和引文 hash，不重复保存 Auditor 的逐字引文、诊断或理由。旧草稿没有该可选回执时仍可读取。

## 6. 场景正文与独立评价

- 生成范围只能是单场景、选定节拍或选中文字，拒绝多场景和多章请求。
- 生成结果先写入本地候选记录；`SceneDraftResult.status` 的 `current/stale` 表示结果是否仍匹配当前 revision，不表示已进入正史。
- 若本次候选执行了作者锁定的场景方向，`SceneDraftResult.directionReceipt` 必须能回查五轴和作者调整的正文证据位置；回执不是文学评分、采用记录或 Canon 证明。
- 作者手改正文或采用局部修订会创建新的 draft revision，并删除上一 revision 的方向回执；修改后的文本必须重新经过证据审阅，不能继承旧文本的放行结论。质量工作流中的局部修订只有在目标文学维度复核通过后，才调用独立 Auditor 重新核验五轴和 `proposedAdjustment`；拒绝、故障或正文证据无法重新映射均保留修订前候选。
- 在作者执行“采用”前，`CreationSession.activeDraftId` 保持为空，正文不会被静默覆盖。
- 作者保护的段落不能被局部生成或修复改写。
- 文学评价按连续性、张力、信息控制、人物能动性、声音、新鲜度、类型兑现、重复、解释过载、现场细节和推进节奏分别给出 findings，不计算综合文学分数。
- 作者可以为单次审阅显式指定上述维度的子集作为优先检查项；重点只改变检查顺序，不减少其余硬约束、不要求凑 finding，也不会根据模型自评自动选择下一轮重点。
- 每个 finding 必须指向仍存在的正文 block 和范围；修订候选最多替换证据所在的一个正文 block，不因局部问题重写全文。
- `hard_block` 必须通过经复核的正文修订解决，不能被作者“忽略”或 `dismissFinding`；作者可以拒绝某个 RepairProposal，但该动作只把修订候选标记为 `rejected`，不会改正文，也不会消除原 finding。active `revision_candidate` 则必须由作者采用局部修订或明确忽略。系统不能因为尚未生成 RepairProposal 就绕过这条作者决定，`taste_note` 与 `preserve` 不会被升级成强制修改。
- 当前 review 与 draft revision 上只要仍有 `proposed` 局部修订，候选质量门禁就阻止准备或提交 Canon Patch；作者必须先明确采用或拒绝。拒绝动作记录独立的 `repair_rejected` 作者事件；旧 revision、已拒绝或已采用的修订不阻断当前候选，但仍 active 的 `hard_block` 会继续阻断。
- 采用局部修订时必须再次核对当前 review、finding 和 draft revision。已拒绝、已失效、属于其他 review、正文没有产生变化，或只是跨段 `offer_variants` 指引的候选都不能创建新的草稿 revision，也不能把 finding 伪装成已处理。
- 确定性评价不会把第一段自动标成 `preserve`；只有真实承担“行动 -> 阻力 -> 选择 -> 后果”的证据段才允许由独立评价适配器提出保护建议。

## 6.1 22 维人物状态与短期群像排练

当前 Agent action surface 有 30 个注册动作，其中新增的三个动作分别负责确认启动本机角色排练、确认保存人物卡候选和确认保存设定卡候选；历史阶段曾使用过“22 个动作”“24 个动作”和“27 个动作”的口径。动作数不是 Agent 数，也不是人物状态维度。当前实现另行建立了严格的 22 维人物状态契约，所有人物状态 Patch 都必须命中该白名单，旧字段 `relationshipPosition` 仅作读取迁移并统一写入 `relationshipStances`。

角色群像排练是可选的外部 Adapter，不属于正文生成主链，也不是自研 RAG：

1. 作者明确选择 2–8 个角色、当前已确认状态与少量设定，并确认把这些资料交给外部模拟进程。
2. MiroFish 最多运行 1–5 轮临时排练。
3. Reflector 只从已选人物的直接访谈与绑定产物中整理可逐字定位的候选证据。
4. 独立 Auditor 必须完整核对人物身份、证据、22 维语义、当前状态、关系因果、设定范围、正史边界与置信度；任何遗漏或拒绝都失败关闭。
5. 输出只能是 `proposed` 人物卡、22 维状态变化或设定卡；证据不足允许返回空提案。
6. 排练不能写正文、不能自动修改人物卡、不能形成 Canon Patch、不能提交正史。

当前已实现 Schema、外部进程 Adapter、活跃写作 Agent 的可选调用能力、对话式请求解析、作者确认后启动、`MiroFish -> Reflector -> Auditor` 独立审阅，以及逐张确认后保存全新本机人物卡或设定卡的 Creator 路径。第 20 章真实上下文已完成一次本机排练：初始 2 张人物卡和 2 张设定卡因证据扩大与设定泛化被 Auditor 拒绝；一次受拒绝意见约束的稀疏修订保留 2 张 low-confidence 人物卡和 1 张局部设定候选，9 条提案证据均来自所选人物直接访谈，复审 0 问题。没有保存人物卡、设定卡或正史。该单次样本只证明门禁与候选提炼可运行，不证明人物塑造质量具有普遍提升。

## 6.2 Agent 角色与实际调用数

`packages/agent-runtime/src/agents.ts` 保留 10 个 NarrativeOS 角色合同，但当前 Creator 不会在每章同时运行 10 个进程。localhost Working Agent 已接通 8 个受限角色：Planner 负责候选路径，Architect 与 Writer 依次完成场景因果骨架和候选正文，Auditor 独立审阅，Observer 提取正文状态证据，Reflector 整理可选 MiroFish 产物，Normalizer 只做一次结构修复，Reviser 只为已定位问题提出单个正文块的替代候选。Radar、Orchestrator 仍是合同角色；其中创作编排由确定性的 `CreationDecisionWorkflow` 承担，不能把它描述成一次模型调用。

初次 `scene_draft` 会真实启动独立的本地临时 Agent 调用：`Architect -> structure Auditor -> Writer -> prose Auditor`。Architect 除 4-5 个结果级因果节拍外，必须分开给出现场可观察证据、人物可作的有限推断和本场仍需保留的未知；structure Auditor 独立复核后才允许 Writer 启动。必要时 Normalizer 只在 Writer 与 prose Auditor 之间做唯一一次长度或完整结尾修复；若修复后只剩轻微字数不足，Writer 只能返回一段 append-only 同场景续补，不能重写现有正文或打开下一章。Writer 和局部改写输出的 `stateProposals` 必须为 `[]`；22 维人物状态变化由正文完成后的独立 Observer 按逐字证据提取，再由 Auditor 审校，避免 Writer 同时写作和证明自己的状态推断。作者请求局部修订时运行 `Reviser -> Auditor`：Reviser 只能提出一个证据块替换候选，并为每条声称保持不变的事实提供原文与候选中的逐字引文；Auditor 再独立检查修订目标、事实保持、范围、连续性、人物所知、时间线、因果、承诺和声线，并逐项返回已核验事实索引。只有索引完整的 `pass` 候选才对作者显示采用动作，旧的自由文本事实声明或不完整 `pass` 均失败关闭。所有角色都不能自动采用候选，保护块、审阅拒绝、生成期间版本变化和作者拒绝都会阻止正文写入。每次调用都有本机临时运行清单，且 `canonCommitAllowed` 固定为 `false`。MiroFish 是可选外部模拟进程，不计入这 10 个角色。完整口径见 `docs/agent-protocol/creator-working-agent-role-runtime.md`。

文学审阅也采用职责分离。第一名 Auditor 负责 11 维发现；无法定位引文时只允许同一 Auditor 做一次证据纠正。其模型提出的 active `hard_block/revision_candidate` 随后交给第二名 Auditor 逐条复核，第二审只能 verify/reject，不能改 finding id、维度、严重度、修订方向或证据位置。reject 的模型 finding 不进入局部修订；确定性规则产生的 finding 不允许被模型推翻。`LiteraryReview.modelFindingVerification` 只保存确认/驳回 id 和复核者，不保存综合分，也不代表作者采用。

质量试验中的两轮局部修订预算按 finding 隔离：某条修订生成失败、独立审校拒绝或应用后越过长度/完整结尾合同，只记录未应用结果并保留当前候选；同一 finding 不再尝试，但剩余预算可处理另一个有证据的问题。通过事实保持审校和长度门禁的替换块还必须接受一次修后全文文学复核；若目标维度仍有 active hard/revision finding，运行时回退到修订前候选并记录 `reverted_target_dimension_persisted`，不能把局部事实审校当作文学效果证明。目标维度通过后还要执行独立的修后方向审阅：五轴或作者调整任一项拒绝时记录 `reverted_author_direction_not_retained`，调用或证据映射失败时失败关闭；只有通过后才为新 revision 重建方向回执。该顺序保证“文学问题看似解决”不能绕过作者锁定方向。

作者指定的文学审阅重点也必须进入修订调度，而不是只进入 Auditor prompt。排序规则固定为：`hard_block` 高于一切；同一严重度内按作者给出的 `focusDimensions` 顺序；之后才比较置信度和默认维度顺序。这样人工重点不会绕过连续性等硬阻断，也不会被非重点的普通 finding 无故耗尽两轮修订预算。没有显式重点时保持原默认顺序。

structure Auditor 的纠正不是第二次自由审阅。只有逐字证据无法定位时，运行时才一次列出全部错误的架构或近期场景引用，并附上从当前输入确定性抽取的 path/value 证据目录；同一 Auditor 只能从对应来源目录选择替代引用，不能自行改写或拼接。顶层判断、五轴、信息边界、三项执行质量结论、问题代码与诊断全部冻结。任何语义改动、非证据错误或第二次无效证据都必须在 Writer 前失败关闭。

## 6.3 跨章连续性与局部质量修订

长文连续性审计直接读取作者指定的本机已确认章节，不建立自研 RAG，也不自动选择未授权正文。首轮 Auditor 必须完整覆盖窗口内每一组相邻章节，并分别检查因果交接、人物知识、时间地点、承诺、伏笔、人物动机、设定、重复和声线；每个问题都必须在前后章各有一处逐字证据。

首轮问题不能直接进入修订。第二次独立 Auditor 调用必须逐项确认、降级或驳回，且不能升级严重度。只有经过复核的 `hard_block` 或 `revision_candidate` 才能进入现有 `Reviser -> Repair Auditor` 单块替代流程。通过的候选在质量试验中仅应用到内存副本，然后重跑完整相邻窗口；没有 finding 时复核门返回空结果，不额外调用模型。

真实第 1-20 章归档已完成一次全量相邻章试验：20 章、19 个交接、4 个窗口、6 次真实 Auditor 调用，首轮发现的第 5->6 章追兵报数交接和第 19->20 章穆笙代词问题都通过第二次证据复核。两条单块候选均通过 Repair Auditor，应用到内存副本后两个窗口复审均为 0 finding。工作区哈希、已确认正文、正史和第 21 章均未变化。证据见 `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-campaign-verified-2026-07-16/` 与 `chapter-01-20-continuity-repair-trial-2026-07-16/`。

## 6.4 非相邻长程线程与召回纠错

相邻章审计之外，Observer 会对作者指定的本机已确认章节运行两次全篇扫描：因果债、人物知识和时间锚点为一组，承诺、伏笔和人物弧光为另一组。每条线程必须引用来源章节原文；`progressed`、`fulfilled` 和 `broken` 还必须引用后续章节原文。`active` 只能是中低置信的人工召回候选，不是缺陷，也不能被系统解释成“作者忘记了”。

人工召回在进入 Context Snapshot 前按当前写作位置重新校验。云端章节必须属于同一作品和支线且章号早于当前章；设定必须属于当前作品和兼容支线；回声必须匹配当前关联来源。伪造、失效、未来章节、错误作品或错误支线的选择不会进入 `manualRecallItems`、近期场景、风格样本或 manifest。作者合法选择仍是硬包含，不被上下文裁剪或未来自动相似度结果覆盖。

人物类人工召回还会保留锁定主角作为场景基线，并把作者选中的次要角色加入 `activeCharacters`。这条规则在 Context Source 与 Context Snapshot 两层分别校验，避免手动选择次要角色时丢失主角，也避免编译阶段把已选次要角色裁掉。

本机 Canon 章节记忆采用双重归属检查：Repository 读取时先按 work/branch 过滤，召回 ViewModel 在生成卡片和状态召回项时再次核对。作品或支线切换期间即使旧异步结果仍短暂停留在 React 状态，也不能进入新路线的召回候选。

当前写作章号不再只依赖 URL：显式章节路由优先，其次使用活动本机草稿章号，再使用当前支线最新章节加一；空支线从第 1 章开始。这个统一结果同时控制召回时序、Context Source 和草稿保存。读者请求所指向的章节只作为前情锚点，不能冒充尚未公开的目标章节。

没有显式路由和活动草稿时，新章节的 CreationSession 也使用上述推导章号构造稳定身份，不再复用固定的 `new` 身份。支线推进后，新一章会获得不同 session/chapter/scene id，旧意图、候选、审阅和召回指纹不能跨章恢复。已有旧草稿仍保留 draft-ref 身份，由原有单向迁移路径接管。

Auditor 必须独立逐项复核全部线程和 finding。只有跨过至少一章、同时具有来源与后续矛盾证据的 `broken` finding 才可能进入现有单块修订链。若 Auditor 驳回线程，Observer 最多进行一次受限纠错：已通过线程必须保持不变，不能新增线程或 finding，只能修正或删除被驳回候选，随后再次交给 Auditor。

真实第 1-20 章最新全量运行完成 2 次全篇扫描和 4 次本机角色调用，6 个维度均被覆盖；13/13 条线程通过独立复核，其中 4 条保留为活跃召回候选，0 条构成可修订的断裂 finding。另一次运行实际触发了失败路径：第 11 章的一条候选线程被错误标为 `active`，Auditor 在第 14 章定位到推进证据；受限纠错只把该线程改为 `progressed`，再审 1/1 通过。所有运行均未修改工作区、正文、正史或第 21 章。证据见 `validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/` 与 `chapter-01-20-long-range-thread-reconciliation-2026-07-16/`。

## 7. 正史 Patch

模型只能提出 `CanonStatePatch`。Patch 的每项状态变化必须引用正文证据，并通过 base canon、intent、candidate 和 draft revision 校验。作者确认是不可省略的独立动作；模型、Route 或后台任务都不能调用绕过确认的提交路径。

准备 Patch 与最终本机原子提交会共同调用 `candidateQualityGate.ts`。锁定意图、当前 intent/draft/review revision、当前 LiteraryReview、active hard block 和确定性违规都属于门禁；如果作者已经选择五轴场景方向，当前正文还必须携带轴值一致、且 block/offset/hash 仍能定位的方向回执。正文修改使旧证据失效后，不能继续借用旧审阅提交，必须重新审阅。该门禁不计算综合文学分，也不替代作者确认、相邻章连续性或非相邻长程线程审计。

## 8. 本地数据与迁移

V1 使用共享 Creator IndexedDB v9，不使用新的 localStorage 数据岛。工作区导出、预览、导入和回滚包含以下记录族：

```text
creationSessions
authorIntents
contextSnapshots
narrativeCandidates
sceneDrafts
literaryReviews
repairProposals
canonPatches
localCanonStates
creationDecisionEvents
```

旧 `PmfLocalDraft` 只迁移为可恢复的 CreationSession 引用，不伪造作者意图，也不复制或改写旧正文。旧正文仍由原草稿 owner 保存。

## 9. UI 实际交互

现有写作台右栏新增“写作搭档”：

1. 确认或补充最多两个关键意图问题。
2. 锁定作者意图。
3. 比较、混合、拒绝或选择叙事路径。
4. 生成单场景候选；采用前正文保持不变。
5. 在正文中选择或保护段落，生成选区内容。
6. 查看按严重度分组且可定位证据的评价。
7. 生成、预览并人工采用局部修复。
8. 查看正史 Patch 差异，完成显式确认和本机原子提交。

决策控件放在右栏而不是新增顶部高度，原因是浏览器回归显示顶部堆叠会把中等视口的正文起始位置推离可用区域。

## 10. 已验证与未验证

已验证：领域状态、两问上限、候选差异、失效传播、场景范围、22 维人物状态白名单、模拟提案证据边界、证据评价、局部修复、作者确认、原子提交、刷新恢复、旧草稿迁移、工作区导入导出和完整浏览器路径。作者方向通过回执另有应用适配器 fixture：通过的 prose Auditor 响应会被转换为不含原始引文和诊断文本的 block/offset/hash 回执，不可定位证据失败关闭，旧草稿保持兼容；正文需要结构修复时，Normalizer 必须先修最终正文，再由 prose Auditor 生成回执。另有一份隔离的第 20 章真实 Working Agent 质量样本：Architect/Writer 生成 3,120 可见字符，Auditor 定位 5 个文学 finding，Reviser 只替换一个证据块并由独立 Auditor 核验 6 条保持事实，复审后目标 `scene_detail` finding 消失且没有新增 hard block；Observer 的初始状态证据被拒绝后，经唯一一次语义修订形成 8 个可定位、复审通过的候选操作。第 1-20 章真实归档还完成了 19 个相邻章交接审计与独立复核，并在两个已证实问题上完成单块候选、事实保留审校和内存副本复审。正文、人物卡和正史均未写回。汇总证据见 `validation/creator-ui/conversation-recall-2026-07-14/20-chapter-writing-quality-workflow-ledger-2026-07-16.md`。

模型文学 finding 现在还需经过第二名独立 Auditor 的逐条 verify/reject 才能进入局部修订；确定性 finding 不交给模型复核。首个冻结真实样本完成 3 次复核，确认 7 条、驳回 1 条，两轮局部修订均未保留，所有写入边界为 false。该凭证只证明复核和失败隔离真实执行，不证明复核者必然正确或文学质量提升；见 `validation/creator-ui/frozen-paired-quality-literary-finding-verification-archive-2026-07-17/summary.json`。

修后作者方向回执另有一次隔离真实验证：冻结五块原创正文只替换一块，真实 Auditor 对五个机制轴和作者调整全部给出可定位证据，应用成功重建当前修后块的 offset/hash 回执。所有正文、候选、Canon、章节和云端写入边界为 false。该结果证明独立能力可执行，不证明完整随机局部修订链稳定到达此步骤；见 `validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json`。

若修后全文复核仍发现同一维度问题，运行器现在只允许使用新的同维度单块证据做一次 Reviser + 独立 Auditor 重试，然后重新经过长度、完整结尾、全文效果和作者方向门禁。跨维度、多块、受保护或低置信 finding 均不能触发。首个真实跟进样本的首轮 exposition 修订直接通过，因此重试为 `not_run`；该结果只证明正常路径兼容，真实触发效果仍待验证。

冻结原创场景还完成了一次真实同模型匿名对照：两条路径共享锁定意图、Context Snapshot、人工召回、作者方向和目标长度，随机生成顺序并随机映射 A/B；首轮与独立复核 Auditor 均看不到路径。最新记录中工作流在张力、人物能动性和类型兑现 3 项占优，直接 Writer 在声线、重复、解释负担和节奏 4 项占优，连续性、信息控制、新鲜度和现场细节 4 项平局；两边硬约束均通过，工作流候选带最终方向回执。此前一轮曾确认工作流候选存在连续性硬失败，促使硬约束增加可独立复核的原因码；该负结果不能被最新样本抹去。当前证据只证明工作流取舍和失败原因可被结构化记录，不证明整体文学质量或统计性提升。证据见 `validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json`。

随后完成的三种子真实 campaign 覆盖资源协商、环境撤退和信息潜入三种原创单场景机制。工作流在张力、人物能动性、类型兑现和现场细节四项均为 3/3 占优；连续性三场均平局，信息控制为两场平局和一场首轮判断被独立复核拒绝；两条路径的硬约束均为 3/3 通过。`pairedQualityCampaign.ts` 按不同 fixture 而不是原始维度次数判断重复：文学败因至少跨两个 fixture 才进入工作流变更审查，任一经复核的工作流硬失败立即进入审查，任何结果都不得自动修改 prompt。当前五类工作流败因各只出现于一个 fixture，决策为 `hold_current_workflow`。证据见 `validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json`。

未验证：不同真实模型的统一 Rubric 对比、更大规模和跨题材种子重复、非相邻长程伏笔的全量闭合、普通创作者完成率、采纳率、留存、专业编辑盲评、实际在线成本和生产 Supabase 部署。当前 `improved`、相邻窗口 `pass` 或三场匿名逐维偏好只表示预先定义的证据门禁通过，不等同于专家文学质量结论或统计性提升。
