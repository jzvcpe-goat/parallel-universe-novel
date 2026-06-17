# 后端完整包可复用资产评估

评估对象：

- `/Users/james/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/mo456123zz_036c/temp/drag/parallel-novel-backend-complete-20260615-215908.zip`

评估时间：

- 2026-06-15

当前结论：

- 这份包可以作为后端能力资产池使用，比此前包含重复前端的包更适合接收。
- 不能整体覆盖当前项目。当前前端仍以 `/Users/james/Documents/PUF/workspaces/integration-harness/app` 为唯一主线。
- 后端接收方式应是“抽取模型、迁移、服务、测试、脚本”，不是搬入它的 monorepo 结构。
- 包内仍残留旧全栈痕迹，例如 `package.json`、CI、脚本和部分测试仍引用 `apps/web`、Next.js、旧 reader 页面，因此这些只能作为参考，不能作为当前工程事实。

## 一、快速体检

已完成检查：

- 解压到 `/tmp/parallel-novel-backend-complete-20260615-215908`
- Python 静态编译通过：`python3 -m compileall -q apps/api/app scripts`
- 主要后端文件规模：
  - `apps/api/app/main.py`：9192 行
  - `apps/api/app/schemas.py`：1580 行
  - `apps/api/app/agents/chapter.py`：11141 行
  - `apps/api/app/db/models.py`：789 行

体检判断：

- `schemas.py`、`db/models.py`、`alembic/versions/` 是最值得优先吸收的资产。
- `main.py` 和 `agents/chapter.py` 过大，必须拆成 routers/services 后才能进入当前后端。
- CI 和 scripts 有价值，但必须改掉 Next.js / `apps/web` 假设。

### 必补缺口：Narrative Runtime Engine

这份后端包没有把 `Narrative Runtime Engine` 作为独立中枢实现或文档化。它只有分散资产：

- constraint evaluation：部分散落在 `GenreKernelV1.taboo_fragments`、content safety、editorial style、测试用例中。
- kernel selection：有 `GenreKernelV1`，但缺少按用户题材、时代、地域感、叙事目标动态选择内核的服务。
- scene planning：有 chapter plan / chapter generation 相关结构，但混在 `agents/chapter.py` 和 `main.py` 中。
- state writeback：有 `StoryStateCard`、`StoryStateChange`、`WorldTemplate`、`WorldInstance`，但缺少统一回写事务。
- time consistency：有 `TimeCandidateEvent` 和因果/continuity 资产，但缺少每轮生成前后的时间一致性 gate。
- quality brake：有内容安全和编辑审计，但不是统一 runtime pipeline 的强制步骤。
- branch generation：有 `/scene/advance`、`Worldline` 和章节选择，但缺少“选择 -> 分支 -> 状态 -> 下一章”的单一编排层。

因此接收这份后端代码前，必须新增一个 `NarrativeRuntimeEngine` 服务层。它不应该是新页面，也不应该把内部词暴露给用户；它是后端生成与状态变更的唯一入口。前端的 `/create`、`/story`、`/studio` 都应该通过它或它的 facade 触发创作推进，避免各接口各自绕过约束、质量和状态回写。

建议目标文件：

- 当前产品断点：`docs/product/breakpoints/00_NARRATIVE_RUNTIME_ENGINE.md`
- 后端服务：`backend/src/narrativeos/runtime/engine.py`
- 后端合同：`backend/src/narrativeos/api/product_runtime.py`
- 测试：`backend/tests/test_narrative_runtime_engine.py`

## 二、可直接复用或高价值迁移的资产

### 1. 数据模型与迁移

可用文件：

- `apps/api/app/db/models.py`
- `apps/api/app/db/schema.py`
- `apps/api/alembic/versions/20260530_0001_initial_commercial_schema.py`
- `apps/api/alembic/versions/20260601_0002_story_projects.py`
- `apps/api/alembic/versions/20260606_0003_genre_kernel_time_candidates.py`
- `apps/api/alembic/versions/20260606_0004_user_llm_connections.py`
- `apps/api/alembic/versions/20260615_0005_story_project_state_kernel.py`
- `apps/api/app/tests/test_database_migrations.py`

