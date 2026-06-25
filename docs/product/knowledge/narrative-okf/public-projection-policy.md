---
okf_version: 1
kind: narrative.knowledge.card
id: public-projection-policy
title: Public Projection Policy
status: active
visibility: internal_agent_readable
runtime_boundary: public_response_redaction
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Public Projection Policy

Public projection is the only response shape available to Reader Web and the
ordinary Creator Studio surface. It can show prose, conversational questions,
story notes, quality summaries and safe progress status.

## Public Surface May Show

- Candidate prose and author-facing questions.
- Human-readable story notes.
- Quality status and suggested next action.
- Reader-safe world and branch labels.

## Public Surface Must Hide

- Registry identifiers.
- Private reference mappings.
- Provider routing and prompt plumbing.
- Raw state, traces and internal run ledgers.
