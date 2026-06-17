# Kimi Frontend <> NarrativeOS Integration Issues

Updated: 2026-04-19

This log records confirmed integration blockers, contract drift, and verification outcomes.
Append new findings instead of rewriting prior evidence.

## Confirmed Blockers

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| frontend-env | `app/.env*` | Frontend integration env exists with explicit API/WS origin config | No frontend `.env` or `.env.example` present | n/a | n/a | high | frontend | Add `VITE_API_ORIGIN`, `VITE_WS_URL`, `VITE_API_LOCAL` contract and document defaults |
| prod-frontend-origin | `https://rhdrrmzncad2e.ok.kimi.link/api/v1/health` | Same-origin API reachable from deployed frontend | Returns platform 404; frontend currently serves static assets only | 404 | n/a | critical | frontend+deploy | Point frontend to explicit API origin; stop relying on relative `/api/v1` in production |
| backend-cors | backend HTTP middleware | Whitelisted browser origins allowed with credentials | No CORS middleware configured in FastAPI app factory | n/a | n/a | critical | backend | Add `CORSMiddleware` with env-driven whitelist and credential support |
| health-probe | frontend health check | Frontend probes backend `/health` on API origin | Current client probes `${API_BASE}/health`, which resolves to `/api/v1/health` | 404 | n/a | high | frontend | Split `apiBase` and `healthUrl`; use `${VITE_API_ORIGIN}/health` |
| frontend-auth-contract | `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/me`, `/v1/auth/logout` | Frontend payload/response matches backend `actor_id`/`identity`/`token.access_token` contract | Frontend expects `{ identifier, refreshToken, user }`, backend returns `{ identity, token }` and no refresh flow | n/a | n/a | critical | frontend | Replace fantasy auth DTOs and implement backend adapters and verification handling |
| frontend-story-contract | `/v1/reader/*` | Story UI uses reader session/replay/continue/quote/prefill contract | Frontend calls nonexistent `/story/*` endpoints | n/a | n/a | critical | frontend | Rewire story flow to `/v1/reader/library/worlds`, `/sessions`, `/continue`, `/sessions/{id}/quote|prefill|replay` |
| frontend-payment-contract | `/v1/reader/subscription`, `/v1/reader/checkout/start`, `/v1/reader/checkout/{id}/complete`, `/v1/reader/subscription/{account_id}/portal` | Payment UI uses backend subscription tiers and checkout lifecycle | Frontend calls nonexistent `/payments/checkout-session` and `/payments/subscription-session` | n/a | n/a | critical | frontend | Rewire subscription UI and add one-flight/idempotent checkout guards |
| frontend-export-contract | `/v1/customer/exports/*`, `/v1/customer/audit-export` | Export UI uses customer export endpoints | Frontend export buttons have no matching backend integration | n/a | n/a | medium | frontend | Map export actions to workspace JSON/CSV/PDF + invoice CSV + audit export |
| unsupported-surfaces | showcase / soul / studio mutation flows | Unsupported surfaces show explicit unavailable state | Frontend calls fantasy showcase/soul/studio endpoints not implemented by backend | n/a | n/a | high | frontend | Replace with capability-unavailable states and clear copy |
| websocket | `ws://` / `wss://` realtime endpoint | WS server exists and supports retryable realtime flow | No WS server implementation found in repo; only doc reference exists | n/a | n/a | high | frontend+backend | Add client-side retry/backoff + unavailable state; log `ws_server_missing` until server exists |
| clean-baseline-drift | locked `BASE_COMMIT=7bbfa93` vs dirty source backend | Harness baseline matches committed backend routes used for integration | Clean harness backend lacks dirty-only `/v1/customer/*`, `/v1/auth/verification/*`, and related newer API modules the partial frontend rewrite was assuming | n/a | n/a | critical | harness+frontend | Decide future integration against committed baseline only, or explicitly widen allowed backend overlay beyond CORS |
| harness-toolchain | `harness-check-env`, `harness-check-contract` | Local toolchain satisfies locked harness versions and commands | Current shell has Node `24.14.0` instead of `20.19.0`, Python `3.9.6` instead of `3.11`, and no `npm` on PATH | n/a | n/a | critical | dev-env | Switch to Node `20.19.0`, expose `npm`, and use Python `3.11` before rerunning harness gates |

## Verification Notes