可用点：

- `StoryProjectORM`
- `WorldTemplateORM`
- `WorldInstanceORM`
- `TimeCandidateEventORM`
- `StoryStateCardORM`
- `StoryStateChangeORM`
- `ChapterChoiceORM`
- `UserLlmConnectionORM`
- `LaunchEvidenceORM`
- `ReleaseCandidateORM`
- `PublishedReleaseORM`
- `PrivacyExport` 相关表

接收方式：

- 作为当前后端数据库设计的候选蓝本。
- 先生成一份 schema diff，再决定是迁移当前 `narrativeos` 持久层，还是在当前后端新增独立 `commercial_story` 模块。
- 不允许在未做 diff 的情况下直接覆盖当前 `backend/src/narrativeos/persistence/*`。

验收标准：

- 当前后端能在新库上执行迁移。
- 现有前端 API 不破。
- `story_project`、`world_template`、`world_instance`、`time_candidate_event`、`state_card` 五类核心表能被端到端创建和查询。

### 2. 故事项目与章节选择流程

可用文件：

- `apps/api/app/schemas.py`
- `apps/api/app/main.py`
- `apps/api/app/tests/test_story_projects.py`

可用接口设计：

- `POST /story-projects`
- `GET /story-projects`
- `GET /story-projects/{project_id}`
- `GET /story-projects/{project_id}/chapters`
- `POST /story-projects/{project_id}/chapters/{chapter_index}/choice`
- `GET /shared/story-projects/{share_slug}`
- `POST /story-projects/{project_id}/share/revoke`
- `POST /story-projects/{project_id}/generation/retry`

产品价值：

- 能把当前 `/create` 的自然语言创作入口接成真实项目。
- 能把“先写首段，再追问关键问题”落到可保存、可续写、可分享的项目状态。
- 能支撑读者侧“选择后继续生成下一章”。

接收方式：

- 只抽服务逻辑和 schema。
- 在当前后端建立 `/v1/creator/*` 或 `/v1/story-projects/*` 兼容层。
- 前端仍通过现有 `app/src/api/creator.ts`、`story.ts`、`runtime.ts` 调用，不直接暴露后端内部路径给页面。

验收标准：

- `/create` 提交一句故事种子后创建项目并返回第一段正文。
- 用户选择或继续引导后，状态写回项目。
- 页面不出现 `story project`、`template`、`kernel`、`time candidate` 等内部词。

### 3. 类型内核、世界模板、状态回写

可用文件：

- `apps/api/app/schemas.py`
- `apps/api/app/db/models.py`
- `apps/api/app/tests/test_story_projects.py`

可用结构：

- `GenreKernelV1`
- `WorldTemplate`
- `WorldInstance`
- `StoryStateCard`
- `StoryStateChange`

产品价值：

- 对应当前产品的“类型内核、世界引擎、状态回写”三条主线。
- 能把用户手动输入、memo 小模型冻结参数、LLM 生成结果区分为 `source: human | memo | llm | system`。

必须改造：

- `GenreKernelV1` 不能固定成一个后端默认类型。
- 需要接入我们已经拆出的 `setting_cards.genre_constraints` 规则。
- 需要抽象前提条件：题材、时代、地域感、叙事视角、禁止物、读者预期、商业平台节奏、人物功能位、场景密度。

验收标准：

- 用户选择“西幻穿越 / 非游戏化”时，约束进入 `setting_cards.genre_constraints`。
- 不再出现不合时代或不合题材的异常设定，例如用户未要求时出现“清河县仵作”等错位职业。
- 状态卡能区分人填、冻结模板、模型生成、系统派生。

### 4. 时间候选事件与剧情推进

可用文件：

- `apps/api/app/schemas.py`
- `apps/api/app/db/models.py`
- `apps/api/app/tests/test_story_projects.py`

可用接口设计：

- `GET /story-projects/{project_id}/time-candidate-events`
- `POST /story-projects/{project_id}/time-candidate-events/{event_id}/select`
- `POST /story-projects/{project_id}/time-candidate-events/{event_id}/reject`
- `POST /story-projects/{project_id}/time-candidate-events/regenerate`

