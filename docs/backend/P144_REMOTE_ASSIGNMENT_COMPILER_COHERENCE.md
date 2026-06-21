# P144 Remote Assignment Compiler Coherence

Status: active release gate  
Boundary: edge-only assignment compiler, no remote Agent fabrication  
Owner: release engineering  
Date: 2026-06-20

## Purpose

P144 closes the practical gap in the Remote Assignment Compiler v3.1 chain.
P138 added the topology-aware compiler and P142 selected the current operator
blocker: managed Data API health evidence. P144 verifies that the compiler
outputs still point to that same blocker and do not drift back to the old
full-remote Agent Runtime checklist.

The gate uses a temporary safe fixture intent, runs the compiler output chain,
checks the generated contract, legacy env, operator evidence, ledger patch and
health request, then restores ignored local state.

## Command

```bash
npm run check:remote-assignment-compiler-coherence
```

Root `npm run test` runs this immediately after:

```bash
npm run check:runtime-assignment-compiler
```

## Verified Outputs

The gate verifies that `remote-assignment:prepare` semantics still produce:

```text
deploy/runtime-production/generated/remote-assignment.contract.json
deploy/runtime-production/generated/remote-assignment.legacy.env
deploy/runtime-production/generated/operator-assignment-evidence.md
deploy/runtime-production/generated/loop-next-goal-ledger.patch.json
deploy/runtime-production/generated/remote-health-evidence.request.json
deploy/runtime-production/remote-assignment.env.local
```

The generated outputs are read and validated before the script restores the
operator's ignored local files.

## Edge-Only Coherence Rules

The generated contract and env must preserve:

```text
REMOTE_RUNTIME_MODE=edge-only
REMOTE_AGENT_REMOTE_REQUIRED=false
REMOTE_AI_GENERATION_CLOUD_RUNTIME=false
REMOTE_READER_CAN_TRIGGER_AI=false
REMOTE_AGENT_SERVICE_ID=
REMOTE_AGENT_ORIGIN=
REMOTE_AGENT_SECRETS_CONFIGURED=false
```

The generated health request must point to the managed Data API probe:

```text
health_probe / reader
```

The generated operator evidence and ledger patch must advance to:

```text
remote-health-evidence-intake
```

## Forbidden Drift

P144 fails if compiler outputs reintroduce any of the old full-remote
requirements in the current edge-only path:

```text
REMOTE_AGENT_REMOTE_REQUIRED=true
REMOTE_AI_GENERATION_CLOUD_RUNTIME=true
REMOTE_READER_CAN_TRIGGER_AI=true
remote_agent_health_required: true
```

It also scans generated output and the P144 artifact for service-role keys,
writer passwords, provider keys, database URLs, provider prompt plumbing,
private reference-work terms and internal kernel/profile/source references.

## Acceptance

- `package.json` exposes `check:remote-assignment-compiler-coherence`.
- Root `npm run test` runs P144 immediately after P138.
- P144 writes `artifacts/runtime/remote-assignment-compiler-coherence-*.json`.
- The artifact states that the next step is `remote-health-evidence-intake`.
- The artifact proves remote Agent absence is intentional for `edge-only`.
- Ignored local files are restored after the fixture compiler run.
