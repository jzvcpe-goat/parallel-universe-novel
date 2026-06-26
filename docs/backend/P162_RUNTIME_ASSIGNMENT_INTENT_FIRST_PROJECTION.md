# P162 Runtime Assignment Intent-First Projection

Status: active regression gate  
Boundary: local runtime assignment input coherence, no secret or remote IO  
Owner: release engineering  
Date: 2026-06-21

## Purpose

P162 prevents the Remote Assignment Compiler chain from drifting back into a
duplicate-entry workflow. The semantic local input is:

```text
deploy/runtime-production/runtime-assignment.intent.local.json
```

The env file is only an authoring adapter:

```text
deploy/runtime-production/runtime-assignment.intent.env.local
```

If the ignored intent JSON already contains valid edge-only Data API evidence,
P150 and P151 must not report the Data API service id, origin or configured flag
as missing just because the env adapter is blank.

## Command

```bash
npm run check:runtime-assignment-intent-first-projection
```

Root `npm run test` runs P162 after P113 image drift and before P118 strict run
package:

```bash
npm run check:remote-assignment-image-drift
npm run check:runtime-assignment-intent-first-projection
npm run check:remote-assignment-strict-run-package
```

## What It Verifies

P162 temporarily writes a safe ignored fixture intent, leaves the env adapter
empty, then runs:

```bash
npm run check:edge-only-data-api-evidence-readiness
npm run check:edge-only-data-api-strict-intake
```

The fixture is restored before the script exits. The gate fails if either P150
or P151 reports these fields as missing from the filled semantic intent:

- `data-api-service-id`
- `data-api-origin`
- `data-api-production-origin`
- `data-api-configured`

Expected remaining stages are still allowed:

- remote health evidence;
- publishable/anon key presence;
- generated contract;
- P145/P75/P121 downstream movement.

## Output

```text
artifacts/runtime/runtime-assignment-intent-first-projection-*.json
```

The artifact includes only booleans and stage names. It must not contain
Supabase URLs, service ids, full publishable/anon key values, service-role keys,
writer passwords, provider keys, prompt plumbing, source refs, profile ids or
kernel ids.

## Acceptance

1. `package.json` exposes `check:runtime-assignment-intent-first-projection`.
2. Root `npm run test` runs P162 after P113 and before P118.
3. P150 exposes `localInputProjection`.
4. P151 exposes `localInputProjection`.
5. P150/P151 accept a filled ignored intent as semantic input even when the env
   adapter is blank.
6. P162 restores ignored local files after its fixture run.
7. P162 does not run `remote-health:check`, create Supabase resources, set
   GitHub variables, upload secrets or promote live runtime.
