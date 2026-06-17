# 平行宇宙小说设计系统开发经验

## 2026-06-17 P4 约束与类型内核重做

### 现象

P4 约束层此前围绕“西幻 / 非游戏化 / 禁古代官署职业”的负例做了过多特例，debug 脚本和测试也沿用这一组输入。这会让运行时看起来像是在修一个具体 prompt bug，而不是按文档规则选择类型内核。

### 原因

1. 约束逻辑先从一次真实测试断点长出来，没有及时回到 `constraints and kernel` 文档的完整题材体系。
2. 规则激活把正文关键词、模板 hooks 和用户显式选择混在一起，导致“喜剧反套路”输入里出现“升级”时可能被游戏类抢占。
3. 宽泛情绪词例如 `情感成长` 被放入硬题材 signal，容易把非目标题材误激活。

### 修复原则

1. P4 的事实源是文档化的 `ConstraintProfile + GenreKernel`，不是某个负例黑名单。
2. 运行时规则统一存放在 `docs/product/rules/genre-runtime-rules.v1.json`，Mastra 和 FastAPI 都只读这份 JSON。
3. 代表作品只用匿名 `rwref_*`，明文标题只存在私有加密 vault。
4. 显式选择优先：用户选择的 genre/template/profile 排在 seed 关键词之前。
5. 通用情绪词不能单独触发硬题材 Profile；只能作为后续写作风格或软提示。
6. 若未来要加入特殊限制，必须抽象为可编辑的 profile/rule/doctrine，不允许在服务代码里写死 prompt 特例。

### 本轮落地

- `genre-runtime-rules.v1.json` 升级到 version 2，覆盖 21 个文档来源题材 Profile 与 21 个 Kernel。
- `packages/agent-runtime/src/constraints.ts` 和 `backend/src/narrativeos/services/creator_dialogue.py` 统一按显式选择排序 active profile。
- 后端 `CreatorDialogue` 不再包含旧西幻、非游戏化、古代官署职业硬编码分支。
- debug 默认样例改成文档内的仙侠、现代、女频重生等主类目。
- 测试覆盖 `仙侠玄幻 / 其他现代 / 游戏异界 / 喜剧反套路`，并验证未匹配的泛情感输入不会误触发硬约束。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
./backend/.venv/bin/pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
npm run scan:reference-privacy
```

## 2026-06-12 /create 创作页布局与系统边界收口

### 现象

`/create` 的创作助手空状态在中等浏览器视口里出现底部内容被裁切的问题。用户看到的是输入框、提交按钮和示例 chip 被挤在一个内部滚动区域里，像后台表单，而不是自然语言对话入口。

同一轮检查还发现设计系统文档仍保留旧的七入口 rail：`发现 / 书库 / 阅读 / 创作 / 创作室 / 设置 / 支付`。这和当前产品路径不一致。当前普通用户主导航只应该是 `发现 / 阅读 / 书城 / 创作`，Studio 属于后台直达页。

### 原因

1. `/create` 空状态复用了对话线程的滚动规则，`.creator-thread` 同时设置 `max-height` 和 `overflow-y: auto`。这适合已有对话后的消息流，不适合首屏空状态。
2. 空状态卡片直接写在页面里，页面承担了业务结构、输入框、示例 chip、按钮状态和布局样式，导致修一次布局很容易继续堆 class。
3. 设计系统契约和产品路径没有同步更新。主路径已收敛，但 registry、文档和 shell 仍表达旧的后台/支付/设置入口。

### 修复原则

1. 空状态走页面自然滚动，已有会话的消息流才使用内部滚动。
2. 创作入口必须像对话，而不是设定表单。输入框、按钮、提示和示例应该在同一业务 pattern 内管理。
3. 页面级结构尽量抽成 design-system pattern。`/create` 的首屏对话入口由 `CreatorConversationPanel` 承载，页面只传入状态、示例和回调。
4. 普通用户主导航只保留 `发现 / 阅读 / 书城 / 创作`。Studio、设置、支付不进入主路径，除非真实权限、保存、支付流程已经接好。
5. 文案边界和结构边界必须进入自动检查。人工注释只能发现一次问题，脚本才能防止问题回流。

### 本轮落地

- 新增 `CreatorConversationPanel`，承载创作助手空状态、textarea、提交按钮、说明文案和示例 chip。
- `/create` 使用 `CreatorConversationPanel`，移除页面内手写空状态卡片结构。
- `.creator-thread-empty` 使用自然页面流，避免内部裁切；`.creator-thread-active` 保留消息流滚动。
- `ParallelUniverseShell` 和 design-system registry 改为当前公共 rail：`发现 / 阅读 / 书城 / 创作`。
- 新增 `npm run check:design-system`，检查主导航边界、CreatorConversationPanel 使用、registry 导出、文档沉淀和过期公共词。

### 后续页面开发规则

1. 新页面先选 surface：`discover / library / reader / creator / studio / settings / billing`。
2. 先查 `page-contracts.ts`，确认 required patterns，再写页面。
3. 页面里不要新建大块业务卡片。先问：这是不是应该成为 `components/design-system` pattern？
4. 可以短期保留页面局部 class，但必须满足：
   - 不创建新的主导航；
   - 不把 Studio 放回普通用户主路径；
   - 不出现 `后端 / PRD / OpenAPI / 时间织机 / 主宇宙模板 / 作者入口 / 写作专区` 等过期词；
   - 不在首屏创作入口使用固定高度嵌套滚动。
5. 每次系统级修复都要更新本文件，写清楚：现象、原因、修复原则、自动检查。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run check:copy-boundary
npm run check:design-system
npx tsc --noEmit -p tsconfig.app.json
npm run lint -- --max-warnings=0
npm run build
```

## 2026-06-12 /create 自然语言对话体验收口

### 现象

`/create` 在布局收口后仍有一层产品体验问题：提交故事种子后，主区域虽然能生成内容，但侧栏和状态卡会露出 `系统从正文提取`、`底盘预设` 这类实现视角。用户看到的是字段流水账，而不是一个正在和他共同写小说的创作助手。

### 原因

1. 创作页把结构化卡片当作主体验的一部分展示，导致人物、场景、规则等能力看起来像后台字段。
2. 对话线程、追问和继续输入没有形成独立 pattern，页面同时负责状态、正文、问题、输入区和笔记。
3. 自动检查只拦截了大块后台词，没有覆盖创作主路径里更细的实现词。

### 修复原则

1. 创作主路径优先自然语言对话：用户说想法，助手给正文，再追问一两个关键问题。
2. 结构化能力只能产品化为 `故事笔记`、`我已记住`、`方向参考`、`你刚告诉我` 这样的作者语言。
3. `人物 / 场景 / 规则 / 冲突 / 下一章钩子` 是故事写作维度，不是系统字段。它们可以出现在辅助侧栏，但不能抢主体验。
4. 提交后主区域由 `CreatorDialogueThread` 承载；故事线索由 `CreatorStoryNotes` 承载。页面只编排数据和回调。
5. 检查脚本要防止 `系统从正文提取 / 底盘预设 / 绑定 / system prompt` 等词进入 `/create` 和创作 pattern。

### 本轮落地

- 新增 `CreatorDialogueThread`，统一展示用户故事种子、助手开场正文、最多两个追问和继续输入框。
- 新增 `CreatorStoryNotes`，把结构化能力包装为作者能理解的故事笔记。
- `/create` 提交态不再直接渲染消息、追问和 composer；改为组合 design-system pattern。
- `check:design-system` 增加创作主路径内部术语检查。

### 后续页面开发规则

1. 凡是普通作者会看到的文案，优先判断“这像不像人在协助写小说”，不要解释系统如何工作。
2. 需要给后端或运营看的 prompt、来源、模型、提取、冻结参数等信息，只能进 Studio 或交接文档。
3. 新增创作能力时，先决定它属于：
   - 主对话：正文、追问、继续输入；
   - 故事笔记：人物、场景、规则、冲突、钩子；
   - 后台配置：prompt、模型、来源、质量阈值。
4. 如果一个模块无法放进以上三类，先写产品规则，不要先做页面。

## 2026-06-12 外部前端接入边界

### 现象

后端团队交付包里包含独立的 Next.js 前端 `apps/web`。它可以帮助理解后端能力、路由和验证脚本，但它不是当前商业原型的前端主线。当前产品前端以 `/Users/james/Documents/PUF/workspaces/integration-harness/app` 的 Vite + React + TypeScript 实现为准。

### 风险

如果把外部前端直接并入当前项目，会重新引入已经清理过的路线问题：读者入口不一致、创作页交互不一致、设计系统分层失效、内部术语重新泄漏，以及上线目标从一个清晰的 Web 商业原型变成两个前端框架并存。

### 决策规则

1. 当前 Vite/React 前端是唯一产品主线。
2. 后端包里的 `apps/web`、旧概念页、外部 UI 文件只能作为参考资料，不能直接覆盖或合并。
3. 任何外部前端进入当前产品前，必须先经过子 agent 审批判断，审批问题至少包括：
   - 是否服务当前 reader-first / creator-conversation 产品方向；
   - 是否能用现有 shadcn-compatible primitives、tokens 和 design-system patterns 表达；
   - 是否会引入旧导航、后台词、重复页面或双框架维护成本；
   - 是否只需抽取少量业务逻辑、文案或数据结构，而不是合并整页 UI。
4. 未通过审批的外部前端只能停留在 `reference` 或 `handoff` 状态，不进入 `app/src`。
5. 后端接入以 API 契约、schema、测试和部署脚本为主，前端 UI 仍由当前设计系统承载。
6. 坚决不做重复开发：已有产品入口、页面结构、设计系统组件和交互模式不得被第二套前端重造；新包只能贡献未覆盖的 API 契约、领域模型、后端能力、测试脚本或少量可迁移业务逻辑。若发现同一能力有两套实现，优先保留当前产品主线，并把外部实现降级为参考材料。

## 2026-06-12 P0 前后端世界 ID 契约

### 现象

`/story` 在真实 API 配置下能显示正文和选择，但后端日志显示 `POST /v1/reader/sessions` 返回 404。原因不是路由缺失，而是前端使用的产品世界 ID（例如 `beacon-beyond`）没有注册进后端 worldpack/runtime 系统，导致页面看似可用，保存和推进实际没有落到真实 reader session。

### 原因

1. 前端世界入口和后端内置样例世界长期并行存在，名称、ID 和语义没有成为共同契约。
2. 验证脚本只确认路由存在和页面可打开，没有覆盖“前端可见世界 ID 能创建真实 session”。
3. 浏览器 QA 只看 UI 状态会误判；必须同时看后端日志、保存文件或数据库记录。

