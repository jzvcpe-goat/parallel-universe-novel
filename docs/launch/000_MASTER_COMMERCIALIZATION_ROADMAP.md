# Master Commercialization Roadmap

Date: 2026-07-03

## Purpose

This is the launch document spine for the parallel-universe novel product. It keeps product direction, engineering boundaries, cleanup work, and release gates in one place so Creator Pivot V2 does not drift back into the pre-pivot PMF prototype.

The current commercial path is not cloud AI first. It is:

```text
Reader Web
-> reader feedback and branch demand
-> Local Creator App
-> local writing and author confirmation
-> publish bundle
-> Reader-visible update
-> PMF evidence
```

## Applications Project Placement

This roadmap belongs to the Codex Applications project `开发并部署小说原型` and governs only the active release repository:

```text
<repository-root>
```

The following locations are outside this project's writable scope unless a later, explicit decision changes the boundary:

- `<unrelated-project>`
- `<legacy-integration-harness>`
- historical handoff packages, exported frontends, and IF-novel reference folders

The Applications project is divided into four mandatory workstreams. The split is an ownership boundary, not four independent codebases.

| Workstream | Plan | Owned Epics | Owns | Explicitly Does Not Own |
| --- | --- | --- | --- | --- |
| Creator Pivot / Local UI / Agent Plan | `010_CREATOR_PIVOT_LOCAL_UI_AGENT_PLAN.md` | Epic 2, Epic 3, Epic 4 | Local Creator architecture, External Echo, agent-operable surfaces, local writing library, publish-bundle preparation, Creator IA | Cloud RLS, billing settlement, production cutover |
| Backend / Database / Security Plan | `020_BACKEND_DATABASE_SECURITY_PLAN.md` | Epic 5 | Cloud schema, migrations, RLS, publish transaction, reader feedback records, audit logs | Private author drafts, local model credentials, Creator visual design |
| Payment / Production Launch Plan | `030_PAYMENT_PRODUCTION_LAUNCH_PLAN.md` | Epic 6, Epic 7 | Plans, orders, entitlements, billing events, deployment, monitoring, backup, rollback, closed beta | Local writing logic and private agent state |
| Legacy Refinement / Deletion Plan | `040_LEGACY_REFINEMENT_DELETION_PLAN.md` | Epic 1 | Preserve/Extract/Adapt/Deprecate/Delete decisions and anti-regression gates | New product IA or visual redesign |

Epic 0 is cross-workstream governance and is owned by this master roadmap, feature flags, the legacy inventory, and the acceptance gates.

## Epic Portfolio

This table assigns ownership and order. It does not claim that an epic is complete; completion requires the named evidence and gates.

| Epic | Name | Primary Deliverables | Entry Dependency | Completion Evidence |
| --- | --- | --- | --- | --- |
| Epic 0 | Pivot Governance | Master roadmap, four plans, feature flags, gates, legacy inventory | Product pivot decision | `check:slicing` and governance artifacts agree |
| Epic 1 | Legacy Refinement | Split giant files, isolate legacy owners, remove old CSS, retire request-management components after wrappers exist | Epic 0 | `check:legacy-imports`, copy/storage/style gates, deletion receipts |
| Epic 2 | Local Creator Architecture | Local DB, OPFS, migration, agent surface, publish-bundle contracts | Epic 0 and active Epic 1 guardrails | local-data, agent-surface, and publish-bundle gates |
| Epic 3 | External Echo | `ReaderSignal`, `CreativeReminder`, comments/highlights/requests adapters, echo inbox | Epic 2 local repository and agent surface | ReaderSignal boundary and echo workflow tests |
| Epic 4 | Creator UI Pivot | Today creative path, inspiration-to-draft, local writing library, writing desk, local workspace | Epic 2, Epic 3, PublishBundle ready | route registry, UI contract, browser QA |
| Epic 5 | Backend Security | Schema, migrations, RLS, publish RPC, audit logs | PublishBundle and ReaderSignal contracts | migration, RLS, authorization, transaction tests |
| Epic 6 | Payment Entitlements | Plans, orders, entitlements, billing events, refund handling | Stable Reader identity and Epic 5 security | entitlement and billing idempotency tests |
| Epic 7 | Production Launch | Staging, production, monitoring, backup, rollback, closed beta | Epic 5 and Epic 6 release gates | production readiness, rollback rehearsal, beta attestation |

## Current Epic Status

Status date: 2026-07-12. A partial implementation does not promote an epic; only its completion evidence does.

