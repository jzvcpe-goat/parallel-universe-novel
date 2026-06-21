# P146 Edge-Only Intent Env Template Gate

Status: active gate  
Boundary: edge-only operator intent preparation, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P138 made `runtime-assignment.intent.local.json` the primary assignment input
for the zero-cost, edge-only launch. P145 then proved the remote health
attestation can be uploaded and checked. The remaining loop blocker selected by
P121 is still `operator-assignment-evidence-intake`: the operator must provide
managed data API evidence before `remote-health:check` can become real.

P146 closes a practical handoff gap. Operators should not use the legacy
full-remote `remote-assignment.env.example` when the selected topology is
edge-only, because that template contains remote Agent fields. Instead, P146
adds one tracked template for the P140 intent compiler:

```text
deploy/runtime-production/runtime-assignment.intent.env.example
```

The ignored local copy is:

```text
deploy/runtime-production/runtime-assignment.intent.env.local
```

This gate does not create a Supabase project, write GitHub variables, store
provider secrets, write canon, promote live runtime, or fabricate health
readiness.

## Operator Sequence

```bash
cp deploy/runtime-production/runtime-assignment.intent.env.example \
  deploy/runtime-production/runtime-assignment.intent.env.local

# Fill only non-secret data API evidence in the ignored local file.
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent

npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

## Template Rules

The tracked template must:

- contain only P140 `RUNTIME_ASSIGNMENT_*` and Supabase public project-ref/origin
  alias keys accepted by `prepare-runtime-assignment-intent`;
- leave concrete service ids and origins blank;
- default `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=false`;
- default `RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED=true` because GitHub Pages is
  already inferred by the repository;
- include `health_probe` and `reader` as the public health probe contract;
- never include provider secrets, service-role keys, writer passwords, database
  connection strings, model keys, bridge tokens, prompt plumbing, representative
  work material, `profile.id`, `kernel.id`, or `sourceRefs`;
- be paired with `.gitignore` entries that keep the local copy untracked.

## Command

```bash
npm run check:runtime-assignment-intent-env-template
```

## Acceptance

1. `package.json` exposes `check:runtime-assignment-intent-env-template`.
2. Root `npm run test` runs P146 immediately before P140
   `check:runtime-assignment-intent-prep`.
3. `.gitignore` ignores `runtime-assignment.intent.env.local` and variant local
   intent env files.
4. P140 can load the ignored env file through
   `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE`.
5. The loader rejects tracked templates, paths outside `deploy/runtime-production`
   and unsupported keys.
6. The fixture check proves a valid edge-only env file can generate the ignored
   runtime intent without remote Agent service id, origin or secret-store
   confirmation.
7. P146 writes a redacted artifact:
   `artifacts/runtime/runtime-assignment-intent-env-template-*.json`.
8. P146 artifacts contain no concrete Supabase project ref, origin, provider
   secret, prompt plumbing, private reference material, candidate prose or
   internal profile/kernel ids.

## Next Goal Effect

When P146 is green, `operator-assignment-evidence-intake` is no longer blocked
by a confusing legacy template. The remaining external input is the actual
managed data API evidence plus `remote-health:check`; if those are present, P121
can advance the loop to `remote-health-evidence-intake`.

P147 consumes this template and P123 to emit the edge-only operator evidence packet.
That packet is the shareable handoff for the current GitHub Pages plus
managed Data API route; it does not require a remote Agent Runtime and does not
use legacy `remote-assignment.env.local` values as primary evidence.
