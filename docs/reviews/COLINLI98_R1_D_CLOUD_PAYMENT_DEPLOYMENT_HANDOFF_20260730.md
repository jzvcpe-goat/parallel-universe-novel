# ColinLi98 R1-D 云端、支付与部署 Handoff

**负责人：** ColinLi98

**开始条件：** PR #9 的独立审阅结束，项目负责人明确通知启动 R1-D。

**代码基线：** 从届时最新 `main` 创建新分支，不从
`codex/r1-a0-writing-workflow-integration` 继续开发。

**目标：** 把仓库已有的云端契约推进为可审阅、可回滚、可在 staging 验证的
数据库安全、支付权益和生产部署实现。

## 1. 先说清楚：Colin 后续需要写代码

R1-D 不是只审文档。Colin 后续需要：

- 编写或修订 SQL migration、RLS policy、RPC、回滚 SQL 和数据库测试。
- 编写支付订单、回调幂等、权益发放、退款/取消恢复代码和测试。
- 编写部署配置、环境变量契约、staging smoke test、监控和回滚脚本。
- 在 GitHub 为每个工作包提交独立 Draft PR，提供真实 CI 和 staging evidence。
- 处理 Reviewer 意见，但不能用文字声明代替运行证据。

生产数据库变更、真实扣款和生产部署仍属于高风险动作。Colin 可以准备代码和
staging 验证，但没有项目负责人二次确认时，不得直接作用于 production。

## 2. 工作包拆分

不得提交一个同时包含数据库、支付和部署的巨型 PR。至少拆成：

| 工作包 | 建议分支 | 交付物 |
| --- | --- | --- |
| R1-D1 Database & Security | `team/r1-d1-database-security` | migration、RLS、发布事务、External Echo、备份恢复和测试 |
| R1-D2 Payment & Entitlements | `team/r1-d2-payment-entitlements` | 订单、回调、权益、退款、sandbox 证据 |
| R1-D3 Staging & Production Readiness | `team/r1-d3-production-readiness` | 部署配置、环境契约、监控、smoke、回滚和上线门禁 |

依赖顺序：

```text
R1-D1 数据库与安全
  -> R1-D2 支付与权益
  -> R1-D3 staging 与生产准备
```

R1-D2 可以提前写合同和测试夹具，但不能在 R1-D1 的权限、审计和数据生命周期
尚未闭合时接入真实支付。R1-D3 可以提前准备 preview/staging 配置，但不得绕过
前两项验收直接宣称生产可用。

## 3. R1-D1：数据库与安全

### 3.1 先核对真实 source of truth

当前 GitHub `main` / R1-A0 checkout 只有：

```text
deploy/supabase/zero_cost_pmf_loop.sql
deploy/supabase/zero_cost_pmf_author_boundary_delta.sql
```

下列目标文件虽然被计划文档和检查脚本引用，但目前不在 GitHub 审阅基线中：

```text
deploy/supabase/zero_cost_pmf_publish_transaction.sql
deploy/supabase/zero_cost_pmf_external_echo.sql
deploy/supabase/zero_cost_pmf_publish_transaction_rollback.sql
deploy/supabase/zero_cost_pmf_external_echo_rollback.sql
scripts/fixtures/publish-transaction-bootstrap.sql
scripts/prepare-zero-cost-pmf-publish-transaction-sql.mjs
scripts/prepare-zero-cost-pmf-external-echo-sql.mjs
scripts/test-publish-transaction.mjs
scripts/test-external-echo-cloud.mjs
```

项目负责人本机的旧脏工作树中存在以上九个未跟踪候选文件，但它们不是 GitHub
evidence、不是 R0/R1-A0 的已审阅实现，也不能直接作为部署输入。当前
`package.json` 已声明 `test:publish-wp6` 和 `test:external-echo-cloud`，但干净
checkout 缺少对应 test runner；命令存在不等于测试可运行。

R1-D1 的第一个提交必须完成来源核对：

1. 由 James 通过独立临时分支或受控 patch 包提供这些候选文件；不得从脏工作树
   直接提交其他无关改动。
2. Colin 对候选 SQL 与当前 schema、脚本、文档逐项 diff。
3. 不能证明来源或行为的部分按当前合同重新实现。
4. 九个候选文件中的有效实现、对应测试和证据必须在同一 R1-D1 Draft PR 中
   变成真实可审阅对象。
5. 现有 gate 输出若写着 `database migrations are excluded`，只能视为合同门禁
   通过，不能视为 SQL 实现或运行通过。

随后审计并复用：

```text
app/src/features/creator-pivot/publishBundleAdapter.ts
docs/launch/020_BACKEND_DATABASE_SECURITY_PLAN.md
scripts/check-publish-transaction-contract.mjs
scripts/check-external-echo-cloud-contract.mjs
```