| Epic | Status | Current Evidence | Remaining Before Promotion |
| --- | --- | --- | --- |
| Epic 0 | Active governance | Roadmap, four workstream plans, disabled governance-only feature flags, inventory, ownership matrix, and root gates exist | Keep docs, registry, source-of-truth manifest, and gates synchronized with every slice; do not claim a runtime flag cutover before Epic 4 owns and tests it |
| Epic 1 | In progress | Giant Writing Desk owner split; obsolete request/publish component families and hooks removed; prototype persistence owners, the zero-consumer disabled-autosave placeholder, zero-consumer session/quality view-model re-exports, superseded request-only External Echo filter/sort/priority exports, owner-private Echo result/helper/filter exports, and seven unconsumed route-service snapshot/result exports, retired workspace barrel, browser-owned publish helper, generic token-storage helper, verified orphan CSS hooks, author-facing tool settings, and the zero-consumer Studio page path removed; eight pre-Pivot UI packets/plans now have a machine-checked historical-reference boundary; old-framing compatibility exemptions are narrowed from 129 mixed entries to 5 exact source owners; canonical multi-source Echo helpers plus one aggregate Echo page model, Today priority/draft/readiness derivations, Works work/branch/chapter/feedback derivations plus action-result/reload semantics, and Local Workspace readiness/status/record summaries each have one pure owner, the PublishBundle route plus load/action/browser services have bundle-owned identities, PublishBundle local-snapshot recovery decisions and React setter distribution now have dedicated controller/applier owners, the cloud request facade reports failures through External Echo product language, Today/Shell copy uses `今日创作路径` and `发布包`, nine non-TSX transition owners plus the quality/progress, seven Writing Desk owners, and the active PublishBundle route use PublishBundle language, and quality, progress, flow-stepper, chapter-planner, inline-review, story-context, destination/readiness, command-palette surfaces own their shadcn/semantic-token composition, and the zero-consumer `.creator-next-action` alias is deleted while `/creator/publish` remains a compatibility URL; `index.css` is reduced from 7,325 to 6,064 lines through evidence-backed atomic ownership migrations | Continue classified global CSS, remaining historical/reference surfaces, and the 5 explicitly classified compatibility owners; browser bearer-token hardening is an explicit Epic 5 security dependency, not Creator draft persistence |
| Epic 2 | Accepted baseline on 2026-07-10; schema v9 decision extension on 2026-07-13; schema v10 verified-thread extension on 2026-07-17 | IndexedDB schema v10 preserves the accepted v9 baseline and adds author-confirmed verified long-range thread persistence while retaining Creator Decision Workbench records, atomic canon commit, one-way migration, cross-tab CAS, OPFS/IndexedDB body recovery, versioned workspace package/import rollback, local writing assets, typed Agent actions, and the durable PublishBundle lifecycle. Creator Route loading now recomputes a Canon fingerprint before returning eligible cards | Keep the local/private boundary and anti-regression gates green; real author card selection and broad literary-quality proof remain pending |
| Epic 3 | Partial, not promoted | WP4 application/local slice plus the four-source Epic 5 repository boundary are accepted: adapters, cloud projection mapping, stable cursors, local author control, real Chrome inbox proof, source tables, RLS, limits, moderation audit, rollback, and isolated PostgreSQL proof exist | Apply the source delta to the intended Supabase project and pass strict live four-source evidence; repository/fixture proof alone does not promote the whole epic |
| Epic 4 | Entry blocked | Existing Creator routes and direct component owners are stable enough to preserve during slicing; WP6 repository handoff is green | Wait for Epic 3 live-source acceptance and explicit product review before refactoring IA |
| Epic 5 | Partial, not promoted | WP6 transaction and the External Echo cloud-source repository packages pass structural gates, isolated PostgreSQL authorization/RLS/transaction/idempotency/limits/moderation/rollback tests, adapter cutover, Pivot gates, and Creator build | Apply both deltas to the intended Supabase project, pass strict live author/Reader receipt and four-source proofs, then add export/delete, backup/restore, and incident evidence |
| Epic 6 | Deferred | Contract skeleton only | Start after stable identity and Epic 5 security evidence; keep payment flags off |
| Epic 7 | Deferred | Release and rollback contract skeleton only | Start after Epic 5/6 release gates; require staging, monitoring, backup, rollback rehearsal, and closed-beta attestation |

Accepted work-package evidence remains narrower than epic promotion:

- WP4 application/local slice is accepted; Epic 3 remains partial until the intended Supabase project passes strict live four-source evidence.
- WP5 PublishBundle lifecycle passed; this proves the durable local lifecycle and recovery boundary, not the still-separate live server transaction.

Promotion is one-way through evidence, not through naming. A later epic may be explored behind a disabled flag, but it cannot become the active product path until every upstream exit gate is green.

Current Epic 1 route-slicing note: PublishBundle local-snapshot recovery and React setter distribution have dedicated controller/applier owners; active context, publish gates, reader impact, author decisions, lifecycle choice, and bundle input now have dedicated pure view-model owners. The compatibility route retains React orchestration and composition only.

## Dependency Chain

```text
Rednote / Yuzhou research
  -> Creator product pivot
  -> legacy cleanup rules (continuous guardrail)
  -> local DB + agent surface
  -> ReaderSignal -> CreativeReminder
  -> PublishBundle
  -> Creator UI IA refactor
  -> backend publish transaction
  -> payment / entitlements
  -> production launch
```

