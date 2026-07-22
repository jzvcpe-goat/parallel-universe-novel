# Creator Pivot Next Development Plan

Date: 2026-07-10

## 1. Purpose

This plan converts the `创作端UI设计计划` retrospective into the next executable development sequence for the current release worktree.

It is not a second UI redesign brief. It starts from the code that now exists and closes the architecture, data, Agent, External Echo, PublishBundle, and legacy boundaries that must be true before the final Creator IA is allowed to ship.

Writable source of truth:

```text
<repository-root>
```

Hard no-touch boundaries:

```text
<unrelated-project>
<legacy-integration-harness>
```

The second path is a read-only mirror. Historical packages, exported frontends, and research folders are evidence or reference material only; they are not implementation sources.

## 2. Product Contract Preserved From The Retrospective

The retrospective remains authoritative for five product decisions:

1. Creator is a localhost writing operating system, not a public request-management backend.
2. Reader comments, highlights, votes, wishes, and requests enter as `External Echo`; they are creative context, not tickets assigned to the author.
3. A working agent assists through a stable, risk-labelled action surface. It does not need an author-facing model/provider configuration workflow.
4. Suggestions remain candidates until the author accepts them. Publishing and canon changes always require explicit author confirmation.
5. Private prose, writing-library assets, CreativeReminders, intermediate candidates, and operation records remain local. The cloud owns published content, public feedback, authorization, and publish receipts.

The target product loop is:

```text
Reader feedback
  -> External Echo
  -> local CreativeReminder
  -> author and working agent create locally
  -> author-reviewed PublishBundle
  -> own-platform publish transaction or manual export
  -> PublishReceipt
  -> Reader-visible update
  -> new Reader feedback
```

## 3. Current-State Correction

The older retrospective described several missing foundations. Epic 2 is accepted through WP5 evidence; WP6 and the four-source cloud boundary are repository-accepted, while Epic 3 live acceptance, Epic 5 operations, Creator IA, payment, and production remain unaccepted.

