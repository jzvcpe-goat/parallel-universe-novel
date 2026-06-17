# P28 Launch Review Meeting Brief

## Purpose

This brief converts the P27 blocked launch handoff into a meeting that can produce a real go / no-go decision. The meeting is for production resources and approvals only. It is not a UI review and not a merge review for another frontend.

## Current Decision

```text
public paid production launch: blocked
preview / staging testing: allowed
```

Preview pair:

```text
frontend: https://app-638zzda7k-james-projects-97742675.vercel.app
api:      https://pun-api-p25.vercel.app
```

## Required Attendees

- Product owner
- Backend owner
- Ops / deployment owner
- Payment owner
- Legal / privacy owner
- Security owner
- Rollback commander

## Pre-Read

Read these before the meeting:

```text
docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md
docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md
docs/product/P27_OPERATOR_RUNBOOK_20260613.md
docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md
artifacts/integration/p26-production-resource-audit.json
artifacts/integration/p27-blocked-launch-package-manifest.json
artifacts/integration/p28-production-resource-intake.schema.json
```

## Agenda

1. Confirm the launch decision still starts as blocked.
2. Confirm the current Vite + React + TypeScript app remains the only product frontend.
3. Confirm P25 preview / staging pair and P27 package are review artifacts only.
4. Assign product owner for exact frontend and API production domains.
5. Assign ops owner for Vercel env, domains, CORS and security headers.
6. Assign backend owner for persistent database, migration, backup, restore dry-run and recovery drill.
7. Assign payment owner for provider credentials, return, callback, refund, dispute and cancellation acceptance.
8. Assign legal / privacy owner for policy and data-rights signoff.
9. Assign security owner for launch security signoff.
10. Assign rollback commander and previous accepted deployments.
11. Decide whether P29 is provisioning execution or blocked launch governance dashboard.

## Go Criteria

The meeting can approve P29 production provisioning only if every owner has:

- named accountable owner.
- supplied input or committed delivery date.
- acceptance artifact path.
- validation command.
- rollback or fallback path.

The meeting cannot approve public paid production alias promotion unless the required artifacts already exist and the product owner explicitly approves the exact alias commands.

## No-Go Criteria

Keep launch blocked if any of these remain true:

- no exact production frontend domain.
- no exact production API domain.
- no persistent production database.
- no migration apply or stamp plan.
- no runtime backup and restore dry-run.
- no real payment provider acceptance.
- no privacy/legal signoff.
- no security signoff.
- no rollback commander.
- any external frontend is proposed for direct merge without subagent approval.
- any command would expose or commit real secrets.

## Commands That Must Not Run Automatically

Do not run these from the autonomous loop:

```bash
npx --yes vercel alias set <accepted-frontend-deployment>.vercel.app "$FRONTEND_PRODUCTION_DOMAIN"
npx --yes vercel alias set <accepted-api-deployment>.vercel.app "$API_PRODUCTION_DOMAIN"
.venv/bin/python -m src.narrativeos.persistence.migrations --database-url "$DATABASE_URL"
curl -sS -X POST "$API_ORIGIN/v1/ops/jobs/runtime-restores"
```

These require explicit owner approval and a dated acceptance artifact.

## Meeting Output

The meeting should produce one of these written outcomes:

```text
P29: Production provisioning execution approved
P29: Blocked launch governance dashboard required
P29: Blocked, waiting on named owners and dates
```

## Decision Log Template

```text
decision:
  public_paid_production_launch: blocked
  preview_staging_testing: allowed
  p29_path: <production_provisioning | blocked_governance_dashboard | waiting_on_owners>
owners:
  product_owner:
  backend_owner:
  ops_owner:
  payment_owner:
  legal_privacy_owner:
  security_owner:
  rollback_commander:
acceptance_artifacts:
  product_alias:
  vercel_env_cors:
  database_recovery:
  payment_provider:
  privacy_legal:
  security:
next_review_at:
```
