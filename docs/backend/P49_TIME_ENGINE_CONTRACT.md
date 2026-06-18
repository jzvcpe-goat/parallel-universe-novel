# P49 Time Engine Contract

Date: 2026-06-17

## Goal

把 `GenreKernel.timeControls` 从静态配置推进到可测试的候选事件密度模拟。P49 先在 Agent Runtime 内实现 deterministic TimeEngine，用 Poisson/Hawkes 风格的事件强度、连锁爆发和伏笔压力生成 `candidateEvents`。

P57 已在 FastAPI 内补上持久化候选事件账本。P64 已在 Reader-visible public release 之后补上 production telemetry fitting。P49 仍保留为算法合同和 Agent Runtime 回放证明；FastAPI candidate 服务合同见 `P57_FASTAPI_TIME_ENGINE_SERVICE.md`，生产拟合门禁见 `P64_TIME_ENGINE_TELEMETRY_FIT_GATE.md`。

命令：

```bash
npm run check:time-engine-contract
```

## Scope

P49 是 candidate-only runtime contract：

- 输入：`GenreKernel.timeControls`、BeatPlan、`runId` seed。
- 输出：`scenePlan.candidateEvents[source=time_engine]`、`timeConsistencyReport.acceptedTimeEvents`。
- 不写 canon。
- 不写 branch。
- FastAPI 侧只允许写 `time_event_candidate_ledger_only`，不替代 canon/branch 发布链路。
- production telemetry fitting 不属于 P49；它由 P64 在 public release 后通过 `production_time_engine_fit` 处理。

## Algorithm Shape

Deterministic TimeEngine 使用：

- `baseRate`: 基础事件密度。
- `burst`: 重大事件后的短期自激发强度。
- `decay`: 自激发衰减。
- `foreshadowPressure`: 伏笔成熟度压力。
- `recoveryFloor`: 余波阶段最低事件密度。
- `maxOpenLoops`: 最大开放伏笔压力。

它不是随机模拟器；同一个 `runId` 和 kernel 必须产生相同事件序列，便于 CI、回放和 Agent Eval。

## Acceptance

1. 新增 `packages/agent-runtime/src/timeEngine.ts`。
2. 新增 `packages/agent-runtime/src/timeEngine.test.ts`。
3. `socraticCreateWorkflow` 的 runtime artifact 使用 `source: 'time_engine'` 的 candidate events。
4. Root `npm run test` 包含 `check:time-engine-contract`。
5. Artifact 不包含候选正文、secret、system prompt 或代表作品。
