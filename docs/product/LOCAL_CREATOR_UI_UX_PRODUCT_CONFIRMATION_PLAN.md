# Local Creator App UI/UX Product Confirmation Plan

> **Historical reference boundary:** This is a pre-Pivot UI plan retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`
Scope: Local Creator App only. Reader Web is referenced only for visibility checks.
Last reviewed against current frontend data wrappers: 2026-06-28.

## 1. Purpose

This document turns the current backend/data reality into a concrete Creator UI/UX plan.
Edit the decision tables here first, then hand the document back for implementation.

The Creator App is not a public web admin console. It is the author's localhost workbench:

```text
Reader demand
-> author priority
-> local private draft
-> destination line
-> publish check
-> public Reader update
```

P0 boundaries:

- No cloud writing runtime.
- No hosted author credential.
- Draft prose stays on the author's device until publication.
- Cloud records store public content, request state, creator device status, and publication records.
- Publication is always manually confirmed.
- Request state changes are visible, guarded, and recoverable.

## 2. Current Backend Capability Snapshot

The current data layer can support a real P0 author workbench. UI must not expose an action unless it maps to one of these capabilities or is explicitly local-only.

| Product capability | Current source | UI surface | P0 decision |
| --- | --- | --- | --- |
| Author sign-in | `getPmfSession`, `sendCreatorMagicLink`, `signOutPmf` | Login, shell account action | Required |
| Author allowlist | `getCreatorAuthorizationStatus`, `creator_authorizations` | Login gate, write guards | Required |
| Creator device status | `syncCreatorClient`, `creator_clients` | Today, Settings | Required |
| Works | `listCreatorWorks`, `works` | Today, Works, Editor, Publish | Required |
| Author notice | `updateCreatorWorkNotice` | Works | Required |
| Hide work | `updateCreatorWorkStatus` | Works danger action | Allowed with confirmation |
| Branches | `listCreatorBranches`, `branches` | Works tree, Editor destination, Publish destination | Required |
| Create IF branch | `createCreatorIfBranch` | Works, Publish | Allowed with confirmation where needed |
| Archive branch | `updateCreatorBranchStatus` | Works danger action | Allowed with confirmation |
| Chapters | `listCreatorChapters`, `chapters` | Works tree, Editor context, Publish anchor | Required |
| Reader requests | `listCreatorRequests`, `reader_requests` | Today, Requests, Editor, Publish | Required |
| Request heat | `reader_requests.vote_count` from reader votes | Today, Requests sorting | Required |
| Request status | `updateReaderRequestStatus` | Requests, Editor, Publish result | Required |
| Local drafts | `readLocalDrafts`, `upsertLocalDraft` | Today, Editor, Publish | Required local-only capability |
| Publication | `publishOwnPlatformBundle` | Publish Check | Required |
| Publication records | `listCreatorPublishEvents`, `publish_events` | Today, Publish result | Required |
| Feature flags | `listCreatorFeatureFlags`, `feature_flags` | Settings, gated empty states | Required |
| Display preferences | `readCreatorDisplayPreferences`, `writeCreatorDisplayPreferences` | Settings, CSS mode | Required |

Do not add visible product features for durable request merge, multi-author collaboration, hosted writing runtime, paid access, automatic publication, or cloud-stored draft prose unless the data contract is extended first.

## 3. Manual Product Decisions

Fill this table before implementation. Blank cells use the default.

| Decision | Default | Product owner edit |
| --- | --- | --- |
| Creator product name | 本地创作端 | |
| Author role label | 作者 | |
| First request types | 下一章 / IF 支线 / 继续支线 | |
| Daily recommended handling count | 3 | |
| Priority rule | 处理中 > 已看到 > 热度 > 时间 | |
| Similar-request wording | 同类请求 | |
| Minimum prose reminder | 300 字提醒，不硬阻断 | |
| Publish without linked request | 允许，但提醒 | |
| Hide work | 允许，需确认 | |
| Archive branch | 允许，需确认 | |
| Create IF branch from Works | 允许 | |
| Local creation service P0 | 只保存配置状态，不要求真实生成闭环 | |
| Glass intensity | 低到中，只用于控制层 | |
| Motion intensity | 轻微，尊重减少动态效果 | |
| Forbidden visual residue | 行星大图 / 星云 / 粒子 / Reader 概念残影 | |

## 4. Information Architecture

The Creator App must keep exactly these six primary entries:

1. 今日
2. 读者请求
3. 写作台
4. 作品与支线
5. 发布检查
6. 创作设置

Navigation rules:

- The left rail stays stable across Creator pages.
- The top area shows route title, route description, author action, and local status.
- Main actions live in a predictable action area, not scattered inside prose copy.
- Heavy actions always use confirmation dialogs.
- Signed-out pages show locked previews with disabled real controls, not demo explanations.

## 5. Visual Direction

Creator must be visually separate from Reader.

Use:

- dark professional workbench;
- low-to-medium liquid glass for control layers;
- quiet text/editor surfaces;
- dense but legible operational panels;
- shadcn/Radix primitives for buttons, dialogs, selects, tabs, popovers, sheets, tooltips, and scroll areas;
- semantic Creator tokens.

Avoid:

- Reader planet images;
- galaxy or nebula backgrounds;
- particle fields;
- concept-board screenshots;
- large decorative hero treatments;
- strong glass behind long prose or the editor body;
- hardcoded business-component colors.

## 6. Copy Boundary

Rendered product UI must not show these terms:

```text
Supabase
RLS
trace
provider
fallback
API key
后端
接口
同步
回写
数据库
AI
模型
LLM
```

Use:

| Avoid | Product language |
| --- | --- |
| AI / 模型 / LLM | Do not expose as Local Workspace setup |
| API key | Do not collect or display |
| provider | Do not expose as an author setting |
| 后端 / 数据库 | 作品记录 / 发布记录 |
| 接口 / 回写 / 同步 | 保存 / 发布 / 更新状态 / 读取新请求 |
| trace | 发布记录 |
| fallback | 暂时不可用 |

## 7. Page Requirements

### 7.1 `/creator/login` - Author Entry

Purpose: prove this is a local author workbench, not a public SaaS dashboard.

Required:

- email sign-in;
- not-authorized state;
- disabled preview of the full workflow;
- product-language local boundary;
- no service/vendor/implementation terms.

Data/actions:

- `getPmfSession`
- `sendCreatorMagicLink`
- `upsertCreatorProfile`
- `getCreatorAuthorizationStatus`
- `syncCreatorClient`

### 7.2 `/creator` - 今日

First screen:

- 最该写的一条
- 正在写的一条
- 需要确认发布的一条

Below first screen:

- request summary;
- local draft summary;
- publication summary;
- work readiness summary;
- local device status.

Priority rule:

```text
处理中 first, then 已看到, then vote count, then time.
```

Acceptance:

- not a metrics-only dashboard;
- no table-first layout;
- signed-out authors see real but disabled capabilities;
- request heat uses persisted vote count.

### 7.3 `/creator/requests` - 读者请求

Layout:

- left: saved views;
- center: request queue;
- right: request detail peek.

Controls:

- work filter;
- request type filter;
- status filter;
- heat/time sort.

Actions:

- 开始写;
- 稍后;
- 暂不处理;
- 查看同类;
- 查看读者视角.

State-machine rule:

```text
已收到 -> 已看到 -> 处理中 -> 已发布
                 -> 暂不处理
