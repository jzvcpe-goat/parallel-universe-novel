# Creator Agent Action Surface

Date: 2026-07-10

This document defines the M0 contract for a working agent operating Local Creator through the browser. M0 does not claim full automation. It defines the allowed surface so later UI work cannot invent private actions ad hoc.

## Principles

- The agent operates visible localhost UI through stable selectors.
- The author remains responsible for canon, publishing, and destructive changes.
- High-risk actions must expose confirmation gates.
- The agent can fill candidate areas, open panels, save local drafts, and export bundles, but it cannot silently publish or overwrite private work.

## Readable Regions

Allowed:

- Current visible page text.
- Draft body only when the author has opened that draft.
- Open writing-asset cards.
- External Echo list visible on screen.
- Publish bundle manifest visible on screen.

Not allowed:

- Hidden drafts.
- Credentials.
- Browser storage dumps.
- Local absolute paths.
- Private prompts or provider responses.

## Action Risk Levels

| Risk | Meaning | Author Confirmation |
| --- | --- | --- |
| `low` | navigation, opening a panel, reading visible context | not required |
| `medium` | saving local data, pinning a reminder, applying a suggestion to a candidate area | reversible or explicitly visible |
| `high` | generating/exporting/publishing bundles, hiding content, destructive action | required |

## M0 Manifest

The public static manifest lives at:

```text
app/public/creator/agent-manifest.json
```

The TypeScript action contract lives at:

```text
app/src/agent-surface/actions.ts
```

Manifest v2 declares each action's risk, confirmation requirement, local effects, and public effects. Visible action controls use `data-agent-*` attributes; command and keyboard paths enter the same executor.

### Writing-desk readiness

The writing-desk route publishes a machine-readable lifecycle on its canonical workspace root:

```text
data-agent-workspace-state="restoring" | "busy" | "ready"
data-agent-ready="false" | "true"
aria-busy="true" | "false"
```

The manifest's `writing-desk.readinessSelector` is the only legal entry point for reading or acting after navigation or reload. A working agent must wait for `[data-agent-workspace-state="ready"][data-agent-ready="true"]`; visible text and controls rendered while the workspace is `restoring` are not authoritative. During restoration, conversation submission, recall changes, local saves, historical-state decisions, manuscript actions, publish handoff, and next-chapter actions remain disabled. This is a localhost hydration boundary, not permission to read hidden browser storage.

The current registry contains 30 actions. Earlier launch closeouts refer to
historical 22-action, 24-action, and 27-action baselines; those references do not describe the current
manifest. This action count is separate from the 22-dimension character state
contract in `app/src/features/creator-decision/characterState.ts`.

## WP3 Executable Protocol

WP3 adds these owners:

```text
app/src/agent-surface/contracts.ts
app/src/agent-surface/executor.ts
app/src/agent-surface/confirmation.ts
app/src/local-db/creatorLocalAgentExecutionRepository.ts
app/src/apps/creator/routes/creatorEditorAgentExecutionService.ts
```

The durable lifecycle is:

```text
requested -> awaiting_confirmation? -> started -> succeeded | failed | blocked | cancelled_by_author
```

Operation records store stable ids, risk, route, target id, input hash, receipt id, status, and message code. They do not store raw instructions, manuscript prose, credentials, or hidden reasoning.

High-risk actions require a local confirmation receipt bound to `operationId`, `actionName`, `targetId`, `inputHash`, and `expiresAt`. A confirmed receipt is consumed atomically and cannot be replayed. The visible confirmation dialog is the author gesture; the publish adapter cannot run before receipt consumption.

Candidate generation does not mutate prose. Rejection records `cancelled_by_author`; adoption is a separate `apply_suggestion` execution.

## S5 Wired Action Surface

S5 extracts the real authoring actions that already exist in the Creator writing desk so later working agents do not invent private page handlers. The visible UI remains product-facing; these contracts live in code and documentation for automation, QA, and future localhost agent control.

Action sources:

```text
app/src/agent-surface/actions.ts
app/src/agent-surface/operationFlow.ts
app/src/agent-surface/operationLog.ts
app/src/local-db/creatorLocalAgentRepository.ts
app/public/creator/agent-manifest.json
app/src/apps/creator/LocalCreatorApp.tsx
app/src/components/creator/creatorCommandCandidateService.ts
app/src/components/creator/workspace/CreatorAssistantSidecar.tsx
app/src/components/creator/workspace/CreatorCommandPalette.tsx
app/src/components/creator/workspace/CreatorCommandCandidate.tsx
app/src/components/creator/workspace/CreatorReviewDock.tsx
app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx
app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx
```

