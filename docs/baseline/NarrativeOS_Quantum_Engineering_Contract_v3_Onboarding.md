# NarrativeOS Quantum Engineering Contract v3.0  
## Development Onboarding Guide / Codex Harness 基线

> **版本**: v3.0-onboarding  
> **状态**: 可交付开发基线  
> **适用对象**: Codex、后端开发、前端开发、Runtime/Agent 开发、测试与运维  
> **核心原则**: 本文不是安装命令清单，而是新开发者的语义锚点。任何开发者读完本文后，应该知道“我改的这行代码会触发架构中的哪个节点”。

---

## 0. 项目定位与不可变原则

NarrativeOS Quantum 是一个面向“平行宇宙小说”的叙事操作系统。它不是简单的 AI 写作工具，而是由 **Runtime Engine + Constraint Layer + Kernel Layer + Memory OS + Agent Pipeline + Reader/Creator 双端前端** 组成的系统。

最终产品边界：

```text
Creator Studio：本地创作端 / 作者端 / 运营权限区
Reader Web：云端阅读端 / 读者端 / 付费消费端
FastAPI：业务事实、状态、权限、支付、发布、Reader 数据主权方
Mastra：Agent 编排与执行账本，不拥有业务事实
Runtime Engine：叙事执行内核，部署在 FastAPI 侧，由 Mastra 通过 Tool Bridge 调用
Memory Service：语义记忆与向量召回，辅助但不替代 State Store
```

不可变原则：

1. **FastAPI 是业务事实主权方**：Project、Canon、BranchAsset、StateVector、Payment、User 权限都由 FastAPI 管理。
2. **Mastra 不直接连接业务 PostgreSQL**：所有业务读写必须通过 FastAPI Facade / Tool Bridge。
3. **Runtime 不内嵌在 Mastra**：Mastra 可编排 Agent，但 Narrative Runtime Engine 作为 FastAPI 侧业务内核存在。
4. **Reader Web 默认不走高成本实时生成**：Reader Web 消费已发布 StoryStateMachine、BranchAsset、EndingAsset 和缓存世界线。
5. **Creator Studio 优先本地运行**：创作成本由作者本地模型 / BYOK / 自己的模型端承担；云端只托管发布包、状态机和内容分发。
6. **AI 输出默认不是正史**：必须经过 Quality Brake 与 Author Confirm 才能进入 Canon 或 Public Branch。
7. **所有状态变更必须可追踪、可回滚、可审计**：禁止直接改写 StateVector 或 Canon 文本。

---

## 1. 架构全景图（Architecture Topology）

### 1.1 服务拓扑与端口矩阵

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Local / Cloud Frontends                       │
│                                                                      │
│  Creator Studio (Vite :5173)             Reader Web (Next.js :3000)  │
│  - 本地创作 / BYOK / Agent 调试             - 阅读 / 选择 / 支付 / 世界线 │
│  - Socratic Create UI                      - 不显示内部模型与系统词      │
│  - 15D State / Quality / Branch 编辑        - 消费发布包和缓存资产        │
└──────────────┬──────────────────────────────────────┬────────────────┘
               │ HTTP/WebSocket                       │ HTTP/JSON
               │                                      │
┌──────────────▼──────────────────────────────────────▼────────────────┐
│                         Mastra API (:4111)                            │
│  - Agent Pipeline / Workflow / Run Ledger                             │
│  - Socratic dialogue orchestration                                     │
│  - Cost Router / Provider Adapter                                      │
│  - 不直接写业务 DB，只通过 Tool Bridge 调用 FastAPI                    │
└──────────────┬───────────────────────────────────────────────────────┘
               │ Tool Bridge HTTP/JSON + Idempotency-Key
               │
┌──────────────▼───────────────────────────────────────────────────────┐
│                         FastAPI Backend (:8787)                       │
│  - Project / User / Auth / Payment / Publish                           │
│  - State Store / Canon / BranchAsset / StoryStateMachine               │
│  - Narrative Runtime Engine                                            │
│  - Quality Facade / Constraint Registry / Kernel Registry              │
└──────────────┬───────────────────────────────────────────────────────┘
               │
   ┌───────────┴─────────────────────┬──────────────────────┐
   │                                 │                      │
