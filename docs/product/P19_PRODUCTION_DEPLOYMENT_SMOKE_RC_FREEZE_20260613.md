# P19 Production Deployment Smoke and Release Candidate Freeze

Date: 2026-06-13

## Objective

P19 moves the Parallel Universe Novel prototype from local acceptance to a release-candidate preview:

- the only product frontend remains `app` (Vite + React + TypeScript)
- the frontend consumes the backend only through the `/v1` product contract
- backend-team `apps/web` and other external frontends remain reference-only
- public routes stay free of backend, PRD, raw prompt, source-platform, binding, provider and webhook language

## Release Candidate Links

Frontend RC preview:

```text
https://app-i7x25dxxi-james-projects-97742675.vercel.app
```

Frontend deployment inspector:

```text
https://vercel.com/james-projects-97742675/app/9SJ32f6mqDv36MsUm8a67SHwxhvW
```

API RC preview:

```text
https://pun-api-p19.vercel.app
```

API deployment URL:

```text
https://pun-api-p19-pklll55mf-james-projects-97742675.vercel.app
```

API deployment inspector:

```text
https://vercel.com/james-projects-97742675/pun-api-p19/7pTCdAfqQEziqEDXJf6bZ9vts2ky
```

Previous stable frontend:

```text
https://parallel-universe-novel-p0.vercel.app
```

Previous stable API:

```text
https://pun-api-p0.vercel.app
```

Important: the previous stable frontend is not the P19 RC because browser QA showed it can create a checkout request but does not expose the P18 `完成开通` completion action. P19 RC is the new frontend preview above.

## Deployment Boundary

Frontend build-time env:

```bash
VITE_API_ORIGIN=https://pun-api-p19.vercel.app
VITE_API_BASE_URL=https://pun-api-p19.vercel.app/v1
```

API preview runtime env:

```bash
DATABASE_URL=sqlite:////tmp/narrativeos_beta.db
NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions
NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger
NARRATIVEOS_ALLOWED_ORIGIN_REGEX='https://(([a-z0-9-]+\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+)\.vercel\.app'
```

CORS rule:

- fixed production/stable origins can still use `NARRATIVEOS_ALLOWED_ORIGINS`
- preview deployment domains should use `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`
- this is required because the current linked frontend Vercel project is named `app`, so preview URLs can look like `app-...vercel.app`

Failure degradation:

- public frontend requests keep their existing demo/fallback handling where the route already supports fallback data
- membership completion requires a real `/v1` API; if CORS or API is unavailable, `/settings` must show a user-facing failure, not internal provider or webhook details
- Studio/Ops may expose diagnostics; public routes may not

## Commands Used

API package and deploy:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/package-vercel-backend-api.sh

rm -rf /tmp/pun-api-p19
mkdir -p /tmp/pun-api-p19
cp -R artifacts/deploy/parallel-universe-vercel-backend-api-20260613T135627Z/. /tmp/pun-api-p19/

npx --yes vercel deploy /tmp/pun-api-p19 \
  --yes \
  --target preview \
  --format json \
  -e DATABASE_URL=sqlite:////tmp/narrativeos_beta.db \
  -e 'NARRATIVEOS_ALLOWED_ORIGIN_REGEX=https://(([a-z0-9-]+\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+)\.vercel\.app' \
  -e NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions \
  -e NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger
```

Frontend preview deploy:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN=https://pun-api-p19.vercel.app \
VITE_API_BASE_URL=https://pun-api-p19.vercel.app/v1 \
./scripts/deploy-vercel-preview.sh
```

Final RC gate:

```bash
.toolchain/python/bin/pytest \
  backend/tests/test_harness_narrow_api.py \
  backend/tests/test_product_runtime_api.py \
  backend/tests/test_backend_team_bridge.py \
  backend/tests/test_market_trends_api.py \
  backend/tests/test_creator_dialogue_api.py \
  backend/tests/test_creator_commercial_api.py \
  backend/tests/test_cors_config.py \
  backend/tests/test_monetization_m0.py::test_checkout_webhook_lifecycle_retry_cancel_reconcile_and_replay \
  -q

cd app
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm run lint -- --max-warnings=0
npm audit --audit-level=moderate

cd ..
npm --prefix app run check:backend-bridge
npm --prefix app run check:design-system
npm --prefix app run check:copy-boundary
npm --prefix app run check:alignment
NARRATIVEOS_API_ORIGIN=https://pun-api-p19.vercel.app ./scripts/smoke-deployed-api.sh
```

