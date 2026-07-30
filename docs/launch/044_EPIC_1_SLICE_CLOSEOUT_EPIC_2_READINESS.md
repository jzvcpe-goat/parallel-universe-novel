# Epic 1 Slice Closeout And Epic 2 Readiness

Date: 2026-07-10

## Decision

This record closes one evidence-backed Epic 1 deletion slice and records the later evidence boundary that promotes Epic 2 after WP5. It does not close all of Epic 1 and does not promote Epic 3 or Epic 4.

The completed slice removes:

- the former `CreatorWritingWorkspace.tsx` compatibility barrel after all active consumers moved to direct owners;
- `usePrototypeScripts.ts` and `useWorkbenchScripts.ts` after active Creator persistence moved behind local repository seams;
- the already classified legacy request and publish component paths and hook families covered by the current slicing gates.

No page visual, route, product copy, DOM, CSS declaration, Agent action, publish behavior, or backend contract changed in this slice.

## Epic 1 Slice Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| Workspace owner split | Pass | Shell, Socratic, assistant, command, review, planning, and inline-assistant owners are direct import targets |
| View-model compatibility export retirement | Pass | Session and quality builders have direct route/controller consumers; the core view-model owner no longer re-exports or aggregates them, and focused gates reject their return |
| External Echo compatibility API refinement | Pass | Canonical multi-source filter/sort/selection/count/priority/freshness view models live in `creatorEchoSignalViewModels.ts`; `creatorEchoRouteController.ts` retains request-backed compatibility decisions only; injectable ports remain explicit contracts; and focused gates reject superseded request-only APIs, unused label wrappers, exported result unions, exported filter state, and exported owner-private scene/cluster helpers |
| Route-service API refinement | Pass | Today, Works, Local Workspace, and PublishBundle load services retain replaceable ports, declared inputs, and intentionally testable pure helpers while seven unconsumed local snapshot/result types remain owner-private; route/data gates reject their return as public compatibility API |
| Retired workspace path | Pass | File absent; `check:slicing` rejects path recreation and renewed imports |
| Prototype persistence paths | Pass | Both workbench hooks absent; storage gate no longer allowlists them |
| Disabled autosave placeholder | Pass | The zero-consumer no-op policy owner is absent; slicing rejects its path and identifiers, while M4/data-map gates keep saves author-triggered and forbid route-owned timers or implicit writes |
| Local storage boundary | Pass | Creator records remain behind IndexedDB/local repositories; the generic token helper is deleted and unchanged auth keys are isolated behind the separately classified auth-session owner |
| Global CSS orphan and atomic-owner slices | Pass | Zero-consumer continuation, assistant wrapper, Socratic row/followup, flow-card/mini, Reader toolbar, old Reader tool-button, nested Today task-card, and static Today loop hooks are absent; quality, progress, flow-stepper, chapter-planner, inline-review, story-context, destination/readiness, command-palette, cross-page author-decision, Works branch-line, External Echo status-strip/next-action, and data-backed Today surfaces own their shadcn/token composition. The former `.creator-quality-*`, page-global progress, `.creator-flow-stepper`, `.creator-flow-track`, `.creator-chapter-goal-*`, `.creator-flow-index`, `.creator-direction-*`, `.creator-inline-*`, `.creator-editor-review-*`, `.creator-session-*`, `.creator-story-map*`, `.creator-reader-wish-panel`, right-rail `.creator-destination-*`, `.creator-publish-readiness-*`, command-palette `.creator-command-*`, cross-page `.creator-author-decision-*`, Works `.creator-line-card*`, External Echo `.creator-echo-status-*` plus next-action copy/detail/actions/chips/quote/writing-brief hooks, `.creator-task-*`, `local-creator-loop*`, and `.creator-next-action` families are absent. Reader reading controls remain shadcn/token-owned, and Reader page-scroll remains for browser pseudo-elements. |
| Global component-prototype CSS retirement | Pass | Old ChoiceCard aliases, command surface, tour highlight, and manuscript paper rules are absent; live ChoiceCard and ReadingPaper components retain their direct token-owned presentation |
| Duplicate variant metadata retirement | Pass | The unused `design-system/variants.ts` mirror is absent; Button, Badge, and Card retain direct executable CVA owners |
| Historical UI reference boundary | Pass | Eight July 1/pre-Pivot UI snapshots and plans remain available as evidence but carry a uniform non-authoritative marker; `check:historical-reference-boundary` binds them to the current Pivot contract, execution plan, ownership matrix, and gates |
| Old-framing allowlist refinement | Pass | The compatibility allowlist contains 5 exact `app/src` owners instead of 129 mixed entries; the gate rejects stale/missing/out-of-boundary exemptions, distinguishes stable cloud-facade names from product framing, requires the cloud request facade to use External Echo failure language, and no longer treats current `CreatorPublishBundle`, `CreatorBundleReadinessPanel`, the PublishBundle route and services, or `今日创作路径` names as legacy framing. Nine non-TSX transition owners, the quality/progress owners, seven additional Writing Desk owners, and the active PublishBundle route now use PublishBundle product language without renaming routes, remaining compatibility controls, or stable Agent action IDs. |
| Public Pages QA contract | Pass | The stale public Creator journey is replaced by real Reader hash-route proof: `/create` redirects to Library, Home enters Library, no Creator conversation/dialogue surface appears, and readiness artifacts distinguish `publicUrl` from `creatorCompatibilityUrl` |
| Retired Studio page path | Pass | The zero-runtime-consumer `pages/Studio.tsx` owner is deleted; canon, runtime, design-system, and capability checks now consume an unrouted release-authoritative internal-ops contract |
| Retired Welcome page path | Pass | The zero-runtime-consumer `pages/Welcome.tsx` marketing prototype is deleted; `/welcome` remains a current Reader Home route and public-boundary scanners no longer keep the dead file alive |
| Retired realtime/error prototype | Pass | The unowned WebSocket retry client, pseudo-test vector, error matrix, and orphan event type are deleted; no product live-update behavior changed because neither dual entry nor any bundle consumed them |
| Retired Hook/API shims | Pass | Fixed-error Showcase/Soul/Studio hooks and unsupported-only API owners are deleted; duplicate Reader library calls are consolidated under the existing `storyApi` contract |
| Retired Reader story-state hook | Pass | The unrouted `useStory` state container is deleted; runtime-completion evidence now checks the live `Story.tsx -> storyApi` session boundary |
| Refined i18n resource | Pass | Only three runtime-consumed Reader navigation labels remain; unconsumed legacy AI/upload/community/Studio/currency copy is absent from both product bundles |
| Refined shared frontend compatibility surface | Pass | Unused Reader replay/stock-cover adapters, deviation/raw-color and formatting utilities, and eleven zero-consumer compatibility types are absent; active auth/account/Reader/subscription owners remain |
| Refined shared API barrel | Pass | The five runtime-consumed `@/api` owners remain; low-level client, Creator, Market, and Commercial Blueprint contracts are no longer re-exported through a broad compatibility surface |
| Retired browser demo seed and probe hooks | Pass | The unused backend-status probe/cache hooks, standalone Reader health probe, and implicit starter-work/main-branch browser bootstrap are absent; explicit runtime configuration, authorized product owners, and the server transaction remain |
| Reader request/vote facade separation | Pass | The routed Reader surface uses `pmfSupabaseReader.ts` exclusively; the Creator/cloud facade no longer duplicates anonymous Reader login, request create/list, or voting behavior |
| Cloud-facade/local-repository separation | Pass | Zero-consumer local draft, reminder, writing-asset, display-preference, localhost, and workspace-snapshot wrappers are absent from `pmfSupabase.ts`; active routes/services import the dedicated local owners directly |
| Refined cross-domain runtime exports | Pass | Four zero-consumer Reader harness, Echo registry, Agent event-query, and legacy key-map exports are absent while their active behavior owners remain unchanged |
| PublishBundle input ownership | Pass | The local package owns `CreatorPublishBundleInput` directly; retired `PmfPublishInput` cloud-facade and fixture mirrors are absent, while the confirmed server transaction contract remains separate |
| Local-domain cloud dependency boundary | Pass | One executable gate scans Agent, Creator Pivot, and local DB owners; only the named PublishBundle adapter may import the transaction facade, and no scanned owner may construct a cloud client or direct browser transport |
| Agent surface | Pass | Historical closeout accepted 22 manifest actions; the current registry has 24 registered component actions, typed execution, and real-Chrome recovery contracts |
| Agent execution API refinement | Pass | Action/schema registries, injectable lifecycle, confirmation request/cancel safety, operation input, and executable flows remain public; six zero-consumer implementation leaves are owner-private behind Agent and slicing gates |
| Creator Pivot domain API refinement | Pass | CreativeReminder, six-source ReaderSignal/External Echo, and PublishBundle handoff behavior seams remain public; six zero-consumer helper/base/input leaves are private to release-authoritative owners behind focused domain and slicing gates; the `syncAsIs` Reader adapter stays unchanged |
| Shared adapter/frame API refinement | Pass | Identity mapping, membership labels, local-surface/session actions, shortcut binding, and candidate dispatch remain public; three adapter helpers and one shortcut-handler leaf stay owner-private behind slicing and Creator gates |
| PublishBundle boundary | Pass | Bundle schema, SHA-256 package integrity, durable lifecycle, separate confirmation/submission, and receipt recovery remain green |
| Regression proof | Pass | Creator lint/tests, Reader/Creator builds, and authenticated six-route Chrome QA pass |
| Release source of truth | Pass | 373 shared files, 100 release-authoritative files, one managed package override |
| One-way local migration | Pass | Schema v6 preserves the v4 body/index and v5 coordination upgrades, adds package/import stores, keeps the pure merge fixture and atomic receipt transaction, and passes real-browser reload/conflict QA |
| Draft-body and workspace recovery | Pass | OPFS-preferred bodies, checksum-verified IndexedDB recovery copies, staged failure recovery, versioned ZIP transport, deterministic preview, author-confirmed import, rollback receipts, and post-import edit protection pass real Chrome QA |