产品价值：

- 能承接 PRD 中“非齐次泊松 + Hawkes”时间引擎的落地形态。
- 对创作者可见，对读者隐藏。

必须改造：

- 用户界面不要叫“时间织机”。
- 对外产品文案应是“剧情节奏”“事件推进”“章节脉冲”一类自然语言。
- 后端可继续保存 `time_candidate_events`，但前端只在创作工作台或内部调试中展示。

验收标准：

- 每章生成时至少有一个 materialized 事件。
- 创作者能选择/拒绝候选事件。
- 读者阅读页不暴露算法词。

### 5. 多模型连接与 BYOK

可用文件：

- `apps/api/app/adapters/litellm.py`
- `apps/api/app/agents/cost_router.py`
- `apps/api/app/main.py`
- `apps/api/app/tests/test_story_projects.py`
- `apps/api/app/tests/test_privacy.py`

可用接口设计：

- `GET /users/{user_id}/llm-connection`
- `PUT /users/{user_id}/llm-connection`
- `POST /users/{user_id}/llm-connection/test`
- `DELETE /users/{user_id}/llm-connection`

产品价值：

- 能支撑“适配任何大模型”的后端基础。
- 能隔离用户自带 key 与平台模型。
- 能避免再次出现前端残留某一家模型供应商的情况。

必须改造：

- 前端文案不得写死 Kimi/Moonshot/DeepSeek/OpenAI。
- 后端配置要抽象为 provider、base_url、model roles、capabilities、cost tier。
- 用户 key 不能明文落库、不能出现在日志、导出和错误信息里。

验收标准：

- 同一创作请求可切换 OpenAI-compatible base URL。
- DeepSeek、OpenAI-compatible、本地 LiteLLM 都能通过同一接口配置。
- 隐私导出只包含 key fingerprint，不含 key 本体。

### 6. 内容安全、质量刹车、编辑风格审计

可用文件：

- `apps/api/app/agents/content_safety.py`
- `apps/api/app/agents/editorial_style.py`
- `apps/api/app/agents/manuscript.py`
- `apps/api/app/tests/test_content_safety.py`
- `apps/api/app/tests/test_editorial_style_audit.py`
- `scripts/verify_manuscript_quality.py`
- `scripts/audit_editorial_style.py`

产品价值：

- 能支撑“质量刹车”从概念进入真实门禁。
- 对正文污染、重复段落、AI 味、隐私风险有现成测试思路。

必须改造：

- 质量评价不能出现在读者公共阅读页。
- 创作者端显示成“可读性、连贯性、人物一致、设定一致、敏感风险”等自然指标。
- 后台仍可保留详细分项和证据。

验收标准：

- 不合格正文不能进入 canon / published release。
- 质量报告能指向具体段落或章节。
- 公开页面只显示必要提示，不暴露内部 gate 名称。

### 7. 商业化、权益、发布证据

可用文件：

- `apps/api/app/main.py`
- `apps/api/app/tests/test_billing_entitlements.py`
- `apps/api/app/tests/test_release_candidates.py`
- `apps/api/app/tests/test_launch_evidence.py`
- `apps/api/app/tests/test_privacy.py`
- `scripts/export_release_packet.py`
- `scripts/export_launch_evidence_checklist.py`
- `scripts/commercial_readiness_audit.py`
- `scripts/export_commercial_evidence_bundle.py`

可用接口设计：

- `GET /billing/products`
- `POST /billing/checkout`
- `POST /billing/checkout-session`
- `POST /billing/webhook`
- `GET /entitlements/{user_id}`
- `POST /release/candidates`
- `POST /release/candidates/{candidate_id}/approve`
- `GET /published/releases`
- `GET /ops/launch-evidence`
- `GET /ops/release-packet`
- `GET /privacy/export/{user_id}`
- `DELETE /privacy/users/{user_id}`

产品价值：

- 对上线、支付、发布审批、隐私合规有完整雏形。
- 可以用来补当前“商业化发布链路”的断点。

必须改造：

