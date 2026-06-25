---
okf_version: 1
kind: narrative.knowledge.card
id: creator-socratic-flow
title: Creator Socratic Flow
status: active
visibility: internal_agent_readable
runtime_boundary: candidate_generation_without_canon_write
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Creator Socratic Flow

Creator Studio starts from natural language. The assistant writes a candidate
opening first, then asks at most two high-signal questions that change the next
scene, not a static form.

## Agent Use

- Accept one story seed, image, secret, choice or contradiction.
- Draft a 300-800 character candidate opening.
- Ask no more than two clarifying questions.
- Extract setting cards silently as story notes.
- Keep all results in candidate state until the author confirms.

## UX Use

- The primary surface is a conversational thread.
- Setting cards are supporting memory, not a fill-in spreadsheet.
- Internal terms must not appear in public copy.