### 3.2 必须完成

1. 明确 staging 与 production Supabase project，记录 project ref，不把密钥写入
   Git、PR、日志或截图。
2. 建立 migration 顺序、前置检查、forward SQL 和 non-destructive rollback。
3. 核对并测试：
   - `works -> branches -> chapters`
   - `reader_requests`、votes、comments、highlights、reactions、questions
   - `reader_signals` 安全投影
   - `publish_events`、`publish_receipts`
   - `creator_authorizations`
   - private append-only audit events
4. RLS 必须证明：
   - 匿名 Reader 只能执行允许的公开读和受限反馈。
   - 普通登录用户不能获得作者权限。
   - 作者只能操作自己拥有或被授权的作品。
   - 跨作者、跨作品和 foreign-work 写入被拒绝。
   - 前端不能直接写 chapter、publish event 或 receipt 绕过 RPC。
5. 发布事务必须在服务端原子完成：

```text
validate PublishBundle and checksum
  -> validate author/work authorization
  -> create branch when required
  -> create chapter
  -> create publish event
  -> update linked request/signal state
  -> create authoritative PublishReceipt
```

6. 同一 idempotency key 重放不得重复发布；相同 key 不同 payload 必须拒绝。
7. 强制中断必须整笔 rollback，不能留下半个 branch/chapter/event。
8. ReaderSignal 自由文本要有字段约束、限流、反垃圾和 author moderation。
9. 增加 reader export/delete、数据库备份、恢复演练和 incident rollback 证据。
10. 验证云端不存储私密草稿、私密 CreativeReminder、写作智库正文、Agent 原始
    推理或模型凭据。

### 3.3 必跑测试

以仓库实际 script 为准，至少覆盖：

```bash
npm run test:publish-wp6
npm run test:external-echo-cloud
npm run check:publish-transaction-contract
npm run check:zero-cost-pmf-live-schema
npm run check:public-reader-bundle-boundary
npm run check:public-privacy-artifacts
npm run check:pivot
```

只有四个 SQL 文件真实进入 R1-D1 PR 后，Docker/PostgreSQL PASS 才能证明该 PR
中的 repository SQL。staging 还要单独提供：

- migration run ID 和最终 schema version
- RLS negative-case 输出
- author-to-Reader 发布 receipt
- External Echo 四来源读取证据
- rollback rehearsal
- 临时测试作品最终 hidden/removed 的清理回执

### 3.4 R1-D1 完成标准

- SQL forward/rollback、RLS 和 RPC 有独立 Reviewer。
- 本地容器和 staging 都通过。
- 无 service-role key、access token、私密正文进入 artifact。
- 生产 migration 尚未执行，或已有项目负责人针对明确 SHA 的二次批准。

## 4. R1-D2：支付与权益

### 4.1 开始前先冻结产品合同

支付 provider、商品、价格、币种、税务、退款和目标市场目前不能由 Codex 猜测。
Colin 首先提交一个短 ADR，要求项目负责人确认：

- 采用的支付 provider 和 sandbox account
- 一次性支付还是订阅
- 会员计划和实际权益
- 币种、价格、账期和退款规则
- Webhook 来源和签名验证方式
- 哪些权益即时生效，哪些需要人工处理

没有这些决定时，只能实现 provider-neutral contract 和测试，不能伪造商业配置。

### 4.2 必须完成

1. 数据对象：

```text
membership_plans
purchase_orders
billing_events
reader_entitlements
refund_events
invoice_or_receipt references
```

2. 状态机：

```text
create order
  -> provider checkout/session
  -> verified webhook
  -> idempotent billing event
  -> entitlement grant
  -> Reader entitlement refresh
  -> cancellation/refund/recovery
```

3. 安全要求：
   - 价格、商品和权益不能由浏览器提交值决定。
   - Webhook 必须验证签名、事件归属和环境。
   - 重复 webhook 不得重复发权益。
   - 乱序 webhook 不得把退款订单恢复为 active。
   - 支付成功但权益失败必须可重放恢复。
   - 退款/取消必须按已确认规则撤销或结束权益。
   - Reader 只能查看自己的订单与安全支付投影。
   - 支付凭据、完整支付载荷和敏感个人数据不得进入前端或普通日志。
4. Creator 私密草稿和创作功能不能因 Reader 付费而暴露。
5. 首轮只能连接 sandbox，不得执行真实扣款。

### 4.3 必测场景

