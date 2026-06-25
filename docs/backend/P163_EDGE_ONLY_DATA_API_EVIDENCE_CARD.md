# P163 Edge-Only Data API Evidence Card

Status: active gate  
Boundary: operator evidence card, no values, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P123 and P147 already produce safe operator packets, while P150 and P151
diagnose the Data API/Supabase readiness chain. P163 adds a small
human-and-machine-readable evidence card template so an operator can see the
same requirements in one place before filling local ignored files.

The template is:

```text
deploy/runtime-production/edge-only-data-api.evidence-card.example.md
```

It follows the same shape as the current edge-only launch boundary:

- GitHub Pages hosts the reader frontend.
- A managed Data API stores public reader state and health evidence.
- AI generation stays outside the cloud reader path.
- A remote Agent Runtime is not required.
- Cloud AI generation and reader-triggered cloud AI generation stay disabled.

## Commands

```bash
npm run check:edge-only-data-api-evidence-card
```

## Inputs

P163 checks the template plus the active handoff/readiness docs:

- `docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md`
- `docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md`
- `docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md`
- `docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md`
- `docs/backend/P163_EDGE_ONLY_DATA_API_EVIDENCE_CARD.md`

## Evidence Card Contract

The card must tell the operator where to put each value without containing any
real values itself.

Required local-only fill paths:

```text
deploy/runtime-production/runtime-assignment.intent.env.local
.env.local
.env.local.sync
```

Required evidence names:

- `RUNTIME_ASSIGNMENT_OPERATOR_OWNER`
- `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF`
- `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL`
- `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true`
- `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`,
  `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`
- `health_probe` with `id=reader` and `status=ok`

Required boundary statements:

- `remote Agent Runtime` is not required for the active edge-only path.
- No service id, origin, publishable key, writer password, service-role key,
  provider key, database URL, prompt plumbing, representative work names,
  profile ids, kernel ids, `sourceRefs`, candidate prose or health payload value
  may appear in the card, docs, artifacts or public output.

## Output

P163 emits:

```text
artifacts/runtime/edge-only-data-api-evidence-card-*.json
```

The artifact contains only boolean/boundary status and checked doc paths.

## Acceptance

1. `package.json` exposes `check:edge-only-data-api-evidence-card`.
2. Root `npm run test` runs P163 before P150/P151 so the evidence vocabulary is
   checked before readiness diagnostics.
3. The template declares
   `schema: narrativeos.edge_only_data_api_evidence_card.v1`.
4. The template declares `values_included: false`.
5. The template includes the same Data API, publishable-key and health evidence
   names used by P123, P147, P150 and P151.
6. The template and P123/P147/P150/P151/P163 docs all reference
   `deploy/runtime-production/edge-only-data-api.evidence-card.example.md`.
7. The template and docs all keep the primary path edge-only: no remote Agent
   Runtime requirement, no cloud AI generation, no reader-triggered cloud AI
   generation.
8. The checker rejects real URLs, Supabase project origins, JWT-like
   publishable keys, service-role/writer-password/provider-key names with
   values, database URLs, prompt plumbing, representative work references,
   profile ids, kernel ids and `sourceRefs`.

## Non-Goals

- Do not create Supabase/Data API projects.
- Do not write local evidence values.
- Do not upload secrets or set GitHub variables.
- Do not change P150/P151 readiness semantics.
- Do not promote live runtime.