### 修复原则

1. 当前产品前端世界 ID 是 API 契约的一部分，不能临时 remap 成后端旧样例 ID。
2. 后端启动时通过 `backend/src/narrativeos/services/frontend_worlds.py` 注册当前公开世界：`beacon-beyond / rain-bridge / jade-contract / lotus-lane / frontier-edict / algorithm-city`。
3. `/v1/reader/sessions`、`/v1/reader/snapshot`、`/v1/scene/advance` 必须用这些前端世界 ID 完成真实 session 和选择推进。
4. browser QA 要同时检查：
   - 页面有阅读和选择结果；
   - 后端日志出现对应 200；
   - 保存文件或数据库能找到同一个 seed / world_id / session_id。

### 本轮落地

- 新增 `ensure_frontend_reader_worlds(...)`，把当前前端公开世界注册为 published worldpacks。
- `app_factory` 启动时执行注册，并暴露 `app.state.frontend_reader_worlds` 便于排查。
- `test_harness_narrow_api.py` 增加前端世界 ID 创建 session 和 continue 的回归测试。
- `check:backend-bridge` 增加对 frontend world registry 和 reader session 测试覆盖的检查。
- `check:copy-boundary` 增加 `底盘 / 绑定 / 起点 / 番茄 / 设定卡` 禁词，避免产品页重新出现内部或竞品研究语言。

## 2026-06-12 P0 部署与真实 API 证明

### 现象

本地前后端联调已经能跑通，但如果 preview 打包仍然只生成静态页面，或者没有记录 API host 和 smoke 结果，就会再次出现“页面看起来可用，实际上仍靠 fallback”的判断偏差。这个偏差会让产品、前端和后端团队对是否已经完成 P0 产生不同理解。

### 原因

1. 旧的 preview 打包脚本只跑 `check:alignment` 和 `build`，没有把后端桥接、文案边界、设计系统边界和真实 API smoke 纳入上线前证据。
2. 静态 fallback 包和真实 API preview 包没有在 manifest 中明确区分，容易把设计/demo 预览误认为真实集成预览。
3. 后端部署包没有单独的 API-only 交付口径，容易被后端团队包里的 `apps/web` 或其他前端文件干扰。

### 修复原则

1. P0 preview 必须区分 `real-api`、`local-real-api` 和 `static-demo-fallback`。只有非 localhost 的 `real-api` 能作为可分享上线联调证据；`local-real-api` 只证明本机联调。
2. 后端交付只打包当前 FastAPI API 能力；外部 `apps/web` 仍然是参考材料，不进入产品前端。
3. 部署后必须跑 `scripts/smoke-deployed-api.sh https://<api-host>`，验证当前 `/v1` 产品契约，而不是验证后端团队内部路由。
4. 前端打包前必须跑 `check:alignment / check:backend-bridge / check:copy-boundary / check:design-system / build / audit`，防止内部词和第二套前端边界回流。
5. 文档里必须写清楚部署顺序：先 API host，再 API smoke，再带 `VITE_API_BASE_URL` 打包前端，再浏览器 QA。

### 本轮落地

- 新增 `scripts/smoke-deployed-api.sh`，覆盖 `/health`、世界列表、阅读 session、continue、scene advance、creator dialogue、quality evaluate 和 subscription。
- 新增 `scripts/package-backend-api-deploy.sh`，只打包当前后端 API，并先运行 P0 窄测。
- 升级 `scripts/package-vercel-preview.sh`，写入 `preview_kind`、API env、完整 pre-deploy checks 和 deployed API smoke 命令。
- `check:backend-bridge` 增加脚本和文档检查，确保部署证据不会被后续改动删掉。
- `BACKEND_COMPATIBILITY_BRIDGE_PLAN.md` 和 `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md` 增加 API-first 部署闭环说明。

## 2026-06-12 /create 创作推演，而不是原始思维链

### 现象

创作对话已经从表单流改成自然语言流，但用户仍需要一种“看得见的辅助方式”：他要知道系统会如何把一句故事种子扩展成全文设定、人物缺口、场景压力、世界规则和风格基调。直接展示大模型原始思维链不适合产品化，也会让页面变得像后台日志。

### 原因

1. 原始思维链是模型内部推理过程，不应该作为用户界面内容展示。
2. 作者真正需要的是可编辑、可理解、可用于继续创作的摘要，而不是底层推理细节。
3. `/create` 的设计目标是“苏格拉底式追问 + 先写正文”，因此辅助层应该帮助用户判断下一步回答什么，而不是解释模型如何运行。

### 修复原则

1. 借鉴思维链的分步结构，但产品化为“创作推演”。
2. 创作推演只展示用户可见结论：故事钩子、人物缺口、场景压力、世界规则、风格基调。
3. 每一步都要说明“为什么问这个方向”，但不能出现原始思维链、模型日志、system prompt、接口、后端等内部词。
4. 提交前显示方向参考；提交后用用户输入和已记住线索更新推演摘要。
5. 创作推演属于 design-system pattern，不能在页面里临时手写。

### 本轮落地

- 新增 `CreatorReasoningMap`，作为 `/create` 的可见创作推演 pattern。
- `/create` 在对话区顶部展示五步推演：故事钩子、人物缺口、场景压力、世界规则、风格基调。
- `page-contracts.ts` 和 `registry.ts` 把 `CreatorReasoningMap` 纳入 creator surface 的必需 pattern。
- shadcn registry JSON 新增 `creator-reasoning-map`，便于后续设计系统迁移和复用。
- `check:design-system` 增加 `CreatorReasoningMap` 与内部词边界检查。

## 2026-06-12 热门题材索引成为真实产品契约

### 现象

首页左侧仍使用写死的“作品分类”，创作页也维护一份本地题材映射。这样会让“热门题材索引”只停留在概念图或讨论里，无法按周/月刷新，也无法真正影响首页推荐和创作模板排序。

### 原因

1. 首页和创作页分别维护分类数据，缺少共同 API 契约。
2. 热门题材扫描属于后台能力，但前台只需要看到产品化结果。如果直接展示来源或内部词，会再次污染 reader/creator 页面。
3. P0 的目标是前端入口和后端能力互相对应，所以“动态题材索引”必须有 `/v1` route、前端 client、fallback 和 smoke，而不是只改文案。

### 修复原则

1. 后端提供 `GET /v1/market/trends` 作为首页和创作页共同数据源。
2. 后端提供 `POST /v1/market/trends/scan` 作为 function-call 形态的周/月刷新入口，函数名固定为 `scan_market_trends`。
3. 当前没有外部榜单源时，返回 curated seed snapshot 和刷新策略，不伪装成实时抓取。
4. 首页显示 `热门题材索引`，创作页显示 `故事方向`，不显示来源名、后台扫描细节或内部研究词。
5. 前端必须保留本地 fallback，避免 API 不可用时阻断首页和创作入口；但真实 API 可用时必须优先读取 `/v1/market/trends`。

### 本轮落地

- 新增 `MarketTrendService` 和 `/v1/market/trends`、`/v1/market/trends/scan`。
- `scan_market_trends` 响应必须包含 function schema 与调度元数据：weekly `0 8 * * MON` 调整首页推荐和创作排序；monthly `0 8 1 * *` 校准长期模板权重。
- 托管平台的 cron 可能只支持 GET，因此补充 `/v1/market/trends/cron/weekly` 与 `/v1/market/trends/cron/monthly`；它们是调度器入口，不进入前端导航。
- 新增 `app/src/api/market.ts` 与 `app/src/features/market/trends.ts`。
- 首页的分类区改为 `热门题材索引`，并按趋势 API 调整榜单和推荐书架排序。
- `/create` 的故事方向和推演基调改为读取同一份趋势 API。
- smoke、backend package、OpenAPI contract 和 P0 窄测加入 market trends。

## 2026-06-12 调度和算法词不能进入读者侧

### 现象

线上阅读页右侧一度出现 `t+`、`低权重事件`、`Hawkes` 等算法调试语言；首页和创作页也出现过“按周刷新”“按热门题材索引排序”这类偏后台说明。功能虽然真实接上了，但用户看到的是系统内部，不是故事体验。

### 原因

1. 后端/模拟器为了证明能力，会自然产出工程视角的状态词。
2. 前端为了展示“确实接上了”，容易把 scheduler、趋势刷新和事件权重直接写成页面文案。
3. 这类词不会被 `后端 / PRD / 接口` 的旧禁词自动挡住，需要补新的产品边界。

### 修复原则

1. 读者侧只讲故事结果：线索积累、人物关系、下一幕压力、选择影响。
2. 创作者侧只讲可操作语言：故事方向、创作推演、我会追问什么。
3. function calling、cron、Hawkes、权重、模型指标、system prompt 只能进 Studio 或交接文档。
4. 每次新增系统能力，都要同步扩展 `check:copy-boundary`，让旧词不会在后续 goal 回流。

### 本轮落地

- 首页文案改为“最近更受欢迎的故事方向，帮你更快找到想看的宇宙。”
- 创作页文案改为“选一个你想靠近的味道，人物和冲突会在对话里慢慢长出来。”
- 阅读页节奏面板从 `t+` 改成 `第 N 拍`，描述改成线索压力和下一幕变化。
- `AI 味抑制` 改成 `阅读自然度`。
- `check:copy-boundary` 增加 `低权重 / Hawkes / t+ / AI 味 / 系统提示词`。

## 2026-06-12 创作助手要有方向惯性

## 2026-06-12 P15 创作对话保存不能退化成项目表单

### 现象

后端团队已经具备 `StoryProjectCreateRequest` 和 `/story-projects` 能力，但当前产品的 `/create` 是自然语言创作助手。如果直接把后端项目字段搬到前端，页面会重新变成 `标题 / 主角 / 世界观 / 风格` 的表单流，违背“先写正文，再追问”的创作体验。

### 原因

1. 后端创建作品需要结构化字段，产品创作入口需要低摩擦对话，两者中间缺少明确转换层。
2. `creator dialogue session` 和 `story project` 是两个不同阶段：前者是共创过程，后者是可保存、可续写、可预览的作品资产。
3. 如果让前端直接调用后端团队 `/story-projects`，会绕过当前 `/v1` 产品契约，也容易引入第二套前端和重复开发。

### 修复原则

1. `/create` 继续保持自然语言和苏格拉底式追问；不要在第一屏要求用户填项目字段。
2. 只有当助手已经写出开场正文并沉淀出故事笔记后，才出现 `保存为作品` 和 `进入预览`。
3. 后端负责把对话转换成项目字段，字段来源分为：
   - 用户说的；
   - 对话整理的；
   - 题材经验提供的。