| Area | Current Evidence | Correct Interpretation | Remaining Gap |
| --- | --- | --- | --- |
| Governance | Epic 0-7 roadmap, flags, inventory, ownership matrix, Pivot gates | Implemented and active | Keep current-state docs and gates synchronized |
| Legacy slicing | Route owners extracted; obsolete request/publish component families, browser-owned direct publish, prototype persistence hooks, the zero-consumer disabled-autosave placeholder, zero-consumer session/quality view-model re-exports, superseded request-only External Echo filter/sort/priority exports, owner-private Echo result/helper/filter exports, and seven unconsumed route-service snapshot/result exports, orphan Writing Desk CSS hooks and the zero-consumer `.creator-next-action` alias, Reader toolbar/tool-button, zero-consumer catalog/narrative/presentation hooks, obsolete Local Creator shell aliases, the old workspace barrel, author-facing tool settings, and the zero-consumer Studio page path removed; canonical multi-source Echo helpers plus one aggregate Echo page model, Today priority/draft/readiness derivations, Works work/branch/chapter/feedback derivations plus action-result/reload semantics, and Local Workspace readiness/status/record summaries each have one pure owner; reading-paper controls plus the Creator quality, progress, flow-stepper, chapter-planner, inline-review, story-context, destination/readiness, and command-palette surfaces have shadcn owners, system token declarations have one dedicated owner, ops evidence has an unrouted release-authoritative owner, eight pre-Pivot UI docs are machine-bounded as historical, the readiness leaf and PublishBundle route/load/action/browser owners are bundle-named, PublishBundle local-snapshot recovery decisions and React setter distribution have dedicated controller/applier owners, the cloud request facade uses External Echo failure language, Today/Shell copy uses `今日创作路径` and `发布包`, nine non-TSX transition owners plus the quality/progress, seven Writing Desk owners, and the active PublishBundle route use PublishBundle product language, and the old-framing allowlist is narrowed to 5 exact source owners | Significant progress, not complete | Remaining global CSS, 5 classified compatibility owners, and historical/reference surfaces outside the bounded UI set |
| Local DB | IndexedDB schema v10, v3-to-v10 migration, Web Locks/CAS, split OPFS/IndexedDB bodies, staged recovery, SHA-256 `.pufw.zip`, deterministic preview, confirmed apply, rollback QA, local Agent confirmation receipts, ReaderSignal source-state records, Creator Decision Workbench records, author-confirmed verified long-range thread records, immutable publish-package bytes, and durable PublishBundle/receipt records | Epic 2 baseline was accepted on 2026-07-10; the local-only Decision Workbench extension is validated on 2026-07-13; verified-thread persistence, workspace roundtrip, and Creator Route Canon-fingerprint loading were measured in real Chrome on 2026-07-17 | Preserve the local/private boundary while real author card selection, real-model quality validation, and the separately gated live WP6 application remain pending |
| Legacy migration | One-way `indexeddb-wins` import with atomic receipt | Accepted slice | Do not reread legacy input after receipt; next work is workspace portability, not another legacy import |
| Agent surface | Current 24 registered actions, exact Zod input/output schemas, manifest v2 effect declarations, typed executor, expiring confirmation receipts, redacted lifecycle records, and real Chrome execution QA | WP3 remains accepted; WP5 adds separate prepare, review, confirm, export, and public-submit semantics | Keep confirmation local-only and public submission separately high-risk; do not move semantics back into routes |
| External Echo | Six typed source adapters, source-id/content-hash deduplication, cursor/freshness/tombstone state, author-controlled reminders, real Chrome inbox QA, four source tables, safe grants/RLS, published-target validation, rate limits, moderation audit, security-invoker projection, stable cursor RPC, per-source failure isolation, and PostgreSQL 17 proof exist | WP4 application/local slice and the Epic 5 cloud-source repository package are accepted; live deployment remains unclaimed | Apply the source delta and pass strict live four-source evidence; Epic 3 is not promoted by repository or fixture evidence alone |
| PublishBundle | Zod schemas, SHA-256 package integrity, immutable ZIP bytes, local lifecycle/receipt repositories, editor handoff, bundle-owned UI, export, receipt import, retry recovery, real Chrome roundtrip, and an RPC-only own-platform adapter | WP5 application/local slice and WP6 repository handoff accepted on 2026-07-10 | Apply the WP6 delta to the intended Supabase project and pass strict live receipt proof before claiming deployment |
| Creator IA | Pivot route registry and compatibility aliases exist; old route bodies are split into owners | Scaffolding only | Real target routes and page contracts remain blocked by Epic 3 live-source acceptance and strict live WP6 receipt evidence |
| Local Workspace | Versioned ZIP export/import, deterministic preview, author-confirmed conflict policy, local rollback package, post-import edit protection, and a shadcn-owned display-preference surface exist | Epic 2 recovery boundary plus the author-facing tool-setting retirement slice are accepted | Historical tool-setting meta remains read-only cleanup data; it is absent from product UI, facade exports, active writes, and new packages |
| Backend publish | Server-owned RPC migration, direct-write grant revocation, private audit, authoritative receipt, adapter cutover, isolated PostgreSQL tests, and a strict proof script that hides temporary live content exist | WP6 repository implementation accepted; live deployment unclaimed | Apply through the operator gate and prove the live author-to-Reader transaction |

Current PublishBundle slicing note: local-snapshot recovery has a dedicated controller, context/local load invocation has a replaceable-port effect service, context/local React setter distribution has one patch applier, and active context, publish gates, reader impact, author decisions, lifecycle choice, and bundle input have dedicated pure view-model owners. The compatibility route retains React scheduling, action orchestration, and composition only.

## 4. Execution Rules

