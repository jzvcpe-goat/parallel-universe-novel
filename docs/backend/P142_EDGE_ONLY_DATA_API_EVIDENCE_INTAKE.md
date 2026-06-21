# P142 Edge-Only Data API Evidence Intake

Status: active next goal  
Boundary: edge-only runtime assignment evidence, no cloud AI generation  
Owner: release engineering + operator  
Date: 2026-06-20

## Purpose

P142 is the next concrete loop goal after P141. P141 fixed the old
full-remote assignment predicates so the current path reads the edge-only
runtime intent first. P142 now fills the only remaining production evidence:
the managed data API / Supabase surface used by the zero-cost Reader cloud
path.

This goal does not create a remote Agent Runtime. In the current topology,
Reader Web is hosted on GitHub Pages, public data is read from the managed data
API, and AI generation remains on the user-owned edge device. The cloud must
not receive provider keys, system prompts, raw runtime state, or reader-triggered
AI generation requests.

## Required Inputs

The operator must provide only non-secret or locally held evidence:

1. managed data API service id or Supabase project ref;
2. managed data API HTTPS origin;
3. confirmation that publishable key and RLS/public-read policies are configured;
4. local-only publishable/anon key for `remote-health:check`;
5. `health_probe` row or endpoint that returns an explicit healthy status.

Secrets stay outside Git. The local env file used for health checking must not
be committed, uploaded as CI artifact, or copied into docs.

## Command Sequence

```bash
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-assignment-compiler-coherence
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
npm run check:remote-health-evidence-artifact
npm run check:edge-only-data-api-evidence-readiness
npm run check:edge-only-data-api-strict-intake
npm run check:edge-only-data-api-evidence-transition-fixture
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

Operator strict mode may additionally run:

```bash
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true npm run check:edge-only-data-api-evidence-readiness
REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true npm run check:edge-only-data-api-strict-intake
```

After the first pass, the tail evidence chain must be run in order, not in
parallel:

```bash
npm run check:operator-return-fixture-isolation
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-evidence-intake-artifact
npm run check:operator-assignment-loop-command-consistency
npm run check:operator-assignment-loop-command-consistency-artifact
npm run check:operator-assignment-current-head-coherence
npm run check:edge-only-current-blocker-projection
```

P123 depends on the latest P122 artifact. Running these gates in parallel can
make P123 read stale fixture-isolation evidence and fail even when the selected
goal is correct.

## Acceptance Criteria

P142 is complete only when all of the following are true:

1. `runtime-assignment.intent.local.json` contains the data API service id,
   HTTPS origin and `secrets_configured=true` evidence.
2. `remote-assignment:prepare` compiles an edge-only assignment contract without
   reintroducing remote Agent Runtime requirements.
3. `check:remote-assignment-compiler-coherence` proves the generated operator
   evidence, ledger patch and health request all advance to
   `remote-health-evidence-intake`.
4. `check:remote-runtime-assignment-intake` no longer reports
   `data-api-service-id`, `data-api-origin`, `data-api-secrets-ready` or
   `data-api-health-ready`.
5. `remote-health:check` verifies the real data API health probe.
6. `check:remote-health-evidence-artifact` writes a privacy-safe P145
   attestation: in CI it may honestly remain
   `waiting_for_remote_health_evidence`, while a local/operator environment
   with the publishable key must produce `healthReady=true` before P142 can be
   marked complete.
7. `check:edge-only-data-api-evidence-readiness` writes a redacted P150
   preflight artifact. In default mode it may honestly remain waiting; in
   strict mode with `REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true` it must
   prove the local Data API evidence and real health evidence are present.
8. `check:edge-only-data-api-strict-intake` writes a redacted P151 strict
   intake artifact. In default mode it may honestly remain waiting; in strict
   mode with `REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true` it must prove
   local env, compiler output, publishable-key presence, health evidence, P145,
   P150, P75 and P121 have all advanced.
9. `check:remote-operator-return-intake` advances from
   `operator_return_waiting_for_assignment` toward health or activation proof.
10. `check:loop-next-goal-ledger` stops selecting
   `operator-assignment-evidence-intake`.
11. P122/P123/P124/P130/P131/P132 all pass on the same current head.
12. Public projection privacy, reference privacy and kernel/constraint reference
   encryption gates remain green.
13. `check:edge-only-current-blocker-projection` proves P76/P85 did not
   reintroduce remote Agent service, origin, secret-store or health requirements
   into the current edge-only blocker ledger.
14. `check:edge-only-data-api-evidence-transition-fixture` passes as a
    fixture-only proof that returned Data API evidence can make P75 ready, while
    still restoring the repo to a waiting state until real `remote-health:check`
    evidence exists.

## Non-Goals

- Do not add a cloud AI generation endpoint.
- Do not add provider keys to GitHub Pages, Supabase, GitHub Actions artifacts
  or committed env files.
- Do not require remote Agent Runtime service id, origin, secret-store
  confirmation or health proof for the edge-only path.
- Do not use fixture assignment evidence to satisfy production readiness.
- Do not use P148 fixture health evidence to mark P142 complete.
- Do not paste representative work names into kernel, constraint, docs,
  artifacts, UI or public runtime output.

## Current Evidence

Latest verified head at creation time:

- `e3e75750ecdd4f7d2d7d61da2daf33abb61545e1`
- P75 selected `deploy/runtime-production/runtime-assignment.intent.local.json`
  and reported only four data API blockers.
- P121 selected `operator-assignment-evidence-intake`.
- P122/P123/P124/P130/P131/P132 passed after sequential execution.
- `check:kernel-constraint-reference-encryption`,
  `check:reference-work-encryption-completion` and `scan:reference-privacy`
  passed with decrypted-vault scanning enabled.
