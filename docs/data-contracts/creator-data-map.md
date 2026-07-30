# Creator Data Map

Reader browser writes are outside the Creator facade. `ReaderRequestPanel.tsx` calls `pmfSupabaseReader.ts` for anonymous Reader identity, request creation, public request listing, and voting. `pmfSupabase.ts` owns Creator session/authorization, External Echo reads and author transitions, works/branches/chapters, client heartbeat, and the confirmed PublishBundle transaction; it must not duplicate the Reader write path.

## 今日

Reads:

- `works`
- `branches`
- `chapters`
- `reader_requests`
- `request_votes`
- `publish_events`
- local private draft refs

## 外界回声

Reads:

- production source batches from `reader_requests` and `request_votes`
- cursor-backed `reader_signals` projection batches sourced from `reader_comments`, `reader_highlights`, `reader_reactions`, and `reader_questions`
- `works`
- `branches`
- local normalized `LocalReaderSignalCache` records
- local `ReaderSignalSourceSyncState` cursor/freshness records
- local `CreativeReminder` records

Writes:

- normalized source cache and source sync state through `creatorLocalReaderSignalRepository.ts`.
- deterministic `suggested` reminder candidates through `creativeReminderEngine.ts`.
- author pin/use/dismiss/edit/associate state through `creatorLocalWritingRepository.ts`; this is local-only and does not create cloud draft content.
- request status changes only through allowed transitions when the normalized signal resolves to a request compatibility record.

Boundary:

- source-id and normalized-content-hash deduplication happens before local persistence.
- complete fresh snapshots may tombstone missing source refs; offline refresh retains the previous cache and cursor.
- public signal text stays in `readerSignals`; private author interpretation stays in `creativeReminders` and must not copy the raw public text.
- free-text comments and questions enter moderation before public visibility; highlighters must quote published chapter text; reactions use a fixed enum.
- `reader_id` and `reader_is_anonymous` are server-bound columns and are not part of the safe Data API projection.
- each live source has an inclusive local cursor over the server's stable `(updated_at, id)` order; source failure retains the last successful cursor and cached records.

## 写作台

Reads:

- `works`
- `branches`
- `chapters`
- `reader_requests`
- `creator_authorizations`
- local `CreativeReminder` records
- local private drafts
- local setting assets: 人物、能力、地点、地图、势力、物品、规则、时间线

Writes:

- local private draft content
- local `CreativeReminder` fallback when the Writing Desk is opened directly from a reader signal
- local `CreativeReminder.draftId` association when a reader signal becomes a saved draft
- local setting assets created from Socratic stage answers
- cloud private draft reference only after publish flow needs it

Recall and retrieval boundary:

- `creatorEditorRecallViewModels.ts` currently owns a deterministic, author-visible recall directory. It is not an embedding, vector-search, or RAG implementation.
- Future automatic retrieval must enter only through the thin adapter defined by `creator-rag-open-source-boundary.md`; Creator routes and view models may not implement chunking, similarity, BM25, fusion, or reranking.
- Automatic results remain candidates with source ids, revisions, authority, evidence, and locators. Explicit author selections are always included in the `ContextSnapshot` manifest regardless of automatic rank.
- The P0 retrieval stack must run locally without a paid embedding API, hosted vector database, cloud draft upload, or public write.

## 作品与支线

Reads:

- `works`
- `branches`
- `chapters`
- `reader_requests`

Writes:

- work author notice through the current work notice helper
- work hidden status through confirmation
- branch archived status through confirmation
- new IF branch with optional parent line and anchor chapter

## 发布包确认

Reads:

- local private drafts
- local publish-bundle draft records

Creates a local publish-bundle draft before entering Publish Check when the
handoff starts from Writing Desk. The Today route must use the same bundle-draft
target helper instead of constructing legacy draft-query links.

Creates the final local publish bundle after author confirmation, then calls
the publish-bundle adapter. Direct page calls to `publishChapter()` are
forbidden. If the page is opened with a bundle or compatibility private draft
reference, it must open only that draft; stale links must not fall back to a
different local draft.

Adapter writes after explicit confirmation:

- `chapters`
- `branches`
- `publish_events`
- `reader_requests.status = published`

## 创作设置 / 本机工作区

Reads:

- `creator_clients`
- `feature_flags`
- display preferences
- `readLocalWorkspaceSnapshot`
- local drafts
- local reader signals
- local setting assets
- local creative reminders
- local publish bundles
- local publish receipts
- local agent operation records through `creatorLocalAgentRepository.ts`
- local migration receipts through `creatorLocalMigrationRepository.ts`
- recoverable local workspace conflicts through `creatorLocalConflictRepository.ts`
- local draft-body metadata, OPFS path, IndexedDB recovery copy, checksum, byte length, and staged recovery records
- local workspace package and import receipts through `creatorLocalWorkspacePackageRepository.ts`

Writes:

- display preferences
- creator client health/update records

Local Workspace export:

- The Creator UI exports a versioned `.pufw.zip` package built from `readLocalWorkspaceSnapshot`.
- Settings load and backup export await `hydrateLocalWorkspace()` before reading that snapshot.
- `creatorLocalWorkspaceRepository.ts` is the only workspace snapshot aggregation owner; Settings services import it directly and `pmfSupabase.ts` exposes no snapshot wrapper.
- Display preferences, creator-client id, and localhost surface detection are owned by `creatorLocalSettingsRepository.ts`; Settings and shell surfaces call route services backed by that repository, while `pmfSupabase.ts` privately reads only the creator-client id required for cloud payloads.
- Historical tool/provider summaries are readable only through `legacyCreatorToolSettings.ts` for migration or cleanup. They have no product route, write API, or Supabase-facade export.
- `creatorLocalReaderSignalRepository.ts` owns multi-source normalized signal caching, complete-snapshot reconciliation, tombstones, and source cursor/freshness state. External Echo hydrates the repository before refresh so a second tab cannot overwrite a just-recorded author decision with stale state.
- `creatorLocalMigrationPlan.ts` owns one-way legacy merge decisions and IndexedDB-wins conflict handling; `creatorLocalMigrationRepository.ts` exposes applied receipts without reading legacy storage.
- `creatorLocalWorkspaceCoordination.ts` owns per-record Web Locks, redacted BroadcastChannel invalidation, and focus/visibility refresh fallback; `creatorLocalRepository.ts` owns revision compare-and-swap and durable conflict creation.
- `creatorLocalDraftBodyStore.ts` owns OPFS/IndexedDB body storage, SHA-256 body verification, and staged recovery. Durable draft metadata does not inline prose.
- `creatorLocalWorkspacePackage.ts` owns ZIP construction, file checksums, deterministic import preview, confirmation policy, apply, and rollback. `creatorLocalWorkspacePackageRepository.ts` owns local package bytes and import receipts.
- Export includes private drafts, reader signals, setting assets, creative reminders, publish bundles, publish receipts, migration receipts, recoverable workspace conflicts, operation records, and display preferences.
- New exports exclude historical provider mode, service URL, model label, and credential-state summaries. Older packages remain readable; their display preferences are retained and their retired tool settings are discarded at the import boundary.
- Export must not include provider responses, prompts, credential values, service secrets, or cloud generation jobs.
- Import/restore must require a preview and explicit author confirmation before writing into local stores.
