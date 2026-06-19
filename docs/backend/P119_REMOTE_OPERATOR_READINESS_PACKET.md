# P119 Remote Operator Readiness Packet

Status: active gate  
Boundary: remote deployment handoff, no service creation, no secret handling  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P118 creates an ordered strict-run package. P119 turns that package plus the
remote blocker ledger, fill plan, image evidence and activation gates into one
operator-safe readiness packet.

This packet is not a deployment tool. It does not create remote services, does
not write `deploy/runtime-production/remote-assignment.local.json`, does not set
GitHub variables, does not store provider credentials, does not promote live
runtime, and does not treat fixture evidence as production readiness.

In short: P119 does not create remote services and does not write `deploy/runtime-production/remote-assignment.local.json`.

## Commands

```bash
npm run check:remote-operator-readiness-packet
npm run check:remote-operator-readiness-packet-artifact
```

CI current-run content check:

```bash
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_REMOTE_OPERATOR_READINESS_PACKET_ARTIFACT_REQUIRED=true \
npm run check:remote-operator-readiness-packet-artifact
```

## Inputs

P119 reads the latest current-head evidence from:

- P118 remote assignment strict-run package and attestation
- P85 remote runtime blocker ledger
- P90 blocker artifact attestation
- P105/P106 remote assignment fill plan and artifact attestation
- P87 remote assignment handoff
- P72 runtime image publish evidence
- P23 live runtime readiness ledger
- P78 remote activation control

## Output

P119 emits:

- `artifacts/runtime/remote-operator-readiness-packet-*.json`
- `artifacts/runtime/remote-operator-readiness-packet-*.md`
- `artifacts/runtime/remote-operator-readiness-packet-attestation-*.json`

The JSON and Markdown are safe to share with a deployment operator. They include
current runtime image refs, preserved blockers, safe evidence pointers and the
ordered operator task chain. They must not include secrets, candidate prose,
provider prompt plumbing, raw runtime state, private research titles, profile
ids or kernel ids.

## Required External Inputs

The packet keeps these as operator-owned, out-of-repo inputs:

- `REMOTE_OPERATOR_OWNER`
- `REMOTE_OPERATOR_PROVIDER`
- `REMOTE_API_SERVICE_ID`
- `REMOTE_AGENT_SERVICE_ID`
- `REMOTE_API_ORIGIN`
- `REMOTE_AGENT_ORIGIN`
- `REMOTE_API_SECRETS_CONFIGURED`
- `REMOTE_AGENT_SECRETS_CONFIGURED`
- remote API `/health`
- remote Agent `/health`
- release owner live cutover attestation

## Acceptance

1. `package.json` exposes both P119 scripts.
2. Root `npm run test` runs P119 after P118 strict-run artifact attestation and
   before local runtime image smoke evidence.
3. Pages workflow uploads `remote-operator-readiness-packet`.
4. Pages workflow downloads and checks the same current-run P119 artifact.
5. P43 metadata gate requires `remote-operator-readiness-packet` in current-run
   mode.
6. P107 counts `remote-operator-readiness-packet` as a downloaded content gate.
7. P20/P45/P52 development docs include P119 in the remote activation chain.
8. P119 preserves remote blockers instead of calling the runtime ready.
9. P119 artifact flags prove no writes, service creation, GitHub variable
   mutation, credential storage, live promotion or fixture promotion.

## Failure Modes

- Missing P118 strict-run evidence means P119 fails; the operator packet cannot
  exist without the ordered execution package.
- Missing current-head P72 image evidence means P119 fails; the packet cannot
  point operators at stale images.
- Empty remote blocker ledger means P119 must be rechecked against strict live
  cutover gates; packet readiness is not the same thing as public live readiness.
- Any private field leakage fails artifact validation.
