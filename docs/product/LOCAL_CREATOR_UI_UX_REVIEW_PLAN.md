# Local Creator App UI/UX Review Plan

> **Historical reference boundary:** This is a pre-Pivot UI plan retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`
Scope: Local Creator App only. Reader Web changes are limited to visibility and boundary checks.
Last backend alignment check: 2026-06-28.

## 0. Product Brief

Local Creator App 是作者电脑上运行的 localhost 创作工作台，不是公网 Web 创作后台。

它的核心任务是把读者需求变成可发布内容：

```text
读者请求
-> 作者今日优先级
-> 本机私有初稿
-> 选择作品 / 主线 / IF 支线
-> 发布检查
-> 作者确认发布
-> 阅读端看到更新
```

P0 设计目标：

- 作者打开后 3 秒内知道今天最该处理什么。
- 每个按钮都对应当前已存在的数据能力或明确本地能力。
- 草稿正文在发布确认前只保存在作者本机。
- 发布是唯一公开出口，必须人工确认。
- 页面不出现工程词、调试词、服务商词、数据库词。
- 创作端视觉必须和阅读端干净分离：更像专业本地工作台，不像宇宙阅读概念页。

## 1. Manual Decisions For Product Owner

请先手动完善这一组决策。空白时按 Default 执行。

| Decision | Default | Your Decision |
| --- | --- | --- |
| Creator 产品名 | 本地创作台 | |
| 作者身份称谓 | 作者 | |
| 今日页主目标 | 今天最该处理的 3 件事 | |
| 首批请求类型 | 下一章 / IF 支线 / 继续支线 | |
| 每日建议处理量 | 3 条 | |
| 请求优先级 | 处理中 > 已看到 > 热度 > 时间 | |
| 同类请求产品叫法 | 同类请求 / 同类视图 | |
| 同类请求是否永久合并 | 否，P0 只做临时视图 | |
| 最小发布字数 | 300 字提醒，不硬阻断 | |
| 未关联读者请求是否允许发布 | 允许，但显示弱影响提醒 | |
| 是否允许 Works 页新建 IF 支线 | 允许 | |
| 是否允许隐藏作品 | 允许，需确认 | |
| 是否允许归档支线 | 允许，需确认 | |
| 本地创作服务 P0 | 只保存配置状态，不要求真实生成闭环 | |
| 液态玻璃强度 | 低到中，只用于控制层 | |
| 动效强度 | 轻微，尊重减少动态效果 | |
| 绝对禁止视觉元素 | 行星大图 / 星云 / 粒子 / Reader 概念残影 | |

## 2. Current Backend Reality

当前前端可用数据封装集中在 `app/src/lib/pmfSupabase.ts`，产品数据类型在 `app/src/features/pmf/types.ts`。

### 2.1 Can Build Now

| Product Capability | Data / Wrapper | UI Surface |
| --- | --- | --- |
| 作者登录 | `getPmfSession`, `sendCreatorMagicLink`, `signOutPmf` | `/creator/login`, shell account action |
| 作者准入 | `getCreatorAuthorizationStatus`, `creator_authorizations` | login gate, editor/publish write guard |
| 本机端状态 | `syncCreatorClient`, `creator_clients` | 今日, 创作设置 |
| 作品列表 | `listCreatorWorks`, `works` | 今日, 作品与支线, 写作台, 发布检查 |
| 作品公告 | `updateCreatorWorkNotice` | 作品与支线 |
| 隐藏作品 | `updateCreatorWorkStatus` | 作品与支线 danger action |
| 支线列表 | `listCreatorBranches`, `branches` | 作品树, 写作目的地, 发布目的地 |
| 新建 IF 支线 | `createCreatorIfBranch` | 作品与支线, 发布检查 |
| 归档支线 | `updateCreatorBranchStatus` | 作品与支线 danger action |
| 章节列表 | `listCreatorChapters`, `chapters` | 作品树, 写作上下文, 发布锚点 |
| 读者请求 | `listCreatorRequests`, `reader_requests` | 今日, 读者请求, 写作台, 发布检查 |
| 请求热度 | `vote_count`, `request_votes` | 请求排序, 今日优先级 |
| 请求状态推进 | `updateReaderRequestStatus` | 读者请求, 写作台 |
| 本机私有初稿 | `readLocalDrafts`, `upsertLocalDraft` | 今日, 写作台, 发布检查 |
| 发布章节 | `publishChapter` | 发布检查 |
| 发布记录 | `listCreatorPublishEvents`, `publish_events` | 今日, 发布结果 |
| 功能开关 | `listCreatorFeatureFlags`, `feature_flags` | 创作设置, empty/gated states |
| 显示偏好 | `readCreatorDisplayPreferences`, `writeCreatorDisplayPreferences` | 创作设置 |

### 2.2 Local-Only Capability

这些能力可以做 UI，但不能上传未发布内容：

- 私有初稿正文。
- 初稿标题、正文、目的地、关联请求、更新时间。
- 本地创作服务配置状态。
- 凭据是否已配置。
- 减少动态效果 / 减少透明效果。

### 2.3 Must Not Claim Yet

除非后端新增字段或 RPC，否则 UI 不得宣称这些能力已存在：

- 永久合并重复请求。
- 多作者协作。
- 云端自动写作。
- 托管作者凭据。
- 未发布草稿云端保存。
- 自动发布。
- 真实付费墙。
- 复杂推荐或数据分析后台。

## 3. Information Architecture

固定 6 个一级入口：

1. 今日
2. 读者请求
3. 写作台
4. 作品与支线
5. 发布检查
6. 创作设置

入口设计规则：

- `/creator/login` 是作者准入门，不算一级工作入口。
- 左侧导航固定、紧凑、工具感强。
- 顶部显示当前页面标题、作者身份、本机状态、刷新/退出/设置。
- 主操作固定在页面右上或底部 action bar。
- 重操作必须二次确认。
- 公开 Reader build 不展示 Creator 功能入口。

## 4. Visual Direction

创作端不是 Reader 的深空概念页。它应该是：

- 暗色本地工作台。
- 信息密度更高，但层级清楚。
- 液态玻璃只用于控制层：导航、任务卡、请求卡、右侧状态栏、发布检查、确认弹窗。
- 写作正文区保持安静，不使用玻璃折射、动态背景、大图或粒子。
- 所有颜色使用 Creator semantic tokens，不在业务组件硬写色值。
- 动效只表达状态变化：hover、选中、状态推进、保存成功、发布检查进度。
- 支持 reduced motion 和 reduced transparency。

Forbidden visual residue:

- Reader 行星背景。
- 星云大图。
- 概念图残影。
- 游戏 HUD。
- 类 demo 展示牌。

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

产品替代语：

| Forbidden | Product Copy |
| --- | --- |
| AI / 模型 / LLM | 本地创作服务 |
| API key | 凭据 |
| provider | 服务来源 |
| 后端 / 数据库 | 作品记录 / 发布记录 |
| 接口 / 回写 / 同步 | 保存 / 发布 / 刷新 / 读取新请求 |
| trace | 发布记录 |
| fallback | 暂时不可用 |

## 6. Page-Level UI/UX Plan

### 6.1 Author Login

Route: `/creator/login`

User job:

- 作者确认自己进入的是本机工作台。
- 用邮箱登录。
- 看到自己是否已开通作者工作台。

Backend map:

- `getPmfSession`
- `sendCreatorMagicLink`
- `upsertCreatorProfile`
- `getCreatorAuthorizationStatus`
- `syncCreatorClient`

Layout:

- Left: product promise, request-to-publish loop.
- Right: login card.
- Bottom: local boundary statement in product language.

States:

- Signed out.
- Magic link sent.
- Signed in but not allowlisted.
- Signed in and ready.
- Not running on local surface.
- Work records temporarily unavailable.

Do not show:

- policy details.
- role names like anonymous/authenticated.
- any key or service config term.

Acceptance:

- Looks like a real product gate, not setup docs.
- Non-author cannot enter write-capable routes.
- Copy stays product-facing.

### 6.2 今日

Route: `/creator`

User job:

- 作者 3 秒内知道今天最该做哪三件事。

Backend map:

- `listCreatorRequests`
- `listCreatorWorks`
- `listCreatorBranches`
- `listCreatorChapters`
- `listCreatorPublishEvents`
- `readLocalDrafts`
- `syncCreatorClient`

Layout:

- Top hero: today title plus local state.
- Main: three priority cards.
- Secondary: work/readiness summary.
- Right rail: local status, recent publication, active work.

Three priority cards:

1. 最该写的一条
   - Source: request priority.
   - CTA: 开始写.
2. 正在写的一条
   - Source: newest local draft.
   - CTA: 继续写.
3. 需要确认发布
   - Source: local draft ready for publish check.
   - CTA: 检查发布.

Acceptance:

- No dashboard filler.
- No demo story text.
- Empty state tells the author the next useful step.
- Each card routes to a real page with preserved context.

### 6.3 读者请求

Route: `/creator/requests`

User job:

- 作者从读者请求里挑出值得写的任务。

Backend map:

- `listCreatorRequests`
- `listCreatorWorks`
- `listCreatorBranches`
- `updateReaderRequestStatus`

Layout:

- Left rail: saved views and filters.
- Center: task queue cards.
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

- 作品名.
- 所在线路.
- 请求类型.
- 请求正文.
- 热度.
- 状态.
- 同类请求数量.
- 提交时间.

Actions:

- 标记已看到: `pending -> acknowledged`
- 开始写: `pending/acknowledged -> in_progress`, then open writing desk.
- 暂不处理: `pending/acknowledged/in_progress -> rejected`, confirmation required.
- 查看同类: temporary view filter only.
- 看读者页: open Reader route when available.

Acceptance:

- `published` and `rejected` cannot move directly back to writing.
- Similar request UI never claims permanent merge.
- Queue feels operational, not a table dump.

### 6.4 写作台

Route: `/creator/editor`

User job:

- 作者基于读者请求或自己的想法写私有初稿，并选择发布目的地。

Backend/local map:

- `listCreatorRequests`
- `listCreatorWorks`
- `listCreatorBranches`
- `listCreatorChapters`
- `getCreatorAuthorizationStatus`
- `readLocalDrafts`
- `upsertLocalDraft`

Layout:

- Left: request/context rail.
- Center: quiet editor.
- Right: destination and readiness rail.

Editor:

- Chapter title input.
- Prose editor.
- Local save state.
- Save private draft.
- Enter publish check.

Destination rail:

- Work selector.
- Branch selector.
- Main/IF visual distinction.
- New IF branch title if needed.
- Parent chapter anchor.
- Linked request.
- Readiness checklist.

Do not:

- Publish directly as primary path.
- Upload draft prose before publish.
- Show placeholder prose as if content exists.
- Use Reader image/background language.

Acceptance:

- Draft stays local until Publish Check.
- User can route from request to editor with context.
- User can route from draft to Publish Check with same local draft reference.

### 6.5 作品与支线

Route: `/creator/works`

User job:

- 作者管理作品结构、主线、IF 支线、章节和公告。

Backend map:

- `listCreatorWorks`
- `listCreatorBranches`
- `listCreatorChapters`
- `listCreatorRequests`
- `updateCreatorWorkNotice`
- `updateCreatorWorkStatus`
- `createCreatorIfBranch`
- `updateCreatorBranchStatus`

Layout:

- Left: work list.
- Middle: selected work tree.
- Right: selected line/detail panel.

Work list fields:

- Title.
- Status.
- Branch count.
- Published chapter count.
- Open request count.
- Last update.

Structure tree:

- Main branch.
- IF branches.
- Chapters under each line.
- Parent line and parent chapter when available.

Actions:

- Edit author notice.
- Create IF branch.
- Start draft for selected line.
- Hide work, confirmation required.
- Archive IF branch, confirmation required.

Acceptance:

- Works page shows actual records.
- Branch terminology matches Reader.
- Dangerous actions have loading, error, success, disabled and confirmation states.

### 6.6 发布检查

Route: `/creator/publish`

User job:

- 作者确认这份本机初稿将以什么位置公开给读者。

Backend map:

- `readLocalDrafts`
- `listCreatorWorks`
- `listCreatorBranches`
- `listCreatorChapters`
- `listCreatorRequests`
- `publishChapter`

Layout:

- Left: draft selector.
- Center: checklist and prose preview.
- Right: public destination and impact.

Checklist:

- Author ready.
- Work selected.
- Branch selected.
- Linked request visible.
- Title ready.
- Body ready.
- Reader-facing location clear.
- Publication impact clear.

Warnings:

- No linked request.
- Very short body.
- Long title.
- Missing branch summary.
- New IF branch has no parent anchor.

Confirmation:

- Dialog says what becomes public.
- Confirm button disabled while publishing.
- Failure copy: `发布未完成，正文仍在草稿箱。`

Acceptance:

- No direct publish without checklist.
- Success writes chapter, branch if needed, publish event, and request status.
- Linked request becomes published.

### 6.7 创作设置

Route: `/creator/settings`

User job:

- 作者确认本机创作环境、偏好和可用边界。

Backend/local map:

- `listCreatorFeatureFlags`
- `syncCreatorClient`
- `getCreatorAuthorizationStatus`
- `readLocalAiSettings`
- `writeLocalAiSettings`
- `readCreatorDisplayPreferences`
- `writeCreatorDisplayPreferences`

Sections:

1. 本机状态
   - Online state.
   - Last refresh.
   - Version.
   - Current author.
2. 写作方式
   - Handwrite.
   - External tool paste.
   - Local creation service.
3. 凭据状态
   - Configured / not configured only.
   - Never show credential value.
4. 显示偏好
   - Reduce motion.
   - Reduce transparency.
5. 清理区
   - Clear local settings, confirmation required.
   - Clear local drafts only if implemented.

Acceptance:

- No credential value shown.
- No cloud writing implication.
- Settings page feels like author product settings, not developer config.

## 7. Component Plan

Use existing shadcn/Radix primitives through project components.

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

Use these primitives where appropriate:

- Button
- Card
- Badge
- Alert
- AlertDialog
- Dialog
- Sheet
- Select
- Tabs
- ScrollArea
- Tooltip
- Separator
- Checkbox
- Input
- Textarea

Rules:

- Do not build custom select/dropdown/menu with raw divs.
- Do not put page sections inside nested cards.
- Do not use liquid glass for the prose editor body.
- Do not mix Reader tokens in Creator pages.
- All icon-only controls require accessible labels/tooltips.

## 8. State And Interaction Rules

Request state machine:

```text
已收到 -> 已看到 -> 处理中 -> 已发布
                 \-> 暂不处理
