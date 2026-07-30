# Legacy Refinement And Deletion Plan

Date: 2026-07-03

## Purpose

This document is the precondition for Creator Pivot V2 implementation. It is not a new UI design document. It exists to cut, classify, purify, isolate, and eventually delete legacy project material before new Creator UI work continues.

## Applications Ownership

This plan owns Epic 1: Legacy Refinement. It is a continuous guardrail across Epics 2-4, not a one-time cleanup appendix.

Epic 1 owns:

- splitting giant route and shell files by responsibility
- moving compatibility owners behind explicit legacy/adaptor boundaries
- removing old page-local CSS after atomic components take ownership
- preventing direct `localStorage` and direct publish paths from returning
- deleting old request-management components only after wrapper migration and gate proof
- maintaining Preserve / Extract / Adapt / Deprecate / Delete decisions

It does not invent the new Creator IA or change page visuals.

The current project still contains valuable pre-pivot PMF work, but the dominant Creator skeleton is still:

```text
今日 -> 读者请求 -> 写作台 -> 作品与支线 -> 发布检查 -> 创作设置
```

Creator Pivot V2 requires:

```text
今日创作路径 -> 外界回声 -> 灵感到正文 -> 本机写作智库 -> 写作台 -> 发布包 -> 本机工作区
```

This is not a visual-only difference. It is a product skeleton difference. Continuing to patch the old UI would preserve the request-management backend model and keep polluting the local writing OS direction.

## Non-Negotiable Boundary

- The source of truth is `<repository-root>`.
- `<legacy-integration-harness>` is treated as legacy workspace material unless explicitly resynced.
- `<external-artifacts-root>`, `artifacts/handoff`, and old deploy packages are read-only evidence and must not be imported back into product code without review.
- `<legacy-static-ui-reference>`, `<legacy-novel-package>`, and `<legacy-frontend-export>` are external/legacy IF-novel references, not implementation sources.
- No external frontend is allowed to merge into the release tree without a separate approval pass.
- Do not edit `<unrelated-project>` for this project.

## Classification Model

| Label | Meaning | Default Action |
| --- | --- | --- |
| Preserve | Keep as-is | Use directly and protect with gates |
| Extract | Pull out a lower-level capability | Move or wrap behind V2 contract |
| Adapt | Reuse after product semantics change | Rename, reframe, and rewire |
| Deprecate | Keep for compatibility only | Block new references and schedule deletion |
| Delete | Remove after gates prove no dependency | Delete in S9 only |

## Target Cleanup Themes

| Legacy Theme | Risk | V2 Treatment |
| --- | --- | --- |
| Request-management framing | Turns Creator into a ticket queue | Strangle into External Echo and CreativeReminder |
| Page-local CSS and raw colors | Makes UI hard to maintain and impossible to systematize | Move to tokens and atomic shadcn/Radix compositions |
| `localStorage` draft persistence | Too fragile for localhost writing OS | Migrate to IndexedDB/Dexie with OPFS for long bodies |
| Generic browser-token storage helper | Hid authentication persistence behind a reusable name and allowed the API client to bypass its owner | Delete `app/src/lib/storage.ts`; isolate unchanged compatibility keys in `authSessionStorage.ts` and leave production session hardening to Epic 5 |
| Direct publish path | Bypasses publish-bundle mental model | Convert to bundle-first publish and receipt import |
| Workspace/handoff artifacts | Old code can silently re-enter release | Treat as read-only references and block imports |
| IF-novel external folders | Can introduce unrelated UI/backend assumptions | Audit as references only; no direct merge |

## Relationship To Previous UI Delivery

The previous UI/UX delivery remains useful: it introduced Reader/Creator separation, shadcn/Radix primitives, LiquidGlass, semantic tokens, Creator writing surfaces, request cards, publish confirmation, and copy gates. But that delivery explicitly did not complete backend, database, security, payment, or production launch. It also still carried the old IA.

This plan keeps the useful components, but stops treating them as final product architecture.

## Relationship To Yuzhou Research

