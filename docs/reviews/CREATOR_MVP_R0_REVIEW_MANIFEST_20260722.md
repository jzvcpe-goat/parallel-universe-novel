# Creator MVP R0 Review Manifest

## Snapshot

- Base: `origin/main@76ba3f8`
- Packaging branch: `review/creator-mvp-r0-20260722`
- Scope: Creator MVP contracts, local persistence, Agent action surface, decision domain, route composition, and selected sanitized evidence.
- Explicit exclusions: database migrations, payment, production deployment, private manuscript evidence, local workspace exports, browser-session evidence, and generated local databases.

## Required commit boundaries

1. Governance, contracts, reproducible checks, and review policy.
2. Local data, migrations, and Agent action surface.
3. Creator decision and long-form correctness.
4. Creator routes and UI composition.
5. Selected sanitized evidence and current status.

## Public evidence inventory

Only records listed below may be added to the final review commit.

| Path | Source category | SHA-256 | Review decision |
| --- | --- | --- | --- |
| `docs/reviews/CREATOR_MVP_CURRENT_STATUS_LEDGER_20260722.md` | Status ledger | Pending final hash | Approved |
| `docs/reviews/CREATOR_MVP_CODE_REVIEW_PACKET_20260722.md` | Review packet | Pending final hash | Approved |

## Verification required before Draft PR

- `npm ci`
- `npm run check:pivot`
- `npm run test:creator`
- `npm run build:creator`
- `git diff --check`
- Secret scan and staged-content privacy review
- `npm audit --omit=dev` with advisory classification

## Non-claims

- Stable literary-quality improvement is not proven.
- Professional blind-review agreement is not proven.
- Automatic retrieval is not authorized.
- Production deployment and cloud migrations are not reviewed by this PR.
