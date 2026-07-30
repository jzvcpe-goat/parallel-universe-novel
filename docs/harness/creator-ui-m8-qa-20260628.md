# Creator UI M8 QA Record - 2026-06-28

## Scope

This record covers the current Creator UI Harness pass on branch
`preview/ui-motion-polish-20260628`.

> Historical QA snapshot. Current Local Workspace QA is governed by `check:creator-m7-settings`, `qa:workspace-export-import`, and authenticated Settings route proof; the former tool-setting surface was retired on 2026-07-11.

The checked product target is the P0 Local Creator App:

- public Reader remains separate,
- Creator runs as a localhost author workbench,
- draft prose stays local,
- publication requires explicit confirmation,
- cloud records hold public content, request status, and publish records only.

For requirement-by-requirement evidence, see:

- `docs/harness/creator-ui-requirement-audit-20260628.md`

## Current Evidence

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run check:ui-copy` | Passed | Creator product copy scan passed across routes, Creator components, and the product data wrapper messages. |
| `npm run check:design-tokens` | Passed | Creator semantic token coverage passed. |
| `npm run check:no-mock-data` | Passed | Production Creator targets have no demo data dependency. |
| `npm run check:creator-m0-m1-baseline` | Passed | M0/M1 baseline verifies required docs, shadcn config, Creator shell, local-first wrappers, status machine, and Reader/Creator visual boundary before page work continues. |
| `npm run check:creator-m2-today` | Passed | Today priority surface is locked to real request, draft, publish, and work readiness inputs. |
| `npm run check:creator-m3-requests` | Passed | Requests page is locked to real request data, filters/sorts, legal state transitions, temporary same-request view, and non-happy states. |
| `npm run check:creator-m4-editor` | Passed | Writing Desk is locked to three-column context/editor/destination layout, local draft storage, quiet editor surface, and publish-check handoff. |
| `npm run check:creator-m5-works` | Passed | Works page is locked to work/branch/chapter structure, main/IF distinction, notice save, hide/archive confirmations, IF branch creation, and Writing Desk handoff. |
| `npm run check:creator-m6-publish` | Passed | Publish Check is locked to selected local draft, destination/anchor/request/title/preview/reader impact, explicit confirmation, publish wrapper writes, request completion, and local-prose failure recovery. |
| `npm run check:creator-m7-settings` | Passed | Settings is locked to writing method, local creation service, local status, display preferences, state-only credentials, feature flags, reduced motion/transparency, and clear-local confirmation. |
| `npm run check:creator-ui-contract` | Passed | Six-entry IA, request states, data mappings, danger confirmations, Creator/Reader visual boundary. |
| `npm run check:creator-author-flow-contract` | Passed | Signed-in author flow is source-checked against real request, draft, work, branch, publish, settings, and local-boundary capabilities. |
| `npm --prefix app run lint` | Passed | App lint passed through `npm run test:creator`. |
| `npm run build:creator` | Passed | Build succeeded. Vite reports one chunk above 500 kB. |
| `npm run build:reader` | Passed | Reader build still succeeds. |
| `npm run check:release-sync-manifest` | Passed | Release/source sync manifest passed after syncing Creator copy and token drift. |
| `npm run test:creator` | Passed | Creator lint, copy scan, design token scan, mock-data guard, M0/M1, M2, M3, M4, M5, M6, M7, Creator contract, author-flow contract, and Reader/Creator copy boundary passed. |
| `npm run check:zero-cost-pmf-loop` | Passed | P0 data-loop guard passed. |
| `npm run smoke:creator-chain` | Passed | Runtime smoke stays preview-only; no canon or branch write. |
| `npm run check:reader-creator-copy-boundary` | Passed | Reader/Creator product copy boundary passed through the root script. |
| `npm run check:public-reader-bundle-boundary` | Passed | Public Reader bundle stays free of Creator-only data paths. |
| `npm run qa:local-creator-routes` | Passed | Seven local Creator routes rendered and screenshots were captured. |
| `npm run qa:local-creator-authenticated-routes` | Passed | Six signed-in Creator routes rendered through a QA-only data alias; screenshots were captured and visible copy was scanned for banned terms, Reader residue, and locked-state residue. |

## 2026-06-28 Authenticated Creator Route QA

The first route QA only proved signed-out and locked surfaces. That was useful
for boundary checks, but it could not prove the real author workbench after
login. This pass adds a QA-only Vite mode, `creator-qa`, that aliases
`@/lib/pmfSupabase` to `app/src/__fixtures__/pmfSupabase.creator-qa.ts`.

Boundary rules:

- Production `build:creator` still imports the real `app/src/lib/pmfSupabase.ts`
  wrapper.
- QA fixture data lives outside `app/src/apps/creator` and
  `app/src/components/creator`, so `check:no-mock-data` continues to guard
  production Creator surfaces.
- The authenticated route QA scans visible text for banned product terms,
  Reader visual/copy residue, and signed-out lock residue.
- Fixture content is product-shaped author data only: works, branches,
  chapters, reader requests, publish events, local drafts, feature flags, and
  local settings.

Verification:

```bash
npm run build:creator:qa
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
npm run test:creator
npm run build:creator
```

Latest signed-in screenshot evidence:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782705627124.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782705628059.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782705628501.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782705628919.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782705629355.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782705629797.png`

