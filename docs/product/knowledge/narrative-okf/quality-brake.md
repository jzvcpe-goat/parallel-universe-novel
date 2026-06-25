---
okf_version: 1
kind: narrative.knowledge.card
id: quality-brake
title: Quality Brake Contract
status: active
visibility: internal_agent_readable
runtime_boundary: candidate_evaluation_and_repair_advice
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Quality Brake Contract

The quality brake evaluates candidate text before canon, branch or public
publish. It uses active profile rules plus narrative checks for rhythm,
character continuity, time consistency, foreshadowing continuity and synthetic
voice.

## Agent Use

- Report candidate quality without committing story state.
- Trigger repair or regeneration according to rule severity.
- Preserve author intent when repairing local wording.

## Backend Use

- FastAPI stores the authoritative preview result.
- Canon commit remains a separate explicit action.
- Public responses expose only quality summaries and next action guidance.