## Epic 1 Remaining Work

Epic 1 remains `In progress` because these classified areas are still open:

- large global CSS retirement and atomic component ownership;
- remaining historical/reference surfaces beyond the newly bounded eight-file UI set, plus stale compatibility copy;
- final deletion receipts for every item still classified `Deprecate`.

The author-facing tool-setting slice is now closed: `CreatorSettingsToolPanel`, connection checking, active provider/model/service-address/credential-state writes, and Supabase-facade wrappers are deleted. `CreatorWorkspacePreferencesPanel` owns display preferences and confirmation; new workspace packages contain display preferences only. Older package shapes normalize to display preferences and discard retired tool settings. The historical meta record remains read-only through `legacyCreatorToolSettings.ts` until a separately approved data-cleanup migration.

The browser auth-session compatibility owner is now explicit and the generic
helper is deleted. Replacing its `localStorage` bearer-token transport is an
Epic 5 production-security dependency; it does not keep the Creator local-data
slice or this Epic 1 owner-deletion receipt open.

The Local Workspace view-model API is also narrowed without changing route or UI behavior. Its route input/output and component-consumed status/readiness/flag rows remain public; workspace-summary, operation-history, and permission leaf item types are owner-private and protected by M7 plus slicing gates.

The Writing Desk action-input API follows the same rule: draft-save, publish-check, and setting-capture builders remain public seams, while their two unconsumed input-composition interfaces are owner-private behind M4 and slicing gates.