### Today Priority Surface Evidence

The signed-in Today route now gives the author a clear first decision instead
of presenting three equal cards. The request card, active local draft card, and
publish-check card each carry an explicit priority state. When no publishable
draft exists, the publish card is muted instead of competing with actionable
work.

The shared `LiquidGlassMetric` primitive was also checked for token ownership:
metric text color now comes from `--liquid-metric-*` variables with generic
fallbacks, while Creator pages bind those variables to Creator tokens. This
keeps shared glass controls from pulling Reader color semantics into the local
author workbench.

Verification:

```bash
npm run check:design-tokens
npm run check:creator-ui-contract
npm run test:creator
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Latest screenshot evidence:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782706923758.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782706924712.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782706925155.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782706925558.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782706925992.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782706926432.png`

Latest rerun after documenting the priority and metric-token boundary:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782707455150.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782707456103.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782707456567.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782707456983.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782707457442.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782707457894.png`

Latest verification rerun after interaction primitive and route-boundary checks:

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

### Writing Desk Default Draft Evidence

Signed-in QA later showed the Writing Desk now opens the latest local private
draft by default when `/creator/editor` has no explicit route target. This keeps
the author in active work instead of dropping into an empty editor.

Verification:

```bash
npm run check:creator-author-flow-contract
npm run check:ui-copy
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Latest screenshot evidence:

- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782706233918.png`

Latest signed-out screenshot evidence:

- `artifacts/visual-qa/local-creator/creator-login-1782705740927.png`
- `artifacts/visual-qa/local-creator/creator-1782705741862.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782705742059.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782705742243.png`
- `artifacts/visual-qa/local-creator/creator-works-1782705742440.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782705742619.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782705742809.png`

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

## 2026-06-28 Creator Reader-Token Residue Fix

The Creator login page and local request-to-update loop no longer use Reader
semantic tokens (`--ink-*`, `--worldline-*`, `--manuscript-*`). The design token
gate now blocks those tokens from returning to `app/src/apps/creator` or
`app/src/components/creator`.

Verification:

```bash
npm run check:design-tokens
npm run check:ui-copy
npm run check:creator-m0-m1-baseline
npm run check:creator-ui-contract
npm run check:creator-author-flow-contract
npm run check:no-mock-data
npm run test:creator
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
```

Latest screenshot evidence:

- `artifacts/visual-qa/local-creator/creator-login-1782704322451.png`
- `artifacts/visual-qa/local-creator/creator-1782704324634.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782704324845.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782704325029.png`
- `artifacts/visual-qa/local-creator/creator-works-1782704325192.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782704325373.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782704325551.png`

## 2026-06-28 Creator Brand Boundary Evidence

The Creator shell no longer uses the Reader/parallel-universe brand mark in the
left navigation. The shared nav now accepts a Creator-owned brand label, target,
icon, and tone; `CreatorShell` uses the writing-workbench mark and routes brand
clicks to `/creator`.

Verification:

```bash
npm run test:creator
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
```

Latest screenshot evidence:

- `artifacts/visual-qa/local-creator/creator-login-1782700945436.png`
- `artifacts/visual-qa/local-creator/creator-1782700946382.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782700946581.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782700946764.png`
- `artifacts/visual-qa/local-creator/creator-works-1782700946924.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782700947085.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782700947245.png`

## 2026-06-28 M2/M3 Flow And Similar-Request Copy Evidence

Today now includes a request-to-public-update flow rail under the three priority
cards: reader request, local draft, publish check, and reader update. This keeps
the first screen tied to the product loop instead of becoming a generic
dashboard.

Requests no longer uses product copy that implies durable merging. Similar
requests are labeled as a temporary same-view filter: "只看同类请求" and "同类视图".
The implementation still uses `clusterFilterKey` only, so no permanent merge is
claimed without merge fields.

Verification:

```bash
npm run check:ui-copy
npm run check:creator-ui-contract
npm run check:creator-author-flow-contract
npm run test:creator
npm run build:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
```

Screenshot evidence from the route QA run:

- `artifacts/visual-qa/local-creator/creator-1782703289650.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782703289862.png`

## 2026-06-28 Later M3-M7 Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| M3 读者请求 | Passed | Temporary similar-request queue filter, state-machine-safe start writing, action pending states, filtered detail peek, and no durable merge copy are covered by `check:creator-m3-requests`. |
| M4 写作台 | Passed | Three-column writing layout, route/draft restore, local-only draft save, quiet editor surface, disabled publish handoff, and no direct publishing are covered by `check:creator-m4-editor`. |
| M5 作品与支线 | Passed | Work/branch/chapter structure, main/IF line treatment, selected line detail, parent line/chapter anchor, author notice, hide/archive confirmations, IF creation, and Writing Desk handoff are covered by `check:creator-m5-works`. |
| M6 发布检查 | Passed | Publish confirmation now has an in-progress state and success summary for work, line, chapter, request impact, and time. |
| M7 创作设置 | Passed | Save and clear local settings expose in-progress states; credential state remains state-only. |

Commands rerun after M7 and during M8:

```bash
npm run test:creator
npm run check:creator-m3-requests
npm run check:creator-m4-editor
npm run check:creator-m5-works
npm run check:creator-author-flow-contract
npm run build:creator
npm run build:reader
npm run check:reader-creator-copy-boundary
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
```

All six passed. `build:creator` still reports the existing Vite large chunk
warning.

## Root Test Status

## 2026-06-28 Latest Verification Notes

Latest commands rerun after the interaction primitive audit and current route
QA:

```bash
npm run check:creator-m0-m1-baseline
npm run check:ui-copy
npm run check:design-tokens
npm run check:no-mock-data
npm run check:creator-ui-contract
npm run check:creator-author-flow-contract
npm run test:creator
npm run build:creator
npm run build:reader
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

All commands passed in this worktree. The latest screenshot review confirms the
Creator surface no longer uses Reader planet/depth imagery, and the writing desk
keeps long prose on a quiet editor surface rather than a strong glass panel.

Follow-up copy tightening completed:

- Signed-out route copy now says each work area is locked, not a preview.
- Settings now uses "公开自动写作关闭" for the public creation boundary, avoiding
  wording that could imply a hosted author workspace.

M2 Today contract added:

- `check:creator-m2-today` now verifies Today reads the current Creator data
  sources, shows the three priority cards, routes to request/editor/publish/work
  surfaces, preserves the request priority rule, and avoids Reader/demo
  fixtures.
