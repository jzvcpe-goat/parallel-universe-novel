# P150 Edge-Only Data API Evidence Readiness

Status: active gate  
Boundary: local Data API evidence preflight, no production readiness claim  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P150 closes the small but recurring gap between P149 and P142. P149 creates the
ignored local env file where the operator can record managed Data API evidence.
P142 remains the real completion contract for Supabase/Data API health. P150
sits between them and answers one narrow question:

Has the local edge-only Data API evidence been filled enough to run the strict
P142 command chain?

The answer is emitted as a redacted artifact. The artifact may say "waiting"
without failing root test, or it may say "ready for P142 completion checks"
after the operator has filled the Data API evidence and run the health probe.
It does not mark P142 complete.

## Command

Default, root-test safe mode:

```bash
npm run check:edge-only-data-api-evidence-readiness
```

Strict operator mode:

```bash
REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true \
npm run check:edge-only-data-api-evidence-readiness
```

## Inputs

P150 reads only the local/project evidence shape:

- `deploy/runtime-production/runtime-assignment.intent.env.example`
- ignored `deploy/runtime-production/runtime-assignment.intent.env.local`
- optional `deploy/runtime-production/runtime-assignment.intent.local.json`
- optional `deploy/runtime-production/generated/remote-assignment.contract.json`
- optional `deploy/runtime-production/generated/remote-health-evidence.result.json`
- latest P145 health attestation if present

It never prints service IDs, Supabase origins, publishable keys, writer
passwords, provider keys, database URLs, prompts, private reference material or
candidate prose.

## Output

```text
artifacts/runtime/edge-only-data-api-evidence-readiness-*.json
```

The artifact includes booleans only:

- local env present and ignored by Git;
- Data API service id present;
- Data API origin present and production HTTPS-shaped;
- `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true`;
- compiled intent and contract remain `edge-only`;
- remote Agent Runtime remains not required;
- `health_probe` / `reader` health is ready or still waiting.

## Acceptance

1. `package.json` exposes `check:edge-only-data-api-evidence-readiness`.
2. Root `npm run test` runs P150 immediately after P149 and before P146.
3. Pages workflow uploads `edge-only-data-api-evidence-readiness`.
4. P43 current-run artifact metadata requires
   `edge-only-data-api-evidence-readiness`.
5. P107 classifies the artifact as a `pre_upload_generator_gate`.
6. The artifact never includes raw Data API values or secrets.
7. Missing real Data API health yields
   `passed_waiting_for_edge_only_data_api_evidence` in default mode.
8. `REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true` fails until all Data API
   fields and real health evidence are present.
9. P150 does not create Supabase services, set GitHub variables, write canon,
   promote live runtime, or use fixture health evidence as production evidence.
10. P150 does not require remote Agent service id, origin, secret-store
    confirmation or health proof.

## Relation To P142

P150 is a readiness preflight for P142, not a replacement. P142 is complete only
after the full strict chain is green:

```bash
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent

npm run remote-assignment:prepare
npm run check:remote-assignment-compiler-coherence
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true npm run check:edge-only-data-api-evidence-readiness
npm run prepare:edge-only-data-api-strict-intake
npm run check:loop-next-goal-ledger
```

If P150 is ready but P142 still selects `operator-assignment-evidence-intake`,
the strict P142 chain must be rerun rather than declaring completion from the
P150 artifact alone.

P151 is the next stricter intake gate:

```bash
npm run prepare:edge-only-data-api-strict-intake
```

The sealed operator command above wraps the stricter
`check:edge-only-data-api-strict-intake` gate with the required strict-intake,
remote-health and ready-state environment flags.

P151 checks the same boundary as P150 plus publishable-key presence, P145
health attestation, P75 blocker clearance and P121 next-goal movement. It still
does not create remote services, set GitHub variables, promote live runtime or
mark P142 complete from fixture evidence.