4. 前端公共文案只展示产品化来源标签，不展示接口、后端、prompt、provider、source 或工程状态。
5. 保存项目必须幂等，避免双击或重试生成重复作品。

### 本轮落地

- 新增 `docs/backend/P15_CREATOR_DIALOGUE_PROJECT_PERSISTENCE_DESIGN_20260612.md`。
- 定义状态机：`seed -> opening_draft -> clarify -> project_candidate -> saved_project -> preview_ready`。
- 定义产品路由建议：`POST /v1/creator/dialogue/sessions/{session_id}/project`。
- 明确不要让前端直接调用后端团队 `/story-projects`。
- 总 handoff 和 P13 验收清单已指向 P15 设计文档。

### 后续开发规则

1. 实现 P15 后端前，先补契约测试和 OpenAPI，再加前端按钮。
2. 前端按钮只在 `assistant.story_text` 存在后显示。
3. 如果保存被阻塞，继续用对话追问一个关键问题，不弹复杂表单。
4. 任何新保存/预览 UI 都必须通过 `check:copy-boundary` 和 `check:design-system`。

## 2026-06-12 P16 热门题材扫描要有适配器边界

### 现象

`scan_market_trends` 已经有路由、function-call 形态和 Studio 刷新按钮，但后端实现仍主要依赖 curated snapshot。这样可以支撑原型，却不能安全接入真实来源：一旦把来源、调度、扫描细节直接往前台堆，首页、书城和创作页又会变成运营后台说明。

### 原因

1. 热门题材是产品入口，真实来源扫描是后台能力，两者必须隔离。
2. 公共页只需要“当前更值得推荐什么”，不需要知道来源、调度、权重和失败原因。
3. Studio/Ops 需要看来源健康、扫描审计、模板影响和人工锁定，否则后端团队无法运营真实扫描。
4. 没有 adapter contract 时，每接一个来源都可能把原始字段和来源名带进公共 payload 或页面。

### 修复原则

1. 后端用 `MarketTrendSourceAdapter` 统一接入来源，adapter 内部消化 raw fields。
2. 服务层负责去重、权重归一化、失败降级和审计记录。
3. 公共页只消费 `top_categories / trends / template_recommendations` 的产品化字段。
4. `source_adapters / function_call / scan_schedule / ops` 只能进入 Studio、后端文档或验收脚本。
5. 所有外部来源必须先经过授权、许可或人工录入边界确认，不在产品 UI 中出现来源平台名。

### 本轮落地

- `MarketTrendService` 增加 source adapter 边界。
- 新增 `MarketTrendScanContext`、`MarketTrendSourceResult`、`MarketTrendSourceAdapter`、`CuratedSeedTrendAdapter`。
- 扫描结果增加 `ops.source_health`、`ops.audit`、`ops.weight_changes`、`ops.manual_locks`。
- `StudioTrendOpsPanel` 增加来源健康、扫描审计和模板影响展示。
- `backend/tests/test_market_trends_api.py` 增加 adapter 聚合和失败降级测试。
- 新增 `docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md`。

### 后续开发规则

1. 新增真实来源时，只新增 adapter 和测试，不直接改公共页面。
2. 真实来源失败时，首页、书城和创作页必须继续可用。
3. Studio 可以展示来源 ID、扫描状态和调度；公开页不可以。
4. 月度扫描只产出模板权重候选，不直接让未审核模板进入公开推荐。
5. 每次新增来源都要补：adapter 单测、失败降级单测、公共文案边界检查、Studio 验收截图。

## 2026-06-13 P17 质量检查必须分层组合，不能泄漏到读者端

### 现象

`/v1/quality/evaluate` 已经能返回 report 和薄版 quality gate，但字段只够判断是否能提交，不能解释内容安全、语言自然度、节奏、人物一致性、伏笔连续性、时间线一致性和发布准备度分别出了什么问题。另一方面，如果把这些评分直接放到读者页，产品又会退回后台仪表盘。

### 原因

1. 质量检查是发布前能力，不是读者体验本身。
2. 后端已有 linter、hard validators、NarrativeEval scorer、backend-team safety/release snapshot，但缺少统一产品合同。
3. 创作者需要可操作建议；Studio/Ops 需要阻断原因、评分、调试和发布准备度；读者只需要顺滑阅读状态。
4. learned evaluator 和 learned reranker 虽然已有研发轨道，但当前不能伪装成生产阻断门禁。

### 修复原则

1. 用一个 `QualityGateResult` 组合所有质量信号，同时保留旧字段兼容。
2. 实时阻断只用于内容安全、工程泄漏、元叙事泄漏、高严重度连续性、过早结局、缺少质量报告和缺少人工确认。
3. 章节长度、场景密度、重复、选择差异、钩子和人物一致性默认先作为 warning 或 rewrite 建议。
4. learned evaluator / learned reranker 只能出现在 Studio/Ops 的 shadow 状态里，且 `production_gate` 必须为 false。
5. Reader 只允许消费 `public_safe_message`；Creator 只显示 summary 和 suggested fixes；Studio/Ops 才能显示 blockers、warnings、scores、debug。

### 本轮落地

- 新增 `backend/src/narrativeos/services/quality_gate.py`。
- `ProductRuntimeService._quality_gate` 与 `BackendTeamBridge._quality_gate` 统一调用 `compose_quality_gate_result`。
- `app/src/api/runtime.ts` 扩展 `QualityGate` 类型，接住 P17 字段。
- Studio 发布检查卡片展示摘要、阻断项、提醒和下一步动作。
- `backend/tests/test_product_runtime_api.py` 覆盖扩展合同、工程泄漏阻断、确认缺失和 shadow-only learned 轨道。
- 新增 `docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md`。

### 后续开发规则

1. 新增质量维度时先接入 `QualityGateResult.scores`，再决定是否进入 blockers 或 warnings。
2. 任何读者端质量提示必须走 `public_safe_message`，不能直接渲染 issue code、score 或 debug。
3. Studio/Ops 可以展示详细门禁，但必须保持在后台路由，不能放进公共导航。
4. learned 轨道升级为生产门禁前，必须有 promotion workflow、回归测试和人工批准记录。
5. 后端团队接入 release snapshot 时，必须先映射到 `QualityGateResult`，不能让前端直接消费内部 snapshot。

## 2026-06-13 P18 支付完成与账号同步要区分预览闭环和生产回调

### 现象

会员页已经能读取方案并创建开通请求，但用户点击后只能看到“请求已创建”，无法验证权益是否刷新。后端实际上已经有 checkout lifecycle 处理、订阅状态、retry、renew、cancel 和 Ops reconcile；如果前端继续停在请求态，会让商业闭环看起来没有完成。反过来，如果直接把 provider、webhook、event id、ledger 解释给用户，又会把会员页变成后台排障页。

### 原因

1. 支付完成是产品闭环，但真实生产支付必须由服务端回调或后台 reconcile 完成。
2. 当前 `web_stub` 适合预览和验收，需要一个可点击完成并刷新权益的产品动作。
3. 账号同步不只是会员状态，还包括 reader session、阅读进度、creator dialogue 和未来 story project。
4. 公共页面只需要“权益是否可用”和“能否继续阅读/创作”，不需要支付供应商或生命周期诊断。

### 修复原则

1. `/settings` 可以展示会员方案、权益余额、开通请求、完成开通和刷新权益。
2. 预览环境可以通过当前 lifecycle endpoint 完成 `web_stub` 开通；生产环境必须走服务端回调或 Ops reconcile。
3. provider、webhook、event id、idempotency、ledger、reconcile 只能出现在 Studio/Ops、后端文档或测试里。
4. 账号同步合同必须同时覆盖 membership、reader progress、creator dialogue draft 和 future author project draft。
5. 本地浏览器保存只能作为 fallback，不能被描述成跨设备账号同步已经完成。

### 本轮落地

- `settingsApi.completeCheckout` 接入当前 lifecycle endpoint，并在完成后刷新 subscription。
- `useSettings` 增加 completion 状态，并从 subscription snapshot 回填 checkout session。
- `/settings` 增加“完成开通”产品动作，完成后展示权益刷新状态。
- `SubscriptionStatus` 类型增加 checkout session、lifecycle summary、retryable、renewable 和 recommended action 字段。
- 新增 `docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md`。

### 验收补充

- 真实浏览器 QA 必须用显式 API origin 启动前端：`VITE_API_ORIGIN=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 3000`。
- 如果没有配置 API origin，`app/src/api/client.ts` 会回退到浏览器当前 origin，导致 `/settings` 把 `/v1/reader/subscription` 打到 Vite 3000 端口并出现假 404。
- 支付/账号类 goal 的浏览器验收不能只看页面是否打开，必须点完 `开通这个方案 -> 完成开通`，确认状态变为 `已开通`、权益数字刷新、完成按钮消失。
- `scripts/smoke-deployed-api.sh` 的本地运行方式是 `NARRATIVEOS_API_ORIGIN=http://127.0.0.1:8000 ./scripts/smoke-deployed-api.sh`。
- 支付 smoke 必须使用唯一账号或唯一 session；固定账号重复运行会在已激活账户上新建 checkout，导致摘要看起来退回 created。

### 后续开发规则

1. 接真实支付供应商前，先补服务端签名校验、callback 验证、幂等和 replay 测试。
2. 前端只能发起 checkout、跳转/刷新状态和展示权益，不能伪造真实支付事件。
3. 跨设备同步前，先定义 account snapshot，再接 reader session 和 creator dialogue persistence。
4. 会员页所有文案必须保持用户语言：开通、权益、阅读次数、创作额度、恢复阅读。
5. Studio/Ops 可以保留 provider 和 lifecycle 诊断，但不能进入公共导航。

### 现象

`/create` 已经能先写正文再追问，但用户输入都市谜案或历史权谋种子后，如果第二轮回答包含“真相”这类通用词，页面可能又回到默认玄幻方向。用户会感觉系统只是在拼状态卡，不是真的理解创作上下文。

### 原因

1. 第一轮题材识别只看当前输入，没有保护正在写的方向。
2. 热门题材里的 `高热 / 上升 / 稳热` 是榜单语言，不是写作风格；直接传给创作助手会让正文和侧栏显得生硬。
3. 创作助手需要像 Codex 一样维持上下文，不应每一轮都重新开始判断任务。

### 修复原则

1. 第一轮从用户种子识别故事方向，强信号才切换模板。
2. 后续轮次保留当前方向惯性；只有新消息出现足够强的新题材信号时才切换。
3. 首页可以显示热度词，创作页必须显示写作风格词，例如“冷静、潮湿、证据感强”。
4. 真实对话上下文和 UI 展示必须使用同一故事方向，不能 UI 显示一类、API 传另一类。
5. 这属于设计系统边界：`check:design-system` 必须检查 `inferTemplateIdFromStorySeed` 和 `writingToneForTrend` 没被移除。

