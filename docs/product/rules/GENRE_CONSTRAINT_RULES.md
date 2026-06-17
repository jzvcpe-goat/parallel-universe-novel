# Genre Constraint Rules

Purpose: this file is the human-editable source for creation-time genre constraints.

Current runtime source:

- Backend implementation: `backend/src/narrativeos/services/creator_dialogue.py`
- Runtime output fields: `setting_cards.genre_constraint_facts`, `setting_cards.genre_constraints`
- Product boundary: public creator UI may show friendly writing guidance, but must not expose this document as engineering wording.

## Editing Contract

Use this file to manually revise:

- which genre signals activate a constraint
- what counts as an explicit user override
- which terms are prohibited
- which replacement expressions preserve the story function
- whether a rule is hard or soft

After manual edits, backend should sync:

- signal terms into `_genre_constraint_profile`
- constraints into `genre_constraints`
- replacements into `PROHIBITED_TERM_REPLACEMENTS`
- tests into `backend/tests/test_creator_dialogue_api.py`

## Constraint Object Schema

Each active constraint should be serialized like this:

```json
{
  "id": "stable_rule_id",
  "category": "world_substrate | tone_translation | anachronism_guardrail | non_game_tone_guardrail",
  "applies_when": ["normalized condition labels"],
  "condition": {
    "required": {},
    "observed": {}
  },
  "rule": "hard or soft rule in Chinese",
  "positive_guidance": "what to write instead",
  "prohibited_terms": [],
  "replacement_guidance": [],
  "source": "selected_context | user_text | selected_context+user_text",
  "source_evidence": {
    "selected_context": [],
    "user_text": [],
    "entry_mode": [],
    "tone": [],
    "explicit_overrides": []
  },
  "severity": "hard | soft",
  "scope": "generation",
  "user_override": "explicit_user_request_only | allowed_if_user_explicitly_requests_...",
  "applies_to": ["generation", "setting_cards", "quality_gate"]
}
```

## Activation Order

Constraints must activate in this order:

1. selected topic / template / story direction
2. user free-form story seed and answers
3. explicit user overrides

Important: a negative mention is not an override.

Examples:

- `不要县衙、仵作、宗门` means keep the ban active.
- `不要系统面板` means keep the non-game ban active.
- `我明确想写古代仵作穿越到西方玄幻地下城` means allow an ancient-Chinese identity override.
- `保留县衙办案经验` means allow an ancient-Chinese identity override.

## Global Replacement Map

These replacements are used as a final server-side quality brake when a model still emits a blocked term.

| Prohibited Term | Replacement |
|---|---|
| 系统面板 | 可见提示 |
| 玩家 | 外来者 |
| 副本奖励 | 契约报酬 |
| 打怪掉落 | 遗物回收 |
| 经验值 | 历练痕迹 |
| 等级面板 | 身份记录 |
| 职业数值 | 技艺记录 |
| 县衙 | 城邦治安厅 |
| 衙门 | 城邦治安厅 |
| 仵作 | 验尸修士 |
| 宗门 | 修士会 |
| 王朝科举 | 城邦选拔 |
| 清河县 | 边境矿城 |

Manual-edit notes:

- Replacements should preserve the story function, not merely hide the word.
- If a replacement sounds too mechanical in prose, add a better world-native phrase here.
- A replacement can be genre-specific in a future version if one global replacement is too blunt.

## Current Constraint Profile: Western Fantasy Transmigration

### Normalized Facts

| Fact | Meaning |
|---|---|
| `genre_family=western_fantasy` | The selected direction or user text points to western fantasy. |
| `entry_mode=transmigration` | The story begins with crossing into another world, waking in another world, or equivalent. |
| `tone_constraints.non_game=true` | The user or selected direction asks for non-game fiction, not game UI fiction. |
| `tone_constraints.local_webnovel_feel=true` | Local webnovel feel is requested or inferred from Chinese transmigration. |
| `user_overrides.ancient_chinese_identity=true` | User positively requests ancient Chinese identity or institutions. |

### Signal Terms

Selected-context or user-text terms that indicate western fantasy:

- 西方玄幻
- 异大陆
- 地下城
- 魔物
- 圣堂
- 公会
- 佣兵
- 深渊
- 教堂
- 魔法

Entry-mode terms:

- 穿越
- 醒来后
- 异大陆
- 前世
- 故乡
- 另一个世界

Non-game tone terms:

- 不是游戏
- 不要游戏
- 不要系统
- 没有系统
- 系统面板
- 游戏术语
- 非游戏
- 非游戏化

Local webnovel feel terms:

