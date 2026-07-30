# Reader Components

Reader components live under `app/src/components/reader` or shared reader-facing design-system patterns.

Reader component set:

- `ReadingPaper`
- `ChoiceCard`
- `ReaderRequestComposer`
- `ReaderHotRequestList`
- `ReaderReadingToolButton`
- `ReaderStoryIndexPanel`
- `ReaderStoryBranchPanel`
- `ReaderStoryProgressPanel`
- `ReaderAccountHeroCard`
- `ReaderEntitlementSummaryGrid`
- `ReaderAccountMergePanel`
- `ReaderAccountStatusGrid`
- `ReaderDataControlPanel`
- `ReaderCheckoutProgressPanel`
- `ReaderMembershipPlanPanel`

Rules:

- Reader components must stay reading-first: story, choice, request, vote, and update-state language only.
- `ReaderRequestComposer` owns the request-type tabs, request text box, request flow explanation, product status note, disabled unavailable state, and send action through shadcn `Card`/`Tabs`/`Textarea`/`Button`/`Alert` composition.
- `ReaderHotRequestList` owns the hot-request list, contextual empty state, and vote action through one shadcn `Card` shell. Individual hot requests render as list rows, not nested `Card` components, so Reader request UI does not become card-in-card clutter.
- `ReaderReadingToolButton` owns compact controls embedded in `ReadingPaper` through the shadcn `Button` primitive and Reader paper tokens. `/story` may pass labels and button behavior, but it must not recreate the old `reader-tool-button` global CSS hook or raw `<button>` styling.
- `ReaderStoryIndexPanel` owns the `/story` left rail: back action, story cover, current chapter card, and branch map through shadcn `Card`/`Badge`/`Button`; `/story` may pass story/chapter/branch data and callbacks but must not rebuild this rail as page-local `narrative-panel` sections.
- `ReaderStoryBranchPanel` owns the `/story` branch focus card, shelf action, branch summary, and branch metrics through shadcn `Card`/`Badge`/`Button`; `/story` may pass branch values and callbacks but must not rebuild this right-rail panel as page-local `Panel` markup.
- `ReaderStoryProgressPanel` owns the `/story` reading progress card, page state, shelf state, next-scene state, and compact worldline feedback through shadcn `Card`/`Badge` plus `LiquidGlassMetric`; `/story` may pass runtime state but must not rebuild the progress card inline.
- `ReaderAccountHeroCard` owns the `/settings` first-viewport account or membership-plan summary through shadcn `Card`/`Badge`; `/settings` may pass label, title, detail, and status but must not rebuild that hero card as page-local `Panel` markup.
- `ReaderEntitlementSummaryGrid` owns the `/settings` entitlement summary cards for reading credits, interaction requests, and archive state through shadcn `Card`/`Badge`; `/settings` may pass values but must not rebuild those summary cards as page-local `Panel` markup.
- `ReaderAccountMergePanel` owns account recovery, login, registration, browser archive check, and account merge controls through shadcn `Card`/`Badge`/`Button`/`Input`/`Label`; `/settings` may pass values and callbacks but must not rebuild the login or merge summary as page-local form/card markup.
- `ReaderAccountStatusGrid` owns the public account status cards for reading progress, request activity, and account recovery through shadcn `Card`/`Badge`/`Button`; `/settings` may pass values and callbacks but must not rebuild those cards as page-local Panels.
- `ReaderDataControlPanel` owns the public account data controls for data export, delete preview, delete confirmation, and public-safe account messages through shadcn `Card`/`Badge`/`Button`/`Input`; `/settings` may pass values and callbacks but must not rebuild that data-governance panel as page-local markup or raw inputs.
- `ReaderCheckoutProgressPanel` owns the `/settings` checkout progress, status refresh action, and return-to-reading action through shadcn `Card`/`Badge`/`Button`; `/settings` may pass checkout state and callbacks but must not rebuild the progress area as page-local `narrative-panel` or rounded-div markup.
- `ReaderMembershipPlanPanel` owns the `/settings` membership plan selection section, checkout-safe error badge, and shared `PlanCard` layout through shadcn `Card`/`Badge` plus the design-system `PlanCard`; `/settings` may pass formatted plans and callbacks but must not import or render `PlanCard` directly.
- `ReaderRequestPanel` may own data loading and callbacks, but it must render `ReaderRequestComposer` and `ReaderHotRequestList` instead of rebuilding their layout as page-local markup.
- Reader UI must not expose Creator-only wording such as publish, draft, private writing tools, provider, backend, trace, RLS, or local runtime internals.