### 本轮落地

- `features/market/trends.ts` 新增 `inferTemplateIdFromStorySeed`，用六类故事方向和关键词识别用户种子。
- 识别器加入方向惯性：弱信号不切换，分数接近时保留当前方向。
- `writingToneForTrend` 将榜单热度词转换为创作风格词。
- `/create` 在创建会话和追加 turns 时都把同一故事方向传给后端 context。
- 浏览器验证：雨夜监控种子自动切到都市谜案，第二轮仍保持都市谜案；边城密诏种子自动切到历史权谋。

## 2026-06-12 Vercel 云端 build 必须拿到 Vite API env

### 现象

本地部署脚本传了 `VITE_API_ORIGIN=https://pun-api-p0.vercel.app` 和 `VITE_API_BASE_URL=https://pun-api-p0.vercel.app/v1`，预部署 smoke 也通过，但线上浏览器 `/create` 仍然走本地草稿。检查线上 JS bundle 后发现没有 `pun-api-p0`，只有默认 fallback。

### 原因

Vite 的 `import.meta.env` 在 build 时被静态写入。旧脚本只让本地预检查 build 拿到了 env，Vercel 云端重新 build 时没有收到 `--build-env VITE_API_*`，所以生产 bundle 没有真实 API 地址。

### 修复原则

1. 预部署 smoke 只能证明 API 可用，不能证明云端静态 bundle 已接 API。
2. Vercel 部署 Vite 项目时必须把 `VITE_API_ORIGIN` 和 `VITE_API_BASE_URL` 作为 `--build-env` 传入。
3. 部署后必须抽查线上 JS bundle，确认包含真实 API host。
4. 浏览器 QA 要看第二轮创作是否出现真实接口成功提示，而不是只看正文是否生成。

### 本轮落地

- `scripts/deploy-vercel-preview.sh` 增加 `VERCEL_BUILD_ENV_ARGS`，自动传入 `--build-env VITE_API_ORIGIN=...` 和 `--build-env VITE_API_BASE_URL=...`。
- 线上 bundle 已确认包含 `pun-api-p0` 和 `previous_session`。
- `/create` 线上两轮创作不再出现“先用草稿继续写”，并显示“这一段可以继续扩写。”
- `smoke-deployed-api.sh` 增加 creator second-turn 和 serverless rehydrate 检查。

## 2026-06-12 阅读器必须形成商业闭环

### 现象

`/story` 已经可以显示正文和选择，但如果只看正文纸张和按钮，仍然可能退回“可读样机”：三栏不对齐、书架只是按钮、选择后只变 UI，没有证据证明后续阅读会话真的推进。

### 原因

1. 阅读页同时承担长文本阅读、分支反馈、书架保存和真实会话推进，容易只优化其中一块。
2. 右侧面板为了证明系统能力，容易重新露出工程状态或质量术语。
3. 浏览器 QA 如果只看页面文字，无法证明选择已经进入 reader session 和世界线快照。

### 修复原则

1. 阅读页先是商业阅读器：中间 680-760px 正文、左右栏同一轨道、移动端用索引和反馈抽屉。
2. 每页正文必须有足够阅读密度，支持页内滚动和上一页/下一页，不把章节切得像展示卡。
3. 书架和阅读进度要有可持续体验；账号体系完成前，至少用浏览器保存世界、页码、选择和书架状态。
4. 选择影响只讲人物、记忆、下一幕和关系变化，不讲算法、调度、后端、接口或模型状态。
5. API smoke 必须覆盖 reader session、choice advance、reader snapshot 和 worldline event count。

### 本轮落地

- `/story` 三栏改为统一 reader layout 轨道：桌面 1240px，宽屏 1340px，中间正文保持 680-760px。
- 阅读分页阈值提升到约 520 字，正文区域可上下滚动，并保留上一页/下一页。
- 书架状态、页码、选择和分支通过浏览器保存；reload 后仍能恢复。
- 右侧栏顺序调整为“我的分支 / 阅读进度 / 选择影响 / 角色记忆 / 剧情节奏 / 故事状态”。
- `smoke-deployed-api.sh` 增加 `/reader/snapshot` 和 worldline event 校验，最新线上 smoke 返回 `reader_choice_events: 2`。
- 浏览器 QA：1440x900 下三栏无横向溢出、正文约 520 字；390x844 下索引和反馈可用，禁词为空。

## 2026-06-12 会员入口要接真实权益，但不能泄漏支付实现

### 现象

后端已经提供 `/v1/reader/subscription` 和 `/v1/reader/checkout/start`，但前端没有真正的会员入口，`/settings` 也没有出现在能力矩阵和路由 smoke 中。这样会出现后端能力存在、产品没有入口的问题。

### 原因

1. 早期设计系统把 settings/billing 都定义为后台直达面，避免未完成支付入口污染读者端。
2. 当 checkout start 已可用后，如果仍然不进入公共导航，商业闭环就无法被用户和团队验收。
3. 后端 checkout payload 含有 provider、stub、idempotency 等技术字段，直接展示会让普通用户误以为进入了排障台。

### 修复原则

1. “会员”可以成为第五个公共导航入口，但不能命名为“设置”或“支付”。
2. 会员页只展示产品化结果：当前方案、阅读次数、创作额度、会员方案、开通请求。
3. checkout start 可以被真实调用，但在正式支付页接入前，前台只能说“开通请求已创建”，不能伪造成支付成功。
4. 会员页必须进入 `check:copy-boundary`、route smoke 和 capability alignment。
5. 阅读页也要显示当前权益状态，并能自然跳转到会员页，不能让商业入口孤立。

### 本轮落地

- 新增 `/settings` 会员中心页面，绑定网页阅读档案 `web_reader_demo`。
- `settingsApi.getSubscriptionStatus` 支持按 account/reader 查询，`useSettings` 支持指定 account。
- 侧边栏新增第五项“会员”，设计系统 registry 和 boundary check 同步升级为五项公共导航。
- `/story` 右侧新增会员权益面板，显示免费体验或会员状态，并跳转到会员页。
- `smoke-deployed-api.sh` 增加 subscription tiers 和 checkout start 校验，最新返回 `subscription_tiers: 3`、`checkout_tier: play_pass`。
- 浏览器 QA：`/settings` 桌面和 390px 移动端无横向溢出；点击阅读会员会显示“已创建 阅读会员 开通请求”，且没有 provider/stub/endpoint 等内部词。

## 2026-06-12 内部能力只能进 Studio/Ops

### 现象

热门题材扫描、function calling、发布检查、确认发布和服务对应关系都已经有真实后端合同。如果为了证明“接上了”而把这些词直接放到首页、创作页或阅读页，页面会再次变成工程说明书，而不是商业产品。

### 原因

1. 公共页负责让用户阅读、选择、创作和开通权益；它们不应该解释扫描函数、cron、服务路径或发布守门。
2. Studio 是创作者和运营的幕后工作台，天然可以承载能力状态、刷新按钮、发布检查和交接边界。
3. 前后端不一致的问题要在 Studio 和自动化脚本里解决，而不是把半成品能力暴露给普通用户。

### 修复原则

1. `/studio` 可以显示 `scan_market_trends`、周期、调度和服务路径；`/`、`/library`、`/story`、`/create`、`/settings` 只能显示产品化结果。
2. 趋势刷新必须走真实 `/v1/market/trends` 和 `/v1/market/trends/scan`，不能只做假按钮。
3. 能力矩阵只放 Studio：已进产品路径、已接服务合同、仅工作台可见、二期规划要清楚分层。
4. 每次新增内部能力，都要补 `check:design-system` 或 `check:copy-boundary`，防止后续改版回流到公共页。

### 本轮落地

- `/studio` 新增“题材趋势与模板排序”，可触发本周/本月趋势刷新。
- `/studio` 右侧新增“题材扫描合同”，只在内部页展示 function calling、周期和调度信息。
- `/studio` 新增“入口与服务对应关系”，把会员、发布检查、趋势刷新等能力的前端入口和服务边界集中展示。
- `smoke-deployed-api.sh` 新增 `POST /market/trends/scan` 的 weekly/monthly 验证。
- `check:design-system` 新增 Studio 趋势刷新和能力映射守护项。

## 2026-06-12 shadcn/ui 维护方式必须是 pattern 下沉

### 现象

页面已经接近商业产品，但 Studio 和会员页仍有不少局部卡片实现：趋势刷新卡、能力映射卡、会员方案卡都可以工作，却散落在页面文件里。继续这样改下去，每个新 goal 都会复制一份相似的 panel/card 样式，后期维护会越来越慢。

### 原因

1. shadcn/ui 提供的是可组合 primitives，不会自动形成“平行宇宙小说”的业务语言。
2. 如果只在页面里堆 Tailwind class，视觉短期能对齐，但无法形成可复用设计资产。
3. 页面契约、registry 和检查脚本如果不跟着更新，组件抽取会变成文档和代码脱节。

### 修复原则

1. 重复出现两次以上的业务卡片必须沉到 `components/design-system`，而不是继续留在页面文件。
2. primitives 保持通用；小说业务含义进入 patterns，例如 `StudioTrendOpsPanel`、`CapabilityMapPanel`、`PlanCard`。
3. 新 pattern 必须同步进入 `registry.ts`、`page-contracts.ts`、shadcn registry JSON 和 `check:design-system`。
4. 公共页和 Studio 的边界不靠口头约定，靠 pattern 名称、page contract 和脚本共同维护。

### 本轮落地

- 新增 `StudioTrendOpsPanel`，承载趋势刷新、扫描合同和周/月刷新按钮。
- 新增 `CapabilityMapPanel`，承载内部入口与服务对应关系。
- `/studio` 改为组合这两个 pattern，移除页面级趋势卡和能力卡实现。
- `PlanCard` 增加可点击、loading、disabled、test id 和 badge 支持，`/settings` 会员方案改用 `PlanCard`。
- `registry.ts`、`page-contracts.ts`、`parallel-universe-ui.registry.json`、`check:design-system` 全部同步更新。

## 2026-06-12 公共用户路径要按真实旅程验收

### 现象

单页检查都通过时，跨页面旅程仍可能有偏差：书城没有明确使用热门题材索引；首页出现章节名会被误判成阅读界面；创作页和会员页也需要验证真实交互，而不是只看静态渲染。

### 原因

