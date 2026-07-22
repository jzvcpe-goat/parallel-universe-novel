# Local Creator Storage V2 Contract

Date: 2026-07-03

M0 recorded the target local data model. S4 starts the storage-driver cutover.

## P0.5 Target

```text
IndexedDB / Dexie: structured local data
OPFS: long draft bodies and workspace packages
local export: author-visible backup and migration package
```

## Required Local Records

- `LocalDraftRecord`
- `LocalWritingAsset`
- `LocalReaderSignalCache`
- `CreativeReminder`
- `VerifiedLongRangeThreadRecord`
- `PublishBundleRecord`
- `PublishReceiptRecord`
- `AgentOperationLog`
- Local workspace meta:
  - creator client id
  - display preferences
  - historical tool-setting summary as read-only migration/cleanup data only

The source type definitions live in:

```text
app/src/local-db/schema.ts
```

Canonical writing asset kinds for P0 are:

- `character`: 人物
- `skill`: 能力
- `location`: 地点
- `map`: 地图
- `faction`: 势力
- `item`: 物品
- `rule`: 规则
- `timeline`: 时间线

The active `writingAssets` store uses `localAssetRef`, `workId`, `kind`,
`stage`, and `updatedAt` as its contract shape. Older vocabulary such as
method cards or plot beats can remain product research input, but it must not
replace these eight story-bible asset kinds inside the P0 local writing library.

## Migration Rule

Current `localStorage` draft and setting-asset data is legacy. It must be migrated by a repeatable runner; migration failure must not delete the old data.

### S4.1 one-way migration acceptance

- Schema v4 created the missing `draftBodies` store and the declared query indexes while preserving existing records.
- Schema v5 added `workspaceRevisions` and `workspaceConflicts` without changing or deleting existing author records.
- `LOCAL_SCHEMA_VERSION = 6` adds `workspacePackages` and `workspaceImports`, upgrades `draftBodies` with staged/ready indexing, and preserves every earlier store.
- `LOCAL_SCHEMA_VERSION = 10` adds `verifiedLongRangeThreads` without backfilling temporary review files or changing existing records. Only independently verified, exact-locator records may enter this store after explicit author confirmation.
- Legacy drafts, setting assets, and local meta are considered only when the stable `legacy-local-storage-v1` receipt is absent.
- IndexedDB records win every identity conflict. Older `localStorage` data may fill a missing record, but it may never overwrite an IndexedDB draft, setting asset, or meta value.
- The migration receipt is written in the same IndexedDB transaction as imported drafts, setting assets, and meta records. A partial write must not be reported as an applied migration.
- The receipt records source counts, imported counts, preserved conflict counts, schema version, conflict policy, and original application time.
- Reloading with the receipt present must ignore later or stale legacy values and retain the original receipt.
- Legacy keys remain read-only recovery input. Successful migration does not delete or rewrite them.
- Writes issued while repository hydration is running are retained through pending-write buffers so hydration cannot replace a newer in-memory author action.

Behavior is checked by `check:local-migration`; real browser IndexedDB upgrade, reload, conflict precedence, receipt uniqueness, and legacy-source preservation are checked by `qa:local-db-migration`.

### S4.2 cross-tab write coordination acceptance

- Web Locks is the primary same-origin single-writer boundary for each record family and record id.
- IndexedDB compare-and-swap on `workspaceRevisions` is the correctness fallback when Web Locks is unavailable and the stale-write guard even when a lock exists.
- A writer saves against the revision it observed when it read the record. A newer durable revision must never be silently overwritten.
- A stale write creates a recoverable local conflict record in `workspaceConflicts`; the current durable record remains unchanged.
- BroadcastChannel is an invalidation channel only. Its payload is limited to schema version, workspace id, source id, change kind, record family, record id, revision, and timestamp; it must never contain prose, draft bodies, titles, reader text, provider data, or credentials.
- Receiving a remote invalidation rehydrates the repository from IndexedDB. Window focus and visibility recovery provide a refresh fallback when BroadcastChannel is unavailable or suspended.
- A failed write must release the write boundary and must not poison later saves.
- No cross-tab coordination state may be stored in `localStorage`.
- The editor also fails closed when an intentional full-body save exactly matches a retained historical body while differing from the current body. This protects newer same-tab author edits from an older export or clipboard snapshot; it does not silently restore the old body.
- A blocked historical-body submission does not advance `workspaceRevisions`, replace the canonical body, or delete the recoverable conflict record. A genuinely new body remains saveable immediately afterward.