Creator Pivot feature flags are now explicitly classified as disabled governance metadata, not an executable rollback mechanism. Slicing rejects application runtime imports during S0-S8; current V2 aliases roll back through registry code until Epic 4 approves and verifies a runtime cutover owner.

Five pure Writing Desk controllers also expose only real cross-owner type contracts. Eleven zero-consumer bootstrap, draft, setting, selection, and suggestion leaf shapes are owner-private behind M4 and slicing gates; behavior functions and imported query/result/readiness/patch contracts remain unchanged.

The matching Writing Desk service layer now keeps sixteen zero-consumer context/input/result/cancel/snapshot shapes owner-private while preserving replaceable persistence/API/timer/event ports and every submit/save/patch/result type imported by another owner.

The same public-API rule now covers the remaining pure Editor/Works leaf shapes: startup/command-patch input composition, IF-branch options, Socratic choices, Works selection patches, and Works decision steps are inferred behind their owner functions instead of exported as unused compatibility contracts. Replaceable ports, declared service inputs, behavior functions, and cross-owner result contracts remain public.

The browser-owned direct publish helper is no longer an open Epic 1 item: WP6 replaced it with the server-owned transaction adapter and anti-regression gates. Global CSS retirement is active: the post-WP6 slices remove unused Writing Desk continuation, obsolete assistant focus/tag/wrapper, Socratic row/followup, flow-card/mini, Reader toolbar/tool-button, old catalog/recommendation, generic narrative-card/glow/deviation-class, animation-delay/fade-in, Local Creator shell aliases, superseded author-entry/phone/world/Codex/rain presentation hooks, nested Today task cards, and the redundant static Today loop. Data-backed Today components now own the authenticated route; `ReaderReadingToolButton` owns reading-paper controls through shadcn and tokens, while `reader-page-scroll` retains its active scrollbar owner. The zero-runtime-consumer `features/narrative-workbench` demo package and its dedicated `narrative-input` selector are deleted rather than moved into another compatibility owner. The unrelated zero-consumer `AuthModal`, `DemoNotice`, `FeatureUnavailable`, and `LoadingState` prototype patterns plus their sole-use `Card` compatibility wrapper are also deleted; current shadcn primitives and routed auth/loading/error owners remain. The unreachable `components/tokens` visual-prototype package, its particle/node animation hooks, its unowned deviation tokens, and the contradictory isolated `Fix_Verification_Report.md` are deleted as one evidence-backed chain. The shared frontend compatibility layer now also excludes its unused Reader replay/stock-cover adapters, deviation/raw-color and formatting utilities, and eleven zero-consumer Studio/Soul/deviation/payment/export type exports while keeping active auth/account/Reader/subscription owners. Its browser API boundary also removes the unused backend-status reset, standalone Reader health probe, and implicit starter-work/main-branch seed path, so prototype setup cannot reappear beside the accepted explicit product flows. The zero-runtime-consumer browser realtime/error prototype is deleted with its orphan event type; active External Echo uses the accepted pull/cache/freshness boundary rather than that unused WebSocket experiment. Fixed-error Showcase/Soul/Studio hooks, unsupported-only APIs, and duplicate Reader-library hooks/API are deleted; the duplicate zero-consumer `useStory` state hook is also deleted, while `Story.tsx -> storyApi` is the sole live Reader session owner. The i18n resource now contains only the three consumed Reader navigation labels, so legacy AI/upload/community/Studio/currency copy no longer ships in Reader or Creator bundles. The zero-runtime-consumer `pages/Studio.tsx` path is also deleted; its still-required quality/canon/trend/capability evidence lives in the unrouted `features/internal-ops/StudioOpsSurface.tsx` owner and is blocked from Reader/Creator imports. The zero-runtime-consumer `pages/Welcome.tsx` path is deleted as well; `/welcome` remains owned by current Reader Home instead of the retired inline-nebula marketing prototype.

