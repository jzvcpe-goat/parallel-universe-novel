---
okf_version: 1
kind: narrative.knowledge.card
id: genre-kernel
title: Genre Kernel Contract
status: active
visibility: internal_agent_readable
runtime_boundary: kernel_selection_and_beat_plan_only
source_authority: docs/product/rules/genre-runtime-rules.v1.json
public_projection: redacted_story_guidance_only
representative_work_names: encrypted_vault_only
---

# Genre Kernel Contract

Genre kernels define story rhythm, conflict shape, motivation pressure and
chapter-level beat planning for a compatible constraint profile. They do not
directly rewrite author text and they do not bypass quality brake checks.

## Agent Use

- Resolve compatible kernels from active constraint profiles.
- Produce a beat plan, pacing hints and conflict pressure.
- Keep kernel ids inside the internal session boundary.
- Send only reader-safe guidance to Creator Studio or Reader Web.

## Backend Use

- FastAPI remains the business fact owner.
- Agent workflows may request kernel context but must write through Tool Bridge.
- Public DTOs must not expose internal registry ids or private references.