Static and behavior ownership is checked by `check:local-coordination`. Real Google Chrome two-tab stale-write, redacted invalidation, conflict preservation, refresh, same-tab historical-body rejection, and post-failure fresh-write recovery are checked by `qa:local-db-cross-tab`.

### S4.3 draft-body ownership acceptance

- IndexedDB remains the structured metadata source of truth. Durable `drafts` records contain title, work/branch linkage, body storage reference, format, SHA-256 checksum, UTF-8 byte length, body version, and update time; they do not contain manuscript prose.
- OPFS is the preferred body store when the browser supports it.
- `draftBodies` remains the universal recovery copy and IndexedDB fallback even when OPFS succeeds.
- Every body write first creates a checksum-bearing staged body. It is not reported as saved until metadata, canonical recovery body, and workspace revision commit together.
- OPFS failure selects the IndexedDB recovery copy rather than failing back to `localStorage`.
- OPFS corruption or loss falls back to a checksum-verified ready `draftBodies` record.
- A transaction failure leaves the staged body available for local recovery while the previous durable metadata/body remains readable.
- Updating a committed OPFS body removes the previous body path after the new commit succeeds.
- The IndexedDB recovery store retains at most five previous canonical bodies as local-only `history` records. The editor compares a full-body save against their SHA-256 checksums before committing; history is not uploaded and is not treated as Canon.
- Existing inline draft records migrate under the same per-record lock before they become the active snapshot.

Ownership is checked by `check:local-body-storage`; OPFS preference, IndexedDB recovery parity, inline-prose removal, and staged-write recovery are proven by `qa:workspace-export-import`.

### S4.4 workspace package and recovery acceptance

The author-visible transport is a standard ZIP named `*.pufw.zip` with this contract:

```text
manifest.json
records.json
bodies/*.md
receipts/*.json
```

- `manifest.json` declares `puf-local-creator-workspace-v2`, package id, source local schema version, creation time, and SHA-256 plus byte length for every declared file.
- `records.json` contains sorted record envelopes. Draft envelopes reference `bodies/*.md`; they do not inline manuscript prose.
- Migration receipts are exported as separate `receipts/*.json` evidence files.
- Undeclared files, missing files, byte-length mismatches, malformed records, and checksum mismatches are rejected before preview or writes.
- Import preview is deterministic and separates additions, conflicts, unchanged records, and unsupported records.
- Preview and cancel are read-only. Apply requires explicit author confirmation and a selected `keep-local` or `use-import` conflict policy.
- Before apply, the repository writes a checksum-bearing rollback snapshot and an `applying` receipt. Partial failure becomes a recoverable `failed` receipt rather than a false success.
- Apply verifies the fingerprint of every selected record before the receipt becomes `applied`.
- Rollback removes records added by the import, restores only overwritten records from the rollback snapshot, and marks the receipt `rolled_back`.
- Import receipts bind selected records to their content fingerprints. Rollback refuses to overwrite an author change made after import.
- Historical decision records are normalized by the current decision-repository schema owner before preview, conflict comparison, and import fingerprinting. Missing legacy Context fingerprint fields become `compilationPolicyVersion: 0` and `sourceFingerprint: legacy-unfingerprinted`, so the record remains stale until the current compiler rebuilds it.
- Browser download and file upload are the universal P0 transport. Package bytes and rollback snapshots remain local; no cloud draft store is introduced.
- The Creator settings surface must expose the real package path: choose a local `.pufw.zip`, preview additions/conflicts/unchanged/unsupported counts, select `keep-local` or `use-import`, and pass an explicit `ConfirmActionDialog` before apply. Preview is not success, and a file picker without repository apply is not accepted as implementation.

