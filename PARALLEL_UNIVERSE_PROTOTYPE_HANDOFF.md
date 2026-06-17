# Parallel Universe Novel Prototype Handoff

## Current State

The commercial prototype is implemented in:

- Frontend root: `/Users/james/Documents/PUF/workspaces/integration-harness/app`
- Backend root: `/Users/james/Documents/PUF/workspaces/integration-harness/backend`
- Backend handoff: `BACKEND_TEAM_HANDOFF_20260608.md`
- Backend-team package audit: `BACKEND_TEAM_PACKAGE_AUDIT_20260612.md`
- Backend compatibility bridge plan: `BACKEND_COMPATIBILITY_BRIDGE_PLAN.md`
- Deployment target: Vercel preview, frontend-only static build from `app/dist`
- Live fallback URL: `https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/`
- Latest public preview manifest: `artifacts/deploy/parallel-universe-github-pages-preview-20260608T132009Z.json`

P0 live integration preview, verified on 2026-06-12:

- Frontend stable URL: `https://parallel-universe-novel-p0.vercel.app`
- Product API stable URL: `https://pun-api-p0.vercel.app`
- Latest frontend preview deployment: `https://app-8n40adj0w-james-projects-97742675.vercel.app`
- Latest frontend deploy artifact: `artifacts/deploy/parallel-universe-vercel-preview-20260612T213136Z.json`
- Latest backend API package artifact: `artifacts/deploy/parallel-universe-vercel-backend-api-20260612T212022Z.tgz`
- Vercel SSO protection was disabled for the dedicated P0 frontend/API preview projects so reviewers can open the links directly.

Verified commands:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
./scripts/smoke-deployed-api.sh https://pun-api-p0.vercel.app
curl -i -H 'Origin: https://parallel-universe-novel-p0.vercel.app' https://pun-api-p0.vercel.app/v1/market/trends
```

Verification result:

- `verify-parallel-universe-prototype.sh`: PASS, including contract alignment, lint, backend bridge, copy boundary, build, audit, 32 backend P0 tests, and local route smoke.
- Deployed API smoke: PASS, with 12 worlds, 6 market trends, reader session creation, and creator dialogue session creation.
- Browser QA on stable frontend: `/` shows live hot-topic ordering; `/create` creates a real dialogue opening and follow-up questions; `/story` records a choice and shows the personal branch, save state, story status, role memory, and choice impact.
- CORS: `https://pun-api-p0.vercel.app` returns `access-control-allow-origin: https://parallel-universe-novel-p0.vercel.app`.

The product is intentionally reader-first. The first screen sends users into a flagship universe and trial universes instead of an authoring form. The main navigation is limited to five product routes: `/`, `/story`, `/library`, `/create`, and `/studio`. Former `/settings` and `/showcase` surfaces were removed from the product route tree; character memory and personal worldline feedback now live inside the reader side panel.

Current Product Design QA evidence:

- `app/design-qa.md`
- `app/artifacts/design-qa/comparison-story-desktop.png`
- `app/artifacts/design-qa/comparison-create-desktop.png`
- `app/artifacts/design-qa/comparison-story-mobile.png`
- `artifacts/visual-qa/public-home-github-pages-1440x900-20260608-v2.png`
- `artifacts/visual-qa/public-library-github-pages-1440x900-20260608-v2.png`
- `artifacts/visual-qa/public-story-github-pages-1440x900-20260608-v2.png`
- `artifacts/visual-qa/public-create-github-pages-1440x900-20260608-v2.png`
- `artifacts/visual-qa/public-studio-github-pages-1440x900-20260608-v2.png`

Studio/Ops exposes internal authoring and release-review surfaces; engineering internals are kept out of the reader first screen.

For the 2026-06-12 backend-team package, keep the current Vite/React frontend as the only product frontend. The package's `apps/web` Next.js frontend is reference-only unless a subagent approval review explicitly accepts a small extractable pattern. Do not duplicate current product entries, page structures, navigation, reader surfaces, or creator conversation flows.

The next integration layer is the `/v1` backend compatibility bridge. Deploy the current backend API as the product API, optionally set `NARRATIVEOS_BACKEND_TEAM_API_BASE_URL` on that API host to point at the backend-team FastAPI service, and point the frontend to the product API with `VITE_API_BASE_URL=https://<api-host>/v1`.

The current frontend world IDs are part of the product contract: `beacon-beyond`, `rain-bridge`, `jade-contract`, `lotus-lane`, `frontier-edict`, and `algorithm-city`. The backend registers these IDs through `backend/src/narrativeos/services/frontend_worlds.py`; do not remap the product UI to older backend sample IDs or the reader session/save flow will split from the visible story entries.

The homepage and creator template ordering now depend on the market trend contract:

- API: `GET /v1/market/trends`
- Refresh entry: `POST /v1/market/trends/scan`
- Hosted cron entries: `GET /v1/market/trends/cron/weekly`, `GET /v1/market/trends/cron/monthly`
- Function-call name: `scan_market_trends`
- Schedule contract: weekly `0 8 * * MON` refreshes homepage and creator ordering; monthly `0 8 1 * *` recalibrates template weights and new template candidates.
- Frontend API client: `app/src/api/market.ts`
- Frontend fallback and ordering helpers: `app/src/features/market/trends.ts`

This replaces hardcoded homepage genre blocks and `/create` local hot-market maps. Public copy should say `热门题材索引` or `故事方向`; do not expose ranking-source names, `绑定`, `底盘`, or backend scan details on reader/creator pages.

P0 deployment packaging now has two explicit scripts:

- `scripts/package-backend-api-deploy.sh`: packages the current FastAPI API only, runs the narrow backend P0 tests first, and records required env such as `NARRATIVEOS_ALLOWED_ORIGINS`.
- `scripts/package-vercel-preview.sh`: packages the current Vite frontend only, runs alignment/backend-bridge/copy/design/build/audit gates, and records whether the output is `real-api` or `static-demo-fallback`.

