# P27 Operator Runbook

## Purpose

This runbook turns the blocked production launch into operator-owned actions. It is not a launch approval. It tells backend, ops and product owners exactly what must be supplied or run before public paid production can be approved.

## 1. Confirm Current Preview

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://pun-api-p25.vercel.app
npm --prefix app run check:production-gate
npm --prefix app run check:blocked-launch
```

Open:

```text
https://app-638zzda7k-james-projects-97742675.vercel.app
```

The preview can be used for product review. It must not be advertised as the public paid production launch.

## 2. Vercel Resource Setup

Current P26 audit result:

```text
scope: james-projects-97742675
domains: 0
app persistent env vars: 0
pun-api-p25 persistent env vars: 0
```

Refresh audit:

```bash
npx --yes vercel whoami
npx --yes vercel domains ls --scope james-projects-97742675

cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx --yes vercel env ls --scope james-projects-97742675

cd /tmp/pun-api-p25
npx --yes vercel env ls --scope james-projects-97742675
```

Frontend production env:

```text
VITE_API_ORIGIN=https://<api-production-domain>
VITE_API_BASE_URL=https://<api-production-domain>/v1
```

API production env:

```text
DATABASE_URL
NARRATIVEOS_ALLOWED_ORIGINS
NARRATIVEOS_BILLING_PROVIDER
NARRATIVEOS_BILLING_WEBHOOK_SECRET
NARRATIVEOS_CREATOR_DIALOGUE_DIR
NARRATIVEOS_CANON_LEDGER_DIR
```

Provider-specific env may also be required:

```text
NARRATIVEOS_STRIPE_SECRET_KEY
NARRATIVEOS_STRIPE_PUBLISHABLE_KEY
NARRATIVEOS_STRIPE_WEBHOOK_SECRET
NARRATIVEOS_STRIPE_PRICE_MAP_JSON
```

## 3. Database Migration and Recovery

Do not use sqlite under `/tmp` for production.

Dry-run schema lifecycle:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m src.narrativeos.persistence.migrations \
  --database-url "$DATABASE_URL" \
  --dry-run
```

Apply or stamp after operator approval:

```bash
.venv/bin/python -m src.narrativeos.persistence.migrations \
  --database-url "$DATABASE_URL"
```

Create runtime backup:

```bash
curl -sS -X POST "$API_ORIGIN/v1/ops/runtime-backups" \
  -H "Content-Type: application/json" \
  --data '{"label":"pre_public_production_launch","dry_run":false}'
```

Run recovery drill:

```bash
curl -sS -X POST "$API_ORIGIN/v1/ops/recovery-drill" \
  -H "Content-Type: application/json" \
  --data '{"backup_path":"<latest-backup-path>"}'
```

Minimum verification after database setup:

```bash
curl -sS "$API_ORIGIN/health"
curl -sS "$API_ORIGIN/v1/ops/schema-lifecycle"
curl -sS "$API_ORIGIN/v1/ops/data-integrity"
curl -sS "$API_ORIGIN/v1/ops/provider-runtime-metrics"
./scripts/smoke-deployed-api.sh "$API_ORIGIN"
```

## 4. Domain and CORS

Required product-owner inputs:

```text
FRONTEND_PRODUCTION_DOMAIN=<exact public frontend domain>
API_PRODUCTION_DOMAIN=<exact public API domain>
ROLLBACK_FRONTEND_DEPLOYMENT=<previous accepted frontend deployment>
ROLLBACK_API_DEPLOYMENT=<previous accepted API deployment>
```

Verify API preflight:

```bash
curl -sS -i -X OPTIONS "https://$API_PRODUCTION_DOMAIN/v1/auth/login" \
  -H "Origin: https://$FRONTEND_PRODUCTION_DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Required headers:

```text
access-control-allow-origin: https://<frontend-production-domain>
access-control-allow-credentials: true
```

Verify frontend security headers after redeploy:

```bash
curl -sS -I "https://$FRONTEND_PRODUCTION_DOMAIN" | rg 'x-content-type-options|x-frame-options|referrer-policy|permissions-policy' -i
```

## 5. Payment Provider Acceptance

Code currently supports:

```text
POST /v1/reader/checkout/return
POST /v1/reader/checkout/provider-callback
HMAC callback verification
```

Before production launch, the payment owner must verify:

1. checkout creation uses real provider.
2. return URL activates membership without exposing provider internals in public UI.
3. callback URL rejects unsigned payloads.
4. callback URL rejects forged signatures.
5. callback URL is idempotent for replayed provider events.
6. refund path updates support / ops records.
7. dispute path is visible in ops records.
8. cancellation path changes subscription state and benefits.

Run targeted tests:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m pytest tests/test_payment_provider_hardening.py tests/test_monetization_m0.py -q
```

## 6. Privacy, Legal and Security Signoff

Privacy/legal owner must approve:

- privacy policy
- data export wording
- account deletion wording
- data retention policy
- billing retention policy
- support and dispute retention policy

Security owner must approve:

- auth token handling
- CORS policy
- payment callback signature handling
- account deletion side effects
- secrets handling
- ops endpoint access model
- incident response path

## 7. Promotion and Rollback

Do not run promotion commands without explicit product-owner approval.

Frontend promotion:

```bash
npx --yes vercel alias set <accepted-frontend-deployment>.vercel.app "$FRONTEND_PRODUCTION_DOMAIN"
```

API promotion:

```bash
npx --yes vercel alias set <accepted-api-deployment>.vercel.app "$API_PRODUCTION_DOMAIN"
```

Frontend rollback:

```bash
npx --yes vercel alias set "$ROLLBACK_FRONTEND_DEPLOYMENT" "$FRONTEND_PRODUCTION_DOMAIN"
```

API rollback:

```bash
npx --yes vercel alias set "$ROLLBACK_API_DEPLOYMENT" "$API_PRODUCTION_DOMAIN"
```

Database rollback:

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

## 8. Launch Decision

Public paid production launch can be approved only after:

1. production domains are present and verified.
2. persistent database migration and restore drill pass.
3. real payment provider acceptance passes.
4. privacy/legal approval is recorded.
5. security approval is recorded.
6. product owner approves exact aliases.
7. rollback owner signs off.

Until then, the correct launch decision is:

```text
blocked; preview / staging testing may continue
```