The active quality-card slice is an ownership migration rather than a zero-consumer deletion. `CreatorQualityPanels.tsx` composes solid semantic shadcn cards inside the existing glass review dock, keeps evidence unframed, exposes stable `data-slot` hooks, and uses component-owned responsive layout. The former metric/issue/evidence/fix/pass/explanation selectors and their reduced-transparency/mobile residues are deleted; real Chrome confirms no horizontal overflow and no nested backdrop filter.

The progress-panel follow-up is likewise an ownership migration, not an IA cutover. `CreatorProgressPanels.tsx` retains the existing shadcn footer composition and callbacks while owning its background, border, and shadow through semantic token classes and stable `data-slot` hooks. The former scoped progress selector is deleted, `index.css` falls from 7,107 to 7,101 lines, and real Chrome must prove the footer remains non-transparent, shadowed, and free of horizontal overflow.

The chapter-planner follow-up is another bounded ownership migration. `CreatorPlanningPanels.tsx` retains the same goal data, direction callbacks, and selected state while expressing the active surface through shadcn primitives, semantic `ol`/`dl` structure, Creator tokens, and stable `data-slot` hooks. The former goal/index/direction selector families are deleted, `index.css` falls from 7,101 to 6,917 lines, and real Chrome proves four goals, three direction choices, exactly one selected choice, and no horizontal overflow.

