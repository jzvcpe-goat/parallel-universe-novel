# P156 Edge-Only Data API Local Secret Guard

Status: active local guard  
Boundary: local Data API evidence hygiene, no remote call  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P156 closes the handoff gap between P149/P150 and the real P142 operator work.
P149 creates the ignored local intent env file. P150 tells us whether the Data
API evidence is ready. P145 validates the health artifact after
`remote-health:check`.

P156 sits before those checks and answers a narrower question:

Can the local files that `remote-health:check` will read be safely used for
edge-only Data API evidence?

The guard checks shape and boundary only. It does not create Supabase projects,
does not query the Data API, does not print values, does not upload local env
files, and does not mark P142 complete.

## Command

Default root-test-safe mode:

```bash
npm run check:edge-only-data-api-local-secret-guard
```

Strict operator mode, after filling local evidence:

```bash
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true \
npm run check:edge-only-data-api-local-secret-guard
```

## Inputs

P156 reads only ignored local/operator files and the tracked template shape:

- `deploy/runtime-production/runtime-assignment.intent.env.example`
- ignored `deploy/runtime-production/runtime-assignment.intent.env.local`
- optional ignored `.env.local`
- optional ignored `.env.local.sync`

The intent env file may contain non-secret deployment evidence:

- Data API service id or Supabase project ref;
- Data API HTTPS origin or Supabase URL;
- `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true`;
- `health_probe` / `reader` probe configuration.

The `.env.local` / `.env.local.sync` files may contain only the local
publishable or legacy anon key needed by `remote-health:check`:

- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ANON_KEY`

## Forbidden Local Inputs

Because `remote-health:check` loads `.env.local` and `.env.local.sync`, these
files must not contain:

- Supabase service-role keys or JWT secrets;
- writer passwords;
- database URLs or Postgres URLs;
- model provider API keys;
- Tool Bridge tokens;
- authorization headers;
- private keys;
- prompt plumbing, raw runtime state, source refs, profile ids or kernel ids.

If any forbidden key class appears, P156 fails even in default mode. That keeps
the local Data API health path from quietly becoming a general secret dump.

## Output

P156 emits:

```text
artifacts/runtime/edge-only-data-api-local-secret-guard-*.json
```

The artifact is redacted. It contains only booleans and counts:

- local intent env present and ignored by Git;
- local `.env.local` / `.env.local.sync` present and ignored by Git;
- Data API id/origin/configuration/probe booleans;
- publishable key presence boolean;
- forbidden material presence boolean;
- next command.

No service id, origin, key, password, provider payload, prompt, source ref,
representative-work name or candidate prose may appear in the artifact.

## Acceptance

1. `package.json` exposes `check:edge-only-data-api-local-secret-guard`.
2. Root `npm run test` runs P156 after P149 and before P150.
3. P156 passes in default mode when local evidence is still absent, but records
   `passed_waiting_for_local_data_api_evidence`.
4. P156 fails immediately if local health-input files contain service-role,
   writer-password, database-URL, provider-key or prompt-plumbing material.
5. P156 strict mode fails until non-secret Data API fields, configuration
   confirmation and a local publishable/anon key are present.
6. P156 does not perform network IO and does not run `remote-health:check`.
7. P156 does not replace P142, P145, P150 or P151; it only prevents local
   operator evidence from entering those gates in an unsafe shape.
8. When P156 is still waiting for local Data API evidence, its artifact
   `nextCommand` points forward to
   `npm run check:edge-only-data-api-evidence-readiness`, not back to the P149
   bootstrap command.

## Command Position

The safe local sequence is:

```bash
npm run prepare:runtime-assignment-intent-env-local
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard
npm run check:edge-only-data-api-evidence-readiness
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
npm run prepare:edge-only-data-api-strict-intake
```