1. Advance code in dependency order. Do not use a later UI milestone to hide an earlier data or action gap.
2. Keep Epic 1 gates active during every later epic. Legacy cleanup is a continuous guardrail.
3. Every slice has one owner, one behavior contract, one machine gate, and one real-browser proof when browser semantics matter.
4. Route files own React state and composition only. They do not own persistence, network calls, action meaning, publish semantics, or browser capability detection.
5. Gates check ownership and observable behavior, not variable names or incidental implementation strings.
6. Creator Pivot feature flags remain disabled governance metadata with no application runtime import until Epic 4 names and verifies the cutover owner; Supabase capability flags remain a separate cloud contract.
7. No external frontend is merged. Reuse requires an inventory classification and an owner decision.
8. No product UI visual or IA cutover is merged into `main` before explicit review.

## 5. Dependency-Ordered Work Packages

### WP0. Governance Reconciliation

**Epic:** 0
**Purpose:** make current truth consistent before the next implementation slice.

Deliverables:

- This plan is indexed by the master roadmap and acceptance matrix.
- The roadmap current gate no longer says S0-S2 is the active implementation stage.
- Release-sync counts match the current manifest result.
- Development notes record that WP1-WP6 are repository-accepted, Epic 2 is promoted, and live Epic 5 deployment/source evidence is the next unit.

Exit evidence:

```bash
npm run check:slicing
npm run check:pivot
npm run check:release-sync-manifest
git diff --check
```

### WP1. Cross-Tab Workspace Coordination

**Epic:** 2
**Status:** accepted on 2026-07-10 without promoting all of Epic 2
**Entry:** one-way migration gate green
**Purpose:** prevent two localhost tabs from silently overwriting the same local record.

Implementation contract:

- Add a local workspace coordination owner; routes and components may not call `navigator.locks` or `BroadcastChannel` directly.
- Use Web Locks as the primary single-writer boundary.
- Scope lock names by workspace, record family, and record id.
- Use BroadcastChannel only for invalidation messages, never for draft prose or private asset bodies.
- Message payloads contain record family, record id, version, and update time.
- When Web Locks are unavailable, use IndexedDB version compare-and-swap semantics. A conflict creates a recoverable conflict copy; it never silently overwrites.
- When BroadcastChannel is unavailable, visibility/focus rehydration is the fallback. It must not reintroduce `localStorage` persistence.
- A thrown or aborted write must release the lock and leave the previous durable record readable.

Implemented owners:

```text
app/src/local-db/creatorLocalWorkspaceCoordination.ts
app/src/local-db/creatorLocalWriteTransaction.ts
scripts/check-local-workspace-coordination.mjs
scripts/browser-local-db-cross-tab.mjs
```

Accepted commands:

```text
check:local-coordination
qa:local-db-cross-tab
```

Exit criteria:

- Two real Chrome pages editing the same draft serialize writes.
- A second tab rehydrates after the first tab commits.
- A stale writer cannot overwrite a newer version.
- Failure releases the lock and preserves readable data.
- Evidence contains ids/status/version only, not private prose.

### WP2. Draft Body Ownership, OPFS, And Workspace Recovery

**Epic:** 2
**Status:** accepted on 2026-07-10 without promoting all of Epic 2
**Entry:** WP1 green
**Purpose:** separate large manuscript bodies from structured metadata while keeping a universal fallback.

Implementation contract:

- IndexedDB remains the metadata source of truth.
- OPFS becomes the preferred body store when supported.
- `draftBodies` IndexedDB remains the compatibility fallback and recovery source.
- Store body format, checksum, byte length, storage kind, and version in metadata.
- Use Web Crypto SHA-256 for body and package integrity; the current non-cryptographic local hash is not sufficient for PublishBundle integrity.
- A body write and metadata update use a staged commit. Partial writes remain recoverable and are not reported as saved.
- Workspace export format is versioned and author-visible:

```text
manifest.json
records.json
bodies/*.md
receipts/*.json
```

