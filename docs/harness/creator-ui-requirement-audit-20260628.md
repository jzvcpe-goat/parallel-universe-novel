# Creator UI Requirement Audit - 2026-06-28

Scope: Local Creator App on branch `preview/ui-motion-polish-20260628`.

> Historical acceptance snapshot. The 2026-07-11 Local Workspace retirement slice supersedes its tool-setting requirements; current gates require backup/recovery and display preferences with no author-facing provider setup.

This audit maps the requested Creator UI objective to current source evidence.
It is intentionally narrower than a merge-ready signoff: it proves structural
and browser-route readiness, while final product taste still requires manual
visual review.

## Current Repository Baseline

| Area | Evidence | Status |
| --- | --- | --- |
| App stack | Vite + React + TypeScript; `dev:creator`, `build:creator`, `build:reader` scripts | Passed |
| Design system | `app/components.json`, shadcn/Radix primitives, `components/ui`, `components/creator` | Passed |
| Creator routes | `/creator/login`, `/creator`, `/creator/requests`, `/creator/editor`, `/creator/works`, `/creator/publish`, `/creator/settings` | Passed |
| Data wrapper | `app/src/lib/pmfSupabase.ts` wraps identity, author access, works, branches, chapters, requests, votes, publish events, creator clients, feature flags, and local drafts | Passed |
| Reader boundary | `build:reader`, `check:public-reader-bundle-boundary`, `check:reader-creator-copy-boundary` | Passed |
| Component states | `docs/harness/creator-component-state-matrix.md` maps each Creator component to owned or delegated loading, empty, error, disabled, success, and confirmation states | Passed |
| Interaction primitives | `docs/harness/creator-interaction-primitives-audit.md` maps Dialog, Sheet, Popover, Dropdown Menu, Select, Tabs, Scroll Area, Tooltip, and Alert Dialog to shadcn/Radix sources | Passed |

## Requirement Evidence

| Requirement | Current Evidence | Status |
| --- | --- | --- |
| P0 local-first boundary | `docs/backend/P170_ZERO_COST_PMF_LOOP.md`, `docs/data-contracts/draft-storage-boundary.md`, Creator UI copy says private drafts remain local | Passed |
| Six primary entries | `LocalCreatorApp.tsx` nav labels: 今日, 读者请求, 写作台, 作品与支线, 发布检查, 创作设置 | Passed |
| No engineering vocabulary in product UI | `npm run check:ui-copy`, route QA visible-text scans | Passed |
| shadcn/Radix basis | `components/ui` primitives, `AlertDialog` confirmation, `Select`, `ScrollArea`, `Textarea`, `Button`, `Card` usage | Passed |
| Semantic token boundary | `npm run check:design-tokens`, Creator surfaces use `--creator-*`, shared metrics use `--liquid-metric-*` | Passed |
| Reader visual separation | `check:design-tokens`, signed-in route screenshots, no Reader depth imagery in Creator routes | Passed |
| Reduced motion/transparency | Creator settings and CSS data attrs for motion/transparency preferences | Passed |
| Critical action states | Creator task cards, request actions, editor save, publish check, work actions, settings actions expose loading/disabled/success/error states | Passed |
| Dangerous action confirmation | Publish, similar-request view, reject, hide, archive, and clear settings use confirmation surfaces | Passed |

## Page Requirements

| Page | Required Behavior | Evidence | Status |
| --- | --- | --- | --- |
| 今日 | First screen shows three priority tasks, not a table | `CreatorTaskCard` priority props and screenshots `creator-1782707455150.png` | Passed |
| 今日 | Signed-in sees the next writing focus, judgment basis, and request-to-publication route | `CreatorTodayPriorityPanel`, category cards, `check:creator-m2-today` | Passed |
| 今日 | Signed-out sees locked capability preview without write actions | `LockedWorkbenchPreview`, `qa:local-creator-routes` | Passed |
| 读者请求 | Saved views, queue, detail panel | `RequestsPage`, `savedViews`, `selectedRequest` detail panel | Passed |
| 读者请求 | Filter by work, request type, status; sort by heat/time/status | `workFilter`, `typeFilter`, `statusFilter`, `sortBy` | Passed |
| 读者请求 | Request actions: start writing, later, reject, similar-request view, reader perspective | `startWriting`, `setStatus(... acknowledged)`, reject confirmation, `aggregateRequest`, `openReaderPerspective` | Passed |
| 读者请求 | No fake permanent merge without merge columns | Similar requests are "只看同类请求"; no visible "合并"; contract asserts temporary view only | Passed |
| 写作台 | Three-column structure with request context, editor, destination | `EditorPage` grid: request context, editor surface, publish destination | Passed |
| 写作台 | Quiet editor, no strong glass around long prose | `creator-editor-surface`, `Textarea` on editor tokens, not a liquid-glass prose body | Passed |
| 写作台 | Draft body remains local and can enter publish check | `upsertLocalDraft`, `navigate('/creator/publish?draft=...')` | Passed |
| 作品与支线 | Shows works -> branches -> chapters | `WorksPage`, branch cards, chapter lists, structure strip | Passed |
| 作品与支线 | Main and IF lines visually distinct | `creator-line-card-main`, `creator-line-card-if`, branch badges | Passed |
| 作品与支线 | Supports anchor, chapters, notice, hide, archive, create IF | `parentBranchId`, `parentChapterId`, `updateCreatorWorkNotice`, `updateCreatorWorkStatus`, `updateCreatorBranchStatus`, `createCreatorIfBranch` | Passed |
| 发布检查 | Shows destination, line type, anchor, linked request, public title, preview, reader location, impact | `PublishCheckPage`, `PublishImpactSummary`, gate lists | Passed |
| 发布检查 | Must-pass, warning, confirmation gates | `mustGates`, `warningGates`, `confirmGates` | Passed |
| 发布检查 | Publishes only after explicit confirmation | `ConfirmActionDialog` wraps `publishChapter` in `PublishCheckPage` | Passed |
| 发布检查 | Failure copy preserves local draft | `发布未完成，正文仍在草稿箱。` | Passed |
| 创作设置 | Page is named 创作设置, with writing mode, local creation service, device status, display preferences | `SettingsPage` sections and route copy | Passed |
| 创作设置 | Credential state only, no plaintext | `凭据状态`, "凭据只显示状态，不展示明文。" | Passed |
| 创作设置 | Test connection, clear local settings, reduce motion/transparency | Settings actions and preferences | Passed |

