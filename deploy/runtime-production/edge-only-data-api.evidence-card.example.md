---
schema: narrativeos.edge_only_data_api_evidence_card.v1
status: template
visibility: operator_local_template
values_included: false
runtime_mode: edge-only
frontend_provider: github-pages
data_api_provider: managed-data-api
remote_agent_required: false
cloud_ai_generation: false
reader_cloud_ai_generation: false
operator_inputs:
  - RUNTIME_ASSIGNMENT_OPERATOR_OWNER
  - RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF
  - RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL
  - RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true
local_publishable_key_locations:
  - .env.local
  - .env.local.sync
accepted_publishable_key_names:
  - VITE_SUPABASE_PUBLISHABLE_KEY
  - VITE_SUPABASE_ANON_KEY
  - SUPABASE_PUBLISHABLE_KEY
  - SUPABASE_ANON_KEY
health_probe: id=reader,status=ok
strict_command: npm run prepare:edge-only-data-api-strict-intake
---

# Edge-Only Data API Evidence Card

This is an operator-local evidence template. It is safe to commit because it
contains no service id, origin, full publishable/anon key value, writer
password, service-role key, database URL, provider key, prompt plumbing,
representative work name, candidate prose or health payload value.

## Fill Locations

Put non-secret assignment evidence in:

```text
deploy/runtime-production/runtime-assignment.intent.env.local
```

Put the publishable or anon key only in one of these ignored local files:

```text
.env.local
.env.local.sync
```

Do not paste full publishable/anon key values into the assignment env, Markdown
docs, artifacts, GitHub Pages variables or Git-tracked files. They are
browser-allowed client keys, but evidence artifacts should only record presence,
type or a short fingerprint.

## Required Evidence

| Evidence | Accepted field | Rule |
| --- | --- | --- |
| Operator owner | `RUNTIME_ASSIGNMENT_OPERATOR_OWNER` | Non-empty accountable owner, no placeholder |
| Data API service | `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF` | Managed data API id/project ref only; not a secret |
| Data API origin | `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL` | Production HTTPS origin, no path, no localhost |
| Data API configured | `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true` | Set only after publishable config and RLS/policies exist |
| Local publishable key | `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY` | Local env only; value never appears in artifacts |
| Health row | `health_probe` row | `id=reader` and `status=ok` |

## Verification Sequence

```bash
npm run prepare:runtime-assignment-intent-env-local
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard
npm run check:edge-only-data-api-evidence-card
npm run check:edge-only-data-api-evidence-readiness
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
npm run prepare:edge-only-data-api-strict-intake
```

## Boundary

The reader frontend is hosted publicly. The managed Data API stores public
reader state and health evidence. AI generation, provider keys, writer
passwords and service-role keys remain outside the public deployment path.

The primary launch path must not require a remote Agent Runtime, cloud AI
generation, reader-triggered cloud AI generation, or legacy full-remote
`REMOTE_AGENT_*` evidence.
