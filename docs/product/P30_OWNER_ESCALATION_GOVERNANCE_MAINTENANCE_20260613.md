# P30 Owner Escalation and Governance Maintenance

## Current Decision

```text
public paid production launch: blocked
preview / staging testing: allowed
```

P30 exists because P29 shows every production-governance area is still blocked. This package turns the ledger into owner escalation messages and a maintenance protocol. It does not approve production aliases, does not store secrets and does not approve any external frontend.

Source ledger:

```text
artifacts/integration/p29-blocked-launch-evidence-ledger.json
```

Escalation matrix:

```text
artifacts/integration/p30-owner-escalation-matrix.json
```

## Escalation Summary

| Owner | Severity | SLA | Required Artifact | Escalation Trigger |
| --- | --- | --- | --- | --- |
| Product owner | launch-blocking | next review window | `artifacts/integration/p28-product-owner-alias-approval.json` | no exact production domains or rollback owner |
| Ops team | launch-blocking | next review window | `artifacts/integration/p28-vercel-domain-env-cors-acceptance.json` | no persistent Vercel env, custom domains or production CORS proof |
| Backend team | launch-blocking | next review window | `artifacts/integration/p28-production-database-recovery-acceptance.json` | no persistent database, migration plan or production-like recovery drill |
| Payment owner | launch-blocking | next review window | `artifacts/integration/p28-payment-provider-acceptance.json` | no real provider acceptance for return/callback/refund/dispute/cancel |
| Legal/privacy owner | launch-blocking | next review window | `artifacts/integration/p28-privacy-legal-signoff.json` | no privacy, retention, deletion or billing retention signoff |
| Security owner | launch-blocking | next review window | `artifacts/integration/p28-security-signoff.json` | no auth/CORS/payment/account/secrets/ops security signoff |
| Rollback commander | launch-blocking | next review window | `artifacts/integration/p28-rollback-rehearsal-acceptance.json` | no rollback commander, previous deployment pair or restore owner |

## Owner Messages

### Product Owner

Message:

```text
Public paid production launch remains blocked because exact frontend/API production domains, alias promotion timing and rollback owner are not accepted. Please provide the domain decision and artifact path artifacts/integration/p28-product-owner-alias-approval.json before the next review.
```

### Ops Team

Message:

```text
Public paid production launch remains blocked because production domains, persistent Vercel env and production CORS proof are missing. Please provide artifacts/integration/p28-vercel-domain-env-cors-acceptance.json with domain/env/preflight evidence before the next review.
```

### Backend Team

Message:

```text
Public paid production launch remains blocked because the API preview still depends on non-production sqlite behavior and no persistent database acceptance artifact exists. Please provide artifacts/integration/p28-production-database-recovery-acceptance.json with migration, backup, restore dry-run and recovery drill proof.
```

### Payment Owner

Message:

```text
Public paid production launch remains blocked because real payment provider operations are not accepted. Please provide artifacts/integration/p28-payment-provider-acceptance.json covering provider account, secret presence, price map, return, callback, refund, dispute and cancellation acceptance.
```

### Legal / Privacy Owner

Message:

```text
Public paid production launch remains blocked because policy and data-rights signoff are missing. Please provide artifacts/integration/p28-privacy-legal-signoff.json covering privacy policy, data retention, account deletion wording and billing retention.
```

### Security Owner

Message:

```text
Public paid production launch remains blocked because launch security signoff is missing. Please provide artifacts/integration/p28-security-signoff.json covering auth, CORS, payment callbacks, account deletion, secrets handling, ops access and incident rehearsal.
```

### Rollback Commander

Message:

```text
Public paid production launch remains blocked because rollback command ownership and accepted previous deployments are missing. Please provide artifacts/integration/p28-rollback-rehearsal-acceptance.json with previous frontend/API deployments, database restore owner and rehearsal output.
```

## Governance Maintenance Protocol

When an owner supplies an artifact:

1. Place the artifact under `artifacts/integration/`.
2. Do not include real secrets; record secret presence and secret-manager location only.
3. Update `artifacts/integration/p29-blocked-launch-evidence-ledger.json`.
4. Keep the entry `status` as `blocked` until the artifact exists and gate commands pass.
5. Move the entry to `accepted` only after the artifact exists, its owner is named and verification commands pass.
6. Run:

```bash
npm --prefix app run check:governance
npm --prefix app run check:escalation
npm --prefix app run check:production-gate
```

When all entries are accepted:

1. create a P31 production provisioning execution goal.
2. run production provisioning in a separate, explicit approval window.
3. keep alias promotion commands blocked until product owner approves exact commands.

When any entry is still blocked:

1. keep preview / staging testing only.
2. update escalation matrix.
3. escalate owner to the product owner for date and accountable person.
4. do not edit the public frontend to hide production blockers.

## P31 Recommendation

P31 should be:

1. Production provisioning execution, only if every P29 ledger entry becomes accepted with artifacts.
2. Production owner escalation review, if one or more owners miss the next review window.