- Workspace import always shows a preview: additions, conflicts, unsupported records, and records that will remain unchanged.
- Import never overwrites silently. Before applying, create a rollback snapshot and receipt.
- Browser download/upload remains the universal P0 transport; native file handles are optional enhancement only.

Accepted commands:

```text
check:local-body-storage
check:workspace-package
qa:workspace-export-import
```

Exit criteria:

- OPFS and IndexedDB fallback produce the same restored draft.
- Corrupt checksums are rejected before import.
- Conflict preview is deterministic.
- Apply, cancel, and rollback are all proven in a real browser.
- Rollback refuses to overwrite a record changed after import.
- A workspace can move from computer A to computer B without cloud draft storage.

### WP3. Agent Action Execution And Author Control

**Epic:** 2
**Status:** accepted on 2026-07-10 without promoting all of Epic 2
**Entry:** WP1-WP2 green; local operation log durable
**Purpose:** turn the current static action manifest into an executable, recoverable working-agent protocol.

Implementation contract:

- Keep `creatorAgentActions` as the registry source of truth.
- Add typed input/output schemas and an executor owner for every executable action.
- Route handlers submit action intents; they do not implement action semantics.
- Action lifecycle is:

```text
requested -> awaiting_confirmation? -> started -> succeeded | failed | blocked | cancelled_by_author
```

- Medium/high-risk actions state exactly what local or public data they can change.
- High-risk actions use a two-step confirmation receipt bound to action id, target id, input hash, and expiry.
- A candidate may be proposed without changing prose; adoption is a separate author action.
- `confirm_publish_bundle` remains impossible without an author confirmation receipt.
- Operation logs never persist credentials, raw provider plumbing, hidden reasoning, or unredacted private prose.
- The public manifest, registry, DOM selectors, executor registry, and tests must agree.

Accepted commands:

```text
check:agent-execution
qa:agent-action-surface
```

Exit criteria:

- A browser agent can open a draft, ask a Socratic question, create a candidate, accept/reject it, save locally, and prepare a bundle.
- The same run cannot publish without the explicit confirmation step.
- Failed and cancelled operations leave recoverable state and complete logs.

### WP4. Multi-Source External Echo

**Epic:** 3
**Entry:** WP1 and WP3 green
**Purpose:** finish the Reader feedback loop without rebuilding a request-management backend.

**Accepted application/local slice:** 2026-07-10. This acceptance proves the adapter, local-cache, reminder-control, and browser behavior below. It does not claim that all six cloud source tables, RLS policies, moderation paths, or production ingestion jobs already exist.

Data ports:

```text
ReaderSignalAdapter<Request>
ReaderSignalAdapter<Comment>
ReaderSignalAdapter<Highlight>
ReaderSignalAdapter<Reaction>
ReaderSignalAdapter<Question>
ReaderSignalAdapter<VoteAggregate>
```

Implementation contract:

- The cloud/raw adapters normalize into `LocalReaderSignalCache`.
- Deduplicate by source id first and normalized content hash second.
- Store source cursor, fetched time, and tombstone/visibility state.
- Refresh on route entry and manual action; P0 may use a visibility-aware 60-second refresh while the route is open.
- Offline state keeps the previous local cache and clearly marks freshness.
- Deterministic rules may produce `suggested` reminders.
- Only the author can pin, edit, dismiss, or associate a reminder with a draft.
- Agent enhancement remains a candidate; it may not silently create a permanent CreativeReminder.
- `/creator/requests` remains compatibility-only; `/creator/echo` becomes canonical only after all sources and gates are green.

Accepted commands:

```text
check:reader-signal-adapters
check:creative-reminder-flow
qa:external-echo-inbox
```

Exit criteria:

- Request, comment, highlight, and reaction fixtures produce stable signals.
- Duplicate signals do not create duplicate reminders.
- Author pin/dismiss/use state survives reload and cross-tab refresh.
- Public signal text and private author interpretation remain separate.

