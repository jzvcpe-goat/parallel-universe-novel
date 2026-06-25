---
okf_version: 1
kind: narrative.knowledge.card
id: constraint-profile
title: Constraint Profile Contract
status: active
visibility: internal_agent_readable
runtime_boundary: active_profile_rules_only
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Constraint Profile Contract

Constraint profiles provide the executable rules for topic, era, social
substrate, prohibited mismatches, repair guidance and quality-brake behavior.
They are selected from template, genre signal, user seed and explicit author
override.

## Agent Use

- Use only active profile rules when evaluating generated text.
- Treat examples and browser comments as research input, not runtime rules.
- When no profile matches, ask a clarifying question instead of inventing a
  hidden rule.

## Backend Use

- Store internal activation evidence for audit.
- Return public guidance and quality summaries without registry plumbing.
- Keep representative work mapping in the encrypted vault.