## ReaderReadingToolButton Contract

- Product intent: provide compact, readable controls inside the quiet `ReadingPaper` surface without introducing a page-owned visual system.
- Data contract: accepts native/shadcn button props except `variant` and `size`; the component owns those visual choices.
- Primitive contract: composes the shared shadcn `Button` with Reader paper tokens only.
- State contract: default, hover, visible keyboard focus, disabled, and loading behavior come from the shared primitive; Story supplies any product action.
- Visual contract: 32px stable height, 8px radius, paper-token foreground/background/border, no raw color in the component, and no global `reader-tool-button` selector.
- Accessibility contract: renders a native button, defaults to `type="button"`, preserves keyboard operation, and keeps the shared focus ring.
- Test contract: `check:reader-story-components`, design-system gates, Reader build, and Story browser parity must remain green.

# Creator Components

Creator components live under `app/src/components/creator`.

M1 component set:

- `CreatorShell`
- `CreatorTodayNextStepsPanel`
- `CreatorStatePanel`
- `CreatorActionBar`
- `CreatorTodayPriorityPanel`
- `CreatorDashboardPriorityPanel`
- `CreatorTodayPathPanel`
- `CreatorTodayEchoStatusPanel`
- `CreatorTodayContextRail`
- `CreatorExternalEchoInboxCard`
- `CreatorExternalEchoDetailPanel`
- `CreatorEchoQueueCard`
- `CreatorEchoStatusStrip`
- `CreatorEchoNextActionPanel`
- `CreatorEchoDecisionPanel`
- `CreatorEchoWritingRail`
- `CreatorAuthorDecisionCard`
- `CreatorWorkStructureStrip`
- `CreatorBranchLineCard`
- `CreatorPublishBundleContextPanel`
- `CreatorPublishBundleImpactStrip`
- `CreatorPublishBundleReviewPanel`
- `CreatorSettingsBoundaryStrip`
- `CreatorLocalWorkspacePanel`
- `CreatorWorkspacePreferencesPanel`
- `CreatorSettingsStatusRail`
- `ConfirmActionDialog`
- `LocalStatusPill`

M4 workspace component set:

- `CreatorShortcutBar`
- `CreatorWritingWorkspaceFrame`
- `CreatorCommandCenterFrame`
- `CreatorAssistantSidecarFrame`
- `CreatorCommandCandidateFrame`
- `CreatorGuidedCoachFrame`
- `CreatorStoryHandoffPanel`
- `CreatorReviewDockFrame`
- `CreatorCreativeReviewDock`
- `CreatorQualityIssueCard`
- `CreatorStateDiffPanel`
- `CreatorBranchSandboxPanel`
- `CreatorFlightRecorderPanel`
- `CreatorParagraphJudgmentFrame`
- `CreatorEditorCursorAssistBar`
- `CreatorParagraphJudgmentPanel`
- `CreatorStoryFlowRail`
- `CreatorFlowStepper`
- `CreatorNextActionPanel`
- `CreatorNextBestActionCard`
- `CreatorCollapsibleOutline`
- `CreatorChapterPlannerPanel`
- `CreatorEditorAssistPanel`
- `CreatorGhostCompletionPanel`
- `CreatorInlineReviewPanel`
- `CreatorEditorReviewRail`
- `CreatorWritingCommandShelf`
- `CreatorAgentComposer`
- `CreatorAgentWritingAssistantPanel`
- `CreatorAssistantDock`
- `CreatorEditorDecisionQueuePanel`
- `CreatorDecisionQueue`
- `CreatorEditorReadinessStrip`
- `CreatorProgressRail`
- `CreatorMissionProgressRail`
- `CreatorSessionRail`
- `CreatorStoryMap`
- `CreatorReaderWishPanel`
- `CreatorAuthorStatusPanel`
- `CreatorDestinationPanel`
- `CreatorBundleReadinessPanel`
- `CreatorCanonCommitBar`
- `CreatorPrivateDraftPanel`

