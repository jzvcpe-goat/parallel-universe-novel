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
npm run scan:internal-terms
npm audit --audit-level=moderate
```

当前已知：`npm audit --audit-level=moderate` 仍会报告 Mastra 依赖链中的 `@ai-sdk/provider-utils` 与 `gray-matter/js-yaml` 风险；已执行非强制 `npm audit fix`，未使用 `--force`。

## 首轮已打通链路

```text
Creator Studio /create
  -> Mastra socraticCreateWorkflow
  -> FastAPI Tool Bridge /v1/tools/runtime/socratic-turn
  -> Runtime facade candidate DTO
  -> 前端展示候选正文、两个以内追问、设定沉淀、运行 trace
```

公开 GitHub Pages 链接：

- 首页：`https://jzvcpe-goat.github.io/parallel-universe-novel/`
- 创作页：`https://jzvcpe-goat.github.io/parallel-universe-novel/#/create`

当前 GitHub Pages 是静态预览模式。公开创作页会显示“创作服务待连接”，不会在没有远端 Runtime 时生成本地假正文。远端 Runtime 接通标准见 `docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md`。

远端 Runtime 部署包：

- FastAPI: `deploy/api/Dockerfile`
- Agent Runtime: `deploy/agent-runtime/Dockerfile`
- 双服务本地预览: `deploy/runtime-preview/docker-compose.yml`
- Live 验收: `npm run qa:live-runtime-browser`

## 关键文档

- `docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md`
- `docs/baseline/REUSE_AUDIT.md`
- `docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md`
- `docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md`
- `docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md`
- `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md`
