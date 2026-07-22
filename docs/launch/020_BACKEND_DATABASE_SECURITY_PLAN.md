# Backend Database Security Plan

Date: 2026-07-03

## Purpose

This document defines the cloud boundary for the zero-cost PMF and Creator Pivot V2 path. It exists so the Creator UI and local data layer do not accidentally depend on a public author backend or cloud writing runtime.

## Applications Ownership

This plan owns Epic 5: Backend Security. It starts only after ReaderSignal and PublishBundle contracts are stable enough to define transaction boundaries.

Owned outcomes:

- cloud schema and migrations
- RLS and author authorization
- reader feedback records and aggregation
- server-side publish transaction/RPC
- publish receipts and audit logs
- rate limits, abuse controls, export/delete, backup, and incident rollback

It does not own private author drafts, local writing-library bodies, model credentials, or Creator visual design.

## Cloud Schema Contract

Existing P0 objects remain in scope:

```text
profiles
works
branches
chapters
reader_requests
request_votes
publish_events
creator_clients
feature_flags
creator_authorizations
```

Epic 5 must add or normalize:

```text
reader_comments
reader_highlights
reader_signals
creative_signal_status
publish_receipts
author_audit_events
reader_entitlements
membership_plans
billing_events
```

Schema names are contract targets until a migration and rollback proof exists.

The first four live feedback source tables are now repository-owned by
`zero_cost_pmf_external_echo.sql`: `reader_comments`, `reader_highlights`,
`reader_reactions`, and `reader_questions`. `reader_signals` is a safe
`security_invoker` projection, not a second authoring store. Private
`CreativeReminder` interpretation remains local-only.

## ReaderSignal Model

The normalized signal kinds are:

```text
comment
highlight
request
vote
reaction
question
confusion
branch_wish
continuity_note
```

Cloud owns persistence, work/branch/chapter/paragraph attribution, permission filtering, aggregation, and reader-visible status. Local Creator converts selected signals into private CreativeReminder records.

## Publish Transaction

The commercial path is one server-owned transaction:

```text
PublishBundle
-> validate ownership and schema
-> insert branch when required
-> insert chapter
-> insert publish event
-> update linked signal/request statuses
-> return PublishReceipt
```

Multi-step client writes are compatibility-only and cannot be the production publish path. Idempotency and rollback must be tested.

## RLS Responsibility Matrix

| Object | Reader | Author | Admin |
| --- | --- | --- | --- |
| Works/branches/chapters | Read published | Manage owned or authorized | Manage |
| Reader signals | Create/read permitted own or public state | Read signals for owned work | Moderate |
| Publish events | Read public projection | Create through publish RPC only | Audit |
| Creator authorizations | No read | Read own authorization | Manage |
| Billing events | Read own safe projection | No unrelated read | Manage |

`authenticated` is a transport role, not proof of a trusted author. Anonymous identities receive only the minimum reader permissions.

## Security Completion Checklist

- RLS and author-authorization tests
- publish RPC permission and idempotency tests
- comment/request rate limits and anti-spam
- append-only author audit events
- public/private projection tests
- user data export and delete path
- backup, restore, and incident rollback evidence
- no secret/service-role/provider key in frontend, logs, or artifacts

## Forbidden Cloud Data

The cloud must not store private draft bodies, local writing-library bodies, unpublished character-arc notes, agent raw reasoning, private CreativeReminder bodies, or author model credentials.

## Data Boundary

| Data Type | Location | Rule |
| --- | --- | --- |
| Published works, branches, and chapters | Cloud data layer | Reader-visible content only. |
| Reader requests, votes, and lightweight feedback | Cloud data layer | Allowed as public demand signals with permission checks. |
| Publish events and receipts | Cloud data layer | Store public update record and opaque local reference only. |
| Draft prose | Local Creator App | Never uploaded unless explicitly published. |
| Private writing assets | Local Creator App | Characters, maps, skills, method cards, and notes stay local in P0. |
| Author model credentials | Local Creator App | Must not be stored in cloud records or public builds. |
| Working-agent operation records | Local Creator App | Local-only unless a future export is explicitly added. |

