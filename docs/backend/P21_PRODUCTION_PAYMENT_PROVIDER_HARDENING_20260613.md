# P21 Production Payment Provider Hardening

Date: 2026-06-13

Owner surface: `/settings`, `/v1/reader/checkout/start`, `/v1/reader/checkout/{checkout_session_id}/status`, `/v1/reader/checkout/return`, `/v1/reader/checkout/provider-callback`, `/v1/reader/subscription`, `/v1/account/snapshot`, Studio/Ops billing views

## Goal

P21 moves membership opening from preview-style frontend completion to a production-shaped payment boundary:

- public Account UI starts checkout and checks membership status
- browser code never posts provider lifecycle events
- payment completion is server-owned through return/status contracts or verified provider callback
- callback ingestion requires HMAC verification
- duplicate callbacks and repeated return checks are idempotent
- provider ids, webhook fields, event ids, idempotency keys, replay and reconciliation details stay out of public UI
- Studio/Ops remains the place for lifecycle events, replay, retry, reconcile, refunds and disputes

P21 does not claim a real payment provider is fully live. Real provider credentials, merchant configuration, refund/dispute operations and compliance review remain launch blockers.

## Product Contracts

### Start checkout

```http
POST /v1/reader/checkout/start
```

Public request:

```json
{
  "account_id": "web_reader_demo",
  "tier_id": "play_pass"
}
```

Public frontend does not pass or display provider values. The service may still store provider and idempotency details internally.

### Public status polling

```http
GET /v1/reader/checkout/{checkout_session_id}/status?account_id=web_reader_demo
```

Public response:

```json
{
  "account_id": "web_reader_demo",
  "checkout": {
    "checkout_session_id": "checkout_web_reader_demo_play_pass",
    "session_id": "checkout_web_reader_demo_play_pass",
    "tier_id": "play_pass",
    "status": "created",
    "checkout_url": "https://stub.local/checkout/play_pass?account_id=web_reader_demo",
    "expires_at": "2026-06-13T16:00:00+00:00"
  },
  "subscription": null,
  "wallets": {},
  "public_state": "processing",
  "recommended_action": "check_status",
  "message": "checkout_processing"
}
```

Public response must not include:

- provider
- provider_ref
- provider_event_id
- idempotency_key
- webhook payload
- raw lifecycle event ids

Diagnostics are intentionally opt-in and not requested by the public frontend:

```http
GET /v1/reader/checkout/{checkout_session_id}/status?account_id=...&include_diagnostics=true
```

### Return-page confirmation

```http
POST /v1/reader/checkout/return
```

Request:

```json
{
  "account_id": "web_reader_demo",
  "checkout_session_id": "checkout_web_reader_demo_play_pass"
}
```

The public frontend uses this as "check status after return", not as a provider webhook. In the preview `web_stub` mode, the server can mark the checkout complete to keep local QA runnable. For real providers, the return page should normally poll until the verified provider callback or reconciliation updates the subscription.

### Verified provider callback

```http
POST /v1/reader/checkout/provider-callback
X-NarrativeOS-Signature: sha256=<hmac>
```

The signature is HMAC-SHA256 over the raw request body. Secrets are read from:

- `NARRATIVEOS_<PROVIDER>_WEBHOOK_SECRET`
- fallback `NARRATIVEOS_BILLING_WEBHOOK_SECRET`

Supported lifecycle events still flow through `BillingService._process_lifecycle_event`:

- `checkout_session_completed`
- `checkout_session_expired`
- `subscription_payment_failed`
- `subscription_past_due`
- `subscription_payment_succeeded`
- `subscription_renewed`
- `subscription_reactivated`
- `subscription_renewal_due`
- `subscription_canceled`

Repeated callbacks with the same `(provider, provider_event_id)` are idempotent and must not create duplicate subscriptions.

## Implementation Evidence

Backend:

- `backend/src/narrativeos/services/billing.py`
  - adds public checkout status shaping
  - strips provider fields from public status and return payloads
  - expires stale checkout sessions on status read
  - adds server-owned `confirm_checkout_return`
  - adds HMAC callback verification
  - keeps existing lifecycle processing, retry, renew, cancel, reconcile and replay behavior