## Verification Evidence

Backend:

- `27 passed, 2 warnings`
- warnings are the existing `jsonschema.RefResolver` deprecation warnings
- CORS regression tests now cover both fixed origins and Vercel preview regex origins

Frontend:

- TypeScript check passed
- build passed
- lint passed with `--max-warnings=0`
- `npm audit --audit-level=moderate` found `0 vulnerabilities`
- build still prints the non-blocking Browserslist data-age warning

Product gates:

- `check:backend-bridge` passed
- `check:design-system` passed
- `check:copy-boundary` passed for 7 target groups
- `check:alignment` passed with 28 frontend API calls, 114 OpenAPI paths, 6 routes and 13 required product contracts

Remote API smoke:

```json
{
  "api_origin": "https://pun-api-p19.vercel.app",
  "api_base_url": "https://pun-api-p19.vercel.app/v1",
  "world_count": 12,
  "trend_count": 6,
  "weekly_scan_trends": 6,
  "monthly_scan_trends": 6,
  "reader_choice_events": 2,
  "subscription_tiers": 3,
  "checkout_tier": "play_pass",
  "checkout_status": "completed",
  "creator_turn_count": 4
}
```

Browser QA on the RC frontend:

- Opened `/settings?qa=p19-rc-preview`
- confirmed three public plan cards render: `阅读会员`, `创作会员`, `工作室会员`
- confirmed no API/CORS error and no browser console errors
- clicked `阅读会员 -> 开通这个方案`
- confirmed `完成开通` appears
- clicked `完成开通`
- confirmed state changes to `已开通`
- confirmed reading credits refresh to `30`
- confirmed `完成开通` disappears
- confirmed status says `会员已开通，阅读次数和创作额度已经刷新。`
- confirmed no public forbidden terms: `后端`, `PRD`, `system prompt`, `系统提示词`, `起点`, `番茄`, `绑定`, `provider`, `webhook`

## RC Scope

Included:

- reader-first home/discovery route
- library hot-topic filtering
- story reader and reader choice loop
- natural-language creator dialogue with write-first-ask-later behavior
- market trend adapter boundary and weekly/monthly scan API
- composed narrative quality gate contract
- membership plan read, checkout start, preview completion and entitlement refresh
- Studio/Ops backstage surfaces for diagnostics and quality gates
- deployable Vite frontend preview
- deployable FastAPI `/v1` preview API

Not included:

- real third-party payment provider checkout
- production payment signature verification
- persistent production Postgres deployment
- cross-device account snapshot and login merge
- creator dialogue to saved story-project persistence
- live external hot-list provider ingestion
- learned evaluator/reranker promotion to production gate
- production custom-domain promotion

## Risks and Rollback

Risks:

- API preview currently uses SQLite under `/tmp`, so serverless persistence is preview-only.
- API deploy command created a new Vercel project and Vercel printed a production alias for that project even though this is an RC preview track. Treat `pun-api-p19` as RC infrastructure, not production traffic.
- Frontend RC URL is a Vercel preview URL under the linked project `app`; do not promote it until product owner accepts the route-level browser QA.
- Browserslist data is stale; this is not blocking, but should be refreshed before a formal production release.
- The workspace root is not a Git repository. RC evidence is file/script/deployment based, not commit-SHA based.

Rollback:

- Frontend: keep using `https://parallel-universe-novel-p0.vercel.app` until P19 RC is accepted.
- API: keep using `https://pun-api-p0.vercel.app` until P19 RC is accepted.
- If P19 is promoted later and fails, re-alias frontend/API domains back to the prior P0 deployments recorded in handoff.
- Do not merge backend-team `apps/web`; frontend rollback must stay within the current Vite app line.

## P20 Readiness

P20 can start after P19 acceptance. The recommended next target is:

`P20: Production auth and cross-device account snapshot`

It should connect login/account identity, reader progress, creator dialogue drafts, membership entitlement and local fallback merge into one durable account snapshot. P20 should not add new public routes until the account snapshot contract is proven.