The flow-stepper follow-up keeps the same eight stages, readiness calculation, current-step semantics, and parent callback. `CreatorPlanningPanels.tsx` now owns the semantic scrollbar and medium-width compaction through token utilities and root/header/current/track/step data slots. The former stepper/track selectors are deleted, `index.css` falls from 6,917 to 6,882 lines, and real Chrome proves one current step, a 6px desktop scrollbar, no stepper overflow, and a hidden track at 962px.

The inline-review follow-up is a presentation ownership migration only. `CreatorInlineReviewPanels.tsx` keeps the four review items, labels, statuses, callbacks, and parent-owned fix decisions while composing the expanded diagnosis surface and the active manuscript rail from shadcn Card/Badge/Button plus stable data slots. The former inline-review and editor-review selector families are deleted, `index.css` falls from 6,882 to 6,704 lines, and real Chrome proves four non-overflowing markers in a non-overlay rail before the prose textarea.

The story-context follow-up also remains presentation-only. `CreatorStoryContextPanels.tsx` keeps session groups, draft-open callbacks, `open_draft` metadata, Story Map data, Reader Wish data, and empty-state copy while owning its three flat shadcn rail cards, semantic shadow, title/detail clamping, map grid, and icons. The former session/story-map/reader-wish selector families are deleted, `index.css` falls from 6,704 to 6,589 lines, and real Chrome proves three panels, five Story Map rows, semantic background/shadow, and zero panel/row horizontal overflow.

The destination/readiness follow-up remains presentation-only and leaves `CreatorEditorRails.tsx` untouched. `CreatorDestinationPanels.tsx` keeps the same destination children, disclosure state, five readiness inputs, action callback, and PublishBundle copy while owning a readable flat rail surface, semantic readiness-chip border, responsive two-column controls, compact chips, and stable data slots. The former 123-line right-rail destination/readiness selector family is deleted, `index.css` falls from 6,589 to 6,466 lines, and real Chrome proves expanded controls, five chips, zero overflow, collapsed recovery, and WCAG-AA title contrast at 962px.

The command-palette follow-up also remains presentation-only. `CreatorCommandPalette.tsx` keeps the same query state, matching, route scope, Agent action names, callbacks, candidate handoff, and visible product copy while owning the modal through a body-level portal, shadcn Card/Button/Badge/Input, semantic `dl`/`ul`, command tokens, stable data slots, a one-column narrow layout, and solid reduced-transparency surfaces. The former 190-line overlay/panel/brief/context/example/suggestion/item/empty selector family is deleted, `index.css` falls from 6,259 to 6,069 lines, and real Chrome proves correct modal layering, 8px panel radius, focused input, zero horizontal overflow, and desktop/narrow containment.

The cross-page author-decision follow-up is presentation-only. `CreatorAuthorDecisionCard.tsx` keeps the same Works and PublishBundle questions, basis rows, actions, disabled states, callbacks, copy, and shadcn composition while owning its semantic gradient, border, shadow, spacing, typography, responsive basis grid, and root/question/steps/step data slots. The former 69-line `.creator-author-decision-*` selector family is deleted, `index.css` falls from 6,064 to 5,994 lines, and real Chrome proves both routes still render one complete card. Before/after screenshots differ only inside the card boundary, with a maximum per-channel pixel delta of 2/255.

The Works branch-line follow-up is also presentation-only. `CreatorBranchLineCard.tsx` keeps the same branch records, main/IF choice, selection, chapter previews, request pressure, writing handoff, archive confirmation, callbacks, copy, and shadcn composition while owning its 3px semantic accent rail through root `data-slot` and `data-line-kind` metadata. The former 20-line `.creator-line-card*` selector family is deleted, `index.css` falls from 5,994 to 5,973 lines, and real Chrome proves both main and IF cards remain present. Before/after Works screenshots differ at only 164 pixels inside the branch-card region, with a maximum per-channel pixel delta of 1/255.

The External Echo status-strip follow-up remains presentation-only. `CreatorEchoStatusStrip.tsx` keeps the same normalized source rows, visible/total counts, sort label, copy, and shadcn Card/Badge composition while owning its spacing, responsive five-column source grid, semantic chip surface, typography, metadata layout, and root/content/grid/chip/meta data slots. The former 63-line `.creator-echo-status-*` selector family is deleted, `index.css` falls from 5,973 to 5,909 lines, and real Chrome proves six source states render in the accepted five-column layout. Before/after External Echo screenshots differ at only 256 pixels inside a 36-by-12-pixel text-antialiasing boundary, with a maximum per-channel pixel delta of 2/255.

