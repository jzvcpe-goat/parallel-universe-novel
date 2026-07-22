# UI/UX Review Packet

> **Historical reference boundary:** This is a pre-Pivot UI snapshot retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`

Date: 2026-07-01
Branch: `preview/ui-motion-polish-20260628`
Scope: Reader Web and Local Creator App UI/UX only

This packet is the single review entry for UI/UX design and frontend code. It deliberately excludes Supabase policy, backend release status, payment readiness, and production launch claims.

## Review Goal

Use this document to answer one question:

> Does the current UI/UX express a clean public Reader product and a separate localhost Creator writing product, using reusable shadcn/Radix-style components rather than demo screens or page-local one-off code?

## Product Shape

| Surface | User | Product Job | Must Not Become |
| --- | --- | --- | --- |
| Reader Web | Reader | Read published work, browse branches, request continuation or IF lines, vote, view update state. | Creator console, backend dashboard, internal debug view. |
| Local Creator App | Author | See reader demand, decide what to write, use a semi-resident writing assistant, edit private drafts, confirm publication. | Public web admin, generic task board, cloud-runtime control panel. |

## Design Principles

1. Reader and Creator are separate products.
2. Creator is author-first: each screen should answer what to write, decide, or publish next.
3. Agent assistance must be visible as writing actions, candidate adoption plans, inline shortcuts, and a semi-resident assistant rail.
4. Generated text stays candidate until the author applies it.
5. Liquid glass is a control-layer material, not a replacement for quiet manuscript surfaces.
6. Product UI must not expose engineering residue such as backend, provider, prompt, trace, RLS, Supabase, API key, fallback, sync, writeback, or raw implementation wording.

## Live Review Links

Use the current verified preview servers:

- Reader home: `http://127.0.0.1:5200/`
- Reader library: `http://127.0.0.1:5200/library`
- Reader story: `http://127.0.0.1:5200/story`
- Reader account: `http://127.0.0.1:5200/settings`
- Creator today: `http://127.0.0.1:5199/#/creator?qa=local-creator-authenticated`
- Creator requests: `http://127.0.0.1:5199/#/creator/requests?qa=ui-review-20260701`
- Creator editor: `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=local-creator-authenticated`
- Creator works: `http://127.0.0.1:5199/#/creator/works?qa=ui-review-20260701`
- Creator publish: `http://127.0.0.1:5199/#/creator/publish?qa=ui-review-20260701`
- Creator settings: `http://127.0.0.1:5199/#/creator/settings?qa=ui-review-20260701`

## Page Checklist

| Page | Review Intent | Code Owner |
| --- | --- | --- |
| `/` | Public gateway, work discovery, no inline manuscript reader on the home surface. | `app/src/pages/Home.tsx` |
| `/library` | Reader browsing and branch discovery. | `app/src/pages/Library.tsx` |
| `/story` | Comfortable reading plus Reader story index, request/vote controls, branch focus, and reading progress. | `app/src/pages/Story.tsx`, `app/src/apps/reader/ReaderRequestPanel.tsx`, `app/src/components/reader/ReaderStoryIndexPanel.tsx`, `app/src/components/reader/ReaderStoryBranchPanel.tsx`, `app/src/components/reader/ReaderStoryProgressPanel.tsx` |
| `/settings` | Reader entitlement, membership plan selection, account recovery, checkout progress, status, and data-control surface, not Creator setup. | `app/src/pages/Account.tsx`, `app/src/components/reader/ReaderAccountHeroCard.tsx`, `app/src/components/reader/ReaderEntitlementSummaryGrid.tsx`, `app/src/components/reader/ReaderAccountMergePanel.tsx`, `app/src/components/reader/ReaderAccountStatusGrid.tsx`, `app/src/components/reader/ReaderDataControlPanel.tsx`, `app/src/components/reader/ReaderCheckoutProgressPanel.tsx`, `app/src/components/reader/ReaderMembershipPlanPanel.tsx` |
| `/creator` | Author's today view and next-best action. | `app/src/apps/creator/LocalCreatorApp.tsx`, `app/src/components/creator/*` |
| `/creator/requests` | Reader demand becomes author decisions, not backend tasks. | `CreatorRequestQueueCard`, `CreatorRequestStatusStrip`, `CreatorRequestNextActionPanel`, `CreatorRequestDecisionPanel`, `CreatorRequestWritingRail` |
| `/creator/editor` | Three-zone writing software with semi-resident assistant and candidate adoption. | `CreatorWritingWorkspace`, `CreatorAgentComposer`, `CreatorAssistantDock`, `CreatorEditorAssistPanel`, `CreatorEditorReadinessStrip` |
| `/creator/works` | Work and branch management with explicit IF/main line separation. | `CreatorBranchLineCard` |
| `/creator/publish` | Author-confirmed publication review and impact preview. | `CreatorPublishReviewPanel`, `CreatorPublishImpactStrip`, `CreatorPublishContextPanel` |
| `/creator/settings` | Local Workspace for local saves, backup/recovery, assistant permissions, operation records, display preferences, and public boundaries. | `CreatorSettingsBoundaryStrip`, `CreatorLocalWorkspacePanel`, `CreatorWorkspacePreferencesPanel`, `CreatorSettingsStatusRail` |

