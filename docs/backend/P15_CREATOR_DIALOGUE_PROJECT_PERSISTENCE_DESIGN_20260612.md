# P15 Creator Dialogue To Story Project Persistence Design - 2026-06-12

## Decision

`/create` remains a natural-language, Socratic creation surface. It must not become a project setup form.

The persistence layer should appear only after the assistant has produced story text and enough story notes to form a credible project candidate. The backend owns the conversion from a creator dialogue session into a story project; the frontend only asks for `保存为作品` or `进入预览` after the dialogue result exists.

This avoids duplicate development:

- Current product frontend stays in `app` (Vite + React + TypeScript).
- Backend-team `apps/web` remains reference-only.
- Backend-team `/story-projects` capability is reused through a product-facing `/v1/creator/dialogue/sessions/{session_id}/project` bridge.

## Current Evidence

Current frontend creator dialogue:

- Page: `app/src/pages/Create.tsx`
- API client: `app/src/api/creator.ts`
- Session create: `POST /v1/creator/dialogue/sessions`
- Turn append: `POST /v1/creator/dialogue/sessions/{session_id}/turns`
- Frontend passes `context.story_direction` and `context.main_universe_template`.
- User-visible surface is natural language: story seed input, assistant opening, at most two follow-up questions, creative reasoning summary and story notes.

Current backend creator dialogue:

- API: `backend/src/narrativeos/api/creator.py`
- Service: `backend/src/narrativeos/services/creator_dialogue.py`
- The service persists session JSON and returns:
  - `session_id`
  - `creator_id`
  - `phase`
  - `assistant.story_text`
  - `assistant.questions`
  - `setting_cards`
  - `turns`
  - `source`
- The service already protects public responses from implementation wording.

Backend-team story project capability:

- Source: `artifacts/backend-team-inspection/parallel-novel-dev-inspection-20260612-212352/apps/api/app/`
- Route: `POST /story-projects`
- Request schema: `StoryProjectCreateRequest`

```ts
type StoryProjectCreateRequest = {
  user_id: string
  title: string
  genre: string
  protagonist: string
  conflict: string
  worldbuilding: string
  style: string
  target_chapters: number
}
```

The backend-team route creates a project, initializes a root worldline, builds a genre kernel, starts the first manuscript job, and returns `StoryProjectDetail`.

## State Machine

The persistence bridge should use this state machine:

| State | Meaning | Entry condition | Allowed action |
| --- | --- | --- | --- |
| `seed` | User has not supplied enough original intent. | No user seed or no assistant story text. | Ask one natural-language seed question. |
| `opening_draft` | Assistant has written first readable prose. | `assistant.story_text` is non-empty and first user seed exists. | Continue dialogue or prepare candidate. |
| `clarify` | One or two fields still need author intent. | Candidate is possible but key manual fields are weak. | Ask at most two short questions. |
| `project_candidate` | Backend can map dialogue into project fields. | Seed, story text, genre signal, conflict and world rule all have values from manual/derived/frozen sources. | Show `保存为作品` and `进入预览`. |
| `saved_project` | Project record exists and repeated saves are idempotent. | Bridge has created or fetched a project for this session snapshot. | Continue dialogue, open project, or request preview. |
| `preview_ready` | Reader preview can open safely. | Project exists and first chapter is ready or queued with a reader URL. | Open `/story?project=...` or shared preview path. |

Important product rule:

The frontend should not show `保存为作品` before `opening_draft`. The user should first see story text, then decide whether to keep going.

## Field Source Matrix

The bridge must store provenance for every field without exposing internal labels on public pages.

