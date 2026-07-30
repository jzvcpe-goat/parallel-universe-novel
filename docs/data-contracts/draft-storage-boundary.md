# Draft Storage Boundary

P0 keeps draft prose local.

## Local-only Rules

Creator draft prose is private author work until explicit publication. The
Local Creator App may store the title, prose body, selected work, selected line,
linked reader request, and updated time in browser-local storage or a future
desktop-local cache.

Local-only data may be rendered in:

- Creator Writing Desk.
- Creator Publish Check.
- Creator Today draft cards.

Local-only data must not be rendered in Reader Web and must not be uploaded as
draft prose before the author confirms publication.

## Cloud publish boundary

Cloud records are only allowed to persist public or operational state:

- public works, lines, chapters, and author notices;
- reader request status and vote counts;
- publication records;
- opaque local draft references used to connect a published chapter back to the
  local author action.

Allowed cloud fields:

- `local_draft_ref`
- publish event relationship fields
- final published chapter content after explicit confirmation

Forbidden cloud fields before publish:

- draft prose body
- local creation service response
- raw prompt
- credential material

The UI may show private draft content only from local storage. Public Reader never sees private draft content.

## Writing Desk save boundary

The Writing Desk route must not call draft persistence directly when the author
saves. It should enter the explicit action-flow boundary in
`creatorEditorDraftActionFlowService.ts`. That service owns the route-facing
manual-save and publish-check flows: call the draft action service or publish
check service, schedule the visible action reset through the reset port, and
return the state patch or publish handoff to the route.

`creatorEditorDraftActionService.ts` remains the lower save-action
orchestration owner: call the local save service, map the save result into a
draft state patch, and return the saved draft when available.
`creatorEditorPublishCheckService.ts` remains the lower save-to-publish-check
owner: compose the publish save action with the local PublishBundleDraft
handoff.

`creatorEditorDraftSaveService.ts` owns the save blockers, timestamp assignment,
and `EditorDraftPersistencePort` handoff to the current compatibility adapter.
`creatorEditorDraftActionController.ts` owns the save-result UI patch decision:
active draft reference, saved draft list, local reminder refresh, author notice,
and the reset delay constant. `creatorEditorDraftActionResetService.ts` owns the
browser reset scheduling port for the pending save/publish action. The route may
set visible action state, apply the returned state patch, and navigate through a
returned handoff target, but it must not directly call `runEditorDraftAction`,
`runEditorPublishCheckAction`, `runEditorDraftSave`, re-interpret persistence
results, or own the reset timer.

## Writing Desk implicit-save boundary

Autosave is not an implemented product capability in the current slice. The
zero-consumer disabled policy placeholder was removed rather than preserved as
a misleading service owner. All private draft writes remain author-triggered
through the visible save and publish-check actions.

`CreatorEditorRoute.tsx` must not schedule draft-save timers, own autosave
debounce timing, or create implicit draft writes. A future autosave milestone
must introduce an active consumer, persistence/recovery behavior, focused tests,
and an explicit ownership update together; a disabled no-op service is not
accepted as implementation evidence.

## Writing Desk load boundary

The Writing Desk route must not import the draft persistence adapter just to
load or refresh private draft rows. It should call the local draft load service,
which owns the `EditorDraftLoadPersistencePort` read handoff to the current
compatibility adapter.

`creatorEditorStartupLoadService.ts` owns the route-startup load operation:
author-facing remote records, the local draft snapshot, local setting assets, and
local creative reminders. The route may apply the loaded state and run startup
bootstrap decisions, but it must not directly list startup API data or directly
call local draft/reminder/setting-asset load services.

`creatorEditorStartupEffectService.ts` owns the route-startup effect boundary:
the browser startup timer, the `runEditorStartupLoad()` call, route bootstrap,
missing-reminder bootstrap, and startup state-patch resolution. The route may
schedule this service and apply the returned React state patch, but it must not
own `window.setTimeout`, `resolveEditorRouteBootstrap(...)`,
`runEditorReminderBootstrap(...)`, or `resolveEditorStartupStatePatch(...)`
during startup.