The deployed API compatibility proof is:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://<api-host>
```

This is the required API smoke before claiming a public preview is a real P0 integration. It verifies the product `/v1` contract, not backend-team internal routes.

## Capability Alignment

The prototype now has a durable frontend/backend alignment guard:

- Script: `scripts/check-capability-alignment.mjs`
- App command: `npm run check:alignment`
- Harness gate: `scripts/harness-check-contract.sh` runs the alignment check after regenerating OpenAPI types.

The guard verifies:

- Frontend API client paths exist in `backend/openapi.json`.
- Capability matrix backend surfaces map to OpenAPI paths, except explicitly planned or locked capabilities.
- Major React routes are represented in `capabilityAlignments`.
- `/story?world=<unknown backend id>` keeps the backend-world boundary instead of silently falling back to a demo template.

Current alignment count:

```text
26 frontend API calls, 114 OpenAPI paths, 5 routes
```

## Live, Demo, Locked

Live backend surfaces:

- `/v1/auth/register`
- `/v1/auth/login`
- `/v1/auth/me`
- `/v1/auth/logout`
- `/v1/reader/library/worlds`
- `/v1/reader/library/worlds/{world_id}`
- `/v1/reader/sessions`
- `/v1/reader/continue`
- `/v1/reader/sessions/{session_id}/quote`
- `/v1/reader/sessions/{session_id}/prefill`
- `/v1/reader/sessions/{session_id}/replay`
- `/v1/reader/snapshot`
- `/v1/reader/subscription`
- `/v1/reader/checkout/start`
- `/v1/scene/advance`
- `/v1/timeline/worldlines/{id}/loom`
- `/v1/quality/evaluate`
- `/v1/canon/commit`
- `/v1/creator/dialogue/sessions`
- `/v1/creator/dialogue/sessions/{session_id}`
- `/v1/creator/dialogue/sessions/{session_id}/turns`

Demo surfaces:

- Reader-first homepage.
- `WorldTemplate` reading demo.
- Deterministic story-rhythm simulator with inhomogeneous-Poisson/Hawkes-style burst behavior.
- Local release-review reports and candidate scenes.
- Clean generated world cover assets under `app/public/parallel-assets/covers/`; PRD board screenshots are reference-only and are not used as product covers.
- `/create` dialogue authoring UI. It calls the creator dialogue contract first and falls back to an explicitly labeled local draft when cloud service calls are unavailable.

Locked or second-phase surfaces:

- Public showcase/community publishing.
- Standalone account/settings and character-chat shells.
- Frontend wiring from Studio release controls into `/v1/quality/evaluate` and `/v1/canon/commit`.
- Full world-version publish table behind the current canon commit ledger.
- Parameter-fitted timeline engine behind `/v1/timeline/worldlines/{id}/loom`; the current endpoint exposes observed runtime events.
- Learned evaluator/reranker assisted production gates.
- SillyTavern/ComfyUI/Dify-style adapters beyond registry cards and license gates.

## Verification

Run the full local verification gate:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
```

This runs:

- `scripts/harness-check-contract.sh`
- `npm run lint -- --max-warnings=0`
- `npm run build`
- `npm audit --audit-level=moderate`
- Backend targeted API tests
- Local preview smoke for `/`, `/story`, `/story?world=unknown-world`, `/library`, `/create`, and `/studio`

Current gate coverage includes the second-stage runtime contracts:

- `/v1/reader/snapshot`
- `/v1/scene/advance`
- `/v1/timeline/worldlines/{id}/loom`
- `/v1/quality/evaluate`
- `/v1/canon/commit`

Current full backend pytest status:

```text
268 passed, 28 failed, 1 skipped, 2 warnings
```

Known failure groups:

- learned evaluator/reranker tests require `joblib` / `scikit-learn` dependencies that are not installed in the current backend toolchain.
- `scripts/run_phase0_guardrails.sh` hardcodes `.venv/bin/activate`, which does not exist in this workspace.

The commercial frontend handoff-critical backend surface remains covered by the narrow gate above; the full backend suite must be green before claiming production backend readiness.

## Preview Deployment

After Vercel authentication is available:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/deploy-vercel-preview.sh
```

The deploy script runs alignment and build before invoking Vercel preview deploy.

To create a preview-ready artifact for dashboard upload or another static host:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/package-vercel-preview.sh
```

The package is written under `artifacts/deploy/` and includes `dist/`, `vercel.json`, `package.json`, and `package-lock.json`.
The script also writes a static fallback package whose root contains `index.html`, `assets/`, and `vercel.json`; use that package with the claimable Vercel fallback deploy script if CLI auth is still unavailable.
For the P0上线 preview, build with the deployed API configured:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN=https://<api-host> \
VITE_API_BASE_URL=https://<api-host>/v1 \
./scripts/package-vercel-preview.sh
```

If the manifest says `preview_kind: "static-demo-fallback"`, it is a design/demo package, not the real integration preview.
If the manifest says `preview_kind: "local-real-api"`, it proves local integration against `127.0.0.1` or `localhost`, but it is still not a shareable public preview.

Latest preview-ready Vercel artifact:

- `artifacts/deploy/parallel-universe-vercel-preview-20260608T131932Z.tgz`
- `artifacts/deploy/parallel-universe-static-preview-20260608T131932Z.tgz`
- `artifacts/deploy/parallel-universe-vercel-preview-20260608T131932Z.json`

Note: the local Vercel CLI is not installed and no `VERCEL_TOKEN` or auth file is available on this machine. The Codex Vercel fallback was attempted on the 2026-06-08 static tarball but did not return a `previewUrl`, so the reliable Vercel path remains CLI/dashboard deployment after authentication.

If Vercel authentication is still unavailable, the GitHub Pages fallback publishes only the static `dist/` output:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/deploy-github-pages-preview.sh
```

The fallback builds with `VITE_API_LOCAL=true`, `VITE_BASE_PATH=/parallel-universe-novel-prototype/`, and `VITE_ROUTER_MODE=hash`, then copies `index.html` to `404.html` for SPA refreshes and pushes the output to the `gh-pages` branch of `jzvcpe-goat/parallel-universe-novel-prototype`.