Ownership and structure are checked by `check:workspace-package`; the gate also requires the settings Route, import-flow service, file input, conflict selector, confirmation dialog, and focused integration test. Real download/upload, corrupt-package rejection, cancel, confirmed apply, both conflict policies, addition rollback, overwrite rollback, and post-import edit protection are proven by `qa:workspace-export-import`. The archived 2026-07-15 20-chapter workspace is separately exercised by `qa:real-workspace-package-migration`: 1021 records apply to schema v10, Canon blocks remain exact, 25 historical Context records remain stale, and the Creator route restores Chapter 20 without triggering Chapter 21. A separate real settings-surface Computer Use run imported the same package through preview, `use-import`, and author confirmation; its receipt is `validation/creator-writing/computer-use-chapter-20-recall-review-2026-07-18.json`.

### S4.5 verified long-range thread acceptance

- `verifiedLongRangeThreads` is the durable local owner for independently reviewed long-range causal, knowledge, timeline, promise, foreshadowing, and character-arc records.
- Raw Observer output and rejected verification items are never imported. Persistence requires exact review/verification agreement and explicit author confirmation.
- Records retain exact work, branch, source chapter, Canon block locator, source quote, source revision, lifecycle status, confidence, and verification receipt. They remain `localOnly`.
- Recall projection is fail-closed: wrong work/branch, current or future chapters, non-active lifecycle states, high-confidence active claims, changed source revision, missing block ids, and changed source quotes are excluded.
- Eligible cards always begin unselected. Persistence does not select them, alter Context Snapshot, edit candidate prose, write Canon, call cloud data, or publish.
- Workspace export/import includes the verified records and preserves the same author-confirmed import boundary.

Domain and repository ownership are checked by `check:creator-long-range-thread-repository`; real Google Chrome IndexedDB persistence, revision/evidence invalidation, delete/restore workspace-package roundtrip, and side-effect isolation are proven first with a negative fixture by `qa:verified-long-range-thread-repository`, then with all 13 independently verified Chapter 1-20 thread records by `qa:verified-long-range-thread-real-repository`. The retained receipts are `validation/creator-writing/verified-long-range-thread-repository-2026-07-17.json` and `validation/creator-writing/verified-long-range-thread-real-repository-2026-07-17.json`.

## S4 implemented repository boundary

Active draft, writing-asset, reader-signal cache, local publish, local agent operation-log, workspace snapshot, local client identity, local AI setting, and display-preference writes/reads go through the local repository layer:

```text
app/src/local-db/creatorLocalRepository.ts
app/src/local-db/creatorLocalDraftRepository.ts
app/src/local-db/creatorLocalWritingRepository.ts
app/src/local-db/creatorLocalSettingAssetRepository.ts
app/src/local-db/creatorLocalReaderSignalRepository.ts
app/src/local-db/creatorLocalLongRangeThreadRepository.ts
app/src/local-db/creatorLocalPublishRepository.ts
app/src/local-db/creatorLocalAgentRepository.ts
app/src/local-db/creatorLocalWorkspaceRepository.ts
app/src/local-db/creatorLocalSettingsRepository.ts
app/src/local-db/legacyCreatorToolSettings.ts
app/src/local-db/creatorLocalMigrationPlan.ts
app/src/local-db/creatorLocalMigrationRepository.ts
app/src/local-db/creatorLocalWorkspaceCoordination.ts
app/src/local-db/creatorLocalWriteTransaction.ts
app/src/local-db/creatorLocalConflictRepository.ts
app/src/local-db/creatorLocalLegacyMigrationApplier.ts
app/src/local-db/creatorLocalDraftHydration.ts
app/src/local-db/creatorLocalDb.ts
app/src/local-db/creatorLocalIntegrity.ts
app/src/local-db/creatorLocalDraftBodyStore.ts
app/src/local-db/creatorLocalWorkspacePackage.ts
app/src/local-db/creatorLocalWorkspacePackageRepository.ts
```

Legacy `localStorage` is read-only migration input through:

```text
app/src/local-db/legacyLocalStorageMigration.ts
```

