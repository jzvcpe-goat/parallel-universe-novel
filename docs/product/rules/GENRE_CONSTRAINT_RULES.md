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

### `others-modern`

Display name: 现代悬疑

Source refs: `rwref_0004`, `rwref_0016`, `rwref_0029`

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