- `backend/src/narrativeos/api/reader.py`
  - adds `GET /v1/reader/checkout/{checkout_session_id}/status`
  - adds `POST /v1/reader/checkout/return`
  - adds `POST /v1/reader/checkout/provider-callback`
  - keeps legacy lifecycle ingest available for backend/Ops compatibility
- `backend/tests/test_payment_provider_hardening.py`
  - proves public status does not leak provider or idempotency fields
  - proves return refreshes membership and account snapshot
  - proves repeated return is idempotent
  - proves missing or invalid callback signatures are rejected
  - proves valid callbacks activate membership and replay safely

Frontend:

- `app/src/api/settings.ts`
  - `completeCheckout` now calls `/v1/reader/checkout/return`
  - public settings API no longer calls `/v1/reader/checkout/webhook`
  - adds `getCheckoutStatus`
- `app/src/pages/Account.tsx`
  - button copy becomes `检查开通状态`
  - public copy says权益会自动刷新, not that the browser completes real payment
  - keeps plan cards, account snapshot, reading archive and creator draft cards
- `app/src/types/index.ts`
  - adds `CheckoutStatusResponse`
  - makes checkout provider optional for public status payloads

Gates and packaging:

- `scripts/check-capability-alignment.mjs`
  - requires checkout status and return contracts
  - fails if public settings API calls `/reader/checkout/webhook`
- `scripts/smoke-deployed-api.sh`
  - exercises start -> status -> return -> subscription refresh -> account snapshot
- backend deploy package scripts include `tests/test_payment_provider_hardening.py` and P21 routes

## UX Boundary

Reader/account page:

- can show "处理中", "已开通", "需要重新开通", "检查开通状态"
- can show updated reading credits and creation credits
- can show login/merge recovery messages from P20 account snapshot
- must not show provider, webhook, callback, idempotency, replay, reconcile, refund or dispute wording

Studio/Ops:

- can show lifecycle history
- can replay provider events
- can retry payment
- can reconcile subscription state
- can inspect provider ids and idempotency keys
- should own refund/dispute handling in the next provider-specific integration pass

## Verification Commands

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
../.toolchain/python/bin/pytest tests/test_payment_provider_hardening.py tests/test_monetization_m0.py::test_checkout_webhook_lifecycle_retry_cancel_reconcile_and_replay tests/test_account_snapshot_api.py -q
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx tsc --noEmit -p tsconfig.app.json
npm run check:alignment
npm run check:backend-bridge
npm run check:design-system
npm run check:copy-boundary
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh http://127.0.0.1:8000
```

## Latest Verification Evidence

Current checked evidence:

- targeted backend tests: `6 passed, 2 warnings`
- product backend test set: `47 passed, 2 warnings`
- warnings are existing `jsonschema.RefResolver` deprecation warnings
- `scripts/harness-check-contract.sh` passed and regenerated OpenAPI artifacts
- `npx tsc --noEmit -p tsconfig.app.json` passed
- `npm run check:backend-bridge` passed
- `npm run check:design-system` passed
- `npm run check:alignment` passed with `31 frontend API calls`, `118 OpenAPI paths` and `16 required product contracts`
- `npm run check:copy-boundary` passed
- `npm run lint -- --max-warnings=0` passed
- `npm run build` passed
- `npm audit --audit-level=moderate` returned `found 0 vulnerabilities`
- local API smoke passed against `http://127.0.0.1:8000`
- smoke checkout path used start -> status -> return -> subscription -> account snapshot
- browser QA on `/settings?qa=p21-payment-hardening-dev` passed:
  - public page showed `开通这个方案`
  - after plan click, page showed `阅读会员 正在处理中`
  - after `检查开通状态`, page showed `会员已开通`
  - page did not show old `完成开通` copy
  - page did not show provider, webhook, callback, idempotency, replay, reconcile or backend terminology

Remaining production risks:

- production merchant credentials are not configured in this workspace
- refund/dispute operations are documented as Studio/Ops scope but not connected to a real provider
- compliance review, tax receipts and customer portal remain out of this P21 preview scope

## P22 Readiness

P22 can start only after P21 full verification passes. Recommended P22 scope:

Production auth merge and persistent account storage hardening:

- durable login-backed account id
- persistent database migration readiness
- browser-profile merge confirmation UX
- account snapshot conflict resolution
- story-project draft persistence for creator sessions
