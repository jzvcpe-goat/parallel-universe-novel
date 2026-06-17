# P12 Backend Team Package Review - 2026-06-12

## Decision

Current product frontend remains:

`/Users/james/Documents/PUF/workspaces/integration-harness/app`

The backend-team package contains a separate `apps/web` Next.js frontend. It is not approved for merge. The sub-agent approval attempt failed because the worker could not run, so the default product decision is deny-by-default: no second frontend enters the current Vite/React product line.

Allowed extraction:

- FastAPI backend capability and route semantics.
- Shared TypeScript/Pydantic contract ideas.
- Worker, test, migration and deployment references.
- Small non-UI algorithms or API-client mapping ideas after manual review.

Forbidden extraction:

- `apps/web` pages, layouts, navigation, copy, route model or styling.
- Root `vercel.json` as product frontend deployment config.
- Any public wording that exposes backend, PRD, API, prompt, provider, source-platform, binding or template-internal language.
- Any replacement of current shadcn-compatible design-system patterns in `app/src/components/design-system`.

## Evidence

Source zip found at:

`/Users/james/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/mo456123zz_036c/msg/file/2026-06/parallel-novel-dev-inspection-20260612-212352.zip`

Isolated extraction path:

`/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/backend-team-inspection/parallel-novel-dev-inspection-20260612-212352`

Package shape:

- `apps/api`: FastAPI service with `app/main.py`, SQLAlchemy models, Alembic migrations, agents, tests and workers.
- `apps/web`: Next.js frontend with app routes, page components, public assets, API proxy and UI shell.
- `packages/shared`: TypeScript contracts for the backend-team frontend.
- `scripts`: smoke, launch, release, manuscript, worker and audit scripts.
- Root deployment files: `package.json`, `pnpm-workspace.yaml`, `vercel.json`, `railway.json`, `docker-compose.yml`, `.env.example`.

## Backend Capability Inventory

### API surface

The backend-team API is root-level, not the current `/v1` product contract. Representative groups:

- Health and auth: `/health`, `/auth/demo-token`, `/auth/sessions`.
- User and entitlement: `/users/{user_id}`, `/entitlements/{user_id}`, `/users/{user_id}/llm-connection`.
- Billing and legal: `/billing/products`, `/billing/checkout`, `/billing/checkout-session`, `/billing/webhook`, `/legal/*`.
- Story projects: `/story-projects`, `/story-projects/{project_id}`, `/story-projects/{project_id}/chapters`, `/story-projects/{project_id}/chapters/{chapter_index}/choice`.
- Candidate events: `/story-projects/{project_id}/time-candidate-events`, select/reject/regenerate.
- Reader/runtime: `/worldlines`, `/worldlines/{worldline_id}`, `/scene/advance`, `/chapters`, `/chapters/generate`.
- Quality and release: `/content/safety/check`, `/editorial/issues`, `/release/candidates`, `/published/releases`, `/manuscript/review-package`.
- Narrative analysis: `/causality`, `/chapter-trace`, `/causal-map`, `/character-continuity`, `/longform-plan`, `/manuscript`.
- Conversation and memory: `/chat`, `/memories`, `/relationships`.
- Ops: `/ops/*`, `/audit/*`, `/internal/story-worker`.

### Database and migrations

The package includes four Alembic revisions:

- `20260530_0001_initial_commercial_schema.py`
- `20260601_0002_story_projects.py`
- `20260606_0003_genre_kernel_time_candidates.py`
- `20260606_0004_user_llm_connections.py`

Useful model areas:

- Users, auth sessions, legal consents, billing purchases, provider events.
- Worldlines, scenes, chapters, story projects, reader choices.
- Genre kernels and candidate event tables.
- Memory facts, relationship events, chat messages.
- Release candidates, published releases, editorial issues and safety reports.
- Usage metrics, product events, audit events and ops launch evidence.

### Agents and workers

Useful backend modules:

- `agents/chapter.py`: long-form chapter generation, quality repair and style diversification.
- `agents/commercial_prose.py`: commercial prose shaping.
- `agents/manuscript.py`: manuscript generation/report flow.
- `agents/narrative.py`, `causality.py`, `character.py`, `relationship_graph.py`, `memory_extractor.py`.
- `workers/manuscript_worker.py`, `workers/load_test_runner.py`.
- Root `scripts/story-generation-worker.mjs` for job orchestration reference.

### Tests and smoke assets

The package includes tests for API, story projects, billing, legal, safety, release candidates, manuscript quality, ops readiness, alerts, load tests and database migrations. These are useful as backend-team service acceptance tests, not as current frontend proof.

## Current Product Contract Mapping

The current product frontend calls `/v1` through `app/src/api/*`. The current backend already contains a conservative adapter:

- `backend/src/narrativeos/services/backend_team_bridge.py`
- `backend/src/narrativeos/api/reader.py`
- `backend/src/narrativeos/api/product_runtime.py`
- `backend/tests/test_backend_team_bridge.py`
- `scripts/check-backend-compatibility-bridge.mjs`

