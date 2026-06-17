# P26 Public Production Release Gate

## Decision

P26 is blocked for public paid production launch.

P25 proved that the current product frontend and `/v1` backend can run as a reachable preview / staging pair. P26 checks whether that pair can be promoted to a real public paid production service. It cannot be promoted yet.

The blocking reason is not UI quality. The blockers are production resources and approvals: persistent database, production env, custom domains, payment provider operations, privacy/legal approval, security audit and production rollback ownership.

## Source of Truth

Current product frontend:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/app
Vite + React + TypeScript
```

Do not merge any external frontend into this product line without subagent approval. P26 is a production gate and resource acceptance pass, not a redesign pass and not a duplicate frontend pass.

Resource audit artifact:

```text
artifacts/integration/p26-production-resource-audit.json
```

Latest preview pair from P25:

```text
frontend: https://app-638zzda7k-james-projects-97742675.vercel.app
api:      https://pun-api-p25.vercel.app
```

## Resource Audit Summary

| Area | Status | Evidence | Production requirement |
| --- | --- | --- | --- |
| Vercel auth | Available | `vercel whoami` returned `durhamjames-6686` | Keep operator access or provide deploy token. |
| Frontend preview | Available | P25 frontend preview ready | Promote only after product-owner alias approval. |
| API preview / RC | Available | P25 API ready and smoke passed | Replace preview sqlite/env with production env and persistent DB. |
| Custom domains | Blocked | `vercel domains ls` returned 0 domains | Provide public frontend and API domains. |
| Frontend Vercel env | Blocked | `app` project has 0 persistent env vars | Add `VITE_API_ORIGIN` and `VITE_API_BASE_URL`. |
| API Vercel env | Blocked | `pun-api-p25` project has 0 persistent env vars | Add production `DATABASE_URL`, CORS, billing, provider, email/recovery env as needed. |
| Persistent database | Blocked | P25 API uses `sqlite:////tmp/narrativeos_beta_p25.db` | Provide Postgres-compatible persistent database and run migration / backup / restore drill. |
| CORS | Preview ready, production blocked | P25 preflight passed for preview origin | Re-run preflight from production frontend domain to production API domain. |
| Frontend security headers | Ready in config | `app/vercel.json` now declares security headers | Redeploy and verify headers on production frontend domain. |
| Payment provider | Blocked | Code supports return/callback/HMAC, env defaults to `web_stub` | Provide real provider account, keys, price map, return URL, callback URL, refund/dispute/cancel acceptance. |
| Privacy/legal | Blocked | Export/delete code exists | Approve privacy policy, data retention, deletion and billing-retention language. |
| Security audit | Blocked | Targeted tests exist | Review auth tokens, CORS, callbacks, deletion, secrets, ops endpoints and incident runbook. |
| Production alias approval | Blocked | No custom domain or alias decision | Product owner must name exact frontend/API aliases and rollback owner. |

## Audit Commands

Run these commands to refresh the production resource audit:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npx --yes vercel whoami
npx --yes vercel domains ls --scope james-projects-97742675
cd app
npx --yes vercel env ls --scope james-projects-97742675
cd /tmp/pun-api-p25
npx --yes vercel env ls --scope james-projects-97742675
```

Latest P26 results:

```text
whoami: durhamjames-6686
domains under james-projects-97742675: 0
app persistent env vars: 0
pun-api-p25 persistent env vars: 0
```

## Current Ready Capabilities

These are ready for continued preview / staging use:

- Reader, library, story, creator, settings and studio routes.
- Remote API smoke for library, reading, creator dialogue, market trends, quality, subscriptions, checkout, account snapshot, merge, export and delete.
- CORS for the P25 frontend preview origin.
- Runtime backup and restore dry-run against the P25 sqlite preview database.
- Recovery drill planning against the P25 backup.
- Frontend security headers in `app/vercel.json`.
- Public pages staying free of internal backend/provider/PRD/source jargon through automated checks.

## Production Blockers

### Persistent Database

Blocked until the production team provides a persistent Postgres-compatible `DATABASE_URL`.

Required commands after a real database is available:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m src.narrativeos.persistence.migrations \
  --database-url "$DATABASE_URL" \
  --dry-run

.venv/bin/python -m src.narrativeos.persistence.migrations \
  --database-url "$DATABASE_URL"

curl -sS -X POST "$API_ORIGIN/v1/ops/runtime-backups" \
  -H "Content-Type: application/json" \
  --data '{"label":"pre_production_launch","dry_run":false}'

curl -sS -X POST "$API_ORIGIN/v1/ops/recovery-drill" \
  -H "Content-Type: application/json" \
  --data '{"backup_path":"<latest-backup-path>"}'
```

