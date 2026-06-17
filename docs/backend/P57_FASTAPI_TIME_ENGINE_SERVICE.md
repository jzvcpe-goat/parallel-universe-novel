# P57 FastAPI TimeEngine Service

Date: 2026-06-17

## Goal

把 P49 的 deterministic TimeEngine 从 Agent Runtime 算法证明推进到 FastAPI 的持久化候选事件服务。P57 只负责把时间事件生成、回放、读回和 `/loom` 汇总放进后端 runtime 边界，不写 canon，不写 branch，不发布读者分支。

命令：

```bash
npm run check:time-engine-contract
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/time-engine/candidates`
- `GET /v1/timeline/worldlines/{worldline_id}/time-engine`

`POST` 输入：

- `source_run_id`: 上游 runtime 或 workflow run id。
- `run_id`: 可选兼容字段。
- `project_id`: 可选项目 id。
- `kernel_id`: 可选类型内核 id。
- `active_profile_ids`: 可选约束 profile id 列表。
- `beat_plan` / `beats`: 候选节拍。

`POST` 输出：

- `status = candidate`
- `capability_mode = durable_service_contract`
- `write_scope = time_event_candidate_ledger_only`
- `time_engine_run_id`
- `candidate_events[source=time_engine]`
- `time_consistency_report`
- `density_summary`
- `rollback_plan`
- `ledger_path`
- `latest_path`

重复提交同一 worldline、kernel、beat plan 和 source run 会返回同一 `time_engine_run_id`，并标记 `idempotent_replay = true`。

## Write Boundary

P57 的唯一写入是 `time_event_candidate_ledger_only`：

- not canon
- not branch
- not public publish
- not WorldInstance durable mutation
- not production telemetry fitting

候选事件可被后续 Reader branch publish 或 Studio runtime 使用，但不能在 P57 阶段自动进入正史。

## Runtime Behavior

FastAPI service 会：

1. 读取文档核心的 `GenreKernel` 规则。
2. 根据 `kernel_id` 或 `active_profile_ids` 选择内核。
3. 从 beat plan 生成 deterministic Poisson/Hawkes-style 候选事件密度。
4. 为每个事件写入 `time`、`baseIntensity`、`hawkesBoost`、`foreshadowPressure`、`pressureTag`。
5. 生成 `time_consistency_report`。
6. 将完整记录写入 TimeEngine ledger，并刷新 worldline latest 指针。
7. 在 `/loom` 中展示 `time_engine_summary`。

## Acceptance

1. `backend/src/narrativeos/services/product_runtime.py` 存在 `plan_time_events` 和 `time_engine_snapshot`。
2. `backend/src/narrativeos/api/product_runtime.py` 暴露两个 TimeEngine endpoint。
3. `backend/tests/test_product_runtime_api.py` 覆盖持久化、幂等 replay、快照读回和 `/loom` 汇总。
4. `scripts/check-time-engine-contract.mjs` 验证 FastAPI service evidence。
5. `scripts/check-runtime-engine-completion.mjs` 不再把 TimeEngine 断点描述为缺少后端候选服务。
6. OpenAPI、generated frontend type 和 release sync manifest 同步。

## P58 Follow-Up

P58 已经把 latest TimeEngine candidate ledger 接到 Reader branch publish candidate gate：

- Reader choice 继续写 `route_choice_ledger_only`。
- TimeEngine 继续写 `time_event_candidate_ledger_only`。
- Branch publish candidate 消费 TimeEngine event ids，并写 `branch_publish_candidate_ledger_only`。

## Next Gate

下一步不是重写 TimeEngine，而是补 `P59 Database Transaction Rollback Fixture`：

- branch publish candidate 进入数据库事务草案，
- route choice、branch record、WorldInstance patch 和 TimeEngine event consumption 必须能同一事务回滚，
- production telemetry fitting 只更新 kernel 参数，不直接改作者正文。
