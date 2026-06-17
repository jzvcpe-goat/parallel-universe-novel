# P32 Acceptance Artifact Intake Validator

## Current Decision

```text
public paid production launch: blocked
preview / staging testing: allowed
```

P32 validates completed owner acceptance artifacts after P31 templates are filled. Missing artifacts are not a script failure; they are a governance state. If an artifact is missing, the validator must pass only when the related release area remains blocked.

Status file:

```text
artifacts/integration/p32-acceptance-artifact-intake-status.json
```

## Intake Rule

For each expected artifact:

1. if the artifact is missing, `submission_status` must be `missing` and `ledger_impact` must be `blocked`.
2. if the artifact exists, it must include owner, approval timestamp, verification output path and no real secrets.
3. if the artifact exists but verification output path is missing, the artifact is rejected.
4. if the artifact contains a real secret-like value, the artifact is rejected.
5. if the artifact approves an external frontend merge, the artifact is rejected.
6. no artifact may approve public paid production launch by itself.

## Expected Artifacts

```text
artifacts/integration/p28-product-owner-alias-approval.json
artifacts/integration/p28-vercel-domain-env-cors-acceptance.json
artifacts/integration/p28-production-database-recovery-acceptance.json
artifacts/integration/p28-payment-provider-acceptance.json
artifacts/integration/p28-privacy-legal-signoff.json
artifacts/integration/p28-security-signoff.json
artifacts/integration/p28-rollback-rehearsal-acceptance.json
```

## Validation Command

```bash
npm --prefix app run check:intake
```

Recommended chain after an owner submits an artifact:

```bash
npm --prefix app run check:intake
npm --prefix app run check:templates
npm --prefix app run check:escalation
npm --prefix app run check:governance
npm --prefix app run check:production-gate
```

## Accepted Transition

A P29 ledger entry may move from `blocked` to `accepted` only when:

- its official artifact exists.
- `check:intake` accepts it.
- its verification output path exists or has an explicit operator exception.
- the owner has a name and approval timestamp.
- no secret-like values are present.
- all product-owner alias commands remain unexecuted until final go/no-go.

## P33 Recommendation

P33 should be:

1. completed artifact acceptance runner, if one or more official artifacts are submitted.
2. external owner follow-up log, if all official artifacts remain missing.