Documentation for all four workstreams is frozen together. Code advances in dependency order; a later epic cannot be used to bypass an earlier boundary.

## First-Round Change Lock

The first governance round is limited to:

1. This roadmap and the four plan skeletons.
2. Disabled-by-default feature flags.
3. The classified legacy inventory.
4. TypeScript entrypoints for the four requested governance gates.
5. Root `check:pivot` wiring.

It must not change page visuals, add a Creator route, activate unfinished features, or import another frontend.

## Current Commercial Phase

| Phase | Status | Product Meaning |
| --- | --- | --- |
| Zero-cost PMF beta | Active path | Validate reading, requests, branch demand, author supply, and return visits before cloud generation. |
| Creator Pivot V2 | In slicing/hardening | Turn Creator from request-management prototype into a localhost writing operating system. |
| Paid validation | Deferred | Start only after PMF signals are strong enough to test limited payment. |
| Managed cloud runtime | Deferred | Consider only after revenue or strong paid intent can justify inference cost and moderation risk. |

## Document Set

| Document | Role | Current Rule |
| --- | --- | --- |
| `010_CREATOR_PIVOT_LOCAL_UI_AGENT_PLAN.md` | Creator localhost product and working-agent plan | UI work must follow the pivot sequence, not patch the old request console. |
| `020_BACKEND_DATABASE_SECURITY_PLAN.md` | Cloud data/security boundary | Cloud stores public content, reader feedback, publish records, and opaque local references only. |
| `030_PAYMENT_PRODUCTION_LAUNCH_PLAN.md` | Payment and production readiness | Payment remains feature-flagged until free PMF signals justify tests. |
| `040_LEGACY_REFINEMENT_DELETION_PLAN.md` | Legacy cleanup source | Required before new Creator UI redesign. |
| `041_EXISTING_PROJECT_SLICING_PLAN.md` | S0-S9 slicing workflow | First-round work is docs, gates, flags, and classification. |
| `042_LEGACY_INVENTORY.md` | Legacy classification report | Existing code must be Preserve, Extract, Adapt, Deprecate, or Delete before reuse. |
| `043_SLICE_OWNERSHIP_MATRIX.md` | Owner/gate matrix | New references to legacy owners must be classified. |
| `044_EPIC_1_SLICE_CLOSEOUT_EPIC_2_READINESS.md` | Evidence-backed slice closeout and promotion boundary | A completed deletion slice cannot be reported as full Epic 1 or Epic 2 completion. |
| `045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md` | Evidence-based next execution sequence | Current implementation advances through cross-tab coordination, recovery, Agent execution, External Echo, PublishBundle, backend transaction, then Creator IA. |
| `046_HISTORICAL_REFERENCE_BOUNDARY.md` | Pre-Pivot UI evidence registry | Historical delivery packets and plans remain linkable evidence but cannot override current contracts, owners, gates, or deletion receipts. |
| `050_CUTOVER_ROLLBACK_PLAN.md` | Cutover and rollback | Pivot work ships behind route/feature boundaries and must have rollback. |
| `060_ACCEPTANCE_GATES_MATRIX.md` | Machine-checkable gates | The release path is gate-driven, not screenshot-driven. |

## Non-Negotiable Launch Boundaries

- Reader Web is public and non-generative.
- Local Creator App runs on the author's machine.
- Creator drafts, private writing assets, method cards, and operation logs stay local.
- Reader feedback can enter Creator as External Echo, not as a permanent ticket queue.
- Publishing goes through a publish bundle and author confirmation.
- Cloud AI runtime, hosted author model credentials, and automated external publishing are out of P0.
- Existing project material must be sliced before it can be reused in Pivot V2.

## Current Next Gate

S0-S2 governance remains a continuous guardrail. WP6 Server-Owned Publish Transaction and the follow-on External Echo cloud-source boundary are repository-accepted: both SQL deltas, explicit grants/RLS, fixed-search-path RPCs, private audits, stable source cursors, application adapters, non-destructive rollback handles, and isolated PostgreSQL tests are green. This is not a claim that either delta has been applied to the live Supabase project.

```bash
npm run check:slicing
npm run check:legacy-imports
npm run check:no-old-request-framing
npm run check:no-localstorage-outside-migration
npm run check:no-page-local-css
npm run check:no-raw-colors
npm run check:pivot
npm run test:publish-wp6
npm run test:external-echo-cloud
npm run check:zero-cost-pmf-publish-transaction-sql
npm run check:zero-cost-pmf-external-echo-sql
```

The active dependency is the **Epic 5 live application and operations evidence package**: apply WP6 and External Echo through the explicit operator step, run the strict live author/Reader plus four-source proofs, then close export/delete, backup/restore, and incident evidence. No new Creator IA rebuild is accepted until the Epic 3 live-source requirements are green.