The Local Workspace boundary-strip follow-up is also presentation-only. `CreatorSettingsBoundaryStrip.tsx` keeps the same seven inputs, four values, readiness rules, labels, and details while replacing four nested lift-enabled glass Cards with one solid shadcn Card and a semantic four-item `dl`. Stable root/list/item/status/value/detail data slots carry the atomic contract; desktop uses four columns and narrow viewports use one. No route, backup, preference, Agent, publication, persistence, network, or Supabase behavior changes.

The Local Workspace primary-panel follow-up remains presentation-only. `CreatorLocalWorkspacePanel.tsx` keeps the same seven summary values, three permission rows, operation rows/empty state, export callback, disabled import state, and backup copy while replacing three glass Cards plus nested boxed rows with one shadcn glass Card. Records use a semantic `dl`, permissions use `ul`, operations use `ol` or a shadcn Alert, and backup actions stay in one CardFooter. Real Chrome proves two desktop content columns, a three-column summary matrix with the final record spanning the remaining row, one narrow column, 40 px actions, reduced-transparency fallback, no overflow, and a backup footer reachable above the fixed mobile navigation. No route, package, import, persistence, Agent, publication, network, or Supabase behavior changes.

The later component-prototype CSS slice also removes the unconsumed `.choice-card`, `.choice-card-active`, `.command-surface`, `.tour-highlight`, and `.manuscript-paper` rules. The valid `choice-card` registry name remains, while current `ChoiceCard` and `ReadingPaper` presentation stays component-owned.

Token storage classification is closed: `parallel-universe-tokens.css` owns all system-level root, Reader, shadcn, Creator, workbench, and Writing Desk declarations. `index.css` consumes those values and retains only the active glass component's private `--pu-liquid-*-local` modifiers. The ownership gate and zero-difference Chrome evidence prevent both token leakage and visual drift.

## Epic 2 Readiness

Epic 2 may continue behind the active Epic 1 guardrails because its contract gates are available:

| Entry Capability | Current State | Promotion Requirement |
| --- | --- | --- |
| Local DB schema and repositories | Accepted | Keep migration, coordination, body/package, privacy, and recovery gates green |
| OPFS and body recovery | Accepted slice | Keep metadata prose-free, preserve the IndexedDB recovery copy, and reject staged/corrupt writes as saved |
| Legacy and workspace migration | One-way legacy import plus package recovery accepted | Keep legacy readers read-only and preserve preview, confirmation, integrity, rollback, and post-import edit protection |
| Agent surface | Accepted | Keep typed execution, author confirmation receipts, redacted lifecycle logs, candidate adoption separation, and real Chrome action flow free of page-owned semantics |
| PublishBundle | Accepted application/local slice | Preserve the accepted lifecycle while WP6 proves the server-owned transaction and atomic idempotency |

Verdict: **Epic 2 Local Creator Architecture is accepted on 2026-07-10; this does not accept Epic 3, WP6, Epic 4, or the remaining Epic 1 cleanup.**

### Accepted Epic 2 slice: cross-tab workspace coordination

The coordination slice is accepted without promoting all of Epic 2:

1. Web Locks is the primary per-record writer boundary.
2. IndexedDB revision compare-and-swap prevents stale overwrites and stores a recoverable local conflict.
3. BroadcastChannel carries redacted invalidation metadata only; focus and visibility recovery provide the refresh fallback.
4. `check:local-coordination` proves ownership, privacy, commit/conflict notifications, and recovery after a failed write.
5. `qa:local-db-cross-tab` proves the v1-to-v2 stale-writer conflict and a fresh v3 save in two real Chrome tabs.

### Accepted Epic 2 slice: draft-body ownership and workspace recovery

This slice is accepted without promoting all of Epic 2:

1. IndexedDB schema v8 extends the accepted v7 Agent-confirmation baseline with ReaderSignal source cursor/freshness records; durable draft metadata still contains no prose.
2. OPFS is the preferred manuscript-body store, while checksum-verified IndexedDB remains the universal recovery copy.
3. Staged writes remain recoverable and are never reported as saved; legacy inline bodies migrate under the record lock.
4. `.pufw.zip` packages carry a versioned manifest, records, bodies, and migration receipts with SHA-256 and byte-length evidence.
5. Preview and cancel are read-only; apply requires author confirmation and a declared conflict policy; rollback is package-backed and refuses to overwrite work edited after import.
6. `qa:workspace-export-import` proves real Chrome download/upload, corruption rejection, addition/overwrite rollback, and post-import edit protection.

### Accepted Epic 2 slice: Agent action execution and author control

This slice is accepted without promoting all of Epic 2:

1. The historical 22-action registry passed this closeout; the current 24-action registry, exact schemas, manifest v2 effects, executor, and tests agree through the current gate.
2. Routes submit intents through `creatorEditorAgentExecutionService.ts`; they do not own Agent persistence or publish confirmation semantics.
3. High-risk publish uses an expiring receipt bound to operation, action, target, and input hash; the receipt is consumed once.
4. Candidate proposal, author rejection, and adoption produce separate redacted lifecycle evidence without private prose or credentials.
5. Real Chrome proves open draft, Socratic question, candidate create/reject/adopt, local save, PublishBundle handoff, and confirmed publish.

### Accepted Epic 3 application/local slice: multi-source External Echo

This slice is accepted without promoting all of Epic 3:

1. Request, comment, highlight, reaction, question, and vote-aggregate adapters implement one typed normalization port.
2. Source id and normalized content hash deduplication, complete-snapshot tombstones, source cursors, fetched time, visibility, and offline freshness are deterministic.
3. Deterministic suggestions preserve author pin/use/dismiss, custom note, and draft association across refresh; public source text is not copied into private author interpretation.
4. `CreatorExternalEchoInboxCard` and `CreatorExternalEchoDetailPanel` are the canonical shadcn owners. The inbox is one solid Card; the detail keeps only one outer glass Card. Semantic public-source/local-interpretation regions, stable data slots, 40px actions, responsive containment, and the shadcn Alert empty state are accepted without nested ActionBar/StatePanel glass.
5. Request-only decision and status controls render only for a request-backed normalized signal and remain frozen compatibility owners.
6. Real Chrome proves six source states, schema v8 persistence, reload durability, two-tab propagation for pinned, used, and dismissed reminders, desktop/narrow containment, and mobile action reachability.
7. Production currently supplies request and vote batches. Comment, highlight, reaction, and question adapters are proven through isolated QA fixtures; their live cloud schema, RLS, and moderation remain Epic 5 work.

### Accepted Epic 2 slice: PublishBundle lifecycle and recovery

At its original acceptance point, this final Epic 2 slice did not claim the WP6 server transaction. Subsequent repository evidence now accepts WP6 without claiming live Supabase deployment:

1. Bundle preparation, review, author confirmation, export, public submission, and receipt application are separate durable states.
2. Canonical bundle files use SHA-256 integrity, immutable package bytes, and one idempotency key bound to confirmed content.
3. Cancellation leaves reviewed content recoverable; success replay returns the existing receipt; known failure may retry with the same key; an uncertain outcome blocks blind retry.
4. The current 24-action Agent surface separates local confirmation from the independently high-risk public submission action.
5. Real Chrome proves cancelled-confirmation recovery, author confirmation, ZIP export, one public submit, one receipt, reload durability, and published recovery.
6. `publishChapter()` is absent from active and QA application paths. The adapter calls `publishBundleTransaction()`, which invokes `publish_bundle_transaction` and consumes the server receipt. Atomic transaction, RLS, authorization, idempotency, and rollback behavior are repository-proven; live SQL application and strict receipt evidence remain deferred.

### Next dependency-ordered slice

The repository next-slice marker has advanced past WP6. The next deployment-dependent unit is live External Echo / strict Supabase evidence for the remaining Epic 3 and Epic 5 boundary. That external step is explicitly deferred in the current thread, so evidence-backed Epic 1 cleanup may continue without renaming routes or changing Creator IA. Epic 4 IA cutover remains blocked until the remaining live-source cloud/RLS requirements are green.

### Local continuation stop audit (2026-07-12)

