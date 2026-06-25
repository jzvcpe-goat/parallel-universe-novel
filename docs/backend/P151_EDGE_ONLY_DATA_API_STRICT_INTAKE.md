# P151 Edge-Only Data API Strict Intake

Status: active strict intake gate  
Boundary: local operator evidence to real Data API health, no cloud AI runtime  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P150 tells us whether the local Data API evidence is filled enough to attempt
the P142 completion chain, after P156 has checked local health-input hygiene.
P151 turns that into one strict intake checkpoint: it verifies the ignored
local intent env, generated runtime assignment,
publishable-key availability, real `health_probe` result, P145 health
attestation, P150 readiness, P75 assignment intake and P121 next-goal movement.

P151 does not replace P142. It is the strict operator handoff gate that proves
the chain has actually crossed from "waiting for Data API evidence" into
"health evidence is ready enough for the next loop".

## Commands

Root-test safe mode:

```bash
npm run check:edge-only-data-api-strict-intake
```

Operator chain mode, after filling the ignored local env and local publishable
key:

```bash
npm run prepare:edge-only-data-api-strict-intake
```

The sealed command expands to:

```bash
RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK=true REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true npm run check:edge-only-data-api-strict-intake
```

The strict command internally reuses the existing chain:

```bash
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run check:edge-only-data-api-local-secret-guard
npm run remote-assignment:prepare
npm run check:remote-assignment-compiler-coherence
npm run remote-health:check
npm run check:remote-health-evidence-artifact
npm run check:edge-only-data-api-evidence-readiness
npm run check:remote-runtime-assignment-intake
npm run check:loop-next-goal-ledger
```

If any subcommand in that chain cannot proceed because the local Data API
evidence is still incomplete or malformed, P151 must still write a redacted
artifact first. In `REQUIRE_*` mode it exits non-zero after writing the
artifact, using `missingStages` and `chainFailures` to describe the blocker
without printing provider output, Supabase URLs, project refs or stack traces.

## Inputs

P151 reads only local or generated evidence shape:

- ignored `deploy/runtime-production/runtime-assignment.intent.env.local`;
- ignored `deploy/runtime-production/runtime-assignment.intent.local.json`;
- ignored generated `remote-assignment.contract.json`;
- ignored generated `remote-health-evidence.result.json`;
- latest P145, P150, P75 and P121 artifacts;
- publishable/anon key presence from process env, `.env.local` or
  `.env.local.sync`; accepted names are `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` and
  `SUPABASE_ANON_KEY`.

The operator-facing evidence card is:

```text
deploy/runtime-production/edge-only-data-api.evidence-card.example.md
```

P163 verifies that this card and P151 agree on the accepted Data API evidence:
`RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF`,
`RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL`,
`RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true`, local publishable/anon key
presence and `health_probe` with `id=reader` and `status=ok`. The same boundary
keeps the remote Agent Runtime not required.

The gate checks key presence only. It does not print key values.

The ignored intent JSON is the semantic source of truth. The env file is an
authoring adapter, not a second mandatory copy of the same Data API fields. In
strict chain mode, P151 may skip the `prepare:runtime-assignment-intent` step
when an already-filled ignored intent is present, git-ignored, `edge-only`, and
contains the Data API service id, production HTTPS origin and configured flag.

The redacted artifact records the merged local evidence under
`localInputProjection` with `envAdapterRequiredForReadiness=false`.

## Output

```text
artifacts/runtime/edge-only-data-api-strict-intake-*.json
```

The artifact is redacted. It may include booleans, missing stage names, status,
decisions, chain step names, exit statuses and gate summaries. It must not
include Supabase URLs, service ids, publishable key values, service-role keys,
writer passwords, provider keys, database URLs, prompts, raw state, reference
work names, profile ids, kernel ids or candidate story text.

P155 verifies this artifact after upload:

```bash
npm run check:edge-only-data-api-strict-intake-artifact
```

In Pages current-run mode, P155 downloads the `edge-only-data-api-strict-intake`
artifact from the same workflow run and checks repository/head coherence,
sealed command propagation, missing-stage preservation and redaction.

## Acceptance

P151 is ready only when all of these are true:

1. At least one ignored local assignment input exists: the env adapter, the
   semantic intent JSON or the generated contract.
2. The local assignment input has Data API service id, production HTTPS origin,
   configured=true, `health_probe` and `reader`.
3. P156 local secret guard is satisfied: `.env.local`, `.env.local.sync` and
   the ignored intent env have no service-role, writer-password, provider-key,
   database URL or prompt-plumbing material.
4. A publishable/anon key is present locally for `remote-health:check`.
5. The prepared intent and compiled contract are `edge-only`.
6. The compiled contract does not require a remote Agent service, origin,
   secret store or health check.
7. `remote-health:check` has produced a real `health_probe` result.
8. P145 is `passed` with `healthReady=true`.
9. P150 is `passed` and has no missing stages.
10. P75 no longer reports Data API service id, origin, configured/secrets or
   health blockers.
11. P121 no longer selects `operator-assignment-evidence-intake`.
12. Strict mode fails if any of the above are missing.
13. Default mode remains root-test safe and reports waiting without leaking
    values.
14. Chain-mode failures are projected into `chainFailures` and `missingStages`;
    they must not surface raw compiler/provider output as the operator-facing
    failure mode.
15. `check:edge-only-data-api-strict-intake-artifact` validates the uploaded
    P151 artifact before P148/P131 content gates run in Pages CI.

## Non-Goals

- Do not create Supabase projects or tables.
- Do not set GitHub variables.
- Do not store publishable keys, service-role keys, writer passwords or model
  provider keys in Git.
- Do not introduce remote Agent Runtime requirements into the edge-only path.
- Do not promote live runtime, write canon, or claim P142 complete from fixture
  evidence.

## Relation To P142 And P150

P150 is a preflight. P151 is the strict intake. P142 remains the completion
contract. If P151 is waiting, the next action is still to fill real Data API
evidence and run `npm run prepare:edge-only-data-api-strict-intake`. If P151 is
ready but P142 still reports `operator-assignment-evidence-intake`, rerun the
P142 tail gates on the same current head instead of declaring completion from a
stale artifact.
