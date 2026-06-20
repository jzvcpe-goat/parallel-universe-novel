# P131 Operator Assignment Command Consistency Artifact Attestation

Status: active gate  
Boundary: downloaded artifact content attestation, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P130 proves the operator assignment command sequence is consistent across the
loop ledger, handoff docs and generator scripts. P131 proves that the same
Pages run uploads the P130 artifact and validates its downloaded content.

This closes the release-evidence gap where `npm run test` could pass locally
while the command-consistency proof was not retained as a GitHub Actions
artifact.

P131 does not write `remote-assignment.local.json`, does not create remote
services, does not set GitHub variables, does not store provider secrets, does
not promote live runtime and does not change the selected next goal. P132 then
verifies that P131 attests the current P130 artifact and that P130 points at the
current-head P119/P121 evidence.

## Command

```bash
npm run check:operator-assignment-loop-command-consistency-artifact
```

Current-run GitHub Actions mode:

```bash
CHECK_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:operator-assignment-loop-command-consistency-artifact
```

## Artifact

Pages uploads:

```text
operator-assignment-loop-command-consistency
```

with:

```text
artifacts/runtime/operator-assignment-loop-command-consistency-*.json
```

The P131 checker writes local attestation evidence:

```text
artifacts/runtime/operator-assignment-loop-command-consistency-attestation-*.json
```

## Checks

P131 verifies that the uploaded P130 artifact:

1. Uses `P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY`.
2. Has status `passed`.
3. Keeps checked goal `operator-assignment-evidence-intake`.
4. Verifies exactly five operator handoff commands.
5. Records the two deprecated command fragments that must stay absent.
6. Points at P118 strict-run, P119 readiness-packet and P121 ledger runtime
   artifacts.
7. Keeps no-write/no-deploy boundaries false for local assignment writes,
   remote service creation, GitHub variable writes, provider-secret storage and
   live runtime promotion.
8. Contains no secrets, provider prompt plumbing, profile/kernel ids,
   `sourceRefs`, private reference material, concrete service ids or concrete
   origins.

## Release Chain

- Root `npm run test` runs P131 after P130 and before dependency audit.
- Root `npm run test` runs P132 after P131 and before dependency audit.
- Pages uploads `operator-assignment-loop-command-consistency` after root
  runtime checks.
- Pages runs P131 content validation after P124 assignment-intake content
  validation and before P115 runtime-image local-smoke content validation.
- Pages runs P132 content validation after P131 and before P115 runtime-image
  local-smoke content validation.
- P107 counts `operator-assignment-loop-command-consistency` as a
  `download_content_gate`.

## Acceptance

1. `package.json` exposes
   `check:operator-assignment-loop-command-consistency-artifact`.
2. Root `npm run test` runs P131 after P130 and P132 after P131 before dependency audit.
3. Pages uploads the P130 JSON artifact.
4. Pages validates the current-run uploaded P130 artifact with
   `CHECK_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY_ARTIFACT_REQUIRED=true`.
5. P16, P43 and P107 document the artifact and its content gate.