- 正常付款一次，权益只发一次。
- 相同 webhook 重放。
- 伪造签名、错误环境、错误用户和错误金额。
- 支付完成但 entitlement write 暂时失败。
- Webhook 乱序。
- 用户取消、退款、争议和过期。
- Reader 刷新、重新登录和跨设备后权益恢复。
- 网络超时后的订单查询和幂等恢复。

### 4.4 R1-D2 完成标准

- sandbox 全链路有 provider receipt、内部 order ID、billing event 和 entitlement
  一致性证据。
- Hard Negative 测试全通过。
- 没有真实扣款。
- 没有“支付 UI 能打开”等同于“支付完成”的声明。

## 5. R1-D3：部署与生产准备

### 5.1 环境分层

至少建立：

```text
local
preview
staging
production
```

每个环境必须有独立变量、数据库、支付模式、域名和发布权限。Preview/staging
不得误连 production 数据库或 live payment key。

### 5.2 必须完成

1. 固定部署 owner、Vercel team/project、构建目录和环境变量清单。
2. 环境变量只记录名称、owner、scope 和轮换方式，不把 secret value 提交 Git。
3. 建立 migration-before-deploy / deploy / smoke / rollback 的发布顺序。
4. Reader 与 Creator 构建边界保持：
   - Reader 可公开部署且 non-generative。
   - Local Creator 的私密写作面不得作为公共云端创作服务暴露。
5. 增加：
   - staging smoke tests
   - production-safe smoke tests
   - error monitoring 和报警
   - uptime/latency/error-rate 基础观测
   - 数据库 backup schedule 和 restore rehearsal
   - release tag、commit SHA 和 deployment ID 记录
   - feature flag 和回滚 owner
6. 发布失败必须能回到前一个已知良好版本，不能重新生成正文作为恢复方式。
7. 域名、TLS、CDN、缓存和安全 headers 必须有真实检查。
8. 上线顺序：

```text
internal
  -> closed beta
  -> payment sandbox
  -> limited live cohort
  -> production promotion
```

### 5.3 R1-D3 完成标准

- staging 的数据库、支付 sandbox 和 Reader smoke 串通。
- rollback rehearsal 成功，恢复后的版本、schema 和 Reader 可见性被验证。
- 监控能捕获一次受控测试错误。
- production promotion checklist 有 owner 和二次确认点。
- 未经项目负责人确认，不执行 production deployment 或 live payment。

## 6. 项目负责人需要提供的访问条件

Colin 启动各工作包前，James 需要通过安全渠道提供或确认：

| 工作包 | 所需条件 |
| --- | --- |
| R1-D1 | staging/production Supabase project ref、组织访问权限、migration operator 身份 |
| R1-D2 | 已选 provider、sandbox 账号、产品/价格/权益决策、webhook endpoint ownership |
| R1-D3 | Vercel team/project 权限、域名/DNS owner、环境变量 owner、监控与备份 owner |

Secret value 不通过 PR、聊天正文、Markdown、截图或普通日志传递。应使用平台 Secret
Manager、密码管理器或受控邀请。

如果上述信息缺失，Colin 应把相应工作标记为 `BLOCKED: missing owner/access`，
而不是创建假的配置、占位的生产证明或自行选择商业规则。

## 7. 每个 PR 的证据要求

每个工作包的 Draft PR 必须包含：

```text
repository URL
base/head branch
full commit SHA
clean git status
changed-file scope
forward and rollback path
exact test commands
GitHub CI links
staging artifact/receipt links
Hard Negative counts
known limitations
production actions not performed
```

测试摘要必须区分：

- expected negative cases
- correctly rejected cases
- missed violations
- false positives
- conflicts

不能只写 “all passed” 或一个总成功率。

## 8. 独立审阅与合并规则

每个 R1-D PR 都必须：

1. 至少一名非实现者 Reviewer。
2. 当前最新 HEAD 的 required CI 全绿。
3. 所有讨论 resolved。
4. 没有 secret、私密正文或生产凭据泄漏。
5. 有 rollback evidence。
6. 由 James 决定是否合并。

任何 production database migration、live payment enablement 或 production deployment
还需要针对明确 commit/deployment ID 的二次人工确认。PR approval 本身不等于生产操作授权。

## 9. 交接顺序

Colin 当前先完成 PR #9 的 R1-A0 独立审核。

审核结束后：

1. 在 PR #9 提交 `APPROVED` 或 `CHANGES_REQUESTED`。
2. 等待 James 处理 R1-A0 合并决定。
3. James 通知启动 R1-D1 后，从最新 `main` 创建数据库安全分支。
4. R1-D1 合并且 staging 证据闭合后启动 R1-D2。
5. R1-D2 sandbox 证据闭合后启动 R1-D3。
6. 三个工作包都不能回写或扩大 PR #9。