- 这些功能先进入后台/运营，不要污染读者页。
- 真实支付接入前必须区分 mock checkout、sandbox、production。

验收标准：

- 商品、权益、支付状态、发布候选、发布版本和隐私删除形成闭环。
- 未完成真实支付前，页面明确是测试/沙箱状态。
- 商业发布必须有证据包。

### 8. Harness 与 smoke 脚本

可用文件：

- `.github/workflows/ci.yml`
- `scripts/fullstack-smoke.mjs`
- `scripts/browser-regression.mjs`
- `scripts/external-beta-smoke.mjs`
- `scripts/external-generation-progress-smoke.mjs`
- `scripts/story-generation-worker.mjs`
- `scripts/audit_prd_traceability.py`
- `scripts/audit_goal_completion.py`

产品价值：

- 能加速建立当前项目自己的 Harness。
- 可以复用“启动服务、跑 API、跑浏览器、导出证据”的结构。

必须改造：

- 全部去掉 Next.js / `apps/web` 假设。
- 改成当前前端 `app/` 的 Vite 路由和当前后端 `backend/` 的 FastAPI 启动方式。
- 不能把这些脚本作为已通过证据，必须在当前项目跑通后重新生成证据。

验收标准：

- 一条命令完成 env check、前端 build、后端 tests、API smoke、browser smoke、copy-boundary check。
- 失败时输出可定位的 markdown/json 报告。

## 三、不能直接合并的区域

### 1. `apps/api/app/main.py`

问题：

- 9192 行，路由、服务、状态、生成逻辑混在一起。
- 直接合并会让当前后端失去模块边界。

处理：

- 按 `auth`、`users`、`billing`、`story_projects`、`scene`、`quality`、`release`、`ops` 拆 router。
- 业务逻辑进入 service。
- schema 保持单独模块。

### 2. `apps/api/app/agents/chapter.py`

问题：

- 11141 行，疑似包含大量固定剧情、人物和旧样例。
- 正是此前“残留设定”“题材错位”的高风险来源。

处理：

- 只提取通用算法：字数控制、段落重复检测、章节计划结构、候选选择生成器。
- 所有具体世界观、人名、地名、职业、平台文案必须删掉或迁到 seed 数据。
- 进入当前项目之前必须跑“题材约束污染测试”。

### 3. 旧全栈脚本和 CI

问题：

- 顶层 `package.json` 仍依赖 Next.js。
- CI 仍跑 `@parallel-novel/web`。
- 部分测试和脚本引用 `apps/web/...`，但 zip 内没有对应前端。

处理：

- 只参考脚本结构，不搬命令。
- 当前项目需要新建自己的 root CI 和 Harness，不继承旧 monorepo 假设。

### 4. 文档与 PRD

问题：

- zip 内 docs 可能反映后端团队实现视角，不是当前产品最终方向。
- 部分文档会把内部能力暴露成产品文案。

处理：

- 只能作为后端实现备注。
- 产品源文档仍以当前 `docs/product/` 下我们维护的规则、断点、交付标准为准。

## 四、与当前前端的对接判断

当前前端调用集中在：

- `app/src/api/creator.ts`
- `app/src/api/story.ts`
- `app/src/api/runtime.ts`
- `app/src/api/library.ts`
- `app/src/api/market.ts`
- `app/src/api/settings.ts`
- `app/src/api/account.ts`

当前前端已有入口：

- `/`
- `/story`
- `/create`
- `/library`
- `/studio`
- `/account`

后端包可支撑的对应能力：

| 当前前端入口 | 当前前端 API | 后端包可用能力 | 接收建议 |
|---|---|---|---|
| 首页 | `/reader/library/worlds`, `/market/trends` | published releases, billing products, market scan 思路 | 首页推荐先接市场趋势和发布作品，不暴露后端术语 |
| 阅读页 | `/reader/sessions`, `/reader/continue`, `/scene/advance` | `/scene/advance`, `/published/releases/*`, `/story-projects/*/chapters` | 需要一个 reader adapter，把后端故事项目转换成当前 ReaderWorld/Session |
| 创作页 | `/creator/dialogue/*` | `/story-projects`, `/chapters/*/choice`, `/users/*/llm-connection` | 优先接创作真实闭环 |
| 创作者工作台 | `/quality/evaluate`, `/canon/commit` | quality, release, story state cards, time events | 只给创作者/运营显示 |
| 设置/账号 | `/account/*`, `/reader/subscription`, `/reader/checkout/*` | users, billing, entitlements, privacy | 可复用但要做当前合同适配 |

