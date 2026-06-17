# P28 Blocked Launch Review Owner Board

## Decision

Public paid production launch remains blocked.

Preview / staging testing may continue on the P25 pair:

```text
frontend: https://app-638zzda7k-james-projects-97742675.vercel.app
api:      https://pun-api-p25.vercel.app
```

P28 turns the P26/P27 blockers into owner-owned cards. This is not a UI redesign, not a duplicate frontend task and not launch approval. The current product frontend remains the Vite + React + TypeScript app at:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/app
```

## Go / No-Go Rule

Go is allowed only when every owner card below has:

1. named owner.
2. supplied input.
3. verification command output.
4. acceptance artifact path.
5. rollback owner or fallback.
6. explicit product-owner approval for alias promotion.

Until then the correct status is:

```text
blocked; preview / staging testing may continue
```

## Owner Cards

### 1. Product Owner: Production Alias Decision

Status: blocked

Required input:

- exact public frontend domain.
- exact public API domain.
- production alias promotion timing.
- previous accepted frontend deployment for rollback.
- previous accepted API deployment for rollback.
- rollback owner name.

Verification command:

```bash
npx --yes vercel domains ls --scope james-projects-97742675
```

Acceptance artifact:

```text
artifacts/integration/p28-product-owner-alias-approval.json
```

Release impact:

No custom production domain or API domain means the product cannot be marketed as a public paid launch.

Fallback:

Keep P25 preview / staging pair for review; do not alias production domains.

### 2. Ops Team: Vercel Domains, Env and CORS

Status: blocked

Required input:

- Vercel scope and project ownership.
- frontend project persistent env values for `VITE_API_ORIGIN` and `VITE_API_BASE_URL`.
- API project persistent env values for database, allowed origins, billing provider and provider secrets.
- custom domain assignment for frontend and API.
- CORS credential policy approval.

Verification commands:

```bash
npx --yes vercel env ls --scope james-projects-97742675
npx --yes vercel domains ls --scope james-projects-97742675
curl -sS -i -X OPTIONS "https://$API_PRODUCTION_DOMAIN/v1/auth/login" \
  -H "Origin: https://$FRONTEND_PRODUCTION_DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
curl -sS -I "https://$FRONTEND_PRODUCTION_DOMAIN" | rg 'x-content-type-options|x-frame-options|referrer-policy|permissions-policy' -i
```

Acceptance artifact:

```text
artifacts/integration/p28-vercel-domain-env-cors-acceptance.json
```

Release impact:

Without persistent env and custom-domain CORS, preview behavior cannot be trusted as production behavior.

Fallback:

Keep preview domains; do not set production aliases.

### 3. Backend Team: Persistent Database, Migration and Recovery

Status: blocked

Required input:

- persistent Postgres-compatible `DATABASE_URL`.
- migration apply or stamp plan.
- runtime backup command output.
- restore dry-run output.
- recovery drill output.
- operator rollback owner.

Verification commands:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m src.narrativeos.persistence.migrations \
  --database-url "$DATABASE_URL" \
  --dry-run
curl -sS "$API_ORIGIN/health"
curl -sS "$API_ORIGIN/v1/ops/schema-lifecycle"
curl -sS "$API_ORIGIN/v1/ops/data-integrity"
curl -sS "$API_ORIGIN/v1/ops/provider-runtime-metrics"
./scripts/smoke-deployed-api.sh "$API_ORIGIN"
```

Acceptance artifact:

```text
artifacts/integration/p28-production-database-recovery-acceptance.json
```

Release impact:

The P25 API preview uses sqlite under `/tmp`; that is not acceptable for public paid production.

Fallback:

Continue preview testing only; do not migrate user-facing paid traffic.

### 4. Payment Owner: Provider Operations

Status: blocked

Required input:

- real provider account.
- provider secret key.
- publishable key if used by frontend.
- webhook secret.
- price map.
- return URL.
- callback URL.
- refund acceptance.
- dispute acceptance.
- cancellation acceptance.

Verification commands:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m pytest tests/test_payment_provider_hardening.py tests/test_monetization_m0.py -q
./scripts/smoke-deployed-api.sh "$API_ORIGIN"
```

Acceptance artifact:

```text
artifacts/integration/p28-payment-provider-acceptance.json
```

Release impact:

Paid launch cannot proceed while billing remains on preview/stub configuration.

Fallback:

Keep payment UI in preview review mode; do not collect public paid traffic.

### 5. Legal / Privacy Owner: Policy and Data Rights

Status: blocked

Required input:

- privacy policy approval.
- data retention policy approval.
- account deletion wording approval.
- billing retention acceptance.
- support and dispute retention acceptance.

Verification commands:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m pytest tests/test_account_data_api.py -q
```

Acceptance artifact:

```text
artifacts/integration/p28-privacy-legal-signoff.json
```

Release impact:

Account data export, deletion and billing retention cannot be publicly represented without policy signoff.

Fallback:

Continue internal review with non-public preview users.

### 6. Security Owner: Launch Security Review

Status: blocked

Required input:

- auth token review.
- CORS review.
- payment callback review.
- account deletion review.
- secrets handling review.
- ops endpoint access review.
- incident runbook rehearsal.

Verification commands:

```bash
npm --prefix app run check:production-gate
npm --prefix app run check:blocked-launch
node scripts/check-backend-compatibility-bridge.mjs
node scripts/check-design-system-boundary.mjs
```

Acceptance artifact:

```text
artifacts/integration/p28-security-signoff.json
```

Release impact:

No public paid production launch without security signoff.

Fallback:

Keep preview / staging routes available only for review and smoke testing.

## Required Intake Schema

Production resource intake must satisfy:

```text
artifacts/integration/p28-production-resource-intake.schema.json
```

The intake file supplied by operators should be stored as:

```text
artifacts/integration/p28-production-resource-intake.submitted.json
```

Do not commit real secrets into the repository. Secret values belong in Vercel or the approved secret manager; the submitted intake should record only presence, owner and verification artifact paths.

## P29 Recommendation

P29 should be one of two paths:

1. Production provisioning execution, if every P28 owner supplies inputs and acceptance artifacts.
2. Blocked launch governance dashboard, if owners are still missing and product needs a visible status board for eight-hour acceptance.
