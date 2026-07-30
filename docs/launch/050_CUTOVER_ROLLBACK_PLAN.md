# Cutover Rollback Plan

Date: 2026-07-03

## Purpose

Creator Pivot V2 must be cut over without losing the working PMF loop. This plan defines how to introduce route, storage, agent, and publish changes behind controlled boundaries and how to roll back when a gate fails.

## Cutover Principles

- Do not replace working Reader or Creator routes without a compatibility path.
- Feature flags stay off by default during slicing.
- `app/src/features/creator-pivot/featureFlags.ts` is governance metadata during S0-S8, not a runtime cutover switch. Current alias rollback is a registry code rollback; Epic 4 must name and test a runtime owner before flags may control application routing.
- Legacy owners remain classified until deletion gates are strict.
- Publish-bundle paths cut over only after the server transaction and non-destructive database rollback delta both pass.
- Browser QA must inspect authenticated Creator routes, not only login or fixture pages.

## Rollback Units

| Unit | Cutover Strategy | Rollback |
| --- | --- | --- |
| Creator route registry | Add V2 aliases and map them to current surfaces until dedicated pages ship. | Before Epic 4 runtime cutover exists, use a registry code rollback that removes the aliases and keeps legacy routes. After an approved runtime owner ships, disable that tested owner without deleting compatibility routes. |
| External Echo application | Wrap old request components in normalized Echo adapters and preserve per-source local cursors. | Disable cloud-source reads and retain the last local cache; request/vote compatibility remains available without rewriting author decisions. |
| External Echo database | Apply `zero_cost_pmf_external_echo.sql` only after WP6. | Apply `zero_cost_pmf_external_echo_rollback.sql`: revoke new intake and Creator source RPCs, disable the feature flag, and preserve reader rows plus moderation evidence. |
| Local data layer | Upgrade through schema v10: retain every v9 store and add author-confirmed verified long-range thread records. | Roll back features and routes while keeping the v10 repository reader. Never downgrade or delete the local database; preserve author records, decision records, verified thread records, staged bodies, recoverable conflicts, rollback packages, source cursors, and legacy source. |
| Agent surface | Register actions in the manifest before UI invokes them. | Hide action affordance; leave operation log untouched. |
| Publish bundle | Submit the confirmed bundle through `publish_bundle_transaction` and persist both local and authoritative receipts. | Roll the Creator deployment back together with `zero_cost_pmf_publish_transaction_rollback.sql`; preserve chapters, events, receipts, and audit evidence. The restored direct grants are emergency-only. |
| UI atomic refactor | Replace one surface at a time with shadcn/Radix component contracts. | Re-enable previous classified surface and keep gate failure visible. |

## Release Branch Rule

Pivot UI work should remain on a preview branch until the user accepts visual and product direction. Main should not receive broad Creator UI refactors before:

```bash
npm run check:slicing
npm run check:pivot
npm run test:creator
npm run build:creator
```

## Local Schema Rollback Rule

An IndexedDB schema upgrade is forward-only. After schema v10 opens a workspace, rollback means disabling the new feature or restoring the prior product surface on top of the v10-aware repository. It does not mean shipping an older binary that opens the database with an earlier schema.

Before a production migration cutover:

1. Keep the legacy keys untouched.
2. Produce an author-visible workspace backup.
3. Run `check:local-migration` and real-browser `qa:local-db-migration`.
4. Keep the v10 reader in every rollback build.
5. Do not delete the IndexedDB database or rewrite the original migration receipt.
6. Preserve open `workspaceConflicts`; a rollback must not silently adopt or discard stale incoming records.
7. Preserve staged draft bodies and workspace rollback packages until their recovery receipts are resolved.
8. Bind imported records to receipt fingerprints and stop rollback when a record changed after import.

## Rollback Evidence

Every cutover PR or preview packet should state:

- Which legacy owners were touched.
- Which V2 owner now owns the behavior.
- Which gate proves the boundary.
- Which proven runtime feature flag, route alias, or registry code rollback can reverse the change; governance-only flags do not count as executable rollback evidence.
- Whether deprecated files are still referenced.
