# P34 Model-Agnostic Creator Runtime

Date: 2026-06-14

## Goal

`/v1/creator/dialogue/*` must be a model-agnostic novel creation runtime. DeepSeek, OpenAI, Anthropic, Gemini, Qwen, Moonshot, Zhipu, OpenRouter, and local gateways are adapters, not product identity. Public reader and creator UI must never expose provider names, API details, or prompt plumbing.

## Runtime Contract

The creator runtime uses the existing `LLMBackend` abstraction with these capabilities:

- `generate_json(system_prompt, user_prompt)`: required structured generation.
- `stream_text(system_prompt, user_prompt)`: optional streaming surface.
- `tool_call(system_prompt, user_prompt, tools)`: optional function/tool calling surface.
- `provider_status()`: provider, model, configured state, and non-secret operational details.
- `capability_profile()`: whether JSON mode, streaming, tool/function calling, OpenAI-compatible protocol, or local fallback is supported.

Wrappers such as retry, routing, cache, and budget guards must forward status and capabilities from their delegate. Ops can inspect this through `/v1/ops/provider-routing`.

## Generic Configuration

OpenAI-compatible providers should be the default integration path:

```bash
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_PROVIDER_ORDER=openai_compatible,local
NARRATIVEOS_CREATOR_API_KEY=...
NARRATIVEOS_CREATOR_BASE_URL=https://<openai-compatible-host>/v1
NARRATIVEOS_CREATOR_MODEL=<model-name>
```

DeepSeek, Qwen, OpenRouter, Kimi/Moonshot and other gateways are examples, not product defaults. Configure them explicitly when that provider is selected:

```bash
# DeepSeek
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_BASE_URL=https://api.deepseek.com/v1
NARRATIVEOS_CREATOR_MODEL=deepseek-chat

# Qwen compatible gateway
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
NARRATIVEOS_CREATOR_MODEL=qwen-plus

# OpenRouter
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_BASE_URL=https://openrouter.ai/api/v1
NARRATIVEOS_CREATOR_MODEL=provider/model-name

# Native OpenAI
NARRATIVEOS_CREATOR_PROVIDER=openai
NARRATIVEOS_CREATOR_API_KEY=...
NARRATIVEOS_CREATOR_MODEL=gpt-5

# Native Anthropic
NARRATIVEOS_CREATOR_PROVIDER=anthropic
NARRATIVEOS_CREATOR_API_KEY=...
NARRATIVEOS_CREATOR_MODEL=claude-sonnet-4-5

# Native Gemini
NARRATIVEOS_CREATOR_PROVIDER=gemini
NARRATIVEOS_CREATOR_API_KEY=...
NARRATIVEOS_CREATOR_MODEL=gemini-2.5-flash
```

Provider-specific legacy variables may still work for compatibility, but new creator runtime deployments should prefer `NARRATIVEOS_CREATOR_*`.

## Product Boundary

Public `/create` copy should describe the writing experience only:

- allowed: 开场、人物、场景、世界规则、风格基调、下一段、故事笔记
- forbidden: provider, API, Kimi, DeepSeek, Moonshot, system prompt, Memo, backend, endpoint, fallback

Provider status belongs in Studio/Ops and QA reports, not reader/creator-facing product surfaces.

## Document-First Constraint And Kernel Profile

P4 constraints are document-derived runtime facts, not global prompt text and not one-off prompt fixes. The creator runtime must activate rules only from the shared `ConstraintProfile + GenreKernel` registry:

- Human-editable rules: `docs/product/rules/GENRE_CONSTRAINT_RULES.md`
- Human-editable kernels: `docs/product/rules/GENRE_KERNEL_RULES.md`
- Runtime source: `docs/product/rules/genre-runtime-rules.v1.json`
- Agent resolver: `packages/agent-runtime/src/constraints.ts`

The backend stores two public-safe fields in `setting_cards`:

- `genre_constraint_facts`: normalized activation evidence. It may record selected template labels, seed signals, matched profile ids, matched kernel ids, source `rwref_*` ids, and whether an author override was explicit. It must not store provider details, prompts, raw model state, representative work names, or ad hoc booleans tied to a one-off intake note.
- `genre_constraints`: active structured rules projected from the document registry. Each rule should include `id`, `display_name`, `layer`, `rule_ids`, `prohibited_terms`, `replacement_guidance`, `severity`, `fail_behavior`, `source_refs`, and `applies_to`.

Activation order:

1. Selected product template or topic.
2. User seed and follow-up answers.
3. Explicit author override, only when the author positively asks to keep or change a convention.
4. Kernel compatibility check.
5. Quality Brake preview.

Runtime behavior:

- `ConstraintProfile` evaluates what must be allowed, repaired, regenerated, blocked, or sent to manual review.
- `GenreKernel` converts the active profile into `BeatPlan` inputs such as pacing, event structure, motive pressure, conflict pressure, climax rules, and time controls.
- The writer may use the active kernel to draft prose, but must not expose profile ids, kernel ids, source evidence, prompt text, provider details, or raw state in Creator/Reader UI.
- Public story text must not contain prohibited terms from active rules. If a rule blocks a term, the model should preserve the story function through `replacementGuidance` rather than explaining the ban.

Contribution rule for future genres: add or update the document profile first, then update the runtime JSON, resolver tests, quality fixtures, and Creator sample. Do not add direct blacklist logic to prompts, workflows, or provider adapters.

## P4 Reset Boundary

The current P4 implementation supersedes earlier one-off experiments. A
constraint is active only when it is present in `genre-runtime-rules.v1.json` and
selected by the normal resolver. QA notes, backend package notes, and manual
research examples are useful as research material, but they are not runtime facts
and must not be copied into workflow branches, provider prompts, FastAPI service
conditionals, or smoke payloads.

The runtime registry now carries `documentCore.deprecatedCasePolicy` to make this
enforceable. Creator Runtime must treat every earlier case-derived premise rule
as deleted unless it has been re-authored in the document registry. The allowed
path is profile selection -> `ConstraintProfile.rules[]` -> compatible
`GenreKernel` -> Quality Brake. There is no side channel for global premise
blacklists, provider-specific patches, or hidden selected-genre exceptions.

When the product needs a new premise boundary, implement it in this order:

1. Add or revise the reusable `ConstraintProfile` rule.
2. Link or adjust the compatible `GenreKernel`.
3. Add resolver and quality-brake tests that select the profile through public
   genre/template/user-intent inputs.
4. Run `npm run scan:p4-rule-source` before shipping.

## Ops Evidence

`GET /v1/ops/provider-routing` now includes:

- `creator.enabled`
- `creator.provider_order`
- `creator.backend_present`
- `creator.provider_status.provider`
- `creator.provider_status.model`
- `creator.capability_profile.generate_json`
- `creator.capability_profile.stream_text`
- `creator.capability_profile.tool_call`
- `creator.capability_profile.function_calling`
- `creator.capability_profile.json_mode`

QA should treat `mode=local_cowriter`, `fallback_used=true`, or missing provider status as incomplete for real model launch validation.
