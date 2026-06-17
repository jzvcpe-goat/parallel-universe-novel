# 主宇宙模板产品化 v1 交接说明

## 交付目录

`/Users/james/Documents/PUF/workspaces/integration-harness/docs/product/main-universe-template-productization`

## 核心文件

- `MAIN_UNIVERSE_TEMPLATE_PRODUCTIZATION.md`：P0 产品化说明。
- `main-universe-templates.v1.json`：六大主宇宙冻结模板数据合同。
- `UNIVERSE_TEMPLATE_SCHEMA.md`：字段定义和建议后端模型。
- `FRONTEND_BACKEND_MAPPING.md`：页面入口、用户动作和后端接口映射。
- `UX_ACCEPTANCE_CHECKLIST.md`：移交前验收清单。
- `CONCEPT_BOARD_NOTES.md`：概念图当前作用和限制。

## 概念验收板

`/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/design-assets/main-universe-template-productization/main-universe-flow-concept-board.svg`

该图只用于流程和视觉验收，不作为字段、接口或模型能力来源。

## 本轮前端同步

- 前端 `worldTemplates` 补齐六大模板。
- 新增历史架空模板 `frontier-edict`。
- 新增科幻短篇模板 `algorithm-city`。
- 新增两个模板封面 SVG。
- 书城加入“用这个模板创作”动作。
- 创作页支持从 `?template={id}` 读取模板，并把 `main_universe_template` 写入创作会话 context。
- Studio 模板管理展示开场前提、主角缺口、第一选择点和人工确认项。

## 后端团队第一步

1. 将 `main-universe-templates.v1.json` 导入模板种子。
2. 确认六个 `id` 均能由 `GET /v1/library/worlds` 返回。
3. 确认 `POST /v1/reader/sessions` 接受六个模板对应的 `world_id`。
4. 确认 `POST /v1/creator/dialogue/sessions` 保存 `context.main_universe_template`。
5. 确认 Studio 路径的发布检查和确认发布只在创作者权限下可用。
