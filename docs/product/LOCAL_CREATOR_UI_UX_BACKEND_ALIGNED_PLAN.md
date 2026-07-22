# Local Creator UI/UX Backend-Aligned Build Plan

> **Historical reference boundary:** This is a pre-Pivot UI plan retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`
Scope: Creator UI only; public Reader changes are limited to visibility checks.
Last reviewed against current code: 2026-06-28.

## Executive Handoff

This document is the detailed engineering execution plan for the next Creator
implementation pass. For a shorter product-owner checklist that is easier to
edit manually before implementation, use
`docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md`.

The current backend/data layer is already sufficient for a real P0 author workbench:
identity, author allowlist, works, branches, chapters, reader requests, vote
counts, publish events, local client status, feature flags, and local draft
references are all represented in the current frontend data wrapper.

The remaining product problem is not missing backend capacity. It is UI/UX
alignment:

1. Creator must stop looking like a Reader concept surface.
2. Creator must stop explaining implementation details.
3. Creator must map every visible action to a current data wrapper or an
   explicitly local-only capability.
4. Creator must make the author workflow obvious: request -> draft -> destination
   -> publish check -> public update.

Manual editing rule: change the decision tables in this document first. After
that, implementation should update the UI and gates to match the document. Do
not add a Creator feature only because it looks useful if it is absent from the
capability matrix below.

## Current Authoritative Backend/UI Sources

| Source | Role In This Plan |
| --- | --- |
| `app/src/lib/pmfSupabase.ts` | Single frontend data wrapper for Reader/Creator PMF flows. Creator UI should call these helpers instead of embedding table logic. |
| `app/src/features/pmf/types.ts` | Product-facing data contracts for works, branches, chapters, requests, publish events, creator clients, feature flags, and local drafts. |
| `docs/data-contracts/creator-data-map.md` | Page-to-data mapping. This is the shortest contract reviewers should check first. |
| `docs/data-contracts/request-status-machine.md` | Request status transitions and P0 limits around similar requests. |
| `docs/data-contracts/publish-flow.md` | Publish Check requirements and failure recovery copy. |
| `docs/data-contracts/draft-storage-boundary.md` | Local-only draft boundary and cloud publish boundary. |
| `scripts/check-creator-ui-contract.ts` | Static Creator UI contract gate. |
| `scripts/check-creator-author-flow-contract.ts` | Static gate proving signed-in author flow is wired to real wrappers. |

## Current Gate Snapshot

Latest local check on this branch:

| Command | Status | Meaning |
| --- | --- | --- |
| `npm run test:creator` | Passed | Creator lint, banned-copy scan, token scan, no-production-mock-data guard, Creator UI contract, author flow contract, and Reader/Creator copy boundary passed. |
| `npm run build:creator` | Passed | Local Creator bundle builds. Vite still reports the existing >500 kB chunk warning. |

These gates prove the current implementation has a usable structural baseline.
They do not prove the visual experience is good enough. Browser route screenshots
and manual product review are still required before merging any UI pass.

## 0. Design Brief

目标不是继续打磨概念视觉，而是重新把创作端定义成一个真实作者工作台：

- 面向作者，不面向读者。
- 运行在作者电脑 localhost，不是公网创作后台。
- 以读者请求为任务源，以本地私有初稿为创作中间态，以人工确认发布为唯一公开出口。
- UI 必须映照当前已存在的数据能力，不能出现前端入口有功能、数据层没能力承接的情况。
- 页面不出现工程解释、调试词、数据库词、服务商词、内部状态词。

手动完善区：

| Question | Default | Your Decision |
| --- | --- | --- |
| Creator 产品名 | 本地创作端 | |
| 内测作者画像 | 单作者或小团队作者，愿意在本机处理读者请求 | |
| 首批作品数量 | 1-3 部 | |
| 首批作者一天可处理请求数量 | 3 条优先请求 | |
| 允许读者请求类型 | 下一章 / IF 支线 / 继续支线 | |
| 需要隐藏或延后的作者功能 | 真实云端创作、复杂协作、付费墙、复杂推荐 | |
| “同类请求”是否显示为可操作按钮 | P0 只切换临时同类视图，不做永久合并 | |
| 发布时最低正文长度 | 300 字提醒，不硬阻断 | |
| 未关联读者请求是否允许发布 | 允许，但发布检查提示影响较弱 | |

## 0.1 Current Repository Reality

当前仓库已经具备 Creator P0 的基础，不需要重开前端项目：

| Area | Current Evidence | Decision |
| --- | --- | --- |
| Framework | Vite + React + TypeScript, `dev:creator`, `build:creator` | 继续复用 |
| UI primitives | `app/src/components/ui/*` includes Button, Card, Dialog, Sheet, Select, Tabs, ScrollArea, Tooltip, Textarea | 用 shadcn/Radix 组合，不手写交互 primitives |
| Creator components | `CreatorShell`, `CreatorTaskCard`, `CreatorStatePanel`, `CreatorActionBar` | 优先复用，不够再补 `components/creator` |
| Creator routes | `/creator/login`, `/creator`, `/creator/requests`, `/creator/editor`, `/creator/works`, `/creator/publish`, `/creator/settings` | 保持 6 个一级入口 |
| Data access | `app/src/lib/pmfSupabase.ts` wraps identity, works, branches, chapters, requests, feature flags, publish events | UI 只接 wrapper，不直写表逻辑 |
| Local drafts | local storage wrapper with cloud `local_draft_ref` only | 正文草稿只在本机 |
| Copy gates | `check:ui-copy`, `check:creator-ui-contract` | 每阶段必跑 |
| Visual boundary gates | `check:design-tokens`, `check:no-mock-data` | 防 Reader 视觉和 demo 数据回流 |

当前 `npm run test:creator` 已覆盖 Creator lint、禁词、设计 token、假数据和 Creator 合同扫描。它不能替代浏览器视觉验收。

## 0.1.1 Current UI Gap Summary

The current Creator surface has the right routes and most of the right data
connections, but the next implementation pass should treat these as open product
gaps until visual QA proves otherwise:

| Gap | Why It Matters | Required Direction |
| --- | --- | --- |
| Signed-out pages can still feel like capability demos | Authors should see a locked real workbench, not a sales explanation | Use route-specific locked previews with disabled real controls and no demo language. |
| Creator and Reader can still feel visually related | The author app is local operations, not public reading | Remove Reader image language, strengthen dark workbench layout, use Creator tokens only. |
| Some actions are structurally present but not visually prioritized | Authors need to know what to do first | Today must lead with three priority tasks, not dashboard metrics. |
| Similar request handling can be misunderstood as merge | No durable merge fields exist in P0 | Label as temporary "同类请求" view only; do not show permanent merge success. |
| Publish proof can feel like a form | Publishing is the public boundary | Make Publish Check read like a final checklist with outcome preview and failure recovery. |
| Settings can drift into implementation language | User explicitly banned engineering copy | Use "本地创作服务", "凭据", "服务来源", "作品记录", "发布记录". |

## 0.2 Backend Capability To UI Matrix

UI 只能展示已经有承接能力的功能。下表是当前可用能力的产品翻译：

| Product Capability | Data / Wrapper | UI Surface | P0 Status |
| --- | --- | --- | --- |
| 作者登录 | `getPmfSession`, `sendCreatorMagicLink`, `signOutPmf` | `/creator/login` | Must support |
| 作者准入 | `getCreatorAuthorizationStatus`, `creator_authorizations` | Login gate, top status, editor/publish guard | Must support |
| 本机状态 | `syncCreatorClient`, `creator_clients` | Today right rail, Settings health | Must support |
| 作品列表 | `listCreatorWorks`, `works` | Today, Works, Editor, Publish | Must support |
| 作品公告 | `updateCreatorWorkNotice` | Works | Supported now |
| 隐藏作品 | `updateCreatorWorkStatus` | Works danger action | Supported now |
| 支线列表 | `listCreatorBranches`, `branches` | Works tree, Editor destination, Publish destination | Must support |
| 新建 IF 支线 | `createCreatorIfBranch` | Works and Publish flow | Supported now |
| 归档支线 | `updateCreatorBranchStatus` | Works danger action | Supported now |
| 章节列表 | `listCreatorChapters`, `chapters` | Works tree, Editor context, Publish anchor | Must support |
| 读者请求队列 | `listCreatorRequests`, `reader_requests` | Today, Requests, Editor, Publish | Must support |
| 请求状态推进 | `updateReaderRequestStatus` | Requests, Editor, Publish result | Must support |
| 请求热度 | `request_votes` through request count / vote fields | Requests sorting and grouping | Must support if field exists; otherwise show neutral order |
| 发布章节 | `publishChapter` | Publish Check | Must support |
| 发布记录 | `listCreatorPublishEvents`, `publish_events` | Today, Publish success, future history | Must support |
| 功能开关 | `listCreatorFeatureFlags`, `feature_flags` | Settings and gated empty states | Must support |
| 本地显示偏好 | `readCreatorDisplayPreferences`, `writeCreatorDisplayPreferences` | Settings, CSS data attrs | Must support |

Do not add a visible action unless this matrix has a matching current wrapper or the action is explicitly marked local-only.

### Capability Freeze For Next UI Pass

The next pass may improve layout, hierarchy, copy, states, and component
composition for the rows above. It must not add these as visible product
features unless the data wrapper and acceptance docs are updated first:

- durable request merge;
- multi-author collaboration;
- hosted writing runtime;
- public Creator dashboard;
- paid access controls;
- automatic publication;
- cloud-stored draft prose;
- full analytics dashboard.

## 0.3 Manual Product Decisions Before Next Implementation Pass

请手动补齐这组问题；不补也可以执行默认值，但这些会影响文案和优先级：

| Decision | Default If Blank | Your Decision |
| --- | --- | --- |
| Creator 产品名 | 本地创作端 | |
| 作者身份称谓 | 作者 | |
| 首批请求类型 | 下一章 / IF 支线 / 继续支线 | |
| 请求每日处理建议 | 3 条 | |
| 请求优先级规则 | 处理中 > 已看到 > 热度 > 时间 | |
| 同类请求产品叫法 | 同类请求 / 同类视图 | |
| 最小可发布正文字数 | 300 字提醒，非硬阻断 | |
| 是否允许无请求发布 | 允许，但显示提醒 | |
| 是否允许从 Works 新建 IF 支线 | 允许 | |
| 是否允许隐藏作品 | 允许，需确认 | |
| 是否允许归档支线 | 允许，需确认 | |
| 本地创作服务 P0 | 只保存状态，不要求真实生成闭环 | |
| 液态玻璃强度 | 低到中，只用于控制层 | |
| 动效强度 | 轻微，尊重减少动态效果 | |
| 绝对不要的视觉元素 | 行星大图 / 星云 / 粒子 / Reader 概念残影 | |

## 0.4 Implementation Milestone Contract

The implementation sequence remains M0 -> M8. A milestone is not done because
the page renders; it is done only when the matching data capability, visual
boundary, copy boundary, states, and checks are all satisfied.

| Milestone | Goal | Files Usually Touched | Exit Gate |
| --- | --- | --- | --- |
| M0 | Specs and guardrails | `docs/product/*`, `docs/data-contracts/*`, `docs/harness/*`, scan scripts | `npm run test:creator` |
| M1 | Creator shell and design-system baseline | `components/creator/*`, `components/ui/*`, tokens, app CSS | `npm run test:creator`, `npm run build:creator`, route screenshots |
| M2 | 今日 | `LocalCreatorApp.tsx` Today sections and shared cards | Today shows three real author priorities from requests/drafts/publish/work state. |
| M3 | 读者请求 | Requests page, filters, detail peek, status actions | Requests map to real request data and legal status transitions. |
| M4 | 写作台 | Editor page and local draft helpers | Draft prose saves locally and publish handoff preserves local draft reference. |
| M5 | 作品与支线 | Works page, branch tree, author notice, danger actions | Works -> branches -> chapters is inspectable and editable within current wrappers. |
| M6 | 发布检查 | Publish page, gates, confirmation, success/failure states | Publish writes public records only after confirmation and preserves local prose on failure. |
| M7 | 创作设置 | Settings page, local service state, preferences | Credentials are summarized, never revealed; motion/transparency preferences apply. |
| M8 | QA and regression | browser route QA, screenshots, docs evidence | `test:creator`, `build:creator`, route QA, manual visual review. |

## 1. Current Backend Capability Snapshot

当前 P0 数据层已经能支撑一个最小可用的本地创作端。UI 只能使用以下真实能力，不新增假入口。

| Capability | Existing Data / Function | UI Meaning |
| --- | --- | --- |
| 作者身份 | `profiles`, `creator_authorizations` | 作者必须是非匿名、被允许的账号 |
| 本机端状态 | `creator_clients` | 显示本机创作端在线、最近读取、版本 |
| 作品管理 | `works` | 作者可查看和管理自己作品、公告和隐藏状态 |
| 主线 / IF 支线 | `branches` | 主线也是 branch，IF 也是 branch |
| 已发布正文 | `chapters` | 所有公开正文都进入章节表 |
| 读者请求 | `reader_requests` | 下一章、IF 支线、继续支线 |
| 请求热度 | `request_votes`, `reader_requests.vote_count` | 请求排序、热度判断、同类视图 |
| 发布记录 | `publish_events` | 从请求到章节发布的可追溯记录 |
| 开关 | `feature_flags` | 阅读请求、创作端、云端创作能力开关 |
| 私有初稿 | localStorage / future local cache | 正文草稿只在本机保存 |

明确不具备或 P0 不做：

- 不做云端创作任务。
- 不保存作者模型凭据。
- 不保存未发布草稿正文到云端。
- 不做真实复杂协同编辑。
- 不做自动发布。
- 不做完整收费系统。
- 不做复杂推荐系统。

## 2. Product Boundary

### 2.1 Reader Web

读者端只做：

- 读作品。
- 看章节。
- 看 IF 支线。
- 请求下一章 / IF 支线 / 继续支线。
- 投票。
- 查看请求状态和已发布更新。

读者端不能出现：

- 发布按钮。
- 私有初稿。
- 本地创作服务设置。
- 作者凭据状态。
- 作者处理面板。
- 任何 Creator 入口，除非登录作者并且是 localhost。

### 2.2 Local Creator App

创作端只做：

- 登录作者身份。
- 看今日任务。
- 处理读者请求。
- 写本地私有初稿。
- 选择作品、主线、IF 支线、父章节。
- 发布前检查。
- 人工确认发布。
- 查看作品结构和发布记录。
- 管理本机创作偏好。

创作端不能伪装：

- 不能说云端会替作者写作。
- 不能说平台保存了创作过程。
- 不能展示工程实现说明。
- 不能把“本机端读取新请求”说成后台同步机制。

## 3. Information Architecture

创作端保留 6 个一级入口，顺序固定：

1. 今日
2. 读者请求
3. 写作台
4. 作品与支线
5. 发布检查
6. 创作设置

导航原则：

- 左侧固定窄导航，像专业工具，不像读者端书城。
- 顶部只显示当前页面标题、作者身份、本机状态、刷新按钮。
- 每页主操作固定在右上或底部 action bar，不散落。
- 危险动作必须二次确认。

## 4. Visual Direction

创作端不继续使用 Reader 的行星景深、宇宙书城、概念背景。

应该是：

- 暗色、本地工作台、低噪声、密度更高。
- 液态玻璃只用于控制层：导航、任务卡、请求卡、发布检查、右侧状态栏、确认弹窗。
- 长文本编辑区必须安静：纯净纸面或深色编辑器，不加玻璃折射，不放大背景图。
- 色彩来自 Creator semantic tokens，不在业务组件里写死颜色。
- 动效表达状态，不做炫技：请求卡 hover、状态推进、发布检查步骤、保存反馈。

手动完善区：

- 创作端关键词：
- 不要出现的视觉元素：
- 可接受的动效强度：
- 是否保留液态玻璃：

## 5. Copy Boundary

产品 UI 禁止出现：

- Supabase
- RLS
- trace
- provider
- fallback
- API key
- 后端
- 接口
- 同步
- 回写
- 数据库
- AI
- 模型
- LLM

替代语言：

| Forbidden | Product Copy |
| --- | --- |
| AI / 模型 / LLM | 本地创作服务 |
| API key | 凭据 |
| provider | 服务来源 |
| 后端 / 数据库 | 作品记录 / 发布记录 |
| 接口 / 回写 / 同步 | 保存 / 发布 / 刷新 / 读取新请求 |
| trace | 发布记录 |
| fallback | 暂时不可用 |

文案语气：

- 今日页：决策型，告诉作者今天先做什么。
- 请求页：队列型，帮助作者筛选和判断。
- 写作台：安静，不打扰正文。
- 发布检查：严谨，明确后果。
- 设置页：本地优先，安全边界清晰。

## 6. Page Plans

### 6.1 Login / Author Gate

Route:

- `/creator/login`

Backend mapping:

- Read auth session.
- Send magic link.
- After login, create/update `profiles(role='creator')`.
- Check `creator_authorizations`.
- Create/update `creator_clients`.

UI purpose:

- 解释这是作者本机创作端。
- 登录后才能处理请求、保存发布状态、管理作品。
- 如果未被允许，显示“当前账号尚未开通作者工作台”，不要暴露策略细节。

Required sections:

- 左侧：产品承诺，读者请求到发布的三步闭环。
- 右侧：登录卡片。
- 底部：本机边界说明。

States:

- 未登录。
- 邮件已发送。
- 已登录但未允许。
- 已登录且允许。
- 本机环境检查失败。

Primary CTA:

- 发送登录链接。

Do not show:

- 数据层名称。
- 权限策略。
- service key / publishable key。
- “匿名用户 / authenticated role”等工程概念。

### 6.2 Today

Route:

- `/creator`

Backend mapping:

- `reader_requests`
- `works`
- `branches`
- `chapters`
- `publish_events`
- local drafts
- `creator_clients`

UI purpose:

- 作者打开创作端后，3 秒内知道今天最该处理什么。

Required layout:

- Top: author status and last refresh.
- Main: “今天最该处理的 3 件事”.
- Secondary: request / draft / publish / work structure metrics.
- Right rail: 本机状态、最近作品、最近发布、写作边界。

Core cards:

1. 最该写的一条
   - Source: highest priority request.
   - Action: 开始写.
2. 正在写的一条
   - Source: newest local draft.
   - Action: 继续写.
3. 需要确认发布
   - Source: local draft passing readiness.
   - Action: 检查发布.

Acceptance:

- No empty generic dashboard.
- Every card either maps to real data or a clear empty state.
- Cannot show demo placeholder story text.

### 6.3 Reader Requests

Route:

- `/creator/requests`

Backend mapping:

- Read `reader_requests`.
- Read `works`.
- Read `branches`.
- Update request status.
- Visual-only grouping by normalized request text until merge columns exist.

UI purpose:

- 把读者需求变成作者可处理的任务队列。

Required layout:

- Left rail: saved views and filters.
- Middle: request queue cards.
- Right rail: selected request detail and actions.

Saved views:

- 全部请求
- 需要处理
- 高热请求
- 正在处理
- 支线请求
- 已结束

Filters:

- 作品
- 请求类型
- 状态
- 排序：热度 / 最新 / 状态

Request card fields:

- 作品名
- 主线 / IF 支线
- 请求类型
- 请求正文
- 热度
- 状态
- 同类请求数量
- 提交时间

Actions:

- 稍后：`pending -> acknowledged`
- 开始写：`pending/acknowledged -> in_progress`, then open writing desk.
- 不处理：`pending/acknowledged/in_progress -> rejected`, confirmation required.
- 同类视图：P0 visual only, no permanent merge.
- 读者视角：open configured reader URL if available.

Acceptance:

- Published/rejected cannot directly return to in progress.
- 同类请求 cannot imply permanent merge unless backend has merge column.
- No table-only UI; this should feel like a task queue.

### 6.4 Writing Desk

Route:

- `/creator/editor`

Backend mapping:

- Read `reader_requests`.
- Read `works`.
- Read `branches`.
- Read `chapters`.
- Read `creator_authorizations`.
- Write local private draft only.
- No cloud write until publish check.

UI purpose:

- 作者在这里写正文，左边保留上下文，中间只写，右边选择发布去向。

Required layout:

- Three columns on desktop:
  - Left: request context.
  - Center: quiet editor.
  - Right: destination and readiness.
- Mobile/tablet:
  - Context and destination collapse into sheets.

Left column:

- 当前请求。
- 所属作品。
- 所属支线。
- 请求热度。
- 最近已发布章节摘要。
- 状态推进。

Center editor:

- Chapter title input.
- Prose editor.
- Local save status.
- Save private draft.
- Enter publish check.

Right column:

- Work selector.
- Main / IF branch selector.
- Existing branch selector.
- New IF branch title.
- Parent chapter anchor.
- Linked request.
- Draft readiness checklist.

Local draft fields:

- localDraftRef
- requestId
- workId
- branchId
- title
- content
- updatedAt

Do not do in M4:

- Do not publish directly from editor as the main path.
- Do not upload draft prose before publish.
- Do not use placeholder prose like “这里写入正文”.
- Do not show Reader background art.

Acceptance:

- Editor is visually calm and not glass-heavy.
- Author can save a local draft without cloud write.
- Author can move a draft into publish check.
- Work/branch/chapter selectors use real records.

### 6.5 Works And Branches

Route:

- `/creator/works`

Backend mapping:

- Read `works`.
- Read `branches`.
- Read `chapters`.
- Read `reader_requests` grouped by work/branch.
- Update `works.author_notice`.
- Hide work through supported work status update.
- Create IF branch through supported branch creation.
- Archive branch through supported branch status update.

UI purpose:

- 作者管理作品结构，而不是看说明卡。

Required layout:

- Left: work list.
- Middle: selected work structure tree.
- Right: author notice and branch health.

Work list fields:

- Title.
- Status.
- Branch count.
- Published chapter count.
- Open request count.
- Last updated.

Structure tree:

- Main branch.
- IF branches.
- Chapters under each branch.
- Parent anchor when available.

Actions:

- Open work.
- Open branch.
- Open latest chapter.
- Start draft for branch.
- Edit author notice.
- Create IF branch with parent line and optional anchor chapter.
- Hide work after confirmation.
- Archive branch after confirmation.

Acceptance:

- No “等待作品记录” as final UI once real records exist.
- Works page must show actual works.
- Branch terminology consistent with Reader.
- Structure actions have loading, success/error, disabled and confirmation states.

### 6.6 Publish Check

Route:

- `/creator/publish`

Backend mapping:

- Read local drafts.
- Read `works`, `branches`, `chapters`, selected `reader_requests`.
- On explicit confirmation:
  - upsert branch if needed.
  - insert chapter.
  - insert publish event.
  - update linked request to published.

UI purpose:

- Prevent accidental publication and make the public impact visible.

Required layout:

- Left: draft picker.
- Center: publish checklist and preview.
- Right: public destination and impact.

Checklist:

- Work selected.
- Branch selected.
- Parent chapter selected for IF branch when needed.
- Linked request visible.
- Title not empty.
- Body not empty and above minimum length.
- Reader-facing location clear.
- Author understands publication is public.

Warning checks:

- No linked request.
- Very short body.
- Very long title.
- Branch summary missing.
- Publishing new IF branch without parent chapter.

Confirmation:

- Confirmation dialog required.
- Dialog copy should say what will become public.
- Failure copy: “发布未完成，正文仍在草稿箱。”

Acceptance:

- No direct publish without checklist.
- Successful publish creates chapter and publish record.
- Linked request becomes published.
- Reader can see published content.

### 6.7 Creator Settings / Health

Route:

- `/creator/settings`

Backend mapping:

- Read/write local settings.
- Read/write `creator_clients`.
- Read `feature_flags`.
- Read `creator_authorizations`.

UI purpose:

- Let author configure local creation preferences and verify local app readiness.

Required sections:

1. 本机状态
   - Online state.
   - Last refresh.
   - Version.
   - Current author.
2. 写作方式
   - Handwrite / external tool paste.
   - Local creation service.
   - Author-owned compatible service.
3. 凭据状态
   - Show configured / not configured.
   - Do not store or display credential value.
4. Display preferences
   - Reduce motion.
   - Reduce transparency.
5. Danger zone
   - Clear local settings.
   - Clear local drafts, if added.

Acceptance:

- No sensitive value shown.
- No cloud-generation implication.
- Clear settings requires confirmation.
- Settings page does not feel like developer config.

## 7. Component System

Use shadcn/Radix primitives through project components.

Required Creator components:

- `CreatorShell`
- `CreatorTopbar`
- `CreatorNav`
- `CreatorPageHeader`
- `CreatorTaskCard`
- `CreatorRequestCard`
- `CreatorRequestDetail`
- `CreatorDraftEditor`
- `CreatorDestinationPanel`
- `CreatorPublishChecklist`
- `CreatorWorkTree`
- `CreatorStatePanel`
- `CreatorActionBar`
- `ConfirmActionDialog`
- `LocalStatusPill`

shadcn/Radix primitives to use:

- Button
- Card
- Badge
- Alert
- Dialog
- Sheet
- Select
- Tabs only when tabs are truly needed
- ScrollArea
- Tooltip
- Separator
- Checkbox
- Input
- Textarea

Do not:

- Build custom select/dropdown with divs.
- Put cards inside cards unless it is a repeated item inside a framed list.
- Use liquid glass for editor body.
- Mix Reader tokens in Creator pages.

## 8. State And Interaction Rules

Request state machine:

```text
已收到 -> 已看到 -> 处理中 -> 已发布
                 \-> 暂不处理
```

Rules:

- Published cannot go back to in progress.
- Rejected cannot publish without a future reopen flow.
- Merge is visual only in P0.
- Drafted/editing/abandoned are local-only states.

Danger actions requiring confirmation:

- Publish.
- Reject request.
- Merge/aggregate if persistent merge is later added.
- Hide branch.
- Archive branch.
- Clear settings.
- Clear local drafts.

Empty states:

- Must tell the author what happens next.
- Must not show demo content.
- Must not be the primary final UI for pages with real data.

Loading states:

- Use skeleton or state panel.
- Do not show placeholder product copy that looks like data.

Error states:

- Say what the author can do next.
- Translate technical errors before rendering.

## 9. Implementation Phases

Current phase status should be updated after each run. Do not claim a phase complete from code presence alone; use gates and browser evidence.

| Milestone | Current Code Evidence | Missing Evidence Before Merge |
| --- | --- | --- |
| M0 | Creator copy/design/mock-data gates exist and pass | Browser screenshot proving no residue |
| M1 | Routes, author gate and local host status exist | Browser proof for unauthenticated, unauthorized and authorized states |
| M2 | Today task cards and readiness logic exist | Browser proof with live or seeded non-demo records |
| M3 | Queue filters, status actions and visual grouping exist | Browser proof for each state transition and terminal-state guard |
| M4 | Editor, local draft, destination and publish handoff exist | Browser proof that draft remains local before publish |
| M5 | Works tree, notice, create/hide/archive actions exist | Browser proof for structure actions and confirmations |
| M6 | Publish checklist and success/failure states exist | End-to-end publish proof tied to request |
| M7 | Settings save/clear/status states exist | Browser proof that credential value is never shown |
| M8 | `test:creator` passes | Full visual QA and current blocker log |

### M0: Stop The Bleeding

Goal:

- Remove demo smell and non-product residue from Creator.

Tasks:

- Remove Reader visual assets from Creator shell.
- Remove concept-dashboard copy.
- Remove placeholder prose in editor.
- Replace all hard-coded Reader color tokens in Creator with Creator tokens.
- Ensure `check:ui-copy` covers all Creator routes.

Acceptance:

- Browser inspection finds no engineering terms and no demo prose.
- Creator visually separates from Reader.

### M1: Author Gate And Local Boundary

Goal:

- Make login and authorization feel like a real product gate.

Tasks:

- Rebuild `/creator/login`.
- Add author authorization status check.
- Add local host check.
- Add “author not enabled” state.
- Add Creator client status write/read.

Acceptance:

- Non-author cannot enter workbench.
- Anonymous reader identity cannot become creator.
- UI copy never explains policies.

### M2: Today Workbench

Goal:

- Replace dashboard with daily author tasks.

Tasks:

- Use real requests, drafts, works, branches, chapters, publish events.
- Show top 3 actions.
- Add right rail status.
- Add visible empty states.

Acceptance:

- Author can click from Today into Requests, Editor, Publish, Works.

### M3: Reader Requests Queue

Goal:

- Make requests a real queue.

Tasks:

- Saved views.
- Filters.
- Heat sorting.
- Request detail peek.
- Status transitions.
- Temporary similar-request view.
- Start writing from request.

Acceptance:

- Request can move to acknowledged/in_progress/rejected.
- Start writing opens editor with context.

### M4: Writing Desk

Goal:

- Make editor usable and backend-aligned.

Tasks:

- Three-column desktop layout.
- Real work/branch/chapter selectors.
- Local draft save.
- Destination readiness.
- Enter publish check instead of direct publish as primary.

Acceptance:

- Draft content stays local until publish confirmation.
- No placeholder content.
- No Reader visual residue.

### M5: Works And Branches

Goal:

- Replace placeholder works page with real structure management.

Tasks:

- Work list.
- Branch tree.
- Chapter list.
- Request counts per branch.
- Author notice read/edit if allowed.
- Create new IF branch only through publish flow unless backend supports draft branch creation.

Acceptance:

- Author can inspect all real works, branches and chapters.

### M6: Publish Check

Goal:

- Make publishing deliberate and traceable.

Tasks:

- Checklist.
- Preview.
- Destination summary.
- Public impact summary.
- Confirmation modal.
- Success/failure result.

Acceptance:

- Publish writes chapter, branch if needed, publish event, request status.
- Failure keeps draft local.

### M7: Creator Settings

Goal:

- Make local creative environment understandable without exposing internals.

Tasks:

- Local creation preferences.
- Credential-state only.
- Display preferences.
- Local app status.
- Clear settings confirmation.

Acceptance:

- No sensitive values in UI.
- No cloud creation implication.

### M8: Browser QA And Gates

Goal:

- Prove the Creator can be used end to end.

Tasks:

- Run copy gate.
- Run design-token gate.
- Run no-mock-data gate.
- Run Creator build.
- Browser inspect login, today, requests, editor, works, publish, settings.
- Capture screenshots before handoff.

Acceptance:

- User can review preview before merge.

## 9.1 Browser QA Script For Manual Review

Use these checkpoints while looking at the local preview:

| Route | What To Inspect | Pass Criteria |
| --- | --- | --- |
| `/creator/login` | Entry language, author gate, local boundary | Looks like a product login, not an engineering setup page |
| `/creator` | Three task cards and right rail | Every card has real data or a clear empty state |
| `/creator/requests` | Saved views, filters, queue, detail peek | Request actions are understandable and state-safe |
| `/creator/editor` | Three columns, quiet editor, destination rail | Long text area is calm; no glass-heavy background |
| `/creator/works` | Work tree, branches, chapters, notice, actions | Structure maps to works -> branches -> chapters |
| `/creator/publish` | Checklist, warnings, confirmation, result | Author knows exactly what becomes public |
| `/creator/settings` | Writing mode, local service, status, display prefs | No credential value or technical implementation copy |

Visual failure examples:

- The Creator screen looks like the Reader page with a different title.
- A primary card explains implementation instead of helping the author act.
- A page has buttons whose corresponding wrapper/data capability is missing.
- The editor surface uses strong glass, moving background, star field, or large visual art.
- Empty states show sample story content that could be mistaken for production data.

## 10. Required Test Commands

Minimum after each phase:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm --prefix app run lint -- --max-warnings=0
npm --prefix app run build:creator
```

Before user review:

```bash
npm --prefix app run build:reader
npm run check:public-reader-bundle-boundary
npm --prefix app run check:copy-boundary
npm --prefix app run check:design-system
npm run check:zero-cost-pmf-loop
npm run smoke:creator-chain
```

If any command fails:

- Record failure.
- Fix if related to current phase.
- If unrelated, document and do not hide it.

## 11. Manual Review Checklist

Use this before execution.

| Area | Product Decision Needed | Decision |
| --- | --- | --- |
| Login | Magic link only or add password later? | |
| Author gate | What should unapproved author see? | |
| Today | What are the exact three priority rules? | |
| Requests | What request types are exposed in P0? | |
| Requests | Should temporary similar-request view be labeled “同类请求” or “同类视图”? | |
| Writing Desk | Minimum publishable length? | |
| Writing Desk | Should direct publish be removed from editor? | |
| Works | Can author edit author notice in P0? | |
| Works | Can author hide/archive branches in P0? | |
| Publish | Required warnings that block vs warn only? | |
| Settings | Which local creation service modes are allowed for the local Creator app? | |
| Visual | How strong should liquid glass be? | |
| Visual | Any reference app or screenshot to match? | |

## 12. Execution Rule For Codex

After this plan is manually edited and approved:

1. Implement only one milestone at a time.
2. Do not merge into `main` before user visual review.
3. Do not introduce new fake backend capabilities.
4. Do not keep placeholder/demo text.
5. Use shadcn/Radix primitives and project Creator components.
6. Run gates after each milestone.
7. Return preview URL and screenshots before asking to merge.
