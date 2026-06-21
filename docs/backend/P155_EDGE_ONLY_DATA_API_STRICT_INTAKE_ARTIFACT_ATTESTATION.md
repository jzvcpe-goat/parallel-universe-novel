# P155 Edge-Only Data API Strict Intake Artifact Attestation

Status: active artifact content gate  
Boundary: P151 uploaded artifact content, no secrets or production mutation  
Owner: release engineering  
Date: 2026-06-21

## Purpose

P151 generates the redacted `edge-only-data-api-strict-intake` artifact. P155
proves that artifact is not only uploaded, but also content-checked after it is
published by the current Pages workflow run.

This closes the gap between "artifact exists" and "artifact still carries the
correct strict-intake evidence": sealed command propagation, expanded command
traceability, missing-stage preservation, head coherence and no-secret
boundaries.

## Commands

Local latest artifact:

```bash
npm run check:edge-only-data-api-strict-intake-artifact
```

Current GitHub Pages run:

```bash
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<pages-run-id> \
CHECK_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_REQUIRED=true \
npm run check:edge-only-data-api-strict-intake-artifact
```

## Acceptance

1. The downloaded artifact has gate `P151_EDGE_ONLY_DATA_API_STRICT_INTAKE`.
2. The artifact repository and head SHA match the current run.
3. The artifact includes `npm run prepare:edge-only-data-api-strict-intake`.
4. The artifact includes the expanded strict command with strict-intake,
   remote-health and ready-state flags.
5. Waiting artifacts preserve non-empty `missingStages`.
6. Ready artifacts have no `missingStages`.
7. `localIntentEnv`, `dataApi`, `publishableKey`, `preparedIntent`,
   `compiledContract`, `healthEvidence` and gate summaries remain redacted.
8. Boundary flags confirm no remote services are created, no GitHub variables
   are set, no canon is written, live runtime is not promoted, and no provider
   secrets, service-role keys, writer passwords or remote Agent requirement are
   introduced.
9. Pages CI runs this content gate after P147 and before P148.

## Non-Goals

- Do not run the strict operator command.
- Do not create Data API/Supabase resources.
- Do not read or print publishable keys, writer passwords, service-role keys or
  provider keys.
- Do not mark P142 complete.