Rules:

- Compose shadcn/ui primitives.
- Use Radix-backed Dialog, AlertDialog, Sheet, Select, Tabs, Tooltip, and ScrollArea when interaction is needed.
- Use `ConfirmActionDialog` on top of AlertDialog for publish, reject, hide, archive, local-clear, and other heavy actions.
- Components must accept loading, empty, error, and disabled states where applicable.
- Components must not import Reader pages, Reader visual backgrounds, or product data fixtures.
- Workspace components must use Creator semantic tokens such as `--creator-border`, `--creator-surface`, `--creator-editor-bg`, `--creator-editor-control`, `--creator-accent-soft`, and `--creator-confirm`.
- The Creator workbench shell uses scoped paper/ruling tokens such as `--creator-workbench-paper` and `--creator-workbench-main-ruling`; do not reintroduce Reader planet backgrounds, depth-stage classes, nebula fields, or radial hero glows into the Creator root surface.
- Workspace components must not ship hard-coded `rgba(...)`, `bg-white/*`, or literal hex color classes. Add a token first, then compose it through the component.
- Competitor references can inform workflow principles, but Creator UI must remain our own product pattern: quiet writing surface, semi-resident assistant, decision queue, and author-controlled candidate apply flow.
- `CreatorLoginSurfaces` owns only the signed-out Creator surfaces: `CreatorLoginPanel` and `CreatorLockedWorkbenchPreview`. `LocalCreatorApp.tsx` may keep session state, email input state, and callbacks, but it must not rebuild either surface as page-local JSX. The former static `CreatorLocalLoopPanel` is deleted because it duplicated the authenticated, data-backed `CreatorTodayPathPanel` without owning data, state, navigation, or an author action.
- `CreatorExternalEchoInboxCard` is the canonical WP4 owner for normalized request, comment, highlight, reaction, question, and vote-aggregate rows. It exposes stable reader-signal/source/reminder attributes plus `creator-external-echo-card*` data slots, keeps the public source in a semantic `figure`, keeps the local reminder in a separate `section`, and offers only explicit author actions through one solid shadcn `Card` with `Button`/`Badge`/`CardFooter`. It must not nest `CreatorActionBar`, add page-global CSS, or change the source/reminder data contract.
- `CreatorExternalEchoDetailPanel` owns the selected-signal detail surface. Its single outer glass `Card` uses a context `dl`, public-source `figure`, private local-interpretation `section`, shadcn `CardFooter`, and a shadcn `Alert` empty state. It must visibly separate `读者回声` from `本机判断`, expose stable `creator-external-echo-detail*` slots, avoid nested glass, and never imply that a deterministic suggestion has already become an author-owned reminder.
- `CreatorEchoQueueCard` is retained only for the request compatibility flow. It must show the reader's wish, `读者愿望 -> 可写场景 -> 作者一问`, plus a `马上做` next step before action buttons, and must not become the canonical multi-source inbox row again.
- `CreatorEchoStatusStrip` owns the `/creator/requests` External Echo overview strip. It must show echo-state counts, `当前显示`, and the active sort label through shadcn `Card`/`Badge` composition; the page may compute counts, but must not rebuild the strip as page-local rounded `div` markup.
- `CreatorEchoNextActionPanel` owns the top `/creator/requests` priority assist panel. Inside the route's existing glass layer it must render exactly one solid shadcn `Card` (`variant="default"`, radius no greater than 8px), with a semantic reader-quote `figure`, three-cell context `dl`, three-step writing-path `ol`, and a `CardFooter` action group. Stable `creator-echo-next-action*` data slots are the test and ownership seam; desktop uses three columns and narrow layouts collapse to one. The panel must keep `今天先写`, the reader quote, work/line/same-echo context, `作者一问`, `可写场景`, `马上做`, and the existing shadcn `Button` handoffs without nested glass or page-global CSS.
- `CreatorEchoDecisionPanel` owns the `/creator/requests` pre-writing judgment panel. It must show `动笔前判断`, reader quote, author question, scene seed, chapter promise, same-echo pressure, and the two author actions `带着这一问去写` / `只看同类回声`.
- `CreatorEchoWritingRail` owns the `/creator/requests` right rail for the selected echo. It must show `写作入口`, `处理顺序`, reader wish, author question, work/line/vote context, reader-perspective action, same-echo view, reject confirmation, and start-writing action through shadcn `Card`/`Button`/`Badge` plus `ConfirmActionDialog`; the page may compute selected values, but must not rebuild those right-rail panels as page-local `Panel` markup.
- The former `CreatorRequestQueueCard`, `CreatorRequestStatusStrip`, `CreatorRequestNextActionPanel`, `CreatorRequestDecisionPanel`, and `CreatorRequestWritingRail` paths are deleted. Do not recreate aliases or compatibility wrappers; active Creator code uses only the `CreatorEcho*` owners above.
- `/creator/requests` must render normalized rows through `CreatorExternalEchoInboxCard` and the selected public/private boundary through `CreatorExternalEchoDetailPanel`. Request-only priority and decision panels may render only when the selected normalized signal resolves to a legacy request source.
- `CreatorTodayPriorityPanel` owns the Today page's current focus, judgment metrics, writing-route steps, responsive composition, and semantic metric/step states through shadcn `Card`/`Button`/`Badge` plus stable data slots. `/creator` may compute request, draft, and publish state, but it must pass `metrics` and `steps` into this component instead of rebuilding a page-local decision strip, route rail, or `.creator-today-*` global CSS family.
- `CreatorDashboardPriorityPanel` owns the Today page's route-level priority wrapper. `/creator` may pass request, draft, publish, and callback state, but it must not rebuild the priority lead, judgment metrics, or route steps as a page-local `DashboardPriorityPanel`.
- `CreatorTodayPathPanel` owns the Today path across External Echo, private drafts, PublishBundles, and work structure. `/creator` may compute counts, disabled states, and callbacks, but it must pass them as path items into one shadcn glass Card with a semantic ordered list. The component must not recreate four nested glass category cards or use page-global CSS.
- `CreatorTodayEchoStatusPanel` owns the Today page's External Echo trajectory. `/creator` may pass the current phase plus pending, entered-creation, published, and not-adopted counts, but it must not rebuild a page-local metric helper or nested `LiquidGlassMetric` cards. The component uses one shadcn glass Card, a semantic three-cell `dl`, explicit loading/error language, stable data slots, and no page-global CSS.
- `CreatorTodayContextRail` owns the Today page's read-only context rail. `/creator` may pass phase, current work status, and display-ready latest work/branch values, but it must not rebuild four route-local glass Panels. The component uses one shadcn glass Card, a semantic four-item `dl`, explicit loading/error/empty language, stable data slots, and no page-global CSS or interaction side effects.
- `CreatorWorkReadinessPanel` owns the Today page's `作品准备状态` surface. `/creator` may pass works, branches, chapters, requests, phase, and `onOpenWorks`, but it must not rebuild readiness metrics or recent-work rows as a page-local function. The ready state uses exactly one shadcn glass Card; readiness metrics are a flat semantic `dl`, recent works are a compact semantic `ul`, and loading/empty/error states remain explicit without page-global CSS.
- `CreatorAuthorDecisionCard` owns reusable Creator assistant judgment outside the editor. It must turn the current work-line or publish-check context into `作者一问`, decision basis, and a next author action using shadcn `Card`/`Badge`/`Button`; pages may compute the question and labels, but must not replace it with raw status rows.
- `CreatorWorkStructureStrip` owns the Works page's structure summary: main/IF counts, published chapters, open echo pressure, and lines needing content. `/creator/works` may pass branch, chapter, and request arrays, but it must not rebuild `作品结构`, `公开章节`, `请求压力`, or `待补线索` cards as a page-local `WorkStructureStrip`.
- `CreatorBranchLineCard` owns each work-line row in `/creator/works`. It must separate `主线` and `IF 支线` visually, show request pressure, chapter previews, branch anchor, last update, explicit `查看 / 正在看` selection, `开始写`, and archive confirmation through shadcn `Card`/`Button`/`Badge` plus `ConfirmActionDialog`. `/creator/works` may compute counts and labels, but must not rebuild branch cards as page-local markup.
- `CreatorPublishBundleContextPanel` owns the right-side publish context in `/creator/publish`. It must combine destination confirmation and linked reader-request context through shadcn `Card`/`Badge` composition, so the page does not duplicate a second page-local `发布影响` panel beside `CreatorPublishBundleImpactStrip`.
- `CreatorPublishBundleImpactStrip` owns the publish-impact summary in `/creator/publish`. It must show `读者端展示`, `章节挂点`, `请求影响`, and `失败保护` through shadcn `Card`/`Badge` composition before the author confirms public release. `/creator/publish` may compute labels, but must not rebuild `发布影响总览` as a page-local function.
- `/creator/requests` right rail must use `CreatorEchoWritingRail` with `写作入口` and `处理顺序` product language. Do not regress to backend-like labels such as `请求详情`, `状态规则`, or generic task CTAs such as `整理成写作任务`.
- `CreatorSettingsBoundaryStrip` owns the four-item Local Workspace boundary summary: `本机记录`, `备份恢复`, `创作设备`, and `公开规则`. `/creator/settings` may compute state, but it must pass those existing values into one solid shadcn `Card` with a semantic `dl`, ready/pending badges, stable `creator-settings-boundary-*` data slots, four desktop columns, and one narrow column. Nested glass cards, lift motion, and page-global CSS are forbidden.
- `CreatorLocalWorkspacePanel` owns the Local Workspace summary: `本机保存`, `导出备份`, `助手权限`, and `操作记录`. `/creator/settings` may compute snapshot counts and export callbacks, but must pass them into exactly one shadcn glass `Card`: a semantic seven-item records `dl`, three-item permission `ul`, operation `ol` or shadcn `Alert` empty state, and a `CardFooter` backup action band. Stable `creator-local-workspace-*` slots, two desktop content columns, one narrow column, <=8 px radius, and author-visible backup reachability are required. Nested Cards, lift motion, and page-global CSS are forbidden.
- `CreatorWorkspacePreferencesPanel` owns reduced-motion, reduced-transparency, and author-confirmed preference reset in `/creator/settings`. It composes shadcn `Card`, `Checkbox`, and `Button` plus `ConfirmActionDialog`; model, provider, service-address, and credential controls must not return to the product surface.
- `CreatorSettingsStatusRail` owns the Settings right rail: `当前状态`, `工作台准备度`, `公开边界`, and `发布承诺`. `/creator/settings` may compute client, readiness, flag, and promise values, but must not rebuild those four status panels as page-local `Panel` markup.
- `CreatorSessionRail` rows stay inside the rail width through component-owned token classes and stable data slots. Titles clamp to one line and details clamp to two lines visually, while the full text remains in the DOM for assistive technology; page-global session selectors may not return.
- `CreatorAgentComposer` must show an executable action queue before the guided focus card and freeform textarea. The author should first see what the writing partner can do now, then see the current recommendation, context, and natural-language override.
- `CreatorReviewCommandBar` keeps a one-line natural-language command entry inside the review dock. When the author is reading quality, impact, branch, or rationale cards, they must still be able to say "补写一段", "压低解释", "看影响", or "支线试写" without leaving the review context.
- `CreatorCreativeReviewDock` owns the writing desk's four-tab review assembly: quality issue card, story impact, branch trial, suggestion rationale, command parsing, and current-review cue. `/creator/editor` may compute pure view models, but it must not rebuild `CreativeReviewDock`, `QualityIssueCard`, review tabs, or review-command suggestions as page-local JSX.