- Today secondary copy now frames the lower section as "四类今日任务" and clarifies
  "已看到或处理中" instead of flattening all non-pending requests into one vague
  processing bucket.

Latest M2 command evidence:

```bash
npm run check:creator-m2-today
npm run test:creator
npm run build:creator
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-routes
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Latest M2 screenshots:

- `artifacts/visual-qa/local-creator/creator-1782711368100.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-1782711367467.png`

M3 Requests contract added:

- `check:creator-m3-requests` verifies the saved views, work/type/status
  filters, heat/time sorting, request detail peek, legal status actions,
  temporary same-request view, reader-perspective action, and loading/empty
  states.
- The same-request control is intentionally framed as a temporary view because
  P0 has no durable merge columns.

Latest M3 command evidence:

```bash
npm run check:creator-m3-requests
npm run test:creator
npm run build:creator
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Latest M3 authenticated route screenshots:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782712436021.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782712436979.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782712437423.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782712437822.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782712438246.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782712438696.png`

M4 Writing Desk contract added:

- `check:creator-m4-editor` verifies the request context, quiet editor, publish
  destination rail, readiness blockers, local draft storage, route restoration,
  and publish-check handoff.
- The check also guards against direct publication from the Writing Desk,
  direct chapter/event/request writes, strong glass in the editor body, Reader
  depth imagery, and decorative particle motion.

Latest M4 command evidence:

```bash
npm run check:creator-m4-editor
npm run test:creator
npm run build:creator
npm run check:public-reader-bundle-boundary
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

Latest M4 authenticated route screenshots:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782713020238.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782713021178.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782713021642.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782713022041.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782713022499.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782713022936.png`

M5 Works and Branches contract added:

- `check:creator-m5-works` verifies the work list, structure strip, branch cards,
  chapter lists, main/IF visual split, selected branch detail, parent line,
  anchor chapter, author notice save, hide/branch archive confirmations, IF
  branch creation, and Writing Desk handoff.
- `docs/data-contracts/creator-data-map.md` now includes the `作品与支线`
  read/write boundary so backend reviewers can audit the page against the same
  source as the UI gate.

Latest M5 command evidence:

```bash
npm run check:creator-m5-works
```

## 2026-06-28 M6 Publish Check Gate

M6 now has a dedicated static gate instead of relying on broad contract checks.
The gate verifies the Publish Check page, publish wrapper, publish-flow docs,
draft-storage boundary, page acceptance docs, and product specs agree on the
same rule: a selected local draft becomes public content only after explicit
author confirmation.

Latest M6 command evidence:

```bash
npm run check:creator-m6-publish
```

Covered behavior:

- selected local draft, destination, line type, branch anchor, linked request,
  public title, prose preview, reader-facing location, and post-publish impact;
- must-pass, warning, and confirmation gates;
- `ConfirmActionDialog` and duplicate-submission protection;
- `publishChapter` writes `branches`, `chapters`, `publish_events`, and linked
  request completion;
- failure copy preserves the local draft: `发布未完成，正文仍在草稿箱。`;
- Publish Check does not directly write tables, mutate local draft prose, or use
  Reader visual residue.

Latest signed-in route QA after adding the M6 gate:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782714439418.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782714440376.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782714440816.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782714441216.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782714441665.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782714442110.png`

## 2026-06-28 M7 Settings Gate

M7 now has a dedicated static gate. It verifies Settings remains a product
surface named `创作设置`, not an implementation configuration page. It also
checks that credential handling remains state-only, local display preferences
write to the current document, and clear-local settings is confirmation-gated.

Latest M7 command evidence:

```bash
npm run check:creator-m7-settings
```

Covered behavior:

- settings sections: 写作方式, 本地创作服务, 本机状态, 显示偏好;
- reads local settings, creator client status, creator authorization, and
  feature flags;
- writes only local settings/display preferences from the Settings page;
- credentials render as configured/unconfigured state only;
- connection test, save, and clear actions expose in-progress states;
- reduced motion/transparency preferences bind to document data attributes and
  matching CSS selectors;
