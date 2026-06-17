# P31 Acceptance Artifact Template Pack

## Current Decision

```text
public paid production launch: blocked
preview / staging testing: allowed
```

P31 gives each owner a fillable acceptance artifact template. These templates are not approvals. They are starting points that owners copy, fill, verify and save as the official artifact paths referenced by P28-P30.

Template directory:

```text
artifacts/integration/p31-acceptance-templates/
```

Source matrix:

```text
artifacts/integration/p30-owner-escalation-matrix.json
```

## Templates

| Owner | Template | Final Artifact |
| --- | --- | --- |
| Product owner | `product-alias-approval.template.json` | `artifacts/integration/p28-product-owner-alias-approval.json` |
| Ops team | `vercel-domain-env-cors-acceptance.template.json` | `artifacts/integration/p28-vercel-domain-env-cors-acceptance.json` |
| Backend team | `production-database-recovery-acceptance.template.json` | `artifacts/integration/p28-production-database-recovery-acceptance.json` |
| Payment owner | `payment-provider-acceptance.template.json` | `artifacts/integration/p28-payment-provider-acceptance.json` |
| Legal/privacy owner | `privacy-legal-signoff.template.json` | `artifacts/integration/p28-privacy-legal-signoff.json` |
| Security owner | `security-signoff.template.json` | `artifacts/integration/p28-security-signoff.json` |
| Rollback commander | `rollback-rehearsal-acceptance.template.json` | `artifacts/integration/p28-rollback-rehearsal-acceptance.json` |

## Fill Rules

1. Keep `status` as `pending` until all verification commands pass.
2. Do not paste real secrets, provider keys, webhook secrets or database URLs into the artifact.
3. Record secret presence as boolean fields and record the approved secret-manager location by name only.
4. Record command output as an artifact path, not a copied terminal dump if it contains sensitive values.
5. Save the completed artifact at the final path from the table above.
6. After saving, run the owner-specific command and then:

```bash
npm --prefix app run check:templates
npm --prefix app run check:escalation
npm --prefix app run check:governance
npm --prefix app run check:production-gate
```

## Acceptance Rule

A P29 ledger entry can move from `blocked` to `accepted` only after:

1. the final artifact exists.
2. the owner is named.
3. verification output path exists.
4. approval timestamp is present.
5. no real secret appears in the artifact.
6. product owner has not yet run alias promotion unless all other entries are accepted.

Until all entries are accepted, the decision remains:

```text
public paid production launch: blocked
```

## P32 Recommendation

P32 should be:

1. artifact intake validator, if owners start submitting completed acceptance artifacts.
2. owner escalation review, if templates remain unfilled at the next review.