1. 小说产品的商业路径不是单个页面，而是发现 -> 书城 -> 阅读 -> 创作 -> 会员的连续旅程。
2. 首页可以显示书籍和更新，但不能出现正文阅读纸张；判断标准应是是否存在阅读器 DOM，而不是是否出现章节名。
3. 书城如果不接同一套趋势数据，会和首页/创作页的推荐逻辑分叉。
4. 浏览器 QA 必须覆盖交互：阅读选择、创作生成、会员开通请求。

### 修复原则

1. 公共路径验收同时覆盖桌面 1440x900 和移动 390x844。
2. 首页检查 `manuscript-paper` / `reader-paper-frame`，确保不是阅读页复用。
3. 书城分类和排序读取 `marketTrends`，与首页和创作页共享趋势合同。
4. 创作页必须输入真实故事种子验证，不只看空状态。
5. 会员页必须点击开通请求验证，不只看 PlanCard 渲染。

### 本轮落地

- `/library` 新增 `marketApi.getTrends('weekly')`，筛选项来自 `marketTrends.top_categories`。
- `/library` 作品排序使用 `orderTemplatesByMarketTrends`，筛选时同时匹配趋势 label/category。
- `/library` 文案改为“热门题材索引专区”，和首页、创作页统一。
- 浏览器 QA：五条公共路径在 1440x900 与 390x844 都无横向溢出、无内部禁词。
- 交互 QA：阅读选择有分支反馈；创作页输入故事种子后有开场、追问和故事笔记；会员页三档 PlanCard 和开通请求正常。

## 2026-06-12 前后端合同要有总闸

### 现象

前端和后端都在快速补能力，单独看某个页面或某个接口都可能是绿的，但仍然会出现两类浪费：前端有入口但服务没有接上，或者后端已有能力但没有进入产品路径。

### 原因

1. 旧对齐脚本只检查 API client 路径是否存在于 OpenAPI，没有声明“哪些产品合同必须存在”。
2. `reader/continue` 这类兼容路径不一定直接由页面调用，但仍必须被 smoke 覆盖。
3. Studio-only 能力如果误入公共页，会污染读者体验；公共能力如果只留在 Studio，又会变成后端孤岛。

### 修复原则

1. 每个产品能力至少要同时具备：OpenAPI path、API client、capabilityAlignments、产品入口或 smoke/Studio 证明。
2. 公开页入口和 Studio-only 能力必须分层检查：质量评价、确认发布、趋势扫描只能在 Studio 或 smoke 中出现。
3. 二期能力必须保留 `unsupportedFeature` 边界，不能被写成已上线。
4. 新后端能力交付时，后端团队需要同时给出 OpenAPI、窄测、smoke 样例和前端入口建议。

### 本轮落地

- `check-capability-alignment.mjs` 新增 13 个 required product contracts。
- 覆盖 reader library/session/continue/snapshot/advance、creator dialogue、market trends/scan、subscription/checkout、quality/canon。
- `reader/continue` 被标记为 smoke 覆盖路径，避免前端为了过检查重复调用。
- 检查 public nav 不允许出现 Studio/settings/billing 后台 id，普通用户导航必须保留发现、阅读、书城、创作、会员。
- 检查 Studio-only 调用不能出现在 Home/Library/Story/Create/Account。
- 检查二期/不可用能力继续保留 `unsupportedFeature` 边界。

## 2026-06-12 交接资产必须和真实产品状态同步

### 现象

概念图、浏览器截图、后端备注和交接包经常在不同时间生成。如果只更新其中一个，团队会拿到互相矛盾的材料：概念图像产品、文档像接口说明、压缩包又是旧页面。

### 原因

1. 概念图是方向约束，不是当前实现证据。
2. 后端备注需要写给工程团队，不能进入公共页面或设计图。
3. 浏览器 QA 截图必须来自当前运行产品，否则无法说明现状。
4. 压缩包必须包含 manifest、截图、设计系统、产品文档和关键脚本，不能只打源码或只打图片。

### 修复原则

1. 每次交接前先刷新真实产品截图，再写文档，再封包。
2. 概念图只放 `artifacts/design-assets`，并在文档中说明它是参考，不是页面内容。
3. 后端实现备注只写进 markdown，禁止污染 public route 和 concept board。
4. 交接包必须带 manifest、checksum、QA 截图和验证脚本路径。

### 本轮落地

- 新增 P8 截图证据目录：`artifacts/visual-qa/p8-handoff-20260612T224737Z`。
- 覆盖 `/`、`/library`、`/story`、`/create`、`/settings`、`/studio` 的桌面截图，和关键公共页移动截图。
- `qa-screenshot-manifest.json` 记录每张截图的 viewport、URL 和横向溢出状态。
- P8 交接包包含 handoff、design-system、product docs、关键 scripts、前端合同源码摘要、QA 截图和 concept references。
- 主交接文档记录 P8 截图目录、概念图边界和压缩包位置。

## 2026-06-12 /create 必须像对话助手，而不是状态流水账

### 现象

创作页已经接上真实对话合同，但视觉上仍容易滑回“顶部口号 + 状态卡 + 右侧说明 + 底部输入框”的流水账结构。移动端尤其明显：示例按钮和说明文案会把真正的输入动作挤到首屏之外。

### 原因

1. 小说创作入口的第一价值是“把一句想法写成第一幕”，不是展示模板、字段或能力解释。
2. 用户需要类似 Codex 的自然语言协作感：先说想法，系统给出文本，再用少量追问帮助他决策。
3. “思维链”不能直接展示，只能产品化为安全的创作脉络：故事钩子、人物缺口、场景压力、世界规则和风格基调。
4. 移动端不能把示例和说明当成和输入同等重要的内容。

### 修复原则

1. `/create` 首屏优先保证一句话输入框和开始按钮可见。
2. 空状态只保留自然语言引导；不要先让用户整理设定表。
3. 创作脉络和故事笔记是沉淀结果，桌面可放右侧，移动端自然下滚。
4. 不显示 `system prompt`、原始思维链、后端、接口、来源平台、绑定或底盘等内部词。
5. 移动端可收起示例建议，保住核心动作。

### 本轮落地

- `/create` 标题字号和顶部信息密度下调，962px 宽度下输入框和示例都进入首屏。
- `CreatorReasoningMap` 从主对话区移到侧栏，页面主轴回到自然语言创作。
- UI 展示词从“创作推演”改为“创作脉络”，避免用户误解为模型内部推理。
- 移动端隐藏示例建议和重复说明，390x844 下输入框与“开始创作”按钮都在首屏内。
- 浏览器 QA：962x883、390x844、1440x900 均无横向溢出，且无 `起点 / 番茄 / 绑定 / 底盘 / system prompt / 思维链 / 后端 / 接口 / PRD` 等禁词。
- 真实输入故事种子后，生成 522 字开场、2 个追问和故事笔记，继续使用当前 creator dialogue 合同。

## 2026-06-12 热门题材索引必须是一套产品入口

### 现象

首页、书城和创作页都在展示热门题材，但如果各自手写分类或点击后不带筛选状态，用户会感觉三个入口互相独立。更糟的是，为了解释推荐来源而把来源平台、绑定关系或底盘说明写到页面上，会再次让产品变成研究报告。

### 原因

1. 热门题材索引是用户找书和创作的产品入口，不是数据来源说明。
2. 题材点击必须能带着状态进入书城，否则只是装饰按钮。
3. 创作页的灵感方向必须和首页、书城使用同一套趋势排序，否则用户从书城进入创作会换味道。
4. 你给的冻结式主宇宙方案当前正文落在六大主模板；前端不能为了凑十个分类而新增后端没有支撑的假模板。

### 修复原则

1. 首页、书城、创作页统一读取 `marketApi.getTrends('weekly')`，失败时才使用 `marketTrendFallback`。
2. 首页题材点击进入 `/library?topic=...`，书城读取 URL topic 并激活筛选。
3. 作品卡进入阅读；“用这个方向创作”进入 `/create?template=...` 并继承对应灵感方向。
4. Public copy 只说热门题材索引、灵感方向、作品推荐；禁止 `起点 / 番茄 / 绑定 / 底盘` 等研究或工程词。

### 本轮落地

- 首页顶部题材和热门题材索引行都带 `topic` 进入书城筛选。
- `/library` 读取 URL topic，筛选栏、作品列表和创作入口共享同一套趋势合同。
- `/create?template=rain-bridge` 能继承“都市谜案”和对应写作气质。
- 浏览器 QA：首页点击“都市谜案”进入 `/library?topic=都市谜案`，书城激活“都市谜案”并展示《雨夜桥边》。
- 移动端 QA：`/`、`/library?topic=玄幻悬疑`、`/create?template=frontier-edict` 均无横向溢出且无内部禁词。

## 2026-06-12 重复列表控件要下沉为 shadcn-compatible pattern

### 现象

首页和书城都各自手写了题材筛选条和榜单行。它们视觉上相似、行为也相似，但一旦分散在页面文件里，后续很容易出现：首页跳转带 topic，书城筛选不读 topic；首页榜单样式变了，书城榜单还是旧样式。

### 原因

1. shadcn/ui primitives 只解决按钮、卡片、输入框等基础层，不会自动生成“平行宇宙小说”的题材索引和榜单语言。
2. 页面级 Tailwind 写得越多，越容易复制出局部一致、系统不一致的 UI。
3. 抽象必须服务维护成本，不能为了抽象而大迁移。

### 修复原则

1. 出现于两个以上 public route、并承担同一交互语义的 UI，优先下沉到 `components/design-system`。
2. 新 pattern 必须同步 registry、page contracts、shadcn registry JSON 和 `check:design-system`。
3. 页面只传数据和路由意图，pattern 负责统一结构、类名和可访问性。
4. 不做整站重写；每轮只抽 1-3 个高收益 pattern。

### 本轮落地

- 新增 `TopicFilterBar`，首页和书城共用热门题材筛选条。
- 新增 `RankedWorldList`，首页和书城共用榜单行。
- `Home.tsx` 和 `Library.tsx` 移除重复题材条和榜单行 JSX。
- `registry.ts`、`page-contracts.ts`、`parallel-universe-ui.registry.json`、`check-design-system-boundary.mjs` 全部同步更新。
- `SHADCN_UI_DESIGN_SYSTEM_PLAN.md` 的迁移顺序新增列表 pattern 下沉步骤。

## 2026-06-12 后端团队交付包必须先判定边界，再接能力

### 现象

后端团队交付包同时包含 FastAPI 后端和一套 `apps/web` Next.js 前端。如果直接把整个包当成“后端已完成”接收，很容易把第二套前端、旧导航、旧页面文案和不同路由模型带进当前产品，造成重复开发和体验倒退。

### 原因