Current fallback preview:

```text
https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/
```

Recommended share URLs:

```text
Home: https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/
Reader: https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/#/story?world=beacon-beyond
Creator: https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/#/create
Studio: https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/#/studio
```

Latest GitHub Pages deploy:

```text
artifacts/deploy/parallel-universe-github-pages-preview-20260608T132009Z.json
```

Latest public browser QA:

```text
Checked: /, #/library, #/story?world=beacon-beyond, #/create, #/studio
Result: required commercial-product labels present; forbidden prototype/backend residue absent.
Forbidden terms checked: WEB READER, PROTOTYPE, 原型, 入口页, 首页只, 预览环境, 后端, 接口, PRD, 试玩, 模板库, 冷启动样本, CURRENT WORLD, 命运核, 内核, 正史, 候选, 时间织机, 质量门禁, 可转正.
```

Latest P0 browser QA on `https://parallel-universe-novel-p0.vercel.app`:

```text
Checked: /, /create, /story
Result: homepage trend index, natural-language creation, generated opening, follow-up questions, reader choice, personal branch, save state, and choice impact all present.
Forbidden terms checked: 起点, 番茄, 绑定, 底盘, 后端, 接口, PRD, system prompt, 系统提示词, 低权重, Hawkes, AI 味, t+.
```

P1 creator-direction rule:

- `/create` must infer a story direction from the first natural-language seed and keep that direction across follow-up turns unless the user provides a strong new signal.
- Homepage hotness labels such as `高热`, `上升`, and `稳热` are not writing style. Creator UI and dialogue context must use writing-tone labels such as `冷静、潮湿、证据感强` or `沉稳、压迫、权谋张力强`.
- `check:design-system` now verifies that `inferTemplateIdFromStorySeed` and `writingToneForTrend` remain wired into `/create`.
- Browser QA evidence: rain/bridge/video seed maps to `都市谜案` and remains there after a second turn; frontier/edict seed maps to `历史权谋`.
- Deployment evidence: stable frontend bundle contains `pun-api-p0` and `previous_session`; browser QA no longer shows the local draft fallback notice after the second turn.
- API evidence: `smoke-deployed-api.sh` validates creator session creation, creator turn append, and serverless rehydrate turn; latest smoke returned `creator_turn_count: 4`.

P2 reader-commercial loop:

- `/story` keeps the current Vite/React reader as the only product frontend.
- Desktop layout uses one reader grid: left rail, 680-760px manuscript, and right feedback rail align inside the same 1240px/1340px shell.
- Manuscript pages now hold about 520 readable Chinese characters, support vertical scroll, and expose previous/next page controls.
- Bookshelf and progress have a durable browser save: world, page, selected choice, branch, and bookshelf state survive reload before P3 account sync is introduced.
- Reader choice still calls the real session/advance path; deployed API smoke now validates `/reader/sessions`, `/reader/continue`, `/scene/advance`, `/reader/snapshot`, and worldline event count.
- Browser QA evidence: 1440x900 `/story?world=beacon-beyond` had no horizontal overflow, 520 chars on page 1, two choices, and no forbidden public copy; after save + choose + reload, saved state and selected choice persisted. 390x844 mobile had no horizontal overflow and showed index/feedback controls.
- Latest deployed API smoke returned `reader_choice_events: 2`.

P3 membership and checkout loop:

- `/settings` is now the productized membership center, not a backstage settings page.
- Public navigation is now `发现 / 阅读 / 书城 / 创作 / 会员`; Studio and operator settings remain direct/backstage.
- `/settings` calls real `/v1/reader/subscription` and `/v1/reader/checkout/start` through the current API client.
- The visible page shows current plan, reading credits, creator credits, membership tiers and checkout request state. It does not expose provider, stub, endpoint, or troubleshooting fields.
- `/story` also reads subscription status for `web_reader_demo`, shows free/member state, and links to the membership center.
- Capability alignment includes `/settings` and the two reader billing surfaces; route smoke includes `/settings`.
- API smoke validates `subscription_tiers: 3` and `checkout_tier: play_pass`.
- Browser QA evidence: desktop `/settings` shows three plans and no forbidden copy; clicking `start-checkout-play_pass` shows “已创建 阅读会员 开通请求” without pretending payment completed; mobile 390x844 has no horizontal overflow.

P4 Studio/Ops internal workspace loop:

- `/studio` remains a direct/backstage creator and operator route; it is not part of ordinary user navigation.
- Studio now contains the internal trend-refresh control for `scan_market_trends`, with weekly and monthly buttons wired through `app/src/api/market.ts`.
- Studio shows the function-call contract, cadence, schedule, trend ranking, template impact, and the frontend/service capability map. These details are intentionally not shown on `/`, `/library`, `/story`, `/create`, or `/settings`.
- The public product pages continue to show only productized outcomes: recommended story directions, reader choices, creator dialogue, saved reading state, and membership benefits.
- API smoke now validates `POST /v1/market/trends/scan` for both weekly and monthly cadence, in addition to GET trend and hosted cron entries.
- `check:design-system` now guards the Studio trend-refresh controls and capability-mapping section so internal operations cannot silently disappear.

P5 shadcn/ui design-system loop:

- Studio trend refresh and scan-contract UI moved into `StudioTrendOpsPanel`.
- Studio frontend/service mapping moved into `CapabilityMapPanel`.
- Membership tier cards now use `PlanCard`; the page-local `TierCard` implementation was removed.
- `PlanCard` now supports badge, loading, disabled state, test id, selectable CTA, and button variant so commercial account pages can reuse it without copying layout.
- Design-system registry, page contracts, shadcn registry JSON and `check:design-system` now include `StudioTrendOpsPanel`, `CapabilityMapPanel`, and `PlanCard` usage on `/settings`.
- Documentation updated with the maintenance rule: shadcn-compatible primitives stay generic, Parallel Universe business meaning lives in patterns, and repeated page-local cards must be extracted before more UI polish.
- Browser QA evidence: desktop `/studio` shows trend ops and capability map with no horizontal overflow; desktop `/settings` shows three plan buttons and checkout request still works; 390x844 mobile has no horizontal overflow on both routes.

