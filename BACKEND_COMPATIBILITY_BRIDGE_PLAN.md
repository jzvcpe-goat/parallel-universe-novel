# Backend Compatibility Bridge Plan - P0

## Goal

Keep `/Users/james/Documents/PUF/workspaces/integration-harness/app` as the only product frontend, and connect the backend-team FastAPI capabilities into the current `/v1` product contract through an adapter/gateway.

No second frontend is allowed. The backend-team `apps/web` is reference-only and must not be merged into `app/src`.

## Current Implementation

Bridge implementation:

- `backend/src/narrativeos/services/backend_team_bridge.py`
- `backend/src/narrativeos/services/frontend_worlds.py`
- `backend/src/narrativeos/services/market_trends.py`
- App wiring: `backend/src/narrativeos/api/app_factory.py`
- Reader entry usage: `backend/src/narrativeos/api/reader.py`
- Runtime entry usage: `backend/src/narrativeos/api/product_runtime.py`
- Market trend entry usage: `backend/src/narrativeos/api/market.py`
- Contract tests: `backend/tests/test_backend_team_bridge.py`

Configuration:

```bash
NARRATIVEOS_BACKEND_TEAM_API_BASE_URL=http://127.0.0.1:8000
NARRATIVEOS_BACKEND_TEAM_AUTH_TOKEN=
NARRATIVEOS_BACKEND_TEAM_DEMO_USER_ID=reader-free
NARRATIVEOS_BACKEND_TEAM_TIMEOUT_SECONDS=2.0
```

When `NARRATIVEOS_BACKEND_TEAM_API_BASE_URL` is not set, the bridge is disabled and the current backend continues to serve all `/v1` routes locally.

The current product frontend world IDs are registered into the current backend at startup through `ensure_frontend_reader_worlds(...)`: `beacon-beyond`, `rain-bridge`, `jade-contract`, `lotus-lane`, `frontier-edict`, and `algorithm-city`. This keeps `/story?world=...` and `/create?template=...` aligned with real reader sessions instead of forcing the frontend to use older backend sample IDs.

When the bridge is enabled, mapped routes try the backend-team upstream first. If upstream is unavailable, returns non-2xx, or cannot be transformed into the current product contract, the route falls back to the current backend service. Responses provided by the bridge include:

- `capability_mode: "backend_team_bridge"`
- `integration_source: "backend_team_package"`
- `upstream.service`
- `upstream.path`

The market trend index is now part of the product contract. `/v1/market/trends` returns the weekly/monthly hot-topic index used by both homepage recommendations and `/create` template ordering. `/v1/market/trends/scan` is the POST/function-call shaped refresh entry (`scan_market_trends`) for agents and backend jobs. Hosted cron systems can call `GET /v1/market/trends/cron/weekly` and `GET /v1/market/trends/cron/monthly`. The payload includes the callable schema plus schedule metadata: weekly `0 8 * * MON` for homepage/template ordering and monthly `0 8 1 * *` for long-term template weight calibration. The current implementation uses a curated seed snapshot until external ranking sources are configured; frontend copy must not expose source names or research jargon.

## Interface Mapping