### WP5. PublishBundle Lifecycle And Recovery

**Epic:** 2, then Epic 5 handoff
**Status:** accepted on 2026-07-10; this accepts the application/local lifecycle, not the WP6 server transaction
**Entry:** WP1-WP3 green
**Purpose:** make PublishBundle a real product object instead of a wrapper that immediately direct-publishes.

Required lifecycle:

```text
draft
  -> reviewed
  -> author_confirmed
  -> exported | submitted
  -> published | failed | needs_manual_action
```

Implementation contract:

- `createPublishBundle()` creates an unconfirmed draft. It must not set `confirmed: true` implicitly.
- Bundle body and manifest use SHA-256 integrity.
- Author confirmation is a separate durable event.
- Export creates an author-readable package for manual/external working-agent publication.
- Own-platform submit uses an idempotency key derived from bundle id and confirmed content checksum.
- A receipt can be imported or returned by the own-platform adapter.
- Retry reuses the same idempotency key and cannot create duplicate chapters or publish events.
- P0 supports own-platform publication and manual export. It does not claim automatic publication to external platforms.
- At WP5 acceptance, direct `publishChapter()` remained adapter-isolated; WP6 has now removed it and made the RPC the only application publication path.

Acceptance commands:

```text
check:publish-bundle-lifecycle
check:publish-receipt-recovery
qa:publish-bundle-roundtrip
```

Exit criteria:

- Prepare does not publish.
- Cancel leaves the draft and bundle recoverable.
- Confirm and submit produce one receipt.
- Retry is idempotent.
- Failed publication can resume without rebuilding the bundle.

Accepted evidence:

- `check:publish-bundle-lifecycle` proves the durable state machine, separate author confirmation, immutable package persistence, and one canonical idempotency key.
- `check:publish-receipt-recovery` proves success replay, known-failure retry, uncertain-outcome stop, and receipt-to-bundle integrity binding.
- Real Google Chrome proves prepare, review, cancelled-confirmation recovery, author confirmation, ZIP export, one public submission, one receipt, reload durability, and published recovery.
- `qa:agent-action-surface` remains green with the current 24 manifest actions and separate local confirmation versus public submission.
- This evidence does not claim a server transaction. The legacy cloud write remains dynamically isolated in `publishBundleAdapter.ts` until WP6.

### WP6. Server-Owned Publish Transaction

**Epic:** 5
**Entry:** WP4 signal contract and WP5 bundle contract frozen
**Purpose:** replace browser-owned multi-table publication with one authorized transaction.
**Status:** repository implementation accepted on 2026-07-10; live Supabase application remains pending.

Transaction contract:

```text
validate author authorization
validate PublishBundle schema/checksum/idempotency
create branch when required
insert chapter
insert publish_event
update linked public request/signal status
return PublishReceipt
commit atomically
```

Security requirements:

- Author authorization is enforced server-side, not through hidden UI.
- Anonymous and ordinary authenticated readers cannot call the author transaction.
- RLS and grants cover every affected table.
- Public response excludes private local refs except an opaque correlation id.
- Audit events record actor, work, bundle id, result, and timestamp without private prose.
- Failed transactions write no partial public chapter/branch/event state.

Accepted commands:

```text
check:publish-transaction-contract
test:publish-transaction
test:publish-authorization
test:publish-idempotency
test:publish-wp6
```

Exit criteria:

- Authorized mainline and IF publication both pass.
- Unauthorized, duplicate, and injected-target requests fail safely.
- Transaction rollback and receipt recovery pass.

### WP7. Creator IA And Atomic UI Cutover

**Epic:** 4
**Entry:** WP1-WP6, Epic 3 live-source acceptance, and all Epic 1 anti-regression gates green
**Purpose:** finally make the visible Creator match the product contract.