| Product field | Backend story-project field | Manual input | Dialogue auto-derived | Memo/template frozen |
| --- | --- | --- | --- | --- |
| Work title | `title` | User explicit title or correction. | Extract from seed/opening; fallback to concise title generated from core anomaly. | Template naming pattern only as fallback. |
| Genre | `genre` | User says genre or rejects inferred direction. | `setting_cards.genre_signal`; `context.story_direction.label`. | Main-universe template genre and market topic weights. |
| Characters | `protagonist` | Name, identity, wound, desire, relationship debt, forbidden direction. | `protagonist_hint`, `character_web_hint`, first-scene actions. | Role function slots, archetype pressure, relationship patterns. |
| Conflict | `conflict` | First choice, secret, pursuit, revenge, rescue, debt, impossible decision. | `central_tension`, `conflict_engine_hint`, assistant story text. | Genre conflict engine and chapter escalation rules. |
| World | `worldbuilding` | Explicit rule, setting, place, era, forbidden rule. | `world_rule_hint`, `opening_scene_hint`, template premise. | Scene library, rule constraints, genre kernel setting rules. |
| Style | `style` | User tone preference or correction. | `setting_cards.tone`, selected writing tone, assistant prose rhythm. | Genre style rules and quality floor. |
| Length | `target_chapters` | User chooses short trial, serial, longform. | Creator target length. | Product default by tier: preview 12, serial 50, longform 500. |

Public UI labels should be:

- `你说的`
- `我已整理`
- `题材经验`

Do not expose internal labels like raw prompt names, extraction, backend route names, provider names, or source-platform research names on public pages.

## Proposed Product-Facing API

Add a product-facing route to the current `/v1` backend:

```http
POST /v1/creator/dialogue/sessions/{session_id}/project
```

This route lives beside the current creator dialogue routes and internally calls current project creation logic or a backend-team bridge. The frontend should not call backend-team `/story-projects` directly.

### Request

```json
{
  "creator_id": "web_creator",
  "action": "save_draft",
  "idempotency_key": "creator-project:session-id:turn-index:snapshot-hash",
  "project_visibility": "private",
  "target_chapters": 12,
  "confirmed_overrides": {
    "title": "雾港重灯",
    "genre": "玄幻悬疑",
    "protagonist": "沈星澜，年轻档案官，被迫在公开灯码和保护幸存者之间选择。",
    "conflict": "公开灯码会引来审判，隐藏灯码会污染旧案真相。",
    "worldbuilding": "雾港、灯塔和潮汐档案共同记录失踪船队，每个灯码都会改变证词。",
    "style": "冷静、潮湿、证据感强"
  },
  "previous_session": {}
}
```

Field notes:

- `action`: `save_draft` or `save_and_preview`.
- `creator_id`: should resolve to authenticated user when login exists; fallback can be `web_creator` in demo.
- `idempotency_key`: optional. If omitted, backend computes it.
- `project_visibility`: `private` by default; `preview_link` only after share rules are ready.
- `target_chapters`: default `12` for web preview; may expand to `50` or `500` by membership/product mode.
- `confirmed_overrides`: optional manual corrections from the author. Empty is allowed if the candidate is strong.
- `previous_session`: optional serverless rehydration payload, following current turn API practice.

### Response

```json
{
  "status": "project_candidate",
  "session_id": "creator-session-123",
  "turn_index": 4,
  "project": {
    "project_id": null,
    "title": "雾港重灯",
    "genre": "玄幻悬疑",
    "protagonist": "沈星澜，年轻档案官，被迫在公开灯码和保护幸存者之间选择。",
    "conflict": "公开灯码会引来审判，隐藏灯码会污染旧案真相。",
    "worldbuilding": "雾港、灯塔和潮汐档案共同记录失踪船队，每个灯码都会改变证词。",
    "style": "冷静、潮湿、证据感强",
    "target_chapters": 12,
    "source_session_id": "creator-session-123",
    "created_from_turn_index": 4,
    "field_confidence": {
      "title": 0.78,
      "genre": 0.91,
      "protagonist": 0.72,
      "conflict": 0.84,
      "worldbuilding": 0.81,
      "style": 0.88
    },
    "input_sources": {
      "manual": ["seed", "first_choice"],
      "auto_derived": ["title", "central_tension", "opening_scene"],
      "memo_frozen": ["genre_kernel", "style_rules", "chapter_rhythm"]
    }
  },
  "preview": {
    "reader_url": null,
    "share_url_path": null,
    "first_chapter_status": "not_requested"
  },
  "questions": [],
  "blocking_reasons": []
}
```

