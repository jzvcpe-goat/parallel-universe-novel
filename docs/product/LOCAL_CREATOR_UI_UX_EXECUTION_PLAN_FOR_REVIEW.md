# Local Creator App UI/UX Execution Plan For Review

> **Historical reference boundary:** This is a pre-Pivot UI plan retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`
Scope: P0 localhost Creator UI only
Date: 2026-06-28

## 1. Product Definition

Local Creator App is the author's localhost workbench. It is not a public web
admin panel and not a cloud generation surface.

The app exists to help an author:

1. see what readers want next;
2. decide which request to handle;
3. write or generate privately on the author's machine;
4. review exactly what will become public;
5. publish a chapter or IF branch by explicit confirmation;
6. keep the public Reader updated through published content and request status.

The UI must feel like a serious author operations desk: calm, capable, local,
and production-grade. It must not look like a demo, a backend console, or a
Reader page with different copy.

## 2. Current Backend Capability Snapshot

Only these existing capabilities may become visible product features.

| Capability | Existing Data / Wrapper | Product Meaning | UI Surface |
| --- | --- | --- | --- |
| Author session | `getPmfSession`, `sendCreatorMagicLink`, `signOutPmf` | author can enter local workbench | Login, all protected routes |
| Author allowlist | `getCreatorAuthorizationStatus`, `creator_authorizations` | signed-in user must be allowed as creator | Login gate, top status, editor/publish guards |
| Local client status | `syncCreatorClient`, `creator_clients` | this computer is active and can process requests | Today, Settings |
| Works | `listCreatorWorks`, `works` | author's books | Today, Works, Editor, Publish |
| Work notice | `updateCreatorWorkNotice` | author-facing update note shown publicly | Works |
| Work status | `updateCreatorWorkStatus` | hide or restore work after confirmation | Works danger action |
| Branches | `listCreatorBranches`, `branches` | main line and IF lines | Works, Editor, Publish |
| Create IF branch | `createCreatorIfBranch` | open a new IF line from a work/chapter | Works, Publish |
| Branch status | `updateCreatorBranchStatus` | archive IF line after confirmation | Works danger action |
| Chapters | `listCreatorChapters`, `chapters` | published prose and reading context | Works, Editor, Publish |
| Reader requests | `listCreatorRequests`, `reader_requests` | reader demand queue | Today, Requests, Editor, Publish |
| Request state | `updateReaderRequestStatus` | acknowledged / in progress / rejected / published | Requests, Editor, Publish |
| Vote heat | `request_votes`, `reader_requests.vote_count` | request priority signal | Today, Requests |
| Publish | `publishOwnPlatformBundle` | confirmed local draft becomes a publish bundle, then public content through the adapter | Publish Check only |
| Publish records | `listCreatorPublishEvents`, `publish_events` | history of what was published from which request | Today, Publish |
| Feature flags | `listCreatorFeatureFlags`, `feature_flags` | product availability and cloud creation disabled state | Settings, gated empty states |
| Local draft cache | local storage / future desktop cache | private author work | Today draft cards, Editor, Publish preview |

No visible feature may be added unless it maps to this table or is marked
local-only. Durable request merge, paid tools, cloud creation, auto publish,
multi-author collaboration, and cloud-stored draft prose are out of P0.

## 3. Non-Negotiable Boundaries

### 3.1 Public Copy Boundary

Do not show these terms in product UI:

- Supabase
- RLS
- trace
- provider
- fallback
- API key
- backend
- interface
- sync
- writeback
- database
- AI
- model
- LLM
- system prompt
- prompt plumbing

Use product language instead:

| Internal Term | Product Copy |
| --- | --- |
| AI / model | Do not expose as Local Workspace setup |
| API key | Do not collect or display |
| provider | Do not expose as an author setting |
| backend / database | 作品记录 / 发布记录 |
| sync | 更新 / 读取最新内容 |
| trace | 发布记录 / 处理记录 |
| interface | 入口 / 操作 |
| fallback | 暂时不可用 / 稍后再试 |

### 3.2 Storage Boundary

Draft prose stays local until explicit publication. Reader Web never sees draft
state. Cloud records may store only public chapters, work/branch state, request
status, publish records, and opaque local draft references.

### 3.3 Action Boundary

Publish, reject, archive branch, hide work, and clear local credentials require
a confirmation dialog. The UI must show loading, success, error, and disabled
states for every action that writes data.

### 3.4 Visual Boundary

Creator must not reuse Reader planet scenes, public reading backgrounds, or
concept art remnants. Liquid glass is allowed only for control layers. The
editor surface and prose body must stay quiet and paper-like.

## 4. Information Architecture

Use exactly six primary entries in P0:

1. 今日
2. 读者请求
3. 写作台
4. 作品与支线
5. 发布检查
6. 创作设置

Do not add new top-level tabs before the backend contract and acceptance docs
are updated.

## 5. Page Plans

### 5.1 `/creator/login` - Author Entry

Goal: make the author understand this is a local workbench and enter with a
valid author identity.

Required sections:

- Product title: local author workbench name.
- Short promise: process reader requests, write privately, publish only after
  confirmation.
- Email magic link form.
- Author allowlist result.
- Local boundary note in product language.

Must not show:

- setup instructions as main content;
- backend table names;
- service keys or technical config;
- Reader-style story cards.

States:

- not signed in;
- magic link sending;
- magic link sent;
- signed in but not allowed;
- signed in and allowed;
- error.

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Product name | 本地创作台 | |
| Login headline | 进入你的本地创作台 | |
| Boundary sentence | 草稿只保存在这台电脑，发布前不会进入阅读端。 | |

### 5.2 `/creator` - Today Dashboard

Goal: one screen tells the author what to do next.

Required layout:

- Left/main: three priority task lanes.
- Right rail: local status, publishing health, recent publish records.

Priority lanes:

1. 今日最值得处理: request cards sorted by status, vote heat, and recency.
2. 正在写: local draft cards.
3. 最近发布: publish events and reader-facing result.

Backend mapping:

- reads `reader_requests`, `works`, `branches`, `chapters`,
  `publish_events`, `creator_clients`, local drafts.

Actions:

- open request detail;
- continue draft;
- go to publish check;
- refresh latest records.

Empty state:

- If no requests: show "暂时没有新请求，可以继续整理作品或写下一章。"
- If no local drafts: show "还没有本机草稿。选择一个请求后开始写。"

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Daily suggested request count | 3 | |
| Priority rule label | 热度、时间和处理状态综合排序 | |

### 5.3 `/creator/requests` - Reader Request Queue

Goal: turn reader demand into a safe, actionable author queue.

Required layout:

- Saved filters at top.
- Queue list in middle.
- Request detail drawer/right panel.

Filters:

- all;
- pending;
- acknowledged;
- in progress;
- high vote;
- IF branch;
- next chapter;
- continue branch.

Request card must show:

- work title;
- line/branch title;
- request type;
- request text;
- vote count;
- public status label;
- created/updated time;
- suggested next action.

Legal state actions:

| Current | Allowed Actions |
| --- | --- |
| pending | mark acknowledged, start handling, reject |
| acknowledged | start handling, reject |
| in_progress | open writing desk, reject |
| published | open published result |
| rejected | view only |

Do not implement permanent merge until duplicate relationship fields exist. P0
may only show visually grouped similar requests.

Backend mapping:

- reads `reader_requests`, `request_votes`, `works`, `branches`;
- writes request status only through `updateReaderRequestStatus`.

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Similar request label | 同类请求 | |
| Reject label | 暂不处理 | |
| In-progress label | 开始处理 | |

### 5.4 `/creator/editor` - Writing Desk

Goal: let the author write privately from a selected request and prepare a
publishable draft.

Required layout:

- Left: selected request and story context.
- Center: quiet title/body editor.
- Right: destination, local draft status, publish handoff.

Required fields:

- selected work;
- selected line/branch;
- linked request;
- chapter title;
- draft body;
- local save timestamp.

Actions:

- save local draft;
- mark request in progress;
- switch destination line;
- send to publish check;
- clear local draft after confirmation.

Backend mapping:

- reads `works`, `branches`, `chapters`, `reader_requests`,
  `creator_authorizations`;
- writes local draft content only to local storage;
- may update request status to `in_progress`;
- does not publish.

Visual rules:

- no heavy glass behind prose;
- no moving background near editor;
- large text area must fit viewport and not overflow bottom;
- controls may use liquid glass.

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Minimum prose reminder | 300 字提醒，非硬阻断 | |
| Allow no-request draft | Allowed with warning | |
| Local creation service button copy | 检查服务 | |

### 5.5 `/creator/works` - Works And Branches

Goal: let the author understand and manage works -> branches -> chapters.

Required layout:

- Work list.
- Branch tree for selected work.
- Chapter list for selected branch.
- Author notice editor.
- Branch creation panel.

Required capabilities:

- inspect main and IF branches;
- inspect chapters under each line;
- create IF branch with parent line and optional anchor chapter;
- edit author notice;
- hide work with confirmation;
- archive branch with confirmation.

Backend mapping:

- reads `works`, `branches`, `chapters`, `reader_requests`;
- writes `author_notice`, work status, branch status, new IF branch.

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| IF branch product name | IF 支线 | |
| Main branch product name | 主线 | |
| Hide work allowed | Yes, confirm required | |
| Archive branch allowed | Yes, confirm required | |

### 5.6 `/creator/publish` - Publish Check

Goal: be the only place where local draft prose becomes public Reader content.

Required layout:

- Left: selected draft / selected request.
- Center: publish preview.
- Right: checklist and impact summary.

Required checklist:

1. work destination selected;
2. branch selected or created;
3. chapter title exists;
4. prose body is not empty;
5. linked request selected or explicitly skipped;
6. author identity allowed;
7. Reader-facing location is clear;
8. final confirmation checked.

Actions:

- preview;
- publish after confirmation;
- return to editor;
- show publish result.

On success:

- create a publish bundle and call `publishOwnPlatformBundle`;
- write `chapters`;
- write/update `branches`;
- write `publish_events`;
- update linked `reader_requests` to `published`;
- show "已发布，读者端会看到这次更新。"

On failure:

- show "发布未完成，正文仍在草稿箱。"

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Allow unlinked publish | Yes, with warning | |
| Final confirm copy | 确认发布到阅读端 | |

### 5.7 `/creator/settings` - Creator Settings And Health

Goal: make local running state clear without exposing technical internals.

Required sections:

- author identity;
- local workbench status;
- feature availability;
- private writing tool settings;
- display preferences;
- danger area.

Backend mapping:

- reads/writes `creator_clients`;
- reads `feature_flags`;
- reads `creator_authorizations`;
- stores display/local service preferences locally.

Access rules:

- credentials may be entered and tested locally;
- never print full credential value;
- never upload credentials;
- public Reader build must not contain settings UI.

Manual decision:

| Decision | Default | Your Edit |
| --- | --- | --- |
| Private writing tool enabled in P0 | configuration only | |
| Reduced motion default | follow system | |
| Glass strength default | medium-low | |

## 6. Component System Plan

Use shadcn/Radix primitives as the base. Do not hand-roll common controls.

Required components:

| Component | Base | Use |
| --- | --- | --- |
| CreatorShell | app shell + nav | all creator routes |
| CreatorTaskCard | Card | today/request/work cards |
| CreatorStatePanel | Card/Badge/Progress | status summaries |
| CreatorActionBar | Button groups | page-level actions |
| ConfirmActionDialog | AlertDialog | publish/reject/archive/hide/clear |
| RequestStatusBadge | Badge | public request state |
| BranchTree | Card/List | works -> branches -> chapters |
| PublishChecklist | Checkbox/Card | publish gate |
| LocalDraftEditor | Textarea/Input | local writing |
| LocalServicePanel | Input/Switch/Button | local service settings |
| EmptyState | Card/Button | no data states |
| ErrorState | Alert/Button | recoverable failures |

Liquid glass variants:

- `glass-control`: nav, filters, action bars;
- `glass-panel`: side rails and status panels;
- `glass-dialog`: confirmation dialogs;
- never use strong glass for editor body or prose preview.

## 7. Interaction Rules

All writes must use optimistic-but-recoverable UI:

1. disable action button while pending;
2. show progress copy;
3. on success, refresh affected data;
4. on failure, preserve local state and show recovery;
5. destructive actions require confirmation.

Keyboard and accessibility:

- visible focus ring;
- dialog focus trap;
- no hover-only actions;
- buttons have clear labels;
- reduced motion respected;
- text contrast checked on glass backgrounds.

## 8. Visual Direction

Creator visual language:

- calm dark workstation, not cosmic Reader gateway;
- restrained depth, no large planet background;
- liquid glass only as a control surface;
- editor looks like a professional writing desk;
- dense enough for work, not a marketing landing page.

Avoid:

- story prose demo cards as background decoration;
- technical diagrams in product UI;
- giant hero text;
- concept-image residue under panels;
- explanatory paragraphs about backend architecture.

## 9. Acceptance Gates

Required before user preview:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run test:creator
npm --prefix app run build:creator
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Manual browser review routes:

- `/creator/login`
- `/creator`
- `/creator/requests`
- `/creator/editor`
- `/creator/works`
- `/creator/publish`
- `/creator/settings`

Pass criteria:

- no banned internal copy;
- every visible action maps to a real wrapper or local-only rule;
- no Reader visual residue in Creator;
- editor does not overflow the viewport;
- publish path requires explicit confirmation;
- private draft prose remains local until publish;
- screenshots prove each route.

## 10. Implementation Order

Do not implement all screens as a visual rewrite in one pass. Use milestone
gates.

| Milestone | Goal | Exit Gate |
| --- | --- | --- |
| M0 | finalize this plan and manual decisions | reviewed plan file |
| M1 | rebuild Creator shell, nav, shared components, tokens | copy/token checks pass |
| M2 | rebuild login and Today | author can see entry and next work |
| M3 | rebuild Requests | legal request transitions work |
| M4 | rebuild Editor | local draft save and publish handoff work |
| M5 | rebuild Works | works -> branches -> chapters clear |
| M6 | rebuild Publish Check | confirmed publish path works |
| M7 | rebuild Settings | local state and preferences clear |
| M8 | browser QA and evidence pack | all routes/screenshots/checks pass |

## 11. Open Product Decisions For Manual Review

Fill these before execution if you want different defaults.

| Decision | Default | Your Edit |
| --- | --- | --- |
| Creator product name | 本地创作台 | |
| Author role label | 作者 | |
| Primary daily job | 处理读者最想看的更新 | |
| Reader request types | 下一章 / IF 支线 / 继续支线 | |
| Request priority rule | 处理中 > 已看到 > 热度 > 时间 | |
| Similar request label | 同类请求 | |
| Minimum prose reminder | 300 字提醒，非硬阻断 | |
| Allow publishing without linked request | 允许，但显示提醒 | |
| Allow creating IF branch from Works | 允许 | |
| Allow hiding work | 允许，需确认 | |
| Allow archiving branch | 允许，需确认 | |
| Local creation service in P0 | 设置与本机调用入口，不承诺云端生成 | |
| Liquid glass strength | 低到中 | |
| Motion strength | 轻微 | |
| Absolutely avoid | 行星大图 / 星云 / 粒子 / Reader 概念残影 / 工程词 | |

## 12. Reviewer Checklist

Before handing this back for implementation, confirm:

- [ ] The six-entry IA is correct.
- [ ] The product name is correct.
- [ ] The UI labels do not reveal implementation details.
- [ ] Each visible action has backend or local-only support.
- [ ] Publish Check is the only public-content write path.
- [ ] Settings copy is acceptable for local credentials.
- [ ] Visual direction is Creator-specific, not Reader-like.
- [ ] The implementation can proceed milestone by milestone.
