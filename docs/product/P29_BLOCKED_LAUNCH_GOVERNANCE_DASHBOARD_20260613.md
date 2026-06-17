# P29 Blocked Launch Governance Dashboard

## Current Decision

```text
public paid production launch: blocked
preview / staging testing: allowed
```

P29 is an internal governance status source. It does not change the product frontend, does not approve an external frontend and does not promote production aliases.

Current preview pair:

```text
frontend: https://app-638zzda7k-james-projects-97742675.vercel.app
api:      https://pun-api-p25.vercel.app
```

Machine-readable ledger:

```text
artifacts/integration/p29-blocked-launch-evidence-ledger.json
```

## Governance Summary

| Area | Owner | Status | Current Evidence | Missing Input | Next Action |
| --- | --- | --- | --- | --- | --- |
| Product alias | Product owner | blocked | P26 audit, P28 owner board | exact frontend/API domains, alias approval, rollback owner | choose domains and produce alias approval artifact |
| Vercel env/CORS | Ops team | blocked | P25 CORS preview proof, app security headers | persistent env, custom domains, production preflight | configure env/domains and record CORS acceptance |
| Database/recovery | Backend team | blocked | P25 backup, restore dry-run, recovery drill preview artifacts | persistent database, migration apply/stamp, production-like recovery drill | provide database and run recovery acceptance |
| Payment | Payment owner | blocked | P21 hardening tests, return/callback code readiness | real provider account, webhook secret presence, price map, refund/dispute/cancel acceptance | complete provider acceptance and record artifact |
| Privacy/legal | Legal/privacy owner | blocked | P23 export/delete code readiness | privacy policy, retention, deletion and billing retention signoff | record legal/privacy signoff artifact |
| Security | Security owner | blocked | P26 security header config, P28 security card | auth/CORS/payment/account/secrets/ops review | record security signoff artifact |
| Rollback | Rollback commander | blocked | P25 rollback command shapes, recovery drill preview proof | previous accepted deployments, restore owner, rehearsal artifact | name commander and record rollback rehearsal |

## Evidence Ledger Contract

The ledger must:

1. keep `public_paid_production_launch` as `blocked`.
2. keep `preview_staging_testing` as `allowed`.
3. cite P25/P26/P27/P28 evidence paths instead of duplicating evidence.
4. record owner, status, blocked reason, missing inputs and next action per area.
5. record review cadence and update owner.
6. never contain real secrets or provider credentials.
7. keep `external_frontend_merge_approved` as `false`.

## Update Protocol

Daily during active launch work:

1. owner updates their ledger entry with new evidence path.
2. operator runs `npm --prefix app run check:governance`.
3. operator reruns `npm --prefix app run check:production-gate`.
4. if an entry moves from `blocked` to `accepted`, the acceptance artifact must exist and be referenced.
5. public paid production remains blocked until all entries are accepted and product owner explicitly approves alias promotion.

Weekly if launch is waiting on external resources:

1. product owner reviews all missing inputs.
2. owners update delivery dates.
3. operator refreshes P26 resource audit when Vercel domains, env, database or provider settings change.
4. P29 stays the eight-hour acceptance source of truth.

## Provisioning Entry Criteria

P30 may become production provisioning only when:

- product alias entry is accepted.
- ops env/CORS entry is accepted.
- database/recovery entry is accepted.
- payment entry is accepted.
- privacy/legal entry is accepted.
- security entry is accepted.
- rollback entry is accepted.
- no external frontend has been approved for merge.

Otherwise P30 should be blocked launch governance maintenance or owner escalation.

## Do Not Do

- Do not promote production aliases from the autonomous loop.
- Do not store real secrets in the ledger or docs.
- Do not merge `apps/web` or any external frontend into the current product line.
- Do not call preview / staging proof a public paid production launch.
- Do not mark an area accepted without an acceptance artifact.

## P30 Recommendation

P30 should be one of two paths:

1. Production provisioning execution, if P29 ledger entries are accepted with artifacts.
2. Owner escalation and governance maintenance, if blockers remain after the next review window.
