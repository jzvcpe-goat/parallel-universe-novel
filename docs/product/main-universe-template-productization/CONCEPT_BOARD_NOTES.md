# 概念图使用说明

## 当前作用

P0 阶段的概念图只作为“交互顺序验收板”，不再作为产品功能或后端字段的来源。

它用于确认：

- 用户从首页到书城、模板详情、阅读、创作、Studio 的顺序是否清楚。
- 读者端是否没有混入内部术语。
- 六个主要入口是否保持统一视觉语言。
- 页面层级是否符合 shadcn/ui 设计系统迁移后的结构。

## 不承担的作用

- 不作为接口定义。
- 不作为数据库字段来源。
- 不作为模型能力承诺。
- 不作为逐像素还原目标。
- 不替代可运行原型和验收测试。

## 本轮概念图

文件：

`/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/design-assets/main-universe-template-productization/main-universe-flow-concept-board.svg`

内容：

1. 首页。
2. 书城。
3. 模板详情。
4. 阅读页。
5. 创作页。
6. Studio。

## 正确交付顺序

1. 数据合同：`main-universe-templates.v1.json`
2. Schema：`UNIVERSE_TEMPLATE_SCHEMA.md`
3. 接口映射：`FRONTEND_BACKEND_MAPPING.md`
4. 产品化说明：`MAIN_UNIVERSE_TEMPLATE_PRODUCTIZATION.md`
5. UX 验收：`UX_ACCEPTANCE_CHECKLIST.md`
6. 概念图：只附在最后作为可视化验收附件
