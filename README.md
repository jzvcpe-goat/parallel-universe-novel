# 平行宇宙小说

平行宇宙小说是一个面向网文创作与互动阅读的 AI 小说平台原型。本仓库保留当前已验证的 Vite/React Creator Studio、FastAPI 业务运行时，以及新增的 Mastra Agent/Workflow 编排层。

当前工程原则：

- FastAPI 是业务事实主权方，负责运行时接口、状态预览、质量检查和后续 canon 写入边界。
- Mastra 只负责 Agent/Workflow 编排、运行 trace 与成本账本，不直接连接数据库。
- Creator Studio 以自然语言创作为主：用户先说一句故事种子，系统先写候选正文，再最多追问两个关键问题。
- 所有 AI 生成默认是 `candidate`，首轮只做 `state-preview`，不写入正史。
- 当前前端是唯一主线前端；任何外部前端并入前必须先经过审批和复用审计。

## 目录

```text
app/                     Vite + React + TypeScript 前端
backend/                 FastAPI 后端与 Tool Bridge
packages/agent-runtime/  Mastra 编排层与 mock workflow
docs/baseline/           v3 onboarding 合同与复用审计
scripts/                 本地开发、调试、扫描脚本
```

## 本地启动

```bash
npm install
npm run dev:api
npm run dev:agents
npm run dev:creator
```

默认端口：

- FastAPI: `http://127.0.0.1:8787`
- Mastra mock runtime: `http://127.0.0.1:4111`
- Creator Studio: `http://127.0.0.1:5173/create`

也可以按顺序启动：

```bash
npm run dev
```

## 验证命令

```bash
npm run test
npm --prefix app run build
npm run qa:pages-browser
npm run qa:live-runtime-browser
npm run check:runtime-deploy-readiness
npm run check:pages-live-release-gate
npm run scan:internal-terms
npm audit --audit-level=moderate
```

当前已知：`npm audit --omit=dev` 报告 7 个 high、4 个 moderate 和 1 个 low advisory。该数字本身不证明 Creator 默认路径可利用，也不构成安全放行；逐项可达性与修复归属仍待独立安全工作流处理。

## Validation
当前已用 10 个固定单场景验证两问上限、候选先行、证据评价和未确认不写正史。
浏览器 E2E 覆盖候选采用、作者修改、局部修复、人工确认、原子提交和刷新恢复。
`referenceWritingAgent` 只证明流程合同，不代表真实模型文学质量通过。
真实多模型评分、用户采纳率、留存、成本和生产上线均暂无证据。
运行：`npm run validate:creator-decision-offline`、`npm run qa:creator-decision-workbench`。
完整范围、矩阵、Rubric 与证据见 [`docs/VALIDATION.md`](docs/VALIDATION.md)。

## MVP Collaboration

当前 GitHub 分支用于协作维护本机 Creator 与 Reader MVP，不等同于生产上线声明。
贡献入口、边界和 PR 证据要求见 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`docs/launch/MVP_COLLABORATION_HANDOFF_20260721.md`](docs/launch/MVP_COLLABORATION_HANDOFF_20260721.md)。
Creator MVP 的本地验证入口是 `npm run test:creator`；Chapter 1-20 的文学证据聚合必须显式提供本机 workspace，例如 `CREATOR_WORKSPACE_PATH=/absolute/path/to/workspace.pufw.zip npm run validate:creator-literary-value-evidence:chapter-1-20`。该命令不会回退到任何个人目录。

## 已保留的首轮自然语言链路

```text
Creator Studio /create
  -> Mastra socraticCreateWorkflow
  -> FastAPI Tool Bridge /v1/tools/runtime/socratic-turn
  -> Runtime facade candidate DTO
  -> 前端展示候选正文、两个以内追问、设定沉淀、运行 trace
```

这条链路仍有工作流测试，但 `#/create` 已不是当前公开 GitHub Pages 的 Creator 入口。

公开 GitHub Pages 链接：

- 首页：`https://jzvcpe-goat.github.io/parallel-universe-novel/`

当前 GitHub Pages 是 Reader-only 静态预览。`#/create` 与 `#/studio` 已退役并重定向到 `#/library`，不会在没有远端 Runtime 时生成本地假正文。远端 Runtime 接通标准见 `docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md`。

远端 Runtime 部署包：

- FastAPI: `deploy/api/Dockerfile`
- Agent Runtime: `deploy/agent-runtime/Dockerfile`
- 双服务本地预览: `deploy/runtime-preview/docker-compose.yml`
- Live 验收: `npm run qa:live-runtime-browser`
- Pages live 门禁: `npm run check:pages-live-release-gate`

## 关键文档

- `docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md`
- `docs/baseline/REUSE_AUDIT.md`
- `docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md`
- `docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md`
- `docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md`
- `docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md`
- `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md`