The Yuzhou/one-stop-writing research is not a visual source to copy. Its useful signal is product structure: Creator must stop behaving like a request-management console and become a local writing operating system.

That means the slicing workflow treats the old request queue, old publish check, old settings panel, and old page CSS as material to classify before reuse. The target capability set is:

| Research Signal | Pivot V2 Capability | Legacy Treatment |
| --- | --- | --- |
| Writing process order | `今日创作路径` | Adapt old Today panels only after IA rename and route ownership |
| Method library and structured writing aids | `本机写作智库` | Extract writing assets, prompts, and method cards into local data contracts |
| Immersive writing space | `写作台` | Extract editor surface; remove request-ticket dominance |
| Stuck-writing rescue | `卡文急救` | Extract as agent-surface actions, not floating product slogans |
| Reader feedback as inspiration | `外界回声` / `创作提醒` | Strangle old request queue into echo/reminder candidates |
| Author-controlled release | `发布包` | Replace direct publish mental model with bundle-first review |

## Execution Order

```text
S0 Freeze source of truth
S1 Legacy inventory
S2 Gates first
   - historical reference boundary
S3 Extract shell and route registry
S4 Extract local data layer
S5 Extract agent action surface
S6 Strangle requests into echo
S7 Bundle-first publish
S8 UI atomic refactor
S9 Delete old code
```

No new Creator UI rebuild should start before S0-S2 are complete.

## Deletion Preconditions

A legacy owner can move to `Delete` only when:

1. Its replacement contract and owner are named in `043_SLICE_OWNERSHIP_MATRIX.md`.
2. Active imports are zero.
3. Migration or compatibility reads have a tested replacement and rollback path.
4. Product-copy, storage, style, agent, and publish gates pass without an allowlist exception for that owner.
5. Browser QA proves the author flow still works.
6. The inventory and handoff notes record the deletion receipt.

Until then, legacy owners remain classified and isolated; they are not silently copied into Pivot V2.

## Current Status

| Stage | Status | Notes |
| --- | --- | --- |
| S0 | Governance round complete | Source of truth and no-touch boundaries are declared here, in `000`, and in `AGENTS.md`. |
| S1 | Active | Inventory exists; deletion classifications remain evidence-gated. |
| S2 | Active and green | Root `check:pivot` and the classification gates pass. |
| S3 | In progress | Shell/route registry and route/service ownership seams exist; full IA cutover is not complete. |
| S4 | Accepted application/local boundary | IndexedDB schema v10, one-way migration, cross-tab coordination, OPFS/IndexedDB body recovery, Creator Decision Workbench and verified long-range thread records, and versioned workspace export/import/rollback pass focused and browser gates. |
| S5 | Accepted application/local boundary | Twenty-two typed Agent actions, confirmation receipts, redacted operation logs, and browser-operable author-control flows pass focused and real-Chrome gates. |
| S6 | Repository accepted; live pending | External Echo application/local ownership and four-source cloud schema/RLS/moderation packages exist; strict live source evidence remains deferred. |
| S7 | Repository accepted; live pending | PublishBundle lifecycle and the server-owned publish transaction package pass isolated tests; live SQL application and strict receipt proof remain deferred. |
| S8 | In progress | Route/controller/service and atomic-component purification is underway; final Pivot V2 IA and visual QA remain. |
| S9 | In progress | Obsolete request/publish owners, prototype persistence hooks, the workspace compatibility barrel, direct browser publish ownership, the generic token-storage helper, old DOM hooks, verified orphan Writing Desk/conversation/flow CSS families, the Reader toolbar wrapper, the migrated Reader tool-button global hook, the cross-page author-decision selectors, the Works branch-line selectors, and the External Echo status-strip selectors are deleted behind tightened gates. |

## Current Implementation Boundary

Evidence-backed deletion may continue when zero-consumer, replacement-owner, focused-gate, build, and browser evidence all exist. This work must not change visuals, add routes, advance Creator IA, or treat deferred live Supabase evidence as complete.