The Supabase adapter exposes no local workspace function API. `creatorLocalDraftRepository.ts` owns private draft refs and private draft reads/writes; `creatorLocalReaderSignalRepository.ts` owns local reader-signal cache records converted from cloud reader requests; `creatorLocalWritingRepository.ts` owns creative-reminder rules; `creatorLocalLongRangeThreadRepository.ts` owns author-confirmed verified-thread persistence and fail-closed recall loading; `creatorLocalSettingAssetRepository.ts` owns story-bible writing-asset refs, normalization, de-duplication, and writes; `creatorLocalPublishRepository.ts` owns publish-bundle and publish-receipt read/write semantics; `creatorLocalAgentRepository.ts` owns working-agent operation-log read/write semantics; `creatorLocalWorkspaceRepository.ts` owns the local workspace snapshot aggregation for drafts, reader signals, writing assets, reminders, verified long-range threads, publish bundles, publish receipts, conflicts, and operation records; `creatorLocalWorkspaceCoordination.ts` owns same-origin locks, redacted invalidation, and focus/visibility refresh signals; `creatorLocalWriteTransaction.ts` owns the lock-to-commit-to-notification sequence; `creatorLocalConflictRepository.ts` exposes local recoverable conflict records; `creatorLocalLegacyMigrationApplier.ts` owns the atomic put-if-missing legacy transaction and receipt write; `creatorLocalDraftHydration.ts` owns metadata/body restoration and staged recovery. `creatorLocalSettingsRepository.ts` owns creator-client id, display preferences, and localhost surface detection. `legacyCreatorToolSettings.ts` is a read-only migration/cleanup owner for historical provider summaries. The cloud facade may privately read creator-client id for payload identity. One consumed `PmfCreativeReminder` type bridge remains for the deferred route-adjacent TSX compatibility boundary; zero-consumer local types are not re-exported.

Repository meta values are stored in the local DB `meta` store. The legacy migration may read the older localStorage keys, but it must not write back to or delete those keys.

Local settings rule:

- `CreatorSettingsRoute.tsx` delegates display-preference and localhost decisions through route services backed by `creatorLocalSettingsRepository.ts`.
- `pmfSupabase.ts` may privately read `getLocalCreatorClientId()` for cloud payload identity, but all display-preference and localhost consumers import `creatorLocalSettingsRepository.ts` directly and the facade exposes no local settings wrappers.
- Historical provider mode, endpoint label, model label, and credential-state summaries remain read-only migration data. Product routes, new workspace packages, and cloud adapters must not write or expose them.

The repository also owns first concrete read/write entrypoints for:

- `LocalReaderSignalCache`
- `CreativeReminder`
- `VerifiedLongRangeThreadRecord`
- `PublishBundleRecord`
- `PublishReceiptRecord`
- `AgentOperationLog`

Those records are local-only in P0. They support External Echo signal caching, reminders, bundle-first publishing, receipts, and working-agent operation evidence without creating a cloud AI runtime or exposing provider data.

Local Workspace export rule:

- `/creator/settings` is the compatibility route for the visible `本机工作区`.
- The page may call the local workspace snapshot owner to show counts and export a versioned `.pufw.zip` package, but aggregation must live in `creatorLocalWorkspaceRepository.ts` and package construction in `creatorLocalWorkspacePackage.ts`.
- Settings loading and backup export must await `hydrateLocalWorkspace()` before reading the snapshot so a fast click cannot omit IndexedDB records or the migration receipt.
- The package can include private drafts, reader signals, writing assets, reminders, publish bundles, publish receipts, migration receipts, recoverable workspace conflicts, operation records, and display preferences because it is downloaded by the author on the current device.
- New packages exclude historical provider mode, endpoint, model, and credential-state summaries. Import normalizes older `workspaceSettings` records to display preferences only.
- The backup must not include prompt text outside draft prose, provider response payloads, credential values, service secrets, or a cloud generation job.
- Import/restore requires checksum verification, preview, conflict policy, rollback snapshot, and author confirmation; no automatic overwrite is allowed.

External Echo conversion rule:

- Reader-facing requests, comments, highlights, reactions, questions, and vote aggregates remain public/cloud source concepts. Production currently supplies request and vote batches; the other source adapters are fixture-proven until their Epic 5 cloud schema and RLS exist.
- Every source enters through one `ReaderSignalAdapter<T>` contract and normalizes into local `LocalReaderSignalCache` records for workspace recall and offline author context.
- Deduplication uses source id first and normalized content hash second. Complete fresh snapshots may tombstone missing source refs; offline snapshots must retain the previous cache and cursor.
- Schema v8 persists one `ReaderSignalSourceSyncState` per source with cursor, fetched time, last successful time, status, record count, and credential-free error code.
- Deterministic rules may create `suggested` reminders, but only explicit author pin/use/dismiss/edit/associate actions may change author-owned reminder state.
- When the author chooses to start writing from an External Echo, the Creator may pin that signal into a local `CreativeReminder`.
- When the Writing Desk is opened directly with an External Echo route, it must create the missing local `CreativeReminder` fallback before the author saves a draft.
- The reminder stores `sourceSignalIds`, work/chapter context, author-facing note, status, and local timestamps.
- When the author saves a draft from that signal, the Writing Desk updates the same reminder with `draftId` and marks it as used locally.
- It must not upload draft prose, prompt text, provider output, or a cloud generation job.
- Public signal raw text must not be copied into the private reminder title/note. The reminder records ids, author interpretation, status, and local associations only.

## Product UI Language

Use:

- `已保存到本机`
- `保存中`
- `刚刚保存`
- `无法保存，请导出当前正文`
- `本机空间不足，请先导出备份`

Do not use:

- `sync`
- `backend`
- `database`
- `provider`
- `API key`
## Schema v7 Agent confirmation extension

Schema v7 preserves the accepted schema v6 body/package model and adds `agentConfirmations`. Confirmation receipts and correlated operation events are local-only protocol evidence. They are not included in the workspace export package and never contain manuscript prose, raw instructions, credentials, provider responses, or hidden reasoning.

High-risk confirmation records are bound to operation id, action name, target id, input hash, and expiry. Consumption is atomic and single-use. Rollback means disabling the Agent feature while preserving v7 records; the local database is never downgraded or deleted.

## Schema v8 External Echo source-state extension

Schema v8 preserves every accepted v7 store and adds `readerSignalSources`. The new store contains only source name, cursor, freshness/status timestamps, record count, and a credential-free error code. It contains no comment body, manuscript prose, author interpretation, prompt, provider response, credential, or hidden reasoning.

`readerSignals` remains the normalized public-source cache. `creativeReminders` remains the private author-interpretation store. Source refresh can update public cache/source state and deterministic `suggested` records, but it must preserve pinned, used, dismissed, edited, and draft-associated author state.

Rollback means disabling External Echo refresh while preserving schema v8 records. The database is not downgraded or deleted; request-only compatibility may continue reading the normalized cache.

## Schema v9 Creator Decision Workbench extension

Schema v9 preserves every accepted v8 store and adds `creationSessions`, `authorIntents`, `contextSnapshots`, `narrativeCandidates`, `sceneDrafts`, `literaryReviews`, `repairProposals`, `canonPatches`, `localCanonStates`, and `creationDecisionEvents`.

`creatorLocalDecisionRepository.ts` is the only persistence owner for these records. It validates every record with the V1 schemas, coordinates writes through the shared workspace lock, and commits the accepted scene draft, confirmed canon patch, local canon state, updated session, and audit event in one IndexedDB transaction. Model output cannot call this commit without the author-confirmed workflow transition.

Workspace export/import includes these record families with the existing integrity, preview, conflict, receipt, and rollback guarantees. Legacy draft migration creates only a recoverable session reference; it does not invent an author intent or copy the existing manuscript into a second owner.

Rollback means disabling the Decision Workbench surface while preserving schema v9 records through the current forward-compatible reader. The database is never downgraded or deleted.

## Schema v10 verified long-range thread extension

Schema v10 preserves every accepted v9 store and adds `verifiedLongRangeThreads`. The store is local-only and contains no raw unverified Observer response. Its write owner accepts only strict `verified-long-range-thread.v1` records produced from matching review and independent verification evidence after explicit author confirmation.

The recall loader revalidates the current Canon revision and exact source block/quote before projection. Lifecycle-complete or stale records remain durable history but do not enter the active recall directory. Workspace packages include these records under the existing integrity, preview, conflict, receipt, and rollback guarantees.

Rollback means disabling verified-thread recall while retaining the schema v10 reader and records. The database is never downgraded or deleted.