## 五、推荐接收顺序

### P0：只接合同，不接实现

目标：

- 把后端包里的 schema、models、routes 转成当前项目的接收矩阵。

交付：

- `docs/engineering/backend-asset-intake-matrix.md`
- `docs/engineering/frontend-backend-contract-map.md`
- 当前前端 API 到后端能力的映射表。

完成标准：

- 每个前端入口都有后端来源或明确降级。
- 没有“前端有入口后端没能力”或“后端有能力前端无入口且误对外”的情况。

### P1：接创作真实闭环

目标：

- `/create` 从自然语言输入创建真实项目，生成首段正文，追问关键问题，保存状态。

优先复用：

- `StoryProjectCreateRequest`
- `StoryProjectDetail`
- `ChapterChoice`
- `WorldTemplate`
- `WorldInstance`
- `StoryStateCard`
- `UserLlmConnection`

完成标准：

- 用户输入一句故事种子，后端返回第一段正文和下一轮追问。
- 选择题材后约束进入 `setting_cards.genre_constraints`。
- 章节、人物、场景、规则、冲突、风格基调都有状态卡。

### P2：接阅读选择闭环

目标：

- `/story` 的选择真正写回后端并生成下一段/下一章。

优先复用：

- `ChapterChoiceSubmitRequest`
- `TimeCandidateEvent`
- `SceneAdvanceResponse`
- `Worldline`

完成标准：

- 选择后状态改变、世界线改变、下一章生成。
- 读者页不显示内部算法词。
- 可恢复阅读进度。

### P3：接质量刹车和发布候选

目标：

- 创作结果从 candidate 到 canon / published release 有门禁。

优先复用：

- content safety
- editorial style
- release candidates
- launch evidence

完成标准：

- 质量不达标不能发布。
- 发布证据包可导出。
- 创作者看到可行动问题，读者看不到后台词。

### P4：接多模型和成本路由

目标：

- 适配任何 OpenAI-compatible 大模型，支持用户自带 key、平台 key、mock/dev 三态。

优先复用：

- `LiteLLMAdapter`
- `UserLlmRuntime`
- `CostRouterAgent`
- `UserLlmConnectionORM`

完成标准：

- 不硬编码任何单一模型供应商。
- key 安全存储，导出只显示 fingerprint。
- task role 能选择 cheap/strong/embedding 等模型。

### P5：接 Harness / Agent Eval

目标：

- 用当前项目真实前后端建立可持续验收。

优先复用：

- fullstack smoke 脚本结构
- browser regression 脚本结构
- manuscript quality verifier
- PRD traceability audit 思路

完成标准：

- 一条命令能跑完：env check、frontend build、backend tests、API smoke、browser smoke、copy-boundary、quality gate。
- 失败输出证据文件。
- CI 能在 GitHub 上复跑。

## 六、总判断

这份后端包最值得使用的不是它的工程外壳，而是以下能力：

1. 数据模型和迁移。
2. 故事项目 / 章节选择 / 分享流程。
3. 类型内核、世界模板、状态卡的数据结构。
4. 时间候选事件的保存和选择机制。
5. BYOK / OpenAI-compatible 模型连接。
6. 内容安全、正文质量、编辑风格审计。
7. 商业发布、支付权益、隐私删除。
8. smoke、audit、evidence bundle 的 Harness 思路。

最不应该直接使用的是：

1. 旧 monorepo 结构。
2. Next.js 前端假设。
3. 超大 `main.py`。
4. 超大 `agents/chapter.py` 中的具体剧情和旧样例。
5. 会泄漏内部术语的文档和页面文案。

下一步应先做“接收矩阵 + 合同映射”，再按 P1 创作闭环开始接真实后端能力。
