# P85 Remote Runtime Blocker Normalization

## Purpose

P85 turns the remote runtime launch blockers into one normalized ledger. Earlier
gates are intentionally precise but scattered: P23 owns live readiness, P65 owns
remote trace, P66/P73 own origin provisioning and execution, P72 owns image
evidence, P75/P79 own service assignment, P76 owns cutover attestation, P77 owns
rollback, and P78 owns the activation board.

P85 does not provision infrastructure, set GitHub variables, store secrets or
enable live runtime. It only answers: which stage is blocked, who owns it, which
gate proves it, what input is missing, and which strict command must pass next.

P87 now sits between P72 and P75. It packages the current image refs into a
no-secret `remote-assignment.local.json` handoff template, but P85 still treats
assignment as blocked until real service evidence passes P75/P79.

P89 sits after P43/P87. It validates the uploaded handoff artifact content but
does not change blocker ownership: assignment still remains blocked until
operator-provided service evidence passes P75/P79.

P90 sits after P85/P89. It validates the uploaded blocker artifact content and
prevents stale ledgers, missing P89 evidence or contradictory already-cleared
stages from reaching the release owner.

P94 hardens local artifact mode coherence. P85 prefers current-head P72 image
evidence, treats stale image evidence as a blocked `runtime-images-published`
stage, and pairs P89 handoff evidence with the selected P72 image evidence head
before writing the blocker ledger.

P143 hardens the current edge-only projection. When P75 selects
`deploy/runtime-production/runtime-assignment.intent.local.json` or
`deploy/runtime-production/runtime-assignment.intent.example.json` or
`deploy/runtime-production/generated/remote-assignment.contract.json` with
`runtimeMode=edge-only`, P85 must select that assignment evidence before legacy
local draft or fixture artifacts. The current ledger may still point at P73,
P66, P23 and P65, but their blocker ids and required inputs must be projected as
Data API / public runtime evidence instead of remote Agent service evidence.

## Command

```bash
npm run check:remote-runtime-blockers
```

Strict mode:

```bash
REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers
```

## Generated Artifacts

```text
artifacts/runtime/remote-runtime-blockers-*.json
artifacts/runtime/remote-runtime-blockers-*.md
```

The JSON artifact is for CI and audits. The Markdown artifact is for the
deployment owner.

P85 reads `deploy/runtime-production/remote-assignment.local.json` evidence for
real launch blockers. It treats `deploy/runtime-production/remote-assignment.fixture.json`
only as the P81 fixture contract: a ready fixture execution pack proves command
generation, but it must never mark the real remote service assignment ready.

For the current edge-only launch path, P85 reads the P75 runtime intent,
committed public edge-only example, or generated edge-only contract first. The
committed example is a clean-checkout projection baseline, not operator
evidence. The legacy local assignment remains a fallback for full-remote
compatibility only.

## Normalized Stages

| Stage | Owner | Gate |
| --- | --- | --- |
| Runtime images published | release engineering | P72 |
| Remote service assignment exists | deployment operator | P75/P79 |
| Remote assignment health ready | backend runtime owner | P75 |
| Remote origin execution ready | platform operator | P73 |
| Remote origin provisioned | platform operator | P66 |
| Public live readiness | release operator | P23 |
| Remote live runtime trace | runtime owner | P65 |
| Live cutover attested | release owner | P76 |
| Rollback rehearsal ready | release owner | P77 |
| Privacy release evidence | privacy/release reviewer | P80/P83 |
| Assignment fixture contract | release engineering | P81 |
| Activation control board | release owner | P78 |
| Handoff artifact content | release engineering | P89 |

## Decisions

- `remote_runtime_waiting_for_operator_inputs`: one or more stages are still
  blocked; this is the safe default while remote services are not assigned.
- `remote_runtime_ready_for_strict_cutover`: all normalized stages are ready;
  strict mode may be used before public live runtime.

## Artifact Attestation

P85 writes `repository`, `headSha`, P72 image source evidence and P89 handoff
source evidence into the JSON artifact. P94 adds the selected artifact
filenames and head-match booleans so a local ledger cannot silently mix stale
image evidence with current handoff evidence. P90 verifies those fields in local
or GitHub-current-run mode:

```bash
npm run check:remote-runtime-blockers-artifact
```

## Public Boundary

P85 artifacts may include:

- blocker ids,
- owner labels,
- gate names,
- artifact filenames,
- non-secret next actions,
- strict command names.

P85 artifacts must not include:

- database URLs,
- Tool Bridge token values,
- model keys,
- provider API tokens,
- private keys,
- system prompts,
- raw runtime state,
- reference-work vault contents,
- representative work names,
- `sourceRefs`,
- `profile.id` or `kernel.id`.

## Acceptance

- `package.json` exposes `check:remote-runtime-blockers`.
- Root `npm run test` includes `check:remote-runtime-blockers`.
- Pages workflow uploads `remote-runtime-blockers` after root runtime checks.
- Current-run artifact gate requires `remote-runtime-blockers`.
- `check:runtime-engine-completion` includes P85 and
  `remote-runtime-blockers` in the commercial release evidence chain.
- `check:remote-assignment-handoff-artifact` remains a content attestation
  gate, not a blocker override.
- `check:remote-runtime-blockers-artifact` validates the P85 artifact content
  after P89 without requiring remote assignment to be complete.
- `check:edge-only-current-blocker-projection` validates that P85's current
  edge-only ledger does not reintroduce remote Agent blocker ids or
  `REMOTE_AGENT_*` requirements.
- P85 blocks stale P72 image evidence with
  `runtime-image-evidence-current-head` instead of treating it as ready.
- P85 pairs P89 handoff content with the selected P72 image evidence head before
  evaluating `handoff-artifact-content`.
- Fixture assignment artifacts remain separated from real local assignment
  artifacts.
- Non-strict mode reports blockers without failing normal static preview CI.
- Strict mode fails until all normalized stages are ready.