1. 当前产品前端已经确定为 `app` 下的 Vite + React + TypeScript，并且已经围绕 shadcn-compatible patterns、公共文案边界和浏览器 QA 建立了检查。
2. 后端包里的 `apps/web` 是另一套技术栈和产品路径，无法自动继承当前首页、阅读、创作、会员和书城的设计约束。
3. 后端包的 API 是 root-level route；当前产品入口使用 `/v1` 合同，必须通过兼容层接线。
4. 子 agent 审批因额度失败时，不能默认放行；必须默认禁止并入第二套前端。

### 修复原则

1. 后端交付包先解到 `artifacts/backend-team-inspection/`，只读审查，不覆盖源码。
2. 任何 `apps/web`、页面、导航、样式和 public copy 默认禁止并入，除非后续子 agent 明确审批通过。
3. 只抽取后端能力、类型合同、worker、测试和非 UI 业务逻辑。
4. 后端团队应对齐当前 `/v1` 产品合同，而不是要求当前前端改接内部 route。
5. 审查结论必须写进 `docs/backend/`，而不是停留在聊天记录。

### 本轮落地

- 新增 `docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md`。
- 明确 `apps/web` Next.js 前端未获审批，禁止并入当前 Vite/React 产品线。
- 明确 FastAPI、Alembic、agent、worker、shared contract 和测试资产可作为后端接线参考。
- 明确 `/v1` 产品合同与后端团队 root-level route 的映射、冲突和缺口。
- P13 开始前，必须先跑当前前端和合同检查，证明产品线未被第二套前端污染。

## 2026-06-13 P19 发布候选必须同时验证 API smoke、CORS 和已部署前端版本

### 现象

`https://pun-api-p0.vercel.app` 的 API smoke 可以通过，稳定前端域名也能打开，但线上 `/settings` 只显示“开通请求已创建”，没有 P18 新增的 `完成开通`。同时，新随机 Vercel preview 域如果不在 API CORS allowlist 里，服务端 smoke 仍会绿，真实浏览器却会被预检挡住。

### 原因

1. API smoke 是服务端到服务端验证，不能证明浏览器 CORS 和前端 bundle 都正确。
2. Vercel preview URL 会随项目和部署变化，固定 `NARRATIVEOS_ALLOWED_ORIGINS` 不适合每一次 preview。
3. 稳定域名可能仍指向旧部署，不能因为 API 绿就默认它包含最新 UI。
4. 当前 workspace 根目录不是 Git 仓库，RC 证据必须用部署链接、manifest、脚本输出和浏览器 QA 固化。

### 修复原则

1. P19 以后，发布候选必须包含一对 frontend/API preview URL，而不是只给一个静态页面。
2. API 部署需要同时支持固定 origin 和 `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`。
3. Vercel preview 的浏览器 QA 必须打开已部署 URL，而不是本地 dev server。
4. 会员/支付类验收必须实际点完 `开通这个方案 -> 完成开通`，并确认权益数字刷新。
5. 旧稳定站可以作为 rollback，但不能自动作为最新 RC。

### 本轮落地

- `backend/src/narrativeos/api/app_factory.py` 增加 `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`。
- `backend/tests/test_cors_config.py` 覆盖固定 origin 和 Vercel preview regex。
- `scripts/package-vercel-backend-api.sh` 与 `scripts/package-backend-api-deploy.sh` 加入 CORS 测试和 regex env 说明。
- 新增 `docs/product/P19_PRODUCTION_DEPLOYMENT_SMOKE_RC_FREEZE_20260613.md`。
- 新增 `artifacts/deploy/parallel-universe-p19-rc-20260613T140145Z.json`。
- P19 RC frontend: `https://app-i7x25dxxi-james-projects-97742675.vercel.app`。
- P19 RC API: `https://pun-api-p19.vercel.app`。

### 后续开发规则

1. 每次部署 preview 前先跑本地 RC gate，再跑远端 API smoke。
2. 每次部署 preview 后至少做一个真实浏览器路径：打开 public route、确认无 console error、完成一个需要 API 的动作。
3. 如果要推广到生产域名，先确认 alias 指向最新 frontend deployment，并确认 API CORS 包含生产域名。
4. 生产支付、账号和持久化未完成前，文档必须写清楚“RC preview”而不是“production ready”。

## 2026-06-13 P20 账号快照必须先于跨设备承诺

### 现象

会员页已经能开通和刷新权益，但阅读进度、创作草稿和当前浏览器档案还分散在不同链路里。如果直接在页面上说“已完成跨设备同步”，会把还没有生产化的登录、持久化和合并流程伪装成已完成能力。

### 原因

1. 会员权益、阅读进度、创作对话和未来作品草稿属于同一个用户恢复问题，但它们的数据来源不同。
2. 公共页面只能展示“可继续做什么”，不能展示 provider、webhook、event id、冲突日志或修复动作。
3. `/settings` 是公共会员入口，不是运营诊断台。
4. 跨设备恢复不能伪装完成；未登录用户只能说当前浏览器档案可用，登录后再合并。

### 修复原则

1. 先定义 `/v1/account/snapshot`，再扩展跨设备恢复 UX。
2. P20 账号快照统一返回 membership、reader_progress、creator_drafts、local_fallback、conflicts 和 resume_action。
3. 公共 Account 页面只展示阅读档案、创作草稿、会员权益和跨设备恢复状态。
4. Studio/Ops 才能请求 diagnostics、查看冲突和执行修复。
5. 不新增第二套前端，不并入后端团队 `apps/web`，仍以当前 Vite + React + TypeScript 为唯一产品前端。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_snapshot.py`。
- 新增 `GET /v1/account/snapshot`。
- `/settings` 增加阅读档案、创作草稿和跨设备恢复卡片。
- `scripts/smoke-deployed-api.sh` 串联同一账号的阅读、创作、会员和账号快照。
- `check:alignment`、`check:design-system` 和 `check:backend-bridge` 都把 P20 账号快照纳入门禁。

## 2026-06-13 P21 生产支付硬化必须把公共状态和 provider 回调分开

### 现象

P18/P20 阶段为了验证会员闭环，公共 `/settings` 页面可以触发“完成开通”，前端 `settingsApi.completeCheckout` 直接调用 `/reader/checkout/webhook`。这虽然便于本地演示，但会把浏览器伪装成支付提供方，和生产支付的安全边界相冲突。

### 原因

1. 浏览器只能发起开通、跳转/返回、检查状态，不能生成 provider lifecycle event。
2. webhook、provider_event_id、idempotency_key、replay 和 reconcile 属于后端或 Studio/Ops 的诊断与修复语言。
3. 公共会员页如果显示或触发这些概念，会把用户体验变成后台排障台。
4. 预览环境需要可跑通，但预览完成也必须由服务端受控 return 合同完成，而不是前端手写 provider 事件。

### 修复原则

1. 公共前端只调用 `/v1/reader/checkout/start`、`/v1/reader/checkout/{checkout_session_id}/status` 和 `/v1/reader/checkout/return`。
2. provider callback 单独走 `/v1/reader/checkout/provider-callback`，必须 HMAC 验签。
3. 公共 status/return 响应必须去掉 provider、provider_ref、provider_event_id、idempotency_key 和 raw lifecycle event。
4. `check:alignment` 必须禁止 `app/src/api/settings.ts` 调用 `/reader/checkout/webhook`。
5. 真实商户凭证、退款、争议、对账和 replay 只能进入 Studio/Ops 或后端文档。

### 本轮落地

- `BillingService` 增加 public checkout status、server-side return handling 和 callback signature verification。
- 新增 `GET /v1/reader/checkout/{checkout_session_id}/status`。
- 新增 `POST /v1/reader/checkout/return`。
- 新增 `POST /v1/reader/checkout/provider-callback`。
- `/settings` 按钮改为“检查开通状态”，不再说浏览器能直接完成真实支付。
- `settingsApi.completeCheckout` 改走 return 合同，不再调用 webhook。
- 新增 `tests/test_payment_provider_hardening.py`。
- `smoke-deployed-api.sh` 改为 start -> status -> return -> subscription -> account snapshot。

## 2026-06-13 P22 账号合并必须把本机档案和登录账号分开确认

### 现象

P20 已经能展示账号快照，P21 已经把支付完成从浏览器中剥离出来，但 `/settings` 仍然主要依赖固定的 `web_reader_demo` 和 `web_creator`。如果在这个阶段直接说“跨设备恢复已完成”，会把本机浏览器档案误说成生产账号能力。

### 原因

1. 阅读进度属于 reader session，创作草稿属于 creator dialogue session，支付权益属于 account membership；三者不是同一个 owner 字段。
2. 登录身份存在 actor id 和 account id 的区别：阅读归 account id，创作草稿归 actor id。
3. 普通用户只需要知道“发现本机档案”和“合并到账号”，不应该看到数据库归属、冲突日志或修复动作。
4. 合并必须先 preview，再 confirm；不能在登录瞬间悄悄迁移数据。

### 修复原则

1. `/v1/account/merge/preview` 只返回 public-safe 的数量、冲突提示和建议动作。
2. `/v1/account/merge/confirm` 必须要求 bearer token，并把 reader session 迁到 signed-in account id。
3. 创作草稿迁到 signed-in actor id，避免 actor/account 分离时草稿无法恢复。
4. 支付权益保留在 signed-in account，不被本机档案覆盖。
5. `/settings` 只显示登录、创建账号、发现本机档案、合并到账号、继续阅读和继续创作。
6. Studio/Ops 才能承接未来的 merge audit、device inventory、privacy export/delete 和 account deletion。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_merge.py`。
- 新增 `POST /v1/account/merge/preview`。
- 新增 `POST /v1/account/merge/confirm`。
- `repositories.py` 增加 `reassign_reader_sessions`。
- `CreatorDialogueService` 增加 `reassign_sessions`。
- `app/src/main.tsx` 接入 `AuthProvider`。
- `/settings` 增加登录/注册、合并预览、合并确认和合并后快照刷新。
- `check:alignment` 和 `smoke-deployed-api.sh` 纳入账号合并合同。
- 新增 `docs/backend/P22_PRODUCTION_ACCOUNT_MERGE_PERSISTENCE_20260613.md`。

## 2026-06-13 P23 账号数据治理必须先做用户可理解的导出和删除

### 现象

P22 已经能把本机档案合并到登录账号，但上线前还缺少最基本的数据治理入口：用户能否拿走自己的数据、能否删除账号、删除时阅读进度和创作草稿如何处理、登录会话如何退出。如果这一步只写在后端文档里，公共 `/settings` 仍然会像一个只能开会员和合并档案的页面。

### 原因

