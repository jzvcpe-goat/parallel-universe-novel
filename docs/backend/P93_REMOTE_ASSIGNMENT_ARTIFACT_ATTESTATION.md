# P93 Remote Assignment Artifact Attestation

Date: 2026-06-18

## Goal

P43 proves that GitHub Actions uploaded the remote assignment evidence artifacts.
P93 verifies the contents of the three assignment artifacts that P43 only checks
by name and size:

- `remote-assignment-schema`
- `remote-assignment-execution-pack`
- `remote-assignment-fixture-gate`

This closes the metadata/content gap for remote assignment evidence without
pretending that live remote services have been provisioned.

## Command

Local latest-artifact check:

```bash
npm run check:remote-assignment-artifacts
```

Strict current GitHub Pages run check:

```bash
CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<pages-run-id> \
npm run check:remote-assignment-artifacts
```

## What This Proves

- `remote-assignment-schema` is a valid P91 artifact, targets the ignored
  `remote-assignment.local.json` path, includes example/fixture/local status,
  and does not include assignment contents. P112 local draft artifacts may be
  `remote_assignment_schema_incomplete`; P93 accepts that only when the local
  entry remains blocked and the artifact still omits assignment contents.
- `remote-assignment-execution-pack` is a valid P79 artifact; local missing
  assignment remains blocked honestly, while the committed fixture can produce a
  strict execution pack with health, GitHub variable, strict gate and rollback
  commands.
- P110 placeholder sentinel execution-pack artifacts may also be present in the
  same artifact bundle; they are accepted only when
  `remote-assignment-placeholder-sentinel.fixture.json` remains blocked with
  `assignment_execution_incomplete`.
- `remote-assignment-fixture-gate` is a valid P81 artifact; fixture origins stay
  reserved `.invalid` domains, P79 is ready, P75 remains pending health, and the
  fixture does not claim live runtime.
- JSON and Markdown artifacts do not expose secrets, representative work names,
  source refs, provider prompt plumbing, raw state or assignment contents.

## What This Does Not Prove

- It does not create or validate real remote provider services.
- It does not write `deploy/runtime-production/remote-assignment.local.json`.
- It does not set GitHub Pages live runtime variables.
- It does not replace P75/P73/P66/P23/P76 strict live runtime gates.

## CI Placement

Pages CI runs P93 after P43 metadata checks and P92 privacy content checks, and
before P89/P90 validate handoff and blocker artifacts:

```bash
CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-artifacts
```

## Acceptance

1. `package.json` exposes `check:remote-assignment-artifacts`.
2. Root `npm run test` includes `check:remote-assignment-artifacts` after
   `check:remote-assignment-fixture`.
3. Pages workflow runs `check:remote-assignment-artifacts` in current-run mode.
4. P16/P20/P43/P45/P83/P84 handoff docs mention P93 so assignment artifact
   metadata and content responsibilities stay aligned.
5. P110 placeholder sentinel artifacts are accepted only as blocked safety
   evidence, never as live assignment evidence.
6. The attestation writes
   `artifacts/runtime/remote-assignment-artifact-attestation-*.json`.
