---
okf_version: 1
kind: narrative.knowledge.card
id: market-template-refresh
title: Market Template Refresh
status: active
visibility: internal_agent_readable
runtime_boundary: trend_intake_to_template_candidate
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Market Template Refresh

Market scanning can suggest template candidates for weekly or monthly review.
It does not directly alter runtime kernels, constraints or homepage ranking.

## Agent Use

- Scan trend categories on a scheduled cadence.
- Produce candidate template deltas with evidence labels.
- Route changes to human review before runtime registry updates.

## Backend Use

- Store trend observations separately from executable rules.
- Promote only reviewed changes into the rule documents and runtime registry.
- Keep public recommendations story-facing, not implementation-facing.