1. 账号数据治理不是后台功能，它必须有用户能理解的入口。
2. 导出账号数据不能泄漏密码哈希、token hash、provider payload 或迁移诊断。
3. 删除账号必须先预览影响，再显式确认，不能在一个按钮里直接清空。
4. 阅读进度、创作草稿、会员记录和登录会话有不同处理方式：前两者可以删除，会员记录需要作为账务记录保留并标记关闭。
5. 退款、争议、合规留存和安全审计不是普通用户页面要展示的内容。

### 修复原则

1. `/v1/account/data/export` 只返回当前登录账号的数据包，且必须 public-safe。
2. `/v1/account/delete/preview` 返回阅读、创作、会员和登录状态的影响数量。
3. `/v1/account/delete/confirm` 必须要求确认文本 `删除账号`。
4. 删除确认后要撤销登录会话，关闭 auth identity，删除 reader sessions 和 creator dialogue sessions。
5. 订阅记录不能硬删，先标记 `account_closure_pending`，后续退款/争议由支付合规目标处理。
6. `/settings` 只展示“导出我的数据”“删除账号”“账号已删除”等用户语言，不展示数据库、provider、token 或修复日志。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_data.py`。
- 新增 `GET /v1/account/data/export`。
- 新增 `POST /v1/account/delete/preview`。
- 新增 `POST /v1/account/delete/confirm`。
- `repositories.py` 增加 reader session 删除、auth token 撤销、auth identity 关闭和订阅关闭标记。
- `CreatorDialogueService` 增加 `delete_sessions`。
- `/settings` 增加“账号与数据”区域。
- `AuthContext` 增加 `clearLocalSession`，删除账号后留在页面展示结果。
- `check:alignment` 和 `smoke-deployed-api.sh` 纳入账号导出和删除合同。
- 新增 `docs/backend/P23_ACCOUNT_DATA_GOVERNANCE_SECURITY_20260613.md`。

## 2026-06-13 P24 上线验收不能只看页面能打开

### 现象

P19 已经发过 RC 预览，P20-P23 又陆续补上登录账号、支付硬化、账号合并、数据导出和删除。如果 P24 仍然只看某个预览链接能打开，就会遗漏真正上线前最危险的部分：生产数据库、回滚、CORS、支付回调、隐私删除、账号会话撤销和公共页面文案边界。

### 原因

1. 上线验收是前端、后端、合同、部署包、smoke、浏览器 QA 和风险签收的组合，不是单项 build。
2. 当前唯一产品前端仍然是 Vite + React + TypeScript 的 `app`，任何外部前端都不能绕过子 agent 审批直接并入。
3. `/settings` 已经承载账号、会员、合并、导出和删除，所以必须纳入浏览器 QA。
4. 真实生产发布必须有持久数据库、备份恢复、支付争议/退款、隐私合规和安全审计，不能用本地 SQLite 或 preview 包伪装完成。

### 修复原则

1. P24 launch readiness 必须一次跑完前端边界、后端目标测试、OpenAPI 合同和 API smoke。
2. 前端预览包的验收路由必须包含 `/settings`，不只看 `/`、`/story`、`/create`。
3. 后端 Vercel 包的必备接口清单必须覆盖 P20-P23 的 auth、account snapshot、merge、data export 和 delete。
4. 浏览器 QA 要覆盖 `/`、`/library`、`/story`、`/create`、`/settings`、`/studio`，公开页面禁止出现后端/PRD/平台来源/绑定/provider/webhook/OpenAPI 等内部词。
5. 生产 blocker / production blocker 要写进交接文档：数据库迁移、备份恢复、支付退款争议、隐私法律、安全审计、域名 CORS 和回滚演练。

### 本轮落地

- 新增 `scripts/check-launch-readiness.sh`。
- `package-vercel-preview.sh` 的 route 清单加入 `/settings`。
- `package-vercel-backend-api.sh` 的 tests 和 required API 清单加入 P22/P23 账号合并与数据治理能力。
- 新增 `docs/product/P24_DEPLOYMENT_LAUNCH_ACCEPTANCE_20260613.md`。
- 生成 P24 launch manifest：`artifacts/integration/launch-readiness-20260613T202710Z.json`。
- 生成 P24 前端包和后端包：`parallel-universe-vercel-preview-20260613T201820Z.*`、`parallel-universe-vercel-backend-api-20260613T201820Z.*`。
- 浏览器 QA 证据：`artifacts/visual-qa/p24-launch-routes-mqcszrli/`。

## 2026-06-13 P25 部署执行必须把 preview、RC 和 production 分清

### 现象

P24 已经能本地验收和打包，但如果 P25 只是把包推到 Vercel 并回一个链接，就会把“可访问 preview”误说成“正式上线”。更危险的是，Vercel API 项目可能显示 target 为 production，但实际数据库仍是 `/tmp` sqlite preview 数据库；如果文档不写清楚，八小时后验收会把部署成功、数据持久化、回滚可执行这三件事混在一起。

### 原因

1. 部署不是 UI 质量问题，而是产品工程边界问题：链接、API smoke、CORS、浏览器 QA、备份、恢复 dry-run 和生产 blocker 都要同时存在。
2. 当前唯一产品前端仍然是 Vite + React + TypeScript 的 `app`；P25 不能趁部署阶段并入任何外部前端。
3. Vercel preview 链接可以证明远端可访问，但不能证明持久数据库、支付回调、隐私合规和安全审计已经完成。
4. 回滚演练必须至少包含前端 alias / env 回退命令、API 回退目标、数据库恢复前置条件和 recovery drill 证据。

### 修复原则

1. 每次真实部署都必须先跑 `scripts/smoke-deployed-api.sh https://<api-host>`，再跑远端浏览器 QA。
2. CORS 要用真实前端 preview origin 做 `OPTIONS` 预检，确认 `access-control-allow-origin` 精确命中当前前端域名。
3. API 项目显示 production target 时，必须在产品文档里说明这是 preview / RC 项目别名，不等于 public paid production launch。
4. sqlite under `/tmp` 只能作为 preview 数据库；生产上线前必须换成持久数据库并完成 migration apply、runtime backup、restore dry-run 和 recovery drill。
5. P25 完成后才允许进入 P26；P26 的目标必须是 public production release gate，而不是继续优化页面。

### 本轮落地

- 新增 `docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md`。
- 远端前端 preview：`https://app-638zzda7k-james-projects-97742675.vercel.app`。
- 远端 API preview / RC：`https://pun-api-p25.vercel.app`。
- 远端浏览器 QA 证据：`artifacts/visual-qa/p25-remote-routes-mqda04cd/`。
- 远端部署执行证据：`artifacts/integration/p25-deployment-execution/`。
- CORS 预检证据：`cors-preflight.txt`。
- runtime backup、restore dry-run、recovery drill 和 migration dry-run 均已落盘。
- P25 结论：preview / staging deployment rehearsal 完成；public paid production launch 仍需 P26 清掉 persistent database、custom-domain CORS、real payment provider、privacy/legal、security audit 和 production rollback blockers。

## 2026-06-13 P26 生产发布门禁必须允许明确 blocked

### 现象

P25 的预览部署已经可访问，容易让团队顺势说“可以上线”。但 P26 审计发现：Vercel scope 下没有自定义域名，`app` 与 `pun-api-p25` 项目没有持久 env，API 仍依赖部署命令注入 sqlite `/tmp` 数据库，支付仍是 `web_stub`。如果门禁脚本只追求绿灯，就会把真实生产资源缺口遮住。

### 原因

1. 生产发布门禁不是普通构建检查；它必须能输出 blocked，而且 blocked 也可以是正确结果。
2. 预览 smoke 只能证明产品链路能跑，不能证明生产数据库、支付、域名、法律和安全已经就绪。
3. 生产资源很多在仓库外：域名、Vercel env、数据库、支付商户、隐私/legal 和安全审计，不能由前端代码假装完成。
4. 生产 alias 切换是外部副作用，必须等产品负责人明确批准，不能由自动 loop 自行执行。

### 修复原则

1. 新增 `scripts/check-production-release-gate.mjs`，检查 P26 文档、资源审计 artifact、handoff、P13 和前端 Vercel 安全头。
2. P26 audit 的正确结论当前是 `decision: blocked`，并且 `can_promote_public_paid_production` 必须是 `false`。
3. `app/vercel.json` 先补静态安全头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。
4. P26 不能执行 production alias promotion；只能给出可复跑命令和明确批准条件。
5. 下一轮 P27 必须在两条路中选：生产资源已提供则做 provisioning；资源仍缺则打包 blocked launch handoff。

### 本轮落地

- 新增 `docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md`。
- 新增 `artifacts/integration/p26-production-resource-audit.json`。
- 新增 `scripts/check-production-release-gate.mjs`。
- `app/package.json` 增加 `check:production-gate`。
- `app/vercel.json` 增加前端静态安全头。
- P26 结论：public paid production launch blocked；preview / staging testing 可以继续。

## 2026-06-13 P27 blocked launch handoff 也必须可验证

### 现象

P26 明确 public paid production launch 是 `blocked` 后，团队仍然需要可交接成果。如果只把 P25/P26 文档散落在仓库里，后端、运营、产品负责人会不知道该看哪份证据、谁补什么资源、哪些命令可以跑、哪些命令不能跑。更危险的是，blocked 很容易在口头沟通里被误读成“预览已经上线，所以差不多可以生产发布”。

### 原因

1. 交接包也是 release artifact，必须能被脚本验证，而不是靠聊天记录说明。
2. blocked 是当前正确结论，不是失败；正确产物应该让团队知道 preview / staging 可继续，public paid production 不能自动推进。
3. 生产资源缺口分布在 product owner、backend、ops、payment、legal/privacy、security 多个责任人，必须在 manifest 里按 owner 拆清楚。
4. 外部前端和密钥最容易在打包时误混进来，必须用 package gate 检查。

### 修复原则

1. 新增 `scripts/check-blocked-launch-handoff.mjs`，检查 P27 文档、operator runbook、manifest、包目录、tar.gz、sha256、禁入路径和密钥样式。
2. `app/package.json` 增加 `check:blocked-launch`，让 P27 包和 P26 production gate 一样能被 npm 脚本复跑。
3. P27 manifest 必须保留 `public_paid_production_launch: blocked`，并列出 `npm --prefix app run check:blocked-launch`。
4. 单一可传输交付物必须包含 P25/P26/P27 文档、P25 远端 QA 证据、P26 resource audit、关键 scripts 和 README；禁止包含 `node_modules`、`dist`、`.env`、`.vercel`、`.venv`、`apps/web` 或真实密钥。
5. P28 只能在两条路里选：生产资源已经提供则做 provisioning；资源仍缺则组织 blocked launch review 和 owner assignment。