For `action: "save_draft"` with enough fields, response status becomes `saved_project` and `project.project_id` is set.

For `action: "save_and_preview"` with a successful first chapter job, response status becomes `preview_ready`:

```json
{
  "status": "preview_ready",
  "preview": {
    "reader_url": "/story?project=story-abc123",
    "share_url_path": "/s/story-abc123-preview",
    "first_chapter_status": "queued"
  }
}
```

`first_chapter_status` can be:

- `not_requested`
- `queued`
- `draft`
- `ready`
- `blocked`

## Mapping To Backend-Team StoryProjectCreateRequest

The bridge should map the creator session to the backend-team schema as follows:

| StoryProjectCreateRequest | Mapping rule |
| --- | --- |
| `user_id` | Authenticated user id; fallback to `creator_id`. |
| `title` | `confirmed_overrides.title` -> extracted title from assistant/seed -> concise generated title, max 80 chars. |
| `genre` | `confirmed_overrides.genre` -> `setting_cards.genre_signal` -> `context.main_universe_template.genre` -> `context.story_direction.label`, max 40 chars. |
| `protagonist` | Manual character notes -> `setting_cards.protagonist_hint + character_web_hint` -> first-scene protagonist actions, max 900 chars. |
| `conflict` | Manual first choice -> `central_tension` -> `conflict_engine_hint` -> seed, max 300 chars. |
| `worldbuilding` | Manual world rule -> `world_rule_hint + opening_scene_hint` -> template opening premise, max 500 chars. |
| `style` | Manual tone -> `setting_cards.tone` -> selected writing tone -> genre style rule, max 80 chars. |
| `target_chapters` | Request value -> product default 12 -> membership/product default. Must remain 1-500. |

The bridge should also store a local audit record keyed by `session_id`:

```json
{
  "session_id": "creator-session-123",
  "project_id": "story-abc123",
  "idempotency_key": "creator-project:...",
  "snapshot_hash": "sha256...",
  "turn_index": 4,
  "field_sources": {},
  "created_at": "2026-06-12T00:00:00Z"
}
```

This audit record is backend-facing only. Do not render it on `/create`.

## Idempotency

Default idempotency key:

```text
creator-project:{session_id}:{turn_index}:{sha256(setting_cards + latest assistant.story_text + confirmed_overrides)}
```

Rules:

1. Repeating the same request returns the same project and status.
2. If the same session already has a saved project and no explicit `save_new_version` action exists, return the existing project.
3. If the dialogue changed after a project was saved, keep the project stable and return `questions` or a `revision_candidate` only after a separate versioning decision.
4. Do not create multiple projects from double-clicks or retry storms.

## Blocking And Error States

Use typed errors and keep public copy product-facing.

| HTTP | Code | Meaning | Frontend behavior |
| --- | --- | --- | --- |
| 404 | `creator_dialogue_session_missing` | Session cannot be found and no `previous_session` was supplied. | Ask user to continue from current text or start again. |
| 400 | `creator_dialogue_project_seed_required` | No user seed and no story text. | Keep the textarea active; ask for one image/secret/choice. |
| 422 | `creator_dialogue_project_needs_confirmation` | Candidate lacks required author intent. | Ask at most one natural-language question. |
| 409 | `creator_dialogue_project_already_saved` | Saved project exists and request conflicts. | Show existing project action. |
| 409 | `story_project_limit_reached` | Backend-team quota/generation limit blocks creation. | Explain product limit; offer continue dialogue without saving. |
| 503 | `story_project_backend_unavailable` | Project backend/bridge unavailable. | Keep dialogue usable; show local unsaved draft state. |

