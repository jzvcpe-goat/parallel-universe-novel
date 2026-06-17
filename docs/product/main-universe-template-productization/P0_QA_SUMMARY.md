# 主宇宙模板产品化 v1 QA 摘要

## 命令校验

执行目录：

`/Users/james/Documents/PUF/workspaces/integration-harness/app`

结果：

- `npx tsc --noEmit -p tsconfig.app.json`：通过。
- `npm run lint -- --max-warnings=0`：通过。
- `npm run build`：通过。
- `npm audit --audit-level=moderate`：通过，`0 vulnerabilities`。
- `main-universe-templates.v1.json`：JSON 解析通过。

备注：

- `npm run build` 提示 Browserslist 数据 6 个月未更新；这不是本轮阻塞。

## 浏览器 QA

预览地址：

`http://127.0.0.1:4173/`

### `/?qa=main-universe-p0-final`

- 旗舰宇宙《灯塔之外》可见。
- “开始阅读”CTA 可见。
- 读者路径禁露词命中：0。
- 首页可能出现章节标题作为“最近更新”信息，但不再出现正文阅读面板。

### `/library?qa=main-universe-p0`

- 六大模板全部可见：
  - 灯塔之外
  - 雨夜桥边
  - 玉京契书
  - 莲巷来信
  - 边城密诏
  - 算法城市
- “主宇宙模板专区”可见。
- “用这个模板创作”入口数量：6。
- 读者路径禁露词命中：0。

### `/create?template=frontier-edict&qa=main-universe-p0`

- 当前模板“边城密诏”可见。
- 六大模板选择列表可见。
- “需要你确认”和“平台预置”边界可见。
- Kimi/Moonshot/memo/蒸馏/参数冻结等词未在用户界面出现。

### `/story?world=algorithm-city&qa=main-universe-p0`

- “算法城市”可进入阅读页。
- “第 1 章 十一分差异”可见。
- 两个选择“公开记忆差异”和“删除异常备份”可见。
- 读者路径禁露词命中：0。

### 六模板阅读路由

以下路由均能进入阅读页，未触发“这个世界还在孵化”兜底，每个模板都有 2 个选择按钮：

- `/story?world=beacon-beyond`
- `/story?world=rain-bridge`
- `/story?world=jade-contract`
- `/story?world=lotus-lane`
- `/story?world=frontier-edict`
- `/story?world=algorithm-city`

### 选择闭环

在 `/story?world=algorithm-city&qa=main-universe-p0-choice` 点击“公开记忆差异”后：

- “已选择：公开记忆差异”可见。
- “个人分支已生成”可见。
- “选择影响”可见。

### `/studio?qa=main-universe-p0`

- “主宇宙模板”管理区可见。
- “人工确认”字段可见。
- 六大模板全部可见。

## 当前结论

P0 的产品方向、数据合同、入口映射和轻量浏览器验证已经成立，可以进入后端团队的模板种子和接口对齐开发。