### 本轮落地

- 新增 `docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md`。
- 新增 `docs/product/P27_OPERATOR_RUNBOOK_20260613.md`。
- 新增 `artifacts/integration/p27-blocked-launch-package-manifest.json`。
- 新增 `scripts/check-blocked-launch-handoff.mjs`。
- 交接包路径：`artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz`。
- 校验和路径：`artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz.sha256`。
- P27 结论：可交接 blocked launch 包；public paid production launch 仍为 blocked；preview / staging testing 可以继续。

## 2026-06-13 P28 blocked launch review 要把阻塞项转成 owner card

### 现象

P27 已经能把 blocked launch 包交给团队，但如果没有 owner board，交接很容易停在“大家都知道还缺资源”的状态。八小时验收真正需要的是谁负责、补什么、交什么证据、跑什么命令、什么时候重新决策。

### 原因

1. 生产 blocker 不是一个工程 bug，而是一组跨产品、后端、运营、支付、legal/privacy、安全和回滚负责人的外部资源承诺。
2. 自主 loop 不能代替产品负责人执行 alias promotion、不能代替支付负责人提供真实商户、不能代替 legal/security 签字。
3. 没有 intake schema 时，团队容易把真实密钥、外部前端或未验收的 production claims 写进仓库。

### 修复原则

1. 新增 `docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`，每个 blocker 都有 owner card、required input、验证命令、acceptance artifact、release impact 和 fallback。
2. 新增 `artifacts/integration/p28-production-resource-intake.schema.json`，作为 production resource intake；只记录 owner、presence 和 artifact path，不记录真实 secret 值。
3. 新增 `docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`，把 go/no-go、会前材料、不能自动运行的命令和 P29 分支写清楚。
4. 新增 `scripts/check-launch-review-intake.mjs` 和 `check:launch-review`，防止 P28 文档把 blocked 说成 ready、把 preview 说成 production、或批准第二套前端。

### 本轮落地

- 新增 P28 owner board：`docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`。
- 新增 P28 launch review brief：`docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`。
- 新增 P28 intake schema：`artifacts/integration/p28-production-resource-intake.schema.json`。
- 新增 P28 gate：`scripts/check-launch-review-intake.mjs`。
- `app/package.json` 增加 `check:launch-review`。
- P28 结论：下一阶段必须由 owner 提供生产资源和验收材料；在此之前 public paid production launch 继续 blocked。

## 2026-06-13 P29 blocked launch governance dashboard 要成为验收状态源

### 现象

P28 已经把 blocker 拆成 owner card，但八小时后验收还需要一个统一状态源：哪些证据已经存在、哪些 owner 仍 blocked、下一次复审看什么。如果没有 evidence ledger，验收会重新回到翻聊天记录和散落文档。

### 原因

1. Owner card 适合分配责任，evidence ledger 适合持续追踪状态和证据。
2. blocked launch 的下一步通常不是继续写代码，而是治理节奏：daily active update、weekly waiting update、owner escalation。
3. 状态账本必须继续防止三件事：把 preview 说成 production、把 blocked 改成 ready、把外部前端或真实密钥写进仓库。

### 修复原则

1. 新增 `docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`，展示每个 area 的 status、owner、current evidence、missing input、next action。
2. 新增 `artifacts/integration/p29-blocked-launch-evidence-ledger.json`，机器可读记录 P25/P26/P27/P28 证据、owner、status、review cadence 和 P30 分支。
3. 新增 `scripts/check-blocked-launch-governance.mjs` 和 `check:governance`，验证 ledger 引用文件存在、状态仍 blocked、无 secret、无外部前端批准。
4. P30 只有两条路：所有 ledger entry accepted 则 production provisioning execution；否则 owner escalation and governance maintenance。

### 本轮落地

- 新增 P29 dashboard：`docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`。
- 新增 P29 evidence ledger：`artifacts/integration/p29-blocked-launch-evidence-ledger.json`。
- 新增 P29 gate：`scripts/check-blocked-launch-governance.mjs`。
- `app/package.json` 增加 `check:governance`。
- P29 结论：八小时验收以 P29 dashboard + ledger 为 blocked launch 状态源；public paid production launch 仍 blocked。

## 2026-06-13 P30 owner escalation 要把 blocked 状态转成可催办动作

### 现象

P29 ledger 可以证明哪些 area 仍 blocked，但如果 owner 没有下一步动作、SLA 和升级话术，治理状态会停在“知道问题”而不是“推动解决”。八小时 loop 需要在没有新生产资源的情况下继续产出可执行交付，而不是重复做前端。

### 原因

1. 没有生产资源时，最有效的工程产物是 owner escalation matrix，而不是继续改 UI。
2. 每个 blocker 都必须有 required artifact、blocked release impact、escalation message 和 due cadence。
3. escalation 仍然不能把 blocked 改成 ready，不能批准 `apps/web`，不能写入真实 secret。

### 修复原则

1. 新增 `docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`，输出 owner messages、SLA、升级触发和治理维护协议。
2. 新增 `artifacts/integration/p30-owner-escalation-matrix.json`，机器可读映射 P29 ledger area 到 owner、severity、required artifact、release impact 和 escalation message。
3. 新增 `scripts/check-owner-escalation.mjs` 和 `check:escalation`，验证 P30 matrix 与 P29 ledger/P28 owner board 对齐。
4. P31 只有两条路：所有 owner artifact 到齐则 production provisioning execution；否则 production owner escalation review。

### 本轮落地

- 新增 P30 escalation 文档：`docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`。
- 新增 P30 escalation matrix：`artifacts/integration/p30-owner-escalation-matrix.json`。
- 新增 P30 gate：`scripts/check-owner-escalation.mjs`。
- `app/package.json` 增加 `check:escalation`。
- P30 结论：当前仍需 owner 补齐生产资源与审批；public paid production launch 继续 blocked。

## 2026-06-13 P31 acceptance artifact template pack 要降低 owner 补材料摩擦

### 现象

P30 escalation matrix 已经指出每个 owner 要补哪个 artifact，但如果没有模板，owner 仍然会用不同格式提交材料，甚至可能把真实 secret、终端输出或外部前端决策混进仓库。

### 原因

1. 验收 artifact 需要统一字段和默认状态，才能被后续 gate 自动判断。
2. 模板必须默认 `pending`，不能被误读为已批准。
3. 模板只能记录 secret presence 和 verification output path，不能记录真实凭据值。

### 修复原则

1. 新增 `docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md` 作为 owner 填写入口。
2. 新增 `artifacts/integration/p31-acceptance-templates/` 下 7 个 template，对应 P30 matrix 的 7 个 required artifact。
3. 新增 `scripts/check-acceptance-templates.mjs` 和 `check:templates`，验证模板齐全、默认 pending、release blocked、无 secret、无外部前端批准。
4. Owner 完成模板后另存为 P28/P30 指定的正式 artifact，再由 P32 intake validator 验收。

### 本轮落地

- 新增 P31 template index：`docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md`。
- 新增 P31 模板目录：`artifacts/integration/p31-acceptance-templates/`。
- 新增 P31 gate：`scripts/check-acceptance-templates.mjs`。
- `app/package.json` 增加 `check:templates`。
- P31 结论：owner 已有统一补材料入口；public paid production launch 继续 blocked。

## 2026-06-13 P32 acceptance artifact intake validator 要把缺材料视为 blocked 状态而不是脚本失败

### 现象

P31 生成模板后，owner 可能暂时还没有提交正式 artifact。missing artifacts are not a script failure。如果 gate 把“缺 artifact”当成失败，会让八小时验收看起来像工程坏了；如果把缺 artifact 当成通过，又会误导生产已经 ready。

### 原因

1. 缺 artifact 是治理状态，不是代码错误。
2. validator 必须能区分 `missing/not_submitted/blocked` 与 `submitted/accepted`。
3. 一旦 artifact 存在，就必须严格校验字段、owner、approval timestamp、verification output path、无 secret、无外部前端批准。

### 修复原则

1. 新增 `docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`，说明接收/拒收规则。
2. 新增 `artifacts/integration/p32-acceptance-artifact-intake-status.json`，列出七个 expected artifact 的当前 missing 状态。
3. 新增 `scripts/check-acceptance-intake.mjs` 和 `check:intake`，缺 artifact 时允许 pass 但必须保持 blocked；提交后执行严格校验。
4. P33 只有两条路：有 artifact 提交则做 completed artifact acceptance runner；仍全缺则做 external owner follow-up log。

### 本轮落地

- 新增 P32 intake doc：`docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`。
- 新增 P32 status：`artifacts/integration/p32-acceptance-artifact-intake-status.json`。
- 新增 P32 gate：`scripts/check-acceptance-intake.mjs`。
- `app/package.json` 增加 `check:intake`。
- P32 结论：当前七个 official acceptance artifacts 均 missing，因此 public paid production launch 继续 blocked。

## 2026-06-13 P33 external owner follow-up log 要记录等待状态而不编造联系人

### 现象

P32 已经说明七个 official artifact 都 missing。下一步需要记录谁仍在等待、下次何时复审、如果超期如何升级。但不能为了让文档看起来完整而编造 owner 联系人、日期或 private message。

### 原因

1. follow-up log 是外部 owner 协调状态，不是生产批准。
2. 等待 owner 时应使用 placeholder，直到产品负责人提供真实联系人。
3. `waiting_on_owner` 必须继续对应 `ledger_impact: blocked`。

### 修复原则

1. 新增 `docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`，记录每个 owner 的 required artifact、follow-up status、next review placeholder、blocked impact。
2. 新增 `artifacts/integration/p33-external-owner-follow-up-ledger.json`，机器可读记录 contact placeholder、next review placeholder、required artifact 和 blocked impact。
3. 新增 `scripts/check-owner-follow-up.mjs` 和 `check:follow-up`，验证 follow-up ledger 引用 P32 intake 和 P31 templates，且所有缺失项保持 `waiting_on_owner` 与 blocked。
4. P34 只有两条路：owner 提交 artifact 则 owner response intake；仍无响应则 blocked launch waiting-state checkpoint。

### 本轮落地

- 新增 P33 follow-up doc：`docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`。
- 新增 P33 follow-up ledger：`artifacts/integration/p33-external-owner-follow-up-ledger.json`。
- 新增 P33 gate：`scripts/check-owner-follow-up.mjs`。
- `app/package.json` 增加 `check:follow-up`。
- P33 结论：所有 owner 仍 waiting_on_owner；public paid production launch 继续 blocked。
