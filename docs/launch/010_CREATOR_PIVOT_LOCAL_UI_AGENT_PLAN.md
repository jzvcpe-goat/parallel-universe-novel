# Creator Pivot Local UI Agent Plan

Date: 2026-07-03

## Purpose

This document defines the Creator side of the commercial launch path. Creator Pivot V2 is a localhost writing operating system with working-agent assistance. It is not a public author backend, not a generic settings console, and not a reader-request management dashboard.

## Applications Ownership

This plan owns three epics inside `Applications / 开发并部署小说原型`:

| Epic | Scope | Exit Condition |
| --- | --- | --- |
| Epic 2: Local Creator Architecture | Local DB, OPFS, migration, agent action surface, PublishBundle lifecycle and recovery | Local/private data, action, package, lifecycle, and recovery contracts pass their gates |
| Epic 3: External Echo | ReaderSignal adapter, CreativeReminder, comments/highlights/requests intake, echo inbox | Reader input becomes author-controlled creative material instead of tickets |
| Epic 4: Creator UI Pivot | Today creative path, inspiration-to-draft, local writing library, writing desk, local workspace | New IA is backed by real local data and agent actions, then passes browser QA |

It does not own cloud RLS, payment settlement, or production rollout. Those belong to `020` and `030`.

## Required Contract Skeleton

The sections below are required design inputs before the corresponding implementation phase. Their presence in this plan is not evidence that the feature has shipped.

### Creator Information Architecture

```text
今日创作路径
-> 外界回声
-> 灵感到正文
-> 本机写作智库
-> 写作台
-> 发布包
-> 本机工作区
```

Each surface must have a real data owner and an agent-action contract before it becomes a route. Renaming an old route does not complete the pivot.

### Local Data Schema

The local repository must eventually own at least:

- `LocalDraftRecord`
- `LocalWritingAsset`
- `CreativeReminder`
- `ReaderSignalCacheRecord`
- `PublishBundleRecord`
- `PublishReceiptRecord`
- `AgentOperationLog`
- workspace metadata and migration receipts

Private prose, character arcs, maps, skill systems, method cards, and author decisions remain local.

### IndexedDB And OPFS Strategy

- IndexedDB/Dexie-style repositories own structured records and indexes.
- OPFS owns large manuscript bodies and exported workspace payloads when browser support permits.
- `localStorage` is migration input only.
- Web Locks and BroadcastChannel coordinate tabs before writes.
- Workspace export/import must be versioned and reversible.

### Agent Manifest And Operable UI

Every agent-operable action must be registered before a page can expose it. The contract includes:

- stable action id and stage scope
- `data-agent-action`
- `data-agent-risk`
- input/output schema
- whether author confirmation is required
- operation log and rollback semantics

The agent may propose, inspect, compare, and prepare. It may not publish or overwrite author work without explicit confirmation.

### CreativeReminder

ReaderSignal is external cloud input. CreativeReminder is an author-owned local interpretation. Conversion must be explicit, reversible, and must not upload private author reasoning.

### PublishBundle

The writing desk prepares a versioned bundle containing the author-approved chapter, destination, branch linkage, public metadata, linked signal references, and confirmation state. The cloud receives published output and an opaque local reference, not local drafts or prompts.

### Atomic UI Contract

- Compose from shadcn/Radix primitives and project semantic tokens.
- Page routes own composition and React state, not low-level persistence or command semantics.
- LiquidGlass is reserved for layered controls, assistant surfaces, and spatial hierarchy; manuscript reading/editing remains quiet.
- New page-local CSS, raw colors, and one-off component systems are rejected by gates.
- Product copy follows `docs/product/ui-copy-dictionary.md` and must not expose implementation language.

## Product Skeleton

Pre-pivot skeleton:

```text
今日 -> 读者请求 -> 写作台 -> 作品与支线 -> 发布检查 -> 创作设置
```

Pivot V2 target skeleton:

```text
今日创作路径 -> 外界回声 -> 灵感到正文 -> 本机写作智库 -> 写作台 -> 发布包 -> 本机工作区
```

This is a product architecture change. Visual polish alone does not complete the pivot.

## Local Creator Boundary

| Layer | P0 Boundary |
| --- | --- |
| UI | Vite/React localhost Creator surface. |
| Storage | Local repository / IndexedDB-style abstraction for drafts, reminders, writing assets, bundles, receipts, and operation records. |
| Agent help | Manifest-driven author-assist actions with explicit risk and confirmation rules. |
| Reader feedback | Enters as External Echo and CreativeReminder candidates. |
| Publishing | Publish bundle first; the adapter calls the server-owned RPC and consumes its authoritative receipt. |
| Cloud | Stores public content, request state, publish events, and opaque local references only. |

## Milestone Order

| Milestone | Meaning | Gate |
| --- | --- | --- |
| M0 | Contract, launch docs, slicing, and feature flags | `check:slicing`, `check:pivot` |
| M1 | Local data layer | `check:local-data-layer`, `check:local-migration`, `check:no-localstorage-outside-migration` |
| M2 | Agent action surface | `check:agent-surface` |
| M3 | External Echo | `check:no-old-request-framing`, `check:creator-m3-requests` |
| M4 | Publish bundles | `check:publish-bundle-schema`, `check:publish-bundle-lifecycle`, `check:publish-receipt-recovery`, `qa:publish-bundle-roundtrip`, `check:creator-m6-publish` |
| M5 | Atomic UI system | `check:no-page-local-css`, `check:no-raw-colors`, `check:design-system-boundary` |
| M6 | Creator IA refactor | `check:creator-route-registry`, browser QA |
| M7 | Stuck rescue | Agent-surface expansion and author-confirmed actions |
| M8 | Migration and rollback | `check:local-migration`, `qa:local-db-migration`, and `050_CUTOVER_ROLLBACK_PLAN.md` gates |
| M9 | QA and deletion | `060_ACCEPTANCE_GATES_MATRIX.md` tightened gates |

## UX Principle

The working agent must be legible as assistance to the author:

- It suggests next actions without taking authorship away.
- It can ask focused questions during a stage.
- It can propose candidates, but the author chooses.
- It can prepare a publish package, but publishing is confirmed by the author.
- It keeps private reasoning, provider plumbing, model settings, and storage mechanics out of product copy.

## Reuse Rule

Existing Creator components can be reused only after classification in `042_LEGACY_INVENTORY.md` and ownership in `043_SLICE_OWNERSHIP_MATRIX.md`.

## Current Execution Position

The governance-first round is complete. Current evidence and the dependency-ordered implementation plan are recorded in:

```text
044_EPIC_1_SLICE_CLOSEOUT_EPIC_2_READINESS.md
045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md
```

Epic 2 Local Creator Architecture is accepted on 2026-07-10: cross-tab coordination, draft-body/package recovery, the historical 22-action Agent surface baseline, and the durable PublishBundle lifecycle all have focused and real-Chrome evidence. The current registry has since expanded to 24 actions and is enforced by `check:agent-surface`. The downstream WP6 server-owned publish transaction is now repository-accepted: the application adapter uses `publishBundleTransaction() -> publish_bundle_transaction`, and its isolated PostgreSQL, authorization, idempotency, and rollback gates are green. Live Supabase application and strict receipt proof remain explicitly deferred. Creator IA and visual cutover remain blocked until External Echo live-source cloud/RLS evidence is accepted; while that external step is deferred, work may continue only through evidence-backed Epic 1 cleanup and existing contracts, not route renaming or visual-first IA changes.

## Historical First-Round Boundary

The first round only froze governance, flags, inventories, and gate entrypoints. It did not change Creator visuals or add routes. That historical boundary remains the reason later implementation must advance through gates rather than visual-first work.