## Component Ownership

Reader components:

- `ReaderRequestComposer`: request type tabs, text box, product status note, request flow explanation, unavailable state, and send action.
- `ReaderHotRequestList`: hot request rows, votes, and contextual empty state inside one shadcn `Card` shell.
- `ReaderStoryIndexPanel`: `/story` left rail with back action, cover, current chapter, and branch map inside shadcn `Card` shells.
- `ReaderStoryBranchPanel`: branch focus, shelf action, branch summary, and branch metrics inside a shadcn `Card` shell.
- `ReaderStoryProgressPanel`: page progress, shelf state, next-scene state, and compact worldline feedback inside a shadcn `Card` shell.
- `ReaderAccountHeroCard`: first-viewport current account or membership-plan summary through shadcn `Card`/`Badge`.
- `ReaderEntitlementSummaryGrid`: reading credits, interaction request credits, and archive-state summary cards through shadcn `Card`/`Badge`.
- `ReaderAccountMergePanel`: account recovery, login/register, browser archive check, and account merge controls through shadcn `Card`/`Badge`/`Button`/`Input`/`Label`.
- `ReaderAccountStatusGrid`: reading progress, reader wishes, and account recovery cards through shadcn `Card`/`Badge`/`Button`.
- `ReaderDataControlPanel`: account export, delete preview, delete confirmation, and public-safe account messages through shadcn `Card`/`Badge`/`Button`/`Input`.
- `ReaderCheckoutProgressPanel`: checkout progress, status refresh, and return-to-reading actions through shadcn `Card`/`Badge`/`Button`.
- `ReaderMembershipPlanPanel`: membership plan selection, checkout-safe error badge, and shared `PlanCard` layout through shadcn `Card`/`Badge` plus design-system `PlanCard`.

Creator components:

- `CreatorShell` and `WorkspaceNav`: Creator-only navigation and signed-in workbench shell.
- `CreatorRequestQueueCard`, `CreatorRequestStatusStrip`, `CreatorRequestNextActionPanel`, `CreatorRequestDecisionPanel`, `CreatorRequestWritingRail`: reader demand to author decision flow.
- `CreatorWritingWorkspace`, `CreatorAgentComposer`, `CreatorAssistantDock`, `CreatorEditorAssistPanel`, `CreatorEditorReadinessStrip`: writing software, assistant actions, candidate review, and readiness.
- `CreatorBranchLineCard`: main and IF branch cards.
- `CreatorPublishReviewPanel`, `CreatorPublishImpactStrip`, `CreatorPublishContextPanel`: publication review.
- `CreatorSettingsBoundaryStrip`, `CreatorLocalWorkspacePanel`, `CreatorWorkspacePreferencesPanel`, `CreatorSettingsStatusRail`: Local Workspace.

Design-system foundations:

- shadcn/Radix-style primitives: `app/src/components/ui/*`
- Liquid glass material: `app/src/components/ui/liquid-glass.tsx`
- World-depth background layer: `app/src/components/design-system/UniverseDepth.tsx`
- Clean Reader background assets: `app/public/parallel-assets/backgrounds/reader-gateway-planets.png`, `app/public/parallel-assets/backgrounds/story-reader-planets.png`
- Semantic tokens: `app/src/styles/parallel-universe-tokens.css`, `app/src/index.css`
- Registry/contracts: `app/src/design-system/registry.ts`, `app/src/design-system/page-contracts.ts`, `app/src/registry/parallel-universe-ui.registry.json`

## Copy Boundary

Allowed product language:

- Reader: 阅读, 请求, 投票, 读者愿望, 更新, 档案恢复.
- Creator: 写作助手, 读者愿望, 可写场景, 作者一问, 马上做, 私密草稿, 发布检查, 采纳方式.

Blocked in product UI:

- Supabase, RLS, trace, provider, fallback, API key, backend, database, sync, writeback, interface, system prompt, prompt plumbing, raw hash, runtime internals.
- HTTP/status-code copy such as `请求失败 (404)` must be converted into product copy such as `当前开通请求暂时不可用，请稍后再试。`

## Screenshot Evidence

| Screenshot | Route | Review Focus |
| --- | --- | --- |
| `artifacts/visual-qa/local-creator-authenticated/route-creator.png` | `/creator` | Daily author workbench and Creator-only navigation. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-requests.png` | `/creator/requests` | Author decision flow: reader wish, scene seed, author question, and next action. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-editor.png` | `/creator/editor` | Three-zone writing software, semi-resident assistant, candidate adoption, and readiness strip. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-works.png` | `/creator/works` | Work/branch management with main and IF separation. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-publish.png` | `/creator/publish` | Author-confirmed publication review. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-settings.png` | `/creator/settings` | Writing-tool preferences and local access-state language. |
| `artifacts/visual-qa/reader-request-components/story-reader-request-components.png` | `/story` | Reader request composer and hot-request list. |
| `artifacts/visual-qa/reader-story/story-reader-index-branch-progress-components.png` | `/story` | Story index, branch focus, and reading progress render through Reader Story components; forbidden engineering terms count is zero. |
| `artifacts/visual-qa/reader-story/story-reader-branch-progress-components.png` | `/story` | Branch focus and reading progress render through `ReaderStoryBranchPanel` and `ReaderStoryProgressPanel`; retained as prior evidence. |
| `artifacts/visual-qa/reader-account/settings-reader-account-hero-card.png` | `/settings` | First-viewport current account or membership-plan summary uses `ReaderAccountHeroCard`. |
| `artifacts/visual-qa/reader-account/settings-reader-checkout-progress-panel.png` | `/settings` | Checkout progress uses `ReaderCheckoutProgressPanel` instead of a page-local progress panel. |
| `artifacts/visual-qa/reader-account/settings-reader-membership-plan-panel.png` | `/settings` | Membership plan selection uses `ReaderMembershipPlanPanel`; `/settings` no longer renders plan cards directly. |
| `artifacts/visual-qa/reader-account/settings-reader-entitlement-summary-grid.png` | `/settings` | Reader entitlement summary cards use `ReaderEntitlementSummaryGrid`. |
| `artifacts/visual-qa/reader-account/settings-reader-account-merge-panel.png` | `/settings` | Reader account recovery, login/register, and merge controls use `ReaderAccountMergePanel`. |
| `artifacts/visual-qa/reader-account/settings-reader-account-status-grid.png` | `/settings` | Reader account/status grid, data controls, and non-Creator account copy. |
| `artifacts/visual-qa/reader-account/settings-reader-data-control-panel.png` | `/settings` | Reader data export/delete controls use `ReaderDataControlPanel` and shadcn form primitives. |

## Verification Commands

Run these for the UI/UX packet:

```bash
npm --prefix app run lint
npm run check:ui-copy
npm run check:reader-request-components
npm run check:reader-account-components
npm run check:reader-story-components
npm run check:creator-m3-requests
npm run check:creator-m4-editor
npm run check:creator-m5-works
npm run check:creator-m6-publish
npm run check:creator-m7-settings
npm run check:creator-ui-contract
npm run check:design-system-boundary
npm run check:creator-author-flow-contract
npm run check:reader-creator-copy-boundary
npm run test:creator
npm --prefix app run build:reader
npm --prefix app run build:creator
npm --prefix app run build:creator:qa
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/browser-local-creator-authenticated-routes.mjs
git diff --check
```

## Review Decision Options

| Decision | Meaning |
| --- | --- |
| Continue iteration | Keep this branch open and polish visual density, motion, or component ownership. |
| Split UI PR | Extract only the accepted UI/UX files into a smaller reviewable PR. |
| Prepare merge | Run the full release/test chain, refresh screenshots, and prepare the branch for merge after approval. |

## Known Non-Claims

- This packet does not claim backend production readiness.
- This packet does not claim Supabase RLS has been fully production-audited.
- This packet does not claim payment or commercial launch readiness.
- This packet does not claim cloud AI Runtime is enabled.
- This packet does not merge anything into `main`.
