# Genre Constraint Rules

Purpose: this file is the human-editable source for creation-time genre constraints.

Current runtime source:

- Agent runtime implementation: `packages/agent-runtime/src/constraints.ts`
- FastAPI bridge: `backend/src/narrativeos/api/tool_bridge.py`
- Product boundary: public creator UI may show friendly writing guidance, but must not expose representative work titles, source evidence, system prompts, provider names, or raw runtime state.

## Privacy Boundary

Representative work titles from research materials are not public runtime data.

- Use `sourceRefs` such as `rwref_0013`.
- Store plaintext titles only outside the repo.
- Keep encrypted mapping in `reference-work-vault.enc.json`.
- See `REFERENCE_WORK_PRIVACY.md`.

## Constraint Object Schema

```json
{
  "id": "stable_rule_id",
  "displayName": "public genre label",
  "layer": "world | thematic | character | narrative | safety",
  "priority": 95,
  "sourceRefs": ["rwref_0013"],
  "signalTerms": [],
  "entryModeSignals": [],
  "toneSignals": [],
  "rules": [
    {
      "id": "stable_rule_id",
      "severity": "hard | soft",
      "appliesWhen": ["normalized condition labels"],
      "rule": "rule in Chinese",
      "prohibitedTerms": [],
      "replacementGuidance": [],
      "failBehavior": "allow | warn | repair | regenerate | block"
    }
  ]
}
```

## Active Profiles

Runtime source `genre-runtime-rules.v1.json` is currently version 2 and contains 21 document-derived profiles:

- `xuanhuan-xianxia` / 仙侠玄幻
- `modern-other` / 其他现代
- `modern-supernatural` / 现代都市超能
- `game-litrpg` / 游戏异界
- `system-litrpg` / 系统流
- `comedy-misfit` / 喜剧反套路
- `quick-transmigration` / 快穿逆袭
- `horror-infinite` / 恐怖无限流
- `apocalypse` / 末世
- `wuxia-historical` / 武侠历史
- `alchemy-craft` / 炼丹炼器
- `sci-fi-space` / 科幻文明
- `transmigration` / 穿越重生
- `male-farming-base` / 男频基建流
- `farming-domestic` / 种田致富
- `family-clan-group` / 群像家族
- `sweet-pet-marriage` / 甜宠先婚后爱
- `danmei-romance` / 耽美
- `chase-wife-crematorium` / 追妻火葬场
- `female-rebirth-revenge` / 女频重生复仇
- `era-female` / 年代女强

## Complete Constraint Registry

The table below is the complete document-derived P4 coverage surface. It is
kept public-safe: representative works remain in the encrypted vault, and this
document only exposes anonymous `rwref_*` IDs or `none yet` when a profile was
normalized from the 21-type corpus before a public ref was assigned.

| Profile | Layer | Source refs | Rule ids | Kernel |
| --- | --- | --- | --- | --- |
| `xuanhuan-xianxia` / 仙侠玄幻 | `world` | `rwref_0013`, `rwref_0030` | `cultivation-must-have-cost`, `xuanhuan-era-substrate` | `kernel-xuanhuan-xianxia` |
| `modern-other` / 其他现代 | `narrative` | `rwref_0004`, `rwref_0016` | `logical-evidence-required`, `modern-realism-boundary` | `kernel-modern-other` |
| `modern-supernatural` / 现代都市超能 | `world` | `rwref_0009`, `rwref_0011`, `rwref_0012` | `modern-power-substrate`, `maintain-secret-identity` | `kernel-modern-supernatural` |
| `game-litrpg` / 游戏异界 | `world` | `rwref_0034`, `rwref_0041` | `system-interface-mandatory`, `guild-and-teamplay-required` | `kernel-game-litrpg` |
| `system-litrpg` / 系统流 | `world` | `rwref_0005`, `rwref_0017` | `system-must-have-price`, `system-not-author` | `kernel-system-litrpg` |
| `comedy-misfit` / 喜剧反套路 | `thematic` | `rwref_0008`, `rwref_0010`, `rwref_0014`, `rwref_0019` | `comedy-pressure-release` | `kernel-comedy-misfit` |
| `quick-transmigration` / 快穿逆袭 | `narrative` | none yet | `bounded-world-arc`, `task-consequence-required` | `kernel-quick-transmigration` |
| `horror-infinite` / 恐怖无限流 | `world` | `rwref_0021`, `rwref_0025`, `rwref_0027` | `survival-rules-visible`, `fear-has-cost` | `kernel-horror-infinite` |
| `apocalypse` / 末世 | `world` | `rwref_0020`, `rwref_0040` | `survival-resource-cost`, `community-pressure` | `kernel-apocalypse` |
| `wuxia-historical` / 武侠历史 | `world` | `rwref_0001`, `rwref_0002` | `martial-honor-cost`, `historical-order` | `kernel-wuxia-historical` |
| `alchemy-craft` / 炼丹炼器 | `world` | `rwref_0008`, `rwref_0018`, `rwref_0032`, `rwref_0038` | `craft-process-required`, `materials-have-cost` | `kernel-alchemy-craft` |
| `sci-fi-space` / 科幻文明 | `world` | `rwref_0007`, `rwref_0015`, `rwref_0039` | `science-causal-chain`, `civilization-scale-cost` | `kernel-sci-fi-space` |
| `transmigration` / 穿越重生 | `narrative` | `rwref_0022`, `rwref_0023` | `era-adaptation-cost`, `knowledge-diff-limited` | `kernel-transmigration` |
| `male-farming-base` / 男频基建流 | `narrative` | `rwref_0004`, `rwref_0024` | `infrastructure-stepwise`, `community-labor-cost` | `kernel-male-farming-base` |
| `farming-domestic` / 种田致富 | `character` | `rwref_0031`, `rwref_0033` | `livelihood-details`, `domestic-relationship` | `kernel-farming-domestic` |
| `family-clan-group` / 群像家族 | `character` | `rwref_0028`, `rwref_0029`, `rwref_0035`, `rwref_0042` | `multi-character-agency`, `family-interest-conflict` | `kernel-family-clan-group` |
| `sweet-pet-marriage` / 甜宠先婚后爱 | `character` | `rwref_0003`, `rwref_0006`, `rwref_0036`, `rwref_0043` | `intimacy-by-action`, `marriage-contract-cost` | `kernel-sweet-pet-marriage` |
| `danmei-romance` / 耽美 | `character` | `rwref_0026`, `rwref_0044` | `relationship-agency`, `emotional-subtext` | `kernel-danmei-romance` |
| `chase-wife-crematorium` / 追妻火葬场 | `character` | `rwref_0037`, `rwref_0045` | `harm-before-repair`, `apology-has-cost` | `kernel-chase-wife-crematorium` |
| `female-rebirth-revenge` / 女频重生复仇 | `narrative` | none yet | `long-term-revenge-layout`, `household-hierarchy` | `kernel-female-rebirth-revenge` |
| `era-female` / 年代女强 | `world` | none yet | `historical-policy-substrate`, `no-fantasy-in-era-realism` | `kernel-era-female` |