┌──▼────────────────┐      ┌────────▼─────────┐     ┌──────▼─────────┐
│ PostgreSQL         │      │ Redis             │     │ Vector Store    │
│ schema: app        │      │ cache / locks     │     │ PGVector/Milvus  │
│ schema: mastra     │      │ rate / idempotency│     │ NarrativeMemory  │
└────────────────────┘      └──────────────────┘     └────────────────┘
```

### 1.2 启动顺序

严格启动顺序如下。若某仓库尚未提供脚本，请先补齐脚本而不是在 README 中保留口头说明。

```text
1. PostgreSQL + Redis + Vector Store
2. FastAPI Backend (:8787)
3. Mastra API / Agent Runtime (:4111)
4. Creator Studio Vite (:5173)
5. Reader Web Next.js (:3000)
```

### 1.3 通信协议

| 调用方 | 被调用方 | 协议 | 认证 | 超时 | 幂等要求 |
|---|---|---|---|---:|---|
| Creator Studio | Mastra API | WebSocket / HTTP | User session / local token | 30s | Dialogue turn 按 `turnId` 幂等 |
| Reader Web | FastAPI | HTTP/JSON | User session | 10s | Choice / unlock / payment 必须幂等 |
| Mastra | FastAPI | HTTP/JSON Tool Bridge | Service token + `Idempotency-Key` | 30s | 所有写操作必须幂等 |
| Mastra | Memory Service | SDK / HTTP | Service token | 10s | upsert/query 可最终一致 |
| FastAPI | PostgreSQL | SQLAlchemy / ORM | internal | transaction-bound | 乐观锁 |
| FastAPI | Redis | redis client | internal | 1s | locks / cache key 幂等 |

---

## 2. 环境准备（Environment Bootstrap）

### 2.1 前置检查

执行目录：仓库根目录。

```bash
node -v
pnpm -v
python --version
docker compose version
git --version
```

最低建议：

```text
Node.js >= 18
pnpm >= 8
Python >= 3.11
PostgreSQL >= 15
Redis >= 7
```

[待补充: 仓库实际要求的 Node/Python/pnpm 精确版本。]

### 2.2 环境变量模板

建议提供以下文件：

```text
.env.example
apps/creator-studio/.env.example
apps/reader-web/.env.example
services/api/.env.example
packages/agent-runtime/.env.example
```

核心变量：

```dotenv
# FastAPI
FASTAPI_HOST=127.0.0.1
FASTAPI_PORT=8787
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/narrativeos
APP_SCHEMA=app

# Mastra
MASTRA_HOST=127.0.0.1
MASTRA_PORT=4111
MASTRA_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/narrativeos?schema=mastra
MASTRA_TOOL_BRIDGE_BASE_URL=http://127.0.0.1:8787
MASTRA_TOOL_BRIDGE_TOKEN=dev-local-token

# Memory / Vector
REDIS_URL=redis://localhost:6379/0
VECTOR_STORE=pgvector
VECTOR_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/narrativeos

# Model providers / BYOK
PROVIDER_DEFAULT=local
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
OLLAMA_BASE_URL=http://127.0.0.1:11434
VLLM_BASE_URL=http://127.0.0.1:8000