# Routing Infrastructure

- `HashRouteBridge` lives under `app/src/components/patterns` and is mounted only in the BrowserRouter entry. It converts legacy review links such as `#/creator/editor?...` into `/creator/editor?...` so reviewers do not land on the default Creator surface by mistake.
- `HashRouteBridge` is non-visual infrastructure. It must not render product copy, mutate visible DOM, or replace HashRouter mode; HashRouter builds still own hash routes directly.
- In `/creator/editor`, local writing shortcuts from `CreatorAgentComposer` take priority over the global command palette: `⌘K` rewrites the current prose, `⌘L` asks for the next decisive question, and `⌘I` opens the impact review. Visible shortcut labels must be backed by working keyboard handlers and browser QA.
- `CreatorStoryHandoffPanel` owns the guided-coach handoff strip from creative question to draft, story impact, and publish confirmation. `/creator/editor` may compute readiness booleans and callbacks, but it must not rebuild `创作接力`, `问题 → 正文 → 状态 → 确认`, or `creator-story-handoff-step` as a page-local `StoryHandoffPanel`.
- `Tab 补全` must also work as a real keyboard shortcut while the正文 field is focused; it cannot be proven only by clicking the visible `Tab 接受` button.
- `CreatorEditorAssistPanel` must show a candidate adoption plan before action buttons. Every generated title, question, prose insert, rewrite, or IF branch candidate needs to tell the author what adopting it will change before the author clicks.
- Compact assistant mode may hide long focus explanations, but it must not hide the command form. Active candidate review should still leave a visible path for the author to ask the assistant for a rewrite, continuation, question, impact check, or branch trial.
- `CreatorEditorReadinessStrip`, `CreatorProgressRail`, and `CreatorMissionProgressRail` are implemented by `CreatorProgressPanels.tsx`. The owner shows `正文字数`, `草稿保存`, `发布去向`, `关联请求`, and the missing items blocking PublishBundle confirmation through shadcn `Card`/`Badge`/`Button` composition. The root surfaces expose stable `data-slot` hooks and own their background, border, and shadow through semantic progress tokens; the retired `.creator-editor-workspace .creator-progress-rail` page-global selector may not return. `/creator/editor` may compute values and command callbacks, but the strip/rail markup, product labels, route transition, and command semantics stay separately owned.
- `CreatorInlineReviewPanel` and `CreatorEditorReviewRail` are implemented by `CreatorInlineReviewPanels.tsx` through shadcn `Card`, `Badge`, and `Button`, semantic Creator tokens, compact horizontal containment, and stable `data-slot` hooks. `/creator/editor` may compute review items from title, prose, reader wish, and direction, but it must not rebuild `正文诊断` or `行内审阅`, and the former `.creator-inline-*` / `.creator-editor-review-*` page-global selector families may not return.
- `CreatorEditorDecisionQueuePanel` owns the editor decision-queue assembly from reader-wish presence, prose/title/destination readiness, and writing-direction label into `CreatorDecisionQueue` cards. `/creator/editor` may pass callbacks, but it must not rebuild `创作问题`, `修复建议`, `发布判断`, or `现在先做` as a page-local `DecisionQueuePanel`.
- When an active candidate exists, `CreatorAgentWritingAssistantPanel`, `CreatorAssistantDock`, and `CreatorAgentComposer` switch to compact mode so the author sees the candidate and adoption plan without scrolling through repeated guidance first.
- Right-rail candidate text may scroll inside its own block, but the adoption plan must stay visible in the first candidate-review view. Long generated text should never push `采纳方式` below the fold.
- `CreatorDestinationPanel` defaults to a current-destination summary plus a Radix/shadcn `Collapsible` edit affordance. Destination fields should not stay expanded in the editor right rail unless the author asks to modify them.
- `CreatorDestinationPanel` and `CreatorBundleReadinessPanel` are implemented and imported directly from `CreatorDestinationPanels.tsx`.
- `CreatorDestinationPanels.tsx` owns the readable flat destination surface, semantic readiness-chip border, `max-xl` two-column control/chip compaction, and stable destination/readiness data slots. Page-global `.creator-destination-*` and `.creator-publish-readiness-*` selectors may not return; route owners supply values, controls, readiness, and callbacks only.
- `CreatorAuthorStatusPanel` and `CreatorCanonCommitBar` are implemented by `CreatorCommitPanels.tsx`; their author-confirmation behavior remains callback-driven and author-controlled.
- `CreatorSessionRail`, `CreatorStoryMap`, and `CreatorReaderWishPanel` are implemented by `CreatorStoryContextPanels.tsx` through flat shadcn `Card`/`Button`/`Badge` composition, semantic rail tokens, stable data slots, contained session text, and component-owned Story Map rows/icons. Editor Rails consumes the implementations directly and view-model builders consume their contracts directly; the former `.creator-session-*`, `.creator-story-map*`, and `.creator-reader-wish-panel` selectors may not return.
- `CreatorGuidedCoachFrame`, `CreatorSocraticPlanBoard`, and `CreatorLocalSettingLibrary` are implemented by `CreatorSocraticPanels.tsx`; Guidance, Rails, and Socratic view models consume the owner directly. The plan board uses one solid shadcn Card, a semantic five-stage `ol`, a single active-stage `section`, an asset-kind `ul`, a CardFooter capture action, and stable `creator-socratic-*` data slots. It does not own route state, local-setting persistence, Agent execution, or publication.
- `CreatorAssistantSidecarFrame` and `CreatorAssistantSidecarSurface` are implemented by `CreatorAssistantSidecar.tsx`; Creator App Frame and command-candidate service consume the owner directly.
- `CreatorCommandCenterFrame` and `CreatorCommandPaletteSurface` are implemented by `CreatorCommandPalette.tsx`; the owner uses a body-level modal portal, shadcn Card/Button/Badge/Input, semantic intent/context `dl`, command `ul`, Creator command tokens, stable data slots, responsive one-column containment, and solid reduced-transparency states. Page-global palette `.creator-command-*` selectors may not return. `CreatorCommandCandidateFrame` and `CreatorCommandCandidateSurface` are implemented by `CreatorCommandCandidate.tsx`. Creator App Frame and command service consume both owners directly, while command meaning and candidate execution remain outside the palette.
- `CreatorReviewDockFrame`, `CreatorReviewCommandBar`, and `CreatorCreativeReviewDock` are implemented by `CreatorReviewDock.tsx`; Editor Rails consumes the dock directly.
- `CreatorQualityIssueCard` and its presentation contract are implemented by `CreatorQualityPanels.tsx` through shadcn `Card`, `Badge`, and `Button`. Metrics and issues are component-owned repeated cards, evidence remains an unframed semantic `dl`, and no `.creator-quality-*` page-global CSS owner may return. Deterministic quality checks remain in the quality view-model owner.
- `CreatorStateDiffPanel`, `CreatorBranchSandboxPanel`, and `CreatorFlightRecorderPanel` are implemented by `CreatorImpactPanels.tsx`; controller and view-model owners retain decision construction and state transitions.
- `CreatorInlineReviewPanels.tsx` and `CreatorProgressPanels.tsx` are direct implementation owners and direct import targets for their components and contracts.
- `CreatorParagraphJudgmentFrame`, `CreatorEditorCursorAssistBar`, `CreatorParagraphJudgmentPanel`, and `CreatorStoryHandoffPanel` are implemented by `CreatorDraftGuidancePanels.tsx`. Editor route, manuscript stage, and guidance composition consume the owner directly; command execution and route transitions stay outside it.
- `CreatorStoryFlowRail`, `CreatorFlowStepper`, `CreatorPrivateDraftPanel`, `CreatorNextActionPanel`, `CreatorNextBestActionCard`, `CreatorCollapsibleOutline`, and `CreatorChapterPlannerPanel` are implemented by `CreatorPlanningPanels.tsx`. Route/manuscript/rails consume the components directly, while Socratic and session view models consume only their contracts. `CreatorFlowStepper` owns its shadcn navigation, semantic thin scrollbar, `max-xl` compaction, and stable root/header/current/track/step data slots; `.creator-flow-stepper` and `.creator-flow-track` global selectors may not return. The chapter planner uses shadcn `Card`/`Badge`/`Button`, a semantic ordered list for goals, description lists for direction tradeoffs, Creator tokens, and stable `data-slot` hooks. Its Socratic data owner derives the goal from the linked Reader wish and current-work local setting assets, requires explicit author tags for clue/held-back semantics, and returns truthful empty states instead of product fixtures. The former `.creator-chapter-goal-*`, `.creator-flow-index`, and `.creator-direction-*` page-global selectors may not return.
- `CreatorEditorDecisionQueuePanel` and `CreatorDecisionQueue` are implemented by `CreatorDecisionPanels.tsx`. Editor Rails consumes the wrapper directly; decision callbacks and command semantics remain outside the component owner.
- `CreatorEditorAssistPanel`, `CreatorGhostCompletionPanel`, `CreatorInlineAssistBar`, and `CreatorWritingCommandShelf` are implemented by `CreatorInlineAssistantPanels.tsx`. Rails/manuscript consume the components directly and assistant view models consume only contracts; Agent action execution and text mutation remain outside the owner.
- `CreatorAgentWritingAssistantPanel`, `CreatorAgentComposer`, and `CreatorAssistantDock` are implemented by `CreatorAgentAssistantPanels.tsx`. The owner uses exactly one solid shadcn Card root; Tabs, Alert, Button, Textarea, Collapsible, Separator, and CardFooter provide internal structure without nested Cards. The Composer is a semantic `section`, actions are a `ul`, shortcuts use `kbd`, recommendation copy uses a non-interruptive `note` role, compact disclosure remains component-owned, controls stay at or below 8px radius, and stable `creator-assistant-*` / `creator-agent-*` data slots support browser/Agent verification. Page-global assistant selectors may not return. Editor Rails consumes the wrapper directly; the action registry/manifest, operation flow, services, text mutation, and route state remain outside the component owner.
- `CreatorShortcutBar` and `CreatorWritingWorkspaceFrame` are implemented by `CreatorWorkspaceShell.tsx`. Creator App Frame and Editor route consume them directly. The former `CreatorWritingWorkspace.tsx` compatibility barrel is deleted, and `check:slicing` prevents path recreation or renewed imports.
- `CreatorCanonCommitBar` owns the writing desk's formal story-confirmation strip. `/creator/editor` may pass readiness booleans, destination labels, blocker copy, loading state, and author callbacks, but it must not rebuild `正式剧情确认`, `详细处理`, or `更多处理方式` as page-local JSX.