`creatorEditorStartupDataPatchController.ts` owns startup load result to
route-data patch mapping: requests, works, branches, chapters, authorization,
private drafts, local setting assets, and creative reminders. The route may pass
the successful startup result into this controller and give the resulting patch
to `creatorEditorReactPatchApplier.ts`, but it must not directly split
`startupLoad` into individual setter calls.

`creatorEditorReactPatchApplier.ts` owns route-adjacent React state patch
application for startup data, startup state, command, candidate, draft, and
direct user-action patches. The route may pass current React setters into this
applier, but it must not directly inspect `statePatch.*` fields or startup load
fields to distribute setter calls.

`creatorEditorUserActionController.ts` owns route-adjacent user action
decisions such as accepting an assistant suggestion, dismissing an assist
candidate, selecting a guided writing stage, and keeping the current result as
an IF branch candidate. `CreatorEditorRoute.tsx` may call these pure helpers
and apply their patches through `creatorEditorReactPatchApplier.ts`, but it
must not embed the action copy, direct `setContent(previous => ...)`, or direct
`setPublishMode('if')` branch switching in page handlers.

This keeps route state separate from storage ownership. A later IndexedDB/OPFS
or desktop-local repository can replace the load port without changing the
route orchestration.

This service boundary is only a migration seam. It does not mean Local DB
autosave, desktop sync, OPFS, External Echo automation, or a full draft
repository migration is complete.

## Writing Desk command event boundary

The Writing Desk route must not own browser command-candidate or shortcut
listener logic. It should bind `creatorEditorCommandEventService.ts`, which owns
the replaceable event-target port for command-candidate apply events and local
keyboard shortcuts.

The command event service may translate browser events into command/candidate
controller calls, but it must not own React state, local draft persistence,
navigation, publish, storage migration, or assistant execution. The route may
apply returned state patches to the current React view.

`creatorEditorAssistantController.ts` owns assistant command, shortcut, and
review-fix meanings used by the event service and route handlers.
`creatorEditorSelectionController.ts` owns chapter-direction selection,
chapter-goal confirmation, draft-guide continuation, current request priority
selection, and linked local creative-reminder selection meanings.
`creatorEditorCommandController.ts` stays limited to the shared command patch
type plus branch experiment and story-flow decisions.

This keeps event binding separate from command meaning. It is a route
purification step only; it does not implement a new keyboard infrastructure,
local model runtime, managed agent protocol, autosave, or local database
migration.

## Writing Desk rail view-model boundary

The Writing Desk route must not sort, truncate, or label the rail records for
drafts, reader wishes, recent chapters, or private-draft shortcuts directly. It
should call `creatorEditorSessionViewModels.ts`, which owns
`buildEditorSessionGroups(...)` and `buildEditorPrivateDraftItems(...)`.

`CreatorEditorRoute.tsx` imports those builders directly from the session owner.
`creatorEditorViewModels.ts` must not re-export or aggregate them; it retains
only shared editor types and the title/direction helpers it implements itself.

The route may still inject navigation callbacks such as opening a local draft or
re-entering the editor from a reader wish, but product row grouping, date labels,
request labels, and the three/five item limits belong to the view-model builder.

This keeps rail list presentation separate from route orchestration. It is not
Local DB migration, External Echo automation, desktop sync, or a new Creator IA.

## Writing Desk Socratic and assistant view-model boundary

`creatorEditorSocraticViewModels.ts` owns deterministic Socratic questions,
writing-guide labels, setting-asset labels and summaries, plan stages, and
chapter-planner options. `creatorEditorAssistantViewModels.ts` owns
deterministic completion copy, assist candidates, writing-command rows,
assistant focus/progress rows, and ghost-completion labels.