```

Rules:

- `published` cannot go back to `in_progress`.
- `rejected` cannot publish without a future reopen flow.
- `drafted/editing/abandoned` are local-only states.
- Similar request handling is visual-only in P0.

Danger actions requiring confirmation:

- Publish.
- Reject request.
- Hide work.
- Archive branch.
- Clear settings.
- Clear local drafts, if implemented.
- Persistent merge, if backend later adds it.

State coverage required per write-capable surface:

- Loading.
- Empty.
- Error.
- Disabled.
- Success.
- Confirmation for heavy actions.

## 9. Implementation Milestones

| Milestone | Goal | Exit Gate |
| --- | --- | --- |
| M0 | Lock plan, copy boundary, backend capability matrix | `npm run test:creator` |
| M1 | Rebuild Creator shell and locked author gate | `npm run test:creator`, route screenshot |
| M2 | 今日 page as priority workbench | Today routes into Requests, Editor, Publish, Works |
| M3 | Reader Requests as real task queue | Legal status transitions work |
| M4 | Writing Desk with local-only drafts | Draft saved locally and handed to Publish Check |
| M5 | Works and Branches structure manager | Work tree maps to works -> branches -> chapters |
| M6 | Publish Check | Confirmed publish writes public records and request completion |
| M7 | Creator Settings | Local service/preferences work with no sensitive display |
| M8 | Browser QA and handoff | Screenshots, checks, manual review before merge |

## 10. Review Checklist Before Implementation

Product owner should confirm:

- Six primary entries are correct.
- Product names and labels are acceptable.
- Request priority rule is acceptable.
- Similar-request visual-only boundary is acceptable.
- Publish without linked request behavior is acceptable.
- Visual direction forbids Reader concept residue.
- Copy boundary forbids engineering terms.
- Local creation service is only local state in P0.

## 11. Required Commands After Implementation

Minimum local gates:

```bash
npm run test:creator
npm run build:creator
npm run build:reader
npm run check:public-reader-bundle-boundary
```

Browser QA:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Manual visual QA routes:

- `/creator/login`
- `/creator`
- `/creator/requests`
- `/creator/editor`
- `/creator/works`
- `/creator/publish`
- `/creator/settings`

Do not merge the UI pass until the user reviews the preview.