The latest bounded audit found no additional unpaused local slice that can advance the product contract without crossing an explicit hold:

1. All five exact old-framing compatibility owners are explicitly deferred: the three route-adjacent Editor TSX owners, `features/parallel-universe/data.ts`, `design-system/page-contracts.ts`, and `features/internal-ops/StudioOpsSurface.tsx` comprise the classified set recorded by the allowlist (the three Editor files count as three owners).
2. At this closeout checkpoint, the only zero-literal CSS candidates were the five dynamic `CreatorTaskCard` priority classes and CanonCommit's `.is-gold`; both surfaces were explicitly paused. The later operator-authorized Today slices replaced the sole `CreatorTaskCard` owner, retired its CSS family, and deleted the no-data `CreatorLocalLoopPanel` plus `local-creator-loop*` hooks after the data-backed Today path made that explanation surface redundant. The apparent `googleapis` candidate remains the font import URL, not a selector owner.
3. The static TypeScript incoming-edge audit found only application/build roots, the Creator QA alias, governance metadata, read-only migration cleanup, preserved shadcn primitives, and explicitly deferred design-system/Create/internal-ops files. `i18n.ts` is not orphaned: `main.tsx` loads it through a side-effect import.
4. The remaining dependency-ordered implementation is the deferred live External Echo/WP6 Supabase proof. Creator IA, payment, and production remain correctly blocked behind it.

Do not manufacture progress by deleting preserved shadcn primitives, changing `syncAsIs` files, resuming paused UI/route owners, weakening gates, or renaming compatibility routes. Resume only when the operator authorizes the live Supabase unit or explicitly reopens one of the held local owners.

## Epic 4 Entry Gate

Creator UI IA refactor remains blocked until all of the following are true:

1. Local DB and migration durability are accepted.
2. Agent surface action ownership and confirmation flow are accepted.
3. ReaderSignal and CreativeReminder application/local boundaries are accepted, and their live-source cloud/RLS boundary is accepted.
4. PublishBundle lifecycle is accepted, and the WP6 server transaction handoff is accepted.
5. Epic 1 gates show no old request-management framing or deprecated owner imports.

Renaming navigation or pages is not evidence for this gate. UI cutover must follow the accepted data and action contracts.

## Verification Commands

```bash
npm run check:pivot
npm run check:local-coordination
npm run check:local-body-storage
npm run check:workspace-package
npm run check:reader-signal-adapters
npm run check:creative-reminder-flow
npm run check:publish-bundle-lifecycle
npm run check:publish-receipt-recovery
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-db-migration
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-db-cross-tab
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:workspace-export-import
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:publish-bundle-roundtrip
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:external-echo-inbox
npm run test:creator
npm run build:reader
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
npm run check:creator-m8-qa
npm run check:release-sync-manifest
npm run test
```

## Subsequent WP6 Update

WP6 repository implementation was accepted later on 2026-07-10. The former
`publishChapter()` browser-owned path is absent; `publishBundleAdapter.ts` now
calls the server-owned `publish_bundle_transaction` RPC and consumes its
authoritative receipt. `check:publish-transaction-contract` plus the isolated
PostgreSQL `test:publish-wp6` suite prove authorization, direct-write denial,
mainline/IF atomic commit, concurrent idempotency, conflict rejection, private
audit ownership, privacy, and forced rollback.

This update does not claim that the SQL delta is installed on the live Supabase
project. Epic 4 remains blocked by the strict live WP6 receipt proof and the
remaining Epic 3 comment/highlight/reaction/question cloud-source acceptance.

## Subsequent External Echo Cloud-Source Update

The four-source repository package was accepted on 2026-07-11 without
promoting Epic 3 or Epic 5. The forward and rollback deltas define comments,
highlights, reactions, questions, explicit safe-column grants, RLS, published
target/highlight checks, rate limits, author moderation audit, a
`security_invoker` projection, and a stable cursor RPC. The real Creator facade
now reads each source independently and preserves the last local cursor/cache
when one source fails. `check:external-echo-cloud-contract` and
`test:external-echo-cloud` pass against PostgreSQL 17.

Live Supabase application, strict author/Reader and four-source evidence,
export/delete, backup/restore, and incident recovery remain open. Epic 4 is
still blocked; this repository acceptance is not a UI cutover permit.