Public routes must not mention backend, provider, route names, raw prompt, source-platform research names, or implementation details.

## Frontend UX Contract

No large frontend change is required for P15. The next frontend increment should be minimal:

1. Before first assistant story text:
   - Show only natural-language story seed input.
   - No project fields, no save button, no setup form.

2. After `opening_draft` or `project_candidate`:
   - Show two lightweight actions beside the assistant result:
     - `保存为作品`
     - `进入预览`
   - If save is blocked, the assistant asks one short question in the same dialogue composer.

3. Right rail:
   - Keep `创作推演` and `故事笔记`.
   - Field source labels stay productized as `你说的`, `我已整理`, `题材经验`.
   - Do not display raw API status, backend route names, provider names, or prompt text.

4. Preview:
   - If response has `preview.reader_url`, route there.
   - If first chapter is queued, show a calm pending state, not a technical job log.

## Backend Implementation Steps

1. Add Pydantic models under current backend creator API:
   - `CreatorDialogueProjectRequest`
   - `CreatorDialogueProjectResponse`
   - `CreatorDialogueProjectCandidate`
   - `CreatorDialogueProjectPreview`

2. Add service method:

```py
CreatorDialogueService.materialize_project(session_id: str, payload: dict) -> dict
```

3. Implement candidate extraction:
   - Load session or rehydrate from `previous_session`.
   - Compute state.
   - Build candidate fields from the source matrix.
   - Validate lengths against `StoryProjectCreateRequest`.

4. Implement project creation adapter:
   - If current backend owns story project creation, call it directly.
   - If backend-team service is separate, call through compatibility bridge.
   - Never expose backend-team internal `/story-projects` route to frontend.

5. Persist the session-to-project link:
   - Store `session_id`, `project_id`, idempotency key, snapshot hash, field sources.
   - Make repeated calls deterministic.

6. Update OpenAPI and generated frontend types only after backend route exists.

## Required Tests

Backend tests:

1. `POST /v1/creator/dialogue/sessions/{id}/project` with no seed returns `422` or `400` and one product-facing question.
2. Seed -> dialogue session -> project candidate returns all story-project fields.
3. `save_draft` creates one project and repeat request returns the same project.
4. `save_and_preview` returns `preview.reader_url` or queued preview state.
5. `previous_session` rehydration works in serverless mode.
6. Field lengths are clamped to backend-team schema limits.
7. Public response contains none of: `后端`, `接口`, `PRD`, `system prompt`, `系统提示词`, `provider`, `stub`, `endpoint`.
8. Backend-team quota conflict maps to `story_project_limit_reached`.

Frontend tests/checks after route exists:

1. `app/src/api/creator.ts` exposes `saveDialogueProject`.
2. `/create` does not show save/preview actions before assistant story text.
3. `/create` shows save/preview actions after project candidate.
4. Blocked save appends a natural-language question, not a form.
5. `check:alignment` includes the new `/v1` path.
6. `check:copy-boundary` stays green for public creator route.

Browser QA after implementation:

1. Open `/create`.
2. Enter one story seed.
3. Confirm assistant writes opening first.
4. Click `保存为作品`.
5. Confirm project saved state appears without technical copy.
6. Click `进入预览`.
7. Confirm `/story?project=...` or pending preview state opens.

## Non-Goals

P15 does not implement a new frontend.

P15 does not replace `/create` with backend-team `apps/web`.

P15 does not require users to fill title, protagonist, worldbuilding and style before seeing story text.

P15 does not make real payment, account sync, or full quality gate completion part of creator persistence.

P15 does not expose internal prompt or model reasoning on public pages.

## Completion Verdict

P15 is complete when:

- This design is accepted as the backend implementation contract.
- The handoff doc points backend developers to this file.
- Current checks still pass after documentation updates.

P16 can start after P15: implement the real market trend scanner integration boundary behind the existing `scan_market_trends` contract, keeping public pages source-neutral.
