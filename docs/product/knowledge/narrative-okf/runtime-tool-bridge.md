---
okf_version: 1
kind: narrative.knowledge.card
id: runtime-tool-bridge
title: Runtime Tool Bridge Boundary
status: active
visibility: internal_agent_readable
runtime_boundary: mastra_to_fastapi_write_boundary
source_authority: docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Runtime Tool Bridge Boundary

Mastra coordinates agents and workflows. FastAPI owns business facts, state
preview, quality evaluation and future canon writes. Any write-like action from
agents must pass through Tool Bridge with idempotency.

## Agent Use

- Do not connect directly to the database.
- Do not promote candidate text to canon.
- Treat Tool Bridge failure as a protected-runtime stop condition.

## Backend Use

- Require service authorization and idempotency for internal tool calls.
- Return business DTOs, not provider payloads.
- Keep raw runtime state and prompt plumbing out of public responses.
