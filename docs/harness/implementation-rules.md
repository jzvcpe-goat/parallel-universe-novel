# Creator Harness Implementation Rules

## Current Repository Baseline

This repository already has the required Creator foundation. Do not restart the
frontend or merge another Creator UI before checking these surfaces:

- Vite + React + TypeScript app with `dev:creator` and `build:creator`.
- React Router routes for `/creator/login`, `/creator`, `/creator/requests`,
  `/creator/editor`, `/creator/works`, `/creator/publish`, and
  `/creator/settings`.
- shadcn-compatible UI primitives in `app/src/components/ui`.
- Creator-owned components in `app/src/components/creator`.
- Supabase-backed product data access wrapped by `app/src/lib/pmfSupabase.ts`.
- Local draft and Creator settings helpers in the same wrapper.
- Creator checks: `check:ui-copy`, `check:design-tokens`,
  `check:no-mock-data`, and `check:creator-ui-contract`.

The editable execution source for product and engineering alignment is
`docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md`.
`docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md` is the product-owner review
draft that should be filled in before visual or workflow changes. If a future
UI change conflicts with either document, update the relevant product document
first and then update the implementation.

The Creator surface is a local author workbench. Reader and Creator can share
types, tokens, and primitives, but Creator must not inherit Reader visual
backgrounds or public-reader page flow.

## File-Level M0/M1 Plan

M0 only changes specs, contracts, and gates:

- `AGENTS.md`
- `docs/product/creator-ui-vision.md`
- `docs/product/creator-user-flows.md`
- `docs/product/ui-copy-dictionary.md`
- `docs/product/banned-ui-terms.md`
- `docs/data-contracts/creator-data-map.md`
- `docs/data-contracts/request-status-machine.md`
- `docs/data-contracts/publish-flow.md`
- `docs/data-contracts/draft-storage-boundary.md`
- `docs/harness/*`
- `scripts/check-ui-copy.ts`
- `scripts/check-design-tokens.ts`
- `scripts/check-no-mock-data.ts`
- `scripts/check-creator-ui-contract.ts`

M1 only changes the Creator shell and design-system baseline:

- `app/src/components/creator/CreatorShell.tsx`
- `app/src/components/creator/LocalStatusPill.tsx`
- `app/src/components/creator/CreatorTodayNextStepsPanel.tsx`
- `app/src/components/creator/CreatorStatePanel.tsx`
- `app/src/components/creator/CreatorActionBar.tsx`
- `app/src/components/creator/ConfirmActionDialog.tsx`
- `app/src/components/ui/liquid-glass.tsx`
- `app/src/styles/parallel-universe-tokens.css`
- `app/src/index.css`
- `app/src/design-system/registry.ts`
- `app/src/design-system/page-contracts.ts`

M1 may wire route-aware Creator Shell titles and local status display. M1 must
not rebuild all Creator pages or add new production demo data.
M1 shell containers must use Creator-owned class names such as
`creator-workbench-page`; do not reuse Reader page shells such as
`narrative-page`.

Development sequence:

1. M0: specs and guardrails.
2. M1: Creator shell and design-system baseline.
3. M2: 今日.
4. M3: 读者请求.
5. M4: 写作台.
6. M5: 作品与支线.
7. M6: 发布检查.
8. M7: 创作设置.
9. M8: QA and regression.

Do not skip ahead by adding large page rewrites without guardrails.

## Harness Rules

- Inspect existing routes, data wrappers, docs, and checks before editing.
- Use shadcn/Radix primitives before writing custom interaction components.
- Keep draft prose local until Publish Check confirms public release.
- Render only product language in Creator UI.
- Every key action must have disabled, loading, success, and error behavior.
- Destructive actions require `ConfirmActionDialog` backed by Radix
  AlertDialog, with pending and failure states.
- If a feature has no current data wrapper, the UI may show a disabled product
  placeholder only when the missing capability is documented.

After each milestone:

```bash
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm --prefix app run lint
npm --prefix app run build:creator
```