- 本土感
- 本土网文
- 中文网文
- 国人
- 东方处事
- 人情
- 认知差
- 小人物破局

Ancient-Chinese identity terms:

- 古代
- 县衙
- 仵作
- 宗门
- 王朝
- 科举
- 衙门
- 大理寺
- 锦衣卫
- 清河县

Positive override cues:

- 明确想写
- 想写
- 保留
- 需要
- 必须有
- 设定为
- 主角是
- 来自古代
- 古代身份
- 古代仵作
- 县衙办案经验

Negative cues:

- 不要
- 不许
- 禁止
- 禁用
- 不能出现
- 不要出现
- 别写
- 避免
- 不要默认
- 不默认

## Active Rules

### `western_fantasy_world_substrate`

Category: `world_substrate`

Applies when:

- `genre_family=western_fantasy`
- `entry_mode=transmigration`

Rule:

世界内制度、职业、地名和物件必须服从西方玄幻现实，不默认借用中式古代制度名词。

Positive guidance:

优先使用边境矿城、圣堂、佣兵团、行会、市政官、书记员、译员、修士会、魔物灾厄等能支撑西方玄幻现实感的表达。

Prohibited terms:

- 县衙
- 衙门
- 仵作
- 宗门
- 王朝科举
- 清河县

Replacement guidance:

- 县令 / 知县 -> 市政官 / 领主代理 / 治安官
- 仵作 -> 验尸修士 / 尸检书记 / 医师
- 宗门 -> 修士会 / 骑士团 / 学院 / 圣堂派系

Severity: `hard`

### `transmigration_local_feel`

Category: `tone_translation`

Applies when:

- `entry_mode=transmigration`
- `tone=local_webnovel_feel`

Rule:

本土感默认体现为中文网文节奏、主角处事方式、认知差、人性博弈和底层破局，不等于古代中国设定。

Positive guidance:

把本土感落实到主角权衡、人情账、风险规避、信息差判断和小人物向上破局，而不是改写世界制度为中式古代。

Severity: `soft`

### `no_ancient_chinese_official_default`

Category: `anachronism_guardrail`

Applies when:

- `genre_family=western_fantasy`
- `entry_mode=transmigration`
- `explicit_ancient_chinese_identity=false`

Rule:

禁止自动生成古代中国官署、县衙、仵作、宗门、王朝科举等强时代标签。

Positive guidance:

若需要调查、尸检、组织和权力结构，改用西方玄幻世界内自洽的教会、行会、城邦、市政、佣兵、医师和书记体系。

Prohibited terms:

- 县衙
- 衙门
- 仵作
- 宗门
- 王朝
- 科举
- 大理寺
- 锦衣卫
- 清河县

Replacement guidance:

- 古代官署职业 -> 城邦 / 圣堂 / 行会职业
- 县域地名 -> 边境城 / 矿城 / 港城 / 领地
- 中式办案身份 -> 治安官 / 验尸修士 / 书记员 / 译员

User override:

Allowed only if the user positively asks for ancient-Chinese identity or institutions.

Severity: `hard`

### `no_game_ui_or_loot_terms`

Category: `non_game_tone_guardrail`

Applies when:

- `genre_family=western_fantasy`
- `tone_constraint=non_game`

Rule:

禁用系统面板、玩家、副本奖励、打怪掉落、数值职业面板等游戏化表达；地下城必须作为现实地理 / 灾厄 / 制度存在。

Positive guidance:

地下城应写成真实世界中的危险地貌、矿井、遗迹、灾厄源或制度化边境，而不是玩法界面。

Prohibited terms:

- 系统面板
- 玩家
- 副本奖励
- 打怪掉落
- 经验值
- 等级面板
- 职业数值

Replacement guidance:

- 副本 -> 地下城 / 遗迹 / 矿井 / 深井 / 禁区
- 奖励 -> 战利品 / 遗物 / 契约报酬 / 生存资源
- 职业面板 -> 身份 / 技艺 / 契约 / 训练痕迹

Severity: `hard`

## Manual Extension Template

Copy this section when adding a new genre profile.

### Constraint Profile: `<genre profile name>`

Normalized facts:

- `genre_family=`
- `entry_mode=`
- `tone_constraints.<name>=`
- `user_overrides.<name>=`

Signal terms:

- selected-context:
- user-text:
- entry-mode:
- tone:
- positive override:
- negative cue:

Active rules:

#### `<rule_id>`

Category:

Applies when:

- 

Rule:

Positive guidance:

Prohibited terms:

- 

Replacement guidance:

- 

User override:

Severity:

