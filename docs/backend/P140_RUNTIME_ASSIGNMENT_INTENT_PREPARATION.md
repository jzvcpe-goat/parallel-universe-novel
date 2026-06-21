# P140 Runtime Assignment Intent Preparation

Status: active gate  
Boundary: local intent initialization, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-20

## Purpose

P140 removes the last unnecessary manual step from the P138 edge-only
assignment flow. Operators should not copy the example file and decide every
field by hand. The repository already knows the current GitHub Pages frontend,
repository service id and edge-only Agent boundary, so the local intent
preparation command infers those values and writes only the ignored local
intent file:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
```

This gate does not create a Supabase project, write GitHub variables, store
provider secrets, promote live runtime or make fake remote Agent evidence. It
only prepares the correct shape for the next external evidence step.

## Commands

Prepare or refresh the ignored local intent:

```bash
RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
```

Run the no-write fixture check used by CI:

```bash
npm run check:runtime-assignment-intent-prep
```

Use the P146 local env-file handoff when the operator does not want to edit
JSON directly:

```bash
npm run prepare:runtime-assignment-intent-env-local

RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent
```

Continue the edge-only assignment flow:

```bash
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

## What Is Auto-Prepared

The command infers:

- `runtime_mode=edge-only`;
- `operator.owner` from the GitHub repository owner unless overridden;
- `operator.provider=github-pages-supabase-managed`;
- `frontend.provider=github-pages`;
- `frontend.service_id=jzvcpe-goat/parallel-universe-novel`;
- `frontend.origin=https://jzvcpe-goat.github.io`;
- `health.frontend_url=https://jzvcpe-goat.github.io/parallel-universe-novel/`;
- `agent.remote_required=false`;
- `agent.ai_generation_cloud_runtime=false`;
- `agent.reader_can_trigger_ai=false`.

## What Still Requires Operator Evidence

The command intentionally leaves managed data API evidence as the real blocker
when no environment values are supplied:

- `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF`;
- `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL`;
- `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true` only after the publishable key,
  RLS policies and `health_probe` table are ready.

Secret values do not belong in the intent. The publishable or legacy anon key is
only used by `npm run remote-health:check` from local env, and service-role
keys, writer passwords and model keys must never be placed in the browser,
public artifacts or the intent file.

P146 owns the tracked template for these local-only inputs:

```text
deploy/runtime-production/runtime-assignment.intent.env.example
deploy/runtime-production/runtime-assignment.intent.env.local
```

P149 owns creation of the ignored local env file. Operators should use
`npm run prepare:runtime-assignment-intent-env-local` instead of hand-copying
the template, then fill only the non-secret managed Data API evidence.

`RUNTIME_ASSIGNMENT_INTENT_ENV_FILE` may point only to the ignored local copy.
The loader accepts non-secret P140 fields, rejects unsupported keys and does
not load the tracked example as runtime input.

## Acceptance

1. `package.json` exposes `prepare:runtime-assignment-intent`.
2. `package.json` exposes `check:runtime-assignment-intent-prep`.
3. Root `npm run test` runs `check:runtime-assignment-intent-prep` before
   `check:runtime-assignment-compiler`.
4. P121, P123 and P130 publish the P140 preparation command as the first
   edge-only assignment step.
5. The generated intent remains ignored by Git.
6. The CI check does not write the local intent.
7. The fixture check proves GitHub Pages frontend inference and edge-only Agent
   absence without using real Supabase credentials.
8. The command reports the remaining data API fields instead of inventing
   placeholder readiness.
9. `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE` can load the ignored P146 env file.
10. The tracked P146 env template does not ask for remote Agent service id,
    remote Agent origin or Agent secret-store confirmation.