- clear local settings uses `ConfirmActionDialog` and does not affect published
  content;
- Settings does not use Reader visual residue or credential field names.

Latest signed-in route QA after adding the M7 gate:

- `artifacts/visual-qa/local-creator-authenticated/creator-1782714906074.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-requests-1782714907031.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-editor-1782714907473.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-works-1782714907890.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-publish-1782714908330.png`
- `artifacts/visual-qa/local-creator-authenticated/creator-settings-1782714908780.png`

Latest signed-out route QA after M7:

- `artifacts/visual-qa/local-creator/creator-login-1782714976168.png`
- `artifacts/visual-qa/local-creator/creator-1782714977100.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782714977302.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782714977485.png`
- `artifacts/visual-qa/local-creator/creator-works-1782714977661.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782714977846.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782714978041.png`

Open product-review notes:

- Signed-out locked workbench is structurally correct; manual product taste
  review can still ask for denser or calmer layout treatment.

`npm run test` was executed again after M7. It passed Creator-relevant,
Reader-build, product-boundary, P4 privacy, zero-cost PMF and public Reader
bundle sections, then stopped at:

```text
check:remote-runtime-blockers-artifact
Error: P72 source evidence headSha must match blocker artifact head
```

This failure is not caused by Creator UI. It is a remote Runtime evidence issue:
current P0 is zero-cost Reader + localhost Creator, while the failing gate expects
strict remote Runtime image evidence to match the current commit head.

The immediate artifact evidence from the failed run:

- `check:remote-runtime-blockers` produced `passed_with_remote_runtime_blockers`.
- `check:remote-runtime-blockers-artifact` failed because the selected P72
  image publish evidence had no current-head `headSha`.
- Earlier Creator checks in the same root run had already passed.

## Drift Fixed In This Pass

- Source worktree still showed permanent-merge language for request grouping.
  It now matches release copy: `查看同类` / `只看同类`.
- Source worktree lacked the latest design token file used by the Creator
  contract. It now matches the release token file.
- Browser QA found a demo-style login placeholder. It was changed from an
  example email to product copy: `作者邮箱`.
- Browser QA found the secondary login action read like a process note. It was
  changed to `检查登录状态`.
- The product copy scan now includes `app/src/lib/pmfSupabase.ts` because data
  wrapper messages can surface directly in the UI. A default author notice was
  changed from implementation-flavored copy to `读者请求会出现在作者端，作者确认后再发布更新。`.

## Browser Evidence

Saved screenshots from `qa:local-creator-routes`:

- `artifacts/visual-qa/local-creator/creator-login-1782698923708.png`
- `artifacts/visual-qa/local-creator/creator-1782698924635.png`
- `artifacts/visual-qa/local-creator/creator-requests-1782698924836.png`
- `artifacts/visual-qa/local-creator/creator-editor-1782698925054.png`
- `artifacts/visual-qa/local-creator/creator-works-1782698925271.png`
- `artifacts/visual-qa/local-creator/creator-publish-1782698925472.png`
- `artifacts/visual-qa/local-creator/creator-settings-1782698925670.png`

Observed:

- Desktop `/creator/login` renders a Creator workbench surface with no Reader
  depth image, no demo email, and no banned product terms.
- Unauthenticated `/creator`, `/creator/requests`, `/creator/editor`,
  `/creator/works`, `/creator/publish`, and `/creator/settings` keep their URL
  and show route-aware disabled capability previews instead of half-rendered
  protected pages.
- Mobile `/creator` at 390x844 has no horizontal overflow in the visible DOM.

## Remaining Manual QA

- Browser visual inspection with an allowlisted author account.
- Verify `/creator/login`, `/creator`, `/creator/requests`, `/creator/editor`,
  `/creator/works`, `/creator/publish`, and `/creator/settings` at desktop and
  mobile widths.
- Confirm the Creator surface feels like a local author workbench, not a Reader
  page or concept art surface.