## Security Principles

- Public Reader builds may use browser-safe publishable keys only.
- Service-role or secret keys must never enter frontend code, logs, artifacts, or evidence screenshots.
- Browser access-token ownership is isolated in `app/src/lib/authSessionStorage.ts`; its current `localStorage` transport is compatibility behavior, not production authentication hardening. Production promotion requires a server-managed, script-inaccessible session strategy or an explicitly reviewed equivalent.
- Authenticated transport must not be treated as trusted author permission.
- Anonymous or lightweight readers can create feedback only through constrained fields.
- Author operations require creator authorization and explicit product intent.
- Cloud AI generation remains disabled for P0.

## Product Boundary For UI

User-facing UI must not expose implementation nouns such as provider, fallback, RLS, raw trace, service keys, database plumbing, or prompt infrastructure. Operational details belong in docs and gates, not in Reader or Creator product surfaces.

## Related Gates

```bash
npm run check:zero-cost-pmf-authenticated-boundary
npm run check:public-reader-bundle-boundary
npm run check:public-privacy-artifacts
npm run check:reader-non-generative
npm run check:pivot
```

## Current Round Boundary

WP6 repository implementation is accepted on 2026-07-10 with a bounded claim:

- `deploy/supabase/zero_cost_pmf_publish_transaction.sql` adds the authoritative receipt table, private append-only audit owner, explicit authenticated RPC grant, anonymous/ordinary-user rejection, work ownership checks, SHA-256 validation, advisory locks, atomic branch/chapter/event/request/receipt writes, and direct-publication grant revocation.
- `publishBundleAdapter.ts` now consumes the server receipt through `publishBundleTransaction()`; the browser-owned `publishChapter()` path is absent.
- `npm run test:publish-wp6` runs the production SQL in an isolated PostgreSQL container and proves mainline/IF publication, direct-write denial, anonymous/ordinary/foreign-author denial, concurrent replay, idempotency conflict rejection, privacy, and forced mid-transaction rollback.
- `npm run check:pivot`, Creator M6/data-map gates, lint, and the Creator production build remain green.

This repository evidence does **not** prove live deployment. The SQL delta has not been applied to the intended Supabase project in this round. Promotion still requires the explicit operator step plus strict live author-to-Reader receipt evidence. Live comment/highlight/reaction/question sources, moderation, data export/delete, backup/restore, and incident rollback also remain open Epic 5 work.

## External Echo Cloud Source Update

The repository-side source boundary is accepted on 2026-07-11 without claiming
live Supabase application:

- Four source tables use server-bound `reader_id` and `reader_is_anonymous`,
  explicit safe-column grants, RLS, published target checks, and no private
  author fields.
- Free-text comments/questions start pending; highlights must quote published
  chapter text; reactions use a fixed enum.
- A locked insert trigger enforces source-specific burst and daily limits.
- Author moderation is an explicit security-definer RPC with fixed search path,
  allowlist/work-ownership checks, and append-only private audit events that do
  not store reader text.
- `reader_signals` is a PG15+ security-invoker projection. The Creator RPC uses
  stable `(updated_at, id)` cursor ordering and returns only safe projection
  fields.
- `test:external-echo-cloud` executes the real base, author, WP6, forward, and
  rollback SQL in PostgreSQL 17. It proves reader/anonymous classification,
  target and highlight validation, direct-field denial, author isolation,
  moderation, aggregation, cursor progress, burst/daily limits, private-data
  absence, and non-destructive emergency rollback.
- The real Creator facade now requests each cloud source independently. A
  failed source retains its previous local cursor and cache instead of erasing
  other External Echo evidence.

Still open for Epic 5 promotion:

- Apply both WP6 and External Echo deltas to the intended Supabase project.
- Pass strict live schema, author-to-Reader, and four-source External Echo
  proofs; temporary proof content must end hidden.
- Add reader export/delete, operational backup/restore, and incident-recovery
  evidence before commercial production claims.