P6 public commercial journey loop:

- Public journey QA covered `/`, `/library`, `/story`, `/create`, and `/settings` on desktop 1440x900 and mobile 390x844.
- Homepage remains a discovery/guide page: no `.manuscript-paper` or `.reader-paper-frame` reader surface appears on `/`.
- `/library` now reads the same market trend contract as homepage and creator: filters come from `marketTrends.top_categories`, ordering uses `orderTemplatesByMarketTrends`, and the section is labeled `热门题材索引专区`.
- `/story` choice flow was clicked through; selected state, branch feedback and choice impact remain visible without internal copy.
- `/create` was tested with a real story seed; it returned opening text, follow-up question and story notes without falling back to local draft.
- `/settings` still shows three `PlanCard` membership options and creates the reading-member checkout request.
- Final verification passed: full prototype verifier and deployed API smoke, including market scan, reader session/advance/snapshot, creator dialogue, subscription and checkout.

P7 frontend/backend contract gate:

- `check-capability-alignment.mjs` now checks 13 required product contracts, not just generic API path existence.
- Required contracts cover reader library/session/continue/snapshot/advance, creator dialogue session/turn, market trends/scan, subscription/checkout, quality evaluate, and canon commit.
- `reader/continue` is treated as a smoke-covered compatibility path because the reader UI intentionally advances through `/scene/advance`.
- The gate checks OpenAPI method presence, frontend API client calls, `capabilityAlignments.productSurface`, page wiring or smoke coverage, public navigation boundaries, Studio-only leakage, and explicit unsupported-feature boundaries.
- Capability alignment data now includes the reader runtime paths and the market trend contract, so public entries and backend contracts are visible in the same source of truth.
- New backend capabilities should not be accepted as “done” until OpenAPI, API client, product entry or Studio marking, copy-boundary status, and smoke/verifier coverage are updated together.

P8 concept/design/handoff asset sync:

- Current visual QA screenshots were refreshed from the running product, not from old concept boards.
- Screenshot evidence lives at `artifacts/visual-qa/p8-handoff-20260612T224737Z` and covers `/`, `/library`, `/story`, `/create`, `/settings`, and `/studio`.
- Desktop coverage includes 1440x900 captures for all six routes; mobile coverage includes 390x844 captures for `/`, `/story`, `/create`, and `/settings`.
- Screenshot manifest records source URL, viewport and horizontal-overflow result for every capture; all current captures report `overflowX: false`.
- Concept references are preserved as design references only:
  - `artifacts/design-assets/parallel-universe-unified-image2-screen-map.png`
  - `artifacts/design-assets/system-prompt-memo-template-interface.png`
  - `artifacts/design-assets/unified-screen-map/00-unified-product-screen-map.svg`
- Backend implementation notes stay in markdown docs, especially `docs/product/main-universe-template-productization/` and backend handoff documents. Concept images and public product pages must not carry backend or system wording.
- The P8 handoff archive is generated under `artifacts/handoff/parallel-universe-p8-handoff-20260612T224737Z.zip`; the external `.sha256` file is the checksum source of truth.
- P8 archive SHA256:

```text
c96c92d2c1c4b18134d2eab22cf0128e1aa1367a53efc92e00baaaad07ecb600  parallel-universe-p8-handoff-20260612T224737Z.zip
```

P9 creator dialogue productization:

- `/create` now puts natural-language creation first: one story seed, one primary input, one clear start action.
- The old status-card feeling was reduced by moving structural assistance into the right rail as `创作脉络` and `故事笔记`.
- The user-facing “reasoning” surface is only a creative summary: hook, character gap, scene pressure, world rule and tone. It does not expose raw chain-of-thought, system prompt, backend wording or API details.
- Mobile 390x844 hides example suggestions and repeated helper copy so the textarea and `开始创作` button stay inside the first viewport.
- Desktop 962x883 shows textarea, action and examples in the first viewport with no horizontal overflow.
- Wide desktop 1440x900 keeps the main dialogue area and 360px right rail aligned; `创作脉络` steps render as readable single-column rail cards.
- Browser QA submitted the seed `一座城市每天午夜都会改写所有人的名字，只有主角记得昨天的自己。` and received a 522-character opening, two follow-up questions and story notes.
- Public `/create` QA checked absence of `起点`、`番茄`、`绑定`、`底盘`、`system prompt`、`系统提示词`、`思维链`、`后端`、`接口`、`PRD`.

P10 hot-topic index consistency:

- `/`、`/library` and `/create` now share the same `marketApi.getTrends('weekly')` -> `marketTrendFallback` -> `orderTemplatesByMarketTrends` trend contract.
- Homepage topic buttons and hot-topic rows now navigate to `/library?topic=...` instead of a context-free library page.
- `/library` reads URL topic, activates the matching filter and keeps the same filtered state while browsing.
- Work-to-reader and work-to-creator paths stay separate:作品卡进入 `/story?world=...`; `用这个方向创作` enters `/create?template=...`.
- The current frozen main-universe source material provides six concrete main templates. P10 does not fabricate extra unconnected templates just to display ten categories.
- Browser QA: clicking `都市谜案` on home opens `/library?topic=都市谜案`, activates that filter and shows `雨夜桥边`.
- Browser QA: `/create?template=rain-bridge` inherits `都市谜案` and the matching writing tone.
- Mobile QA: `/`、`/library?topic=玄幻悬疑`、`/create?template=frontier-edict` have no horizontal overflow and no `起点`、`番茄`、`绑定`、`底盘`、`system prompt`、`系统提示词`、`后端`、`接口`、`PRD`.

P11 shadcn/ui design-system convergence:

- Added `TopicFilterBar` for shared hot-topic/category navigation on `/` and `/library`.
- Added `RankedWorldList` for shared ranked story rows on `/` and `/library`.
- `Home.tsx` and `Library.tsx` now pass data and routing intent into these patterns instead of duplicating list markup.
- `registry.ts`, `page-contracts.ts`, `parallel-universe-ui.registry.json`, and `check-design-system-boundary.mjs` now guard both patterns.
- `SHADCN_UI_DESIGN_SYSTEM_PLAN.md` now records topic/filter and ranked-list extraction as an explicit migration step.
- This is a maintenance extraction, not a redesign: no second frontend, no full-page rewrite, no new backend capability.

P12 backend-team package review and anti-duplicate-development decision:

- Backend-team zip was inspected from an isolated extraction under `artifacts/backend-team-inspection/parallel-novel-dev-inspection-20260612-212352`.
- The package contains both `apps/api` FastAPI backend capability and a separate `apps/web` Next.js frontend.
- The separate `apps/web` frontend is not approved for merge. The attempted sub-agent approval could not complete, so the product decision is deny-by-default.
- Current product frontend remains `app` (Vite + React + TypeScript). No backend-team `apps/web` pages, navigation, styling or public copy should enter `app/src`.
- Reusable package value is backend-only: FastAPI routes, Alembic migrations, shared contracts, agents, workers, tests and deployment references.
- The current backend compatibility bridge already maps selected backend-team capability into the `/v1` product contract through `backend/src/narrativeos/services/backend_team_bridge.py`.
- Product entry rule: public route -> `app/src/api/*` -> `/v1` product contract -> current backend/compatibility bridge -> optional backend-team upstream.
- New formal review doc: `docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md`.
- Development note updated: `docs/design-system/DEVELOPMENT_NOTES.md` now records the rule for packages that include a second frontend.

P13 eight-hour acceptance checklist:

- Acceptance doc: `docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md`.
- Stable frontend for review: `https://parallel-universe-novel-p0.vercel.app`.
- Stable API for review: `https://pun-api-p0.vercel.app`.
- Local preview currently available on `http://127.0.0.1:4173`.
- Acceptance routes: `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`.
- Implemented acceptance capabilities: hot-topic index, library filtering, reader choice loop, natural-language creator dialogue, membership checkout request, Studio trend refresh and backend compatibility bridge.
- Explicit phase-two items: real external hot-topic sources, creator dialogue to story-project persistence, reader-session/story-project ID unification, full narrative quality gate, cross-device account sync and formal payment callback.
- Latest P13 verification: lint, build, alignment, backend-bridge, copy-boundary, design-system, full verifier and deployed API smoke all passed.
- Next goal queue recorded in the P13 checklist: P14 browser acceptance refresh, P15 creator persistence design, P16 market scanner integration, P17 full quality gate composition, P18 payment completion/account sync.

P14 browser acceptance refresh:

- Evidence manifest: `artifacts/visual-qa/p14-acceptance-20260613T034218Z/qa-screenshot-manifest.json`.
- Screenshots refreshed for desktop `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`.
- Screenshots refreshed for mobile `/`, `/story`, `/create`, `/settings`.
- Manifest status: `pass`, issue count `0`.
- QA confirms no horizontal overflow, no public forbidden-term hits, no homepage manuscript residue, and `/create` textarea plus start action visible in the first viewport on desktop and mobile.
- No product UI changes were required in P14.

P15 creator dialogue to story-project persistence design:

- Design contract: `docs/backend/P15_CREATOR_DIALOGUE_PROJECT_PERSISTENCE_DESIGN_20260612.md`.
- Current `/create` remains a natural-language Socratic creator surface. It must not become a title/protagonist/worldbuilding/style setup form.
- The proposed product-facing route is `POST /v1/creator/dialogue/sessions/{session_id}/project`; frontend should not call backend-team `/story-projects` directly.
- State machine: `seed -> opening_draft -> clarify -> project_candidate -> saved_project -> preview_ready`.
- Field mapping uses current real backend-team fields: `title`, `genre`, `protagonist`, `conflict`, `worldbuilding`, `style`, and `target_chapters`.
- Field provenance is separated into author input, dialogue-derived notes, and frozen genre/template experience; public UI labels should remain productized as `你说的`, `我已整理`, and `题材经验`.
- Save and preview actions should appear only after assistant story text exists. If persistence is blocked, the assistant asks one short natural-language question in the same dialogue flow.
- The route must be idempotent so retries and double-clicks do not create duplicate story projects.
- P15 is a backend implementation contract and handoff artifact, not a second frontend merge or large UI rewrite.

P16 market trend scanner backend integration:

- Design and implementation contract: `docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md`.
- `scan_market_trends` is now a backend source-adapter boundary, not only a hardcoded snapshot.
- Backend service now defines `MarketTrendSourceAdapter`, `MarketTrendScanContext`, `MarketTrendSourceResult` and `CuratedSeedTrendAdapter`.
- Aggregation now captures adapter failures, deduplicates by `template_id` or trend id, normalizes heat, recomputes recommendation weights and emits `ops.source_health`, `ops.audit`, `ops.weight_changes` and `ops.manual_locks`.
- Public pages continue to consume only productized topic labels, trend rows, hooks, keywords and recommendations. Source health, scan contract, cron and adapter status remain Studio/Ops-only.
- `StudioTrendOpsPanel` now shows source health, scan audit and template impact in addition to weekly/monthly refresh controls.
- Tests now cover adapter aggregation and source failure degradation in `backend/tests/test_market_trends_api.py`.
- P16 does not claim live external ranking feeds are connected; it creates the safe boundary for licensed/editorial/first-party adapters.

P17 full narrative quality gate composition:

- Design and implementation contract: `docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md`.
- `/v1/quality/evaluate` and `/v1/canon/commit` now share a composed `QualityGateResult` through `backend/src/narrativeos/services/quality_gate.py`.
- The result preserves legacy fields while adding `summary`, dimension `scores`, `blockers`, `warnings`, `suggested_fixes`, `public_safe_message`, `studio_debug`, `release_decision` and `canon_commit_readiness`.
- Local runtime and `BackendTeamBridge` both use the same composer, so upstream content safety and local narrative eval return the same frontend-facing shape.
- Realtime blockers include content safety, engineering leak, meta narration, high-severity continuity failure, premature ending, missing quality report and missing operator confirmation.
- Warnings cover chapter length, detail/action density, repetition, choice distinctness, hook strength and character consistency.
- Learned evaluator and learned reranker remain shadow-only in `studio_debug.shadow_checks`; they are explicitly not production blockers.
- Reader pages may use only `public_safe_message`; creator pages may use summary and suggested fixes; Studio/Ops may inspect full scores, blockers, warnings and debug.
- Tests now cover expanded gate fields and shadow-only learned tracks in `backend/tests/test_product_runtime_api.py` and bridge compatibility in `backend/tests/test_backend_team_bridge.py`.

P18 payment completion and account sync:

- Design and implementation contract: `docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md`.
- `/settings` membership flow now supports checkout start, preview completion for the current web-stub chain and immediate subscription refresh.
- Production payment completion must remain server-callback or Ops reconciliation driven; the public browser must not expose provider event ids, webhooks, ledgers or lifecycle diagnostics.
- `settingsApi.completeCheckout` uses the existing lifecycle endpoint only as a preview bridge, then reloads `/v1/reader/subscription`.
- `useSettings` tracks checkout completion and hydrates checkout state from subscription snapshots.
- Account sync is defined across membership entitlement, reader progress, creator dialogue draft and future author project draft.
- Cross-device sync is not claimed complete until account snapshot, creator project persistence and login merge are connected.

P19 production deployment smoke and release candidate freeze:

- RC contract: `docs/product/P19_PRODUCTION_DEPLOYMENT_SMOKE_RC_FREEZE_20260613.md`.
- RC manifest: `artifacts/deploy/parallel-universe-p19-rc-20260613T140145Z.json`.
- Frontend RC: `https://app-i7x25dxxi-james-projects-97742675.vercel.app`.
- API RC: `https://pun-api-p19.vercel.app`.
- API CORS now supports both fixed allowed origins and preview-domain regex through `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`.
- The previous stable frontend `https://parallel-universe-novel-p0.vercel.app` is retained as rollback but is not the P19 RC because browser QA showed it lacks the P18 `完成开通` action.
- P19 RC gate passed: 27 backend tests, TypeScript, build, lint, audit, backend-bridge, design-system, copy-boundary, alignment, remote API smoke and deployed-browser membership completion QA.
- Do not promote to production custom domains until persistent database, real payment callback verification, auth/account snapshot and product-owner route QA are accepted.

P20 production auth and cross-device account snapshot:

- Contract doc: `docs/backend/P20_PRODUCTION_AUTH_ACCOUNT_SNAPSHOT_20260613.md`.
- Public product route: `/settings`.
- Product API route: `GET /v1/account/snapshot`.
- Backend implementation: `backend/src/narrativeos/services/account_snapshot.py` and `backend/src/narrativeos/api/account.py`.
- Frontend implementation: `app/src/api/account.ts`, `AccountSnapshot` type and `/settings` resume cards.
- The snapshot combines membership entitlement, reader progress, creator dialogue drafts, story-project placeholder refs, browser-profile merge state, conflict list and one public resume action.
- Public Account UI now shows `阅读档案`, `创作草稿` and `跨设备恢复` without provider, webhook, event id, upstream user id or repair logs.
- Guest users still see current browser recovery only; cross-device recovery is not claimed complete until durable login, persistent database, creator project persistence and merge UX are production-ready.
- Smoke now uses one unique account for reader session, creator dialogue, checkout completion and account snapshot.
- `check:alignment` now covers 14 required product contracts including `/v1/account/snapshot`.
- P20 keeps the same anti-duplicate-development rule: no backend-team `apps/web`, no second frontend, no direct frontend calls to backend-team root routes.

P21 production payment provider hardening:

- Contract doc: `docs/backend/P21_PRODUCTION_PAYMENT_PROVIDER_HARDENING_20260613.md`.
- Public product route: `/settings`.
- Public product API routes: `POST /v1/reader/checkout/start`, `GET /v1/reader/checkout/{checkout_session_id}/status`, `POST /v1/reader/checkout/return`.
- Backend/Ops callback route: `POST /v1/reader/checkout/provider-callback`.
- Backend implementation: `BillingService.checkout_public_status`, `BillingService.confirm_checkout_return`, `BillingService.verify_checkout_callback_signature` and `BillingService.ingest_verified_checkout_callback`.
- Frontend implementation: `app/src/api/settings.ts`, `CheckoutStatusResponse` type and `/settings` copy updated to `检查开通状态`.
- Public Account UI no longer calls `/reader/checkout/webhook` and does not display provider, event id, idempotency key, replay or reconcile details.
- Targeted tests: `backend/tests/test_payment_provider_hardening.py`.
- Smoke now exercises checkout start -> public status -> return -> subscription refresh -> account snapshot.
- Remaining launch warning: real payment provider credentials, merchant configuration, refund/dispute handling and compliance review are still required before production payment launch.

P22 production account merge and persistent account storage hardening:

- Contract doc: `docs/backend/P22_PRODUCTION_ACCOUNT_MERGE_PERSISTENCE_20260613.md`.
- Public product route: `/settings`.
- Public product API routes: `POST /v1/account/merge/preview` and `POST /v1/account/merge/confirm`.
- Auth routes: `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/me`, `/v1/auth/logout`.
- Backend implementation: `backend/src/narrativeos/services/account_merge.py`, `AccountMergeService.preview_merge`, `AccountMergeService.confirm_merge`, `SQLAlchemyPlatformRepository.reassign_reader_sessions` and `CreatorDialogueService.reassign_sessions`.
- Frontend implementation: `app/src/main.tsx` wraps `AuthProvider`, `app/src/api/account.ts` adds merge calls, `app/src/pages/Account.tsx` shows login/register, `发现本机档案`, `合并到账号`, continue reading and continue creating.
- Public Account UI now distinguishes current browser profile from signed-in account. It does not claim cross-device recovery before sign-in and confirm.
- Payment membership remains on the signed-in account after merge; browser profile data never overwrites account entitlements.
- Targeted tests: `backend/tests/test_account_merge_api.py` plus existing `backend/tests/test_account_snapshot_api.py`.
- Smoke now exercises auth register/login -> browser profile reader/draft creation -> merge preview -> merge confirm -> account snapshot.
- Browser QA now exercises `/settings` signed-in merge -> `/story` resume -> `/create?session=...` draft resume; screenshots are in `artifacts/visual-qa/p22-account-merge-mqckmqhw/`.
- Remaining launch warning: production database migration, privacy export/delete, account deletion, device inventory and security audit are still required before P23 production acceptance.

P23 account data governance and security readiness:

- Contract doc: `docs/backend/P23_ACCOUNT_DATA_GOVERNANCE_SECURITY_20260613.md`.
- Public product route: `/settings`.
- Public product API routes: `GET /v1/account/data/export`, `POST /v1/account/delete/preview` and `POST /v1/account/delete/confirm`.
- Current-session revocation route: `POST /v1/auth/logout`.
- Backend implementation: `backend/src/narrativeos/services/account_data.py`, `AccountDataService.export_account_data`, `AccountDataService.preview_account_deletion`, `AccountDataService.confirm_account_deletion`, repository token revocation, reader session deletion and subscription closure marking.
- Frontend implementation: `app/src/api/account.ts` adds data governance calls, `app/src/context/AuthContext.tsx` adds `clearLocalSession`, and `app/src/pages/Account.tsx` shows `账号与数据`, `导出我的数据`, `删除账号` and `账号已删除`.
- Public Account UI now lets a signed-in user export their account data and preview account deletion impact before confirmation. It does not expose password hashes, token hashes, provider payloads, database migration status or repair logs.
- Account deletion removes reader progress and creator drafts, revokes login sessions, closes the auth identity and marks subscriptions as `account_closure_pending` instead of hard-deleting billing records.
- Targeted tests: `backend/tests/test_account_data_api.py` plus existing account snapshot and account merge tests.
- Smoke now exercises export -> delete preview -> delete confirm -> token revocation -> empty snapshot on an isolated P23 smoke account.
- Browser QA now exercises signed-in export -> download JSON -> delete preview -> cancel delete -> confirm delete; screenshots and export JSON are in `artifacts/visual-qa/p23-account-data-mqcsf5sh/`.
- Remaining launch warning: production database migration, backup/restore drill, privacy/legal review, payment refund/dispute/cancellation handling and security audit are still required before P24 deployment acceptance.

P24 deployment launch acceptance and release handoff:

- Contract doc: `docs/product/P24_DEPLOYMENT_LAUNCH_ACCEPTANCE_20260613.md`.
- Acceptance script: `scripts/check-launch-readiness.sh`.
- Frontend preview package: `artifacts/deploy/parallel-universe-vercel-preview-20260613T201820Z.tgz`.
- Static preview package: `artifacts/deploy/parallel-universe-static-preview-20260613T201820Z.tgz`.
- Backend API package: `artifacts/deploy/parallel-universe-vercel-backend-api-20260613T201820Z.tgz`.
- Launch manifest: `artifacts/integration/launch-readiness-20260613T202710Z.json`.
- Browser QA artifacts: `artifacts/visual-qa/p24-launch-routes-mqcszrli/`.
- Local launch-readiness gate passed: frontend alignment/backend bridge/copy/design/lint/build/audit, backend targeted tests `37 passed, 2 warnings`, OpenAPI contract and local API smoke.
- Browser QA covered `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`; public pages had no forbidden internal terms, and `/settings` showed enabled `导出我的数据` and `删除账号` after login.
- Release decision: ready for deployment-team preview handoff; not yet approved for public paid production launch until production database, custom domain/CORS, real payment provider operations, privacy/legal, security audit and rollback drill are complete.

P25 production deployment execution and rollback rehearsal:

- Contract doc: `docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md`.
- Frontend preview: `https://app-638zzda7k-james-projects-97742675.vercel.app`.
- Frontend deployment id: `dpl_CnWCxRcF8ahqj3zkB3eXs23GfDLW`.
- Backend API preview / RC: `https://pun-api-p25.vercel.app`.
- Backend API deployment id: `dpl_4JgqtJT9TBmgmCAGp5tjcuvvdBTs`.
- Remote API smoke passed against `https://pun-api-p25.vercel.app`.
- Full launch-readiness gate passed with manifest `artifacts/integration/launch-readiness-20260614T043013Z.json`.
- Remote browser QA covered `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`; screenshots and report are in `artifacts/visual-qa/p25-remote-routes-mqda04cd/`.
- Health / CORS / runtime backup / restore dry-run / recovery drill / migration dry-run evidence is in `artifacts/integration/p25-deployment-execution/`.
- Runtime restore dry-run returned `restore_decision: ready_to_restore`; recovery drill returned `status: ready`.
- Release decision: preview / staging deployment rehearsal complete; public paid production launch is still blocked by persistent production database migration/backup/restore, custom-domain CORS, real payment provider ops, privacy/legal approval, security audit and production rollback rehearsal.

P26 public production release gate:

- Contract doc: `docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md`.
- Resource audit: `artifacts/integration/p26-production-resource-audit.json`.
- Gate script: `scripts/check-production-release-gate.mjs` and `npm --prefix app run check:production-gate`.
- Frontend static security headers are now declared in `app/vercel.json`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Vercel auth is available as `durhamjames-6686`, but current scope has 0 custom domains.
- `app` and `pun-api-p25` projects have 0 persistent Vercel env vars; P25 deployments used command-time env/build-env.
- API preview uses `sqlite:////tmp/narrativeos_beta_p25.db`; production still needs persistent Postgres-compatible DB, migration apply/stamp, runtime backup, restore dry-run and recovery drill.
- Payment provider remains blocked until real provider credentials, webhook secret, price map, return/callback URL and refund/dispute/cancel acceptance are supplied.
- Release decision: public paid production launch is blocked; preview / staging testing can continue.

