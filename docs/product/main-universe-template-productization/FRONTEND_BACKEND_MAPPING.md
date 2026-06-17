# 主宇宙模板前后端映射

## 映射原则

1. 读者端只展示已经能进入产品路径的能力。
2. 前端每个入口必须有后端字段或接口承接。
3. 未接入能力只允许在 Studio 或交接文档中出现。
4. 模板数据以 `main-universe-templates.v1.json` 为 P0 种子源。
5. 当前 app 可本地降级，但降级状态不得包装成生产能力。

## 页面到接口

| 页面 | 用户动作 | 前端数据 | 后端接口 | P0 状态 |
| --- | --- | --- | --- | --- |
| `/` | 开始阅读旗舰宇宙 | `worldTemplates[beacon-beyond]` | `GET /v1/library/worlds`、`POST /v1/reader/sessions` | 已有合同，可降级 |
| `/` | 进入书城 | `worldTemplates[]` | `GET /v1/library/worlds` 或 `GET /v1/reader/library/worlds` | 已有合同，可降级 |
| `/` | 写同题开场 | `template=beacon-beyond` | `POST /v1/creator/dialogue/sessions` | 已接创作会话 |
| `/library` | 筛选主宇宙模板 | 模板题材、标签、模式 | `GET /v1/library/worlds` | 已有合同，需后端种子补齐六模板 |
| `/library` | 阅读某模板 | `world_id` | `GET /v1/library/worlds/{world_id}`、`POST /v1/reader/sessions` | 已有合同 |
| `/library` | 用模板创作 | `template_id` | `POST /v1/creator/dialogue/sessions` | 已接 context |
| `/story?world={id}` | 进入第一章 | `worldChapters[id][0]` | `POST /v1/reader/sessions`、`GET /v1/reader/snapshot` | 已有合同，本地可降级 |
| `/story?world={id}` | 做出选择 | `choice_id` | `POST /v1/reader/continue`、`POST /v1/scene/advance` | 已有合同，本地可降级 |
| `/story?world={id}` | 查看选择影响 | `worldBranches`、`activeInstance` | `GET /v1/timeline/worldlines/{worldline_id}/loom` | 已有合同，UI 仍需逐步服务化 |
| `/create?template={id}` | 选择模板 | `main_universe_template` context | `POST /v1/creator/dialogue/sessions` | 已接前端 context |
| `/create?template={id}` | 继续对话 | `session_id`、message、context | `POST /v1/creator/dialogue/sessions/{session_id}/turns` | 已有合同 |
| `/studio` | 查看模板参数 | `worldTemplates[]` + JSON 合同 | 未来 `GET /v1/studio/templates` | P0 前端展示，后端可按 schema 接 |
| `/studio` | 发布检查 | `candidateScenes[]` | `POST /v1/quality/evaluate` | 已有合同 |
| `/studio` | 确认发布 | `candidate_id`、`target_status` | `POST /v1/canon/commit` | 已有合同 |

## 数据字段映射

### Template 到 ReaderWorld

| Template 字段 | ReaderWorld/WorldDetail 字段 |
| --- | --- |
| `id` | `world_id` |
| `productTitle` | `title` |
| `genre` + `subgenres` | `genres` |
| `readerPromise` | `manifest.reader_promise` |
| `coreSetting` | `worldpack.core_setting` |
| `characterAnchors` | `worldpack.character_slots` |
| `chapterRhythm` | `worldpack.chapter_rhythm` |
| `branchEndings` | `worldpack.branch_endings` |

### Template 到 CreatorDialogueSession

| Template 字段 | Creator context 字段 |
| --- | --- |
| `id` | `context.main_universe_template.id` |
| `productTitle` | `context.main_universe_template.title` |
| `genre` | `genre` 和 `context.main_universe_template.genre` |
| `openingEvent` | `context.main_universe_template.opening_premise` |
| `protagonistGap` | `context.main_universe_template.protagonist_gap` |
| `firstChoicePoint` | `context.main_universe_template.first_choice_point` |
| `readerPromise` | `context.main_universe_template.audience_promise` |

### Reader Choice 到 Runtime

| 前端字段 | 后端字段 |
| --- | --- |
| `WorldChoice.id` | `choice_id` |
| `WorldChoice.label` | `freeform_intent` fallback |
| `WorldChoice.branchId` | `worldline_state.branch_id` |
| `WorldChoice.memoryWrite` | `current_state.memory` 或 `reader_snapshot.memory` |
| `WorldChoice.qualityGate` | `quality_trace` / `quality_brake` |

## P0 需要后端团队确认

1. 六个模板是否全部进入 `GET /v1/library/worlds`。
2. `GET /v1/library/worlds/{world_id}` 的 `worldpack` 是否能容纳 `coreSetting`、`characterAnchors`、`chapterRhythm`、`branchEndings`。
3. `POST /v1/reader/sessions` 是否接受六个模板 ID。
4. `POST /v1/reader/continue` 是否返回选择后的可读下一幕或可追踪状态。
5. `POST /v1/creator/dialogue/sessions` 是否保存 `context.main_universe_template`。
6. `POST /v1/scene/advance` 是否能用同一模板规则生成下一幕。
7. `POST /v1/quality/evaluate` 和 `POST /v1/canon/commit` 是否只在 Studio 路径暴露。

## 读者端禁露词

以下词不允许出现在 `/`、`/library`、`/story`：

- 后端
- PRD
- 接口
- demo
- 质量刹车
- memo
- 蒸馏
- 参数冻结
- candidate
- canon
- OpenAPI

这些词可出现在 `/studio`、交接文档、开发文档和测试报告中。

## 验证命令

```bash
npm run lint -- --max-warnings=0
npm run build
npm audit --audit-level=moderate
```

建议额外增加一次读者端禁露词检查：

```bash
rg -n "后端|PRD|接口|demo|质量刹车|memo|蒸馏|参数冻结|candidate|canon|OpenAPI" src/pages src/features/parallel-universe
```

命中不一定全错，但 `/`、`/library`、`/story` 可见文案必须为零。