Both modules may import component contracts as types, but they must remain free
of React state, JSX, icons, browser globals, local storage, Supabase, network
calls, and publish side effects. Route, controller, and component owners consume
them directly instead of routing implementation through
`creatorEditorViewModels.ts`.

This split is structural refinement only. It does not add model execution,
change visible copy or layout, migrate local storage, or alter publishing.

## Writing Desk destination/readiness boundary

The Writing Desk route must not derive work maps, branch maps, destination
labels, latest chapter anchors, IF-branch options, local setting summaries, or
save/publish readiness inline. It should call
`creatorEditorDestinationController.ts`, which owns
`resolveEditorDestinationContext(...)` and `branchIdForPublish(...)`.

The route may pass the returned values into the manuscript stage, rails, draft
save service, publish-check service, and setting capture service. It must not
reintroduce direct `pmfMainBranchId(...)`, `branchIdForPublish(...)`,
`new Map(works...)`, branch filtering, chapter filtering, readiness booleans, or
IF-option construction in `CreatorEditorRoute.tsx`.

This keeps destination/readiness decisions separate from route orchestration. It
is still a pre-pivot cleanup seam only; it does not implement the new Creator
IA, Local DB migration, External Echo automation, managed agent execution,
desktop sync, or PublishBundle execution.

## Writing Desk workspace view-model boundary

The Writing Desk route must not assemble the full author-workspace view model by
calling each review and story-map builder directly. It should call
`creatorEditorWorkspaceViewModelController.ts`, which owns
`buildEditorWorkspaceViewModel(...)` and bundles:

- Socratic plan stages;
- the inline assistant suggestion;
- story-map rail items;
- quality issues;
- state-diff preview;
- branch sandbox preview;
- flight-recorder rows.

Within that bundle, `creatorEditorQualityViewModels.ts` owns deterministic
quality issue construction. The workspace controller calls
`buildQualityIssues(...)`; it does not own or duplicate the title,
destination, prose-depth, turn, or self-directed-update checks.
`creatorEditorViewModels.ts` must not re-export or aggregate this builder.

`creatorEditorReviewImpactViewModels.tsx` separately owns state-impact cards,
branch sandbox comparisons, and suggestion-record/trust rows. The workspace
controller calls `buildStateDiffViewModel(...)`,
`buildBranchSandboxViewModel(...)`, and `buildFlightRecorderViewModel(...)`, but
must not reconstruct their review semantics.

`creatorEditorStoryMapViewModels.tsx` owns Story Map token extraction and row
construction, while `creatorEditorInlineReviewViewModels.ts` owns the four
manuscript-edge review rows. The workspace controller and manuscript stage may
call those builders respectively, but they must not duplicate their logic.

The route may pass this bundle into the manuscript stage and rails, and may use
the assistant suggestion as command context. It must not reintroduce direct calls
to `buildSocraticPlanStages(...)`, `buildEditorCompletion(...)`,
`buildQualityIssues(...)`, `buildStateDiffViewModel(...)`,
`buildBranchSandboxViewModel(...)`, `buildFlightRecorderViewModel(...)`, or
`buildStoryMapItems(...)`.

This keeps review/story-map view-model assembly separate from route
orchestration. It remains route purification only; it does not implement managed
agent execution, new keyboard infrastructure, Local DB migration, External Echo
automation, desktop sync, or a new Creator IA surface.

## Writing Desk action-input boundary

The Writing Desk route must not manually assemble draft-save, publish-check, or
setting-capture service inputs. The shaping lives in
`creatorEditorActionInputController.ts`, which owns:

- `buildEditorDraftActionInput(...)`;
- `buildEditorPublishCheckInput(...)`;
- `buildEditorSettingCaptureInput(...)`.

The route-facing seams are `creatorEditorDraftSubmitFlowService.ts` for
save/publish-check and `creatorEditorSettingAssetSubmitFlowService.ts` for
setting capture. The route may call these submit-flow services and apply their
returned patches. It must not reintroduce route-local `workId`, `branchId`,
readiness, destination label, selected-work title, or linked-request-text
payload construction for these service calls.