- Production frontend HTML references static assets only and does not expose an API origin override.
- The deployed JS bundle contains silent demo fallback logic (`Backend not available. Running in DEMO mode.`), which can mask broken backend integrations.
- Backend source-of-truth contract lives in `/Users/james/Desktop/narrativeos_codex_handoff 3/src/narrativeos/api`.
- Frontend source to adapt lives in `/Users/james/Desktop/Kimi_Agent_设计系统加载/app/src`.

## Harness Abort Log
- [2026-04-20T03:16:37Z] `check-env`: node version mismatch: expected 20.19.0 got 24.14.0

## Harness Abort Log
- [2026-04-20T03:18:23Z] `check-contract`: missing required command: npm

## Harness Abort Log
- [2026-04-20T03:20:30Z] `check-contract`: npm executable not found; set NPM_BIN or add npm to PATH

## Artifact Findings (2026-04-20T03:22:05.652493+00:00)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| artifact-matrix | `POST /auth/verification/request` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |
| artifact-matrix | `POST /reader/checkout/${payload.checkoutSessionId}/complete` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |
| artifact-matrix | `POST /reader/subscription/${payload.accountId}/portal` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |
| artifact-matrix | `GET /customer/exports/${reportType}` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |
| artifact-matrix | `GET /customer/audit-export` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |
| artifact-matrix | `showcase_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `soul_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `studio_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-latency | `GET /v1/auth/me` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds/{world_id}` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/prefill` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/quote` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/replay` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/subscription` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/login` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/register` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/checkout/start` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/continue` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/sessions` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |

## Harness Abort Log
- [2026-04-20T03:22:41Z] `check-env`: node version mismatch: expected 20.19.0 got 24.14.0

## Artifact Findings (2026-04-20T07:57:28.478335+00:00)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| artifact-matrix | `showcase_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `soul_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `studio_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-latency | `GET /v1/auth/me` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds/{world_id}` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/prefill` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/quote` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/replay` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/subscription` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/login` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/register` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/checkout/start` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/continue` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/sessions` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |

## Artifact Findings (2026-04-20T08:02:05.709206+00:00)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| artifact-matrix | `showcase_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `soul_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `studio_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-latency | `GET /v1/auth/me` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds/{world_id}` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/prefill` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/quote` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/replay` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/subscription` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/login` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/register` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/checkout/start` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/continue` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/sessions` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |

## Harness Abort Log
- [2026-04-20T12:27:39Z] `check-env`: backend worktree is not clean

## Artifact Findings (2026-04-20T13:49:59.834792+00:00)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| artifact-matrix | `showcase_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `soul_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `studio_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |

## Harness Abort Log
- [2026-04-20T13:51:55Z] `review-automated`: frontend lint/typecheck/audit failed

## Harness Abort Log
- [2026-04-20T13:53:42Z] `review-automated`: no frontend tests found for coverage gate

## Harness Gate Resolution (2026-04-20T13:55:00Z)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| harness-gates | env/contract/frontend/backend-narrow/review | Required gates pass before commercialization continuation | PASS: env, contract, build, typecheck, lint, npm audit, backend narrow tests, automated review | n/a | n/a | resolved | harness | Continue to commercial endpoint promotion on a new clean backend commit |
| commercial-launch | checkout completion / portal / customer exports / email verification / WS | Commercial launch requires full customer lifecycle and realtime claims | Current committed baseline still lacks these routes/capabilities | n/a | n/a | critical | backend-product | Promote missing capabilities into clean backend commits, then reinitialize harness |

## Harness Abort Log
- [2026-06-04T09:04:52Z] `check-env`: node version mismatch: expected 20.19.0 got 22.22.3

## Artifact Findings (2026-06-04T09:05:06.305853+00:00)

| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| artifact-matrix | `showcase_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `soul_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-matrix | `studio_unavailable` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |
| artifact-latency | `GET /v1/auth/me` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/library/worlds/{world_id}` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/prefill` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/quote` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/sessions/{session_id}/replay` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `GET /v1/reader/subscription` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/login` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/auth/register` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/checkout/start` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/continue` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |
| artifact-latency | `POST /v1/reader/sessions` | Probe should reach configured API origin | Curl probe failed against configured API origin | 503 | 0.0 | high | env+backend | Start backend or fix API origin before browser smoke |

## Harness Abort Log
- [2026-06-06T03:55:04Z] `check-env`: backend worktree is not clean