The target routes become real surfaces rather than compatibility aliases:

| Surface | Product Question | Required Capability |
| --- | --- | --- |
| 今日创作路径 | 今天最值得推进哪一步？ | active draft, current block, recent echo, next action, pending bundle |
| 灵感到正文 | 这个想法如何走到可写正文？ | inspiration, logline, skeleton, character, scene/world, draft, chapter check |
| 外界回声 | 读者正在回应什么？ | multi-source signals, clusters, reminder decisions |
| 本机写作智库 | 哪些私密叙事资产能帮助当前章节？ | characters, abilities, locations, maps, factions, items, rules, timeline |
| 写作台 | 我现在怎样继续写？ | quiet manuscript, explicit assistance, local save, selected context |
| 发布包 | 这次要交付什么、会影响哪里？ | review, confirmation, export/submit, receipt/recovery |
| 本机工作区 | 本地资料如何保存、迁移和恢复？ | storage health, export/import, rollback, permissions, operation history |

Assistant intervention states:

```text
quiet -> waiting -> asking -> diagnosing -> suggesting -> checking
```

Rules:

- No unsolicited suggestion card during the first 10 seconds of a writing session.
- A stage change may show at most one dismissible `why now` hint.
- Stuck rescue is explicit in P0; no pause-based automatic interruption.
- Candidate creation and candidate adoption remain separate.
- Reader surfaces remain non-generative.

Atomic UI rules:

- Build with existing shadcn/Radix primitives and semantic tokens.
- Every new product component starts with a component contract: product intent, data, primitives, states, interaction, Agent metadata, accessibility, and tests.
- No page-local CSS, raw colors, inline visual systems, or Reader background imagery in Creator.
- Liquid Glass is limited to navigation/control/assistant layers. Manuscript and long-form previews remain quiet and opaque.
- Loading, empty, error, disabled, conflict, offline, and recovery states are mandatory.
- Reduced motion, reduced transparency, keyboard focus, and responsive text fitting are release requirements.

Product-copy cleanup during cutover:

- Replace remaining `发布检查` product framing with `发布包` where the object is a bundle.
- Remove author-facing model/provider/service-address setup from Local Workspace.
- Keep old settings data readable only for migration/cleanup; do not expose it as the future product path.
- Remove request/task/admin framing outside compatibility owners.

Planned commands:

```text
check:creator-ia-v2
check:component-contracts
check:copy-boundary
check:design-system
qa:creator-pivot-routes
```

Exit criteria:

- Every target route has a real owner and real data source.
- No target route merely redirects to a legacy route.
- No visible engineering/model/request-management residue remains.
- Desktop and mobile browser QA proves the full inspiration-to-publish-package path.
- Visual approval is obtained before merging the cutover into `main`.

### WP8. Legacy Retirement

**Epic:** 1, continuous
**Entry:** replacement behavior proven
**Purpose:** remove the old model only after its replacement is accepted.

Delete triggers:

| Legacy Surface | Delete Only After |
| --- | --- |
| Author-facing local model/provider settings | Deleted after accepted Local Workspace export/import and working-agent action flow; guarded by M7, slicing, workspace-package, and browser QA |
| `CreatorSettingsToolPanel` model/service controls | Deleted after `CreatorWorkspacePreferencesPanel` replacement and real-Chrome Settings/package QA |
| Compatibility request route/body | `/creator/echo` is canonical and multi-source gates pass |
| Compatibility publish-check framing | PublishBundle lifecycle and route cutover pass |
| Removed browser-owned publication path | Keep WP6 transaction, authorization, rollback, and receipt gates green; `check:publish-transaction-contract` rejects path recreation |
| `draftBodies` as primary storage | OPFS path passes; keep IndexedDB only as supported fallback |
| Remaining page-local global CSS selectors | Atomic owners and screenshot parity exist |
| Old QA literals and allowlists | New behavioral gates cover the same contract |