This keeps service input shaping separate from route orchestration. It remains
route purification only; action-flow orchestration is now separated from payload
construction and React setter application. It does not implement autosave
debounce, managed agent execution, Local DB migration, desktop sync, or
PublishBundle execution.

## Writing Desk reminder boundary

The Writing Desk route must not call the creative-reminder local adapter
directly while bootstrapping a request-backed writing session. It should call
the reminder service, which owns `EditorReminderPersistencePort`, the current
local reminder read, and the optional request-to-reminder upsert after route
bootstrap has classified a missing reminder.

This keeps route recovery separate from local writing-intent persistence. A
later External Echo adapter or Local DB repository can replace this port without
changing the Writing Desk route orchestration.

This boundary does not mean External Echo, CreativeReminder workflow
automation, local agent execution, or full IndexedDB/OPFS migration is complete.

## Publish handoff boundary

The Writing Desk route must not build publish-check URLs, call the publish
handoff service directly, or write publish bundle draft records directly. It
should call `creatorEditorPublishCheckService.ts`, which owns the explicit
save-to-publish-check operation and delegates local bundle-draft persistence to
the publish handoff service. `creatorEditorPublishHandoffService.ts` owns
`EditorPublishHandoffPersistencePort`, persists a local `PublishBundleRecord`
in `draft` status through `creatorLocalPublishRepository.ts`, and returns the
publish-check target path to the publish check service.

The pure publish handoff controller may create the `PublishBundleRecord` view
model and target path, but it must not import React, navigate, call cloud
adapters, write local stores, or construct legacy `/creator/publish?draft=...`
links. Today-route publish shortcuts should use the shared publish-bundle draft
target helper so new surfaces converge on `bundle` routing.

This boundary is only a PublishBundleDraft seam. It does not mean external
publishing, managed publish automation, autosave debounce, OPFS body storage, or
full PublishBundle V2 execution is complete.

## Local setting library

Creator-side story bible assets are local-first in P0. Characters, abilities,
locations, maps, factions, items, rules, and timeline notes are stored beside
private drafts on the author's device.

`creatorEditorSettingAssetController.ts` owns the pure decision layer for
turning a Socratic stage into a setting-asset draft: asset kind, title, summary,
detail, and tags. `creatorEditorSettingAssetService.ts` owns both the
setting-asset load boundary and the capture operation through separate
read/write persistence ports whose default implementation uses
`creatorLocalSettingAssetRepository.ts`, not the Supabase facade.
`creatorEditorSettingAssetPatchController.ts`
owns capture-result-to-state-patch mapping, including refreshed setting assets
and the next guided writing step. `creatorEditorSettingAssetSubmitFlowService.ts`
owns the route-facing capture submit flow, and `creatorEditorReactPatchApplier.ts`
applies the resulting route-adjacent React setter patch. `CreatorEditorRoute.tsx`
may trigger loading, call the submit flow, and apply the returned patch, but it
must not directly construct, read, write, or interpret setting assets through the local adapter or
capture result.

The load boundary is only a migration seam. It does not mean the full local
knowledge-base repository, async IndexedDB hydration, OPFS body storage, or
agent-operated story bible is complete.

Local setting assets may include:

- asset kind;
- stage where the answer was confirmed;
- title, summary, detail, and author tags;
- work and branch reference for local organization.

They must not contain credential material or hidden generation internals. They
must not be rendered in Reader Web unless a later explicit publish action turns
them into reader-facing story material.

## UI acceptance

- Creator UI must say "正文仍保存在本机" when publication fails.
- Creator UI may show "私有初稿引用" only in internal documentation, not as a
  primary author-facing label.
- Reader UI never exposes draft state.
- Publish Check is the first moment draft prose may become public content.
- Creator Writing Desk must expose stage control and a local setting library so
  Socratic answers can become reusable story material without cloud storage.