## Checks Run

```bash
npm run check:design-tokens
npm run check:creator-ui-contract
npm run check:creator-m2-today
npm run check:creator-m3-requests
npm run check:creator-m4-editor
npm run check:creator-m5-works
npm run check:creator-m6-publish
npm run check:creator-m7-settings
npm run check:creator-author-flow-contract
npm run check:ui-copy
npm run test:creator
npm run build:creator
npm run build:reader
npm run check:reader-creator-copy-boundary
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

All commands above passed in this worktree. `build:creator` still reports the
existing Vite large chunk warning.

## Latest Browser Evidence

Signed-out route QA:

- `artifacts/visual-qa/local-creator/creator-login-1782707428773.png`
- `artifacts/visual-qa/local-creator/creator-1782707429717.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782707429928.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782707430115.png`
- `artifacts/visual-qa/local-creator/creator-works-1782707430294.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782707430482.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782707430667.png`

Latest signed-out rerun:

- `artifacts/visual-qa/local-creator/creator-login-1782708004948.png`
- `artifacts/visual-qa/local-creator/creator-1782708006591.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782708007049.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782708007241.png`
- `artifacts/visual-qa/local-creator/creator-works-1782708007452.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782708007643.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782708007821.png`

Latest signed-out verification rerun:

- `artifacts/visual-qa/local-creator/creator-login-1782709193972.png`
- `artifacts/visual-qa/local-creator/creator-1782709194890.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782709195108.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782709195321.png`
- `artifacts/visual-qa/local-creator/creator-works-1782709195531.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782709195726.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782709195923.png`

Latest signed-out verification rerun after locked-workbench copy tightening:

- `artifacts/visual-qa/local-creator/creator-login-1782709878396.png`
- `artifacts/visual-qa/local-creator/creator-1782709879295.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782709879516.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782709879724.png`
- `artifacts/visual-qa/local-creator/creator-works-1782709879944.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782709880131.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782709880326.png`

Latest signed-out M2 Today rerun:

- `artifacts/visual-qa/local-creator/creator-login-1782711367211.png`
- `artifacts/visual-qa/local-creator/creator-1782711368100.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782711368307.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782711368487.png`
- `artifacts/visual-qa/local-creator/creator-works-1782711368672.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782711368847.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782711369028.png`

Signed-in QA-only route evidence:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782707455150.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782707456103.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782707456567.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782707456983.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782707457442.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782707457894.png`

Latest signed-in rerun:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782708004924.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782708005929.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782708006373.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782708006783.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782708007234.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782708007687.png`

Latest signed-in verification rerun:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782709194256.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782709195206.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782709195655.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782709196092.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782709196555.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782709196998.png`

Latest signed-in verification rerun after Settings public-boundary copy
tightening:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782709878650.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782709879617.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782709880078.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782709880489.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782709880941.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782709881383.png`

Latest signed-in M2 Today rerun:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782711367467.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782711368410.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782711368853.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782711369273.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782711369709.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782711370149.png`

## Remaining Review

| Item | Why It Remains |
| --- | --- |
| Manual product taste review | Static and browser gates prove structure and boundary, not whether the user accepts the workbench as visually polished enough. |
| Live allowlisted author account route test | QA-only fixtures prove signed-in interaction shape; live author proof remains an operations credential step. |
| Bundle chunk optimization | Existing Vite chunk warning remains non-blocking but should be handled before public release hardening. |
| Signed-out visual tone | Locked workbench copy is no longer preview-framed; manual product taste review can still ask for denser or calmer layout treatment. |