Every deletion needs zero-consumer proof, a replacement gate, build/test evidence, and a deletion receipt in the inventory/development notes.

## 6. Pull-Request Sequence

Keep each package independently reviewable:

1. `epic2/local-coordination`
2. `epic2/opfs-workspace-recovery`
3. `epic2/agent-execution`
4. `epic3/external-echo-adapters`
5. `epic2/publish-bundle-lifecycle`
6. `epic5/publish-transaction`
7. `epic4/creator-ia-cutover`
8. `epic1/final-legacy-retirement`

Do not merge the UI cutover into `main` before explicit product review. Earlier architecture slices may merge only when their own gates and rollback handle are complete.

## 7. Promotion Matrix

| Promotion | Required Evidence |
| --- | --- |
| Epic 2 accepted | Cross-tab coordination, OPFS/fallback, workspace export/import/rollback, Agent execution, PublishBundle lifecycle, local-only privacy proof |
| Epic 3 accepted | Multi-source adapters, dedupe/cursor/offline behavior, CreativeReminder author control, Echo browser QA |
| Epic 4 entry allowed | Epic 2 and 3 accepted; PublishBundle/backend handoff green; Epic 1 anti-regression gates green |
| Epic 4 accepted | Real target routes, atomic UI contracts, full browser journey, copy/privacy/accessibility gates, product approval |
| Epic 5 accepted | Migration/RLS/authorization/transaction/idempotency/audit tests green |
| Epic 6 allowed | Stable Reader identity and entitlement contract plus explicit decision to start paid validation |
| Epic 7 allowed | Staging, monitoring, backup, rollback, security and payment gates accepted |

## 8. Immediate Next Goal

WP6 and the External Echo cloud-source repository package are accepted. The immediate dependency-ordered goal is the Epic 5 live-application and operations evidence package:

> Apply the reviewed WP6 and External Echo SQL through the explicit operator gate, prove one strict live author-to-Reader receipt flow plus all four live source projections, and close export/delete, backup/restore, and incident evidence before any Creator IA cutover.

Operator deferral on 2026-07-11: the user temporarily skipped the live Supabase step. This does not clear or remove the dependency. While it is deferred, only evidence-backed Epic 1 cleanup and repository governance may advance; Creator IA, epic promotion, payment, and production cutover remain blocked.

Local continuation audit on 2026-07-12: the remaining exact compatibility owners and literal CSS candidates are all explicitly paused or preserved, while the static zero-incoming-module set contains only build/QA roots, governance metadata, read-only migration cleanup, preserved shadcn primitives, and held files. No further unpaused local slice remains after the recorded API/domain refinements. The next meaningful unit is therefore still the operator-authorized live External Echo/WP6 proof, or an explicit reopening of a held local owner; do not substitute speculative deletion or cosmetic work.

Operator UI reopening on 2026-07-12 and 2026-07-13: after the local Pivot gates returned green, the user explicitly authorized bounded Creator UI refinement while keeping live Supabase deferred. This authorization covers atomic shadcn ownership improvements with unchanged data, routes, callbacks, persistence, and publication behavior; it does not authorize Creator IA cutover, held-surface work, epic promotion, payment, production release, or online acceptance. The accepted Today slices are `CreatorTodayPriorityPanel`, `CreatorWorkReadinessPanel`, `CreatorTodayPathPanel`, `CreatorTodayEchoStatusPanel`, `CreatorTodayContextRail`, and `CreatorTodayNextStepsPanel`; each has focused gates plus desktop/narrow Google Chrome evidence. The final Today redundancy closeout deletes `CreatorLocalLoopPanel` and `local-creator-loop*` because the static explanation had no data or action and duplicated `CreatorTodayPathPanel`; no replacement card is introduced. The bounded post-Today slices now include `CreatorEchoNextActionPanel`, the canonical `CreatorExternalEchoInboxCard` / `CreatorExternalEchoDetailPanel` pair, `CreatorSettingsBoundaryStrip`, and `CreatorLocalWorkspacePanel`. The Echo pair preserves all normalized signal/reminder data and actions while replacing nested ActionBar/StatePanel glass and old class hooks with one material layer, semantic source/context/reminder regions, shadcn CardFooter/Alert composition, stable data slots, and desktop/narrow Chrome proof. The Local Workspace strip preserves all seven readiness inputs while replacing four nested lift-enabled glass Cards with one solid semantic four-item status band. The primary Local Workspace panel preserves its seven records, three permissions, operation history, backup action, and disabled import state while replacing three glass Cards and nested row boxes with one shadcn Card, semantic records/permissions/operations regions, a backup CardFooter, and desktop/narrow Chrome proof including fixed-navigation reachability. Request-only compatibility rows, the separate decision surface, and Creator IA remain held.