Activation rule:

- Explicit user-selected genre/template labels win over generic seed keywords.
- Seed keywords may add secondary profiles, but must not override the selected genre.
- Generic mood labels such as `情感成长` must not activate a hard genre profile by themselves.
- One-off intake notes are retired from P4 execution and must not be reintroduced as hardcoded service branches.

## P4 Document-First Reset

P4 only accepts constraints that exist in the document registry. A user test case,
browser QA note, backend review suggestion, or research intake note is not an
executable product rule until the team has converted it into:

1. a `ConstraintProfile.rules[]` entry in `genre-runtime-rules.v1.json`,
2. compatible `GenreKernel` behavior when pacing or event structure is affected,
3. resolver tests that select the profile through public genre/template inputs,
4. quality-brake fixtures that prove the rule repairs, regenerates, blocks, or
   warns through the documented `failBehavior`.

Rules must describe the story substrate, reader expectation, time/setting
boundary, or character-action boundary in reusable terms. Do not encode a single
intake note as a private branch in workflow, backend service code, provider
adapter prompts, smoke payloads, or public UI copy.

### `xuanhuan-xianxia`

Display name: 仙侠玄幻

Source refs: `rwref_0013`, `rwref_0027`, `rwref_0038`

Signals:

- 修真、仙侠、玄幻、灵气、筑基、金丹、元婴、化神、飞升、功法、天劫、灵根、法宝
- 获得传承、觉醒灵根、拜师入门、秘境奇遇、重生修仙
- 逆天改命、渡劫突破、宗门大比、秘境探险、血脉觉醒

Rules:

- `cultivation-must-have-cost`: 境界突破必须绑定资源消耗、身体代价或因果债务，不得无代价升级。
- `xuanhuan-era-substrate`: 通信、交通、治疗和武器应使用世界内表达，避免现代科技词破坏时代基底。

### `modern-other`

Display name: 其他现代

Source refs: `rwref_0004`, `rwref_0016`

Signals:

- 推理、案件、证据链、心理侧写、现实主义、多线叙事、未解之谜、时空交错、都市谜案
- 接手案件、意外穿越、职场新人、身份暴露、调查悬案、旧案重启
- 紧张悬疑、逻辑推演、历史穿插、现代日常、人性考验

Rules:

- `logical-evidence-required`: 调查与推理必须依托完整证据链和合理心理侧写。
- `modern-realism-boundary`: 现代类作品中的异常能力、穿越或历史架空必须有现实、科学或历史因果支撑。

### `game-litrpg`

Display name: 游戏异界

Source refs: `rwref_0023`, `rwref_0024`, `rwref_0044`

Signals:

- 虚拟游戏、副本、公会、职业、技能树、BOSS战、装备掉落、PVP、升级、经验值、隐藏任务、攻略
- 建角、选择职业、登录舱、重生玩家、隐藏职业
- 团队协作、策略博弈、副本攻略、竞技排名、公会战争

Rules:

- `system-interface-mandatory`: 游戏异界必须明确存在可交互的系统界面、任务、奖励或数值反馈。
- `quests-drive-progress`: 剧情推进必须围绕任务目标、团队挑战、装备收集或失败惩罚展开。

### `comedy-misfit`

Display name: 喜剧反套路

Source refs: `rwref_0008`, `rwref_0010`, `rwref_0014`, `rwref_0019`, `rwref_0042`

Signals:

- 吐槽、反差、沙雕、掉马、误会、搞笑、反套路、段子、笑点、群像、现代梗
- 偷听心声、掉马现场、反派崩溃、穿越搞笑、超市经营
- 轻松、幽默、搞笑日常、反差反套路、吐槽风暴

Rules:

- `comedy-pressure-release`: 危机必须被误会、反差行动或关系掉马转化为笑点推进。

## Sync Contract

After editing this document, update:

- `packages/agent-runtime/src/constraints.ts`
- `packages/agent-runtime/src/workflows.test.ts`
- `npm run scan:reference-privacy`
- `npm run test`
