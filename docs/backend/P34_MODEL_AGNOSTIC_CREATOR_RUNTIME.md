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
NARRATIVEOS_CREATOR_PROVIDER_ORDER=openai_compatible,openai,anthropic,gemini,local
NARRATIVEOS_CREATOR_API_KEY=...
NARRATIVEOS_CREATOR_BASE_URL=https://api.deepseek.com/v1
NARRATIVEOS_CREATOR_MODEL=deepseek-chat
```

Examples:

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

## Genre Constraint Profile

Genre constraints are not global prompt text. They activate after reading the selected topic/template and the user's natural-language intent.

The backend stores two fields in `setting_cards`:

- `genre_constraint_facts`: detected preconditions and activation evidence. It keeps the legacy booleans (`western_fantasy`, `transmigration`, `non_game_requested`, etc.) and the structured facts below.
- `genre_constraints`: structured active rules. Each rule has `id`, `category`, `condition`, `applies_when`, `rule`, `positive_guidance`, `prohibited_terms`, `replacement_guidance`, `source`, `source_evidence`, `severity`, `scope`, `user_override`, and `applies_to`.

`genre_constraint_facts` is the audit trail:

- `genre_family`: normalized genre family, for example `western_fantasy`.
- `entry_mode`: normalized entry mode, for example `transmigration`.
- `tone_constraints`: boolean tone gates, for example `non_game` and `local_webnovel_feel`.
- `user_overrides`: explicit author overrides, for example `ancient_chinese_identity`.
- `activation_inputs.selected_context`: evidence from the selected topic/template/story direction.
- `activation_inputs.user_text`: evidence from the author's free-form seed and answers.
- `activation_inputs.entry_mode`: matched terms that prove the entry mode.
- `activation_inputs.tone`: matched terms that prove non-game or local-feel intent.
- `activation_inputs.explicit_overrides`: matched terms that allow otherwise blocked concepts.
- `activation_order`: always `selected_topic_template_direction -> user_freeform_intent -> explicit_user_overrides`.
- `global_prompt_rule`: documents that constraints are not global prompt text.

Negative mentions are not overrides. If the author says "不要县衙、仵作、宗门" or "不要系统面板", those terms are stored as negated evidence and the ban stays active. An override requires positive intent such as "明确想写古代仵作" or "保留县衙办案经验".

For western fantasy transmigration, active constraints may include:

- `western_fantasy_world_substrate`: world institutions, jobs, place names, and objects follow western fantasy reality. Prohibited terms include county yamen, coroner, sect, imperial exam, and county-style Chinese place names unless explicitly requested. Replacement guidance maps them to city-state, church, guild, coroner-cleric, scribe, translator, physician, or mercenary structures.
- `transmigration_local_feel`: local feel means Chinese web-novel pacing, protagonist behavior, cognition gap, human bargaining, and underdog survival, not automatic ancient Chinese setting. This is a soft tonal rule.
- `no_ancient_chinese_official_default`: bans county yamen, ancient Chinese coroner, sect, dynasty/exam, and related strong period tags when the author has not explicitly requested ancient Chinese identity. The rule is overridable only by clear user intent.
- `no_game_ui_or_loot_terms`: bans system panels, players, dungeon rewards, loot drops, experience points, stat-sheet phrasing, and game UI when non-game tone is requested. Dungeon content should become a real geography, disaster source, institution, mine, ruin, or border zone.

This keeps constraints explainable and overridable at the correct SOP breakpoint: the user's chosen topic and free-form creative intent.

Implementation rule for future genres: add a normalized fact profile first, then add constraint definitions. Do not add a raw blacklist directly to the prompt. Every hard ban needs a matching `condition`, `source_evidence`, and `replacement_guidance` so the model can avoid the wrong phrase without losing the story function.

Generation rule: `prohibited_terms` must not appear in `story_text`, even inside negations such as "没有系统面板". The model should express the same function through `replacement_guidance`, for example replacing game UI with physical contracts, inscriptions, injuries, ledgers, or institutional consequences.

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