| Current frontend contract | Backend-team route | Current status | Notes |
| --- | --- | --- | --- |
| `GET /v1/reader/library/worlds` | `GET /worldlines` | Bridged when upstream is configured | Maps backend-team public worldlines into `ReaderWorld[]`. |
| `GET /v1/reader/library/worlds/{worldId}` | `GET /worldlines/{worldline_id}` | Bridged when upstream is configured | Composes `ReaderWorldDetail` from worldline detail, chapters, and scenes. |
| `POST /v1/reader/sessions` | `POST /story-projects` | Local current backend with frontend world registration | Current reader session semantics are already live; backend-team story projects are not the same user action. Product frontend world IDs are registered as published worldpacks so `beacon-beyond` and sibling worlds create real sessions. |
| `POST /v1/reader/continue` | `POST /story-projects/{project_id}/chapters/{chapter_index}/choice` | Local current backend with browser-verified frontend flow | Current route remains the canonical reader continuation path; `/story` choice clicks call `/v1/scene/advance`, which uses the current session service and then refreshes `/v1/reader/snapshot`. |
| `GET /v1/reader/sessions/{id}/replay` | `GET /story-projects/{project_id}/chapters` | Local current backend | Replay requires current session state; keep local until project/session identity is unified. |
| `GET /v1/reader/sessions/{id}/quote` | `GET /entitlements/{user_id}` | Local current backend | Monetization quote remains local; entitlement bridge exists through subscription. |
| `GET /v1/reader/sessions/{id}/prefill` | No exact backend-team route | Local current backend | Current intent prefill service remains source of truth. |
| `POST /v1/reader/snapshot` | `GET /worldlines/{id}`, `/memories`, `/relationships` | Local current backend | Snapshot requires current session state; bridge later only after session identity is unified. |
| `POST /v1/scene/advance` | `POST /scene/advance` | Bridged for compatible payloads | Requires `worldline_id`, `scene_id`, `choice_id`, and `user_id`. Current frontend can continue using `session_id` fallback until route identity is aligned. |
| `GET /v1/timeline/worldlines/{id}/loom` | `GET /story-projects/{id}/time-candidate-events`, fallback `GET /worldlines/{id}` | Bridged when upstream returns events | UI should not expose "loom"; this is only an internal route name. |
| `POST /v1/quality/evaluate` | `POST /content/safety/check` | Bridged when upstream is configured | Maps safety severity into current quality gate shape. Full narrative review can later use `/manuscript/review-package`. |
| `POST /v1/canon/commit` | `POST /release/candidates` | Bridged when confirmed and upstream accepts | Maps confirmed canon commit into release candidate creation. Local ledger remains fallback. |
| `GET /v1/reader/subscription` | `GET /entitlements/{user_id}` | Bridged when upstream is configured | Maps entitlement tier and credit balance into current subscription shape. |
| `POST /v1/reader/checkout/start` | `POST /billing/checkout-session`, fallback `POST /billing/checkout` | Bridged when upstream is configured | Maps current `tier_id` to backend-team `product_id`. |
| `POST /v1/creator/dialogue/sessions` | `POST /story-projects`, `/chat` | Local current backend | Current creator dialogue is already backed by the imported novel-starter prompt and optional server-side LLM. Backend-team routes are not exact dialogue equivalents. |
| `POST /v1/creator/dialogue/sessions/{id}/turns` | `/story-projects/*`, `/chat` | Local current backend | Keep Socratic creator UX stable; integrate story-project persistence only after product confirms how creator dialogue becomes a project. |
| `POST /v1/creator/commercial-blueprint` | `POST /story-projects` | Local current backend | Current blueprint service remains live; backend-team story projects can be used in a later creator-project bridge. |
| `GET /v1/market/trends` | scheduled function call / external ranking adapters | Local current backend with snapshot fallback | Drives homepage hot-topic index and creator template ordering. Returns function schema, scan schedule, and recommendation rows so future weekly/monthly scans can replace the seed snapshot without changing frontend UI. |
| `POST /v1/market/trends/scan` | scheduled function call / external ranking adapters | Local current backend with snapshot fallback | Explicit refresh entry for weekly/monthly scan jobs; currently deterministic and safe for preview. Scheduler should call `scan_market_trends` weekly and monthly, then persist the returned recommendation weights. |
| `GET /v1/market/trends/cron/weekly` | hosted cron / scheduler GET | Local current backend with snapshot fallback | Scheduler-safe GET wrapper around `scan_market_trends(cadence=weekly, force=true)`. |
| `GET /v1/market/trends/cron/monthly` | hosted cron / scheduler GET | Local current backend with snapshot fallback | Scheduler-safe GET wrapper around `scan_market_trends(cadence=monthly, force=true)`. |

## Why This Avoids Duplicate Development

- The current Vite/React frontend keeps product ownership of reader, library, story, and creator surfaces.
- The backend-team package contributes backend capability only.
- The adapter bridges API shapes instead of importing the backend-team Next.js pages.
- Unmapped backend-team capabilities remain documented as backend integration backlog, not as frontend redesign pressure.

## Verification

