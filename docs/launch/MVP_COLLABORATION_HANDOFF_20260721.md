# MVP Collaboration Handoff

Date: 2026-07-21

## Purpose

This handoff prepares the current repository for shared MVP maintenance. It is not a production-release claim. Database migrations, RLS, payment, hosted runtime deployment, and commercial operations remain separate workstreams.

## Current MVP Boundary

- Reader: public reading and feedback surface; it does not generate prose.
- Creator: localhost-only author workbench; unpublished prose and creative decisions remain local.
- Writing quality: candidate-first review, evidence-located findings, author confirmation, 22-dimension state, Chapter 1-20 continuity/long-range receipts, and a local literary-value evidence ledger.
- Publication: remains an explicit author-confirmed package boundary.

## Workstreams

| Workstream | Entry points | Done means | Explicitly excluded |
| --- | --- | --- | --- |
| Creator quality | `creator-decision`, local DB, quality validators | Findings have locators, author choices are recorded, tests/gates pass | Automatic rewriting, a composite literary score, Chapter 21+ campaigns |
| Creator UI | Creator routes and components | Product copy/boundary checks and route QA pass | Reader redesign or backend schema changes |
| Reader feedback | Reader components and signal adapters | Reader remains non-generative and privacy boundary passes | Private draft data or Creator-only controls |
| Database/security | Supabase migrations and authorization contracts | Owned schema/RLS/RPC tests pass | Local prose body storage |
| Payment/operations | Entitlements, billing and production runbooks | Sandbox/receipt/recovery evidence exists | Creator quality claims |

## Shared Definition Of Done

1. A PR states its owner, scope, user impact and unchanged boundaries.
2. It has a focused automated check and runs the relevant product gates.
3. It does not include local secrets, unpublished prose, raw workspace packages, or generated private artifacts.
4. It does not silently couple a local Creator change to database/payment work.
5. It records a limitation when evidence is incomplete.

## Required Commands

```bash
npm --prefix app run lint
npm run check:pivot
npm run check:no-custom-rag
npm run test:creator
npm run validate:creator-literary-value-evidence:chapter-1-20
npm run check:creator-literary-value-evidence
```

`npm run test` additionally includes remote-runtime gates. A failure caused by unavailable remote deployment evidence must be reported separately from local Creator MVP verification.

## First Team Tasks

1. Database/security owner: review and independently test the Supabase transaction/RLS migration work; do not merge it into Creator-only PRs.
2. Payment owner: define entitlement, callback idempotency, refund and recovery contracts before adding checkout UI claims.
3. Creator quality owner: add relationship-inconsistency evaluation only with exact state and prose locators; no generic relationship score.
4. QA owner: create a frozen multi-genre, human-reviewed comparison protocol before any claim of stable literary improvement.
