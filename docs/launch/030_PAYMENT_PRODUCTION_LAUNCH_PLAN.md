# Payment Production Launch Plan

Date: 2026-07-03

## Purpose

This document keeps payment and production launch work from arriving too early. The current product must first prove PMF signals through Reader Web, Local Creator App, reader feedback, author output, and return visits.

## Applications Ownership

This plan owns:

| Epic | Scope |
| --- | --- |
| Epic 6: Payment Entitlements | Plans, orders, entitlements, billing events, refund handling |
| Epic 7: Production Launch | Staging, production, monitoring, backup, rollback, closed beta |

It does not own private Creator data, local agent logic, or backend authorization implementation details.

## Commercial Object Contract

```text
membership_plan
reader_entitlement
request_quota
reading_quota
purchase_order
billing_event
refund_event
invoice_or_receipt
```

Reader value can include reading quota, request quota, IF-branch access, history access, and cross-device account recovery. Payment must not buy access to an author's private workspace or private drafts.

## Payment State Machine

```text
select plan
-> create order
-> redirect or invoke payment
-> verify callback idempotently
-> grant entitlement
-> refresh Reader projection
-> recover failure, cancellation, or refund
```

Payment success without entitlement is a failure. Duplicate callbacks must not duplicate entitlement. Refund/cancellation must revoke or mark entitlement according to policy.

## Environments

| Environment | Purpose | Required Proof |
| --- | --- | --- |
| local | Contract and fixture development | deterministic tests |
| preview | UI and integration review | build and smoke receipt |
| staging | Migration, payment sandbox, rollback rehearsal | staging evidence |
| production | Limited and then general availability | monitoring, backup, rollback, attestation |

Production planning must cover environment variables, migration pipeline, release tags, smoke tests, backup schedule, error monitoring, domain/CDN/TLS, and production seed policy.

## Rollout Sequence

```text
internal authors
-> closed reader beta
-> payment sandbox
-> limited live payment
-> full launch
```

Each transition is feature-flagged and reversible.

## Commercial Launch Acceptance

- Reader can register, read, comment/highlight/request/vote within policy.
- Reader can pay and receive the correct entitlement.
- Author sees External Echo without exposing private local data.
- Author can prepare and confirm a PublishBundle.
- Reader sees the published chapter or branch.
- Payment and publish failures are recoverable and auditable.
- Production errors are observable and the release can roll back.

## Current Position

Payment is not a P0 dependency. The current launch path is zero-cost PMF validation.

| Stage | Payment State | Meaning |
| --- | --- | --- |
| P0 beta | Off | Validate demand and author supply without cloud AI cost. |
| P1 PMF panel | Optional waitlist/intent | Capture willingness signals without a hard paywall. |
| P2 paid experiment | Limited | Test branch unlocks, author support, or priority requests. |
| P3 production | Full | Add billing, entitlement enforcement, support, refunds, and audit trails. |

## Payment-Adjacent Product Signals

Before real payment, track:

- Reader return visits after updates.
- Request/vote rate.
- Request-to-published conversion.
- Branch demand concentration.
- Author weekly active use.
- Pay-intent clicks, waitlist signups, or sponsor intent.

## Production Readiness Boundary

No payment launch should proceed until:

- Reader public build is non-generative and stable.
- Local Creator App can process feedback into publish bundles.
- Publish trace is reliable.
- Public/private boundaries are proven by gates.
- Creator Pivot V2 no longer depends on deprecated request-console paths.

## Deferred Scope

- Full subscription billing.
- Paid branch entitlement enforcement.
- Creator revenue share.
- Cloud AI runtime and generation billing.
- External platform auto-publishing.

These require a separate production plan after PMF validation.

## Current Round Boundary

This round creates the contract skeleton only. It does not enable payment, alter production deployment, or claim launch readiness.
