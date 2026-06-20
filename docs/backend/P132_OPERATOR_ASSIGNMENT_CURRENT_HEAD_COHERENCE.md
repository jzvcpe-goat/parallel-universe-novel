# P132 Operator Assignment Current-Head Coherence

Status: active gate  
Boundary: release-evidence coherence, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P132 closes the loop gap where a new release head can publish current runtime
images while the operator-assignment loop still reads older P119/P120/P121
evidence. It verifies that the selected goal
`operator-assignment-evidence-intake` is backed by the same current head across
runtime image evidence, local assignment image-drift state, operator handoff,
operator return, loop ledger, operator assignment intake, command consistency
and command-consistency artifact attestation.

P132 does not write `deploy/runtime-production/remote-assignment.local.json`,
does not create remote services, does not set GitHub variables, does not store
provider secrets, does not promote live runtime and does not change the
selected next goal.

## Command

```bash
npm run check:operator-assignment-current-head-coherence
```

Current-run GitHub Actions mode:

```bash
CHECK_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:operator-assignment-current-head-coherence
```

## Artifact

Pages uploads:

```text
operator-assignment-current-head-coherence
```

with:

```text
artifacts/runtime/operator-assignment-current-head-coherence-*.json
```

## Checks

P132 verifies that:

1. P72 runtime image evidence uses the current head.
2. P113 image-drift evidence is current-head coherent in one of two legal
   states: local assignment images match the current head, or the local
   operator assignment file is absent and the loop is still waiting for
   operator assignment evidence.
3. P119 remote operator readiness packet uses the current head.
4. P120 remote operator return intake uses the current head.
5. P121 loop next-goal ledger selects `operator-assignment-evidence-intake`
   from current P119, P120 and P113 evidence.
6. P123 operator assignment intake uses the same P121, P120 and P113 evidence.
7. P130 command consistency points at the same current P119 readiness packet
   and P121 loop ledger.
8. P131 command-consistency artifact attestation points at the same current P130
   artifact.
9. Boundary flags remain no-write/no-deploy: no local assignment write, remote
   service creation, GitHub variable mutation, provider-secret storage or live
   runtime promotion.
10. The artifact contains no provider prompt plumbing, profile/kernel ids,
    `sourceRefs`, secrets, private title material, concrete service ids or
    concrete origins.

## Release Chain

- Root `npm run test` runs P132 after P131 and before dependency audit.
- Pages uploads `operator-assignment-current-head-coherence` after root runtime
  checks.
- Pages validates the uploaded current-run P132 artifact after P131 command
  consistency content validation and before P115 runtime-image local-smoke
  content validation.
- P107 counts `operator-assignment-current-head-coherence` as a
  `download_content_gate`.

## Acceptance

1. `package.json` exposes
   `check:operator-assignment-current-head-coherence`.
2. Root `npm run test` runs P132 after P131 before dependency audit.
3. P121 refuses to create a fresh ledger from stale P119/P120/P113 artifacts.
4. P123 refuses to package operator assignment intake unless P121 points at the
   current P120 and P113 evidence.
5. P130 refuses to create command-consistency evidence unless it points at the
   current P119 and P121 artifacts.
6. Pages uploads and validates the current-run P132 artifact.