# Product flags
ENABLE_LIVE_READER_GENERATION=false
ENABLE_MASTRA_AGENT_PIPELINE=true
ENABLE_QUALITY_BRAKE=true
ENABLE_TREND_RADAR=false
```

### 2.3 推荐脚本与架构节点映射

下表是应当补齐的脚本。若项目当前没有这些命令，应由 Harness PR 新增，而不是让开发者手动猜命令。

| 命令 | 执行目录 | 启动/检查的架构节点 |
|---|---|---|
| `pnpm install` | repo root | 安装 monorepo 依赖 |
| `pnpm dev:infra` | repo root | PostgreSQL + Redis + Vector Store |
| `pnpm dev:api` | repo root | FastAPI Backend + Runtime Engine |
| `pnpm dev:agents` | repo root | Mastra API / Agent Runtime |
| `pnpm dev:creator` | repo root | Creator Studio Vite :5173 |
| `pnpm dev:reader` | repo root | Reader Web Next.js :3000 |
| `pnpm dev` | repo root | 按严格顺序启动全部本地服务 |
| `pnpm test` | repo root | 全量单元测试 |
| `pnpm test:integration` | repo root | Runtime / Tool Bridge / DB 集成测试 |
| `pnpm test:e2e` | repo root | Creator + Reader E2E |
| `pnpm debug:pipeline --run <runId>` | repo root | 查看 NarrativeRunContext 与插件 trace |
| `pnpm debug:state --project <id>` | repo root | 查看 StateSnapshot / Delta / version |
| `pnpm debug:constraints --text "<seed>"` | repo root | 调试 21 个 Constraint 激活结果 |

[待补充: 仓库当前 package.json 中已有脚本与以上脚本的映射。]

---

## 3. 核心概念速查（Core Concepts Glossary）

本节将项目领域概念转为可编码语义单元。新增代码时必须优先查本节。

### 3.1 ProjectDoctrine

```ts
interface ProjectDoctrine {
  id: string
  projectId: string
  northStar: string
  audiencePromise: string
  coreTheme: string
  forbiddenDrift: string[]
  toneBoundary: string[]
  readerExperienceGoal: string[]
  version: string
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 定义作品主控思想，限制 AI 不因短期爽点偏离作品方向 |
| 不做什么 | 不替代 Constraint，也不直接改写正文 |
| 建议路径 | `packages/shared/src/doctrine.ts`, `services/api/app/models/doctrine.py` |
| 交互 | 被 Runtime 的 Doctrine Loader 加载；被 Quality Brake 检查 `doctrine_drift` |

### 3.2 ConstraintProfile

```ts
interface ConstraintProfile {
  id: string
  displayName: string
  layer: 'world' | 'thematic' | 'character' | 'narrative' | 'safety'
  priority: number
  signalTerms: string[]
  entryModeSignals: string[]
  toneSignals: string[]
  rules: ConstraintRule[]
  replacementMap: ReplacementRule[]
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 表示某一题材/世界/叙事的约束集合，已完成 21 个类型 |
| 不做什么 | 不直接生成故事；不在 Reader Web 暴露工程文案 |
| 建议路径 | `packages/constraints/registry/*.json`, `packages/runtime/src/plugins/constraint-resolver.ts` |
| 注册方式 | `ConstraintRegistry.register(profile)`；Runtime 使用 `resolveActiveConstraints(ctx)` |
| 测试位置 | `packages/constraints/__tests__/profile-activation.spec.ts` |
| 交互 | 输入 seed / template / state 后激活；生成前和质量门禁都必须使用 |

### 3.3 ConstraintRule

```ts
interface ConstraintRule {
  id: string
  severity: 'hard' | 'soft'
  appliesWhen: string[]
  rule: string
  prohibitedTerms?: string[]
  replacementGuidance?: ReplacementRule[]
  qualityGate?: {
    lint: boolean
    semanticCheck: boolean
    repairStrategy: 'replace_term' | 'rewrite_sentence' | 'expand_process' | 'manual_review'
    failBehavior: 'allow' | 'warn' | 'repair' | 'regenerate' | 'block'
  }
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 定义具体禁用、必需、替换、修复与失败行为 |
| 不做什么 | 不允许独立于 Profile 全局乱用；比如“系统面板”在系统流可允许，在非游戏西幻禁用 |
| 建议路径 | `packages/constraints/src/rules.ts` |

### 3.4 GenreKernel / Kernel Lens

```ts
interface GenreKernel {
  id: string
  name: string
  category: string
  compatibleProfiles: string[]
  thesis: string
  antiThesis: string
  pacingModel: string
  eventStructure: string
  beatGraph: BeatNode[]
  motiveRules: string[]
  conflictRules: string[]
  climaxRules: string[]
  timeControls: {
    baseRate: number
    burst: number
    decay: number
    foreshadowPressure: number
    recoveryFloor?: number
    maxOpenLoops?: number
  }
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 将“题材”转为叙事推进模型，指导 BeatPlan / ScenePlan |
| 不做什么 | 不直接决定最终措辞；不应硬改作者原文 |
| 建议路径 | `packages/kernels/registry/*.json`, `packages/runtime/src/plugins/kernel-planner.ts` |
| 测试位置 | `packages/kernels/__tests__/kernel-plan.spec.ts` |
| 交互 | 由 Runtime 按 profile / template / doctrine 选择；输出 BeatPlan 给 Writer |

### 3.5 StateVector

```ts
interface StateVector {
  version: string
  timestamp: number
  awareness: number
  belief: number
  memory_salience: number
  attention: number
  valence: number
  arousal: number
  dominance: number
  trust: number
  tension: number
  agency: number
  coherence: number
  progression: number
  commitment: number
  obligation: number
  reciprocity: number
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 表示角色/场景/世界当前状态向量；所有数值 clamp 至合法范围 |
| 不做什么 | 不直接存储正文；不允许直接 mutating |
| 建议路径 | `packages/shared/src/state-vector.ts`, `services/api/app/schemas/state_vector.py` |
| 写入方式 | 只能通过 `StatePatch` / `DeltaOp` |
| 事务边界 | FastAPI 单事务 + version 乐观锁 |

### 3.6 StatePatch / CHANGES

```ts
interface StatePatch {
  targetId: string
  targetType: 'character' | 'scene' | 'world' | 'item' | 'faction'
  operations: DeltaOp[]
  metadata: {
    sourceAgent: AgentType
    runId: string
    confidence: number
    reason: string
  }
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 描述一次候选状态变化 |
| 不做什么 | 不直接代表正史；必须经过 Quality + Confirm |
| 建议路径 | `packages/shared/src/changes.ts`, `services/api/app/services/state_writeback.py` |
| 回滚 | 写入前使用 expectedVersion；失败返回 409 并生成 RollbackPlan |

### 3.7 ContextPack

```ts
interface ContextPack {
  projectId: string
  branchId?: string
  chapterId?: string
  doctrine: ProjectDoctrine
  activeProfiles: ConstraintProfile[]
  activeKernels: GenreKernel[]
  stateSnapshot: StateSnapshot
  relevantMemory: MemoryChunk[]
  beatPlan?: BeatPlan
  tokenBudget: {
    maxInputTokens: number
    usedInputTokens: number
  }
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 将当前任务所需最小上下文打包给 Writer / LLM |
| 不做什么 | 不允许无脑塞全书；不存储模型输出 |
| 建议路径 | `packages/runtime/src/context/context-pack-builder.ts` |
| 算法 | Graph neighborhood + MMR + recency/importance scoring |
| 缓存 | `ContextPackCache`，按 stateSnapshotVersion + kernelVersion + constraintVersion 失效 |

### 3.8 NarrativeRunContext

```ts
interface NarrativeRunContext {
  runId: string
  projectId: string
  authoringMode: 'manual_guard' | 'assistive' | 'co_write' | 'autopilot' | 'daemon'
  input: NarrativeInput
  doctrine?: ProjectDoctrine
  activeProfiles: string[]
  activeKernels: string[]
  activeConstraints: ConstraintRule[]
  stateSnapshot?: StateSnapshot
  timeState?: NarrativeTimeState
  plan?: BeatPlan
  contextPack?: ContextPack
  draft?: DraftOutput
  changes?: StatePatch[]
  quality?: QualityBrakeReport
  decision: RuntimeDecision
  cost: RuntimeCost
  trace: RuntimeTraceEvent[]
}
```

| 项 | 说明 |
|---|---|
| 做什么 | Runtime 全流程的数据载体 |
| 不做什么 | 不被直接持久化为业务事实；只可作为 run ledger / trace 持久化 |
| 建议路径 | `packages/runtime/src/types/narrative-run-context.ts` |
| 交互 | 所有 runtime plugin 输入输出都是此对象 |

### 3.9 BranchAsset

```ts
interface BranchAsset {
  id: string
  projectId: string
  sourceType: 'author_draft' | 'ai_candidate' | 'quality_rejected_version' | 'reader_choice_cluster' | 'studio_marked_if'
  title: string
  summary: string
  anchor: {
    canonChapterId: string
    divergencePoint: string
  }
  stateDeltaCandidate?: StatePatch[]
  visibility: 'private' | 'studio' | 'members' | 'public'
  qualityStatus: 'unchecked' | 'pass' | 'warning' | 'rewrite_required' | 'blocked'
  unlockPolicy: 'free' | 'member' | 'paid' | 'credits'
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 将作者创作过程、候选稿、未采用结局沉淀成可复用 IF 支线资产 |
| 不做什么 | 不是自动正史；不一定完整可继续互动 |
| 建议路径 | `packages/shared/src/branch-asset.ts`, `services/api/app/models/branch_asset.py` |
| 交互 | Reader Web 优先消费 BranchAsset，降低实时生成成本 |

### 3.10 QualityBrakeReport

```ts
interface QualityBrakeReport {
  id: string
  runId: string
  result: 'pass' | 'warn' | 'rewrite' | 'block'
  scores: {
    doctrine: number
    constraint: number
    kernel: number
    time: number
    state: number
    prose: number
    safety: number
  }
  violations: QualityViolation[]
  repairSuggestions: RepairSuggestion[]
}
```

| 项 | 说明 |
|---|---|
| 做什么 | 决定草稿是否进入 candidate / rewrite / block / canon / branch |
| 不做什么 | 不自动覆盖作者原文 |
| 建议路径 | `packages/quality/src/report.ts`, `services/api/app/services/quality_brake.py` |
| 交互 | Creator Studio 展示完整报告；Reader Web 不显示内部质量字段 |

---

## 4. 运行时流水线映射（Runtime Pipeline Mapping）

### 4.1 目录到流水线节点

| Step | 节点 | 目标目录 | 输入 | 输出 | 副作用 | 回滚 |
|---:|---|---|---|---|---|---|
| 01 | Intent Resolve | `packages/runtime/src/pipeline/01-intent-resolve/` | `NarrativeInput` | `ResolvedIntent` | 纯函数 | 丢弃 ctx |
| 02 | Doctrine Loader | `packages/runtime/src/pipeline/02-doctrine-loader/` | `ResolvedIntent + projectId` | `ProjectDoctrine` | 只读 IO | 丢弃 ctx |
| 03 | State Reader | `packages/runtime/src/pipeline/03-state-reader/` | `projectId + branchId` | `StateSnapshot` | 只读 IO | 不变更 |
| 04 | Context Builder | `packages/runtime/src/pipeline/04-context-builder/` | `StateSnapshot + Kernel + Constraints` | `ContextPack` | 读向量库/缓存 | 丢弃 pack |
| 05 | Narrative Planner | `packages/runtime/src/pipeline/05-narrative-planner/` | `ContextPack + Kernel` | `BeatPlan` | 纯函数 | 丢弃 plan |
| 06 | Generator | `packages/runtime/src/pipeline/06-generator/` | `BeatPlan + ContextPack` | `DraftOutput` | LLM IO | 丢弃 draft |
| 07 | Change Extractor | `packages/runtime/src/pipeline/07-change-extractor/` | `DraftOutput` | `StatePatch[]` | 可为 LLM IO | 丢弃 changes |
| 08 | Quality Brake | `packages/runtime/src/pipeline/08-quality-brake/` | `Draft + Patches + Snapshot` | `QualityBrakeReport` | 可读 IO | 丢弃 report |
| 09 | Confirmation | `packages/runtime/src/pipeline/09-confirmation/` | `Report + Draft` | `RuntimeDecision` | UI 阻塞点 | 作者拒绝则结束 |
| 10 | Writeback | `packages/runtime/src/pipeline/10-writeback/` | `Decision + Patch[]` | `WritebackResult` | FastAPI 事务写 | 409→RollbackPlan |

### 4.2 副作用分级

```text
Level 0: 纯函数，无 IO，无副作用
Level 1: 只读 IO，可缓存，可重试
Level 2: 外部模型 IO，成本副作用，不写业务事实
Level 3: 业务写入 IO，必须幂等、事务、可回滚
```

| 节点 | 副作用级别 | 要求 |
|---|---:|---|
| Intent Resolve | 0 | 必须 deterministic |
| Doctrine Loader | 1 | 缓存 by doctrineVersion |
| State Reader | 1 | 返回 immutable snapshot |
| Context Builder | 1 | 缓存 by contextPackKey |
| Planner | 0 | 不调用 LLM |
| Generator | 2 | 必须支持 AbortSignal、Cost Ledger |
| Extractor | 2/0 | 低价模型优先，可降级规则抽取 |
| Quality Brake | 1/2 | hard lint 先行，LLM judge 可选 |
| Confirmation | UI | 不自动确认作者文本 |
| Writeback | 3 | 必须 version optimistic lock + idempotency |

---

## 5. 编码规范（Coding Contract）

### 5.1 文件组织原则

```text
packages/
  runtime/              # Narrative Runtime pipeline
  constraints/          # 21 ConstraintProfile registry
  kernels/              # Kernel Lens registry
  quality/              # Quality Brake
  shared/               # shared TS types
  agent-runtime/        # Mastra agent workflows and tools
apps/
  creator-studio/       # Vite + shadcn + local/BYOK UI
  reader-web/           # Next.js reader UI
services/
  api/                  # FastAPI business owner
  memory/               # vector / semantic memory service
docs/
  baseline/             # read-only architecture baselines
  constraints/          # constraint extension docs
  kernels/              # kernel extension docs
  agents/               # agent docs
  runtime/              # runtime plugin docs
```

### 5.2 接口与状态不变性

必须遵守：

```ts
// 禁止
snapshot.characters[id].trust += 1

// 必须
const patch: StatePatch = createPatch({
  targetId: id,
  targetType: 'character',
  operations: [{ path: '/trust', op: 'increment', value: 0.1 }],
})
```

### 5.3 AbortSignal 与超时

所有异步节点必须支持取消：

```ts
interface RuntimeNode<I, O> {
  run(input: I, signal: AbortSignal): Promise<O>
}
```

强制超时：

| 类型 | 默认超时 |
|---|---:|
| Pure planning | 1s |
| Tool Bridge | 30s |
| Writer LLM | 10s |
| Quality LLM | 5s |
| Reader choice render | 300ms |

### 5.4 错误类型

```ts
type RuntimeError =
  | { type: 'ConstraintViolation'; ruleId: string; severity: 'hard' | 'soft' }
  | { type: 'VersionConflict'; expected: string; actual: string }
  | { type: 'ToolBridgeTimeout'; toolName: string }
  | { type: 'ProviderTimeout'; provider: string; model: string }
  | { type: 'QualityBlocked'; reportId: string }
  | { type: 'CostBudgetExceeded'; budget: number; actual: number }
```

### 5.5 Mastra / FastAPI 主权边界

- Mastra 可以写 `AgentRun`、`RunLedger`、`WorkflowTrace`。
- Mastra 不能直接写 `StateVector`、`Canon`、`Payment`、`User`。
- 所有业务状态写入必须调用 FastAPI Tool Bridge，并带 `Idempotency-Key`。
- FastAPI 拒绝写入时，Mastra 只能进入 Reviser / RollbackPlan，不得绕过。

---

## 6. 测试策略（Testing Strategy）

### 6.1 Unit Tests

| 目标 | 测试内容 | 建议路径 |
|---|---|---|
| Constraint | 21 个 profile 的激活、禁止项、override、负向提及 | `packages/constraints/__tests__/` |
| Kernel | 输入 profile 后生成正确 BeatPlan | `packages/kernels/__tests__/` |
| StateVector | clamp、精度、version 格式、patch 原子性 | `packages/shared/__tests__/state-vector.spec.ts` |
| Time Engine | 伏笔成熟、deadline pressure、事件密度 | `packages/runtime/__tests__/time-engine.spec.ts` |
| Quality Brake | hard rule block、soft warn、repair suggestion | `packages/quality/__tests__/` |

### 6.2 Integration Tests

| 链路 | 断言 |
|---|---|
| Generate → Extract → Quality | Draft 能抽取 CHANGES，Quality 能拦截违规 |
| Mastra → Tool Bridge → FastAPI | 带 idempotency key，失败能重试 |
| State Writeback | version 冲突返回 409，成功时快照递增 |
| Constraint + Kernel | 错配 profile 不污染其他类型 |
| BranchAsset | 生成后 Reader Web 可读取，重复生成不重复创建 |

### 6.3 E2E Tests

| 场景 | 标准 |
|---|---|
| Creator: 一句种子到首段正文 | P95 < 3 分钟；每轮最多 2 个问题 |
| Creator: 作者原文保护 | AI 只能生成候选 diff，不自动覆盖 canon |
| Creator: 状态写回 | 作者确认后 StateSnapshot version 增加 |
| Reader: 阅读 → 选择 → 世界线保存 | 刷新后选择结果持久 |
| Reader: 会员分支解锁 | 支付成功后 unlockPolicy 生效 |
| Security: 内部词扫描 | Reader Web 构建产物无 `system prompt`、`fallback`、`rawHash` 等 |

### 6.4 Fixtures 规范

测试数据必须使用具备业务语义的场景，不使用 `foo/bar`。

标准 fixtures 示例：

```text
fixtures/
  era_female_policy_grab.json        # 年代女强：政策抓手
  horror_rule_violation.json         # 恐怖无限流：规则违反
  game_litrpg_quest_reward.json      # 游戏异界：任务奖励
  family_clan_oath_contract.json     # 群像家族：代际契约签订
  romance_misread_repair.json        # 情感选择：误解修复
```

---

## 7. 调试与故障排查（Debug Playbook）

| 症状 | 诊断 | 解决 |
|---|---|---|
| Creator Studio HMR 后状态丢失 | 前端状态存于组件内部，未从 Runtime Snapshot 重新 hydrate | 使用 `pnpm debug:state --project <id>` 检查 snapshot；将状态迁移至 store + version hydrate |
| Agent 超时 | Provider 响应慢或 Cost Router 未降级 | `DEBUG=agent:* pnpm debug:pipeline --run <id>`；检查 ProviderAdapter timeout；启用 fallback |
| 约束全量 FAIL | Profile 匹配过宽或 activeConstraints 未按 profile 隔离 | `pnpm debug:constraints --text "<seed>"`；检查 signal terms 与 override 逻辑 |
| 状态写回丢失 | Author confirm 未触发，或 FastAPI 409 被吞掉 | `DEBUG=runtime:writeback pnpm debug:pipeline --run <id>`；检查 version expected/actual |
| 分支重复生成 | 缺少 BranchAsset requestId 幂等键或 SemanticChoiceCache 未命中 | `pnpm debug:branch --choice "<input>"`；检查 semantic hash 和 idempotency key |
| 时间一致性错误 | 角色移动/伏笔/deadline 没进入 TimeState | `DEBUG=runtime:time pnpm debug:pipeline --run <id>`；查看 timeline diff |
| Quality Brake 误杀 | hard/soft severity 错配或 allowed_context 未配置 | `pnpm debug:quality --report <id>`；添加 regression example |
| Reader 泄漏内部词 | API 响应直接透出 rawHash / provider / fallback | `pnpm scan:internal-terms`；在 DTO 层转换为用户友好字段 |
| 成本突然升高 | Reader 端 live generation 被打开或 cache miss 过高 | `pnpm debug:cost --project <id>`；检查 `ENABLE_LIVE_READER_GENERATION=false` 和 cache hit ratio |
| Tool Bridge 409 | State version 冲突 | 让 Mastra 进入 ReviserAgent；前端显示合并冲突，而不是覆盖写入 |
| Mastra Ledger 缺失 run | Agent 没有包装在 workflow span 中 | 检查 `withRunLedger(agent.run)` 是否被调用 |

建议新增调试命令：

```bash
# repo root
pnpm debug:pipeline --run <runId>
pnpm debug:state --project <projectId>
pnpm debug:constraints --text "重生回七零年代靠粮票办厂"
pnpm debug:quality --report <reportId>
pnpm debug:branch --choice "我先救那个向导"
pnpm debug:cost --project <projectId>
pnpm scan:internal-terms
```

---

## 8. UI/UX 规范（Interface Contract）

### 8.1 Design Tokens: Liquid Glass / shadcn

建议在 `apps/*/src/styles/tokens.css` 或 Tailwind theme 中定义：

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-bg-strong: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-blur: 18px;
  --glass-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  --accent-purple: #8b5cf6;
  --accent-cyan: #22d3ee;
  --accent-gold: #f5c46b;
  --danger: #ef4444;
  --success: #22c55e;
}
```

shadcn 变体建议：

```tsx
<Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl">
  ...
</Card>
```

### 8.2 Creator Studio UI

Socratic Create 三栏：

```text
左：Socratic Dialogue
  - 每轮最多 2 个问题
  - 输入 seed / 回答追问
中：Candidate Preview
  - 候选章纲 / 首段正文 / diff
  - AI 输出必须标 candidate
右：Setting Card + State
  - Doctrine / 主角缺口 / active constraints / kernel
  - 来源标签：human / memo / llm_candidate / rule_engine
```

交互规则：

- AI 不自动覆盖作者原文。
- 作者确认前，所有生成文本都是 candidate。
- 关键字段必须显示来源标签与锁定状态。
- Quality blocked 时，展示定位、修复建议和“保存草稿但不入正史”。

### 8.3 Reader Web Choice UX

选择卡触发条件：

```ts
const shouldShowChoiceCard =
  narrativePressure > 0.7 ||
  agency > 0.5 ||
  deadlinePressure > 0.6 ||
  branchOpportunity === true
```

选择等级：

| 等级 | 类型 | UI 强度 | 示例 |
|---:|---|---|---|
| L1 | 氛围选择 | 行内轻选项 | 看向窗外 / 沉默 |
| L2 | 情绪选择 | 小卡片 | 安慰 / 质问 |
| L3 | 状态选择 | 标准卡 | 救人 / 消耗资源 |
| L4 | 分支选择 | 大卡 + 后果标签 | 去圣堂 / 下矿井 |
| L5 | 命运选择 | 全宽决策区 + 二次确认 | 公开真相 / 牺牲盟友 |

选择卡结构：

```text
[动作标题]
一句话后果预告
[关系 +] [时间 -] [线索 +]
路线类型：官方路线 / 作者 IF / 热门分支 / 隐藏结局 / 个人生成
```

Reader Web 禁止显示：

```text
provider
system prompt
fallback
rawHash
StateVector 原始字段
AgentRun raw trace
CHANGES JSON
```

---

## 9. 基线与扩展（Documentation Baseline）

### 9.1 只读基线文档

以下文档为只读基线，功能 PR 不得随意修改：

```text
docs/baseline/ADR-001-architecture.md
docs/baseline/ACS-001-agent-contracts.md
docs/baseline/STATE-001-state-vector.md
docs/baseline/RUNTIME-001-pipeline.md
docs/baseline/SLO-001.md
docs/baseline/SECURITY-001.md
Codex_Development_Guidance.md
Progress_Report_Final.md
```

如需修改，必须单独发起 `docs:baseline` PR，并更新版本号与变更说明。

### 9.2 可扩展文档路径

```text
docs/constraints/
docs/kernels/
docs/agents/
docs/runtime/
docs/ui/
docs/eval/
docs/commercial/
```

### 9.3 新增约束贡献规范

新增 ConstraintProfile 必须同时更新：

1. `packages/constraints/registry/<profile>.json`
2. `docs/constraints/<profile>.md`
3. `packages/constraints/__tests__/<profile>.spec.ts`
4. `packages/quality/fixtures/<profile>_violations.json`
5. `docs/eval/benchmark/<profile>.json`

PR 未包含以上 5 项，禁止合并。

### 9.4 新增 Kernel 贡献规范

新增 Kernel 必须同时更新：

1. `packages/kernels/registry/<kernel>.json`
2. `docs/kernels/<kernel>.md`
3. `packages/kernels/__tests__/<kernel>.spec.ts`
4. `packages/runtime/__tests__/kernel-planner.spec.ts`
5. 至少 1 个 Creator Studio 示例 project fixture

---

## 10. Codex 开发自查清单

每个 PR 在提交前必须自查：

- [ ] 是否修改了正确的架构层，而不是跨层偷写？
- [ ] Mastra 是否只通过 Tool Bridge 读写业务数据？
- [ ] Runtime pipeline 是否保留输入/输出契约？
- [ ] 是否区分纯函数节点和副作用节点？
- [ ] StateVector 是否只通过 StatePatch 更新？
- [ ] 写操作是否包含 Idempotency-Key？
- [ ] 异步任务是否支持 AbortSignal？
- [ ] Reader Web 是否没有泄漏内部词？
- [ ] Creator Studio 是否保护作者原文？
- [ ] 新增 Constraint / Kernel 是否同时更新注册表、测试和文档？
- [ ] 相关 E2E 或 regression fixture 是否补齐？
- [ ] 成本路由是否避免 Reader 端高成本 live generation？
- [ ] 是否更新调试命令或 debug playbook？

---

<!--
质量自检清单：
- [x] 是否解释了每个核心概念的编码含义（而不仅是业务含义）？
- [x] 是否将命令映射到了架构节点（而非孤立步骤）？
- [x] 是否包含故障排查章节（而非仅一句“运行测试”）？
- [x] 是否定义了接口契约（输入/输出/超时/错误边界）？
- [x] 是否区分了纯逻辑节点与副作用节点（对回滚至关重要）？
- [x] 是否提供了可执行的调试命令（而非仅文字描述）？
-->
