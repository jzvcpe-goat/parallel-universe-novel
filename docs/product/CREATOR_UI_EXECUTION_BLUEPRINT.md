# Creator UI Execution Blueprint

> **Historical reference boundary:** This is a pre-Pivot UI plan retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`
Audience: product owner, frontend implementer, backend/data reviewers.
Scope: Creator UI only. Reader changes are allowed only for visibility checks.

## 1. Product Definition

Creator is an author-owned workbench, not a public web admin console.

Its job is to turn reader demand into published story updates:

```text
Reader request
-> today's author priority
-> private local draft
-> destination line
-> publish check
-> confirmed publication
-> Reader-visible update
```

P0 must preserve these boundaries:

- No cloud writing runtime.
- No hosted author access material.
- Draft prose stays on the author's device until publication.
- Cloud records store public content, request state, creator device status, and publication records.
- Publication is always manually confirmed.
- Request state changes are visible, guarded, and recoverable through product-safe errors.

## 2. Manual Product Decisions

Fill these before a visual or copy pass. If left blank, use the default.

| Decision | Default | Owner Notes |
| --- | --- | --- |
| Creator surface name | 作者工作台 |  |
| Author role label | 作者 |  |
| First request types | 下一章 / IF 支线 / 继续支线 |  |
| Daily recommended handling count | 3 |  |
| Priority rule | 处理中 > 已看到 > 热度 > 时间 |  |
| Similar-request wording | 同类请求 |  |
| Minimum prose reminder | 300 字提醒，不硬阻断 |  |
| Publish without linked request | 允许，但提醒 |  |
| Hide work | 允许，需确认 |  |
| Archive branch | 允许，需确认 |  |
| Local creation service P0 | 只保存配置状态，不要求真实生成闭环 |  |
| Glass intensity | 低到中，只用于控制层 |  |
| Motion intensity | 轻微，尊重减少动态效果 |  |
| Forbidden visual residue | 行星大图 / 星云 / 粒子 / Reader 概念残影 |  |

## 3. Backend Capability To UI Map

UI must not expose an action unless it maps to the current wrapper or is explicitly local-only.

| Capability | Current Source | UI Surface | Notes |
| --- | --- | --- | --- |
| Author session | `getPmfSession`, `sendCreatorMagicLink`, `signOutPmf` | Login, shell account action | Email link only in P0. |
| Author allowlist | `getCreatorAuthorizationStatus`, `creator_authorizations` | Login gate, write guards | Authenticated is not automatically trusted. |
| Creator client status | `syncCreatorClient`, `creator_clients` | Today, Settings | Shows device status and last read time in product language. |
| Works | `listCreatorWorks`, `works` | Today, Works, Editor, Publish | Manageable works only. |
| Author notice | `updateCreatorWorkNotice` | Works | Product copy only. |
| Hide work | `updateCreatorWorkStatus` | Works | Heavy action, confirmation required. |
| Branches | `listCreatorBranches`, `branches` | Works tree, Editor destination, Publish destination | Main and IF lines must differ visually. |
| Create IF branch | `createCreatorIfBranch` | Works, Publish | Requires title and optional anchor. |
| Archive branch | `updateCreatorBranchStatus` | Works | Heavy action, confirmation required. |
| Chapters | `listCreatorChapters`, `chapters` | Works tree, Editor context, Publish anchor | Public content only. |
| Reader requests | `listCreatorRequests`, `reader_requests` | Today, Requests, Editor, Publish | Must use persisted status. |
| Request heat | `request_votes`, `vote_count` | Requests sorting, Today priority | P0 does not invent heat. |
| Request status | `updateReaderRequestStatus` | Requests, Editor, Publish | Must follow the state machine. |
| Local drafts | `readLocalDrafts`, `upsertLocalDraft` | Today, Editor, Publish | Prose remains local. |
| Publication | `publishOwnPlatformBundle` | Publish Check | Creates a publish bundle first, then the adapter writes public chapter/event and request completion. |
| Publication records | `listCreatorPublishEvents`, `publish_events` | Today, Publish result | Product label: 发布记录. |
| Feature flags | `listCreatorFeatureFlags`, `feature_flags` | Settings, gated empty states | Show capability state, not implementation details. |
| Local preferences | `readCreatorDisplayPreferences`, `writeCreatorDisplayPreferences` | Settings | Reduced motion and transparency. |

## 4. Information Architecture

Primary navigation order is fixed:

1. 今日
2. 读者请求
3. 写作台
4. 作品与支线
5. 发布检查
6. 创作设置

Navigation rules:

- Left rail stays stable across Creator pages.
- Top bar shows route title, route description, author action, and local status.
- Main actions are placed in a predictable action area, not scattered across the page.
- Heavy actions always use confirmation dialogs.

## 5. Page Requirements

### 5.1 Login

Route: `/creator/login`

Required:

- Explain this is the author's local workbench.
- Email sign-in.
- Not-authorized state.
- Local boundary statement in product language.
- Disabled preview of the flow after sign-out.

Backend map:

- `getPmfSession`
- `sendCreatorMagicLink`
- `upsertCreatorProfile`
- `getCreatorAuthorizationStatus`
- `syncCreatorClient`

### 5.2 今日

Route: `/creator`

First screen:

- 最该写的一条
- 正在写的一条
- 需要确认发布的一条

Below the first screen:

- Request, draft, publication, and work readiness summary.
- Signed-out preview with disabled actions.
- Priority explanation: in progress first, then acknowledged, then vote count and time.

Required data:

- `works`
- `branches`
- `chapters`
- `reader_requests`
- `vote_count`
- `publish_events`
- local draft refs

### 5.3 读者请求

Route: `/creator/requests`

Layout:

- Left: saved views.
- Center: request queue.
- Right: request detail peek.

Required controls:

- Work filter.
- Request type filter.
- Status filter.
- Heat/time sort.

Required actions:

- 开始写
- 稍后
- 暂不处理
- 查看同类
- 查看读者视角

P0 similar-request rule:

- Without persistent merge fields, "同类请求" is a temporary view filter only.
- The UI must not imply permanent merge.

### 5.4 写作台

Route: `/creator/editor`

Layout:

- Left: request context.
- Center: title and quiet prose editor.
- Right: destination rail.

Required:

- Restore context from request route.
- Restore context from local draft route.
- Save private draft locally.
- Disable save and publish handoff until author state, destination, title, and prose are ready.
- Enter Publish Check with the same local draft ref.

Not allowed:

- Strong glass background in the editor body.
- Reader background imagery.
- Remote draft prose persistence before publication.

### 5.5 作品与支线

Route: `/creator/works`

Required:

- Work list.
- Work notice editor.
- Branch tree.
- Chapter list.
- Main/IF visual distinction.
- Selected branch detail with parent line, parent chapter, request count, and last update.
- Create IF branch.
- Hide work with confirmation.
- Archive branch with confirmation.
- Open Writing Desk with selected work/line.

### 5.6 发布检查

Route: `/creator/publish`

Required:

- Selected local draft.
- Destination work.
- Main or IF line.
- Anchor location.
- Linked request.
- Public title.
- Prose preview.
- Reader-facing location.
- Post-publish impact.

Gate classes:

- Must-pass gates: author state, destination, title, non-empty prose.
- Warning gates: no linked request, short prose, unpublished destination context.
- Confirmation gates: publication and reader-facing impact.

Publish action:

- Create a publish bundle and call the publish-bundle adapter only after the author confirms.
- Linked request becomes published when publication succeeds.
- Publish Check preserves the local draft ref and never uploads private draft
  prose before confirmation.

Failure copy:

```text
发布未完成，正文仍在草稿箱。
```

Success state:

- Show published work, line, chapter, request impact, and time.

### 5.7 创作设置

Route: `/creator/settings`

Required sections:

- 本机保存
- 备份恢复
- 助手权限
- 操作记录
- 当前状态
- 显示偏好

Required actions:

- Save display preferences.
- Export a versioned workspace backup.
- Reset display preferences with confirmation.
- Reduce motion.
- Reduce transparency.

Access rule:

- Do not render model, provider, service-address, or credential controls.
- Keep historical tool-setting records migration-only and out of new workspace exports.

## 6. State Machine

Allowed:

```text
已收到 -> 已看到 -> 处理中 -> 已发布
                 \-> 暂不处理
```

Disallowed in P0:

- 已发布 -> 处理中
- 暂不处理 -> 已发布

Any future "重新打开" flow must record a reason and must be added to both the data contract and UI contract before implementation.

## 7. Copy Boundary

Use product language only in rendered UI.

| Avoid In Product UI | Use |
| --- | --- |
| AI / 模型 / LLM | Do not expose as Local Workspace setup |
| API key | Do not collect or display |
| Provider | Do not expose as an author setting |
| 后端 / 数据库 | 作品记录 / 发布记录 |
| 接口 / 回写 / 同步 | 保存 / 发布 / 更新状态 / 读取新请求 |
| trace | 发布记录 |
| fallback | 暂时不可用 |
| Supabase / RLS | Do not render |

## 8. Design System Rules

- Use shadcn-compatible primitives from `app/src/components/ui`.
- Use Radix-backed primitives for dialogs, selects, sheets, tabs, tooltips, and alerts.
- Business components live in `app/src/components/creator`.
- Business components use semantic Creator tokens only.
- Liquid Glass is a control-layer treatment only.
- Editor and long preview surfaces must use quiet text surfaces.
- Reduced motion and reduced transparency preferences must be respected.

## 9. Implementation Milestones

### M0: Specs And Constraints

Files:

- `AGENTS.md`
- `docs/product/*`
- `docs/data-contracts/*`
- `docs/harness/*`
- `scripts/check-ui-copy.ts`
- `scripts/check-design-tokens.ts`
- `scripts/check-no-mock-data.ts`
- `scripts/check-creator-ui-contract.ts`

Acceptance:

- Product boundary, data map, status machine, draft boundary, copy dictionary, and page acceptance tests are present.
- Checks are connected to package scripts.

### M1: Creator Shell And Design System

Files:

- `app/src/components/creator/*`
- `app/src/components/ui/*`
- `app/src/styles/parallel-universe-tokens.css`
- `app/src/index.css`
- `app/src/design-system/registry.ts`
- `app/src/design-system/page-contracts.ts`

Acceptance:

- Six-entry shell.
- Route-aware title and description.
- Local status pill.
- Confirm dialog with pending and error state.
- Creator tokens and glass rules.
- No Reader background dependency.

### M2: 今日

Acceptance:

- Three priority task cards.
- Signed-out preview with disabled actions.
- Signed-in request/draft/publish/work summary.
- Priority explanation uses real status, vote count, and time.

### M3: 读者请求

Acceptance:

- Saved views, queue, and detail peek.
- Filters and sorts.
- Request actions follow the status machine.
- Similar-request display is temporary only.

### M4: 写作台

Acceptance:

- Three-column layout.
- Quiet editor.
- Local draft save.
- Author/destination/readiness guards.
- Publish handoff preserves local draft ref.

### M5: 作品与支线

Acceptance:

- Work -> branch -> chapter tree.
- Main/IF distinction.
- Notice save.
- Hide/archive confirmations.
- IF branch creation and Writing Desk handoff.

### M6: 发布检查

Acceptance:

- Destination, anchor, linked request, title, preview, reader location, and impact.
- Gate classes.
- Manual confirmation.
- Writes publication and request completion.
- Failure keeps local prose.

### M7: 创作设置

Acceptance:

- Local records, backup/recovery, local status, and display preferences.
- No author-facing model/provider/service-address/credential setup.
- Display-preference reset confirmation.

### M8: QA And Regression

Commands:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run check:creator-ui-contract
npm run test:creator
npm run build:creator
```

Browser routes:

- `/creator/login`
- `/creator`
- `/creator/requests`
- `/creator/editor`
- `/creator/works`
- `/creator/publish`
- `/creator/settings`

Evidence:

- Desktop screenshots.
- Mobile screenshots when layout is responsive.
- Banned copy scan output.
- Build output.
- Known unresolved items.
