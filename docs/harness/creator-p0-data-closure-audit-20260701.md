# Creator P0 Data Closure Audit

Date: 2026-07-01
Branch: `preview/ui-motion-polish-20260628`
Source plan: `<external-ui-plan>`

## Current Decision

The UI/UX baseline is locked. This pass does not redesign the Creator workbench. It starts the transition from UI preview toward P0 data closure by hardening product copy, fixture boundaries, and data mapping gates.

## Stage Status

| Stage | Status | Evidence |
| --- | --- | --- |
| S0 UI baseline lock | Done | `docs/harness/current-ui-baseline.md` |
| S1 product copy and P0 boundary hardening | Done for current UI copy | `check:ui-copy`, `check:creator-product-boundary` |
| S2 data source and fixture isolation | Done for source-level gate | `check:no-production-mock-data`, `check:creator-data-map` |
| S3 real reader request queue | Partially implemented | `listCreatorRequests()` reads `reader_requests`; full live E2E not completed in this pass. |
| S4 local draft boundary | Partially implemented | `readLocalDrafts()` / `upsertLocalDraft()` use local storage; cloud draft-ref-only table is not completed in this pass. |
| S7 bundle-first publish gate | Partially implemented | `/creator/publish` calls `publishOwnPlatformBundle()`, which creates a local publish bundle and then delegates to the legacy `publishChapter()` cloud write helper; transactional rollback/live proof not completed in this pass. |
| S6 Reader visibility proof | Not completed | Requires browser E2E against live data after publish. |
| S7 port and route docs | Done for review docs touched in this pass | canonical Reader `5200`, Creator QA `5199`. |

## Route Inventory

### Reader

- `/`
- `/library`
- `/story`
- `/settings`
- `/create` redirects to `/library`
- `/studio` redirects to `/library`

### Creator

- `/creator/login`
- `/creator`
- `/creator/requests`
- `/creator/editor`
- `/creator/works`
- `/creator/publish`
- `/creator/settings`

## Creator Data Source Map

| Page | Current Data Sources | Production Boundary |
| --- | --- | --- |
| `/creator` | `listCreatorRequests`, `listCreatorWorks`, `listCreatorBranches`, `listCreatorChapters`, `listCreatorPublishEvents`, `readLocalDrafts` | Reads request/work/branch/chapter/publish tables through `pmfSupabase.ts`; drafts stay local. |
| `/creator/requests` | `listCreatorRequests`, `listCreatorWorks`, `listCreatorBranches`, `updateReaderRequestStatus` | Queue comes from `reader_requests`; heat currently uses `vote_count`; no permanent merge field is written. |
| `/creator/editor` | route params, `listCreatorRequests`, `listCreatorWorks`, `listCreatorBranches`, `listCreatorChapters`, `readLocalDrafts`, `upsertLocalDraft` | Draft prose remains local; publish handoff uses `localDraftRef`. |
| `/creator/works` | `listCreatorWorks`, `listCreatorBranches`, `listCreatorChapters`, `listCreatorRequests`, `createCreatorIfBranch`, status/notice mutations | Maps `works -> branches -> chapters`; IF branch creation is explicit. |
| `/creator/publish` | `readLocalDrafts`, `listCreatorWorks`, `listCreatorBranches`, `listCreatorChapters`, `listCreatorRequests`, `publishOwnPlatformBundle` | Creates a publish bundle and writes public content only after author confirmation. |
| `/creator/settings` | `readLocalAiSettings`, `writeLocalAiSettings`, `syncCreatorClient`, `getCreatorAuthorizationStatus`, `listCreatorFeatureFlags` | Stores only local preferences and credential status; no credential value is rendered. |

## Fixture Boundary

| Area | Status |
| --- | --- |
| Production adapter | `app/src/lib/pmfSupabase.ts` |
| QA fixture adapter | `app/src/__fixtures__/pmfSupabase.creator-qa.ts` |
| Fixture injection | `app/vite.config.ts` aliases `@/lib/pmfSupabase` only when `mode === 'creator-qa'` |
| New gate | `check:no-production-mock-data` verifies production Creator source does not import fixtures or QA ids. |

## Product Copy Boundary

Current visible Creator copy uses:

- `本地创作服务`
- `凭据状态：已配置 / 未配置`
- `候选建议`
- `采纳后影响`
- `发布检查`
- `读者端位置`

The UI must not render:

```text
Supabase, RLS, trace, provider, fallback, API key, 后端, 接口, 同步, 回写, 数据库, AI, 模型, LLM, system prompt, raw hash, service switches, 预览版
```

New gate:

```bash
npm run check:creator-product-boundary
```

## Publish Flow Audit

Current adapter order after `publishOwnPlatformBundle()` creates the bundle:

1. prepare/upsert `branches`
2. insert `chapters`
3. insert `publish_events`
4. update `reader_requests.status = published`

Known limitation:

- This is not yet wrapped in a single database transaction from the browser client.
- If `publish_events` or request update fails after chapter creation, UI receives a failure message, but full rollback is not implemented.
- Reader visibility E2E after publish is still pending.

## Local Draft Audit

Current local draft methods:

- `readLocalDrafts()`
- `upsertLocalDraft(draft)`
- `createLocalDraftRef()`

Boundary:

- Draft prose is read/written through local storage in the Creator adapter.
- Cloud records receive only `local_draft_ref` during publish/request-state updates.

Known limitation:

- There is no separate cloud draft-reference table yet with `draft_ref_id`, `local_client_id`, and status.
- There is no live test yet proving network failure preserves local prose while draft reference recording fails.

## File-Level Change Plan

Completed in this pass:

- Historical note: the former `CreatorSettingsToolPanel.tsx` and its service/access-state setup were later retired by the Pivot V2 Local Workspace slice.
- `CreatorSettingsBoundaryStrip.tsx` now summarizes local records, backup/recovery, creator device, and public rules.
- `app/src/apps/creator/LocalCreatorApp.tsx`: settings notices and service labels aligned to product boundary.
- `app/src/components/creator/workspace/CreatorWritingWorkspace.tsx`: candidate card now uses `候选建议` and `采纳后影响`.
- `scripts/check-creator-product-boundary.mjs`: new visible Creator product-boundary gate.
- `scripts/check-no-production-mock-data.mjs`: new production/fixture boundary gate.
- `scripts/check-creator-data-map.mjs`: new adapter/table/publish/draft mapping gate.
- `package.json`: gates wired into `test:creator`.
- `docs/harness/current-ui-baseline.md`: UI baseline lock.
- `docs/harness/creator-p0-data-closure-audit-20260701.md`: this audit.

Next implementation stage:

1. Move or wrap Creator production data calls under `app/src/features/creator/data/*` without changing UI layout.
2. Add live-reader request aggregation proof using `request_votes` rather than relying only on `vote_count`.
3. Add a cloud draft-reference record that never contains draft prose.
4. Harden publish as an atomic server-side/RPC operation.
5. Add `browser-creator-publish-reader-visible.mjs` after publish flow can safely write live data.
