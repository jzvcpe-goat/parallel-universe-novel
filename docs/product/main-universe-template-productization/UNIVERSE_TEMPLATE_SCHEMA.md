# 主宇宙模板 Schema v1

## 文件

`main-universe-templates.v1.json`

这是 P0 的冻结模板合同。它不是前端展示文案的临时集合，而是后端建表、种子数据、创作引导和 Studio 管理的共同来源。

## 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | string | 合同版本。P0 为 `1.0.0`。 |
| `status` | string | 当前锁版状态。 |
| `language` | string | 内容语言。 |
| `source` | object | 模板来源说明。 |
| `globalFieldBoundary` | object | 人工、模板预置、后端生成的全局字段边界。 |
| `templates` | array | 六大主宇宙模板数组。 |

## Template 字段

| 字段 | 类型 | 来源 | 后端建议 |
| --- | --- | --- | --- |
| `id` | string | 人工锁定 | 用作 `world_id` 或模板种子 ID。 |
| `templateCode` | string | 人工锁定 | A-F，便于运营排序。 |
| `productTitle` | string | 人工确认 | 可被用户改名，但默认值进入模板。 |
| `archetype` | string | 模板预置 | 展示给创作者和 Studio。 |
| `genre` | string | 模板预置 | 用于筛选、推荐和创作默认题材。 |
| `primaryTone` | string | 模板预置 | 创作引导和质量检查输入。 |
| `toneRatio` | object | 模板预置 | 可进入 memo/评估参数，不直接给读者展示。 |
| `subgenres` | string[] | 模板预置 | 用于书城标签、创作提示和推荐召回。 |
| `readerPromise` | string | 人工+模板 | 读者端可展示。 |
| `coreSetting.worldAnchor` | string | 模板预置 | 世界观锚点。 |
| `coreSetting.coreRule` | string | 模板预置 | 世界规则，创作时必须遵守。 |
| `coreSetting.hook` | string | 模板预置 | 开场钩子。 |
| `protagonistGap` | string | 人工可改 | 主角缺口，创作时必须先于能力展示。 |
| `characterAnchors` | array | 模板预置+人工可改 | 人物功能位，不等于最终人名。 |
| `openingEvent` | string | 模板预置 | 第一章触发事件。 |
| `firstChoicePoint` | string | 模板预置 | 第一处互动选择。 |
| `chapterRhythm` | string[] | 模板预置 | 章节节奏参数。 |
| `branchEndings` | string[] | 模板预置 | 分支结局形状。 |

## 建议后端表/模型

### `universe_templates`

| 字段 | 来源 |
| --- | --- |
| `template_id` | `templates[].id` |
| `title` | `productTitle` |
| `genre` | `genre` |
| `archetype` | `archetype` |
| `status` | `locked_for_p0` / `published` / `retired` |
| `reader_promise` | `readerPromise` |
| `created_at` / `updated_at` | 后端生成 |

### `universe_template_rules`

| 字段 | 来源 |
| --- | --- |
| `template_id` | `templates[].id` |
| `primary_tone` | `primaryTone` |
| `tone_ratio` | `toneRatio` |
| `subgenres` | `subgenres` |
| `world_anchor` | `coreSetting.worldAnchor` |
| `core_rule` | `coreSetting.coreRule` |
| `hook` | `coreSetting.hook` |
| `chapter_rhythm` | `chapterRhythm` |
| `branch_endings` | `branchEndings` |

### `universe_template_slots`

| 字段 | 来源 |
| --- | --- |
| `template_id` | `templates[].id` |
| `slot_role` | `characterAnchors[].role` |
| `slot_description` | `characterAnchors[].slot` |
| `default_secret` | `characterAnchors[].secret` |
| `manual_override_allowed` | true |

### `worlds`

后端若已存在 `worlds` 或 `reader_worlds`，可由模板生成首发世界：

| 字段 | 来源 |
| --- | --- |
| `world_id` | `templates[].id` 或后端派生 |
| `template_id` | `templates[].id` |
| `title` | `productTitle` |
| `status` | `published` / `trial` |
| `genres` | `[genre, ...subgenres]` |
| `worldpack` | `coreSetting` + `characterAnchors` + `chapterRhythm` |
| `manifest` | 读者端展示所需摘要 |

## 创作请求 Context

`POST /v1/creator/dialogue/sessions` 的 `context.main_universe_template` 建议结构：

```json
{
  "id": "beacon-beyond",
  "title": "灯塔之外",
  "genre": "玄幻悬疑",
  "opening_premise": "雾海吞掉旧王朝的最后一支船队...",
  "protagonist_gap": "主角能读懂灯码，却隐瞒父亲参与封塔。",
  "first_choice_point": "公开灯码或隐藏幸存者名册。",
  "audience_promise": "5 分钟内读到第一个分歧点。"
}
```

## 字段展示规则

### 读者端可见

- 标题。
- 题材。
- 封面。
- 读者承诺。
- 开场钩子。
- 第一选择点。
- 选择后的故事影响。

### 创作者可见

- 题材结构。
- 人物功能位。
- 世界规则。
- 章节节奏。
- 平台预置项。
- 需要人工确认的设定。

### Studio 可见

- 模板来源。
- 冻结参数。
- 人工覆盖项。
- 后端接口状态。
- 发布检查状态。
- 发布门禁。

## 兼容原则

1. 任何前端入口使用的模板 ID 必须存在于 `main-universe-templates.v1.json`。
2. 读者端不得展示没有开场章节和选择点的模板。
3. 后端未接入的模板能力只能在 Studio 标记为待接入。
4. 人工确认字段不得由模型静默覆盖。
5. 模板预置字段可以作为默认值，但必须保留版本号和来源。
