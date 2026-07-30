# Page Acceptance Tests

## Reader Request Panel

- Uses `ReaderRequestComposer` for request tabs, text entry, request-flow explanation, product status copy, disabled unavailable state, and send action.
- Uses `ReaderHotRequestList` for hot requests, vote action, published-state feedback, and empty state.
- Uses `ReaderReadingToolButton` for compact reading-paper controls; the Story page does not own raw button styles or a `reader-tool-button` global selector.
- Uses `ReaderStoryIndexPanel` for the left story index, current chapter, and branch map.
- Uses `ReaderStoryBranchPanel` for the branch focus, shelf action, branch summary, and branch metrics.
- Uses `ReaderStoryProgressPanel` for page progress, shelf state, next-scene state, and worldline feedback.
- Does not render hot request rows as nested `Card` components inside another request `Card`.
- Does not rebuild the story cover, chapter card, or branch map as page-local `narrative-panel` sections.
- Does not rebuild the branch focus or reading progress cards as page-local right-rail `Panel` markup.
- Reader-facing request copy stays about asking for the next chapter, IF branch, continuation, heat, and updates; it does not expose Creator, backend, trace, or provider terms.
- When requests are unavailable, the product copy says the author has not opened reader requests yet; it does not describe service switches or implementation configuration.
- `ReaderRequestPanel` owns data loading and callbacks only; composition belongs to Reader components.

## Creator Shell

- Uses the six primary Creator entries: 今日创作路径, 外界回声, 写作台, 作品与支线, 发布包, 本机工作区.
- Uses route-aware page title and description so `/creator/login` is not labeled as 今日.
- Browser-route previews normalize legacy `#/creator/...` review links into `/creator/...` so reviewers land on the intended Creator surface instead of the default page.
- Shows local status and author identity actions without exposing engineering terms.
- Uses shadcn/Radix-backed navigation, buttons, badges, and glass surfaces.
- Does not render Reader depth imagery, planet backgrounds, nebula effects, or concept-board residue.
- The workbench root and main scroll surface use Creator paper/ruling tokens instead of radial cosmic hero glows.
- Uses a Creator-owned workbench container, not the Reader narrative page shell.
- Works in local Creator mode even when signed out; signed-out write actions remain disabled.
- Signed-out Creator pages use route-aware capability previews, not one generic card set for every route.

## 今日

- Shows the three most important tasks.
- Signed-out authors see capability preview and disabled actions.
- Signed-in authors see request, draft, publish, and work tasks.
- Signed-out preview also shows request, draft, publish, and work capabilities.
- The top request card explains why that request is prioritized.
- `CreatorTodayPriorityPanel` summarizes the current focus, request queue pressure, publish readiness, and four-step writing route from real request, draft, and publication state.
- The Today route should feel like a writing assistant's next-step route, not a dashboard of separate status strips.
- The visible priority rule is: continue in-progress requests first, then acknowledged requests, then sort by votes and submission time.
- Request heat uses the persisted vote count maintained by reader votes; Today must not invent a static heat score.
- The active draft card opens the exact local draft in the writing desk.
- The publish candidate card opens the exact local draft in 发布包确认.
- 作品准备状态 reads real works, branches, chapters, and reader requests; the empty state appears only when no manageable works are returned.
- Work readiness cards show current work status, open request count, line count, and published chapter count.

## 外界回声

- Has saved views, queue, and detail peek.
- Filters by work, request type, and status.
- Sorts by heat and time.
- Shows a queue status strip with counts for 已收到, 已看到, 处理中, 已发布, and 暂不处理 plus the visible request count.
- Uses real request/vote data.
- Similar requests can be viewed as a temporary queue filter without implying a permanent merge.
- Starting writing follows the visible state machine: 已收到 -> 已看到 -> 处理中.
- Request actions expose disabled/loading states while a status action is in progress.
- The detail peek follows the active queue filters instead of showing a request hidden by the current view.
- The reader perspective action uses product copy and opens the reader-facing surface when configured.

## 写作台

- Three columns: request context, quiet editor, destination rail.
- Saves private prose locally.
- Save and publish handoff are disabled until author status, destination, title, and prose are ready.
- Save and publish handoff expose in-progress states to prevent duplicate clicks.
- The center editor shows a compact readiness strip with prose count, local save state, destination, linked request state, and the missing items blocking publish check.
- The readiness strip uses product language only; it does not expose storage, service, or implementation details.
- Quality guidance is presented as `质量问题卡`; old process wording such as `质量审阅` and `审阅建议` must not appear in the writing desk.
- The visible writing shortcuts are real interactions: `Tab` accepts the next prose suggestion from the focused正文 field, `⌘K` opens a rewrite candidate, `⌘L` opens a decisive question, and `⌘I` opens the impact review instead of the global command palette.
- The review dock must keep a natural-language writing command bar visible. While checking quality, story impact, branch trial, or rationale, the author can still say `补写一段`, `压低解释`, `看影响`, or `支线试写` without leaving the review context.
- Compact assistant mode must not hide the natural-language command form; it may only compress longer explanation panels.
- `开始下一章` stays disabled when the current chapter is unconfirmed, has a pending repair decision, retains an active hard literary block, or fails deterministic validation. The timeline explains the exact blocker, and a blocked attempt cannot save a draft or create the next Canon shell.
- Adopting a post-confirmation repair reopens the current chapter in drafting state; it must be reviewed and confirmed again before next-chapter readiness can pass.
- A confirmed chapter's next-chapter recall may use the selected path as planning context, but it must never present candidate `projectedEffects` as committed consequences, promises, or debts. Those facts require a committed, evidence-locatable Canon Patch operation.
- The previous chapter's accepted ending evidence remains present even when its selected-path explanation is oversized; context compaction trims planning copy before it can erase the handoff evidence.
- When accepted ending evidence itself exceeds its bounded budget, compaction keeps the actual manuscript tail, including the final accepted paragraph, and prefixes an ellipsis to disclose omitted earlier context. It must not keep the front of a trailing window while discarding the real chapter ending.
- Manual promise and foreshadowing recall follows the newest committed operation for each Canon state path across chapters. A `fulfilled` value or a remove operation remains as an internal terminal tombstone so an older `created` or `advanced` card cannot reappear under `未兑现的承诺`; a later explicit `created` or `advanced` Canon operation may reopen the path. For migrated records whose evidence Patch is unavailable, the cumulative current Canon may create only a hidden fulfilled tombstone; it cannot create an active visible recall fact without the Patch.
- Historical chapter recall is explicitly temporal and provenance-scoped: its summary starts with `历史快照` and states that current Canon wins. Intent-derived starting conditions, target changes, required choices, expected costs, and unresolved requirements are labelled `创作约束`; they do not prove the accepted manuscript implemented them. A committed, evidence-locatable `recentChoice` or `paidCost` may replace the corresponding intent plan and is labelled `正史`. A selected candidate path remains planning-only and non-canonical. Architect, Planner, Writer, and Auditor may treat only explicit `正史` state and accepted ending evidence as accomplished facts.
- After navigation or reload, the conversational writing workspace exposes `restoring`, `busy`, and `ready` as machine-readable states. Working agents may read or invoke writing-desk actions only after the manifest readiness selector matches. While restoring, conversation submission, recall changes, local saves, historical-state decisions, manuscript actions, publish handoff, and next-chapter actions remain disabled.
- Can enter 发布包确认.
- Accepts a draft route context and restores title, prose, work, branch, linked request, and publish direction.

## 作品与支线

- Shows work to branch to chapter structure.
- Visually separates main and IF lines.
- Shows a work structure summary with main/IF counts, published chapter count, open request pressure, and lines needing content.
- Main and IF line cards have distinct Creator-owned visual treatment beyond copy alone.
- Selecting a branch updates a detail panel with line type, status, chapters, request count, parent line, parent chapter, and last update.
- Author notice save, work hide, branch archive, and IF branch creation expose disabled/loading states.
- Hiding a work and archiving a branch require confirmation.
- Creating an IF line supports parent line and anchor chapter selection.
- A selected line can open Writing Desk with that work and line preselected.
- The right rail includes an assistant judgment card labelled `这条线下一步`, with `作者一问`, current-line basis, and a direct writing handoff. It must use `CreatorAuthorDecisionCard`, not page-local status rows.

## 发布包确认

- Shows selected local draft, destination, line type, branch anchor, linked request, public title, prose preview, reader-facing location, and post-publish impact.
- Shows a publish impact summary covering reader-visible location, anchor, request outcome, and failure recovery.
- Shows an assistant judgment card labelled `发布前最后一问`, with `作者一问`,正文/读者愿望/公开位置 basis, and a handoff back to Writing Desk. It must use `CreatorAuthorDecisionCard`.
- Separates must-pass gates, warning gates, and confirmation gates.
- Publish requires confirmation, creates a publish bundle, and calls the publish-bundle adapter only after the author confirms.
- Successful publish writes chapter, branch/event relationships, and marks a linked request as published.
- Publish failure preserves local prose.
- Failed publish shows "发布未完成，正文仍在草稿箱。"
- Accepts a draft route context and selects the intended local draft instead of defaulting to the newest draft.
- Publish confirmation exposes an in-progress state and prevents duplicate submission.
- Publish success shows a result summary with work, line, chapter, request impact, and time.

## 本机工作区

- Uses the title 本机工作区.
- Shows local workspace backup export, assistant permissions, and operation records.
- Shows local records, backup/recovery, local status, and display preferences.
- Shows a boundary summary covering local records, workspace portability, local device boundary, and public content boundary.
- Does not expose model, provider, service-address, or credential configuration.
- Save and reset display preferences expose in-progress states.
- Resetting display preferences requires confirmation and does not affect drafts, writing assets, backups, or published content.

## Reader Account / 会员

- `/settings` is a Reader/account surface, not a Creator setup surface.
- Uses `ReaderAccountHeroCard` for the first-viewport current account or membership-plan summary.
- Uses `ReaderEntitlementSummaryGrid` for reading credits, interaction request credits, and archive state summary.
- Uses `ReaderAccountMergePanel` for login, registration, browser archive check, and account merge controls.
- Uses `ReaderAccountStatusGrid` for reading progress, reader request activity, and cross-device recovery cards.
- Uses `ReaderDataControlPanel` for export, delete preview, delete confirmation, and public-safe account messages.
- Uses `ReaderCheckoutProgressPanel` for checkout progress, status refresh, and return-to-reading actions.
- Uses `ReaderMembershipPlanPanel` for membership plan selection and checkout-safe error display.
- Uses `PlanCard` for membership options.
- Public account copy says reading, request, interaction, membership, and recovery; it must not say creator draft, creation record, backend, provider, or implementation terms.
- Data-governance counts are framed as reader activity and interaction records even when the underlying account snapshot still has legacy field names.