Production cannot use sqlite under `/tmp`.

### Domain and CORS

Blocked until the product owner supplies:

- public frontend domain
- public API domain
- accepted CORS origin policy
- rollback domain / alias target

Required preflight after domains exist:

```bash
curl -sS -i -X OPTIONS "$API_ORIGIN/v1/auth/login" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

The response must include:

```text
access-control-allow-origin: <exact frontend origin>
access-control-allow-credentials: true
```

### Vercel Env

Blocked until production env names are persisted in Vercel project settings.

Frontend project `app` requires:

```text
VITE_API_ORIGIN
VITE_API_BASE_URL
```

API project requires:

```text
DATABASE_URL
NARRATIVEOS_ALLOWED_ORIGINS or NARRATIVEOS_ALLOWED_ORIGIN_REGEX
NARRATIVEOS_BILLING_PROVIDER
NARRATIVEOS_BILLING_WEBHOOK_SECRET or provider-specific webhook secret
provider secret keys
provider price map
mail / account recovery provider keys if email recovery is enabled
```

### Payment Provider

Blocked until a real provider is supplied and accepted.

Code readiness exists:

- `POST /v1/reader/checkout/return`
- `POST /v1/reader/checkout/provider-callback`
- HMAC verification tests in `backend/tests/test_payment_provider_hardening.py`

Production acceptance still requires:

- provider account
- secret key
- publishable key if frontend uses provider checkout
- webhook secret
- price map
- return URL
- callback URL
- refund acceptance
- dispute acceptance
- cancellation acceptance

### Privacy, Legal and Security

Blocked until the owner signs off:

- privacy policy
- data retention policy
- account deletion behavior
- billing retention behavior
- auth token handling
- CORS and callback security
- ops endpoint access
- incident and rollback runbook

## Promotion Commands

Do not run these without product-owner approval.

Frontend deploy with production env:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
VITE_API_ORIGIN="$API_ORIGIN" \
VITE_API_BASE_URL="$API_ORIGIN/v1" \
./scripts/deploy-vercel-preview.sh
```

Alias promotion shape:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx --yes vercel alias set <accepted-frontend-deployment>.vercel.app "$FRONTEND_PRODUCTION_DOMAIN"
```

API deploy shape:

```bash
cd /tmp/pun-api-production
npx --yes vercel deploy --yes --target production \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NARRATIVEOS_ALLOWED_ORIGINS="$FRONTEND_ORIGIN" \
  -e NARRATIVEOS_BILLING_PROVIDER="$NARRATIVEOS_BILLING_PROVIDER"
```

API alias shape:

```bash
npx --yes vercel alias set <accepted-api-deployment>.vercel.app "$API_PRODUCTION_DOMAIN"
```

## Rollback Commands

Frontend rollback shape:

```bash
npx --yes vercel alias set <previous-accepted-frontend-deployment>.vercel.app "$FRONTEND_PRODUCTION_DOMAIN"
```

API rollback shape:

```bash
npx --yes vercel alias set <previous-accepted-api-deployment>.vercel.app "$API_PRODUCTION_DOMAIN"
```

Database rollback shape:

```bash
curl -sS -X POST "$API_ORIGIN/v1/ops/runtime-restore/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESTORE_REQUESTER_TOKEN" \
  --data '{"backup_path":"<verified-backup-path>","reason":"production rollback"}'

curl -sS -X POST "$API_ORIGIN/v1/ops/runtime-restore/<request-id>/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESTORE_ADMIN_TOKEN" \
  --data '{"reason":"approved rollback"}'

curl -sS -X POST "$API_ORIGIN/v1/ops/jobs/runtime-restores" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESTORE_ADMIN_TOKEN" \
  --data '{"request_id":"<request-id>"}'
```

## P27 Recommendation

P27 should be one of two paths:

1. `Production Resource Provisioning`: if the owner can provide domains, database, provider credentials and approvals.
2. `Blocked Launch Handoff`: if production resources are not available within the eight-hour window; package the P25 preview pair, P26 blockers and exact commands for the backend / ops team.