Local UI continuation on 2026-07-13: the previously paused Today load-effect/React-patch boundary is present and the current Pivot gates accept it, so the stale paused-state notes are superseded. The next bounded Writing Desk slice keeps the existing shadcn chapter-planner presentation but removes embedded demo story values: the linked Reader wish shapes the chapter goal, current-work local character assets supply people, clue/held-back rows require explicit author tags, and absent context stays as truthful author-facing empty states. No route, persistence, publication, CSS, or live Supabase behavior changes.

Writing Desk UI continuation on 2026-07-13: after the chapter-planner data-truth slice passed, the unheld `CreatorSocraticPlanBoard` presentation was refined without changing its five stages, stage models, copy, selection/capture callbacks, local-setting persistence, route composition, Agent behavior, or publication. The former glass Card plus five oversized rounded stage controls and nested bordered active-stage panel are replaced by one solid shadcn Card with a semantic five-step `ol`, one active-stage `section`, asset-kind `ul`, CardFooter capture action, stable data slots, <=8 px radius, and desktop/narrow Chrome containment. No CSS file, data source, route, persistence schema, network call, or live Supabase state changed.

Writing Desk UI continuation on 2026-07-13: the semi-resident `CreatorAssistantDock` is the next bounded atomic slice. Its command set, shortcuts, candidate confirmation, save/publish callbacks, route/data inputs, persistence, Agent action identifiers, and publication behavior remain unchanged. Presentation moves to one solid shadcn Card root with Tabs, Alert, Button, Textarea, Collapsible, Separator, and CardFooter; the Composer is a semantic section, quick actions are a list, shortcuts use `kbd`, compact disclosure stays component-owned, and the former assistant page-global CSS family is deleted. M4/UI/token/page-CSS gates plus desktop/narrow authenticated Chrome QA protect the new owner. This does not reopen Creator IA, live Supabase, or deployment.

Completion requires all of the following:

1. The intended Supabase project reports `publish_receipts` and `publish_bundle_transaction` through strict live verification without exposing direct publication grants.
2. A non-anonymous allowlisted author publishes one confirmed bundle and receives the authoritative receipt; Reader sees the chapter and linked feedback state.
3. Anonymous, ordinary authenticated, foreign-author, direct-write, duplicate, and checksum-conflict attempts remain blocked.
4. Comment, highlight, reaction, and question records expose the repository-proven grants, RLS, rate/moderation boundaries, cursor semantics, and ReaderSignal adapters on the intended live project.
5. No private prose, local draft reference, CreativeReminder body, credentials, or Agent reasoning enters cloud records or evidence.
6. Existing local DB, Agent, PublishBundle, Creator, Pivot, build, browser, and release-sync gates remain green.

## 9. Out Of Scope Until Promoted

- Cloud AI runtime.
- Author model-key hosting.
- Automatic external-platform publication.
- Paid entitlement activation.
- Production cutover.
- Final Creator visual redesign before WP1-W6 acceptance.
- Importing another frontend or copying research prototype code into product source.
