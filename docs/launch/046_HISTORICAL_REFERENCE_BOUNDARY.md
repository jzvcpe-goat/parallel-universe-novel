# Historical Reference Boundary

Date: 2026-07-12

## Purpose

Pre-Pivot UI plans and July 1 delivery packets remain useful as evidence of what was reviewed, implemented, or rejected at that time. They are not current implementation authority.

This boundary prevents an agent or maintainer from restoring retired request-management framing, author-facing model/provider settings, browser-owned direct publishing, or page-local CSS merely because those patterns still appear in a historical document.

## Current Authority

Implementation decisions must follow, in order:

1. `docs/product/creator-pivot-v2-contract.md` for the current product and privacy contract.
2. `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md` for dependency order and accepted evidence.
3. `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md` for current code owners and replacement gates.
4. `docs/launch/060_ACCEPTANCE_GATES_MATRIX.md` and executable checks for acceptance.
5. Current routed code and typed contracts when the documents above delegate implementation ownership.

Historical material cannot override a later contract, owner, gate, or deletion receipt.

## Classified Historical Documents

### July 1 UI delivery snapshots

- `docs/design-system/UI_UX_DESIGN_CODE_DELIVERY_20260701.md`
- `docs/design-system/UI_UX_DESIGN_CODE_REVIEW_HANDOFF_20260701.md`
- `docs/design-system/UI_UX_REVIEW_PACKET_20260701.md`

These files preserve review scope and historical evidence. Their claims describe the July 1 branch state and must not be read as current Creator Pivot acceptance.

### Pre-Pivot Creator plans

- `docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md`
- `docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md`
- `docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md`
- `docs/product/LOCAL_CREATOR_UI_UX_EXECUTION_PLAN_FOR_REVIEW.md`
- `docs/product/LOCAL_CREATOR_UI_UX_BACKEND_ALIGNED_PLAN.md`

These plans preserve the prior Reader-demand-to-publish model for audit history. They do not authorize new routes, product copy, persistence, Agent actions, publishing behavior, or component ownership.

## Use Rules

- Keep historical files in place so existing evidence links remain valid.
- Every classified file must show the historical reference boundary and `historical_pre_pivot_reference` status near its title.
- A historical component, route, helper, or style can return only after a new owner decision and current gates prove the replacement contract.
- Historical copy is not a product-copy allowlist.
- Historical screenshots are not current visual acceptance.
- Historical backend or launch statements are not live deployment evidence.

## Machine Gate

```bash
npm run check:historical-reference-boundary
```

The gate verifies that every classified document is clearly marked, names the current authority chain, and remains listed in this registry. `check:pivot` runs the gate before accepting the current Creator boundary.

## Scope Of This Slice

This is a documentation-governance slice only. It changes no route, product copy, UI component, CSS rule, data path, Agent action, backend behavior, or live environment.