Run the bridge-specific gate:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run check:backend-bridge
```

Run the backend target tests:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
../.toolchain/python/bin/pytest tests/test_backend_team_bridge.py tests/test_harness_narrow_api.py tests/test_product_runtime_api.py tests/test_creator_dialogue_api.py tests/test_creator_commercial_api.py -q
```

Run the full local product gate:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
```

Run the deployed API smoke after an API host is available:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://pun-api-p0.vercel.app
```

Current P0 preview endpoints, verified on 2026-06-12:

| Surface | URL | Verification |
| --- | --- | --- |
| Frontend | `https://parallel-universe-novel-p0.vercel.app` | Stable alias to `app-b3fwrta0o-james-projects-97742675.vercel.app`; browser QA passed for `/`, `/create`, and `/story`. |
| Product API | `https://pun-api-p0.vercel.app` | `smoke-deployed-api.sh` passed; CORS allows the frontend origin. |
| Market trend function call | `GET /v1/market/trends`, `POST /v1/market/trends/scan`, `GET /v1/market/trends/cron/weekly`, `GET /v1/market/trends/cron/monthly` | Returns `scan_market_trends` schema, weekly/monthly schedule, 6 ranked categories, and template recommendations. |

Public reader/creator pages must not expose scheduler or algorithm words such as `低权重`, `Hawkes`, `t+`, `AI 味`, `system prompt`, `绑定`, or `底盘`. Keep those details in this bridge plan, Studio, and backend docs only.

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://<api-host>
```

This smoke is the P0 backend/frontend compatibility proof for deployed environments. It checks `/health`, the frontend world registry, market trend index, reader session creation, reader continuation, scene advance, creator dialogue, quality evaluation, and subscription shape. It intentionally uses the current `/v1` product contract instead of backend-team internal route names.

## Deployment Shape

Frontend:

- Build root: `app`
- Command: `npm run build`
- Output: `app/dist`
- Configure `VITE_API_BASE_URL=https://<api-host>/v1`
- Package command: `./scripts/package-vercel-preview.sh`
- The package manifest records whether the build is `real-api`, `local-real-api`, or `static-demo-fallback`. A P0上线 preview should be `real-api`; `local-real-api` is only local联调 evidence.

Backend:

- Current API host runs `backend/src/narrativeos/api/app_factory.py` through the existing FastAPI entrypoint.
- If the backend-team service is deployed separately, set `NARRATIVEOS_BACKEND_TEAM_API_BASE_URL` on the current backend API.
- Do not deploy the backend-team root `vercel.json` as the product frontend because it builds `apps/web/.next`.
- Package command: `./scripts/package-backend-api-deploy.sh`
- Required preview env: `NARRATIVEOS_ALLOWED_ORIGINS=https://<frontend-preview-host>`.
- Serverless preview env: `DATABASE_URL=sqlite:////tmp/narrativeos_beta.db`, `NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions`, and `NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger`.
- Optional upstream env: `NARRATIVEOS_BACKEND_TEAM_API_BASE_URL=https://<backend-team-api-host>`.
- Optional LLM env: `KIMI_API_KEY` or `MOONSHOT_API_KEY`; without keys, creator dialogue remains usable through the local cowriter fallback.

Deployment order:

1. Deploy the current backend API package.
2. Run `./scripts/smoke-deployed-api.sh https://<api-host>`.
3. Build/package the current frontend with `VITE_API_ORIGIN=https://<api-host>` and `VITE_API_BASE_URL=https://<api-host>/v1`.
4. Deploy only `app/dist` to the frontend preview host.
5. Run browser QA on `/`, `/library`, `/story`, and `/create` against the preview host.

## Remaining P0 Work

1. Deploy the current backend API to a stable preview API host.
2. Run `scripts/smoke-deployed-api.sh` against that API host.
3. Decide whether `reader session` and backend-team `story project` should share an ID model.
4. If yes, extend bridge coverage for backend-team story-project persistence while preserving the current frontend world IDs.
5. Build and deploy a frontend preview with `VITE_API_BASE_URL` pointed at the deployed API.
6. Run browser QA on `/`, `/library`, `/story`, and `/create` against the deployed frontend.