| Current product entry | Current `/v1` contract | Backend-team route | P12 decision |
| --- | --- | --- | --- |
| Library/world discovery | `GET /v1/reader/library/worlds` | `GET /worldlines`, `/published/releases` | Covered by bridge when upstream configured; local registry remains fallback. |
| World detail | `GET /v1/reader/library/worlds/{worldId}` | `GET /worldlines/{id}` | Covered by bridge for metadata; local detail remains source for current product worlds. |
| Reader session start | `POST /v1/reader/sessions` | `POST /story-projects` | Keep local. Story project is not yet identical to reader session. |
| Reader choice/continue | `POST /v1/reader/continue` and `POST /v1/scene/advance` | `POST /scene/advance`, chapter choice route | `scene/advance` bridge exists for compatible payloads; session continue remains local until IDs unify. |
| Reader snapshot | `POST /v1/reader/snapshot` | worldline, memory, relationship routes | Keep local until session/project identity is unified. |
| Branch/history drawer | `GET /v1/timeline/worldlines/{id}/loom` | candidate events, causal map | Bridge exists internally; UI must use product words like branch/history, not "loom". |
| Creator dialogue | `POST /v1/creator/dialogue/sessions`, turns | `/chat`, `/story-projects`, `/chapters/generate` | Keep current Socratic creator dialogue. Backend-team `/chat` is character chat, not authoring dialogue. |
| Story blueprint | `POST /v1/creator/commercial-blueprint` | `/story-projects` | Keep current. Later bridge can persist generated project after UX decision. |
| Hot-topic index | `GET /v1/market/trends`, scan/cron routes | No exact route in package | Current backend local service remains source. This is required for homepage/library/create consistency. |
| Membership | `GET /v1/reader/subscription` | `GET /entitlements/{user_id}` | Covered by bridge. |
| Checkout | `POST /v1/reader/checkout/start` | `/billing/checkout-session`, `/billing/checkout` | Covered by bridge. |
| Quality check | `POST /v1/quality/evaluate` | `/content/safety/check`, manuscript review | Covered for safety gate; full narrative review remains future backend work. |
| Canon/publish | `POST /v1/canon/commit` | `/release/candidates` | Covered for release-candidate creation when confirmed. |

## Conflicts and Gaps

### Conflicts

1. `apps/web` duplicates the product surface and uses Next.js, while the accepted frontend is Vite/React/TypeScript.
2. Backend-team root `vercel.json` builds `apps/web/.next`; using it would deploy the wrong frontend.
3. Backend-team UI contains its own nav, reader, story, account and admin pages; merging it would bypass current shadcn-compatible patterns and prior browser QA.
4. Backend-team API is root-level; the current product contract is `/v1`. Direct frontend rewiring would break current checks and deployed smoke.
5. Story project IDs and reader session IDs are not the same product object yet.
6. Backend-team `/chat` is character conversation; current `/create` is authoring dialogue with Socratic follow-up. They should not be swapped.

### Gaps

1. No exact backend-team route for `/v1/market/trends`, `/v1/market/trends/scan` or hosted weekly/monthly scan wrappers.
2. No exact backend-team route for current reader replay, quote and prefill shapes.
3. Current `scene/advance` bridge requires `worldline_id`, `scene_id` and `choice_id`; current product often starts from `session_id`.
4. Full narrative quality evaluation should eventually combine content safety, editorial style, manuscript review and continuity reports, not just content safety.
5. Creator dialogue persistence into story projects still needs a product decision: when does a dialogue become a project, and which fields are canonical?

## Integration Rule For The Backend Team

The backend team should expose or adapt to the current `/v1` product contract instead of asking the frontend to adopt backend-team internal routes.

Hard rule:

```text
Public route -> current app/src/api/* -> /v1 product contract -> compatibility bridge/current backend -> optional backend-team upstream
```

Not allowed:

```text
Public route -> backend-team apps/web page
Public route -> root backend-team route names
Public route -> backend implementation wording
```

## Immediate Backend接线清单

1. Deploy backend-team FastAPI as an upstream service, not as the product web app.
2. Configure current backend with `NARRATIVEOS_BACKEND_TEAM_API_BASE_URL`.
3. Run current backend bridge tests:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
../.toolchain/python/bin/pytest tests/test_backend_team_bridge.py tests/test_harness_narrow_api.py tests/test_product_runtime_api.py tests/test_creator_dialogue_api.py tests/test_market_trends_api.py -q
```

4. Run current product gates:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run lint -- --max-warnings=0
npm run build
npm run check:alignment
npm run check:backend-bridge
npm run check:copy-boundary
npm run check:design-system
```

5. Run full verifier:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
./scripts/smoke-deployed-api.sh https://pun-api-p0.vercel.app
```

## P12 Completion Verdict

P12 can be considered complete when:

- This review document exists in `docs/backend/`.
- The package remains isolated in `artifacts/backend-team-inspection/`.
- No backend-team `apps/web` files are copied into current `app/src`.
- The current bridge/check docs still pass.
- The frontend and backend contract checks pass.

P13 should start only after P12 passes: prepare the eight-hour验收 package with current links, route checklist, API smoke evidence, remaining backend接线 tasks and risk list.