P27 blocked launch handoff:

- Contract doc: `docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md`.
- Operator runbook: `docs/product/P27_OPERATOR_RUNBOOK_20260613.md`.
- Package manifest: `artifacts/integration/p27-blocked-launch-package-manifest.json`.
- Package gate: `scripts/check-blocked-launch-handoff.mjs` and `npm --prefix app run check:blocked-launch`.
- Single transferable artifact: `artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz`.
- Checksum: `artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz.sha256`.
- Package contains P25 preview/staging proof, P26 resource audit, P27 handoff/runbook, deployment scripts, frontend Vercel config, package metadata and remote browser QA screenshots.
- Package intentionally excludes `node_modules`, `dist`, `.env`, `.vercel`, `.venv`, external frontend source and secrets.
- Release decision: blocked launch handoff is ready for backend / ops / product-owner review; public paid production launch remains blocked.

P28 blocked launch review owner board:

- Owner board: `docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`.
- Launch review brief: `docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`.
- Production resource intake schema: `artifacts/integration/p28-production-resource-intake.schema.json`.
- Gate script: `scripts/check-launch-review-intake.mjs` and `npm --prefix app run check:launch-review`.
- P28 maps each production blocker to a required owner, input, validation command, acceptance artifact, release impact and fallback.
- Intake records only owner, presence and artifact paths; real secrets remain outside the repository.
- Release decision: public paid production launch remains blocked until the owner board is filled and accepted.

P29 blocked launch governance dashboard:

- Governance dashboard: `docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`.
- Evidence ledger: `artifacts/integration/p29-blocked-launch-evidence-ledger.json`.
- Gate script: `scripts/check-blocked-launch-governance.mjs` and `npm --prefix app run check:governance`.
- P29 is the internal eight-hour acceptance status source for blocked production launch.
- It records owner, status, current evidence, missing input, next action, review cadence and P30 branch.
- Ledger keeps `public_paid_production_launch` as `blocked`, `preview_staging_testing` as `allowed` and `external_frontend_merge_approved` as `false`.
- Release decision: public paid production launch remains blocked; preview / staging testing can continue.

P30 owner escalation and governance maintenance:

- Escalation doc: `docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`.
- Escalation matrix: `artifacts/integration/p30-owner-escalation-matrix.json`.
- Gate script: `scripts/check-owner-escalation.mjs` and `npm --prefix app run check:escalation`.
- P30 maps P29 ledger areas to owner, severity, required artifact, due cadence, escalation message and blocked release impact.
- It keeps public paid production launch blocked, keeps external frontend merge approval false and does not store real secrets.
- Release decision: owner escalation package is ready; public paid production launch remains blocked.

P31 acceptance artifact template pack:

- Template index: `docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md`.
- Template directory: `artifacts/integration/p31-acceptance-templates/`.
- Gate script: `scripts/check-acceptance-templates.mjs` and `npm --prefix app run check:templates`.
- P31 provides seven fillable templates matching P30 required artifacts.
- Templates default to `pending`, keep production launch blocked, record presence/verification paths only and keep external frontend merge approval false.
- Release decision: owner template pack is ready; completed artifacts are still required before provisioning.

P32 acceptance artifact intake validator:

- Intake doc: `docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`.
- Intake status: `artifacts/integration/p32-acceptance-artifact-intake-status.json`.
- Gate script: `scripts/check-acceptance-intake.mjs` and `npm --prefix app run check:intake`.
- P32 treats missing official acceptance artifacts as a governance state: pass only if the related ledger impact remains blocked.
- Submitted artifacts are checked for owner, approval timestamp, verification output path, no secrets and no external frontend approval.
- Release decision: official artifacts are still missing; public paid production launch remains blocked.

P33 external owner follow-up log:

- Follow-up doc: `docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`.
- Follow-up ledger: `artifacts/integration/p33-external-owner-follow-up-ledger.json`.
- Gate script: `scripts/check-owner-follow-up.mjs` and `npm --prefix app run check:follow-up`.
- P33 records waiting owner state with placeholders instead of inventing contacts or approval dates.
- All entries remain `waiting_on_owner` with `ledger_impact: blocked` until official artifacts are submitted.
- Release decision: public paid production launch remains blocked.

## Current Stable Preview

P25 remote frontend preview:

```text
https://app-638zzda7k-james-projects-97742675.vercel.app
deployment id: dpl_CnWCxRcF8ahqj3zkB3eXs23GfDLW
```

P25 remote API preview / RC:

```text
https://pun-api-p25.vercel.app
deployment id: dpl_4JgqtJT9TBmgmCAGp5tjcuvvdBTs
```

P19 release-candidate frontend:

```text
https://app-i7x25dxxi-james-projects-97742675.vercel.app
```

P19 release-candidate API:

```text
https://pun-api-p19.vercel.app
```

Stable frontend preview:

```text
https://parallel-universe-novel-p0.vercel.app
```

Latest frontend deployment:

```text
https://app-i7x25dxxi-james-projects-97742675.vercel.app
deployment id: dpl_9SJ32f6mqDv36MsUm8a67SHwxhvW
```

Stable API preview:

```text
https://pun-api-p0.vercel.app
```

Latest API RC deployment:

```text
https://pun-api-p19.vercel.app
deployment id: dpl_7pTCdAfqQEziqEDXJf6bZ9vts2ky
```

Deploy command:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN=https://pun-api-p25.vercel.app \
VITE_API_BASE_URL=https://pun-api-p25.vercel.app/v1 \
./scripts/deploy-vercel-preview.sh
```

Alias command:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx --yes vercel alias set app-s8n8lyt0d-james-projects-97742675.vercel.app parallel-universe-novel-p0.vercel.app
```
