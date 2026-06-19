# P124 Operator Assignment Evidence Intake Artifact Attestation

Status: active gate  
Boundary: downloaded artifact content attestation, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P123 produces the safe operator assignment evidence intake packet, but a packet
generated during `npm run test` is not enough for release handoff unless the
same Pages run uploads it and then validates the uploaded content. P124 closes
that gap.

P124 does not write `remote-assignment.local.json`, does not create remote
services, does not set GitHub variables, does not store provider secrets, does
not promote live runtime and does not change the selected next goal.

P125 follows P124 in the root test chain. It validates the local P117 operator
env dry-run path with safe synthetic inputs and unsafe negative inputs; it is
not a Pages artifact gate and does not replace real operator evidence.
P126 follows P125 and validates the local P116 apply path through a temporary
fixture target; it is also not a Pages artifact gate.

## Command

```bash
npm run check:operator-assignment-evidence-intake-artifact
```

Current-run GitHub Actions mode:

```bash
CHECK_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:operator-assignment-evidence-intake-artifact
```

## Artifact

Pages uploads:

```text
operator-assignment-evidence-intake
```

with:

```text
artifacts/runtime/operator-assignment-evidence-intake-*.json
artifacts/runtime/operator-assignment-evidence-intake-*.md
```

## Checks

P124 verifies that the uploaded P123 packet:

1. Uses `P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE`.
2. Matches the current run head SHA.
3. Keeps selected goal `operator-assignment-evidence-intake`.
4. Records `remote_assignment_missing` or `remote_assignment_incomplete`.
5. Lists exactly eight non-secret operator evidence inputs.
6. Cites P121, P122, P120, P117, P75, P113, P108 and P105.
7. Uses the ignored local assignment path, not the fixture path.
8. Keeps no-write boundaries false for local assignment writes, remote service
   creation, GitHub variable writes, provider-secret storage and live runtime
   promotion.
9. Contains no secrets, private research material, provider prompt plumbing,
   runtime profile/kernel ids, source refs or candidate prose.

## Release Chain

- Root `npm run test` runs P124 after P123, then P125, P126 and P128 before dependency audit.
- Pages uploads `operator-assignment-evidence-intake` after root runtime checks.
- Pages runs P124 content validation after P120 return-intake content validation
  and before P115 runtime-image local smoke content validation.
- P107 counts `operator-assignment-evidence-intake` as a
  `download_content_gate`.

## Acceptance

1. `package.json` exposes `check:operator-assignment-evidence-intake-artifact`.
2. Root `npm run test` runs P124 after P123, then P125 and P126 immediately after P124.
3. Pages uploads the P123 JSON and Markdown packet.
4. Pages validates the current-run uploaded packet with
   `CHECK_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ARTIFACT_REQUIRED=true`.
5. P16, P43 and P107 document the artifact and its content gate.
