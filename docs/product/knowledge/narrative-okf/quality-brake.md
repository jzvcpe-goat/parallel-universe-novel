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
publish. It keeps continuity, tension, information control, character agency,
voice, freshness, genre fulfillment, repetition, exposition, scene detail and
pacing as separate findings. It never collapses them into one literary score.

## Agent Use

- Report candidate quality without committing story state.
- Trigger repair or regeneration according to rule severity.
- Preserve author intent when repairing local wording.
- Locate every finding in current manuscript evidence.
- Treat author-selected recall groups by role: causal facts press the opening,
  character knowledge limits inference, timeline fixes time and place, and
  promises can only be preserved, advanced, or explicitly resolved.
- Do not auto-preserve the first paragraph or protect text merely because it is
  fluent. `preserve` requires a local action-resistance-choice-consequence chain.
- Flag repeated scene mechanisms and template phrases without rewriting an
  otherwise valid chapter.

## Backend Use

- FastAPI stores the authoritative preview result.
- Canon commit remains a separate explicit action.
- Public responses expose only quality summaries and next action guidance.
