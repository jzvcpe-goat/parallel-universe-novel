# Creator Pivot V2 Contract

Date: 2026-07-03

Source plan: `<external-pivot-plan>`

## Product Boundary

Creator is a working-agent-operable localhost writing space. It is not a public web backend, not a request ticket queue, and not a cloud AI runtime.

The product loop is:

```text
Reader feedback
-> External Echo
-> private creative reminder
-> local writing path
-> local draft
-> publish bundle
-> author-confirmed publish or export
-> receipt
-> Reader-visible update
```

## Required Milestone Order

| Milestone | Gate | Rule |
| --- | --- | --- |
| M0 | Contract and gates | No new UI direction is accepted without this contract and the pivot gates. |
| M1 | Local data layer | Drafts, writing assets, reminders, bundles, and operation records must move to a local DB abstraction before UI claims persistence. |
| M2 | Agent action surface | Agent actions require a manifest, explicit risk, readable regions, blocked actions, and author-confirmed gates. |
| M3 | External Echo | Reader requests and votes become ReaderSignal inputs, then local CreativeReminder suggestions. |
| M4 | Publish bundles | Publishing starts with a local bundle and receipt path; external platforms are manual or adapter-contract only. |
| M5 | Atomic UI system | New UI must use shadcn/Radix primitives, semantic tokens, and component contracts. |
| M6 | Creator IA refactor | Replace request-centered IA only after M0-M4 are in place. |
| M7 | Stuck rescue | Explicitly triggered writing help only; no unsolicited always-on suggestions. |
| M8 | Migration and rollback | Existing routes retain compatibility aliases during slicing; an approved runtime flag owner may cut over only in Epic 4, and old data is migrated by repeatable runners. |
| M9 | QA | Browser and script gates prove local persistence, agent actions, echo, bundles, Reader separation, and product copy. |

## Feature Flags

Pivot V2 is off by default:

- `creatorPivotV2`
- `creatorEcho`
- `localWritingLibrary`
- `publishBundles`
- `agentSurface`
- `stuckRescue`

The flags live in `app/src/features/creator-pivot/featureFlags.ts`. During S0-S8 they are governance metadata, not a runtime cutover switch. No application runtime may import or evaluate them until Epic 4 explicitly approves a cutover owner, rollback behavior, and browser tests. Supabase `feature_flags` records remain a separate cloud capability-status contract.

## UI Information Architecture Target

The old six-entry UI can remain during migration:

```text
今日 / 读者请求 / 写作台 / 作品与支线 / 发布检查 / 创作设置
```

The target IA is:

```text
今日创作路径 / 外界回声 / 灵感到正文 / 本机写作智库 / 写作台 / 发布包 / 本机工作区
```

`/creator/requests` must become a compatibility wrapper for External Echo, not a permanent request-management center.

## Product Copy Boundary

Public product UI must not expose implementation language:

```text
Supabase, RLS, trace, provider, fallback, API key, 后端, 接口, 同步, 回写, 数据库, AI, 模型, LLM, system prompt, raw hash
```

Creator V2 public-facing copy should prefer:

```text
外界回声, 读者在意什么, 可写成下一章的反馈, 支线火花, 人物追问, 场景压力, 伏笔提醒, 创作提醒, 发布包, 本机工作区
```

## Non-Negotiable Boundaries

- Reader remains non-generative.
- Private drafts, prompts, method cards, unpublished writing assets, local provider settings, and working-agent operation records stay local.
- Cloud records may store public content, reader-facing state, publish events, and opaque local references only.
- High-risk actions require author confirmation.
- External platform posting is manual/export or adapter-contract only until separately proven.