```

P0 similar-request rule:

- Without durable merge fields, similar requests are a temporary view only.
- Do not show permanent merge success.

### 7.4 `/creator/editor` - 写作台

Layout:

- left: request and chapter context;
- center: title and quiet prose editor;
- right: destination rail.

Required:

- restore context from request route;
- restore context from local draft route;
- save prose locally;
- preserve `local_draft_ref` for Publish Check;
- disable save and publish handoff until author state, destination, title, and prose are ready;
- no strong glass, Reader background, or decorative motion in the editor body.

### 7.5 `/creator/works` - 作品与支线

Required:

- work list;
- author notice editor;
- work -> branch -> chapter structure;
- main and IF visual distinction;
- selected branch detail;
- parent line and anchor chapter visibility;
- request pressure per line;
- create IF branch;
- hide work with confirmation;
- archive branch with confirmation;
- open Writing Desk with selected work/line.

### 7.6 `/creator/publish` - 发布检查

Required checklist:

1. Selected local draft.
2. Destination work.
3. Main line or IF line.
4. Anchor location.
5. Linked reader request.
6. Public title.
7. Prose preview.
8. Reader-facing location.
9. Post-publish impact.

Gate classes:

- Must pass gates: author state, destination, title, non-empty prose.
- Warning gates: no linked request, short prose, unpublished destination context.
- Confirmation gates: publication and reader-facing impact.

Publish action:

- Create a publish bundle and call the publish-bundle adapter only after the author confirms.
- Linked request becomes published when publication succeeds.
- Publish Check preserves `local_draft_ref` and does not upload private draft
  prose before confirmation.

Failure copy:

```text
发布未完成，正文仍在草稿箱。
```

Success state:

- show work, line, chapter, request impact, and time.

### 7.7 `/creator/settings` - 本机工作区

Required sections:

- 本机保存
- 备份恢复
- 助手权限
- 操作记录
- 当前状态
- 显示偏好

Required actions:

- save display preferences;
- export a versioned workspace backup;
- reset display preferences with confirmation;
- reduce motion;
- reduce transparency.

Author-facing model, provider, service-address, and credential setup is not part of this surface. Historical local records remain migration-only and are excluded from new workspace exports.

Access rule:

- show only configured/unconfigured access state;
- never show credential content.

## 8. Component Rules

Use existing shadcn-compatible primitives first:

- Button
- Card
- Dialog / AlertDialog
- Select
- Tabs
- Popover
- Dropdown
- Sheet
- Tooltip
- ScrollArea
- Textarea

Creator-owned components should live under `app/src/components/creator`.

Every Creator component must define:

- loading state;
- empty state;
- error state;
- disabled state;
- reduced-motion behavior if animated;
- reduced-transparency fallback if glass is used.

Liquid glass rules:

- allowed: nav, status cards, request cards, right rail, publish check, dialogs;
- not allowed: prose editor body, long prose preview, large page background.

## 9. File-Level Implementation Plan

### M0 - Specs and constraints

Expected files:

- `AGENTS.md`
- `docs/product/creator-ui-vision.md`
- `docs/product/creator-user-flows.md`
- `docs/product/ui-copy-dictionary.md`
- `docs/product/banned-ui-terms.md`
- `docs/data-contracts/creator-data-map.md`
- `docs/data-contracts/request-status-machine.md`
- `docs/data-contracts/publish-flow.md`
- `docs/data-contracts/draft-storage-boundary.md`
- `docs/harness/implementation-rules.md`
- `docs/harness/page-acceptance-tests.md`
- `docs/harness/component-dod.md`
- `docs/harness/visual-regression-checklist.md`

### M1 - Creator Shell and design system

Expected files:

- `app/src/components/creator/*`
- `app/src/components/ui/*` only when a primitive is missing
- `app/src/styles/parallel-universe-tokens.css`
- `app/src/index.css`
- `app/src/design-system/registry.ts`
- `app/src/design-system/page-contracts.ts`

### M2-M7 - Page passes

Expected main file:

- `app/src/apps/creator/LocalCreatorApp.tsx`

Allowed supporting files:

- typed fixtures under `app/src/__fixtures__`;
- creator components under `app/src/components/creator`;
- narrow data wrapper updates under `app/src/lib/pmfSupabase.ts` only when the wrapper already maps to current backend tables.

### M8 - QA and evidence

Expected files:

- `docs/harness/creator-ui-m8-qa-YYYYMMDD.md`
- `docs/harness/creator-ui-requirement-audit-YYYYMMDD.md`
- route screenshots under `artifacts/visual-qa/`.

## 10. Required Checks

Run after every meaningful UI pass:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run test:creator
npm run build:creator
npm run check:public-reader-bundle-boundary
```

Browser QA routes:

```text
/creator/login
/creator
/creator/requests
/creator/editor
/creator/works
/creator/publish
/creator/settings
```

## 11. Implementation Stop Rules

Stop and ask for product review when:

- a requested UI action has no matching data capability;
- the design needs new public Reader behavior;
- a feature would require storing draft prose remotely;
- a feature would imply cloud writing;
- the UI needs permanent request merge;
- a visible phrase would violate the banned copy list;
- a screen cannot pass reduced-motion or reduced-transparency fallback.

## 12. Product Owner Review Checklist

Before implementation, review these:

| Question | Accepted? | Notes |
| --- | --- | --- |
| Does the six-entry IA match the intended Creator product? | | |
| Is "同类请求" only a temporary view in P0? | | |
| Should no-request publication be allowed? | | |
| Should work hiding and branch archiving be available in P0? | | |
| Does the visual direction fully reject Reader planet/nebula residue? | | |
| Are the banned terms complete? | | |
| Is the private writing tool shown as status/config only in P0? | | |
| Are all heavy actions confirmation-gated? | | |
| Are these checks sufficient before preview review? | | |
