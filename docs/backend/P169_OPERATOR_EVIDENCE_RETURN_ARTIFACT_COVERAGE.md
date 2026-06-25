# P169 Operator Evidence Return Artifact Coverage

Status: active release gate coverage  
Boundary: P168 artifact visibility only, no new runtime capability  
Owner: release engineering  
Date: 2026-06-25

## Purpose

P168 made the operator evidence return fast path a root-test contract, but the
release owner also needs to see that contract in the same Pages run that
publishes the current build. P169 adds current-run artifact coverage for the
P168 contract without changing runtime behavior or requiring external Data API
values.

This is deliberately a coverage gate, not a deployment shortcut. It does not
create remote services, set GitHub variables, upload local secrets, write canon,
promote live runtime or mark `operator-assignment-evidence-intake` complete.

## Coverage Contract

Pages workflow uploads:

```text
operator-evidence-return-fast-path
artifacts/runtime/operator-evidence-return-fast-path-contract-*.json
```

P43 requires the artifact by name in current-run mode. P107 classifies it as a
`download_content_gate` once P174 is present: P168 generates and validates the
contract before upload, and P174 downloads the uploaded JSON from the same Pages
run to prove that the release artifact still carries the expected sequence and
boundary flags.

## Commands

```bash
npm run check:operator-evidence-return-fast-path
npm run check:operator-evidence-return-fast-path-artifact
npm run check:ci-artifact-content-coverage
npm run check:github-actions-artifacts
```

CI additionally runs:

```bash
CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:github-actions-artifacts
```

## Public Boundary

The uploaded contract may contain only command names, statuses, blocker stages,
gate labels and the current head sha. It must not contain Data API origins,
service ids, keys, provider payloads, system prompts, private reference
material, profile ids, kernel ids, source references or generated story text.

## Acceptance

1. `.github/workflows/pages.yml` uploads `operator-evidence-return-fast-path`.
2. `scripts/check-github-actions-artifacts.mjs` requires it in current-run mode.
3. `scripts/check-ci-artifact-content-coverage.mjs` classifies it as a
   download content gate once P174 is active.
4. P16, P43 and P107 document the artifact and its verification ownership.
5. Root `npm run test` runs P168 before P174, then continues to operations
   continuity.
6. The selected loop goal remains `operator-assignment-evidence-intake` until
   real external Data API evidence is returned and accepted by the existing
   strict gates.