Required wired actions:

| Stage | Action | Product Meaning | Visible Selector |
| --- | --- | --- | --- |
| Echo | `select_priority_request` | Pick the most useful writing signal today | `data-agent-action` |
| Echo | `convert_echo_to_scene` | Turn outside echo into a scene candidate | `data-agent-action` |
| Writing assist | `generate_candidate_from_instruction` | Generate a candidate from the author's natural-language instruction | `data-agent-action` |
| Writing assist | `complete_next_beat` | Continue the next story beat | `data-agent-action` |
| Writing assist | `rewrite_as_action` | Rewrite explanation as action and detail | `data-agent-action` |
| Writing assist | `ask_socratic_question` | Ask the next decisive question | `data-agent-action` |
| Local memory | `extract_setting_asset` | Extract character, scene, rule, or other story-bible asset into local memory | `data-agent-action` |
| Review | `branch_sandbox` | Try a branch candidate without publishing it | `data-agent-action` |
| Review | `inspect_story_impact` | Inspect character, foreshadowing, and branch impact | `data-agent-action` |
| Review | `open_suggestion_record` | Show why a suggestion was made | `data-agent-action` |
| Local memory | `save_local_draft` | Save the local draft | `data-agent-action` |
| Writing assist | `edit_local_manuscript` | Save the author's exact manual manuscript edit locally | `data-agent-action` |
| Navigation | `start_next_local_chapter` | Start the next local chapter only after an explicit author action | `data-agent-action` |
| Local memory | `import_historical_state_candidate` | Import reviewed historical state proposals without changing canon | `data-agent-action` |
| Review | `start_character_rehearsal` | Run the author-confirmed selected-character rehearsal without manuscript or canon writes | `data-agent-action` |
| Local memory | `save_character_rehearsal_card` | Save one reviewed character-card candidate as a new local asset | `data-agent-action` |
| Local memory | `save_character_rehearsal_setting` | Save one reviewed setting-card candidate as a new local asset | `data-agent-action` |
| Local memory | `confirm_historical_state_candidate` | Commit evidence-locatable historical state only after author confirmation | `data-agent-action` |
| Local memory | `reject_historical_state_candidate` | Remove a historical state proposal from the pending review list | `data-agent-action` |
| Publish bundle | `enter_publish_check` | Move to author review before publishing | `data-agent-action` |
| Publish bundle | `prepare_publish_bundle` | Prepare an unconfirmed local delivery package | `data-agent-action` |
| Publish bundle | `review_publish_bundle` | Record that the author reviewed the exact package content | `data-agent-action` |
| Publish bundle | `check_reader_promise` | Check whether the chapter answers the reader-facing promise | `data-agent-action` |
| Publish bundle | `export_publish_bundle` | Export the confirmed package for manual delivery | `data-agent-action` |
| Publish bundle | `confirm_publish_bundle` | Confirm the reviewed package locally without publishing | `data-agent-action` |
| Publish bundle | `submit_publish_bundle` | Submit the confirmed package to the public platform | `data-agent-action` |

The S5 gate checks both directions:

- every action declared in `actions.ts` must appear in the static manifest;
- every manifest action must be declared in `actions.ts`;
- writing desk buttons and quick actions must expose stable `data-agent-action` selectors;
- export, local confirmation, and public submission remain high risk and require separate author confirmation; local confirmation never implies public submission;
- blocked actions remain absent from the allowed manifest.
- author-visible command and candidate actions enter `operationFlow.ts`, which delegates to the typed executor; rejection and adoption remain distinct;
- shell command/candidate registry, route scope, visible command context, intent keywords, candidate variants, and apply-mode mapping live in `creatorCommandCandidateService.ts`, not in the React frame;
- lifecycle events and confirmation receipts are stored only through local repositories and do not create a cloud job or upload private draft bodies.

Accepted evidence:

```bash
npm run check:agent-execution
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:agent-action-surface
```

S5 does not permit public UI to expose internal words such as provider, trace, prompt, fallback, backend, or raw action plumbing. The action surface is an implementation contract behind product-language controls.
