# Backend Team Package Audit - 2026-06-12

## Decision

The current product frontend remains `/Users/james/Documents/PUF/workspaces/integration-harness/app` (Vite + React + TypeScript). The backend-team package is valuable as backend capability, contracts, tests, and deployment reference, but its `apps/web` Next.js frontend must not be merged into the product before a subagent approval review.

This is an anti-duplicate-development rule. We should not rebuild an existing product entry, page structure, navigation model, creator conversation flow, or reader surface in a second frontend. If the backend package contains a useful UI idea, extract the small reusable contract, copy, or logic into the current shadcn-compatible design system instead of importing pages or framework structure.

## Package Shape

Source package inspected:

`/Users/james/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/mo456123zz_036c/msg/file/2026-06/parallel-novel-dev-inspection-20260612-212352.zip`

Extracted audit copy:

`/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/backend-team-inspection/parallel-novel-dev-inspection-20260612-212352`

Formal P12 handoff review:

`/Users/james/Documents/PUF/workspaces/integration-harness/docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md`

Sub-agent merge approval did not complete because the spawned worker hit a usage-limit error. Therefore the default decision is explicit: backend-team `apps/web` is not approved for merge, and only backend/non-UI assets may be reused.

Observed structure:

- `apps/api`: FastAPI backend with SQLAlchemy, Alembic, adapters, ops routes, story generation routes, tests, and workers.
- `apps/web`: Next.js frontend. Reference only; do not merge into current frontend.
- `packages/shared`: TypeScript contracts used by the backend-team Next frontend.
- Root deployment materials: `package.json`, `pnpm-workspace.yaml`, `vercel.json`, `railway.json`, `docker-compose.yml`, `.env.example`.

## Current Frontend API Contract

The current product frontend is built around a `/v1` API base from `VITE_API_BASE_URL`.

Reader/product endpoints currently used:

- `GET /v1/reader/library/worlds`
- `GET /v1/reader/library/worlds/{worldId}`
- `POST /v1/reader/sessions`
- `POST /v1/reader/continue`
- `GET /v1/reader/sessions/{sessionId}/replay`
- `GET /v1/reader/sessions/{sessionId}/quote`
- `GET /v1/reader/sessions/{sessionId}/prefill`
- `POST /v1/reader/snapshot`
- `POST /v1/scene/advance`
- `GET /v1/timeline/worldlines/{worldlineId}/loom`
- `POST /v1/quality/evaluate`
- `POST /v1/canon/commit`
- `GET /v1/reader/subscription`
- `POST /v1/reader/checkout/start`

Creator endpoints currently used:

- `POST /v1/creator/commercial-blueprint`
- `POST /v1/creator/dialogue/sessions`
- `GET /v1/creator/dialogue/sessions/{sessionId}`
- `POST /v1/creator/dialogue/sessions/{sessionId}/turns`

Auth endpoints currently present in the frontend API layer:

- `POST /v1/auth/login`
- `POST /v1/auth/register`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`

## Backend-Team Route Shape

The backend-team FastAPI app exposes root-level routes, not the current `/v1/reader/*` and `/v1/creator/*` contract.

Representative route groups:

- Health/auth/user: `/health`, `/auth/demo-token`, `/auth/sessions`, `/users/{user_id}`, `/entitlements/{user_id}`
- Billing/legal/privacy: `/billing/products`, `/billing/checkout`, `/billing/checkout-session`, `/legal/*`, `/privacy/*`
- Story project: `/story-projects`, `/story-projects/{project_id}`, `/story-projects/{project_id}/chapters`, `/story-projects/{project_id}/chapters/{chapter_index}/choice`
- Time candidates: `/story-projects/{project_id}/time-candidate-events`, select/reject/regenerate routes
- Reader/worldline: `/worldlines`, `/worldlines/{worldline_id}`, `/chapters`, `/scene/advance`
- Quality/release: `/content/safety/check`, `/editorial/issues`, `/release/candidates`, `/published/releases`, `/manuscript/review-package`
- Conversation/memory: `/chat`, `/memories`, `/relationships`
- Ops evidence: `/ops/*`, `/audit/*`, `/internal/story-worker`

## Compatibility Mapping

| Current product contract | Backend-team capability | Integration decision |
| --- | --- | --- |
| `GET /v1/reader/library/worlds` | `/worldlines`, `/published/releases` | Build compatibility adapter that returns current `ReaderWorld[]` shape. |
| `GET /v1/reader/library/worlds/{worldId}` | `/worldlines/{id}`, `/chapters`, `/published/releases/{id}/chapters` | Adapter should compose world metadata and chapter preview. |
| `POST /v1/reader/sessions` | `/story-projects` or local reader-session state | Keep frontend session contract; adapter may create or resume a story project. |
| `POST /v1/reader/continue` | `/scene/advance`, `/story-projects/{id}/chapters/{chapter_index}/choice` | Split by mode: reading choice can call chapter choice; generated scene can call scene advance. |
| `GET /v1/reader/sessions/{id}/replay` | Story project chapters / local transcript | Adapter required. |
| `GET /v1/reader/sessions/{id}/quote` | No exact route | Adapter can derive from latest chapter or keep deterministic fallback. |
| `GET /v1/reader/sessions/{id}/prefill` | No exact route | Adapter can derive from world template or keep deterministic fallback. |
| `POST /v1/reader/snapshot` | `/worldlines/{id}`, `/chapters`, `/memories`, `/relationships`, `/character-continuity` | Adapter required to compose snapshot. |
| `POST /v1/scene/advance` | `/scene/advance` | Direct proxy plus `/v1` prefix compatibility. |
| `GET /v1/timeline/worldlines/{id}/loom` | `/story-projects/{id}/time-candidate-events`, `/causality`, `/causal-map` | Rename public concept away from "loom"; adapter can keep internal route while UI says branch/history. |
| `POST /v1/quality/evaluate` | `/content/safety/check`, `/manuscript/editorial-style`, `/manuscript/review-package` | Adapter required; return the current quality-brake shape. |
| `POST /v1/canon/commit` | `/release/candidates`, approve/reject routes | Adapter required; map candidate/canon semantics to release candidate workflow. |
| `GET /v1/reader/subscription` | `/entitlements/{user_id}` | Adapter required; preserve current frontend subscription shape. |
| `POST /v1/reader/checkout/start` | `/billing/checkout`, `/billing/checkout-session` | Adapter required; preserve frontend checkout shape. |
| `POST /v1/creator/dialogue/sessions` and turns | `/chat`, `/story-projects`, `/chapters/generate` | New creator-dialogue adapter required. Do not replace `/create` with backend-team Next pages. |
| `POST /v1/creator/commercial-blueprint` | Story project/create/generate capabilities | Adapter or backend endpoint required. |
| `/v1/auth/*` | `/auth/demo-token`, `/auth/sessions` | Adapter required if real auth enters this prototype. |

## Deployment Implications

Do not adopt the backend-team root `vercel.json` as-is for the current product, because it builds `apps/web/.next` and would deploy the reference Next frontend. Current frontend deployment still uses the Vite app build output `dist/`.

Usable deployment assets from the backend package:

- FastAPI app and worker shape from `apps/api`.
- `docker-compose.yml` service references for Postgres, Redis, Qdrant, Neo4j, Graphiti, LiteLLM, Letta, and optional Dify.
- `railway.json` as a worker deployment reference.
- `.env.example` as an environment inventory, after removing frontend-only Next assumptions from the current product deployment.

## Recommended Next Goal

P0 goal: Backend Compatibility Bridge.

Completion standard:

1. Keep the current Vite/React frontend unchanged as the product UI.
2. Add a `/v1` compatibility layer that satisfies every current frontend API call.
3. Wire compatible routes to backend-team capabilities where they exist.
4. Keep deterministic demo fallback only where the backend package has no equivalent capability yet.
5. Run API contract tests plus browser QA for `/`, `/library`, `/story`, and `/create`.
6. Document any remaining unmapped capability as backend backlog, not as frontend redesign work.

Delivery format:

- A route mapping table committed with the code.
- A compatibility adapter/gateway implementation.
- A local `.env.example` for the chosen deployment topology.
- Test output for contract tests, frontend build/lint, and browser QA.
- A deployment checklist for frontend static hosting plus backend API hosting.
