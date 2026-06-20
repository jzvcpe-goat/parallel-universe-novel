# 平行宇宙小说设计系统开发经验

## 2026-06-20 P135 Zero-Cost Reader Edge Sync Gate

P134 只是把“0 元全托管阅读端”的边界讲清楚；P135 把这条边界变成 root test
里可执行的工程门禁。

新的工程规则：

1. `keep-supabase-alive` 必须直接查询 Supabase `health_probe`，不能只请求静态
   Reader 页面。
2. 该 workflow 缺少 `SUPABASE_URL` 或 `SUPABASE_PUBLISHABLE_KEY` 时必须安全跳过，
   不能因为未配置运营密钥而让普通 CI 红掉。
3. keep-alive 只能使用公开读取所需的 Supabase 配置，不得出现 service-role、writer
   password、AI provider key 或云端写作 API。
4. `.env.local.sync` 和 `backups/` 必须保持 Git ignored；密钥备份只进入可信密码
   管理器或加密个人存储。
5. public frontend 与 keep-alive workflow 一起扫描，防止 `/api/generate`、`/api/write`
   或模型 key 重新进入 Reader 云端路径。

验证命令：

```bash
npm run check:zero-cost-reader-edge-sync
npm run test
```

## 2026-06-20 P134 Zero-Cost Reader Edge Sync Runbook

“0 元全托管阅读端”不是把 AI 运行时搬到 Vercel/Supabase，而是把云端边界收窄为：
静态 Reader Web、公开读取、数据库存储和健康验证。写作、生成、改写、续写都留在用户
自己的边缘端设备。

新的工程规则：

1. Reader Web 云端不得新增 `/api/generate`、`/api/write`、AI API key 或读者触发 AI
   的入口。
2. Supabase 保活必须直接查 `health_probe`；只 curl Vercel HTML 不算数据库保活。
3. GitHub scheduled workflow 本身也可能因 public repo 60 天无活动被禁用，所以保活
   只能作为 best-effort，月度检查要手动 dispatch 或有意做一次维护提交。
4. `.env.local.sync` 是 writer 密码和 Supabase publishable key 的单点故障；它必须
   离开 Git/Vercel，但也必须进入可信密码管理器或加密备份。
5. `novels_history` 是恢复材料，不是一键回滚。恢复章节时要用 SQL 查旧内容，人工把
   `old_content` 覆盖回 `novels.content`。

落地文档：

```bash
docs/backend/P134_ZERO_COST_READER_EDGE_SYNC_RUNBOOK.md
```

## 2026-06-20 P133 Operator Assignment Transition Fixture

P132 证明了 operator assignment 证据链与当前 release head 一致，但还没有证明：
当部署者真的提供非 secret 的 service id、origin 和 provider-secret-store 确认后，
系统会从 assignment intake 正确推进到 remote health evidence intake，而不会把
fixture readiness 当成 live runtime。

新的工程规则：

1. 过渡验证必须使用临时 env 文件和临时 assignment target，不写
   `deploy/runtime-production/remote-assignment.local.json`。
2. P133 只证明 P117 ready -> P116 apply -> P75 pending health -> P121 下一目标为
   `remote-health-evidence-intake`，不创建远程服务、不设置 GitHub variables、不存储
   provider secrets、不 promote live runtime。
3. 任何新增 release artifact 必须同时进入 package script、root `npm run test`、
   Pages upload、Pages content gate、P16/P43/P107 文档矩阵和 release sync manifest。
4. P133 必须在 P132 current-head coherence 之后、P115 runtime image local-smoke
   artifact content gate 之前运行。
5. P133 artifact 只保留 gate/status/decision/boundary 证明，不输出 service id、origin、
   prompt plumbing、profile/kernel ids、`sourceRefs` 或 private reference material。

验证命令：

```bash
npm run check:operator-assignment-transition-fixture
npm run check:operator-assignment-transition-fixture-artifact
npm run check:ci-artifact-content-coverage
npm run test
```

## 2026-06-20 P123 Fixture-Isolation Source Coherence

P132 修完 current-head 后，又暴露出一个更细的同类问题：P123 可以读取最新 P121，
但同时引用较早的 P122 fixture-isolation artifact。这样 selected goal 仍然正确，
却不能证明“fixture 没有回流”这件事就是针对当前 P121/P120 证明的。

新的工程规则：

1. P123 不能只检查 P122 的 `selectedNextGoal`，还必须检查 P122 的
   `sourceEvidence.loopNextGoalLedger.file` 等于当前 P121 artifact。
2. P123 也必须检查 P122 的 `sourceEvidence.operatorReturnIntake.file` 等于当前
   P120 artifact。
3. P122、P123、P130、P131、P132 必须作为同一段尾部链顺序重跑；只单独重跑 P121
   会故意让 P123 失败，直到 P122 刷新。
4. 这类修正仍然不写 `remote-assignment.local.json`，不创建远程服务，不设置 GitHub
   variables，不存储 provider secrets。
5. P125/P126/P129 会故意生成 ready/follow-up fixture 来验证 env validator、apply helper
   和 env-file loader；P123 不能按 latest 读取 P117，而必须读取当前 head、当前 target
   path、`operator_env_not_supplied` 且 `readyForApply=false` 的等待证据。

验证命令：

```bash
npm run check:operator-return-fixture-isolation
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-evidence-intake-artifact
npm run check:operator-assignment-current-head-coherence
npm run test
```

## 2026-06-19 P132 Operator Assignment Current-Head Coherence

P131 让 P130 command-consistency 证明进入了 Pages artifact，但还留下一个更细的
断点：新 release head 发布后，如果只重新跑 P121，ledger 可能看起来是新的，却引用
旧 head 的 P119/P120 operator evidence。这样会让“下一步继续收 operator evidence”
这个结论本身正确，但证据链对不上当前镜像。

新的工程规则：

1. P121 生成 loop ledger 时必须读取当前 git head，并只接受当前 head 的 P119/P120
   以及当前 P113 image drift evidence。
2. P123 在包装 assignment intake 时，必须确认 P121 指向同一份当前 P120 和 P113。
3. P130 生成 command-consistency artifact 时，必须确认 P119/P121 都来自当前 head。
4. P132 在 P131 之后运行，统一验证 P72/P113/P119/P120/P121/P123/P130/P131 是否
   指向同一个 current head。
5. Pages workflow 必须上传并下载验证 `operator-assignment-current-head-coherence`；
   它不能只是本地手动检查。
6. P132 仍然不写 `remote-assignment.local.json`，不创建远程服务，不设置 GitHub
   variables，不存储 provider secrets，也不 promote live runtime。

验证命令：

```bash
npm run check:loop-next-goal-ledger
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-loop-command-consistency
npm run check:operator-assignment-loop-command-consistency-artifact
npm run check:operator-assignment-current-head-coherence
npm run test
```

## 2026-06-19 P131 Operator Assignment Command Consistency Artifact Attestation

P130 证明了 operator assignment 的命令链在 P121/P123/P129 和 handoff 包之间一致，
但如果 Pages workflow 没有上传这份证据，CI 绿灯仍然只停留在日志层。P131 把
`operator-assignment-loop-command-consistency` 变成当前 run 必须上传、下载并验证内容的
artifact gate。

新的工程标准：

1. 任何新增 release proof 只要会生成 artifact，就必须同时有上传步骤、内容 gate、
   P16/P43/P107 文档矩阵和 root test wiring。
2. P130 生成 command-consistency JSON；P131 只负责验证已上传 JSON 的 gate/status、
   checked goal、artifact pointers 和 no-write/no-deploy boundaries。
3. Pages workflow 必须在 P124 assignment-intake content gate 之后运行 P131，再进入
   runtime image local-smoke artifact gate。
4. `check:operator-assignment-loop-command-consistency-artifact` 必须进入 root
   `npm run test`，并紧跟 P130。
5. P131 artifact/attestation 不能输出 service id、origin、provider secret、prompt
   plumbing、profile/kernel ids、`sourceRefs` 或 private reference material。

验证命令：

```bash
npm run check:operator-assignment-loop-command-consistency
npm run check:operator-assignment-loop-command-consistency-artifact
npm run check:ci-artifact-content-coverage
npm run test
```

## 2026-06-19 P130 Operator Assignment Loop Command Consistency

P129 让 P117/P116 都能显式读取同一份 ignored env 文件，但 P121 loop ledger、
P123 operator intake、P118/P119 operator handoff 包裹里仍可能残留旧命令。P130
把“下一步怎么跑”也纳入 gate，防止代码已经升级、交接文本还在指向旧 SOP。

新的工程标准：

1. 当 P121 选择 `operator-assignment-evidence-intake` 时，验收命令必须使用：
   `REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local`
   + `REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true`
   + `check:remote-assignment-env-dry-run`。
2. P116 apply 命令必须同时带 `REMOTE_ASSIGNMENT_ENV_FILE=...` 和
   `REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true`。
3. P121 artifact、P123 intake packet、P129 loader 文档、P118 strict package 和
   P119 readiness packet 不能出现不同版本的 operator SOP。
4. `check:operator-assignment-loop-command-consistency` 必须在 root `npm run test`
   中位于 P129 之后、dependency audit 之前。
5. 如果未来改 operator 命令，必须同时改 P121 生成器、P123 handoff、P129 文档和
   P130 检查器，不能只改一处。

验证命令：

```bash
npm run check:loop-next-goal-ledger
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-loop-command-consistency
npm run test
```

## 2026-06-19 P129 Operator Assignment Env File Loader

P128 解决了“operator 有一个安全模板可填”的问题，但如果 P117 dry-run 和 P116 apply
仍然依赖手工 `source`，交接链还是会有 shell state 漂移：dry-run 用了一个环境，
apply 可能用了另一个环境。P129 把本地 ignored env 文件变成显式输入，P117/P116 都通过
`REMOTE_ASSIGNMENT_ENV_FILE` 加载同一份文件。

新的工程标准：

1. operator handoff 的推荐路径是：copy `.env.example` -> 填写 ignored
   `.env.local` -> `REMOTE_ASSIGNMENT_ENV_FILE=... npm run check:remote-assignment-env-dry-run`
   -> `REMOTE_ASSIGNMENT_ENV_FILE=... REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env`。
2. loader 只接受 `deploy/runtime-production/*.env.local`，且必须被 Git ignore；
   tracked `.env.example`、未知 key 和未忽略路径都必须被拒绝。
3. P117/P116 artifacts 只允许记录文件路径、key 名和 count，不允许输出 env 值、
   service id、origin、provider secret、prompt plumbing 或 reference material。
4. `check:operator-assignment-env-file-loader` 必须在 root `npm run test` 中位于
   P128 之后、dependency audit 之前。
5. 不要再把“手动 source env 文件”作为主 SOP；它只能作为本地调试知识，不能进入
   operator-facing handoff。

验证命令：

```bash
npm run check:operator-assignment-env-file-loader
npm run test
```

## 2026-06-19 P128 Operator Assignment Env Template Gate

P123-P126 已经证明了 operator assignment 的证据包、artifact attestation、
no-write validator 和 apply fixture，但真实交接仍然容易在人手处出错：如果 operator
手写 JSON 或把 secret 粘进错误文件，后面的 gate 再绿也会污染交接链。P128 把真实
operator 输入前的第一步收敛成一个可复制、可验证、local-only 的 env 模板。

新的工程标准：

1. operator 真实输入必须优先走
   `deploy/runtime-production/remote-assignment.env.example` -> ignored local env
   copy -> P117 dry-run -> P116 apply，而不是手写 JSON。
2. tracked template 只允许出现 P117/P116 接受的非 secret env key；owner/provider、
   service id 和 origin 默认留空，provider-side secret confirmation 默认 `false`。
3. `.gitignore` 必须覆盖 `remote-assignment.env.local` 和变体 local env 文件。
4. `check:operator-assignment-env-template` 必须在 root `npm run test` 中位于 P126
   之后、dependency audit 之前，防止模板和 validator/apply helper 漂移。
5. P128 artifact 只输出 key count、路径、默认值和边界 flags，不输出真实 service id、
   origin、provider credentials、prompt plumbing、raw state、private title material
   或 rule identifiers。

验证命令：

```bash
npm run check:operator-assignment-env-template
npm run test
```

## 2026-06-19 P127 Representative Work Custody Gate

P111 证明“代表作品名已加密”之后，还差一个上线证据链问题：本地 root test
知道 P111 绿了，不代表 Pages release artifact、P92 content attestation、P43
metadata gate、P107 coverage matrix 和 handoff docs 都知道这件事。P127 把
“用户与非团队成员不可见代表作品名”变成持续 custody gate。

新的工程标准：

1. 代表作品名的公开边界不只看页面输出，还要看 constraints、kernels、
   runtime registry、public refs、encrypted vault、artifacts、Pages workflow、
   P43/P92/P107/P16 和开发笔记。
2. `check:representative-work-custody` 必须在 root `npm run test` 里位于
   `check:reference-work-encryption-completion` 之后、`check:public-privacy-artifacts`
   之前。
3. Pages workflow 必须在 built Pages privacy scan 后重新生成 P111/P127 artifacts，
   并上传 `reference-work-encryption-completion` 与 `representative-work-custody`。
4. P92 必须下载并验证四类 privacy artifacts：`reference-privacy`、
   `public-projection-privacy`、`reference-work-encryption-completion`、
   `representative-work-custody`。
5. P127 artifact 只允许输出 custody counts、边界名和 redaction flags，不得输出
   title、author、decrypted mapping、sourceRef mapping、key value 或 provider payload。
6. P127 通过后不要继续叠隐私同类门禁；下一轮应回到 operator assignment /
   remote health evidence。

验证命令：

```bash
npm run scan:reference-privacy
npm run check:reference-work-encryption-completion
npm run check:representative-work-custody
npm run check:public-privacy-artifacts
npm run check:ci-artifact-content-coverage
npm run test
```

## 2026-06-19 P126 Operator Env Apply Fixture

P125 证明了 P117 的 no-write validator 能接受一组完整安全输入，也能拒绝坏输入。
但 validator 绿了不等于 apply helper 真的能写入正确结构。P126 用
`REMOTE_RUNTIME_ASSIGNMENT_FILE` 指向 `artifacts/runtime` 下的临时 fixture target，
复用 P116 真实 apply helper 跑一次安全合成输入，再跑几组坏输入。

新的工程标准：

1. “验证可接受” 和 “验证可写入” 要分开测；P125 负责 P117，P126 负责 P116。
2. apply fixture 必须写临时 target，不能写
   `deploy/runtime-production/remote-assignment.local.json`。
3. 正向 fixture 要证明 P116 可以写入 owner/provider、service id、HTTPS origin、
   provider-side secret confirmation 和当前 P72 镜像。
4. 负向 fixture 要证明缺 confirmation、placeholder origin、secret-like service id
   都不会修改临时 target。
5. 临时 target 必须在脚本结束前删除；P126 artifact 只保留 redacted 结果。
6. Root `npm run test` 的尾部顺序现在是
   `P121 -> P122 -> P123 -> P124 -> P125 -> P126 -> P128 -> dependency audit`。

验证命令：

```bash
npm run check:operator-assignment-env-apply-fixture
npm run test
```

## 2026-06-19 P125 Operator Env Validation Fixture

P124 把 operator assignment evidence intake 变成了 Pages 可验证 artifact，但
下一步不能等真实 operator 值到齐后才第一次跑 P117。否则会出现一个很隐蔽的风险：
gate 能拦截缺失值、placeholder 和 secret-like 字符串，却没有证明它也能接受一组
完整、安全、非泄露的生产形态输入。

新的工程标准：

1. 对会接受人工/外部 operator 输入的 gate，必须同时有正向 fixture 和负向 fixture。
   负向只能证明“不乱放行”，正向才能证明“真的可交付”。
2. P125 使用安全合成值验证 P117：完整 remote HTTPS origin、provider service id、
   operator owner/provider 和 provider-side secret confirmation 可以进入 ready state。
3. P125 仍然不得写 `remote-assignment.local.json`，不得创建远端服务，不得设置 GitHub
   variables，也不得保存 provider secrets；它只验证 validation boundary。
4. P125 artifact 必须继续红线过滤 service id、origin、provider prompt、source refs、
   profile/kernel id 和 reference vault 等内部信息。
5. Root `npm run test` 的尾部顺序现在是
   `P121 -> P122 -> P123 -> P124 -> P125 -> P126 -> P128 -> dependency audit`。

验证命令：

```bash
npm run check:operator-assignment-env-validation-fixture
npm run test
```

## 2026-06-19 P124 Assignment Evidence Artifact Attestation

Public Projection Privacy Audit 和 Backward Consistency Sweep 通过以后，不能只说
“隐私链绿了”。这轮又暴露了一个 release-chain 经验：P123 已经生成
`operator-assignment-evidence-intake`，但如果 Pages workflow 不上传、P43/P107 不认识、
root test 不做内容 attestation，它仍然只是本地日志，不是上线证据。

新的工程标准：

1. 新增任何 Pages release artifact，都必须同时完成 upload step、current-run
   metadata gate、download/content attestation gate、P107 content coverage matrix、
   P16/P43 handoff 文档和 root `npm run test` 链路。
2. P124 专门验证 `operator-assignment-evidence-intake` 的 JSON/Markdown 内容：head
   sha、P121 selected goal、P75/P117/P120/P123 evidence、8 个 operator evidence key、
   blocked stages 和公开边界都必须一致。
3. P43 不能只写 artifact 名字；必须列出对应 `check:*artifact` 命令。否则脚本和
   文档会再次漂移。
4. 本地 ignored `remote-assignment.local.json` 可以被准备脚本刷新镜像 tag，但不能
   进入 Git，也不能被 fixture 证据替代。

验证命令：

```bash
npm run check:public-projection-privacy
npm run check:backward-consistency-sweep
npm run check:operator-assignment-evidence-intake-artifact
npm run check:ci-artifact-content-coverage
npm run test
```

## 2026-06-19 P123 Operator Assignment Evidence Intake

P122 把 fixture 证据隔离之后，loop 的下一步不能直接跳到 remote health。当前真实
状态是 `remote-assignment.local.json` 仍缺 operator owner、provider、service id、
HTTPS origin 和 provider-side secret-store confirmation。P123 把这一步做成一份
机器可校验的 operator assignment intake，而不是继续靠口头说明。

新的工程标准：

1. `check:operator-assignment-evidence-intake` 只能在 P121 选中
   `operator-assignment-evidence-intake` 且 P122 已证明 fixture 未回流时通过。
2. P123 必须验证 P113 image drift 已清除、P108 local assignment 仍未被 Git 跟踪、
   P117 还没有完整 operator env、P75 仍指向 ignored local assignment。
3. P123 只输出安全的 JSON/Markdown handoff：需要哪些非密 env key、当前 blocker、
   下一步命令；不得写 assignment、不创建服务、不设置 GitHub variables、不保存
   provider secrets、不推进 live runtime。
4. Root `npm run test` 必须按 `P121 -> P122 -> P123 -> P124 -> P125 -> P126 -> P128 -> dependency audit`
   的顺序执行，防止 loop goal ledger 选出 assignment intake 后无人接住，也防止
   operator env validation 没有正向可交付证明。
5. 等 operator evidence 填齐后，P121 应从 `operator-assignment-evidence-intake`
   自动切换到 `remote-health-evidence-intake`；否则说明 P117/P75/P120/P121 之间
   证据没有刷新。

验证命令：

```bash
npm run check:loop-next-goal-ledger
npm run check:operator-return-fixture-isolation
npm run check:operator-assignment-evidence-intake
```

## 2026-06-19 P122 Fixture Evidence Isolation

P121 暴露了一个长链路里很容易被忽略的问题：root test 中 P81 会生成
`remote-assignment.fixture.json` 的 P75 证据，而且这个 fixture artifact 可能比
真实 `remote-assignment.local.json` 的 P75 证据更新。如果 P120 只读取“最新 P75”，
就会把 fixture 的 `remote_assignment_pending_health` 当成 operator return 状态，
从而让 P121 错误地选择 `remote-health-evidence-intake`。

这轮修正了证据选择边界：

1. P120 只读取 `assignmentPath=deploy/runtime-production/remote-assignment.local.json`
   的 P75 artifact。
2. P120 输出的 `sourceEvidence.assignmentIntake` 必须带上 `assignmentPath`，让后续
   gate 可以审计它到底读了哪份 assignment。
3. P120 artifact checker 同样要求 assignment path 是 ignored local file。
4. P122 新增 `check:operator-return-fixture-isolation`，验证 P120/P121 没有被 fixture
   artifact 带偏。
5. 如果 local assignment 仍未填完，下一步 goal 应回到
   `operator-assignment-evidence-intake`，而不是误跳到 remote health。

经验原则：fixture 只能证明“不会误上线”，不能作为上线进度证据。所有 loop goal
路由都必须引用真实 operator assignment 的证据路径。

## 2026-06-19 P121 Next Goal Ledger

P120 之后，如果继续靠口头判断“下一步做什么”，很容易又回到重复开发：
再做一个前端、再做一套规则、再做一个和已有 gate 重叠的部署脚本。P121 把
下一步目标选择本身变成机器可验证 artifact：

1. `check:loop-next-goal-ledger` 读取 P4、public projection privacy、
   backward consistency、reference privacy、P85 blocker ledger、P119/P120
   operator evidence 和 runtime completion refresh，再输出下一步 goal。
2. 当前证据显示 P120 处于 `operator_return_waiting_for_health` 时，下一步只能是
   `remote-health-evidence-intake`，不能跳到 live promotion，也不能重新做规则或
   前端。
3. Ledger 必须列出 non-goals：不合并外部前端、不重写 P4 文档外规则、不创建远端
   服务、不写 ignored assignment、不设置 GitHub runtime variables、不用 fixture
   证据宣称 live ready。
4. 这种 gate 的价值不是新增产品能力，而是防止 loop engineering 在长链路里漂移。
   后续每次完成一个 P gate，都应让下一步由证据 ledger 指向最强未完成断点。

## 2026-06-19 P120 Operator Return Intake

P119 解决的是“把什么交给部署 owner”，但部署 owner 回填之后仍需要一个单一
验收入口。P120 把 P75 assignment intake、P117 env dry-run、P113 image drift、
P85 blocker ledger、P78 activation control 和 P23 readiness 汇成 return intake：

1. `check:remote-operator-return-intake` 只判断回填状态，不写
   `remote-assignment.local.json`，不创建服务，不设置 GitHub variables，不存
   provider secrets，也不宣称 live runtime ready。
2. Return intake 只输出三类状态：等待 assignment、等待 remote health、或可进入
   strict activation gates。它不能替代 P73/P66/P23/P65/P76/P78 的严格证明。
3. `check:remote-operator-return-intake-artifact` 必须支持 local mode 和 GitHub
   current-run mode，并验证同一 Pages run 下载到的 JSON/Markdown 内容。
4. 新增 handoff/return 类 artifact 时，要同时更新 P16、P20、P43、P45、P52、
   P107、runtime activation package、runtime completion gates 和 release sync
   manifest。否则就是又造了一个孤立检查点。

## 2026-06-19 P119 Operator Readiness Packet

P118 已经把远程上线步骤组织成 strict-run package，但部署 owner 仍需要一份
更适合转交的 operator packet。P119 把 strict-run package、blocker ledger、
fill plan、runtime image evidence 和 activation evidence 合成一份可交付包：

1. `check:remote-operator-readiness-packet` 只能生成 redacted JSON/Markdown，
   不写 `remote-assignment.local.json`，不创建服务，不设置 GitHub variables，
   不存 provider secrets，不宣称 live runtime ready。
2. Packet 必须保留 `activation-control`、`live-readiness` 和 remote assignment
   blocker，不能因为“交接清楚”就把远端运行时误判为 ready。
3. `check:remote-operator-readiness-packet-artifact` 必须支持 local mode 和
   GitHub current-run mode，并验证同一 Pages run 下载到的 artifact 内容。
4. 新增 release artifact 时要同步 P43 metadata gate、P107 content coverage、
   Pages current-run content check、P16/P20/P45/P52 文档、runtime activation
   package 和 release sync manifest。缺一项都说明证据链没有闭合。

## 2026-06-19 P118 Strict-Run Package After Fill Plan

P105/P106 已经能把远程服务 assignment 变成 operator fill plan，但 fill plan
仍然只回答“要填什么”。P118 补上“严格按什么顺序跑”的执行包：

1. `check:remote-assignment-strict-run-package` 只能生成 redacted
   JSON/Markdown，不写 `remote-assignment.local.json`，不创建服务，不设置
   GitHub variables，不宣称 live runtime ready。
2. Strict-run package 必须串起 P117/P116/P75/P79/P73/P66/P23/P65/P76/P78/P85/P96，
   让 operator 的下一步从一堆 gate 变成一条可执行序列。
3. `check:remote-assignment-strict-run-package-artifact` 必须支持 local mode
   和 GitHub current-run mode，并且不能用当前开发机 ignored assignment 状态去
   重写 CI artifact 的 blocker 判断。
4. 任何新增 Pages release artifact 都必须同时进入 P43 metadata gate、P107
   content coverage、Pages current-run content check、P16/P45/P52 文档和
   release sync manifest。

## 2026-06-19 P117 Operator Dry-Run Before Apply

P116 能把 operator 提供的非 secret `REMOTE_*` 环境变量写入 ignored
`remote-assignment.local.json`。但只要有写入动作，就必须先提供 no-write
dry-run：

1. `check:remote-assignment-env-dry-run` 在无 operator env 的 CI/root test 中通过
   `operator_env_not_supplied`，不伪装远端 assignment ready。CI 自动注入的
   `REMOTE_API_SECRETS_CONFIGURED=false` 和
   `REMOTE_AGENT_SECRETS_CONFIGURED=false` 只是默认状态位，不能触发 partial
   operator-env 失败；`true` 状态位或任何 service/origin 字段才进入完整性校验。
2. operator 提供 env 时，dry-run 先检查完整性、placeholder、remote HTTPS origin、
   secret-store confirmation 和 secret-looking material。
3. dry-run artifact 只能写 redacted 证据，不能包含 service id、origin、provider
   token、prompt plumbing、reference vault、`sourceRefs`、`profile.id` 或
   `kernel.id`。
4. 之后所有会修改 ignored/local/operator state 的 helper 都要遵守同样原则：
   先 no-write preflight，再显式确认 apply。

## 2026-06-19 P106 Current-Run Artifact Context

P116 提交后，本地已经刷新了 ignored
`deploy/runtime-production/remote-assignment.local.json`，但 GitHub Pages run
里的 P105 `remote-assignment-fill-plan` artifact 是在 CI 环境生成的，CI 没有这个
本地 assignment 草稿。因此 P106 current-run 下载校验不能读取当前开发机的
ignored 文件来判断 GitHub artifact 是否应该清掉
`remote-assignment-file-present` blocker。

新的工程标准：

1. Local artifact mode 可以用本机 ignored assignment 状态判断
   `remote-assignment-file-present` 是否应被清掉。
2. GitHub current-run artifact mode 必须以下载 artifact 自身的
   `blockedStages` 为准。
3. current-run artifact attestation 是“复核当时 CI 生成的证据”，不是“用现在的
   本地 operator 文件重算证据”。
4. 任何 artifact checker 只要同时支持 local mode 和 GitHub current-run mode，
   都必须显式隔离这两种上下文。

## 2026-06-19 P116 Remote Assignment Env Apply Gate

P112 已经能生成当前镜像的 ignored assignment 草稿，但下一步仍要求 operator
手动编辑 JSON。手动编辑会制造三类风险：复制旧镜像、把 secret 值写进本地文件、
把 localhost / placeholder 当成远端 origin。P116 把这个步骤改为受控的
env apply。

新的工程标准：

1. `apply:remote-assignment-env` 只写
   `deploy/runtime-production/remote-assignment.local.json`，该文件必须继续被 Git
   忽略。
2. 写入必须显式带 `REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true`。
3. CI/root test 只运行 `check:remote-assignment-env-apply`，验证 wiring 和不写文件。
4. P116 只接受非 secret 证据：owner、provider、service id、HTTPS origin、
   provider secret-store configured boolean。
5. P116 必须拒绝 `FILL_*`、localhost、`.invalid`、`example.com`、非 HTTPS origin、
   database URL、Tool Bridge token、model key、provider token、private key、prompt、
   raw state 和 reference vault material。
6. P116 artifact 只能说明哪些字段被应用，不能输出真实 service id 或 origin。
7. P116 不替代 P75；应用后仍必须跑
   `REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake`。

验证命令：

```bash
npm run check:remote-assignment-env-apply
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true ... npm run apply:remote-assignment-env
npm run check:remote-runtime-assignment-intake
```

## 2026-06-19 P115 Runtime Image Smoke Artifact Attestation

P114 让当前 GHCR API / Agent Runtime 镜像可以被本地 smoke，但如果 CI 只把
结果留在日志里，release owner 仍然不能下载和复核证据。P115 把这个结果接入
Pages artifact 证据链。

新的工程标准：

1. Pages 必须上传 `runtime-image-local-smoke` artifact。
2. `check:runtime-image-local-smoke-artifact` 进入 root `npm run test`，并在
   CI 当前 run 中下载同名 artifact 做内容校验。
3. P115 允许 P114 在非严格模式下记录 `docker_daemon_unavailable`、
   `images_not_local` 或 `container_registry_unavailable`，但必须把原因写清楚。
4. P115 只验证 P114 的公开摘要：当前 commit、公开 GHCR image refs、health
   summary、候选正文长度、追问数量和 Tool Bridge accepted 标记。
5. P115 artifact attestation 必须避免使用 `runtime-image-local-smoke-*` 前缀，
   防止 verifier report 被错误上传成被验证的 smoke 结果。
6. P107、P43、P16 必须同时认识这个 artifact；任何一个没更新都说明证据链漂移。

验证命令：

```bash
npm run check:runtime-image-local-smoke
npm run check:runtime-image-local-smoke-artifact
npm run check:ci-artifact-content-coverage
```

## 2026-06-19 P114 Runtime Image Local Smoke Gate

P68 strict compose 在本机运行时暴露出一个真实但旁路的问题：`docker compose
--build` 会重新访问 Docker Hub 的 `python:3.11-slim` 和 `node:22-alpine`
metadata；网络 EOF 会让本地重建失败，但这不等于刚由 GitHub Actions 发布到
GHCR 的当前 API / Agent Runtime 镜像不可运行。

新的工程标准：

1. 上线前除了 P72 “镜像已发布”和 P113 “assignment 指向当前镜像”之外，还要
   有 P114 “当前 GHCR 镜像可本地运行”的 smoke gate。
2. `check:runtime-image-local-smoke` 进入 root `npm run test`，默认只做 wiring
   和 opportunistic smoke：Docker 不可用、镜像不在本地或 registry 不可用时记录
   明确 skip reason，不阻塞静态 Pages 预览。
3. 真正上线前必须跑严格模式：
   `REQUIRE_RUNTIME_IMAGE_LOCAL_SMOKE=true RUNTIME_IMAGE_LOCAL_SMOKE_PULL=true npm run check:runtime-image-local-smoke`。
4. 严格模式运行的是当前 P72 evidence 中的 GHCR image refs，不重新 build
   Dockerfile。
5. smoke 必须证明 API `/health`、Agent `/health` 和一次
   `/v1/workflows/socratic-create` Tool Bridge 链路。
6. P114 artifact 只能保存公开 image refs、health summary、候选正文长度和追问数量；
   不保存 token、candidate body、raw runtime state、provider prompt plumbing、
   `sourceRefs`、`profile.id`、`kernel.id` 或 reference vault material。

验证命令：

```bash
npm run check:runtime-image-publish-evidence
npm run check:runtime-image-local-smoke
REQUIRE_RUNTIME_IMAGE_LOCAL_SMOKE=true RUNTIME_IMAGE_LOCAL_SMOKE_PULL=true npm run check:runtime-image-local-smoke
```

## 2026-06-19 P113 Remote Assignment Image Drift Gate

P112 可以生成本地 ignored assignment 草稿，但 Git 不会追踪这个文件。推送新
commit 并发布新 GHCR image 之后，operator 本机仍可能保留上一版 image refs。
P75/P79 只检查 image repository shape，不应该承担“当前 commit 镜像一致性”
的职责。

新的工程标准：

1. `check:remote-assignment-image-drift` 进入 root `npm run test`。
2. CI 或 release 环境没有 `remote-assignment.local.json` 时，P113 只记录
   `remote_assignment_local_absent`，不阻塞静态预览发布。
3. source workspace 无 git head 时，P113 只能以 `source_workspace_no_git`
   模式证明 wiring，不伪造当前镜像。
4. release repo 中只要本地 assignment 存在，`services.api.image` 和
   `services.agent.image` 必须分别等于当前 P72 image evidence 的 API / Agent
   Runtime image refs。
5. 发现 drift 后，用
   `REMOTE_ASSIGNMENT_DRAFT_FORCE=true npm run prepare:remote-assignment-local`
   刷新草稿；不能手动复制旧 image。
6. P113 artifact 可以包含公开 GHCR image refs，但不得包含 secrets、raw state、
   provider prompt plumbing、`sourceRefs`、`profile.id`、`kernel.id`、代表作品名
   或 reference vault material。

验证命令：

```bash
npm run check:runtime-image-publish-evidence
npm run check:remote-assignment-image-drift
```

## 2026-06-19 P112 Remote Assignment Local Draft Preparation

P111 证明代表作品名已经进入 encrypted vault / anonymous refs 的完成态后，
下一步不能继续叠加同类隐私门禁，而要推进远程 Runtime 上线断点。P87/P105
已经能告诉 operator 要填什么，但仍要求人手动复制模板、寻找当前 GHCR image
ref。这个人工步骤容易把旧镜像、fixture 或占位符当成生产证据。

新的工程标准：

1. `prepare:remote-assignment-local` 只生成被 Git 忽略的
   `deploy/runtime-production/remote-assignment.local.json`。
2. 生成器只填当前 P72 runtime image evidence 中的 API / Agent image refs；
   owner、provider、service id、origin 全部保持 `FILL_*`。
3. `providerSecretsConfigured` 必须保持 `false`，直到 operator 在 provider
   secret store 完成真实配置。
4. `check:remote-assignment-draft-prep` 必须是 read-only，并进入 root
   `npm run test`；它证明 helper 可用，但不能写 local assignment。
5. source workspace 不是 git checkout 时，read-only check 只能证明 wiring
   和不写文件；真正生成 image-filled draft 必须在 release repo 或显式
   `RUNTIME_IMAGE_HEAD_SHA` 下执行。
6. 生成出的 local draft 必须继续让 P75/P79 返回 incomplete/blocker 状态，
   不能误清 live runtime blockers。
7. P91/P93 必须接受 `remote_assignment_schema_incomplete` 作为 P112 草稿证据，
   但只有在 local entry 仍然 blocked 且 artifact 不包含 assignment 内容时才接受。
8. P105/P106/P85 必须允许 P112 草稿清掉 `remote-assignment-file-present`，但必须继续
   保留 assignment health、origin、live readiness、trace、cutover 和 activation
   blockers。
9. local assignment 不得入库，也不得包含 database URL、Tool Bridge token、
   模型 key、provider API token、private key、system prompt、raw state 或
   reference vault material。

验证命令：

```bash
npm run check:remote-assignment-draft-prep
npm run prepare:remote-assignment-local
npm run check:remote-assignment-image-drift
REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-runtime-assignment-intake
REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-assignment-execution-pack
npm run check:remote-assignment-local-boundary
```

## 2026-06-19 P111 Representative Work Encryption Completion Gate

P17/P18/P80/P83 已经把代表作品名从 kernel、constraints、runtime registry、
public refs、GitHub Pages build 和 artifact 中移出，并用 encrypted vault 与
匿名 `rwref_*` 保留团队内部可追溯性。但“已经加密”不能只靠分散脚本来推断，
否则下一轮 loop engineering 很容易又问一遍同一个问题。

新的工程标准：

1. 代表作品名完成态必须由一个聚合 gate 证明：
   `check:reference-work-encryption-completion`。
2. `GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md` 和
   `genre-runtime-rules.v1.json` 只能出现匿名 `rwref_*`，不能出现书名号、
   `workTitle`、`authorName` 或 source evidence 字段。
3. `reference-work-public-refs.json` 只能暴露 `{ "id": "rwref_0000" }`；
   `reference-work-vault.enc.json` 只能暴露 AES-256-GCM 密文字段和计数。
4. 本地/team key 可用于泄漏扫描，但所有 artifact 仍必须 redacted，不得写入
   title、author、decrypted mapping、key value、provider prompt。
5. P111 必须进入 root `npm run test`，作为“代表作品名任何非团队成员不可见”的
   完成态门禁。
6. P111 通过后，下一轮 goal 应转向远程 live runtime assignment 和 runtime
   health evidence，而不是继续叠加同类隐私门禁。

验证命令：

```bash
npm run check:reference-work-encryption-completion
npm run test
```

## 2026-06-18 P110 Runtime Placeholder Sentinel Guard

P87 会生成 operator 可复制的 assignment 模板，里面故意使用 `FILL_*`
占位。如果 P75/P79/P109 只识别 `<...>`，`https://FILL_API_HOST` 就可能被
误判为“远程 HTTPS origin”，导致上线证据看起来比真实状态更成熟。

新的工程标准：

1. 占位识别必须覆盖 `<...>`、`FILL_*`、`REPLACE_ME`、`YOUR_*`、`TODO_*`。
2. P75/P79/P109 使用同一类占位边界：模板值不能作为 service id、origin、
   assignment evidence 或 GitHub repository variable。
3. `check:runtime-placeholder-sentinel` 必须进入 root `npm run test`，并用
   临时 `FILL_*` fixture 证明 P75 返回 `remote_assignment_incomplete`、P79
   返回 `assignment_execution_incomplete`。
4. 这个 gate 不减少真实远程服务 blocker，只防止模板被误当成生产证据。
5. P110 会生成临时 `remote-assignment-placeholder-sentinel.fixture.json`，它可能随
   P79 execution-pack 进入 CI artifact bundle。P93 artifact checker 必须接受它，
   但只能在它保持 `blocked + assignment_execution_incomplete` 时接受。

验证命令：

```bash
npm run check:runtime-placeholder-sentinel
npm run test
```

## 2026-06-18 P109 GitHub Runtime Variable Boundary Guard

P108 保护的是被忽略的本地 operator assignment 文件；P109 保护的是 GitHub
repository variables。两者必须同时存在：本地文件不能入库，远端 repo vars
也不能变成 secret 存储面。

新的工程标准：

1. GitHub repository variables 只允许公开 runtime origin、remote service id
   和 secret-store 已配置的布尔 attestation。
2. DB URL、Tool Bridge token、模型 key、provider token、private key 只能在
   provider secret store 或 ignored local operator 文件中出现，不能进 repo vars。
3. `check:github-runtime-variable-boundary` 必须进入 root `npm run test`，不能只
   作为上线前手动命令。
4. 证据 artifact 只能记录变量名和 issue code，不能复制变量值。

验证命令：

```bash
npm run check:github-runtime-variable-boundary
npm run test
```

## 2026-06-18 Backward Sweep Python 3.11 Test Boundary

Public Projection Privacy Audit 和 Backward Consistency Sweep 都通过后，又
裸跑了一次 root `npm run test`。第一次失败不是产品规则漂移，而是
`setup:api` 用系统 Python 3.9 创建了 release 本地 venv；后端测试和部分代码
已经使用 Python 3.10+ 类型语法，导致 `str | None` 在 collection 阶段报错。

新的工程标准：

1. `setup:api` 只允许选择 Python 3.11+；已有 `backend/.venv` 如果低于 3.11，
   必须用 3.11 `--clear` 重建。
2. `run-backend-python` 也只接受 Python 3.11+，防止 root test 在不同机器上
   悄悄落回系统 Python 3.9。
3. 隐私与 P4 gate 的结论不能和环境断点混在一起：规则扫描绿、root test 因
   Python 版本失败时，应先修测试运行边界，再重新裸跑 root test。
4. 开发记录里必须写明这类系统级修正，否则以后会误以为需要继续改 P4 规则
   或 public projection。

验证命令：

```bash
npm run setup:api
npm run test
```

## 2026-06-18 P108 Remote Assignment Local Boundary Guard

P107 之后继续看上线断点，发现剩下的 8 个 blocker 都集中在远程 runtime
operator 输入。这里最危险的不是还没填，而是有人把
`remote-assignment.local.json` 当成可提交配置，或者把 `.invalid` fixture
误读成生产 readiness。

新的工程标准：

1. operator local assignment 必须被 `.gitignore` 和 root gate 双重保护；
   `remote-assignment.local.json` 与 `remote-assignment.*.local.json` 不能被
   追踪入库。
2. committed example 只能保留 placeholder 和 `providerSecretsConfigured:
   false`，不能承载真实 origin、service id 或 secret-ready 断言。
3. committed fixture 只用于 schema/P79 command generation；它必须继续让
   P75 strict readiness 失败，不能清除生产 blocker。
4. P108 不部署、不填表、不解除 remote runtime blocker；它只防止本地运维证据
   和 fixture 证据混入公开发布链路。

验证命令：

```bash
npm run check:remote-assignment-local-boundary
npm run check:remote-runtime-assignment-intake
```

## 2026-06-18 P107 CI Artifact Content Coverage Matrix

P106 之后再看整条 Pages 证据链，发现一个更通用的风险：P43 能证明
artifact 名称、大小和过期状态，但不同 artifact 的“内容是否可信”来自不同
地方。有的需要下载验收，有的是 root gate 生成后上传，有的是 build 后隐私
扫描，有的是浏览器截图供人工验收。如果这些路径没有一张机器矩阵，后续新增
artifact 很容易只上传、不验收。

新的工程标准：

1. 每个 Pages release artifact 都必须有明确 coverage class：
   `download_content_gate`、`pre_upload_generator_gate`、
   `built_bundle_privacy_scan` 或 `visual_human_evidence`。
2. P43 仍然只做 metadata gate；P107 负责验证所有 artifact 都有内容/生成/扫描/
   视觉证据归属。
3. 下载验收类 artifact 必须同时具备 package script、root test wiring、Pages
   workflow step 和人类文档说明。
4. P107 不解除远端 runtime blocker，也不部署服务；它只防止 release evidence
   变成“看起来上传了，但没人真正负责验收”的空档。

验证命令：

```bash
npm run check:ci-artifact-content-coverage
npm run check:pages-live-release-gate
```

## 2026-06-18 P106 Remote Assignment Fill Plan Artifact Attestation

P105 之后继续看证据链，发现 Pages run 已经上传
`remote-assignment-fill-plan`，P43 也能证明 artifact 名称和大小存在，但这仍
不能证明里面的 JSON/Markdown 内容可信。上线链路里，metadata green 如果
没有 content gate，很容易让旧 head、错位镜像、泄漏字段或误清 blocker 的
artifact 混进交接。

新的工程标准：

1. 每个关键上线 artifact 都需要两层门禁：P43 metadata gate 证明存在，专门
   content gate 证明内容结构、head sha、隐私边界和 blocker 语义。
2. `remote-assignment-fill-plan` 的内容必须验证六个填报区域、strict validation
   sequence、current-head 镜像和不写 `remote-assignment.local.json` 的边界。
3. Source workspace 不是 git checkout 时不能伪造 current-head 镜像证明；
   P106 只允许它在 `source-workspace-no-git` 模式下保持
   `runtime-images-published` 与 `handoff-artifact-content` blocked。
4. Pages workflow 必须在 P90 blocker content gate 之后运行 P106，部署前证明
   fill plan 本身仍然 privacy-safe 且没有解除 live runtime blocker。

验证命令：

```bash
npm run check:remote-assignment-fill-plan
npm run check:remote-assignment-fill-plan-artifact
npm run check:pages-live-release-gate
```

## 2026-06-18 P105 Remote Assignment Fill Plan Gate

P104 之后继续看上线断点，发现 P87 能给出 current-image handoff，
P85/P90 能给出 blocker ledger，但部署操作者还需要把“到底填哪些字段、
按什么顺序验收”从多份 artifact 里拼出来。这个拼装步骤如果靠人工记忆，
很容易把 fixture、占位符或未健康的 origin 当成真实上线证据。

新的工程标准：

1. 远端 assignment 不能只给模板和 blocker；必须生成
   `remote-assignment-fill-plan` JSON/Markdown，列出 owner、API service、
   Agent service、origin execution、Pages variables、activation control 的
   必填字段与 strict gate。
2. Fill plan 只读 P87/P89/P85/P90 证据，不写
   `remote-assignment.local.json`，不创建远端服务，不设置 GitHub variables，
   不解除 live runtime blocker。
3. Pages workflow 必须上传 `remote-assignment-fill-plan`，current-run artifact
   metadata gate 必须检查它存在，P45/P52 completion docs 必须把它列为
   commercial release chain 证据。
4. 经验：上线断点的下一步不是“假装远端已部署”，而是把真实操作者输入变成
   可复用、可审计、可安全分享的填报计划。

验证命令：

```bash
npm run check:remote-assignment-fill-plan
npm run check:pages-live-release-gate
npm run check:github-actions-artifacts
```

## 2026-06-18 P97 Cost-Aware Provider Routing Contract

P96 后继续看 completion matrix，发现 `model-orchestration` 的真正缺口不是
再写一个新的模型路由，而是已有后端 `ProviderRoutingService`、
`BudgetedLLMBackend`、runtime receipts 和 rollout 逻辑没有被 root release
gate 正式承认。能力存在但不在主链里，本质上仍然会被后续团队当成“没做”。

新的工程标准：

1. 复用优先：已有后端能力先纳入 root test 和机器门禁，再考虑新实现。
2. 成本感知模型路由必须同时证明四件事：主 provider 可用、预算阻断可安全回退、rollout rollback 可关闭 track、receipt 进入 Ops 而不是公共 UI。
3. Public Creator/Reader 不能展示 provider、model、cost、fallback、routing receipt、debug payload；这些只能在后端/Ops/审计 artifact 中出现。
4. `check:cost-aware-provider-routing` 必须和 `backend/tests/test_provider_runtime_routing.py` 一起进入 root test，否则 P45 completion matrix 不能把模型编排证据算作有效。
5. 这仍不等于 public live provider smoke：远端 API/Agent origin、secret store、health 和 cutover 仍由 P85 blocker ledger 管。

验证命令：

```bash
npm run check:provider-agnostic-config
npm run check:cost-aware-provider-routing
node scripts/run-backend-python.mjs -m pytest backend/tests/test_provider_runtime_routing.py
```

## 2026-06-18 P96 Runtime Completion Blocker Convergence

P96 修的是 P45 completion matrix 和 P85/P90 blocker ledger 的口径漂移：
前者原本只暴露 P23 live-readiness 的 6 个 blocker，后者才是 release
owner 真正要处理的 8 个 operator blocker。两者都能为真，但交接时会变成
两张阻塞表。

新的工程标准：

1. P85 blocker ledger 是 remote runtime launch blocker 的 source of truth。
2. P45 仍是完成度矩阵，但 `commercial-release-chain.openGaps` 要优先映射
   P85 blocked stage ids。
3. `check:runtime-completion-blocker-convergence` 必须在 P90 之后运行，
   重新生成 P45 artifact 并检查每个 P85 blocker 都出现在 commercial row。
4. Completion matrix 不能自建第二套 blocker taxonomy；否则 gate 全绿也会
   留下交接口径风险。

## 2026-06-18 P85 Remote Runtime Blocker Normalization

P84 对齐了 release evidence，但 P45 仍显示 commercial release chain blocked。真正的下一个断点不是继续补 UI 或规则，而是把 P23/P65/P66/P72/P75/P76/P78/P79 这些分散输出统一成部署负责人能执行的一张断点表。

新的工程标准：

1. 远端 Runtime blocked 不能只停留在多份 JSON 里；必须生成 `remote-runtime-blockers` JSON/Markdown ledger，标出 owner、gate、required input、next action 和 strict command。
2. 该 ledger 只允许包含非密信息，不允许出现数据库 URL、Tool Bridge token、模型 key、provider API token、system prompt、raw runtime state、reference vault、代表作品、`sourceRefs`、`profile.id` 或 `kernel.id`。
3. Pages workflow 必须上传 `remote-runtime-blockers`，current-run artifact gate 必须检查它，P45 completion matrix 必须把它列入 commercial release evidence。

验证命令：

```bash
npm run check:remote-runtime-blockers
npm run check:pages-live-release-gate
npm run check:github-actions-artifacts
```

## 2026-06-18 P84 Runtime Completion Evidence Alignment

P83 把 `public-projection-privacy` 接进 Pages workflow 和 root test 后，P45 runtime completion matrix 仍然只列旧的 9 个 release artifact。这类问题很危险：CI 实际上更严格了，但完成度审计还在描述旧世界，后续团队会误以为 `reference-privacy` 一份证据就足够。

新的工程标准：

1. Runtime completion matrix 的 artifact 列表必须跟 Pages workflow、current-run artifact gate 和 root test 保持一致。
2. 只要 release chain 新增证据包，就要同时更新 P45 文档、`check:runtime-engine-completion` 和 `check:runtime-completion-refresh`。
3. `reference-privacy` 证明代表作品与 vault 边界，`public-projection-privacy` 证明 public projection 不泄漏内部字段；两者不能互相替代。

验证命令：

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
npm run check:pages-live-release-gate
```

## 2026-06-18 Backward Consistency Sweep

Public Projection Privacy Audit 通过后不能马上收口，因为 P4、reference privacy、sourceRefs、deprecated case logic 和 public projection 是多层边界：规则文档、runtime registry、后端 internal session、FastAPI public response、Creator/Reader UI、fixtures、CI artifacts 都可能各说各话。

新的工程标准：

1. 任何 P4 或 reference privacy 相关改动完成后，必须跑一次 backward consistency sweep，确认 human-readable docs、runtime registry、public projection 和 scan scripts 没有互相矛盾。
2. `sourceRefs` 允许存在于人类规则文档和 runtime registry，但必须是匿名 `rwref_*`；public API、UI、preview build、普通日志和可交付 artifacts 不得出现。
3. 旧的 `prompt_id`、`prompt_contract`、`imported_novel_starter_system_prompt` 只能作为历史说明被讨论，不得出现在当前 smoke request、public response 或 product-facing code path 中。
4. Pages workflow 在最终 build 后必须同时跑 `scan:reference-privacy` 和 `check:public-projection-privacy`，并上传 `reference-privacy` 与 `public-projection-privacy` 两份证据。
5. Root `npm run test` 必须包含 P4 document-core、deprecated case logic、sourceRefs drift、public projection privacy、backward consistency、reference vault 和 reference privacy 全链路。
6. 新增或重命名 release artifact 时，必须同步 P16/P43/P83 这类 handoff 文档里的 artifact 数量和名称；否则 CI 实际更严格但文档仍描述旧链路。
7. 隐私类 release artifact 不能只检查“存在且非空”。必须额外下载 JSON 内容，确认 `status=passed`、零违规、redaction flags 为 false，且没有代表作品、作者、解密映射、prompt 或 provider payload。

验证命令：

```bash
npm run check:backward-consistency-sweep
npm run test
```

## 2026-06-19 P123 CI Assignment Absence Boundary

P123 初版在本地通过，但 Pages CI 暴露出一个边界错配：`remote-assignment.local.json`
是被 `.gitignore` 保护的 operator 本地文件，CI 和公开仓库正常情况下不会携带它。
因此 P123 不能只接受 `remote_assignment_incomplete`，还必须接受
`remote_assignment_missing`，否则会把正确的隐私边界误判成失败。

新的工程标准：

1. P123 的目标是收集非 secret 的 operator assignment evidence，不是强制 CI
   拥有本地 ignored assignment。
2. 当本地 assignment 存在时，P123 必须要求 P113 确认镜像没有漂移。
3. 当本地 assignment 缺席时，P123 必须要求 P75、P113、P120 同时报告缺席或等待
   assignment，而不是把缺席误报为 strict activation readiness。
4. 这个修正不能改动 P4、public projection privacy 或 backward consistency 的规则主体；
   它只修复上线证据链里 operator-local 文件的 CI 口径。

验证命令：

```bash
npm run check:operator-assignment-evidence-intake
npm run test
```

## 2026-06-18 Public Projection Privacy Audit

本轮把 P4 冻结为架构边界协议，而不是继续使用“优化 P4”这种会无限扩张的任务名。后续涉及约束、内核、运行时、隐私或质量刹车的 PR，必须先声明自己改变的是 `Document-Core Boundary`、`Runtime Registry Boundary`、`Reference Work Privacy Boundary`、`Public Projection Boundary`、`Deprecated Case Logic Guard` 或 `Quality Brake Mapping` 中的哪一个边界。

新的公开投影标准：

1. Creator Studio、Reader Web、FastAPI public response、preview build、测试报告、fixtures 和 runtime artifacts 不得泄漏代表作品明文、`sourceRefs`、`rwref_*` 到明文映射、`profile.id`、`kernel.id`、provider prompt plumbing、vault metadata 或废弃 case logic。
2. 内部 session state 可以保存 active profile/kernel、runtime rules 和 provider status 用于审计，但所有对外响应必须经过 public projection。
3. 产品 UI 只能呈现故事向摘要、候选正文、最多两个追问、公开质量反馈和可理解的设定卡；不要把 provider、system prompt、fallback、raw state、vault 或 runtime registry 词汇带到页面上。
4. CI 不应默认持有 encrypted representative-work vault 的解密 key；门禁只验证 vault 形状、匿名 refs、公开 build 和 artifacts 没有泄漏。

验证命令：

```bash
npm run check:public-projection-privacy
node scripts/run-backend-python.mjs -m pytest backend/tests/test_creator_dialogue_api.py
```

## 2026-06-18 P82 Reference Ref Consistency Gate

代表作品隐私已经由 encrypted vault、匿名 `rwref_*` 和历史扫描保护，但还有一个更隐蔽的工程风险：公开文档里的匿名引用本身可能漂移。即使没有泄漏真实作品名，如果 `GENRE_CONSTRAINT_RULES.md` 表格、同文件 profile 章节、`GENRE_KERNEL_RULES.md` 表格、kernel 章节和 `genre-runtime-rules.v1.json` 使用不同的 `rwref_*`，后端、产品和法务都会误读“这个内核到底由哪组私有样本支撑”。

新的工程标准：

1. `genre-runtime-rules.v1.json` 仍是运行时真值，公开文档只能同步它的匿名 `sourceRefs`。
2. 公开文档可以展示 `rwref_*`，但不能产生自己的 ref 组合；文档表格和章节说明必须与 runtime registry 完全一致。
3. `scan:p4-rule-source` 必须同时检查 registry、表格行和章节 `Source refs:`，防止“匿名但错误”的代表作品映射进入主分支。
4. 代表作品明文仍然只能存在于团队私有 encrypted vault，公开仓库、Pages bundle、Actions artifacts 和 Git history 都不能出现真实标题。

验证命令：

```bash
npm run scan:p4-rule-source
npm run check:reference-vault-access
npm run scan:reference-privacy
```

## 2026-06-18 P4 Public Projection And FailBehavior

用户再次要求 P4 从头做，并明确弃用此前围绕单个题材测试形成的约束逻辑。本轮不是新增或删除某组题材词，而是把执行关系重新对齐到文档核心：`ConstraintProfile.rules[]` 负责规则，`GenreKernel.compatibleProfiles` 负责内核选择，Quality Brake 必须使用文档里的 `failBehavior`。

本轮修正两个容易被忽略的断点：

1. FastAPI Creator Dialogue 之前把 `failBehavior` 丢掉了，只保留 severity 和禁用词，导致“文档说 regenerate/repair/block，运行时只能泛化处理”。
2. 公开 `setting_cards` 里泄漏了 profile id、kernel id、`sourceRefs` 和 runtime rule facts，容易把 Creator Studio 变成后台控制台。

新的约束是：内部 session 可以保存完整规则事实用于审计、净化、质量刹车；公开 API 只能返回故事向的摘要，例如题材承诺、规则说明、严重度、`fail_behavior`、正向改写建议和内核节拍。不要把调试字段、代表作品引用、provider、prompt 或 profile/kernel id 暴露给用户。

验证命令：

```bash
npm run check:p4-document-core
node scripts/run-backend-python.mjs -m pytest backend/tests/test_creator_dialogue_api.py
```

执行同步脚本时不要在 zsh 里把循环变量命名为 `path`；zsh 会把它和命令搜索路径绑定，导致 `dirname`、`npm`、`node` 等命令突然不可见。用 `rel`、`file`、`target` 这类变量名。

## 2026-06-18 P81 Remote Assignment Fixture Gate

远端 Runtime 的真实上线还缺 provider service assignment，但等待外部服务期间仍然可以推进一层：把 assignment 文件本身做成可验证合同 fixture。关键不是伪造远端成功，而是证明“有真实服务后应该如何填、如何生成命令、如何失败在健康检查”。

新的工程标准：

1. `remote-assignment.fixture.json` 使用保留 `.invalid` 域名，不允许被当成 live origin。
2. P79 对 fixture 必须能 strict 生成 `assignment_execution_pack_ready`，说明字段、镜像、GitHub Variables、strict gate 和 rollback 命令都能拼出来。
3. P75 对同一个 fixture 必须停在 `remote_assignment_pending_health`，说明 fixture 不会越权证明远端服务健康。
4. Pages workflow 上传 `remote-assignment-fixture-gate`，让 CI run 自带 assignment contract 证据。
5. 真正上线仍必须由部署负责人提供 ignored `remote-assignment.local.json`，并让 P75/P73/P76/P78 strict 全部通过。

验证命令：

```bash
npm run check:remote-assignment-fixture
npm run check:remote-assignment-execution-pack
npm run check:remote-runtime-assignment-intake
```

## 2026-06-18 P80 Reference Privacy Artifact Gate

代表作品名加密以后，不能只停留在“本地扫描通过”。上线链路必须留下可下载证据，否则团队无法证明当前 Pages build 和 Git history 没有泄漏代表作品名。

新的工程标准：

1. `scan:reference-privacy` 必须生成 `artifacts/runtime/reference-privacy-*.json`。
2. privacy artifact 只能包含扫描范围、计数、是否启用本地解密扫描、是否扫描 Git history、违规数量；不得包含标题、作者、解密映射、key value、system prompt 或 violation detail。
3. Pages workflow 必须在 `app/dist` build 后再次运行 privacy scan，因为只扫源码不能证明公开静态产物安全。
4. CI current-run artifact gate 必须要求 `reference-privacy`，同时要求 `remote-assignment-execution-pack`，防止上线证据只留在日志里。
5. 隐私/法务相关 gate 的失败详情可以打到控制台，但 artifact 默认只留红acted metadata，避免“证明材料”本身成为二次泄漏源。

验证命令：

```bash
npm run scan:reference-privacy
npm run check:pages-live-release-gate
npm run check:runtime-engine-completion
```

## 2026-06-18 P4 文档核心重做补丁

用户再次要求 P4 从头做，并明确废弃此前单个题材验收里形成的约束逻辑。本轮纠正了一个容易复发的问题：回归门禁不能保存旧案例词表，否则门禁自己就会变成新的残留。

新的工程标准：

1. P4 的执行事实只来自 `GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md` 和编译后的 `genre-runtime-rules.v1.json`。
2. 防回归检查只找结构性绕路：prompt-case 分支、scenario patch、selected-genre exception、global ban list、provider prompt patch、硬编码 profile/kernel 分支。
3. 不允许把某次浏览器批注、负例、模型测试事故、后端评审建议里的词汇直接做成 runtime 禁词。
4. 如果一个题材真的需要边界，先写成通用 `ConstraintProfile.rules[]`，再挂接兼容 `GenreKernel`，最后由 Quality Brake 按 `failBehavior` 处理。
5. 历史讨论可以留在 handoff 里，但不得进入执行面、测试 fixture、前端文案或 provider adapter。

必跑检查：

```bash
npm run check:p4-document-core
npm run check:p4-deprecated-case-logic
npm run scan:p4-rule-source
```

## 2026-06-18 P79 Remote Assignment Execution Pack

P78 能看出上线卡在远端 assignment，但部署负责人仍要手工拼健康检查、strict gate、GitHub Variables 和 rollback 命令。P79 把被 `.gitignore` 保护的 `remote-assignment.local.json` 转成 JSON + Markdown 执行包。

经验：

1. 执行包只生成命令，不执行命令；上线变量和 provider 服务仍由负责人显式操作。
2. artifact 可以包含 service id、HTTPS origin、GHCR image ref 这类非密钥证据，但必须拒绝 database URL、Tool Bridge token、模型 key、provider API token、私钥、system prompt 和 raw state。
3. Missing assignment 在普通 CI 中应该是 blocker report，不是失败；strict mode 才失败。
4. Markdown handoff 比纯 JSON 更适合给部署负责人逐项执行，但 JSON 仍是机器门禁的依据。

验证命令：

```bash
npm run check:remote-assignment-execution-pack
REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack
```

## 2026-06-18 P78 Remote Runtime Activation Control

P77 证明了回滚路径，但上线决策仍分散在 P72/P75/P76/P77 多个输出里。P78 把这些证据合成一个只读控制板，让部署负责人直接看到当前断点是镜像、远端 assignment、健康检查、live vars，还是回滚责任人。

经验：

1. 上线控制板不要直接写 GitHub Variables 或 provider 服务，否则会把“验收”变成“执行”，调试时风险太高。
2. 控制板应该复用已有门禁 artifact，而不是重新实现部署判断；这样每个 Pxx gate 仍保持单一职责。
3. 普通 CI 只报告 blockers，strict mode 才失败，适合在没有远端服务时保持主线可发布。
4. Pages artifact gate 必须上传 `remote-runtime-activation-control`，否则远端 run 绿灯不能证明上线断点已被记录。

验证命令：

```bash
npm run check:remote-runtime-activation-control
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
```

## 2026-06-18 P77 Live Rollback Rehearsal Gate

P76 证明 live cutover 是否满足条件，但还没有证明出事时能稳定退回静态预览。P77 把 rollback 从 runbook 文本推进为 CI artifact：每次 Pages run 都要留下 `live-rollback-rehearsal` 证据。

新的工程标准：

1. 回滚命令必须同时存在于 service manifest 和 origin execution plan。
2. 默认检查不执行破坏性 GitHub variable 变更，只验证命令、静态预览可达性和 P76 证据链接。
3. 严格演练必须带 `ROLLBACK_OWNER_ID`、`ROLLBACK_REHEARSAL_CONFIRMED=true` 和 `ROLLBACK_GITHUB_RUN_ID`。
4. Pages workflow 必须上传 `live-rollback-rehearsal` artifact，并由 current-run artifact gate 校验。
5. artifact 不得包含 provider secret、数据库 URL、模型 key、system prompt、raw state 或 reference vault 私有映射。

必跑检查：

```bash
npm run check:live-rollback-rehearsal
REQUIRE_LIVE_ROLLBACK_REHEARSED=true npm run check:live-rollback-rehearsal
npm run check:pages-live-release-gate
```

## 2026-06-18 P4 废弃特例逻辑回归门禁

用户再次明确：P4 必须从文档核心重新出发，早期围绕单个测试题材形成的约束逻辑全部弃用。本轮新增的不是另一张禁词表，而是一个防回归门禁，确保废弃 case 不会再次进入运行时规则、Agent workflow、FastAPI 服务或公开前端。

新的工程标准：

1. `genre-runtime-rules.v1.json` 只接受从 `GENRE_CONSTRAINT_RULES.md` 与 `GENRE_KERNEL_RULES.md` 编译出来的通用规则。
2. 单个用户样例、浏览器批注、provider prompt experiment 和后端建议只能进入 `nonExecutableInputs` 对应的研究流程，不能直接成为执行逻辑。
3. 特定题材是否允许某个表达，必须由 active `ConstraintProfile.rules[]` 决定；不得维护跨题材隐藏分支或全局 premise blacklist。
4. `GenreKernel` 只负责节奏、动机、冲突、高潮回收和时间控制，不负责硬编码某个案例。
5. P4 回归检查只扫描产品执行面，不扫描历史说明，避免把“讨论过的问题”误当成运行时能力。

必跑检查：

```bash
npm run check:p4-document-core
npm run check:p4-deprecated-case-logic
npm run scan:p4-rule-source
```

## 2026-06-18 P73 远端 Origin 执行门禁

P72 证明镜像已经发布，但它仍然不能说明远端服务已经创建、密钥已经放入 provider secret store、健康检查已经通过，或者 Pages live variables 可以安全写入。P73 把这个中间断点变成执行门禁。

新的工程标准：

1. 镜像证据、服务 manifest、host profile 和 origin provisioning 必须被一个执行计划串起来。
2. 执行计划只记录服务 id、origin、镜像名、health path、secret 是否配置的布尔证据，不记录任何 secret value。
3. Pages live variables 只能在 API 和 Agent `/health` 都通过后写入。
4. 默认 CI 允许输出 `passed_with_execution_blockers`，但 strict mode 必须在远端服务未执行完成时失败。
5. 任何 live runtime 上线前必须按 P73 -> P66 -> P23/P65 的顺序证明：执行、origin、readiness/trace。

必跑检查：

```bash
npm run check:remote-origin-execution
npm run check:remote-origin-provisioning
npm run check:runtime-activation-package
```

## 2026-06-18 P4 运行时合同重做

用户明确要求 P4 从头做，并废弃此前围绕单一题材测试形成的约束逻辑。本轮不新增旧 case 词表，也不把某个负例转成全局禁令，而是把约束入口收敛到 `documentCore.runtimeContract`。

新的工程标准：

1. 约束只能来自 `ConstraintProfile.rules[]`，不得从 browser note、prompt experiment、后端建议或人工负例直接进入运行时。
2. 内核只能来自 `GenreKernel.compatibleProfiles`，不得在 workflow 或后端服务里硬编码 profile/kernel 分支。
3. 无匹配 profile 时，运行时只做苏格拉底式澄清，不暗自创建临时约束。
4. 同一个词项是否允许，取决于 active profile 的规则；不能维护跨题材全局禁词表。
5. 后端 `genre_constraint_facts.runtime_rules.document_core` 和 Agent `runtimeRules.documentCore` 必须回传合同摘要，方便调试和审计。

必跑检查：

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
npm --workspace @narrativeos/agent-runtime test
node scripts/run-backend-python.mjs -m pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
```

## 2026-06-17 P4 文档核心硬重置

用户要求 P4 从头做，并明确废弃此前围绕某次题材验收形成的约束逻辑。这里不能把旧问题换成另一张禁词表；正确做法是删除样本词表本身，让约束只从文档注册表进入运行时。

本轮修正：

1. `scan-p4-rule-source.mjs` 不再维护任何历史样本词正则，只检查 registry schema、文档同步、匿名引用、无 hardcoded profile/kernel 分支。
2. `check:p4-document-core` 不再检查旧 anchor 名单，只检查 `document_registry_only`、v3 baseline、人类规则文档、非执行输入和 profile/kernel 兼容关系。
3. 同一个词项在不同题材里可能是必需元素，也可能破坏世界基底；是否允许必须由 active `ConstraintProfile.rules[]` 决定。
4. `GenreKernel` 只能把 active profile 转成 BeatPlan、动机压力、冲突机制、高潮回收和时间控制，不能在 workflow 内硬写个别题材例外。
5. browser QA、provider prompt experiment、后端 review 和人工负例只能作为研究输入；进入产品前必须先抽象进 `GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md` 和 `genre-runtime-rules.v1.json`。

必跑检查：

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
npm --workspace @narrativeos/agent-runtime test
```

## 2026-06-17 P4 文档权威链重做

用户再次明确：P4 要从头做，早期围绕某个单次题材测试形成的约束逻辑全部弃用。工程上不能把旧事故换成新禁词表，而要把运行时约束完全收敛到文档注册表。

本轮规则：

1. `documentCore.sourceAuthority` 必须声明 `final_constraint_kernel_documents -> human_editable_rule_docs -> runtime registry -> registry_fields_only`。
2. `GENRE_CONSTRAINT_RULES.md` 和 `GENRE_KERNEL_RULES.md` 必须覆盖完整 21 类，不再只写少量示例。
3. Agent workflow 和 FastAPI Creator Dialogue 只能通过 `ConstraintProfile` 与 `GenreKernel` 字段运行，不得出现临时题材分支。
4. 单个 browser QA、prompt experiment、人工负例只能作为 `nonExecutableInputs`，不能进入 resolver、provider prompt、UI 或质量门禁。
5. 测试必须从注册表抽取规则验证，不再绑定某一个题材事故。

必跑检查：

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
npm --workspace @narrativeos/agent-runtime test
```

## 2026-06-17 P56 Studio 发布确认 Trace

P47 之前只能说明 Studio 有质量评价和确认提交入口，但没有证明它们属于同一条运行链路。这样会导致“先检查、再提交”在 UI 上成立，审计上却无法回放。

本轮规则：

1. `/v1/quality/evaluate` 必须返回 `studio_trace`，包含 `source_run_id` 和 `quality_report_hash`。
2. `/v1/canon/commit` 必须把同一个 `studio_trace` 写入 `canon_ledger_only` 记录。
3. `Idempotency-Key` 重放必须返回同一条 ledger。
4. ledger 必须保留 `rollback_plan`，但不得宣称多表事务或生产发布。
5. Studio 前端只传递 trace，不在用户界面展示 provider、system prompt、raw state 或代表作品。

必跑检查：

```bash
npm run check:studio-canon-trace
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## 2026-06-17 P4 文档注册表主权再重置

用户明确要求 P4 从头做，且此前围绕单次创作验收形成的题材约束逻辑全部弃用。这里的关键不是替换一组禁词，而是把“旧验收样本”这个分类从工程事实里拿掉；否则团队仍会把一次人工测试当成可执行产品规则。

新的工程标准：

1. P4 的唯一事实源是 `genre-runtime-rules.v1.json`、`GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md` 和 v3 baseline。
2. `documentCore.nonExecutableInputs` 只保留通用研究输入类型，例如 `research_intake_note`；不得保留样本特定分类。
3. 所有可执行约束必须落到 `ConstraintProfile.rules[]`，节奏、动机、冲突和高潮回收必须通过兼容 `GenreKernel` 生效。
4. 门禁使用允许清单、匿名引用、schema 完整性和无 hardcoded registry 分支来验收，不维护样本词表。
5. 新增题材边界时，先改人类可编辑规则文档，再同步 runtime JSON、resolver 测试和 Quality Brake fixture。

必跑检查：

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
```

## 2026-06-17 P55 WorldInstance 关系/记忆候选写回

P53 证明 Reader 选择能写入 `route_choices`，但它只说明“选择被记录了”，还不能说明世界实例的关系、承诺、事实和路线记忆会被整理出来。下一步不能直接跳到 public branch publish，否则会绕过质量刹车和回滚边界。

本轮规则：

1. Reader 选择成功后，从 `StepRecord.state_before/state_after` 生成 `world_instance_patch_candidate`。
2. patch 只进入 `world_instance_patch_candidate_only`，不写 canon，不公开发布 branch。
3. patch 包含世界事实、open promises、relationship graph、route fingerprint 的候选差异和当前快照计数。
4. `/reader/snapshot` 和 `/timeline/worldlines/{id}/loom` 必须能读回 `world_instance_writeback_summary`。
5. P45 仍保持 partial，剩余 gap 是 public branch publish、durable multi-table WorldInstance writeback、database rollback 和 remote live runtime。

必跑检查：

```bash
npm run check:world-instance-writeback
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## 2026-06-17 P4 文档核心重新收敛

用户再次明确：此前围绕单个 prompt-case 形成的临时约束逻辑全部弃用，P4 必须以文档里的 `ConstraintProfile + GenreKernel` 为核心。这次修正的重点不是增加或替换某组禁词，而是移除扫描器中的历史样本词表，避免把一次验收样本继续伪装成产品规则。

新的工程标准：

1. `check:p4-document-core` 只验证 `document_registry_only`、v3 baseline、人工规则文档、匿名 `rwref_*`、profile/kernel 兼容关系和非执行输入声明。
2. `scan:p4-rule-source` 只验证 registry schema、文档同步、匿名引用、无 hardcoded profile/kernel 分支。
3. 浏览器批注、后端 review、模型 prompt 试验和历史负例只能作为研究输入；进入运行时前必须先抽象成可编辑的 `ConstraintProfile.rules[]` 与兼容 `GenreKernel`。
4. P4 验收不再维护旧 prompt-case 正则，也不在脚本中编码单个题材边界。

必跑检查：

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
```

## 2026-06-17 P52 Runtime 完成度矩阵刷新

### 现象

P49/P51 已经补了时间引擎候选密度模拟和状态回写幂等提交，但 P45 完成度矩阵仍保留旧 gap。如果矩阵不刷新，团队会继续按已解决的问题排期，或者误以为新能力没有进入验收体系。

### 修复原则

1. 完成度矩阵必须随着新证据刷新，但不能把 partial 误报 ready。
2. 已证明的内容从 open gap 移到 evidence。
3. 仍未完成的后端持久化、Reader 分支、生产权限继续保留为 gap。
4. 新增 `check:runtime-completion-refresh` 防止旧描述回流。

### 本轮落地

- `time-engine` evidence 增加 `timeEngine.ts`、测试、P49 gate。
- `state-writeback` evidence 增加 `/canon/commit` 幂等、P51 gate 和 rollback plan。
- `quality-brake` evidence 增加质量门禁驱动 canon ledger commit。
- 新增 `docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md`。
- 根 `npm run test` 增加 `check:runtime-completion-refresh`。

### 必跑检查

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
```

## 2026-06-17 P51 状态回写安全门禁

### 现象

P45 把 state-writeback 标为 partial：已有 `stateWritebackPreview` 和 `/canon/commit`，但“有接口”不等于“提交安全”。最大风险是确认提交缺少幂等键，导致重复点击或重试写出多个 canon ledger。

### 修复原则

1. AI 候选默认 candidate-only，未确认不得写 canon。
2. 已确认提交必须带 `Idempotency-Key`。
3. 同一个 key 必须返回同一条 ledger，不重复写入。
4. 当前阶段只证明 `canon_ledger_only`，不伪装成完整多表事务。
5. 每条提交记录必须带 `rollback_plan`，说明公开发布前如何撤回。

### 本轮落地

- `/v1/canon/commit` 读取 `Idempotency-Key`。
- `ProductRuntimeService.commit_canon` 增加幂等重放和缺 key 阻断。
- `runtimeApi.commitCanon` 和 Studio 提交路径发送确定性 idempotency key。
- `backend/tests/test_product_runtime_api.py` 增加缺 key、首次提交、重复提交重放断言。
- 新增 `scripts/check-state-writeback-safety.mjs` 和 `docs/backend/P51_STATE_WRITEBACK_SAFETY_GATE.md`。

### 必跑检查

```bash
npm run check:state-writeback-safety
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## 2026-06-17 P50/P4 文档核心重做

### 现象

用户明确要求 P4 从头做，弃用早期单一测试场景推导出的约束逻辑。问题不只在规则内容，而在工程习惯：为了防止旧问题回归，把旧词明文写进扫描脚本和说明文档，也会让团队误以为那些词仍是产品规则。

### 修复原则

1. P4 的唯一事实链是 v3 onboarding、约束规则文档、内核规则文档和 runtime JSON。
2. 浏览器批注、后端建议、历史负例和 provider prompt 试验只能作为研究输入，不得直接成为运行时规则。
3. 可执行约束只能来自 `ConstraintProfile.rules[]`；节奏和事件结构只能由 compatible `GenreKernel` 影响。
4. 回归扫描可以防止旧问题重现，但不能把历史负例写成明文产品规则。
5. 新增题材边界必须先改人类规则文档，再同步 runtime JSON、测试和 Quality Brake fixture。

### 本轮落地

- `genre-runtime-rules.v1.json` 增加 `documentCore.policy = document_registry_only`。
- 新增 `scripts/check-p4-document-core.mjs`。
- 新增 `docs/backend/P50_P4_DOCUMENT_CORE_RESET.md`。
- `scripts/scan-p4-rule-source.mjs` 改为文档 registry 契约扫描。
- 根 `npm run test` 接入 `check:p4-document-core`。

### 必跑检查

```bash
npm run check:p4-document-core
npm run scan:p4-rule-source
```

## 2026-06-17 P49 Time Engine 合同

### 现象

P45 把时间引擎标成 partial：当时只有 `timeControls` 和 `timeConsistencyReport`，没有一个可测试的事件密度模拟。这样 GenreKernel 的时间参数仍然像文档字段，而不是运行时能力。

### 修复原则

1. 先做 deterministic TimeEngine，保证同一 runId 和 kernel 输出可回放。
2. 使用 `baseRate/burst/decay/foreshadowPressure` 生成 Poisson/Hawkes 风格候选事件密度。
3. TimeEngine 只进入 `runtimeArtifact.scenePlan.candidateEvents` 和 `timeConsistencyReport`，不写 canon、不写 branch。
4. P49 仍然不是后端持久化 TimeEngine，不能把 `time-engine` 误报为 ready。

### 本轮落地

- 新增 `packages/agent-runtime/src/timeEngine.ts`。
- 新增 `packages/agent-runtime/src/timeEngine.test.ts`。
- `socraticCreateWorkflow` 的 candidate events 改为 `source: 'time_engine'`。
- 新增 `scripts/check-time-engine-contract.mjs`。
- 新增 `docs/backend/P49_TIME_ENGINE_CONTRACT.md`。

### 必跑检查

```bash
npm --workspace @narrativeos/agent-runtime test
npm run check:time-engine-contract
```

## 2026-06-17 P48 Product Runtime API 覆盖门禁

### 现象

P47 已经证明 Creator、Reader、Studio 的 trace 字段和入口边界一致，但其中 Reader/Studio 的后端行为测试只被静态脚本引用，没有进入根测试。这样仍可能出现“文档说有，CI 没跑”的断点。

### 修复原则

1. P47 依赖的 Reader/Studio product runtime 合同必须进入根测试。
2. `/scene/advance`、`/quality/evaluate`、`/canon/commit` 要作为同一个 product runtime 面验证。
3. 覆盖门禁检查 package root test、后端测试、前端 runtime API 和 P47 trace 文档一致。
4. P48 artifact 只记录端点和覆盖状态，不写候选正文、secret、system prompt 或代表作品。

### 本轮落地

- Root `npm run test` 增加 `backend/tests/test_product_runtime_api.py`。
- 新增 `scripts/check-product-runtime-coverage.mjs`。
- 新增 `docs/backend/P48_PRODUCT_RUNTIME_API_COVERAGE.md`。
- `package.json` 增加 `check:product-runtime-coverage`，并接入根 `npm run test`。

### 必跑检查

```bash
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
npm run check:product-runtime-coverage
```

## 2026-06-17 P47 Runtime Trace 连续性门禁

### 现象

P45 的 Runtime Engine、Reader 和 Studio 都是 partial，其中一个根因是三端容易各自形成状态语言：Creator 有 `runId/projectId/sessionId`，Reader 有 `session_id/candidate_scene/harness_trace`，Studio 有 `quality/evaluate` 与 `canon/commit`。如果不先锁定同一套 trace 语义，后续 E2E 会继续漂移。

### 修复原则

1. Creator、Reader、Studio 必须共享 candidate-first 的 runtime trace 词汇。
2. Creator 公共输出可以暴露 `runId/projectId/sessionId`，但不能暴露 `runtimeArtifact`、ledger、cost、raw state。
3. Reader 选择必须经过 `advanceScene` 和 snapshot 刷新，不能只修改本地分支 UI。
4. Studio 发布必须先质量评价，再人工确认，并携带 `quality_report`。
5. P47 只证明字段和边界连续，不把 Reader/Studio 生产写入误报为完成。

### 本轮落地

- 新增 `scripts/check-runtime-trace-continuity.mjs`。
- 新增 `docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md`。
- `package.json` 增加 `check:runtime-trace-continuity`，并接入根 `npm run test`。
- `docs/baseline/RELEASE_SYNC_MANIFEST.json` 纳入 P47 文档和脚本。

### 必跑检查

```bash
npm run check:runtime-trace-continuity
```

## 2026-06-17 P46 远程 Runtime 激活门禁

### 现象

P45 把 `commercial-release-chain` 判定为 blocked，但“远端 API/Agent 未配置”仍然太粗。真正上线时，团队需要知道断点发生在 repository variables、远端 health、Creator workflow preflight、CI artifact，还是 Pages 发布状态。

### 修复原则

1. 公开 Pages 只能通过 GitHub repository variables 从 `disabled` 切到 `live`，不能靠改前端绕过。
2. P46 读取最新 `runtime-readiness-ledger`，不重新发明一套环境判断。
3. 远端未配置时脚本输出 `passed_with_activation_blockers`，证明断点清楚，而不是伪造上线成功。
4. P46 artifact 只保留阶段、检查 ID 和下一步动作，不写入 secret、system prompt、raw state、代表作品或 candidate 全文。

### 本轮落地

- 新增 `scripts/check-remote-runtime-activation.mjs`。
- 新增 `docs/backend/P46_REMOTE_RUNTIME_ACTIVATION_GATE.md`。
- `package.json` 增加 `check:remote-runtime-activation`，并接入根 `npm run test`。
- `docs/baseline/RELEASE_SYNC_MANIFEST.json` 纳入 P46 文档和脚本。
- 脚本生成 `artifacts/runtime/remote-runtime-activation-*.json`，输出 `hold_public_live_runtime_disabled` 或 `can_enable_public_live_runtime`。

### 必跑检查

```bash
npm run audit:live-runtime-readiness
npm run check:remote-runtime-activation
```

## 2026-06-17 P45 Runtime Engine 完成度审计

### 现象

P4-P44 已经补齐了大量局部门禁，但团队仍可能把“某个模块有文件或测试”误读成“产品能力已经完成”。尤其是 Runtime Engine 相关能力横跨世界引擎、类型内核、时间引擎、状态回写、模型编排、质量刹车、Agent Eval、Harness、Reader、Creator 和商业化发布链路，必须有统一矩阵判断当前完成度。

### 修复原则

1. 完成度审计必须机器可跑，不能只靠人工总结。
2. 每个模块必须有 evidence 文件、status、open gaps 和 next gate。
3. `partial` 和 `blocked` 是有效审计结果，但不能被产品或团队对外宣称为 done。
4. 审计 artifact 只保存证据路径、状态和缺口，不保存候选正文、系统提示词、provider secret 或代表作品明文。
5. 代表作品隐私契约仍然是 `encrypted_vault_only + sourceRefs`。

### 本轮落地

- 新增 `scripts/check-runtime-engine-completion.mjs`。
- 新增 `docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md`。
- `package.json` 增加 `check:runtime-engine-completion`，并接入根 `npm run test`。
- `docs/baseline/RELEASE_SYNC_MANIFEST.json` 纳入 P45 文档和脚本。
- 脚本生成 `artifacts/runtime/runtime-engine-completion-*.json`，记录 12 个模块的 ready/partial/blocked 状态。

### 必跑检查

```bash
npm run check:runtime-engine-completion
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P44 源/发布身份漂移门禁

### 现象

P43 同步时发现源工作区 `package.json` 曾被覆盖成 release 仓库身份。由于 `package.json` 属于 `managedWithReleaseOverrides`，release 侧原本只检查自己的 release identity，不能在本地发现 source workspace 已经漂移。

### 修复原则

1. `syncAsIs` 文件要逐字节一致。
2. `managedWithReleaseOverrides` 文件不能逐字节同步，但 source/release 两边的身份都必须被机器验证。
3. 当 release 仓库旁边存在 source workspace 时，release 侧 `check:release-sync-manifest` 也要验证 source managed file 的 `sourceJson`。
4. 发现 source package 被 release package 覆盖时，先恢复 source identity，再同步新增脚本入口，不能把 release 身份继续扩散。

### 本轮落地

- `scripts/check-release-sync-manifest.mjs` 在 release 模式下额外检查 source root 的 managed files。
- 源工作区 `package.json` 恢复为 `integration-harness` 身份，并保留 `check:github-actions-artifacts` 脚本入口。

### 必跑检查

```bash
npm run check:release-sync-manifest
cd /Users/james/Documents/PUF/workspaces/integration-harness && npm run check:package-identity
```

## 2026-06-17 P43 CI artifact 证据门禁

### 现象

P42 已经上传本地 live QA 截图，但发布验收仍依赖人工打开 Actions 日志确认。这样会出现一个断点：CI 可能显示 build 成功，却没有机器证明同一轮 run 同时留下运行账本、浏览器视觉证据和 Pages 构建包。

### 修复原则

1. 上线证据必须从日志升级为可查询的 GitHub Actions artifact 元数据。
2. 同一次 Pages workflow 必须同时拥有 `runtime-readiness-ledger`、`local-live-runtime-visual-qa` 和 `github-pages`。
3. CI 当前 run 检查必须在三个 artifact 上传之后执行，并且缺失、过期、空文件都要失败。
4. 检查只读 artifact 名称、大小、过期状态和 run/head sha，不下载内容，不打印候选正文、系统提示词、provider secret 或代表作品映射。
5. 新增发布门禁必须进入 `RELEASE_SYNC_MANIFEST.json`，避免 release 仓库和源工作区分叉。

### 本轮落地

- 新增 `scripts/check-github-actions-artifacts.mjs`。
- `package.json` 增加 `check:github-actions-artifacts`。
- `.github/workflows/pages.yml` 在 Pages artifact 上传后运行当前 run 证据检查。
- `scripts/check-pages-live-release-gate.mjs` 反向检查 workflow、package script 和 P43 文档。
- `docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md` 记录目标、命令、边界和验收项。
- `docs/baseline/RELEASE_SYNC_MANIFEST.json` 纳入 P43 文档和脚本。

### 必跑检查

```bash
npm run check:github-actions-artifacts
npm run check:pages-live-release-gate
npm run check:release-sync-manifest
```

## 2026-06-17 P4 文档优先约束重启

### 现象

P4 虽然已经从单一负例回到 `ConstraintProfile + GenreKernel`，但历史 review 文档仍残留早期场景特判建议。团队如果按这些旧建议继续开发，会把一次 prompt 修复误当成运行时规则。

### 修复原则

1. P4 从头以 `docs/product/rules/genre-runtime-rules.v1.json` 为唯一运行时事实源。
2. 任何题材、时代、地域、职业、叙事禁项都必须先抽象成 `ConstraintProfile.rules[]`，再由 compatible `GenreKernel` 影响节奏和事件结构。
3. 历史 QA 样本、后端 review 建议和浏览器评论不能直接进入 workflow、FastAPI 服务分支、provider prompt 或 smoke payload。
4. 如果文档 registry 没有某个 profile，运行时只能继续苏格拉底式澄清，不能暗自创造 off-registry 约束。

### 本轮落地

- `scan-p4-rule-source.mjs` 检查 registry 完整性、匿名引用和运行时无 hardcoded profile/kernel 分支，不维护历史 prompt-case 词表。
- `GENRE_CONSTRAINT_RULES.md` 与 `GENRE_KERNEL_RULES.md` 写入文档优先边界。
- `P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md` 增加 P4 reset 边界和新增 premise rule 的实施顺序。
- 历史 `BACKEND_TODOLIST_REVIEW_20260615.md` 中的旧场景测试建议改成 registry-driven 测试。

### 必跑检查

```bash
npm run scan:p4-rule-source
npm --workspace @narrativeos/agent-runtime test
./backend/.venv/bin/pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
```

## 2026-06-17 P42 本地 live QA 截图证据上传

### 现象

P41 已经让 CI 跑 `qa:live-runtime-local`，但截图只留在 runner 文件系统里。若本地 live QA 失败或视觉回归，团队只能读日志，无法下载浏览器证据。

### 修复原则

1. 浏览器 QA 产生的视觉证据必须作为 artifact 保留。
2. 上传步骤使用 `if: always()`，即使 QA 失败也尽量保留已生成截图。
3. Artifact 只上传 `artifacts/visual-qa/p15-live-runtime-e2e-*.png`，不上传服务日志、账本、secret 或源码目录。
4. Artifact 名称固定为 `local-live-runtime-visual-qa`，方便交接和验收时定位。

### 本轮落地

- `.github/workflows/pages.yml` 增加 `Upload local live runtime visual QA`。
- `scripts/check-pages-live-release-gate.mjs` 反向检查 artifact 名称与路径。
- P15/P16 文档同步 artifact 名称。

### 必跑检查

```bash
npm run check:pages-live-release-gate
```

## 2026-06-17 P41 本地 live-mode 创作链路 QA

### 现象

P39/P40 已经让远端 live smoke 和 readiness ledger 验证 `POST /v1/workflows/socratic-create`，但在没有远端 API/Agent URL 时，`qa:live-runtime-browser` 会按设计跳过。这样本地开发虽然有 `smoke:creator-chain`，却没有一条真正用 live-mode 前端构建、浏览器提交、direct workflow preflight 和 Tool Bridge 的完整链路。

### 修复原则

1. 本地 QA 不能另写一套“差不多”的浏览器逻辑，必须复用 `scripts/browser-live-runtime-e2e.mjs`。
2. 本地包装脚本只负责启动 FastAPI 和 Agent Runtime，并通过 `ALLOW_INSECURE_RUNTIME_SMOKE=true` 明确标注这是本地模拟，不是公网上线证据。
3. 本地 live-mode 也必须设置 `REQUIRE_PUBLIC_RUNTIME=true` 和 `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`，确保服务缺失时失败，而不是回到草稿 fallback。
4. 远端 URL 未配置时，团队仍能在合并前证明 Creator seed-to-candidate 产品链路可执行。

### 本轮落地

- 新增 `scripts/browser-live-runtime-local-e2e.mjs`。
- 新增 `npm run qa:live-runtime-local`。
- `scripts/check-live-runtime-smoke-contract.mjs` 增加本地 live-mode QA 反向检查。
- `docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md` 补充 local live-mode simulation 命令和边界。
- 本地包装脚本会自动复用可用的 backend Python venv、Playwright module 和本机 Chrome executable；没有这些依赖时仍显式失败。
- Playwright 固定为根目录 devDependency；CI 只运行 `npx playwright install chromium`，避免在 workflow 中途 `npm install --no-save` 破坏 app workspace 的 optional native binding。

### 必跑检查

```bash
npm run check:live-runtime-smoke
npm run qa:live-runtime-local
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P40 Readiness ledger 记录真实创作预检

### 现象

P39 已经让 `qa:live-runtime-browser` 在浏览器前直接调用 `/v1/workflows/socratic-create`。但 P23 readiness ledger 仍只记录 `/health`，导致上线账本和真实产品验收之间存在断层：账本可能显示 health 通过，但不证明 Creator seed-to-candidate 能跑通。

### 修复原则

1. Readiness ledger 必须记录产品链路摘要，而不是只记录基础设施健康。
2. 账本只保存公开响应摘要：`responseMode`、`candidateDraft.status`、候选稿长度、追问数量和内部字段泄漏结果。
3. 账本不能保存候选正文、Tool Bridge payload、模型 provider、system prompt、代表作品映射或任何 secret。
4. Live 强门禁下，`creator-workflow-preflight` 不通过就不能进入 public live runtime。

### 本轮落地

- `scripts/audit-live-runtime-readiness.mjs` 增加 `fetchWorkflowPreflight()`。
- Readiness ledger 新增 `workflow.socraticCreate` 与 `creator-workflow-preflight`。
- `scripts/check-runtime-readiness-ledger.mjs` 强制校验 workflow preflight 存在。
- `scripts/check-runtime-activation-package.mjs` 反向检查 P23 文档、审计脚本和账本校验器。

### 必跑检查

```bash
npm run audit:live-runtime-readiness
npm run check:runtime-readiness-ledger
npm run check:runtime-activation-package
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P39 Live Creator 链路直接预检

### 现象

P15 live browser smoke 已经会检查 API `/health`、Agent `/health`，并在浏览器里提交故事种子。但如果远端 Agent Runtime 健康接口可用、实际 `/v1/workflows/socratic-create` 到 FastAPI Tool Bridge 的链路不可用，浏览器前置状态仍可能看起来“在线”，直到提交时才暴露问题。

### 修复原则

1. “远端服务在线”不能等同于“创作链路可用”。
2. 浏览器 QA 启动前必须直接调用 `POST /v1/workflows/socratic-create`，验证 Agent workflow、Tool Bridge、Runtime facade 和公开响应投影同时可用。
3. 直接预检只接受 public response；不得返回 `runtimeArtifact`、`sourceRefs`、`kernelId`、`profileId`、`activeConstraints`、`activeKernels`、`sourceLabels`、`runTrace`、`ledger`、`cost` 等内部字段。
4. 候选稿仍必须是 `candidate`，长度 300-900 字符，追问不超过 2 个；不能因为是预检就放宽产品标准。

### 本轮落地

- `scripts/browser-live-runtime-e2e.mjs` 增加 `preflightSocraticCreate()`，在浏览器流程前直接调用远端 Agent workflow。
- `scripts/check-live-runtime-smoke-contract.mjs` 增加反向检查，确保后续不会退回只做 health check。
- `docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md` 补充 direct workflow preflight 验收项。

### 必跑检查

```bash
npm run check:live-runtime-smoke
npm run qa:live-runtime-browser
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P27 CI readiness ledger 读取 GitHub variables

### 现象

P26 后下载最新 `runtime-readiness-ledger` artifact，发现 `repoVariables.checked=false`。这说明 artifact 虽然存在，也通过了结构与隐私校验，但 CI 没有证明它真的读取了 GitHub repository variables；它只是从 workflow 环境推断当前仍是 disabled runtime。

### 修复原则

1. CI 中的 readiness ledger 必须能读取 GitHub repository variables，并把 `repoVariables.checked=true` 写入 artifact。
2. Workflow 需要给相关步骤注入 `GH_TOKEN: ${{ github.token }}` 与 `${{ vars.* }}` 环境，并授予 `actions: read`。
3. 本地运行不强制 GitHub variables 审计，以免开发者没有登录 `gh` 时无法跑测试。
4. `check:runtime-readiness-ledger` 在 `CI=true` 时强制要求 `repoVariables.checked=true`。

### 本轮落地

- `.github/workflows/pages.yml` 给 `Run runtime checks` 与 `Gate public runtime release mode` 注入 `GH_TOKEN` 和同一组 public runtime vars。
- `.github/workflows/pages.yml` 增加 `actions: read` 权限。
- `scripts/audit-live-runtime-readiness.mjs` 优先使用 `gh variable list`，失败时在 GitHub Actions 中使用 `${{ vars.* }}` context 作为来源。
- `scripts/check-runtime-readiness-ledger.mjs` 在 CI 中强制检查 `repoVariables.checked=true` 和 GitHub-backed `repoVariables.source`。
- `scripts/check-pages-live-release-gate.mjs` 与 `scripts/check-runtime-activation-package.mjs` 反向检查 GH_TOKEN 和权限。

### 必跑检查

```bash
npm run check:pages-live-release-gate
npm run check:runtime-activation-package
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P26 Readiness ledger 内容和隐私校验

### 现象

P25 已经把 readiness ledger 上传成 GitHub Actions artifact，但仍然只证明“有一个 JSON 被上传”。上线证据本身也需要门禁：结构必须稳定，状态和阻塞项必须可读，且不能把 provider secret、API key、system prompt、数据库连接串、代表作品映射等内部信息写进 artifact。

### 修复原则

1. 账本生成后必须立刻验证，不能只在 CI 页面看到 artifact 名字。
2. 校验范围包括 top-level schema、状态枚举、health 节点、必备 check id、blocked/ready 关系。
3. 校验器递归扫描 key 和 value，禁止 secret、token、database、provider、system prompt、raw state、representative/source refs/vault 等敏感痕迹。
4. Root test 必须保持顺序：先 `audit:live-runtime-readiness`，再 `check:runtime-readiness-ledger`。

### 本轮落地

- 新增 `scripts/check-runtime-readiness-ledger.mjs`。
- 新增 `npm run check:runtime-readiness-ledger` 并纳入 root `npm run test`。
- `scripts/check-runtime-activation-package.mjs` 反向检查账本校验器。
- P23 ledger 文档补充内容校验和隐私边界。

### 必跑检查

```bash
npm run audit:live-runtime-readiness
npm run check:runtime-readiness-ledger
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P25 Readiness ledger 上传为 CI artifact

### 现象

P24 已经让 GitHub Pages workflow 在 release gate 中生成 readiness ledger；但 workflow 运行结束后，`artifacts/runtime/live-runtime-readiness-*.json` 只存在于 runner 临时文件系统。真正 live gate 失败时，团队反而最需要这份证据，却无法从 Actions 页面直接下载。

### 修复原则

1. Readiness ledger 是上线证据，必须作为 GitHub Actions artifact 保留。
2. 上传步骤必须 `if: always()`，确保 live gate 失败时也会执行。
3. Artifact 上传只收集 `artifacts/runtime/live-runtime-readiness-*.json`，不上传日志、secret、构建产物或本地数据库。
4. 反向检查器必须固定 artifact 名称和路径，避免后续 workflow 漂移。

### 本轮落地

- `.github/workflows/pages.yml` 增加 `Upload runtime readiness ledger`。
- Artifact 名称固定为 `runtime-readiness-ledger`，保留 14 天。
- `scripts/check-pages-live-release-gate.mjs` 和 `scripts/check-runtime-activation-package.mjs` 反向检查上传步骤。
- P20/P23 文档同步验收证据和 artifact 行为。

### 必跑检查

```bash
npm run check:pages-live-release-gate
npm run check:runtime-activation-package
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P24 Readiness ledger 接入 Pages live gate

### 现象

P23 把 live runtime 上线断点做成了 evidence ledger，并纳入 root `npm run test`。但 GitHub Actions 的 public release gate 在 live 模式中仍然直接从 config check 进入浏览器 smoke；如果 root test 没拿到 workflow env，账本可能只记录 disabled 状态，不能代表这次 live 发布的真实变量。

### 修复原则

1. GitHub Pages workflow 的 gate step 必须在同一组 repository variables 环境里生成 readiness ledger。
2. 默认 disabled 发布可以生成 `blocked` 账本但继续部署静态预览。
3. `VITE_PUBLIC_RUNTIME_MODE=live` 时必须先跑 `REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness`，再跑 `qa:live-runtime-browser`。
4. 反向检查器要验证 workflow 顺序，避免后续把账本从 release gate 里删掉。

### 本轮落地

- `.github/workflows/pages.yml` 的 `Gate public runtime release mode` 增加 readiness ledger。
- live 分支增加 `REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness`。
- `scripts/check-pages-live-release-gate.mjs` 和 `scripts/check-runtime-activation-package.mjs` 反向检查该顺序。
- P20/P23 文档同步 GitHub Actions live gate 行为。

### 必跑检查

```bash
npm run check:pages-live-release-gate
npm run check:runtime-activation-package
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P23 Live runtime 上线证据账本

### 现象

P19/P20/P22 已经让 public live runtime 有了变量门禁、activation runbook 和真实 Creator 链路 smoke，但上线断点仍然分散在多个命令输出里。部署方说“远端已经好了”时，前端侧缺少一份统一账本来记录 GitHub variables、API health、Agent health、public URL 和阻塞项。

### 修复原则

1. 上线事实必须落成 artifact，而不是散落在终端截图和口头描述里。
2. 当前未配置远端时，审计命令应该清楚输出 `blocked`，但不能阻塞静态预览 CI。
3. 真正切 live 前，使用 `REQUIRE_LIVE_RUNTIME_READY=true` 把同一条命令升级成强门禁。
4. 账本只能记录 URL、health 和 checks，不能记录 provider secret、API key、system prompt、数据库连接串或代表作品映射。

### 本轮落地

- 新增 `scripts/audit-live-runtime-readiness.mjs`。
- 新增 `npm run audit:live-runtime-readiness` 并纳入 root `npm run test`。
- 新增 `docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md`。
- P20 activation runbook 增加 readiness ledger 步骤和验收证据。
- `scripts/check-runtime-activation-package.mjs` 反向检查 P23 脚本、文档和 package script。

### 必跑检查

```bash
npm run audit:live-runtime-readiness
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P22 Creator 链路 smoke 纳入 CI 门禁

### 现象

`smoke:creator-chain` 已经能启动 FastAPI 和 Agent Runtime，验证 Socratic create、quality brake、state preview 都通过 Tool Bridge，且候选状态不写 canon/branch。但它只是 workflow 里额外跑的一条命令，root `npm run test` 没包含它。本地开发者只跑 root test 时，可能漏掉最关键的端到端链路。

### 修复原则

1. 根目录 `npm run test` 是唯一可信总门禁，真实 API + Agent + Tool Bridge smoke 必须进入这里。
2. GitHub Actions 只调用 root test，避免 CI 和本地门禁分叉。
3. Activation package checker 要反向验证 root test 包含 `smoke:creator-chain`。

### 本轮落地

- `package.json` 将 `npm run smoke:creator-chain` 串入 root `npm run test`。
- `.github/workflows/pages.yml` 的 runtime checks 改为单行 `npm run test`，不再重复单独调用 smoke。
- `scripts/check-runtime-activation-package.mjs` 新增 root test/smoke 入口一致性检查。
- P20 activation runbook 的验收证据补充 creator-chain smoke 输出。

### 必跑检查

```bash
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P21 公共仓库历史隐私审计

### 现象

P17/P18 已经把当前 `ConstraintProfile`、`GenreKernel` 和公开规则文档里的代表作品名改成匿名 `rwref_*`，并把明文映射放入加密 vault。但法律风险不只在当前文件：如果 Git 历史、静态构建产物或旧提交里出现过明文代表作品名，非团队成员仍可能看到。

### 修复原则

1. 当前源码、规则文档、构建产物和 Git 历史都属于公共暴露面。
2. CI 无 vault key 时也要做结构性门禁：不能提交 key、不能出现 public rule title markers、不能出现非匿名 sourceRefs。
3. 本机或团队环境有 vault key 时，必须对当前文件、`app/dist` 和历史 blob 做精确标题匹配。
4. 扫描器输出只报告文件与行号，不打印解密出的代表作品名。

### 本轮落地

- `scripts/scan-reference-privacy.mjs` 增加 `app/dist` 扫描。
- 同一脚本增加 Git object history 扫描，覆盖历史中的 key 路径、具体 key 值、公开规则标题标记和 decrypted title 精确匹配。
- `REFERENCE_WORK_PRIVACY.md` 和 `REFERENCE_WORK_PRIVACY_AUDIT_20260617.md` 更新为当前门禁范围。

### 必跑检查

```bash
npm run scan:reference-privacy
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P18 代表作品 vault key 分离门禁

### 现象

P17 已经证明公开 kernel/constraints 只使用匿名 `rwref_*`，但扫描范围仍主要集中在规则目录。如果后续把 QA 报告、handoff 文档、生成代码或构建产物带入公开仓库，仍可能绕过规则目录扫描，把代表作品明文或解密 key 泄漏出去。

### 修复原则

1. 代表作品隐私门禁必须覆盖整个 tracked public repository，而不只是 `docs/product/rules`。
2. 公开仓库可以提交 encrypted vault，但不能提交 vault key、具体 `REFERENCE_WORK_VAULT_KEY` 值或任何可逆映射。
3. 隐私说明文档本身也不能用疑似真实字段示例绕过扫描。
4. 有本地 key 时扫描器继续解密 vault，对全仓 tracked 文本做精确作品名泄漏扫描。

### 本轮落地

- `scripts/scan-reference-privacy.mjs` 改为读取 `git ls-files`，对 tracked public files 做 key/value 和明文标题扫描。
- 新增 committed key 检查：禁止 `reference-work-vault.key`、`private/` 路径和具体 `REFERENCE_WORK_VAULT_KEY` 值进入仓库。
- `REFERENCE_WORK_PRIVACY.md` 去掉会被误解为可公开的明文字段示例，并说明全仓扫描范围。
- 新增 `REFERENCE_WORK_VAULT_ACCESS.md`，给团队说明解密、轮换、提交和验证流程。

### 必跑检查

```bash
npm run scan:reference-privacy
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P19 公开 live runtime 配置审计

### 现象

GitHub Pages 已经能稳定发布 Creator Studio，但公开页面仍是 `VITE_PUBLIC_RUNTIME_MODE=disabled`。如果只看页面可访问，会误以为产品已经具备公网创作能力；实际上远端 FastAPI 与 Agent Runtime URL 没有配置时，公开页面必须保持“创作服务待连接”。

### 修复原则

1. live 能力必须通过 GitHub repository variables 启用，不能通过前端代码改默认值。
2. `VITE_API_ORIGIN` 和 `VITE_AGENT_RUNTIME_BASE_URL` 必须是 remote HTTPS，不能是 localhost、示例域名或空值。
3. 静态 preview 可发布，但必须清楚标记为 runtime 未连接；不能生成本地假正文。
4. 切到 live 前必须跑浏览器级 `qa:live-runtime-browser`。

### 本轮落地

- 新增 `scripts/check-public-live-config.mjs`。
- 新增 `npm run check:public-live-config` 并纳入 root test。
- 新增 `docs/backend/P19_PUBLIC_LIVE_RUNTIME_CONFIG_AUDIT.md`，记录当前 repo vars/secrets 为空、公开站点仍是 disabled runtime。
- 脚本支持 `CHECK_GITHUB_REPO_VARS=true` 审计 GitHub repo vars，也支持 `REQUIRE_PUBLIC_LIVE_CONFIG=true` 作为强制 live 门禁。

### 必跑检查

```bash
npm run check:public-live-config
CHECK_GITHUB_REPO_VARS=true npm run check:public-live-config
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P20 远端 runtime activation 包

### 现象

P19 证明 GitHub Pages 仍是 disabled runtime，但还缺一份部署方可以直接执行的 activation 包。只告诉团队“配置 API/Agent URL”太松，会遗漏 Tool Bridge env、CORS、health、live smoke、GitHub variables 和 rollback 这些真正决定上线成败的细节。

### 发现

部署包里发现一个实际接线漂移：`docker-compose.yml` 和 P14 文档使用 `FASTAPI_TOOL_BRIDGE_BASE_URL`，但 Agent Runtime 读取的是 `MASTRA_TOOL_BRIDGE_BASE_URL`。如果直接按旧文档部署，Agent 会回退到本机 `127.0.0.1:8787`，导致公网 live workflow 调不到 FastAPI。

### 修复原则

1. Agent Runtime 新部署统一使用 `MASTRA_TOOL_BRIDGE_BASE_URL`。
2. `FASTAPI_TOOL_BRIDGE_BASE_URL` 只保留为兼容旧环境的 fallback，不作为新文档标准。
3. Agent Runtime 公开部署必须配置 `MASTRA_ALLOWED_ORIGINS`，不能长期依赖 wildcard CORS。
4. Activation 不仅要有文档，还要有机器检查，防止 env 名、CORS 和 smoke 命令再次漂移。

### 本轮落地

- `toolBridge.ts` 支持 `MASTRA_TOOL_BRIDGE_BASE_URL`，并兼容旧 `FASTAPI_TOOL_BRIDGE_BASE_URL`。
- `server.ts` 增加 `MASTRA_ALLOWED_ORIGINS`，按请求 origin 返回 CORS。
- `deploy/runtime-preview/docker-compose.yml` 改用 `MASTRA_TOOL_BRIDGE_BASE_URL` 并配置 `MASTRA_ALLOWED_ORIGINS`。
- `P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md` 同步新变量名。
- 新增 `P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md`，覆盖服务职责、env、CORS、health、Tool Bridge、GitHub variables、activation、live smoke、rollback 和验收证据。
- 新增 `scripts/check-runtime-activation-package.mjs` 并纳入 root test。

### 必跑检查

```bash
npm run check:runtime-deploy-readiness
npm run check:runtime-activation-package
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P17 代表作品隐私审计

### 现象

GenreKernel 和 ConstraintProfile 需要从主流小说中提炼结构，但公开仓库不能暴露代表作品名称、作者名或可还原的作品元数据。否则产品和法律风险会从“参考结构”变成“明示借鉴对象”。

### 修复原则

1. 公开规则只能出现 `rwref_0000` 形式的匿名引用。
2. 真实作品名只能存在于加密 vault，不能进入 kernel、constraints、前端或后端 runtime。
3. 公开规则文件禁止出现 `《...》` 书名标记。
4. 公开 ref map 只能包含匿名 `id`，不能出现 title、author、name、work、source labels 或 provenance maps 等字段。
5. 隐私扫描必须进入 `npm run test`，不能靠人工记忆。

### 本轮落地

- 审计 `genre-runtime-rules.v1.json`、`GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md`、public refs 和 encrypted vault。
- `scripts/scan-reference-privacy.mjs` 新增公开规则书名/作者元数据扫描。
- 新增 `docs/product/rules/REFERENCE_WORK_PRIVACY_AUDIT_20260617.md`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run scan:reference-privacy
```

## 2026-06-17 P16 Pages Live Release Gate

### 现象

P15 已经有 live browser smoke，但如果 GitHub Pages workflow 仍然只硬编码静态模式，团队切换 live 可能会绕过验收，或者通过临时改代码打开入口。上线控制应该由仓库 variables 和 CI gate 负责。

### 修复原则

1. GitHub Pages 默认 `disabled`，但 runtime mode 必须由 repository variables 控制。
2. live 模式必须先跑 `REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser`。
3. 本地 fallback 在公开构建里永远是 `false`，不能由变量覆盖。
4. live 切换不改前端代码，只改 GitHub variables，回滚也只改 variables。
5. gate 必须在 build 前运行，不能在部署后才发现能力没接上。

### 本轮落地

- `.github/workflows/pages.yml` 支持 `vars.VITE_PUBLIC_RUNTIME_MODE`。
- `.github/workflows/pages.yml` 支持 `vars.VITE_API_ORIGIN`、`vars.VITE_API_BASE_URL`、`vars.VITE_AGENT_RUNTIME_BASE_URL`。
- workflow 增加 `Gate public runtime release mode` 步骤。
- 新增 `docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md`。
- 新增 `scripts/check-pages-live-release-gate.mjs` 并串入 `npm run test`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:pages-live-release-gate
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P15 远端 Runtime Live Smoke

### 现象

P14 能证明两个服务可以被部署，但不能证明公开 Creator Studio 能从浏览器侧真实调用远端 Agent Runtime 并返回候选正文。部署健康和产品链路之间仍有一层断点。

### 修复原则

1. live 验收必须从浏览器发起，而不是只用 curl 检查 health。
2. 没有远端 URL 时，live smoke 应该明确 `skipped`；设置 `REQUIRE_PUBLIC_RUNTIME=true` 时必须严格失败。
3. live 构建必须使用 `VITE_PUBLIC_RUNTIME_MODE=live` 和 `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`。
4. 浏览器验收必须检查正文长度、追问数量、服务状态和内部词泄漏。
5. live smoke 只证明 candidate 创作链路，不证明 canon、支付或生产数据库。

### 本轮落地

- 新增 `scripts/browser-live-runtime-e2e.mjs`。
- 新增 `scripts/check-live-runtime-smoke-contract.mjs`。
- 新增 `docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md`。
- 新增 `npm run qa:live-runtime-browser`。
- 新增 `npm run check:live-runtime-smoke` 并串入 `npm run test`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:live-runtime-smoke
npm run qa:live-runtime-browser
```

有远端 URL 后：

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run qa:live-runtime-browser
```

## 2026-06-17 P14 远端 Runtime 部署包

### 现象

P13 已经把 GitHub Pages 的静态预览边界说清楚，但公开创作要真正可用，还需要两个远端服务：FastAPI 业务运行时和 Agent Runtime 编排服务。只发布前端会得到“可打开但不可生成”的产品断点。

### 修复原则

1. FastAPI 和 Agent Runtime 必须作为两个独立 deployable unit 管理。
2. Agent Runtime 不直接连数据库，仍通过 FastAPI Tool Bridge 触达业务事实。
3. 两个服务都必须有 `/health`，并且端口和 host 通过环境变量控制。
4. FastAPI CORS 必须允许 GitHub Pages origin，后续 live preview 才能接入。
5. 部署包要中立，不先锁死某一家云厂商；Dockerfile + compose 是最小可迁移基线。

### 本轮落地

- 新增 `deploy/api/Dockerfile`。
- 新增 `deploy/agent-runtime/Dockerfile`。
- 新增 `deploy/runtime-preview/docker-compose.yml`。
- Agent Runtime 增加生产 `start` 脚本。
- FastAPI 默认 CORS 加入 `https://jzvcpe-goat.github.io`。
- 新增 `docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md`。
- 新增 `scripts/check-runtime-deploy-readiness.mjs` 并串入 `npm run test`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:runtime-deploy-readiness
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P13 公开 Runtime 预览契约

### 现象

GitHub Pages 可以发布静态 Creator Studio，但不能承载 FastAPI 或 Agent Runtime。如果公开构建继续隐式使用 `127.0.0.1:4111`，用户提交创作时会把“服务未部署”“服务挂了”“本地兜底”混成同一个失败状态，产品上也会误以为入口已经真实可用。

### 修复原则

1. 公开前端必须显式区分三种状态：本地开发、静态预览、远端 live 预览。
2. 静态公开预览必须设置 `VITE_PUBLIC_RUNTIME_MODE=disabled` 和 `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`。
3. 公共域名不能默认请求 localhost Agent Runtime。
4. 用户可见文案只说“创作服务可用 / 待连接”，不展示 Runtime、provider、fallback、system prompt 等内部词。
5. live 预览上线前必须用 `REQUIRE_PUBLIC_RUNTIME=true` 检查远端 HTTPS API 与 Agent Runtime 配置。

### 本轮落地

- `app/src/api/creator.ts` 增加 `getCreatorRuntimeAvailability()`。
- GitHub Pages workflow 显式设置静态预览模式。
- 静态 Pages 浏览器 QA 验证“创作服务待连接”与无假对话。
- 新增 `docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md`。
- 新增 `scripts/check-public-runtime-preview.mjs` 并串入 `npm run test`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:public-runtime-preview
npm run qa:pages-browser
```

## 2026-06-17 P12 静态公开预览浏览器 QA

### 现象

P10/P11 的公开页问题都是浏览器真实路径才暴露出来的：CTA 点击层级、GitHub Pages hash 路由、无运行时边界。只跑接口 smoke 或直接打开 `/create` 都会绕过这些风险。

### 修复原则

1. 静态公开预览必须有独立浏览器 QA，不启动 FastAPI 和 Agent Runtime。
2. QA 构建必须模拟 GitHub Pages：`VITE_ROUTER_MODE=hash`。
3. QA 构建必须显式关闭本地兜底：`VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`。
4. QA 必须验证三件事：`/#/create` 可直达、首页“开始创作”CTA 可点击、无运行时时不生成假对话。
5. QA 需要保存截图证据，但截图不进入 git。

### 本轮落地

- 新增 `scripts/browser-pages-preview-e2e.mjs`。
- 新增 `npm run qa:pages-browser`。
- 脚本构建 hash 静态包，复制 `404.html`，启动 Vite preview，并用真实 Chrome 验证公开预览边界。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
PLAYWRIGHT_MODULE_PATH=/Users/james/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js \
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
npm run qa:pages-browser
```

## 2026-06-17 P11 GitHub Pages 深链接刷新

### 现象

应用内导航可以进入 `/create`、`/story`、`/library`，但用户直接打开或刷新这些路径时，GitHub Pages 返回 404。这是 BrowserRouter 部署到静态 Pages 的典型断点。实测还发现当前 Pages 会把项目路径规范到根域，单靠 `404.html` 不足以保证 `/create` 深链接稳定。

### 修复原则

1. GitHub Pages build 必须使用 hash router，让公开分享路径变成 `/#/create` 这类静态站可控路径。
2. GitHub Pages artifact 仍然同时包含 `index.html` 和 `404.html`，作为非 hash 深链接的兜底。
3. `404.html` 必须由当前 build 的 `index.html` 复制生成，不能手写一份可能过期的静态文件。
4. Pages workflow 也属于工程契约，必须进入 source/release 同步门禁。
5. 检查脚本必须验证 workflow 同时设置 `VITE_ROUTER_MODE: hash` 和生成 `app/dist/404.html`。

### 本轮落地

- `.github/workflows/pages.yml` 在 build 环境设置 `VITE_ROUTER_MODE: hash`。
- 同一 workflow 在 `npm --prefix app run build` 后执行 `cp app/dist/index.html app/dist/404.html`。
- 新增 `scripts/check-github-pages-spa-fallback.mjs`。
- `npm run test` 串入 `check:github-pages-spa-fallback`。
- `RELEASE_SYNC_MANIFEST.json` 将 Pages workflow 改为 `syncAsIs`，不再当作 release-only。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:github-pages-spa-fallback
```

## 2026-06-17 P10 首页创作 CTA 点击遮挡

### 现象

P9 公开页验证时发现：首页“开始创作”CTA 在 1280px 宽度下会被右侧封面按钮的点击层拦截。视觉上按钮存在，但真实点击落到了封面舞台上，用户无法稳定进入创作页。

### 修复原则

1. 首页主 CTA 是商业转化入口，必须用真实浏览器点击验证，不能只看截图。
2. 同一卡片内存在多个可点击区域时，主 CTA 所在 copy 区域必须有更高层级。
3. 大屏 grid 要明确左右列归属，避免封面按钮跨列覆盖正文按钮。
4. 浏览器 E2E 必须从首页点击“开始创作”进入 `/create`，不能直接打开 `/create` 绕过入口。

### 本轮落地

- `.commercial-feature-copy` 层级提高到 `z-index: 2`。
- 大屏下显式设置 `.commercial-feature-copy` 在第一列、`.commercial-cover-stage` 在第二列。
- `scripts/browser-creator-e2e.mjs` 改为从首页点击“开始创作”进入 Creator Studio。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
PLAYWRIGHT_MODULE_PATH=/Users/james/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js \
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python \
npm run qa:creator-browser
```

## 2026-06-17 P9 公共部署运行时边界

### 现象

GitHub Pages 是静态前端。如果没有公开 FastAPI 和 Agent Runtime，`/create` 以前会在请求失败后进入本地草稿兜底。这个逻辑适合 localhost 开发，但不适合公共部署；公共用户会误以为创作链路已经真实接上。

### 修复原则

1. localhost / Vite dev 可以保留本地兜底，用来保证开发不中断。
2. 公共域名默认不能进入本地假生成；除非显式设置 `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=true`。
3. 公共运行时失败时必须保留用户输入，并给出普通用户能理解的服务未连接提示。
4. 提示文案不能出现 backend、provider、fallback、system prompt 等内部词。
5. 这条边界必须进入 `npm run test`，不能靠人工记忆。

### 本轮落地

- `/create` 增加 `allowLocalCreatorFallback()`。
- 公共部署无运行时时，提示“创作服务暂时未连接。请稍后再试，或在本地创作环境继续。”并停止本地草稿生成。
- 新增 `scripts/check-public-runtime-boundary.mjs`。
- `npm run test` 串入 `check:public-runtime-boundary`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:public-runtime-boundary
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P8 Creator Studio 浏览器级 E2E

### 现象

接口 smoke 能证明 Mastra workflow、FastAPI Tool Bridge 和 state preview 能跑通，但不能证明 `/create` 页面真的把用户输入送到 agent runtime，也不能证明页面没有退回本地草稿或泄露内部字段。

### 修复原则

1. Creator Studio 的关键链路必须有真实浏览器证据：打开 `/create`、输入一句故事种子、点击开始、等待候选正文和追问出现。
2. 浏览器 QA 不能强行进入 CI 主链；Playwright/Chrome 属于本地验收依赖，避免污染产品包和 GitHub Pages 发布速度。
3. 浏览器 QA 必须检查公共页面边界：不能出现 provider、fallback、rawHash、AgentRun、canon_written 等内部词。
4. 候选正文必须足够像正文，不能只是一句状态提示；首轮追问不能超过两个。
5. QA 产物必须保存截图路径，方便人工验收和回归比较。

### 本轮落地

- 新增 `scripts/browser-creator-e2e.mjs`。
- 新增 `npm run qa:creator-browser`。
- 脚本会启动临时 FastAPI、Agent Runtime 和 Vite 服务，用真实浏览器提交 `/create`，并输出 draft 长度、追问数量和截图路径。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
PLAYWRIGHT_MODULE_PATH=/Users/james/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js \
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python \
npm run qa:creator-browser
```

## 2026-06-17 P7 发布同步清单门禁补齐

### 现象

源工作区已经有发布同步清单，但 GitHub release 仓库没有完整接入。结果是每次从 source 同步到 release 时，仍然需要人工判断哪些文件能直接复制，哪些文件不能复制；尤其容易把未完成文档段落带入 release，或漏掉 P4/P6 新增扫描脚本。

### 修复原则

1. 所有“必须机械一致”的文件进入 `docs/baseline/RELEASE_SYNC_MANIFEST.json` 的 `syncAsIs`。
2. 有发布身份差异的文件只能进入 `managedWithReleaseOverrides`，不能进入 `syncAsIs`。
3. 代表作品匿名引用、runtime rule、kernel/constraint 文档和相关扫描脚本必须被纳入同步门禁。
4. release 仓库本地检查可以和 source 逐文件比较；GitHub CI 没有 source 根时，也必须完成 manifest 结构和 release-only 文件存在性检查。

### 本轮落地

- 扩展 `RELEASE_SYNC_MANIFEST.json`，覆盖 Creator 链路测试、规则文档、匿名引用文件、P4/P6 扫描脚本和核心 agent workflow。
- `scripts/check-release-sync-manifest.mjs` 增加重复项检查、release-only 文件检查和 release override 防误同步检查。
- release 仓库 `npm run test` 串入 `check:release-sync-manifest`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:release-sync-manifest

cd /Users/james/Documents/PUF/releases/parallel-universe-novel-github
npm run check:release-sync-manifest
```

## 2026-06-17 P6 代表作品隐私边界加固

### 现象

kernel 和 constraints 已经使用 `rwref_*` 匿名引用，但旧扫描在 CI 没有本地解密 key 时只能做浅层检查。这样即使 public ref 表误加了 `title` 字段，或 runtime 里引用了不存在的 ref，也可能没有被及时拦住。

### 修复原则

1. 加密 vault 必须只保留密文字段，不能出现 `refs / titles / works / representativeWorks` 等明文字段。
2. `reference-work-public-refs.json` 只能公开匿名 `id`，不能公开来源标签、作品名、作者名、榜单名或 benchmark title。
3. `genre-runtime-rules.v1.json` 的 `sourceRefs` 必须全部是 `rwref_0000` 格式，并且必须存在于 public ref 表。
4. `GENRE_CONSTRAINT_RULES.md` 和 `GENRE_KERNEL_RULES.md` 只能引用已登记的 `rwref_*`。
5. 有本地 key 时继续解密 vault 做明文标题泄漏扫描；没有 key 时也必须完成结构级隐私检查。

### 本轮落地

- `scripts/scan-reference-privacy.mjs` 增加 vault shape 校验。
- 同一脚本增加 public refs schema 校验，禁止 `title/name/work/source label` 等额外字段。
- 同一脚本增加 runtime JSON 和规则 Markdown 的 `sourceRefs` 完整性校验。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run scan:reference-privacy
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P5 文档内核驱动的小说正文 Composer

### 现象

P4 返工后，Creator 首段候选已经不再按单一题材写死，但输出仍偏“结构说明”：正文里会出现“这不是一句设定”“某题材故事里第一个异常”“这一章应该停在”这类作者规划口吻。它能证明 kernel 被读取，却不像用户要看的小说正文。

### 修复原则

1. `GenreKernel` 负责提供节奏、动机、冲突和边界，不负责把字段名直接渲染给作者。
2. Creator 首段必须先进入场景：时间、动作、压力和选择，而不是解释这是哪类故事。
3. 规则的 `antiThesis` 不能原样进入正文；要转成世界内的边界感，比如“任何捷径都绕不开某个代价”。
4. 用户写“主角”时，正文要改写成“他/她/那个人”，避免小说正文露出创作占位词。
5. 后续追问保持苏格拉底式自然语言，不展示 kernel、constraint、profile 或后端字段。

### 本轮落地

- `packages/agent-runtime/src/workflows.ts` 增加通用正文 composer：从 seed 进入场景，再按 active kernel 的 `eventStructure / motiveRules / conflictRules / climaxRules / antiThesis` 组织段落。
- `packages/agent-runtime/src/constraints.ts` 扩展 `publicProseScaffoldTerms`，把结构说明痕迹纳入统一质量检查。
- `packages/agent-runtime/src/workflows.test.ts` 增加正文和追问公共文案边界测试。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
npm run scan:p4-rule-source
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P18 发布同步清单

### 现象

源工作区和 GitHub 发布仓库不是同一个 git root。之前同步靠手动复制文件，容易漏掉新增脚本，也容易把 `package.json` 的 release-only 身份覆盖掉。

### 修复原则

1. 允许机械同步的文件必须进入机器可读清单。
2. `package.json` 这种源/发布身份不同的文件不能列入 `syncAsIs`，只能列入 `managedWithReleaseOverrides`。
3. 发布仓库测试必须能比较 release 文件和 source 文件是否一致。
4. 清单本身也必须作为 `syncAsIs` 文件同步。

### 本轮落地

- 新增 `docs/baseline/RELEASE_SYNC_MANIFEST.json`。
- 新增 `scripts/check-release-sync-manifest.mjs`。
- 源工作区运行时检查清单结构和源身份；发布仓库运行时额外逐文件比较 `syncAsIs` 与源工作区。
- 根目录 `npm run test` 已串入 `check:release-sync-manifest`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:release-sync-manifest

cd /Users/james/Documents/PUF/releases/parallel-universe-novel-github
npm run check:release-sync-manifest
```

## 2026-06-17 P17 发布包身份防回归

### 现象

源工作区根包名是 `integration-harness`，GitHub 发布仓库根包名必须是 `parallel-universe-novel`。P14 与 P16 的机械同步都差点把源工作区 `package.json` 直接覆盖到发布仓库，造成发布包身份回退。

### 修复原则

1. 源工作区和发布仓库可以复用脚本，但根包身份不能混用。
2. 发布仓库必须保持 `name=parallel-universe-novel`，描述必须保持平行宇宙小说产品名。
3. 这类发布身份不能靠人工检查，必须进入 `npm run test`。

### 本轮落地

- 新增 `scripts/check-package-identity.mjs`。
- 脚本根据当前路径区分源工作区和发布仓库，分别校验 package name 与 description。
- 根目录 `npm run test` 已串入 `check:package-identity`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run check:package-identity

cd /Users/james/Documents/PUF/releases/parallel-universe-novel-github
npm run check:package-identity
```

## 2026-06-17 P16 公开 UI 与运行时元信息边界

### 现象

P14/P15 把规则版本、profile/kernel 数量和隐私策略暴露给 Agent `/health` 与 FastAPI `genre_constraint_facts`，用于工程审计。但这些字段如果被普通 Creator/Reader 页面消费，就会把运行时内部结构泄漏给作者或读者。

### 修复原则

1. `app/src/api` 可以保留工程字段，用于状态回传、质量检查和调试。
2. 普通用户入口不得消费或渲染 `runtimeRules/runtime_rules/profileCount/kernelCount/sourceRefs/genre_constraint_facts/runTrace/harness_trace` 等运行时字段。
3. Studio 可作为后台调试入口另行设计，不和 Creator/Reader 公共入口共用边界。
4. Creator 页面只展示自然语言正文、追问、故事笔记、段落检查和写作记忆摘要。

### 本轮落地

- 新增 `scripts/scan-public-ui-boundary.mjs`。
- 根目录 `npm run test` 已串入 `scan:public-ui-boundary`。
- 扫描范围覆盖 `Home / Library / Story / Create / Welcome` 与普通 design-system/pattern/creator/market 组件。
- API 层仍可持有运行时字段，但普通 UI 层一旦引用会直接失败。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run scan:public-ui-boundary
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P15 真实 HTTP 规则握手 Smoke

### 现象

P14 已经有单测和脚本验证规则版本一致，但它们仍然可能绕过真实服务启动路径。真实 smoke 只证明创作链路可用，还没有证明 FastAPI 与 agent runtime 在同一次启动中读到同一份规则。

### 修复原则

1. `smoke:creator-chain` 必须验证真实 HTTP 服务，而不是只验证模块导入。
2. Agent `/health` 的 `runtimeRules` 必须和 FastAPI `/v1/creator/dialogue/sessions` 返回的 `setting_cards.genre_constraint_facts.runtime_rules` 对齐。
3. 规则握手只作为工程验收，不进入普通用户 UI。

### 本轮落地

- `scripts/smoke-creator-chain.mjs` 增加 `assertRuntimeRuleHandshake`。
- Smoke 在同一组临时端口中启动 FastAPI 与 agent runtime，并核对 version、source、profile count、kernel count、privacy policy。
- 后续规则文件改动若导致任一服务读错路径，真实链路 smoke 会直接失败。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run smoke:creator-chain
```

## 2026-06-17 P14 规则版本握手

### 现象

Mastra agent runtime 与 FastAPI Creator Dialogue 都已经读取 `genre-runtime-rules.v1.json`，但没有共同暴露“读到的是哪个版本、多少个 Profile、多少个 Kernel、代表作品是否仍为加密引用”。一旦某侧读到旧文件，页面仍可能看起来正常，实际规则会漂移。

### 原因

1. P4 先完成了同源读取和激活排序，但没有建立跨服务握手。
2. Agent `/health` 只暴露 workflow/contract 信息，FastAPI `genre_constraint_facts` 只暴露 active profile/kernel。
3. 没有脚本快速检查编译后的 agent runtime 是否和文档 JSON 保持一致。

### 修复原则

1. 规则事实源仍只有 `docs/product/rules/genre-runtime-rules.v1.json`。
2. Mastra 与 FastAPI 都必须暴露同一组可审计摘要：version、source、profile count、kernel count、privacy policy。
3. 这些摘要只用于 QA、调试和后端交接；普通 Creator/Reader UI 不展示。
4. 增删 Profile/Kernel 后，必须先让版本握手检查通过，再讨论生成效果。

### 本轮落地

- Agent runtime 新增 `runtimeRulesMeta`，并挂到 `/health` 的 `agentRuntimeMeta.runtimeRules`。
- FastAPI `genre_constraint_facts.runtime_rules` 返回同源规则摘要。
- 新增 `npm run check:runtime-rule-handshake`，核对编译后的 agent runtime 与 JSON 规则源。
- 根目录 `npm run test` 已串入该检查。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P13 公开正文洁净度检查

### 现象

P12 已经移除了候选正文里的 `本轮节拍`、`BeatPlan` 和机器箭头等流程痕迹，但检查点仍散落在单测与 smoke 中。长期看，这会让“公开正文能不能给作者看”变成零散断言，而不是运行时统一契约。

### 原因

1. 公开正文检查和题材约束检查没有共用入口。
2. 旧修复容易滑向“把某类词全局禁掉”，例如把游戏/系统题材本来需要的 `任务 / 技能树 / 排行榜` 误当成泄漏。
3. 质量刹车只看 `ConstraintProfile.rules.prohibitedTerms`，没有兜住创作流程痕迹。

### 修复原则

1. 题材规则只来自 `genre-runtime-rules.v1.json` 的 `ConstraintProfile`，不得回到单一负例特判。
2. 公开正文的通用禁项只限创作流程痕迹：节拍标签、内部计划词、机器分隔符等。
3. 游戏、系统、都市、玄幻等题材词不能全局封杀；只有当前激活的 profile 明确列为 `prohibitedTerms` 时才拦截。
4. 质量刹车与首轮候选预检必须共用同一套 `evaluatePublicProseHygiene`。
5. 修订候选只修正文案，不写 canon，不暴露 system/provider/fallback 等内部词。

### 本轮落地

- `packages/agent-runtime/src/constraints.ts` 新增 `evaluatePublicProseHygiene` 与 `repairPublicProseScaffolds`。
- `socraticCreateWorkflow` 与 `qualityBrakeWorkflow` 统一改用公开正文洁净度入口。
- 单测覆盖：现代悬疑按文档规则拦截无铺垫推理；游戏异界不因题材术语被全局误杀；公开正文不允许流程痕迹。
- `smoke:creator-chain` 继续验证真实 HTTP 链路里的候选正文不泄漏计划分隔符。

### 后续开发规则

1. 新增题材限制时，先改 `ConstraintProfile.rules`，再补对应用例；不要在 workflow 中写题材特例。
2. 新增公开正文禁项时，必须确认它是所有题材都不该展示的流程痕迹，而不是某个题材的正常语汇。
3. Creator/Reader UI 只显示候选正文、追问、故事笔记和质量建议；运行账本、profile、kernel、trace 仅供调试或 Studio 后台使用。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
npm run smoke:creator-chain
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run test
```

## 2026-06-17 P4 约束与类型内核重做

### 现象

P4 约束层此前围绕单一测试负例做了过多特例，debug 脚本和测试也沿用这一组输入。这会让运行时看起来像是在修一个具体 prompt bug，而不是按文档规则选择类型内核。

### 原因

1. 约束逻辑先从一次真实测试断点长出来，没有及时回到 `constraints and kernel` 文档的完整题材体系。
2. 规则激活把正文关键词、模板 hooks 和用户显式选择混在一起，导致“喜剧反套路”输入里出现“升级”时可能被游戏类抢占。
3. 宽泛情绪词例如 `情感成长` 被放入硬题材 signal，容易把非目标题材误激活。

### 修复原则

1. P4 的事实源是文档化的 `ConstraintProfile + GenreKernel`，不是某个负例黑名单。
2. 运行时规则统一存放在 `docs/product/rules/genre-runtime-rules.v1.json`，Mastra 和 FastAPI 都只读这份 JSON。
3. 代表作品只用匿名 `rwref_*`，明文标题只存在私有加密 vault。
4. 显式选择优先：用户选择的 genre/template/profile 排在 seed 关键词之前。
5. 通用情绪词不能单独触发硬题材 Profile；只能作为后续写作风格或软提示。
6. 若未来要加入特殊限制，必须抽象为可编辑的 profile/rule/doctrine，不允许在服务代码里写死 prompt 特例。

### 本轮落地

- `genre-runtime-rules.v1.json` 升级到 version 2，覆盖 21 个文档来源题材 Profile 与 21 个 Kernel。
- `packages/agent-runtime/src/constraints.ts` 和 `backend/src/narrativeos/services/creator_dialogue.py` 统一按显式选择排序 active profile。
- 后端 `CreatorDialogue` 不再包含单一测试负例的硬编码分支。
- debug 默认样例改成文档内的仙侠、现代、女频重生等主类目。
- 测试覆盖 `仙侠玄幻 / 其他现代 / 游戏异界 / 喜剧反套路`，并验证未匹配的泛情感输入不会误触发硬约束。

### 返工补丁

这次按最新产品判断从头收敛 P4：此前围绕单个验收样本形成的约束逻辑整体废弃，P4 只承认文档里的 `ConstraintProfile + GenreKernel`。如果用户选择某个题材，运行时只应激活对应文档 profile；如果文档没有该 profile，就不能把一个验收样本临时写成硬规则。

补丁后的工程约束：

1. `packages/agent-runtime/src/workflows.ts` 不允许再按 `profile.id === "..."` 或 `kernel.id === "..."` 写正文、标题或追问。
2. 候选正文、追问和故事笔记从 active `GenreKernel` 的 `thesis / eventStructure / motiveRules / conflictRules / climaxRules` 生成。
3. `scan-p4-rule-source.mjs` 不再维护历史样本词表，而是校验文档 registry 的 profile/kernel 完整性、匿名引用、兼容关系和 workflow 无硬编码分支。
4. 新增题材限制的唯一路径：先编辑 `docs/product/rules/genre-runtime-rules.v1.json`，再补 tests/smoke；不要在 workflow 或后端服务里补 prompt 特判。
5. 后端 `CreatorDialogue` 可以把规则转成 `setting_cards.genre_constraints`，但公共 Creator/Reader 页面仍不得展示 profile、kernel、runtime 等内部字段。

### 二次校正

用户明确要求 P4 从头做，并废弃此前围绕单个 prompt-case 形成的临时约束逻辑。因此本轮把防回归从“检查旧样本词”改成“检查事实源边界”：

1. 人工规则文档里的现代类 ID 统一对齐运行时 registry：`modern-other / kernel-modern-other`。
2. 后端删除未命中文档 profile 时的题材兜底猜测；没有 active profile 就继续通过苏格拉底式对话澄清，不生成 off-registry 约束。
3. 任何未来新增题材、时代、地域、职业或叙事禁项，都必须先进入 `genre-runtime-rules.v1.json` 的文档化 profile/rule，再由 runtime 读取；不能把一次用户测试样本写成服务代码分支。
4. `scan-p4-rule-source.mjs` 只检查 registry 完整性、匿名引用、profile/kernel 兼容关系和 workflow 无硬编码分支，不再维护历史 prompt-case 词表。

### 三次校正

本轮把 P4 验收从“固定几个题材样本”继续收敛为“文档 registry 驱动”。原因是固定样本虽然能跑通，但仍会让工程团队围绕某个 profile 或 kernel 写特例；一旦题材扩展，测试本身会变成错误引导。

新的 P4 验收规则：

1. Agent runtime 单测必须遍历 `genre-runtime-rules.v1.json` 中的全部 `ConstraintProfile`，显式选择哪个 `displayName`，就必须让哪个 profile 成为 primary active profile。
2. 每个 active profile 必须解析出兼容的 `GenreKernel`，且候选正文、追问和 beat plan 都从 kernel 字段生成，不允许按 registry id 分支。
3. FastAPI CreatorDialogue 测试同样遍历全部文档 profile，验证 `setting_cards.genre_constraints`、`genre_constraint_facts.active_profile_ids` 和 `genre_kernels` 对齐。
4. Tool Bridge 和真实 HTTP smoke 只从规则 JSON 取 profile/kernel 示例，不再在测试 payload 里写死某个 profile id。
5. `scan-p4-rule-source.mjs` 现在会读取全部 profile/kernel id，并扫描 workflow、P4 tests、FastAPI service 和 smoke；任何 hardcoded registry id 都会失败。规则 id、profile id、kernel id 的唯一事实源只能是 `genre-runtime-rules.v1.json`。

### 四次校正

本轮按最新要求重新审计 P4：旧 prompt-case 词表不再作为扫描器逻辑存在，避免把历史测试样本继续伪装成产品规则。P4 的核心不应该是“禁止某几个旧词”，而是“用户选择的文档 profile 决定约束，兼容 kernel 决定节奏、动机、冲突和高潮回收”。

新的防回归点：

1. `scan-p4-rule-source.mjs` 不再维护历史 prompt-case 正则。
2. 扫描器新增文档同步检查：`GENRE_CONSTRAINT_RULES.md` 必须列出全部 active profile id 和 displayName；`GENRE_KERNEL_RULES.md` 必须列出全部 kernel id、name 和 compatible profile。
3. `GENRE_KERNEL_RULES.md` 增加完整 kernel registry sync table，后续新增/删除 kernel 时会被脚本强制要求同步文档。
4. 任何具体题材限制都必须先进入 `genre-runtime-rules.v1.json`，再由 Agent Runtime 和 FastAPI 读取；测试样本、用户案例、浏览器 QA 评论都不能直接升级为服务分支。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
./backend/.venv/bin/pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
npm run scan:p4-rule-source
npm run scan:reference-privacy
```

## 2026-06-17 P6 候选正文生命周期

### 现象

`/create` 已经能通过 Mastra-compatible workflow 生成候选开场和追问，但作者确认前的状态回写仍不够明确。页面只展示正文和故事笔记，没有一个可点击的“先整理为写作记忆”的动作；FastAPI `state-preview` 也只返回空列表，无法证明状态预览不是口头概念。

### 原因

1. 首条链路优先打通了 `socratic-create -> socratic-turn`，但没有把确认前的 `state-preview` 做成可验证闭环。
2. 前端不应该展示 `state-preview / canon / branch / runtime` 等内部词，因此需要一个产品化动作名承载这一步。
3. Tool Bridge 原本只证明“不写 canon”，没有返回可回放的候选补丁。

### 修复原则

1. 创作者端用“写作记忆”表达候选状态预览，不暴露内部运行时词。
2. 点击“整理成写作记忆”只生成候选补丁，不写入 canon 或 branch。
3. FastAPI 返回 `stateDeltaCandidate` 供后端/Studio 回放，公共前端只显示整理结果摘要。
4. 失败时前端本地降级，继续保持创作不中断，但不伪装成已正式写入作品。
5. 回归测试必须同时验证候选补丁存在、`canon_written=false`、`branch_written=false`。

### 本轮落地

- Agent runtime 新增 `/v1/workflows/state-preview`，通过 Tool Bridge 调 FastAPI `state-preview`。
- FastAPI `state-preview` 返回 `StatePatch` 风格的 `stateDeltaCandidate`，包含候选正文、故事笔记和质量预览。
- `/create` 的对话线程新增“整理成写作记忆”按钮。
- 前端新增 `previewAgentStoryMemory` 和 `applyMemoryPreview`，只显示“已整理，等你确认后再固定到作品”。
- `test_tool_bridge_api.py` 增加状态预览候选补丁断言。
- `workflows.test.ts` 增加 Tool Bridge 不可用时仍不写 canon 的回归测试。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
./backend/.venv/bin/pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
npm run smoke:creator-chain
```

## 2026-06-17 P28 Runtime Artifact 最小闭环

### 现象

P4 已经把 `ConstraintProfile + GenreKernel` 收敛成文档 registry 驱动，但 Creator 首轮输出仍主要是 `candidateDraft / questions / settingCards`。这能证明“写出了候选正文”，还不能证明一次生成经过了运行时内核所需的 `ScenePlan / StatePatch / TimeConsistencyReport / QualityBrakeReport / BranchGenerationResult`。

### 修复原则

1. 运行时产物是内部 API 和 Studio/后端调试契约，不进入普通 Creator/Reader UI。
2. `ScenePlan` 必须由 active `GenreKernel` 的 beat/time controls 生成，不能写死某个题材。
3. `StatePatch` 默认是 candidate preview，只能进入 `stateWritebackPreview`，不得写 canon 或 branch。
4. `QualityBrakeReport` 必须与公开 `qualityPreview` 对齐，避免 UI 显示通过但运行时报告阻断。
5. `BranchGenerationResult` 首轮默认 `not_generated`，原因必须是 `author_confirmation_required`。
6. Tool Bridge 可以包装并回传 runtime artifact，但仍然只做 preview-only facade，不拥有数据库写入主权。

### 本轮落地

- `packages/agent-runtime/src/types.ts` 新增 `RuntimeArtifact` 契约。
- `socraticCreateWorkflow` 现在返回 `runtimeArtifact`，包含 `narrativeRun / constraintSet / kernelSelection / scenePlan / stateWritebackPreview / timeConsistencyReport / qualityBrakeReport / branchGenerationResult`。
- `ledger.stateDeltaCandidate` 改为记录同一组 `runtimeArtifact.stateWritebackPreview`。
- FastAPI `Tool Bridge` 会透传 `runtimeArtifact`，`state-preview` 优先返回 artifact 中的 `stateWritebackPreview`。
- `smoke:creator-chain` 验证真实 HTTP 链路中 artifact、scene plan、state writeback preview、time consistency 和 branch-not-generated 状态都存在。
- `RELEASE_SYNC_MANIFEST.json` 新增 `packages/agent-runtime/src/types.ts`，防止契约文件在源工作区和发布仓库之间漂移。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
./backend/.venv/bin/pytest backend/tests/test_creator_dialogue_api.py backend/tests/test_tool_bridge_api.py
npm run smoke:creator-chain
npm run check:release-sync-manifest
```

## 2026-06-17 P31 Mastra 依赖安全审计门禁

### 现象

`npm audit --audit-level=moderate` 当前会报 4 个漏洞：`@ai-sdk/provider-utils / @mastra/core / gray-matter / js-yaml`。这些都来自 `@mastra/core@1.42.0` 的传递依赖链。尝试过两种修复方式：

1. root `overrides` 强制改 `@ai-sdk/provider-utils-v5` 和 `gray-matter -> js-yaml`，npm 会形成 invalid dependency tree。
2. root direct alias hoist 新安全包，Mastra 内部仍保留旧传递依赖，audit 不会解除。

因此本轮不能把无效 override 或大范围 `npm audit fix` 混进产品提交。

### 修复原则

1. 高危/严重漏洞一律阻断。
2. 新增的 low/moderate 漏洞必须先分类，不能悄悄进入主线。
3. 当前 4 个 Mastra 上游漏洞允许作为已知断点通过，但必须由脚本显式识别。
4. 一旦 Mastra 发布可修版本，优先升级真实依赖，而不是长期依赖 allowlist。

### 本轮落地

- 新增 `scripts/check-dependency-audit.mjs`。
- 脚本运行 `npm audit --audit-level=moderate --json`。
- 仅允许当前 4 个 Mastra 上游 advisory 组合；任何新增包、severity 变化或 high/critical 都会失败。
- root `npm run test` 串入 `npm run audit:dependencies`。
- `RELEASE_SYNC_MANIFEST.json` 纳入新脚本，防止源工作区漏同步。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run audit:dependencies
npm run test
```

## 2026-06-17 P30 公开响应与内部调试响应拆分

### 现象

P29 已经证明 `runtimeArtifact` 本身没有代表作品和 source refs 泄漏，但仍有一个更实际的断点：Agent Runtime HTTP 服务默认把 full workflow output 返回给浏览器。即使 UI 没有渲染，普通用户仍可能在 network response 里看到 `runtimeArtifact / activeConstraints / activeKernels / sourceLabels / runTrace / ledger / cost / stateDeltaCandidate / writeback` 等内部结构。

### 修复原则

1. Workflow 内部仍保留 full output，供 Studio、Tool Bridge、测试和后端调试使用。
2. Agent HTTP 默认返回 public projection；普通 `/create` 只能拿到候选正文、追问、产品化故事笔记和质量摘要。
3. Full output 只能通过显式内部调试密钥取得：`MASTRA_DEBUG_RESPONSE_KEY` + `X-NarrativeOS-Debug-Key`。
4. 公开 `state-preview` 不返回状态补丁，只返回产品化 memory summary。
5. 公开 `quality-brake` 不返回写入状态和 run trace，只返回候选修订、质量摘要和修复建议。
6. 前端 `AgentSocraticCreateResponse` 类型必须是 public contract，不能建模内部字段。

### 本轮落地

- 新增 `PublicSocraticCreateOutput` 类型。
- 新增 `projectPublicSocraticCreateOutput / projectPublicStatePreviewOutput / projectPublicQualityBrakeOutput`。
- `packages/agent-runtime/src/server.ts` 默认返回 public projection；仅内部调试密钥匹配时返回 full output。
- `/create` 的 Agent 响应类型去掉 `runtimeArtifact / activeConstraints / activeKernels / sourceLabels / runTrace / cost` 等字段。
- `smoke:creator-chain` 拆成公开响应与内部调试响应两层：公开响应断言看不到内部对象，调试响应继续验证 runtime artifact、Tool Bridge、状态预览和质量刹车。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
npm --prefix app run lint
npm --prefix app run build
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python npm run smoke:creator-chain
npm run check:runtime-artifact-contract
npm run scan:public-ui-boundary
```

## 2026-06-17 P29 Runtime Artifact 隐私与边界扫描

### 现象

P28 让 `runtimeArtifact` 成为 Creator 首轮链路的一等内部产物。它包含 scene plan、状态候选补丁、时间一致性、质量刹车和分支生成结果，价值很高，但也带来新的风险：如果后续团队把 `sourceRefs`、代表作品、provider、raw state 或内部字段塞进 artifact，普通用户或非团队成员可能通过浏览器响应、日志或 UI 看到不该看的内容。

### 修复原则

1. Runtime artifact 可以进入 Agent/FastAPI 内部响应和 Studio 调试，但普通 UI 不得消费或渲染。
2. Artifact 内不得出现 `sourceRefs / rwref_* / representativeWorks / workTitle / authorName / source_evidence` 等代表作品线索。
3. Artifact 内不得出现 `provider / system prompt / rawHash / StateVector / AgentRun / CHANGES JSON` 等内部运行痕迹。
4. Artifact 的 `qualityBrakeReport` 必须和公开 `qualityPreview` 对齐，不能出现前端通过、运行时阻断的分裂状态。
5. Artifact 的 `branchGenerationResult` 在作者确认前必须保持 `not_generated` 和 `private`。
6. 这类检查要进入 root `npm run test`，不能只留在人工审查。

### 本轮落地

- 新增 `scripts/check-runtime-artifact-contract.mjs`。
- 新脚本遍历 21 个文档 profile，逐个生成 `runtimeArtifact` 并检查契约、质量对齐、candidate-only、branch-not-generated 和隐私词扫描。
- `npm run test` 串入 `check:runtime-artifact-contract`。
- `scan-public-ui-boundary.mjs` 增加 `runtimeArtifact / scenePlan / stateWritebackPreview / timeConsistencyReport / qualityBrakeReport / branchGenerationResult` 禁用词，阻止普通 UI 消费内部产物。
- `RELEASE_SYNC_MANIFEST.json` 纳入新脚本，防止源工作区与 GitHub 发布包漏同步。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --workspace @narrativeos/agent-runtime test
npm run check:runtime-artifact-contract
npm run scan:public-ui-boundary
npm run test
```

## 2026-06-17 P7 Creator 链路 Smoke

### 现象

`socratic-create`、FastAPI Tool Bridge 和 `state-preview` 分别有单元测试，但缺少一条命令证明它们在真实 HTTP 端口上能一起工作。只看单测无法发现端口、环境变量、幂等 header 或服务启动顺序问题。

### 修复原则

1. Smoke 必须启动真实 FastAPI 和 Mastra-compatible agent runtime。
2. 使用临时 sqlite 与临时创作会话目录，不污染本地开发数据。
3. 输入使用文档内题材 Profile，不再使用旧的一次性负例。
4. 必须证明 `socratic-create` 经由 Tool Bridge 返回，`state-preview` 只生成候选补丁，不写 canon 或 branch。
5. 面向用户的候选正文和追问不得出现内部词。

### 本轮落地

- 新增 `scripts/smoke-creator-chain.mjs`。
- 新增 `npm run smoke:creator-chain`。
- Smoke 从 `genre-runtime-rules.v1.json` 读取文档 profile/kernel 示例，验证显式选择的 profile 与兼容 kernel 被激活。
- Smoke 验证 `stateDeltaCandidate` 非空，且 `canon_written=false`、`branch_written=false`。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run smoke:creator-chain
```

## 2026-06-17 P8 Creator UI Runtime QA

### 现象

P7 证明了 API、agent runtime 与 FastAPI Tool Bridge 能通过真实 HTTP 串起来，但还不能证明 `/create` 页面真的消费了这条链路。前端仍可能因为环境变量、自动模板推断、按钮状态或本地降级而显示“看似可用”的草稿。

### 验收方法

1. 临时启动 FastAPI、agent runtime、Vite Creator UI，使用独立端口和临时 sqlite。
2. Vite 必须显式设置 `VITE_API_ORIGIN` 与 `VITE_AGENT_RUNTIME_BASE_URL`。
3. 在浏览器打开 `/create`，输入文档内题材种子。
4. 验证页面显示候选正文、两个以内追问、题材方向、写作记忆按钮。
5. 点击“整理成写作记忆”，验证页面出现“已整理 X 组写作记忆，等你确认后再固定到作品”。
6. 检查 FastAPI 日志必须出现 `/v1/tools/runtime/socratic-turn` 与 `/v1/tools/runtime/state-preview` 200。
7. 页面可见文案不得出现内部词。

### 本轮证据

- 输入：`我想写一个系统流故事，主角每完成一次任务都会拿回一段不属于自己的记忆。`
- UI 自动切到 `系统流`。
- 页面出现系统流候选正文：`任务提示第一次响起时...`
- 页面只追问两件事。
- 点击“整理成写作记忆”后显示 `已整理 1 组写作记忆，等你确认后再固定到作品。`
- FastAPI 日志出现：
  - `POST /v1/tools/runtime/socratic-turn` 200
  - `POST /v1/tools/runtime/state-preview` 200
- 页面可见文案未出现 `system prompt / provider / fallback / rawHash / StateVector / AgentRun / CHANGES JSON / canon_written / branch_written`。

### 下一断点

UI 层目前通过人工式浏览器 QA 验证。若后续要把 P8 变成 CI 常规检查，需要引入轻量浏览器测试策略；在此之前，不要为了一个 smoke 直接引入重型浏览器依赖。

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
npm run test
npm --prefix app run build
```

## 2026-06-12 /create 创作页布局与系统边界收口

### 现象

`/create` 的创作助手空状态在中等浏览器视口里出现底部内容被裁切的问题。用户看到的是输入框、提交按钮和示例 chip 被挤在一个内部滚动区域里，像后台表单，而不是自然语言对话入口。

同一轮检查还发现设计系统文档仍保留旧的七入口 rail：`发现 / 书库 / 阅读 / 创作 / 创作室 / 设置 / 支付`。这和当前产品路径不一致。当前普通用户主导航只应该是 `发现 / 阅读 / 书城 / 创作`，Studio 属于后台直达页。

### 原因

1. `/create` 空状态复用了对话线程的滚动规则，`.creator-thread` 同时设置 `max-height` 和 `overflow-y: auto`。这适合已有对话后的消息流，不适合首屏空状态。
2. 空状态卡片直接写在页面里，页面承担了业务结构、输入框、示例 chip、按钮状态和布局样式，导致修一次布局很容易继续堆 class。
3. 设计系统契约和产品路径没有同步更新。主路径已收敛，但 registry、文档和 shell 仍表达旧的后台/支付/设置入口。

### 修复原则

1. 空状态走页面自然滚动，已有会话的消息流才使用内部滚动。
2. 创作入口必须像对话，而不是设定表单。输入框、按钮、提示和示例应该在同一业务 pattern 内管理。
3. 页面级结构尽量抽成 design-system pattern。`/create` 的首屏对话入口由 `CreatorConversationPanel` 承载，页面只传入状态、示例和回调。
4. 普通用户主导航只保留 `发现 / 阅读 / 书城 / 创作`。Studio、设置、支付不进入主路径，除非真实权限、保存、支付流程已经接好。
5. 文案边界和结构边界必须进入自动检查。人工注释只能发现一次问题，脚本才能防止问题回流。

### 本轮落地

- 新增 `CreatorConversationPanel`，承载创作助手空状态、textarea、提交按钮、说明文案和示例 chip。
- `/create` 使用 `CreatorConversationPanel`，移除页面内手写空状态卡片结构。
- `.creator-thread-empty` 使用自然页面流，避免内部裁切；`.creator-thread-active` 保留消息流滚动。
- `ParallelUniverseShell` 和 design-system registry 改为当前公共 rail：`发现 / 阅读 / 书城 / 创作`。
- 新增 `npm run check:design-system`，检查主导航边界、CreatorConversationPanel 使用、registry 导出、文档沉淀和过期公共词。

### 后续页面开发规则

1. 新页面先选 surface：`discover / library / reader / creator / studio / settings / billing`。
2. 先查 `page-contracts.ts`，确认 required patterns，再写页面。
3. 页面里不要新建大块业务卡片。先问：这是不是应该成为 `components/design-system` pattern？
4. 可以短期保留页面局部 class，但必须满足：
   - 不创建新的主导航；
   - 不把 Studio 放回普通用户主路径；
   - 不出现 `后端 / PRD / OpenAPI / 时间织机 / 主宇宙模板 / 作者入口 / 写作专区` 等过期词；
   - 不在首屏创作入口使用固定高度嵌套滚动。
5. 每次系统级修复都要更新本文件，写清楚：现象、原因、修复原则、自动检查。

### 必跑检查

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run check:copy-boundary
npm run check:design-system
npx tsc --noEmit -p tsconfig.app.json
npm run lint -- --max-warnings=0
npm run build
```

## 2026-06-12 /create 自然语言对话体验收口

### 现象

`/create` 在布局收口后仍有一层产品体验问题：提交故事种子后，主区域虽然能生成内容，但侧栏和状态卡会露出 `系统从正文提取`、`底盘预设` 这类实现视角。用户看到的是字段流水账，而不是一个正在和他共同写小说的创作助手。

### 原因

1. 创作页把结构化卡片当作主体验的一部分展示，导致人物、场景、规则等能力看起来像后台字段。
2. 对话线程、追问和继续输入没有形成独立 pattern，页面同时负责状态、正文、问题、输入区和笔记。
3. 自动检查只拦截了大块后台词，没有覆盖创作主路径里更细的实现词。

### 修复原则

1. 创作主路径优先自然语言对话：用户说想法，助手给正文，再追问一两个关键问题。
2. 结构化能力只能产品化为 `故事笔记`、`我已记住`、`方向参考`、`你刚告诉我` 这样的作者语言。
3. `人物 / 场景 / 规则 / 冲突 / 下一章钩子` 是故事写作维度，不是系统字段。它们可以出现在辅助侧栏，但不能抢主体验。
4. 提交后主区域由 `CreatorDialogueThread` 承载；故事线索由 `CreatorStoryNotes` 承载。页面只编排数据和回调。
5. 检查脚本要防止 `系统从正文提取 / 底盘预设 / 绑定 / system prompt` 等词进入 `/create` 和创作 pattern。

### 本轮落地

- 新增 `CreatorDialogueThread`，统一展示用户故事种子、助手开场正文、最多两个追问和继续输入框。
- 新增 `CreatorStoryNotes`，把结构化能力包装为作者能理解的故事笔记。
- `/create` 提交态不再直接渲染消息、追问和 composer；改为组合 design-system pattern。
- `check:design-system` 增加创作主路径内部术语检查。

### 后续页面开发规则

1. 凡是普通作者会看到的文案，优先判断“这像不像人在协助写小说”，不要解释系统如何工作。
2. 需要给后端或运营看的 prompt、来源、模型、提取、冻结参数等信息，只能进 Studio 或交接文档。
3. 新增创作能力时，先决定它属于：
   - 主对话：正文、追问、继续输入；
   - 故事笔记：人物、场景、规则、冲突、钩子；
   - 后台配置：prompt、模型、来源、质量阈值。
4. 如果一个模块无法放进以上三类，先写产品规则，不要先做页面。

## 2026-06-12 外部前端接入边界

### 现象

后端团队交付包里包含独立的 Next.js 前端 `apps/web`。它可以帮助理解后端能力、路由和验证脚本，但它不是当前商业原型的前端主线。当前产品前端以 `/Users/james/Documents/PUF/workspaces/integration-harness/app` 的 Vite + React + TypeScript 实现为准。

### 风险

如果把外部前端直接并入当前项目，会重新引入已经清理过的路线问题：读者入口不一致、创作页交互不一致、设计系统分层失效、内部术语重新泄漏，以及上线目标从一个清晰的 Web 商业原型变成两个前端框架并存。

### 决策规则

1. 当前 Vite/React 前端是唯一产品主线。
2. 后端包里的 `apps/web`、旧概念页、外部 UI 文件只能作为参考资料，不能直接覆盖或合并。
3. 任何外部前端进入当前产品前，必须先经过子 agent 审批判断，审批问题至少包括：
   - 是否服务当前 reader-first / creator-conversation 产品方向；
   - 是否能用现有 shadcn-compatible primitives、tokens 和 design-system patterns 表达；
   - 是否会引入旧导航、后台词、重复页面或双框架维护成本；
   - 是否只需抽取少量业务逻辑、文案或数据结构，而不是合并整页 UI。
4. 未通过审批的外部前端只能停留在 `reference` 或 `handoff` 状态，不进入 `app/src`。
5. 后端接入以 API 契约、schema、测试和部署脚本为主，前端 UI 仍由当前设计系统承载。
6. 坚决不做重复开发：已有产品入口、页面结构、设计系统组件和交互模式不得被第二套前端重造；新包只能贡献未覆盖的 API 契约、领域模型、后端能力、测试脚本或少量可迁移业务逻辑。若发现同一能力有两套实现，优先保留当前产品主线，并把外部实现降级为参考材料。

## 2026-06-12 P0 前后端世界 ID 契约

### 现象

`/story` 在真实 API 配置下能显示正文和选择，但后端日志显示 `POST /v1/reader/sessions` 返回 404。原因不是路由缺失，而是前端使用的产品世界 ID（例如 `beacon-beyond`）没有注册进后端 worldpack/runtime 系统，导致页面看似可用，保存和推进实际没有落到真实 reader session。

### 原因

1. 前端世界入口和后端内置样例世界长期并行存在，名称、ID 和语义没有成为共同契约。
2. 验证脚本只确认路由存在和页面可打开，没有覆盖“前端可见世界 ID 能创建真实 session”。
3. 浏览器 QA 只看 UI 状态会误判；必须同时看后端日志、保存文件或数据库记录。

### 修复原则

1. 当前产品前端世界 ID 是 API 契约的一部分，不能临时 remap 成后端旧样例 ID。
2. 后端启动时通过 `backend/src/narrativeos/services/frontend_worlds.py` 注册当前公开世界：`beacon-beyond / rain-bridge / jade-contract / lotus-lane / frontier-edict / algorithm-city`。
3. `/v1/reader/sessions`、`/v1/reader/snapshot`、`/v1/scene/advance` 必须用这些前端世界 ID 完成真实 session 和选择推进。
4. browser QA 要同时检查：
   - 页面有阅读和选择结果；
   - 后端日志出现对应 200；
   - 保存文件或数据库能找到同一个 seed / world_id / session_id。

### 本轮落地

- 新增 `ensure_frontend_reader_worlds(...)`，把当前前端公开世界注册为 published worldpacks。
- `app_factory` 启动时执行注册，并暴露 `app.state.frontend_reader_worlds` 便于排查。
- `test_harness_narrow_api.py` 增加前端世界 ID 创建 session 和 continue 的回归测试。
- `check:backend-bridge` 增加对 frontend world registry 和 reader session 测试覆盖的检查。
- `check:copy-boundary` 增加 `底盘 / 绑定 / 起点 / 番茄 / 设定卡` 禁词，避免产品页重新出现内部或竞品研究语言。

## 2026-06-12 P0 部署与真实 API 证明

### 现象

本地前后端联调已经能跑通，但如果 preview 打包仍然只生成静态页面，或者没有记录 API host 和 smoke 结果，就会再次出现“页面看起来可用，实际上仍靠 fallback”的判断偏差。这个偏差会让产品、前端和后端团队对是否已经完成 P0 产生不同理解。

### 原因

1. 旧的 preview 打包脚本只跑 `check:alignment` 和 `build`，没有把后端桥接、文案边界、设计系统边界和真实 API smoke 纳入上线前证据。
2. 静态 fallback 包和真实 API preview 包没有在 manifest 中明确区分，容易把设计/demo 预览误认为真实集成预览。
3. 后端部署包没有单独的 API-only 交付口径，容易被后端团队包里的 `apps/web` 或其他前端文件干扰。

### 修复原则

1. P0 preview 必须区分 `real-api`、`local-real-api` 和 `static-demo-fallback`。只有非 localhost 的 `real-api` 能作为可分享上线联调证据；`local-real-api` 只证明本机联调。
2. 后端交付只打包当前 FastAPI API 能力；外部 `apps/web` 仍然是参考材料，不进入产品前端。
3. 部署后必须跑 `scripts/smoke-deployed-api.sh https://<api-host>`，验证当前 `/v1` 产品契约，而不是验证后端团队内部路由。
4. 前端打包前必须跑 `check:alignment / check:backend-bridge / check:copy-boundary / check:design-system / build / audit`，防止内部词和第二套前端边界回流。
5. 文档里必须写清楚部署顺序：先 API host，再 API smoke，再带 `VITE_API_BASE_URL` 打包前端，再浏览器 QA。

### 本轮落地

- 新增 `scripts/smoke-deployed-api.sh`，覆盖 `/health`、世界列表、阅读 session、continue、scene advance、creator dialogue、quality evaluate 和 subscription。
- 新增 `scripts/package-backend-api-deploy.sh`，只打包当前后端 API，并先运行 P0 窄测。
- 升级 `scripts/package-vercel-preview.sh`，写入 `preview_kind`、API env、完整 pre-deploy checks 和 deployed API smoke 命令。
- `check:backend-bridge` 增加脚本和文档检查，确保部署证据不会被后续改动删掉。
- `BACKEND_COMPATIBILITY_BRIDGE_PLAN.md` 和 `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md` 增加 API-first 部署闭环说明。

## 2026-06-12 /create 创作推演，而不是原始思维链

### 现象

创作对话已经从表单流改成自然语言流，但用户仍需要一种“看得见的辅助方式”：他要知道系统会如何把一句故事种子扩展成全文设定、人物缺口、场景压力、世界规则和风格基调。直接展示大模型原始思维链不适合产品化，也会让页面变得像后台日志。

### 原因

1. 原始思维链是模型内部推理过程，不应该作为用户界面内容展示。
2. 作者真正需要的是可编辑、可理解、可用于继续创作的摘要，而不是底层推理细节。
3. `/create` 的设计目标是“苏格拉底式追问 + 先写正文”，因此辅助层应该帮助用户判断下一步回答什么，而不是解释模型如何运行。

### 修复原则

1. 借鉴思维链的分步结构，但产品化为“创作推演”。
2. 创作推演只展示用户可见结论：故事钩子、人物缺口、场景压力、世界规则、风格基调。
3. 每一步都要说明“为什么问这个方向”，但不能出现原始思维链、模型日志、system prompt、接口、后端等内部词。
4. 提交前显示方向参考；提交后用用户输入和已记住线索更新推演摘要。
5. 创作推演属于 design-system pattern，不能在页面里临时手写。

### 本轮落地

- 新增 `CreatorReasoningMap`，作为 `/create` 的可见创作推演 pattern。
- `/create` 在对话区顶部展示五步推演：故事钩子、人物缺口、场景压力、世界规则、风格基调。
- `page-contracts.ts` 和 `registry.ts` 把 `CreatorReasoningMap` 纳入 creator surface 的必需 pattern。
- shadcn registry JSON 新增 `creator-reasoning-map`，便于后续设计系统迁移和复用。
- `check:design-system` 增加 `CreatorReasoningMap` 与内部词边界检查。

## 2026-06-12 热门题材索引成为真实产品契约

### 现象

首页左侧仍使用写死的“作品分类”，创作页也维护一份本地题材映射。这样会让“热门题材索引”只停留在概念图或讨论里，无法按周/月刷新，也无法真正影响首页推荐和创作模板排序。

### 原因

1. 首页和创作页分别维护分类数据，缺少共同 API 契约。
2. 热门题材扫描属于后台能力，但前台只需要看到产品化结果。如果直接展示来源或内部词，会再次污染 reader/creator 页面。
3. P0 的目标是前端入口和后端能力互相对应，所以“动态题材索引”必须有 `/v1` route、前端 client、fallback 和 smoke，而不是只改文案。

### 修复原则

1. 后端提供 `GET /v1/market/trends` 作为首页和创作页共同数据源。
2. 后端提供 `POST /v1/market/trends/scan` 作为 function-call 形态的周/月刷新入口，函数名固定为 `scan_market_trends`。
3. 当前没有外部榜单源时，返回 curated seed snapshot 和刷新策略，不伪装成实时抓取。
4. 首页显示 `热门题材索引`，创作页显示 `故事方向`，不显示来源名、后台扫描细节或内部研究词。
5. 前端必须保留本地 fallback，避免 API 不可用时阻断首页和创作入口；但真实 API 可用时必须优先读取 `/v1/market/trends`。

### 本轮落地

- 新增 `MarketTrendService` 和 `/v1/market/trends`、`/v1/market/trends/scan`。
- `scan_market_trends` 响应必须包含 function schema 与调度元数据：weekly `0 8 * * MON` 调整首页推荐和创作排序；monthly `0 8 1 * *` 校准长期模板权重。
- 托管平台的 cron 可能只支持 GET，因此补充 `/v1/market/trends/cron/weekly` 与 `/v1/market/trends/cron/monthly`；它们是调度器入口，不进入前端导航。
- 新增 `app/src/api/market.ts` 与 `app/src/features/market/trends.ts`。
- 首页的分类区改为 `热门题材索引`，并按趋势 API 调整榜单和推荐书架排序。
- `/create` 的故事方向和推演基调改为读取同一份趋势 API。
- smoke、backend package、OpenAPI contract 和 P0 窄测加入 market trends。

## 2026-06-12 调度和算法词不能进入读者侧

### 现象

线上阅读页右侧一度出现 `t+`、`低权重事件`、`Hawkes` 等算法调试语言；首页和创作页也出现过“按周刷新”“按热门题材索引排序”这类偏后台说明。功能虽然真实接上了，但用户看到的是系统内部，不是故事体验。

### 原因

1. 后端/模拟器为了证明能力，会自然产出工程视角的状态词。
2. 前端为了展示“确实接上了”，容易把 scheduler、趋势刷新和事件权重直接写成页面文案。
3. 这类词不会被 `后端 / PRD / 接口` 的旧禁词自动挡住，需要补新的产品边界。

### 修复原则

1. 读者侧只讲故事结果：线索积累、人物关系、下一幕压力、选择影响。
2. 创作者侧只讲可操作语言：故事方向、创作推演、我会追问什么。
3. function calling、cron、Hawkes、权重、模型指标、system prompt 只能进 Studio 或交接文档。
4. 每次新增系统能力，都要同步扩展 `check:copy-boundary`，让旧词不会在后续 goal 回流。

### 本轮落地

- 首页文案改为“最近更受欢迎的故事方向，帮你更快找到想看的宇宙。”
- 创作页文案改为“选一个你想靠近的味道，人物和冲突会在对话里慢慢长出来。”
- 阅读页节奏面板从 `t+` 改成 `第 N 拍`，描述改成线索压力和下一幕变化。
- `AI 味抑制` 改成 `阅读自然度`。
- `check:copy-boundary` 增加 `低权重 / Hawkes / t+ / AI 味 / 系统提示词`。

## 2026-06-12 创作助手要有方向惯性

## 2026-06-12 P15 创作对话保存不能退化成项目表单

### 现象

后端团队已经具备 `StoryProjectCreateRequest` 和 `/story-projects` 能力，但当前产品的 `/create` 是自然语言创作助手。如果直接把后端项目字段搬到前端，页面会重新变成 `标题 / 主角 / 世界观 / 风格` 的表单流，违背“先写正文，再追问”的创作体验。

### 原因

1. 后端创建作品需要结构化字段，产品创作入口需要低摩擦对话，两者中间缺少明确转换层。
2. `creator dialogue session` 和 `story project` 是两个不同阶段：前者是共创过程，后者是可保存、可续写、可预览的作品资产。
3. 如果让前端直接调用后端团队 `/story-projects`，会绕过当前 `/v1` 产品契约，也容易引入第二套前端和重复开发。

### 修复原则

1. `/create` 继续保持自然语言和苏格拉底式追问；不要在第一屏要求用户填项目字段。
2. 只有当助手已经写出开场正文并沉淀出故事笔记后，才出现 `保存为作品` 和 `进入预览`。
3. 后端负责把对话转换成项目字段，字段来源分为：
   - 用户说的；
   - 对话整理的；
   - 题材经验提供的。
4. 前端公共文案只展示产品化来源标签，不展示接口、后端、prompt、provider、source 或工程状态。
5. 保存项目必须幂等，避免双击或重试生成重复作品。

### 本轮落地

- 新增 `docs/backend/P15_CREATOR_DIALOGUE_PROJECT_PERSISTENCE_DESIGN_20260612.md`。
- 定义状态机：`seed -> opening_draft -> clarify -> project_candidate -> saved_project -> preview_ready`。
- 定义产品路由建议：`POST /v1/creator/dialogue/sessions/{session_id}/project`。
- 明确不要让前端直接调用后端团队 `/story-projects`。
- 总 handoff 和 P13 验收清单已指向 P15 设计文档。

### 后续开发规则

1. 实现 P15 后端前，先补契约测试和 OpenAPI，再加前端按钮。
2. 前端按钮只在 `assistant.story_text` 存在后显示。
3. 如果保存被阻塞，继续用对话追问一个关键问题，不弹复杂表单。
4. 任何新保存/预览 UI 都必须通过 `check:copy-boundary` 和 `check:design-system`。

## 2026-06-12 P16 热门题材扫描要有适配器边界

### 现象

`scan_market_trends` 已经有路由、function-call 形态和 Studio 刷新按钮，但后端实现仍主要依赖 curated snapshot。这样可以支撑原型，却不能安全接入真实来源：一旦把来源、调度、扫描细节直接往前台堆，首页、书城和创作页又会变成运营后台说明。

### 原因

1. 热门题材是产品入口，真实来源扫描是后台能力，两者必须隔离。
2. 公共页只需要“当前更值得推荐什么”，不需要知道来源、调度、权重和失败原因。
3. Studio/Ops 需要看来源健康、扫描审计、模板影响和人工锁定，否则后端团队无法运营真实扫描。
4. 没有 adapter contract 时，每接一个来源都可能把原始字段和来源名带进公共 payload 或页面。

### 修复原则

1. 后端用 `MarketTrendSourceAdapter` 统一接入来源，adapter 内部消化 raw fields。
2. 服务层负责去重、权重归一化、失败降级和审计记录。
3. 公共页只消费 `top_categories / trends / template_recommendations` 的产品化字段。
4. `source_adapters / function_call / scan_schedule / ops` 只能进入 Studio、后端文档或验收脚本。
5. 所有外部来源必须先经过授权、许可或人工录入边界确认，不在产品 UI 中出现来源平台名。

### 本轮落地

- `MarketTrendService` 增加 source adapter 边界。
- 新增 `MarketTrendScanContext`、`MarketTrendSourceResult`、`MarketTrendSourceAdapter`、`CuratedSeedTrendAdapter`。
- 扫描结果增加 `ops.source_health`、`ops.audit`、`ops.weight_changes`、`ops.manual_locks`。
- `StudioTrendOpsPanel` 增加来源健康、扫描审计和模板影响展示。
- `backend/tests/test_market_trends_api.py` 增加 adapter 聚合和失败降级测试。
- 新增 `docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md`。

### 后续开发规则

1. 新增真实来源时，只新增 adapter 和测试，不直接改公共页面。
2. 真实来源失败时，首页、书城和创作页必须继续可用。
3. Studio 可以展示来源 ID、扫描状态和调度；公开页不可以。
4. 月度扫描只产出模板权重候选，不直接让未审核模板进入公开推荐。
5. 每次新增来源都要补：adapter 单测、失败降级单测、公共文案边界检查、Studio 验收截图。

## 2026-06-13 P17 质量检查必须分层组合，不能泄漏到读者端

### 现象

`/v1/quality/evaluate` 已经能返回 report 和薄版 quality gate，但字段只够判断是否能提交，不能解释内容安全、语言自然度、节奏、人物一致性、伏笔连续性、时间线一致性和发布准备度分别出了什么问题。另一方面，如果把这些评分直接放到读者页，产品又会退回后台仪表盘。

### 原因

1. 质量检查是发布前能力，不是读者体验本身。
2. 后端已有 linter、hard validators、NarrativeEval scorer、backend-team safety/release snapshot，但缺少统一产品合同。
3. 创作者需要可操作建议；Studio/Ops 需要阻断原因、评分、调试和发布准备度；读者只需要顺滑阅读状态。
4. learned evaluator 和 learned reranker 虽然已有研发轨道，但当前不能伪装成生产阻断门禁。

### 修复原则

1. 用一个 `QualityGateResult` 组合所有质量信号，同时保留旧字段兼容。
2. 实时阻断只用于内容安全、工程泄漏、元叙事泄漏、高严重度连续性、过早结局、缺少质量报告和缺少人工确认。
3. 章节长度、场景密度、重复、选择差异、钩子和人物一致性默认先作为 warning 或 rewrite 建议。
4. learned evaluator / learned reranker 只能出现在 Studio/Ops 的 shadow 状态里，且 `production_gate` 必须为 false。
5. Reader 只允许消费 `public_safe_message`；Creator 只显示 summary 和 suggested fixes；Studio/Ops 才能显示 blockers、warnings、scores、debug。

### 本轮落地

- 新增 `backend/src/narrativeos/services/quality_gate.py`。
- `ProductRuntimeService._quality_gate` 与 `BackendTeamBridge._quality_gate` 统一调用 `compose_quality_gate_result`。
- `app/src/api/runtime.ts` 扩展 `QualityGate` 类型，接住 P17 字段。
- Studio 发布检查卡片展示摘要、阻断项、提醒和下一步动作。
- `backend/tests/test_product_runtime_api.py` 覆盖扩展合同、工程泄漏阻断、确认缺失和 shadow-only learned 轨道。
- 新增 `docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md`。

### 后续开发规则

1. 新增质量维度时先接入 `QualityGateResult.scores`，再决定是否进入 blockers 或 warnings。
2. 任何读者端质量提示必须走 `public_safe_message`，不能直接渲染 issue code、score 或 debug。
3. Studio/Ops 可以展示详细门禁，但必须保持在后台路由，不能放进公共导航。
4. learned 轨道升级为生产门禁前，必须有 promotion workflow、回归测试和人工批准记录。
5. 后端团队接入 release snapshot 时，必须先映射到 `QualityGateResult`，不能让前端直接消费内部 snapshot。

## 2026-06-13 P18 支付完成与账号同步要区分预览闭环和生产回调

### 现象

会员页已经能读取方案并创建开通请求，但用户点击后只能看到“请求已创建”，无法验证权益是否刷新。后端实际上已经有 checkout lifecycle 处理、订阅状态、retry、renew、cancel 和 Ops reconcile；如果前端继续停在请求态，会让商业闭环看起来没有完成。反过来，如果直接把 provider、webhook、event id、ledger 解释给用户，又会把会员页变成后台排障页。

### 原因

1. 支付完成是产品闭环，但真实生产支付必须由服务端回调或后台 reconcile 完成。
2. 当前 `web_stub` 适合预览和验收，需要一个可点击完成并刷新权益的产品动作。
3. 账号同步不只是会员状态，还包括 reader session、阅读进度、creator dialogue 和未来 story project。
4. 公共页面只需要“权益是否可用”和“能否继续阅读/创作”，不需要支付供应商或生命周期诊断。

### 修复原则

1. `/settings` 可以展示会员方案、权益余额、开通请求、完成开通和刷新权益。
2. 预览环境可以通过当前 lifecycle endpoint 完成 `web_stub` 开通；生产环境必须走服务端回调或 Ops reconcile。
3. provider、webhook、event id、idempotency、ledger、reconcile 只能出现在 Studio/Ops、后端文档或测试里。
4. 账号同步合同必须同时覆盖 membership、reader progress、creator dialogue draft 和 future author project draft。
5. 本地浏览器保存只能作为 fallback，不能被描述成跨设备账号同步已经完成。

### 本轮落地

- `settingsApi.completeCheckout` 接入当前 lifecycle endpoint，并在完成后刷新 subscription。
- `useSettings` 增加 completion 状态，并从 subscription snapshot 回填 checkout session。
- `/settings` 增加“完成开通”产品动作，完成后展示权益刷新状态。
- `SubscriptionStatus` 类型增加 checkout session、lifecycle summary、retryable、renewable 和 recommended action 字段。
- 新增 `docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md`。

### 验收补充

- 真实浏览器 QA 必须用显式 API origin 启动前端：`VITE_API_ORIGIN=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 3000`。
- 如果没有配置 API origin，`app/src/api/client.ts` 会回退到浏览器当前 origin，导致 `/settings` 把 `/v1/reader/subscription` 打到 Vite 3000 端口并出现假 404。
- 支付/账号类 goal 的浏览器验收不能只看页面是否打开，必须点完 `开通这个方案 -> 完成开通`，确认状态变为 `已开通`、权益数字刷新、完成按钮消失。
- `scripts/smoke-deployed-api.sh` 的本地运行方式是 `NARRATIVEOS_API_ORIGIN=http://127.0.0.1:8000 ./scripts/smoke-deployed-api.sh`。
- 支付 smoke 必须使用唯一账号或唯一 session；固定账号重复运行会在已激活账户上新建 checkout，导致摘要看起来退回 created。

### 后续开发规则

1. 接真实支付供应商前，先补服务端签名校验、callback 验证、幂等和 replay 测试。
2. 前端只能发起 checkout、跳转/刷新状态和展示权益，不能伪造真实支付事件。
3. 跨设备同步前，先定义 account snapshot，再接 reader session 和 creator dialogue persistence。
4. 会员页所有文案必须保持用户语言：开通、权益、阅读次数、创作额度、恢复阅读。
5. Studio/Ops 可以保留 provider 和 lifecycle 诊断，但不能进入公共导航。

### 现象

`/create` 已经能先写正文再追问，但用户输入都市谜案或历史权谋种子后，如果第二轮回答包含“真相”这类通用词，页面可能又回到默认玄幻方向。用户会感觉系统只是在拼状态卡，不是真的理解创作上下文。

### 原因

1. 第一轮题材识别只看当前输入，没有保护正在写的方向。
2. 热门题材里的 `高热 / 上升 / 稳热` 是榜单语言，不是写作风格；直接传给创作助手会让正文和侧栏显得生硬。
3. 创作助手需要像 Codex 一样维持上下文，不应每一轮都重新开始判断任务。

### 修复原则

1. 第一轮从用户种子识别故事方向，强信号才切换模板。
2. 后续轮次保留当前方向惯性；只有新消息出现足够强的新题材信号时才切换。
3. 首页可以显示热度词，创作页必须显示写作风格词，例如“冷静、潮湿、证据感强”。
4. 真实对话上下文和 UI 展示必须使用同一故事方向，不能 UI 显示一类、API 传另一类。
5. 这属于设计系统边界：`check:design-system` 必须检查 `inferTemplateIdFromStorySeed` 和 `writingToneForTrend` 没被移除。

### 本轮落地

- `features/market/trends.ts` 新增 `inferTemplateIdFromStorySeed`，用六类故事方向和关键词识别用户种子。
- 识别器加入方向惯性：弱信号不切换，分数接近时保留当前方向。
- `writingToneForTrend` 将榜单热度词转换为创作风格词。
- `/create` 在创建会话和追加 turns 时都把同一故事方向传给后端 context。
- 浏览器验证：雨夜监控种子自动切到都市谜案，第二轮仍保持都市谜案；边城密诏种子自动切到历史权谋。

## 2026-06-12 Vercel 云端 build 必须拿到 Vite API env

### 现象

本地部署脚本传了 `VITE_API_ORIGIN=https://pun-api-p0.vercel.app` 和 `VITE_API_BASE_URL=https://pun-api-p0.vercel.app/v1`，预部署 smoke 也通过，但线上浏览器 `/create` 仍然走本地草稿。检查线上 JS bundle 后发现没有 `pun-api-p0`，只有默认 fallback。

### 原因

Vite 的 `import.meta.env` 在 build 时被静态写入。旧脚本只让本地预检查 build 拿到了 env，Vercel 云端重新 build 时没有收到 `--build-env VITE_API_*`，所以生产 bundle 没有真实 API 地址。

### 修复原则

1. 预部署 smoke 只能证明 API 可用，不能证明云端静态 bundle 已接 API。
2. Vercel 部署 Vite 项目时必须把 `VITE_API_ORIGIN` 和 `VITE_API_BASE_URL` 作为 `--build-env` 传入。
3. 部署后必须抽查线上 JS bundle，确认包含真实 API host。
4. 浏览器 QA 要看第二轮创作是否出现真实接口成功提示，而不是只看正文是否生成。

### 本轮落地

- `scripts/deploy-vercel-preview.sh` 增加 `VERCEL_BUILD_ENV_ARGS`，自动传入 `--build-env VITE_API_ORIGIN=...` 和 `--build-env VITE_API_BASE_URL=...`。
- 线上 bundle 已确认包含 `pun-api-p0` 和 `previous_session`。
- `/create` 线上两轮创作不再出现“先用草稿继续写”，并显示“这一段可以继续扩写。”
- `smoke-deployed-api.sh` 增加 creator second-turn 和 serverless rehydrate 检查。

## 2026-06-12 阅读器必须形成商业闭环

### 现象

`/story` 已经可以显示正文和选择，但如果只看正文纸张和按钮，仍然可能退回“可读样机”：三栏不对齐、书架只是按钮、选择后只变 UI，没有证据证明后续阅读会话真的推进。

### 原因

1. 阅读页同时承担长文本阅读、分支反馈、书架保存和真实会话推进，容易只优化其中一块。
2. 右侧面板为了证明系统能力，容易重新露出工程状态或质量术语。
3. 浏览器 QA 如果只看页面文字，无法证明选择已经进入 reader session 和世界线快照。

### 修复原则

1. 阅读页先是商业阅读器：中间 680-760px 正文、左右栏同一轨道、移动端用索引和反馈抽屉。
2. 每页正文必须有足够阅读密度，支持页内滚动和上一页/下一页，不把章节切得像展示卡。
3. 书架和阅读进度要有可持续体验；账号体系完成前，至少用浏览器保存世界、页码、选择和书架状态。
4. 选择影响只讲人物、记忆、下一幕和关系变化，不讲算法、调度、后端、接口或模型状态。
5. API smoke 必须覆盖 reader session、choice advance、reader snapshot 和 worldline event count。

### 本轮落地

- `/story` 三栏改为统一 reader layout 轨道：桌面 1240px，宽屏 1340px，中间正文保持 680-760px。
- 阅读分页阈值提升到约 520 字，正文区域可上下滚动，并保留上一页/下一页。
- 书架状态、页码、选择和分支通过浏览器保存；reload 后仍能恢复。
- 右侧栏顺序调整为“我的分支 / 阅读进度 / 选择影响 / 角色记忆 / 剧情节奏 / 故事状态”。
- `smoke-deployed-api.sh` 增加 `/reader/snapshot` 和 worldline event 校验，最新线上 smoke 返回 `reader_choice_events: 2`。
- 浏览器 QA：1440x900 下三栏无横向溢出、正文约 520 字；390x844 下索引和反馈可用，禁词为空。

## 2026-06-12 会员入口要接真实权益，但不能泄漏支付实现

### 现象

后端已经提供 `/v1/reader/subscription` 和 `/v1/reader/checkout/start`，但前端没有真正的会员入口，`/settings` 也没有出现在能力矩阵和路由 smoke 中。这样会出现后端能力存在、产品没有入口的问题。

### 原因

1. 早期设计系统把 settings/billing 都定义为后台直达面，避免未完成支付入口污染读者端。
2. 当 checkout start 已可用后，如果仍然不进入公共导航，商业闭环就无法被用户和团队验收。
3. 后端 checkout payload 含有 provider、stub、idempotency 等技术字段，直接展示会让普通用户误以为进入了排障台。

### 修复原则

1. “会员”可以成为第五个公共导航入口，但不能命名为“设置”或“支付”。
2. 会员页只展示产品化结果：当前方案、阅读次数、创作额度、会员方案、开通请求。
3. checkout start 可以被真实调用，但在正式支付页接入前，前台只能说“开通请求已创建”，不能伪造成支付成功。
4. 会员页必须进入 `check:copy-boundary`、route smoke 和 capability alignment。
5. 阅读页也要显示当前权益状态，并能自然跳转到会员页，不能让商业入口孤立。

### 本轮落地

- 新增 `/settings` 会员中心页面，绑定网页阅读档案 `web_reader_demo`。
- `settingsApi.getSubscriptionStatus` 支持按 account/reader 查询，`useSettings` 支持指定 account。
- 侧边栏新增第五项“会员”，设计系统 registry 和 boundary check 同步升级为五项公共导航。
- `/story` 右侧新增会员权益面板，显示免费体验或会员状态，并跳转到会员页。
- `smoke-deployed-api.sh` 增加 subscription tiers 和 checkout start 校验，最新返回 `subscription_tiers: 3`、`checkout_tier: play_pass`。
- 浏览器 QA：`/settings` 桌面和 390px 移动端无横向溢出；点击阅读会员会显示“已创建 阅读会员 开通请求”，且没有 provider/stub/endpoint 等内部词。

## 2026-06-12 内部能力只能进 Studio/Ops

### 现象

热门题材扫描、function calling、发布检查、确认发布和服务对应关系都已经有真实后端合同。如果为了证明“接上了”而把这些词直接放到首页、创作页或阅读页，页面会再次变成工程说明书，而不是商业产品。

### 原因

1. 公共页负责让用户阅读、选择、创作和开通权益；它们不应该解释扫描函数、cron、服务路径或发布守门。
2. Studio 是创作者和运营的幕后工作台，天然可以承载能力状态、刷新按钮、发布检查和交接边界。
3. 前后端不一致的问题要在 Studio 和自动化脚本里解决，而不是把半成品能力暴露给普通用户。

### 修复原则

1. `/studio` 可以显示 `scan_market_trends`、周期、调度和服务路径；`/`、`/library`、`/story`、`/create`、`/settings` 只能显示产品化结果。
2. 趋势刷新必须走真实 `/v1/market/trends` 和 `/v1/market/trends/scan`，不能只做假按钮。
3. 能力矩阵只放 Studio：已进产品路径、已接服务合同、仅工作台可见、二期规划要清楚分层。
4. 每次新增内部能力，都要补 `check:design-system` 或 `check:copy-boundary`，防止后续改版回流到公共页。

### 本轮落地

- `/studio` 新增“题材趋势与模板排序”，可触发本周/本月趋势刷新。
- `/studio` 右侧新增“题材扫描合同”，只在内部页展示 function calling、周期和调度信息。
- `/studio` 新增“入口与服务对应关系”，把会员、发布检查、趋势刷新等能力的前端入口和服务边界集中展示。
- `smoke-deployed-api.sh` 新增 `POST /market/trends/scan` 的 weekly/monthly 验证。
- `check:design-system` 新增 Studio 趋势刷新和能力映射守护项。

## 2026-06-12 shadcn/ui 维护方式必须是 pattern 下沉

### 现象

页面已经接近商业产品，但 Studio 和会员页仍有不少局部卡片实现：趋势刷新卡、能力映射卡、会员方案卡都可以工作，却散落在页面文件里。继续这样改下去，每个新 goal 都会复制一份相似的 panel/card 样式，后期维护会越来越慢。

### 原因

1. shadcn/ui 提供的是可组合 primitives，不会自动形成“平行宇宙小说”的业务语言。
2. 如果只在页面里堆 Tailwind class，视觉短期能对齐，但无法形成可复用设计资产。
3. 页面契约、registry 和检查脚本如果不跟着更新，组件抽取会变成文档和代码脱节。

### 修复原则

1. 重复出现两次以上的业务卡片必须沉到 `components/design-system`，而不是继续留在页面文件。
2. primitives 保持通用；小说业务含义进入 patterns，例如 `StudioTrendOpsPanel`、`CapabilityMapPanel`、`PlanCard`。
3. 新 pattern 必须同步进入 `registry.ts`、`page-contracts.ts`、shadcn registry JSON 和 `check:design-system`。
4. 公共页和 Studio 的边界不靠口头约定，靠 pattern 名称、page contract 和脚本共同维护。

### 本轮落地

- 新增 `StudioTrendOpsPanel`，承载趋势刷新、扫描合同和周/月刷新按钮。
- 新增 `CapabilityMapPanel`，承载内部入口与服务对应关系。
- `/studio` 改为组合这两个 pattern，移除页面级趋势卡和能力卡实现。
- `PlanCard` 增加可点击、loading、disabled、test id 和 badge 支持，`/settings` 会员方案改用 `PlanCard`。
- `registry.ts`、`page-contracts.ts`、`parallel-universe-ui.registry.json`、`check:design-system` 全部同步更新。

## 2026-06-12 公共用户路径要按真实旅程验收

### 现象

单页检查都通过时，跨页面旅程仍可能有偏差：书城没有明确使用热门题材索引；首页出现章节名会被误判成阅读界面；创作页和会员页也需要验证真实交互，而不是只看静态渲染。

### 原因

1. 小说产品的商业路径不是单个页面，而是发现 -> 书城 -> 阅读 -> 创作 -> 会员的连续旅程。
2. 首页可以显示书籍和更新，但不能出现正文阅读纸张；判断标准应是是否存在阅读器 DOM，而不是是否出现章节名。
3. 书城如果不接同一套趋势数据，会和首页/创作页的推荐逻辑分叉。
4. 浏览器 QA 必须覆盖交互：阅读选择、创作生成、会员开通请求。

### 修复原则

1. 公共路径验收同时覆盖桌面 1440x900 和移动 390x844。
2. 首页检查 `manuscript-paper` / `reader-paper-frame`，确保不是阅读页复用。
3. 书城分类和排序读取 `marketTrends`，与首页和创作页共享趋势合同。
4. 创作页必须输入真实故事种子验证，不只看空状态。
5. 会员页必须点击开通请求验证，不只看 PlanCard 渲染。

### 本轮落地

- `/library` 新增 `marketApi.getTrends('weekly')`，筛选项来自 `marketTrends.top_categories`。
- `/library` 作品排序使用 `orderTemplatesByMarketTrends`，筛选时同时匹配趋势 label/category。
- `/library` 文案改为“热门题材索引专区”，和首页、创作页统一。
- 浏览器 QA：五条公共路径在 1440x900 与 390x844 都无横向溢出、无内部禁词。
- 交互 QA：阅读选择有分支反馈；创作页输入故事种子后有开场、追问和故事笔记；会员页三档 PlanCard 和开通请求正常。

## 2026-06-12 前后端合同要有总闸

### 现象

前端和后端都在快速补能力，单独看某个页面或某个接口都可能是绿的，但仍然会出现两类浪费：前端有入口但服务没有接上，或者后端已有能力但没有进入产品路径。

### 原因

1. 旧对齐脚本只检查 API client 路径是否存在于 OpenAPI，没有声明“哪些产品合同必须存在”。
2. `reader/continue` 这类兼容路径不一定直接由页面调用，但仍必须被 smoke 覆盖。
3. Studio-only 能力如果误入公共页，会污染读者体验；公共能力如果只留在 Studio，又会变成后端孤岛。

### 修复原则

1. 每个产品能力至少要同时具备：OpenAPI path、API client、capabilityAlignments、产品入口或 smoke/Studio 证明。
2. 公开页入口和 Studio-only 能力必须分层检查：质量评价、确认发布、趋势扫描只能在 Studio 或 smoke 中出现。
3. 二期能力必须保留 `unsupportedFeature` 边界，不能被写成已上线。
4. 新后端能力交付时，后端团队需要同时给出 OpenAPI、窄测、smoke 样例和前端入口建议。

### 本轮落地

- `check-capability-alignment.mjs` 新增 13 个 required product contracts。
- 覆盖 reader library/session/continue/snapshot/advance、creator dialogue、market trends/scan、subscription/checkout、quality/canon。
- `reader/continue` 被标记为 smoke 覆盖路径，避免前端为了过检查重复调用。
- 检查 public nav 不允许出现 Studio/settings/billing 后台 id，普通用户导航必须保留发现、阅读、书城、创作、会员。
- 检查 Studio-only 调用不能出现在 Home/Library/Story/Create/Account。
- 检查二期/不可用能力继续保留 `unsupportedFeature` 边界。

## 2026-06-12 交接资产必须和真实产品状态同步

### 现象

概念图、浏览器截图、后端备注和交接包经常在不同时间生成。如果只更新其中一个，团队会拿到互相矛盾的材料：概念图像产品、文档像接口说明、压缩包又是旧页面。

### 原因

1. 概念图是方向约束，不是当前实现证据。
2. 后端备注需要写给工程团队，不能进入公共页面或设计图。
3. 浏览器 QA 截图必须来自当前运行产品，否则无法说明现状。
4. 压缩包必须包含 manifest、截图、设计系统、产品文档和关键脚本，不能只打源码或只打图片。

### 修复原则

1. 每次交接前先刷新真实产品截图，再写文档，再封包。
2. 概念图只放 `artifacts/design-assets`，并在文档中说明它是参考，不是页面内容。
3. 后端实现备注只写进 markdown，禁止污染 public route 和 concept board。
4. 交接包必须带 manifest、checksum、QA 截图和验证脚本路径。

### 本轮落地

- 新增 P8 截图证据目录：`artifacts/visual-qa/p8-handoff-20260612T224737Z`。
- 覆盖 `/`、`/library`、`/story`、`/create`、`/settings`、`/studio` 的桌面截图，和关键公共页移动截图。
- `qa-screenshot-manifest.json` 记录每张截图的 viewport、URL 和横向溢出状态。
- P8 交接包包含 handoff、design-system、product docs、关键 scripts、前端合同源码摘要、QA 截图和 concept references。
- 主交接文档记录 P8 截图目录、概念图边界和压缩包位置。

## 2026-06-12 /create 必须像对话助手，而不是状态流水账

### 现象

创作页已经接上真实对话合同，但视觉上仍容易滑回“顶部口号 + 状态卡 + 右侧说明 + 底部输入框”的流水账结构。移动端尤其明显：示例按钮和说明文案会把真正的输入动作挤到首屏之外。

### 原因

1. 小说创作入口的第一价值是“把一句想法写成第一幕”，不是展示模板、字段或能力解释。
2. 用户需要类似 Codex 的自然语言协作感：先说想法，系统给出文本，再用少量追问帮助他决策。
3. “思维链”不能直接展示，只能产品化为安全的创作脉络：故事钩子、人物缺口、场景压力、世界规则和风格基调。
4. 移动端不能把示例和说明当成和输入同等重要的内容。

### 修复原则

1. `/create` 首屏优先保证一句话输入框和开始按钮可见。
2. 空状态只保留自然语言引导；不要先让用户整理设定表。
3. 创作脉络和故事笔记是沉淀结果，桌面可放右侧，移动端自然下滚。
4. 不显示 `system prompt`、原始思维链、后端、接口、来源平台、绑定或底盘等内部词。
5. 移动端可收起示例建议，保住核心动作。

### 本轮落地

- `/create` 标题字号和顶部信息密度下调，962px 宽度下输入框和示例都进入首屏。
- `CreatorReasoningMap` 从主对话区移到侧栏，页面主轴回到自然语言创作。
- UI 展示词从“创作推演”改为“创作脉络”，避免用户误解为模型内部推理。
- 移动端隐藏示例建议和重复说明，390x844 下输入框与“开始创作”按钮都在首屏内。
- 浏览器 QA：962x883、390x844、1440x900 均无横向溢出，且无 `起点 / 番茄 / 绑定 / 底盘 / system prompt / 思维链 / 后端 / 接口 / PRD` 等禁词。
- 真实输入故事种子后，生成 522 字开场、2 个追问和故事笔记，继续使用当前 creator dialogue 合同。

## 2026-06-12 热门题材索引必须是一套产品入口

### 现象

首页、书城和创作页都在展示热门题材，但如果各自手写分类或点击后不带筛选状态，用户会感觉三个入口互相独立。更糟的是，为了解释推荐来源而把来源平台、绑定关系或底盘说明写到页面上，会再次让产品变成研究报告。

### 原因

1. 热门题材索引是用户找书和创作的产品入口，不是数据来源说明。
2. 题材点击必须能带着状态进入书城，否则只是装饰按钮。
3. 创作页的灵感方向必须和首页、书城使用同一套趋势排序，否则用户从书城进入创作会换味道。
4. 你给的冻结式主宇宙方案当前正文落在六大主模板；前端不能为了凑十个分类而新增后端没有支撑的假模板。

### 修复原则

1. 首页、书城、创作页统一读取 `marketApi.getTrends('weekly')`，失败时才使用 `marketTrendFallback`。
2. 首页题材点击进入 `/library?topic=...`，书城读取 URL topic 并激活筛选。
3. 作品卡进入阅读；“用这个方向创作”进入 `/create?template=...` 并继承对应灵感方向。
4. Public copy 只说热门题材索引、灵感方向、作品推荐；禁止 `起点 / 番茄 / 绑定 / 底盘` 等研究或工程词。

### 本轮落地

- 首页顶部题材和热门题材索引行都带 `topic` 进入书城筛选。
- `/library` 读取 URL topic，筛选栏、作品列表和创作入口共享同一套趋势合同。
- `/create?template=rain-bridge` 能继承“都市谜案”和对应写作气质。
- 浏览器 QA：首页点击“都市谜案”进入 `/library?topic=都市谜案`，书城激活“都市谜案”并展示《雨夜桥边》。
- 移动端 QA：`/`、`/library?topic=玄幻悬疑`、`/create?template=frontier-edict` 均无横向溢出且无内部禁词。

## 2026-06-12 重复列表控件要下沉为 shadcn-compatible pattern

### 现象

首页和书城都各自手写了题材筛选条和榜单行。它们视觉上相似、行为也相似，但一旦分散在页面文件里，后续很容易出现：首页跳转带 topic，书城筛选不读 topic；首页榜单样式变了，书城榜单还是旧样式。

### 原因

1. shadcn/ui primitives 只解决按钮、卡片、输入框等基础层，不会自动生成“平行宇宙小说”的题材索引和榜单语言。
2. 页面级 Tailwind 写得越多，越容易复制出局部一致、系统不一致的 UI。
3. 抽象必须服务维护成本，不能为了抽象而大迁移。

### 修复原则

1. 出现于两个以上 public route、并承担同一交互语义的 UI，优先下沉到 `components/design-system`。
2. 新 pattern 必须同步 registry、page contracts、shadcn registry JSON 和 `check:design-system`。
3. 页面只传数据和路由意图，pattern 负责统一结构、类名和可访问性。
4. 不做整站重写；每轮只抽 1-3 个高收益 pattern。

### 本轮落地

- 新增 `TopicFilterBar`，首页和书城共用热门题材筛选条。
- 新增 `RankedWorldList`，首页和书城共用榜单行。
- `Home.tsx` 和 `Library.tsx` 移除重复题材条和榜单行 JSX。
- `registry.ts`、`page-contracts.ts`、`parallel-universe-ui.registry.json`、`check-design-system-boundary.mjs` 全部同步更新。
- `SHADCN_UI_DESIGN_SYSTEM_PLAN.md` 的迁移顺序新增列表 pattern 下沉步骤。

## 2026-06-12 后端团队交付包必须先判定边界，再接能力

### 现象

后端团队交付包同时包含 FastAPI 后端和一套 `apps/web` Next.js 前端。如果直接把整个包当成“后端已完成”接收，很容易把第二套前端、旧导航、旧页面文案和不同路由模型带进当前产品，造成重复开发和体验倒退。

### 原因

1. 当前产品前端已经确定为 `app` 下的 Vite + React + TypeScript，并且已经围绕 shadcn-compatible patterns、公共文案边界和浏览器 QA 建立了检查。
2. 后端包里的 `apps/web` 是另一套技术栈和产品路径，无法自动继承当前首页、阅读、创作、会员和书城的设计约束。
3. 后端包的 API 是 root-level route；当前产品入口使用 `/v1` 合同，必须通过兼容层接线。
4. 子 agent 审批因额度失败时，不能默认放行；必须默认禁止并入第二套前端。

### 修复原则

1. 后端交付包先解到 `artifacts/backend-team-inspection/`，只读审查，不覆盖源码。
2. 任何 `apps/web`、页面、导航、样式和 public copy 默认禁止并入，除非后续子 agent 明确审批通过。
3. 只抽取后端能力、类型合同、worker、测试和非 UI 业务逻辑。
4. 后端团队应对齐当前 `/v1` 产品合同，而不是要求当前前端改接内部 route。
5. 审查结论必须写进 `docs/backend/`，而不是停留在聊天记录。

### 本轮落地

- 新增 `docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md`。
- 明确 `apps/web` Next.js 前端未获审批，禁止并入当前 Vite/React 产品线。
- 明确 FastAPI、Alembic、agent、worker、shared contract 和测试资产可作为后端接线参考。
- 明确 `/v1` 产品合同与后端团队 root-level route 的映射、冲突和缺口。
- P13 开始前，必须先跑当前前端和合同检查，证明产品线未被第二套前端污染。

## 2026-06-13 P19 发布候选必须同时验证 API smoke、CORS 和已部署前端版本

### 现象

`https://pun-api-p0.vercel.app` 的 API smoke 可以通过，稳定前端域名也能打开，但线上 `/settings` 只显示“开通请求已创建”，没有 P18 新增的 `完成开通`。同时，新随机 Vercel preview 域如果不在 API CORS allowlist 里，服务端 smoke 仍会绿，真实浏览器却会被预检挡住。

### 原因

1. API smoke 是服务端到服务端验证，不能证明浏览器 CORS 和前端 bundle 都正确。
2. Vercel preview URL 会随项目和部署变化，固定 `NARRATIVEOS_ALLOWED_ORIGINS` 不适合每一次 preview。
3. 稳定域名可能仍指向旧部署，不能因为 API 绿就默认它包含最新 UI。
4. 当前 workspace 根目录不是 Git 仓库，RC 证据必须用部署链接、manifest、脚本输出和浏览器 QA 固化。

### 修复原则

1. P19 以后，发布候选必须包含一对 frontend/API preview URL，而不是只给一个静态页面。
2. API 部署需要同时支持固定 origin 和 `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`。
3. Vercel preview 的浏览器 QA 必须打开已部署 URL，而不是本地 dev server。
4. 会员/支付类验收必须实际点完 `开通这个方案 -> 完成开通`，并确认权益数字刷新。
5. 旧稳定站可以作为 rollback，但不能自动作为最新 RC。

### 本轮落地

- `backend/src/narrativeos/api/app_factory.py` 增加 `NARRATIVEOS_ALLOWED_ORIGIN_REGEX`。
- `backend/tests/test_cors_config.py` 覆盖固定 origin 和 Vercel preview regex。
- `scripts/package-vercel-backend-api.sh` 与 `scripts/package-backend-api-deploy.sh` 加入 CORS 测试和 regex env 说明。
- 新增 `docs/product/P19_PRODUCTION_DEPLOYMENT_SMOKE_RC_FREEZE_20260613.md`。
- 新增 `artifacts/deploy/parallel-universe-p19-rc-20260613T140145Z.json`。
- P19 RC frontend: `https://app-i7x25dxxi-james-projects-97742675.vercel.app`。
- P19 RC API: `https://pun-api-p19.vercel.app`。

### 后续开发规则

1. 每次部署 preview 前先跑本地 RC gate，再跑远端 API smoke。
2. 每次部署 preview 后至少做一个真实浏览器路径：打开 public route、确认无 console error、完成一个需要 API 的动作。
3. 如果要推广到生产域名，先确认 alias 指向最新 frontend deployment，并确认 API CORS 包含生产域名。
4. 生产支付、账号和持久化未完成前，文档必须写清楚“RC preview”而不是“production ready”。

## 2026-06-13 P20 账号快照必须先于跨设备承诺

### 现象

会员页已经能开通和刷新权益，但阅读进度、创作草稿和当前浏览器档案还分散在不同链路里。如果直接在页面上说“已完成跨设备同步”，会把还没有生产化的登录、持久化和合并流程伪装成已完成能力。

### 原因

1. 会员权益、阅读进度、创作对话和未来作品草稿属于同一个用户恢复问题，但它们的数据来源不同。
2. 公共页面只能展示“可继续做什么”，不能展示 provider、webhook、event id、冲突日志或修复动作。
3. `/settings` 是公共会员入口，不是运营诊断台。
4. 跨设备恢复不能伪装完成；未登录用户只能说当前浏览器档案可用，登录后再合并。

### 修复原则

1. 先定义 `/v1/account/snapshot`，再扩展跨设备恢复 UX。
2. P20 账号快照统一返回 membership、reader_progress、creator_drafts、local_fallback、conflicts 和 resume_action。
3. 公共 Account 页面只展示阅读档案、创作草稿、会员权益和跨设备恢复状态。
4. Studio/Ops 才能请求 diagnostics、查看冲突和执行修复。
5. 不新增第二套前端，不并入后端团队 `apps/web`，仍以当前 Vite + React + TypeScript 为唯一产品前端。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_snapshot.py`。
- 新增 `GET /v1/account/snapshot`。
- `/settings` 增加阅读档案、创作草稿和跨设备恢复卡片。
- `scripts/smoke-deployed-api.sh` 串联同一账号的阅读、创作、会员和账号快照。
- `check:alignment`、`check:design-system` 和 `check:backend-bridge` 都把 P20 账号快照纳入门禁。

## 2026-06-13 P21 生产支付硬化必须把公共状态和 provider 回调分开

### 现象

P18/P20 阶段为了验证会员闭环，公共 `/settings` 页面可以触发“完成开通”，前端 `settingsApi.completeCheckout` 直接调用 `/reader/checkout/webhook`。这虽然便于本地演示，但会把浏览器伪装成支付提供方，和生产支付的安全边界相冲突。

### 原因

1. 浏览器只能发起开通、跳转/返回、检查状态，不能生成 provider lifecycle event。
2. webhook、provider_event_id、idempotency_key、replay 和 reconcile 属于后端或 Studio/Ops 的诊断与修复语言。
3. 公共会员页如果显示或触发这些概念，会把用户体验变成后台排障台。
4. 预览环境需要可跑通，但预览完成也必须由服务端受控 return 合同完成，而不是前端手写 provider 事件。

### 修复原则

1. 公共前端只调用 `/v1/reader/checkout/start`、`/v1/reader/checkout/{checkout_session_id}/status` 和 `/v1/reader/checkout/return`。
2. provider callback 单独走 `/v1/reader/checkout/provider-callback`，必须 HMAC 验签。
3. 公共 status/return 响应必须去掉 provider、provider_ref、provider_event_id、idempotency_key 和 raw lifecycle event。
4. `check:alignment` 必须禁止 `app/src/api/settings.ts` 调用 `/reader/checkout/webhook`。
5. 真实商户凭证、退款、争议、对账和 replay 只能进入 Studio/Ops 或后端文档。

### 本轮落地

- `BillingService` 增加 public checkout status、server-side return handling 和 callback signature verification。
- 新增 `GET /v1/reader/checkout/{checkout_session_id}/status`。
- 新增 `POST /v1/reader/checkout/return`。
- 新增 `POST /v1/reader/checkout/provider-callback`。
- `/settings` 按钮改为“检查开通状态”，不再说浏览器能直接完成真实支付。
- `settingsApi.completeCheckout` 改走 return 合同，不再调用 webhook。
- 新增 `tests/test_payment_provider_hardening.py`。
- `smoke-deployed-api.sh` 改为 start -> status -> return -> subscription -> account snapshot。

## 2026-06-13 P22 账号合并必须把本机档案和登录账号分开确认

### 现象

P20 已经能展示账号快照，P21 已经把支付完成从浏览器中剥离出来，但 `/settings` 仍然主要依赖固定的 `web_reader_demo` 和 `web_creator`。如果在这个阶段直接说“跨设备恢复已完成”，会把本机浏览器档案误说成生产账号能力。

### 原因

1. 阅读进度属于 reader session，创作草稿属于 creator dialogue session，支付权益属于 account membership；三者不是同一个 owner 字段。
2. 登录身份存在 actor id 和 account id 的区别：阅读归 account id，创作草稿归 actor id。
3. 普通用户只需要知道“发现本机档案”和“合并到账号”，不应该看到数据库归属、冲突日志或修复动作。
4. 合并必须先 preview，再 confirm；不能在登录瞬间悄悄迁移数据。

### 修复原则

1. `/v1/account/merge/preview` 只返回 public-safe 的数量、冲突提示和建议动作。
2. `/v1/account/merge/confirm` 必须要求 bearer token，并把 reader session 迁到 signed-in account id。
3. 创作草稿迁到 signed-in actor id，避免 actor/account 分离时草稿无法恢复。
4. 支付权益保留在 signed-in account，不被本机档案覆盖。
5. `/settings` 只显示登录、创建账号、发现本机档案、合并到账号、继续阅读和继续创作。
6. Studio/Ops 才能承接未来的 merge audit、device inventory、privacy export/delete 和 account deletion。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_merge.py`。
- 新增 `POST /v1/account/merge/preview`。
- 新增 `POST /v1/account/merge/confirm`。
- `repositories.py` 增加 `reassign_reader_sessions`。
- `CreatorDialogueService` 增加 `reassign_sessions`。
- `app/src/main.tsx` 接入 `AuthProvider`。
- `/settings` 增加登录/注册、合并预览、合并确认和合并后快照刷新。
- `check:alignment` 和 `smoke-deployed-api.sh` 纳入账号合并合同。
- 新增 `docs/backend/P22_PRODUCTION_ACCOUNT_MERGE_PERSISTENCE_20260613.md`。

## 2026-06-13 P23 账号数据治理必须先做用户可理解的导出和删除

### 现象

P22 已经能把本机档案合并到登录账号，但上线前还缺少最基本的数据治理入口：用户能否拿走自己的数据、能否删除账号、删除时阅读进度和创作草稿如何处理、登录会话如何退出。如果这一步只写在后端文档里，公共 `/settings` 仍然会像一个只能开会员和合并档案的页面。

### 原因

1. 账号数据治理不是后台功能，它必须有用户能理解的入口。
2. 导出账号数据不能泄漏密码哈希、token hash、provider payload 或迁移诊断。
3. 删除账号必须先预览影响，再显式确认，不能在一个按钮里直接清空。
4. 阅读进度、创作草稿、会员记录和登录会话有不同处理方式：前两者可以删除，会员记录需要作为账务记录保留并标记关闭。
5. 退款、争议、合规留存和安全审计不是普通用户页面要展示的内容。

### 修复原则

1. `/v1/account/data/export` 只返回当前登录账号的数据包，且必须 public-safe。
2. `/v1/account/delete/preview` 返回阅读、创作、会员和登录状态的影响数量。
3. `/v1/account/delete/confirm` 必须要求确认文本 `删除账号`。
4. 删除确认后要撤销登录会话，关闭 auth identity，删除 reader sessions 和 creator dialogue sessions。
5. 订阅记录不能硬删，先标记 `account_closure_pending`，后续退款/争议由支付合规目标处理。
6. `/settings` 只展示“导出我的数据”“删除账号”“账号已删除”等用户语言，不展示数据库、provider、token 或修复日志。

### 本轮落地

- 新增 `backend/src/narrativeos/services/account_data.py`。
- 新增 `GET /v1/account/data/export`。
- 新增 `POST /v1/account/delete/preview`。
- 新增 `POST /v1/account/delete/confirm`。
- `repositories.py` 增加 reader session 删除、auth token 撤销、auth identity 关闭和订阅关闭标记。
- `CreatorDialogueService` 增加 `delete_sessions`。
- `/settings` 增加“账号与数据”区域。
- `AuthContext` 增加 `clearLocalSession`，删除账号后留在页面展示结果。
- `check:alignment` 和 `smoke-deployed-api.sh` 纳入账号导出和删除合同。
- 新增 `docs/backend/P23_ACCOUNT_DATA_GOVERNANCE_SECURITY_20260613.md`。

## 2026-06-13 P24 上线验收不能只看页面能打开

### 现象

P19 已经发过 RC 预览，P20-P23 又陆续补上登录账号、支付硬化、账号合并、数据导出和删除。如果 P24 仍然只看某个预览链接能打开，就会遗漏真正上线前最危险的部分：生产数据库、回滚、CORS、支付回调、隐私删除、账号会话撤销和公共页面文案边界。

### 原因

1. 上线验收是前端、后端、合同、部署包、smoke、浏览器 QA 和风险签收的组合，不是单项 build。
2. 当前唯一产品前端仍然是 Vite + React + TypeScript 的 `app`，任何外部前端都不能绕过子 agent 审批直接并入。
3. `/settings` 已经承载账号、会员、合并、导出和删除，所以必须纳入浏览器 QA。
4. 真实生产发布必须有持久数据库、备份恢复、支付争议/退款、隐私合规和安全审计，不能用本地 SQLite 或 preview 包伪装完成。

### 修复原则

1. P24 launch readiness 必须一次跑完前端边界、后端目标测试、OpenAPI 合同和 API smoke。
2. 前端预览包的验收路由必须包含 `/settings`，不只看 `/`、`/story`、`/create`。
3. 后端 Vercel 包的必备接口清单必须覆盖 P20-P23 的 auth、account snapshot、merge、data export 和 delete。
4. 浏览器 QA 要覆盖 `/`、`/library`、`/story`、`/create`、`/settings`、`/studio`，公开页面禁止出现后端/PRD/平台来源/绑定/provider/webhook/OpenAPI 等内部词。
5. 生产 blocker / production blocker 要写进交接文档：数据库迁移、备份恢复、支付退款争议、隐私法律、安全审计、域名 CORS 和回滚演练。

### 本轮落地

- 新增 `scripts/check-launch-readiness.sh`。
- `package-vercel-preview.sh` 的 route 清单加入 `/settings`。
- `package-vercel-backend-api.sh` 的 tests 和 required API 清单加入 P22/P23 账号合并与数据治理能力。
- 新增 `docs/product/P24_DEPLOYMENT_LAUNCH_ACCEPTANCE_20260613.md`。
- 生成 P24 launch manifest：`artifacts/integration/launch-readiness-20260613T202710Z.json`。
- 生成 P24 前端包和后端包：`parallel-universe-vercel-preview-20260613T201820Z.*`、`parallel-universe-vercel-backend-api-20260613T201820Z.*`。
- 浏览器 QA 证据：`artifacts/visual-qa/p24-launch-routes-mqcszrli/`。

## 2026-06-13 P25 部署执行必须把 preview、RC 和 production 分清

### 现象

P24 已经能本地验收和打包，但如果 P25 只是把包推到 Vercel 并回一个链接，就会把“可访问 preview”误说成“正式上线”。更危险的是，Vercel API 项目可能显示 target 为 production，但实际数据库仍是 `/tmp` sqlite preview 数据库；如果文档不写清楚，八小时后验收会把部署成功、数据持久化、回滚可执行这三件事混在一起。

### 原因

1. 部署不是 UI 质量问题，而是产品工程边界问题：链接、API smoke、CORS、浏览器 QA、备份、恢复 dry-run 和生产 blocker 都要同时存在。
2. 当前唯一产品前端仍然是 Vite + React + TypeScript 的 `app`；P25 不能趁部署阶段并入任何外部前端。
3. Vercel preview 链接可以证明远端可访问，但不能证明持久数据库、支付回调、隐私合规和安全审计已经完成。
4. 回滚演练必须至少包含前端 alias / env 回退命令、API 回退目标、数据库恢复前置条件和 recovery drill 证据。

### 修复原则

1. 每次真实部署都必须先跑 `scripts/smoke-deployed-api.sh https://<api-host>`，再跑远端浏览器 QA。
2. CORS 要用真实前端 preview origin 做 `OPTIONS` 预检，确认 `access-control-allow-origin` 精确命中当前前端域名。
3. API 项目显示 production target 时，必须在产品文档里说明这是 preview / RC 项目别名，不等于 public paid production launch。
4. sqlite under `/tmp` 只能作为 preview 数据库；生产上线前必须换成持久数据库并完成 migration apply、runtime backup、restore dry-run 和 recovery drill。
5. P25 完成后才允许进入 P26；P26 的目标必须是 public production release gate，而不是继续优化页面。

### 本轮落地

- 新增 `docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md`。
- 远端前端 preview：`https://app-638zzda7k-james-projects-97742675.vercel.app`。
- 远端 API preview / RC：`https://pun-api-p25.vercel.app`。
- 远端浏览器 QA 证据：`artifacts/visual-qa/p25-remote-routes-mqda04cd/`。
- 远端部署执行证据：`artifacts/integration/p25-deployment-execution/`。
- CORS 预检证据：`cors-preflight.txt`。
- runtime backup、restore dry-run、recovery drill 和 migration dry-run 均已落盘。
- P25 结论：preview / staging deployment rehearsal 完成；public paid production launch 仍需 P26 清掉 persistent database、custom-domain CORS、real payment provider、privacy/legal、security audit 和 production rollback blockers。

## 2026-06-13 P26 生产发布门禁必须允许明确 blocked

### 现象

P25 的预览部署已经可访问，容易让团队顺势说“可以上线”。但 P26 审计发现：Vercel scope 下没有自定义域名，`app` 与 `pun-api-p25` 项目没有持久 env，API 仍依赖部署命令注入 sqlite `/tmp` 数据库，支付仍是 `web_stub`。如果门禁脚本只追求绿灯，就会把真实生产资源缺口遮住。

### 原因

1. 生产发布门禁不是普通构建检查；它必须能输出 blocked，而且 blocked 也可以是正确结果。
2. 预览 smoke 只能证明产品链路能跑，不能证明生产数据库、支付、域名、法律和安全已经就绪。
3. 生产资源很多在仓库外：域名、Vercel env、数据库、支付商户、隐私/legal 和安全审计，不能由前端代码假装完成。
4. 生产 alias 切换是外部副作用，必须等产品负责人明确批准，不能由自动 loop 自行执行。

### 修复原则

1. 新增 `scripts/check-production-release-gate.mjs`，检查 P26 文档、资源审计 artifact、handoff、P13 和前端 Vercel 安全头。
2. P26 audit 的正确结论当前是 `decision: blocked`，并且 `can_promote_public_paid_production` 必须是 `false`。
3. `app/vercel.json` 先补静态安全头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。
4. P26 不能执行 production alias promotion；只能给出可复跑命令和明确批准条件。
5. 下一轮 P27 必须在两条路中选：生产资源已提供则做 provisioning；资源仍缺则打包 blocked launch handoff。

### 本轮落地

- 新增 `docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md`。
- 新增 `artifacts/integration/p26-production-resource-audit.json`。
- 新增 `scripts/check-production-release-gate.mjs`。
- `app/package.json` 增加 `check:production-gate`。
- `app/vercel.json` 增加前端静态安全头。
- P26 结论：public paid production launch blocked；preview / staging testing 可以继续。

## 2026-06-13 P27 blocked launch handoff 也必须可验证

### 现象

P26 明确 public paid production launch 是 `blocked` 后，团队仍然需要可交接成果。如果只把 P25/P26 文档散落在仓库里，后端、运营、产品负责人会不知道该看哪份证据、谁补什么资源、哪些命令可以跑、哪些命令不能跑。更危险的是，blocked 很容易在口头沟通里被误读成“预览已经上线，所以差不多可以生产发布”。

### 原因

1. 交接包也是 release artifact，必须能被脚本验证，而不是靠聊天记录说明。
2. blocked 是当前正确结论，不是失败；正确产物应该让团队知道 preview / staging 可继续，public paid production 不能自动推进。
3. 生产资源缺口分布在 product owner、backend、ops、payment、legal/privacy、security 多个责任人，必须在 manifest 里按 owner 拆清楚。
4. 外部前端和密钥最容易在打包时误混进来，必须用 package gate 检查。

### 修复原则

1. 新增 `scripts/check-blocked-launch-handoff.mjs`，检查 P27 文档、operator runbook、manifest、包目录、tar.gz、sha256、禁入路径和密钥样式。
2. `app/package.json` 增加 `check:blocked-launch`，让 P27 包和 P26 production gate 一样能被 npm 脚本复跑。
3. P27 manifest 必须保留 `public_paid_production_launch: blocked`，并列出 `npm --prefix app run check:blocked-launch`。
4. 单一可传输交付物必须包含 P25/P26/P27 文档、P25 远端 QA 证据、P26 resource audit、关键 scripts 和 README；禁止包含 `node_modules`、`dist`、`.env`、`.vercel`、`.venv`、`apps/web` 或真实密钥。
5. P28 只能在两条路里选：生产资源已经提供则做 provisioning；资源仍缺则组织 blocked launch review 和 owner assignment。

### 本轮落地

- 新增 `docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md`。
- 新增 `docs/product/P27_OPERATOR_RUNBOOK_20260613.md`。
- 新增 `artifacts/integration/p27-blocked-launch-package-manifest.json`。
- 新增 `scripts/check-blocked-launch-handoff.mjs`。
- 交接包路径：`artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz`。
- 校验和路径：`artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz.sha256`。
- P27 结论：可交接 blocked launch 包；public paid production launch 仍为 blocked；preview / staging testing 可以继续。

## 2026-06-13 P28 blocked launch review 要把阻塞项转成 owner card

### 现象

P27 已经能把 blocked launch 包交给团队，但如果没有 owner board，交接很容易停在“大家都知道还缺资源”的状态。八小时验收真正需要的是谁负责、补什么、交什么证据、跑什么命令、什么时候重新决策。

### 原因

1. 生产 blocker 不是一个工程 bug，而是一组跨产品、后端、运营、支付、legal/privacy、安全和回滚负责人的外部资源承诺。
2. 自主 loop 不能代替产品负责人执行 alias promotion、不能代替支付负责人提供真实商户、不能代替 legal/security 签字。
3. 没有 intake schema 时，团队容易把真实密钥、外部前端或未验收的 production claims 写进仓库。

### 修复原则

1. 新增 `docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`，每个 blocker 都有 owner card、required input、验证命令、acceptance artifact、release impact 和 fallback。
2. 新增 `artifacts/integration/p28-production-resource-intake.schema.json`，作为 production resource intake；只记录 owner、presence 和 artifact path，不记录真实 secret 值。
3. 新增 `docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`，把 go/no-go、会前材料、不能自动运行的命令和 P29 分支写清楚。
4. 新增 `scripts/check-launch-review-intake.mjs` 和 `check:launch-review`，防止 P28 文档把 blocked 说成 ready、把 preview 说成 production、或批准第二套前端。

### 本轮落地

- 新增 P28 owner board：`docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`。
- 新增 P28 launch review brief：`docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`。
- 新增 P28 intake schema：`artifacts/integration/p28-production-resource-intake.schema.json`。
- 新增 P28 gate：`scripts/check-launch-review-intake.mjs`。
- `app/package.json` 增加 `check:launch-review`。
- P28 结论：下一阶段必须由 owner 提供生产资源和验收材料；在此之前 public paid production launch 继续 blocked。

## 2026-06-13 P29 blocked launch governance dashboard 要成为验收状态源

### 现象

P28 已经把 blocker 拆成 owner card，但八小时后验收还需要一个统一状态源：哪些证据已经存在、哪些 owner 仍 blocked、下一次复审看什么。如果没有 evidence ledger，验收会重新回到翻聊天记录和散落文档。

### 原因

1. Owner card 适合分配责任，evidence ledger 适合持续追踪状态和证据。
2. blocked launch 的下一步通常不是继续写代码，而是治理节奏：daily active update、weekly waiting update、owner escalation。
3. 状态账本必须继续防止三件事：把 preview 说成 production、把 blocked 改成 ready、把外部前端或真实密钥写进仓库。

### 修复原则

1. 新增 `docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`，展示每个 area 的 status、owner、current evidence、missing input、next action。
2. 新增 `artifacts/integration/p29-blocked-launch-evidence-ledger.json`，机器可读记录 P25/P26/P27/P28 证据、owner、status、review cadence 和 P30 分支。
3. 新增 `scripts/check-blocked-launch-governance.mjs` 和 `check:governance`，验证 ledger 引用文件存在、状态仍 blocked、无 secret、无外部前端批准。
4. P30 只有两条路：所有 ledger entry accepted 则 production provisioning execution；否则 owner escalation and governance maintenance。

### 本轮落地

- 新增 P29 dashboard：`docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`。
- 新增 P29 evidence ledger：`artifacts/integration/p29-blocked-launch-evidence-ledger.json`。
- 新增 P29 gate：`scripts/check-blocked-launch-governance.mjs`。
- `app/package.json` 增加 `check:governance`。
- P29 结论：八小时验收以 P29 dashboard + ledger 为 blocked launch 状态源；public paid production launch 仍 blocked。

## 2026-06-13 P30 owner escalation 要把 blocked 状态转成可催办动作

### 现象

P29 ledger 可以证明哪些 area 仍 blocked，但如果 owner 没有下一步动作、SLA 和升级话术，治理状态会停在“知道问题”而不是“推动解决”。八小时 loop 需要在没有新生产资源的情况下继续产出可执行交付，而不是重复做前端。

### 原因

1. 没有生产资源时，最有效的工程产物是 owner escalation matrix，而不是继续改 UI。
2. 每个 blocker 都必须有 required artifact、blocked release impact、escalation message 和 due cadence。
3. escalation 仍然不能把 blocked 改成 ready，不能批准 `apps/web`，不能写入真实 secret。

### 修复原则

1. 新增 `docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`，输出 owner messages、SLA、升级触发和治理维护协议。
2. 新增 `artifacts/integration/p30-owner-escalation-matrix.json`，机器可读映射 P29 ledger area 到 owner、severity、required artifact、release impact 和 escalation message。
3. 新增 `scripts/check-owner-escalation.mjs` 和 `check:escalation`，验证 P30 matrix 与 P29 ledger/P28 owner board 对齐。
4. P31 只有两条路：所有 owner artifact 到齐则 production provisioning execution；否则 production owner escalation review。

### 本轮落地

- 新增 P30 escalation 文档：`docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`。
- 新增 P30 escalation matrix：`artifacts/integration/p30-owner-escalation-matrix.json`。
- 新增 P30 gate：`scripts/check-owner-escalation.mjs`。
- `app/package.json` 增加 `check:escalation`。
- P30 结论：当前仍需 owner 补齐生产资源与审批；public paid production launch 继续 blocked。

## 2026-06-13 P31 acceptance artifact template pack 要降低 owner 补材料摩擦

### 现象

P30 escalation matrix 已经指出每个 owner 要补哪个 artifact，但如果没有模板，owner 仍然会用不同格式提交材料，甚至可能把真实 secret、终端输出或外部前端决策混进仓库。

### 原因

1. 验收 artifact 需要统一字段和默认状态，才能被后续 gate 自动判断。
2. 模板必须默认 `pending`，不能被误读为已批准。
3. 模板只能记录 secret presence 和 verification output path，不能记录真实凭据值。

### 修复原则

1. 新增 `docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md` 作为 owner 填写入口。
2. 新增 `artifacts/integration/p31-acceptance-templates/` 下 7 个 template，对应 P30 matrix 的 7 个 required artifact。
3. 新增 `scripts/check-acceptance-templates.mjs` 和 `check:templates`，验证模板齐全、默认 pending、release blocked、无 secret、无外部前端批准。
4. Owner 完成模板后另存为 P28/P30 指定的正式 artifact，再由 P32 intake validator 验收。

### 本轮落地

- 新增 P31 template index：`docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md`。
- 新增 P31 模板目录：`artifacts/integration/p31-acceptance-templates/`。
- 新增 P31 gate：`scripts/check-acceptance-templates.mjs`。
- `app/package.json` 增加 `check:templates`。
- P31 结论：owner 已有统一补材料入口；public paid production launch 继续 blocked。

## 2026-06-13 P32 acceptance artifact intake validator 要把缺材料视为 blocked 状态而不是脚本失败

### 现象

P31 生成模板后，owner 可能暂时还没有提交正式 artifact。missing artifacts are not a script failure。如果 gate 把“缺 artifact”当成失败，会让八小时验收看起来像工程坏了；如果把缺 artifact 当成通过，又会误导生产已经 ready。

### 原因

1. 缺 artifact 是治理状态，不是代码错误。
2. validator 必须能区分 `missing/not_submitted/blocked` 与 `submitted/accepted`。
3. 一旦 artifact 存在，就必须严格校验字段、owner、approval timestamp、verification output path、无 secret、无外部前端批准。

### 修复原则

1. 新增 `docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`，说明接收/拒收规则。
2. 新增 `artifacts/integration/p32-acceptance-artifact-intake-status.json`，列出七个 expected artifact 的当前 missing 状态。
3. 新增 `scripts/check-acceptance-intake.mjs` 和 `check:intake`，缺 artifact 时允许 pass 但必须保持 blocked；提交后执行严格校验。
4. P33 只有两条路：有 artifact 提交则做 completed artifact acceptance runner；仍全缺则做 external owner follow-up log。

### 本轮落地

- 新增 P32 intake doc：`docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`。
- 新增 P32 status：`artifacts/integration/p32-acceptance-artifact-intake-status.json`。
- 新增 P32 gate：`scripts/check-acceptance-intake.mjs`。
- `app/package.json` 增加 `check:intake`。
- P32 结论：当前七个 official acceptance artifacts 均 missing，因此 public paid production launch 继续 blocked。

## 2026-06-13 P33 external owner follow-up log 要记录等待状态而不编造联系人

### 现象

P32 已经说明七个 official artifact 都 missing。下一步需要记录谁仍在等待、下次何时复审、如果超期如何升级。但不能为了让文档看起来完整而编造 owner 联系人、日期或 private message。

### 原因

1. follow-up log 是外部 owner 协调状态，不是生产批准。
2. 等待 owner 时应使用 placeholder，直到产品负责人提供真实联系人。
3. `waiting_on_owner` 必须继续对应 `ledger_impact: blocked`。

### 修复原则

1. 新增 `docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`，记录每个 owner 的 required artifact、follow-up status、next review placeholder、blocked impact。
2. 新增 `artifacts/integration/p33-external-owner-follow-up-ledger.json`，机器可读记录 contact placeholder、next review placeholder、required artifact 和 blocked impact。
3. 新增 `scripts/check-owner-follow-up.mjs` 和 `check:follow-up`，验证 follow-up ledger 引用 P32 intake 和 P31 templates，且所有缺失项保持 `waiting_on_owner` 与 blocked。
4. P34 只有两条路：owner 提交 artifact 则 owner response intake；仍无响应则 blocked launch waiting-state checkpoint。

### 本轮落地

- 新增 P33 follow-up doc：`docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`。
- 新增 P33 follow-up ledger：`artifacts/integration/p33-external-owner-follow-up-ledger.json`。
- 新增 P33 gate：`scripts/check-owner-follow-up.mjs`。
- `app/package.json` 增加 `check:follow-up`。
- P33 结论：所有 owner 仍 waiting_on_owner；public paid production launch 继续 blocked。

## 2026-06-17 P9 quality brake 要变成创作动作，而不是后台术语面板

### 现象

Creator Studio 已经能生成候选正文和写作记忆，但质量刹车仍停留在运行时字段里。作者真正需要的是“这段能不能继续写、哪里需要修、是否会破坏题材承诺”，而不是看到 workflow、provider、raw state 或后端检查细节。

### 原因

1. 质量刹车属于创作过程的一步，必须出现在自然语言对话流里。
2. Mastra 可以负责检查与修订编排，但不能绕过 FastAPI Runtime Facade，也不能直接写 canon。
3. UI 只展示产品语言：段落检查、修订候选、题材一致性、节奏和可继续性。
4. 内部词和写回字段只能留在测试与运行账本，不应进入 Reader 或 Creator 的 public copy。

### 修复原则

1. Agent runtime 新增独立 `qualityBrakeWorkflow`，不再复用创建 workflow 的别名。
2. `qualityBrakeWorkflow` 从当前候选稿恢复上下文，按文档规则重新计算约束问题，返回 `revisedCandidate` 与 `repairPlan`。
3. FastAPI 继续通过 `/v1/tools/runtime/quality-check` 接受 Tool Bridge 调用；所有结果保持 `candidate`，不写 canon/branch。
4. Creator UI 只新增“段落检查 / 检查并修订”动作，不新增后台解释面板。
5. Smoke 必须覆盖 Mastra -> FastAPI Tool Bridge -> quality check -> preview-only writeback。

### 本轮落地

- `packages/agent-runtime/src/toolBridge.ts` 增加 `qualityCheckTool`。
- `packages/agent-runtime/src/workflows.ts` 增加 `qualityBrakeWorkflow`，输出修订候选、修订建议、质量预览与只读写回状态。
- `packages/agent-runtime/src/server.ts` 增加 `POST /v1/workflows/quality-brake`。
- `app/src/api/creator.ts` 增加 `checkAgentDraftQuality` 与 `applyQualityCheck`。
- `CreatorDialogueThread` 增加“段落检查”产品动作，避免展示内部术语。
- `scripts/smoke-creator-chain.mjs` 增加质量检查闭环验证。
- P9 结论：质量刹车已经进入创作者自然语言工作流；作者能检查并获得修订候选，系统仍不写正史。

## 2026-06-17 P10 creator intent routing 要让明确题材覆盖旧模板

### 现象

浏览器 QA 发现：用户在默认玄幻方向下输入“现代悬疑旧案”，系统仍可能沿用当前选中的玄幻模板，导致开场出现问灵台、玉简、师门等错位表达。这个问题不是文案问题，而是创作入口的意图路由优先级不清。

### 原因

1. `inferTemplateIdFromStorySeed` 原先需要较高分数才切换模板，短题材短语容易分数不足。
2. “现代悬疑 / 都市悬疑 / 现实悬疑 / 都市谜案”等明确用户意图没有作为强信号。
3. 当前选中模板仍会进入 agent context；如果前端没有先切换，agent 会优先按旧模板生成。

### 修复原则

1. 明确题材短语优先于旧模板，例如现代悬疑、都市谜案、系统流、历史架空、仙侠权谋。
2. 不把泛词“悬疑”单独作为强信号，避免玄幻悬疑和都市谜案互相误切。
3. 强信号只负责选择创作底盘；后续正文仍由 runtime constraint/kernel 决定。
4. 将路由检查加入 root test，防止回归。

### 本轮落地

- `app/src/features/market/trends.ts` 增加 `explicitCreatorSeedSignals` 与 `inferExplicitTemplateId`。
- `scripts/check-template-intent-routing.mjs` 覆盖现代悬疑、都市谜案、系统流、玄幻悬疑、历史架空五类输入。
- `package.json` 将 `check:template-intent` 纳入 `npm run test`。
- P10 结论：默认玄幻入口下输入现代悬疑旧案会切到都市谜案模板；agent 输出 `雨夜证据`，不再出现问灵台/玉简/师门错位。

## 2026-06-17 P11 creator direction confirmation 要把理解结果反馈给作者

### 现象

P10 修复后，系统已经能根据“现代悬疑旧案”等明确输入切换创作方向。但如果 UI 只是悄悄改变右侧选中态，作者仍可能不知道系统为什么换了方向，也无法判断系统是否真正理解了自己的输入。

### 原因

1. 自然语言创作的核心体验是“我说一句话，系统理解并继续写”，理解结果必须可见。
2. 反馈不能使用路由、模板、kernel、constraint 等内部词。
3. 方向确认应出现在对话主区域，而不是藏在右侧辅助栏。
4. 手动选择方向时不需要保留自动识别提示，否则会让用户误以为刚才的输入仍在驱动当前方向。

### 修复原则

1. 当用户输入触发自动方向切换时，在主对话区域展示“已按你的输入调整创作方向”。
2. 显示从哪个创作方向切到哪个创作方向，以及接下来会关注的故事钩子。
3. 同步更新 `notice`，让继续创作按钮附近也能看到理解结果。
4. 用户手动点击方向标签时清除自动切换提示。

### 本轮落地

- `Create.tsx` 增加 `directionNotice` 状态，自动切换时记录原方向、新方向和故事钩子。
- 创作对话区新增 `creator-direction-confirmation` 可见提示。
- 手动点击右侧方向 pill 时清除自动方向提示。
- P11 结论：系统理解题材意图后会明确告诉作者“已按你的输入切换到某方向”，避免后台静默切换造成不信任。

## 2026-06-17 P12 candidate prose 不能夹带运行时节拍

### 现象

候选正文末尾曾出现“本轮节拍：凡人机缘 -> 拜师入宗 ...”这类规划痕迹。它对工程调试有用，但对作者来说不像小说正文，会重新制造“后端泄漏”和“流水账”的感觉。

### 原因

1. `beatPlan` 应属于 `activeKernels` 结构数据，而不是 `candidateDraft.body`。
2. Creator 的第一眼内容必须是可读正文，不能夹带计划、分隔符或调试标签。
3. 如果只靠 UI 隐藏，后续 Tool Bridge、导出或状态回放仍可能带出脏文本。

### 修复原则

1. 从 `candidateBody` 中移除所有“本轮节拍”段落。
2. 保留 `activeKernels[].beatPlan`，让结构信息继续服务运行时与调试。
3. 将公开正文洁净度纳入 agent 单测和 creator-chain smoke。
4. generic fallback 也避免使用“故事种子”这类创作脚手架词。

### 本轮落地

- `workflows.ts` 移除五类候选正文的节拍尾巴。
- `workflows.test.ts` 增加 `candidate prose does not expose planning scaffolds`。
- `smoke-creator-chain.mjs` 增加公开正文不得包含“本轮节拍”和规划分隔符的断言。
- P12 结论：节拍仍保留在结构化 runtime 数据中，但不会进入作者看到的候选正文。

## 2026-06-17 P32 Tool Bridge 不能只靠幂等键保护

### 现象

P31 后依赖审计已经收口，但继续审计 runtime 边界时发现：Agent Runtime 客户端已经给 FastAPI Tool Bridge 发送 `Authorization: Bearer dev-local-token`，FastAPI 侧却只校验 `Idempotency-Key`。这会让 `/v1/tools/runtime/*` 看起来是内部接口，实际在 API 暴露后仍可能被外部直接调用。

### 原因

1. `Idempotency-Key` 只能防重复写，不能证明调用方是 Agent Runtime。
2. CORS 只能约束浏览器跨域，不约束服务器到服务器的直接 HTTP 请求。
3. Tool Bridge 会返回 runtime artifact、state preview、quality preview 等内部协作结果，不能被当作普通公开 API。
4. 既然 onboarding 合同要求 “Service token + Idempotency-Key”，后端必须在路由层强制执行，而不是只在文档里写。

### 修复原则

1. FastAPI `/v1/tools/runtime/*` 先校验 `Authorization: Bearer <token>`，再校验 `Idempotency-Key`。
2. 本地默认 token 保持 `dev-local-token`，方便 smoke 和本地 compose；远端必须显式配置同一枚 secret。
3. FastAPI 使用 `NARRATIVEOS_TOOL_BRIDGE_TOKEN`，Agent Runtime 使用 `MASTRA_TOOL_BRIDGE_TOKEN`，两者必须相同。
4. token 只属于服务端部署环境，不能进入浏览器、GitHub Pages build variables 或公开 UI。
5. 自动检查脚本同时检查代码、compose 和部署文档，防止“代码修了、部署没配”的断层。

### 本轮落地

- `backend/src/narrativeos/api/tool_bridge.py` 增加 `_require_tool_bridge_auth`，覆盖 socratic-turn、draft、quality-check、state-preview。
- `backend/tests/test_tool_bridge_api.py` 增加无 token、错 token、缺幂等键、正确 token 成功路径测试。
- `deploy/runtime-preview/docker-compose.yml` 同时配置 `NARRATIVEOS_TOOL_BRIDGE_TOKEN` 与 `MASTRA_TOOL_BRIDGE_TOKEN`。
- `docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md` 和 `docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md` 写明服务端共享 secret，不暴露给浏览器。
- `scripts/check-runtime-deploy-readiness.mjs` 与 `scripts/check-runtime-activation-package.mjs` 把 Tool Bridge token 纳入 root test 门禁。
- P32 结论：Tool Bridge 的保护现在是 “service token + idempotency key”；后续任何真实写入都必须沿用这个双门禁。

## 2026-06-17 P33 远端部署不能默认使用本地 Tool Bridge token

### 现象

P32 把 Tool Bridge 改成了 service token + idempotency key，但继续推演远端部署时发现另一个断点：如果 API 和 Agent Runtime 都没有配置 token，它们仍会共同回退到 `dev-local-token`。这对本地 smoke 很方便，但对远端服务是隐性风险。

### 原因

1. Docker production 启动时没有明确环境标识，代码无法判断自己是否应该拒绝本地默认 token。
2. Agent Runtime 和 FastAPI 的默认 token 一致；如果远端忘配 secret，两个服务仍可能“正常工作”。
3. 这种正常工作是最危险的，因为 CI、health check 和 smoke 可能都绿，但实际内部工具口用了公开默认值。
4. 需要把“本地可默认、远端必须显式”变成代码、Docker、compose、文档和检查脚本共同执行的规则。

### 修复原则

1. 增加 `NARRATIVEOS_DEPLOY_ENV`。`production`、`live`、`staging`、`preview`、`remote` 都属于受保护环境。
2. 受保护环境下，缺少 token 或 token 仍是 `dev-local-token` 时，FastAPI Tool Bridge 返回 `tool_bridge_secret_not_configured`。
3. Agent Runtime 在受保护环境下也拒绝自动回退到 `dev-local-token`。
4. Dockerfile 默认 `NARRATIVEOS_DEPLOY_ENV=production`；本地 compose 显式设置 `NARRATIVEOS_DEPLOY_ENV=local`。
5. 远端部署文档必须写明 shared secret 必填，且不能进入浏览器或 GitHub Pages build variables。

### 本轮落地

- `backend/src/narrativeos/api/tool_bridge.py` 增加 protected deploy env 判断。
- `packages/agent-runtime/src/toolBridge.ts` 增加同样的 service token 策略。
- FastAPI 与 Agent Runtime 测试分别覆盖 production 环境拒绝默认 token、接受显式 secret。
- `deploy/api/Dockerfile` 与 `deploy/agent-runtime/Dockerfile` 默认进入 production 保护。
- `deploy/runtime-preview/docker-compose.yml` 显式声明 local，保留本地 `dev-local-token`。
- P14/P20 部署文档与 runtime activation 检查脚本同步更新。
- P33 结论：默认 token 只服务本地开发；远端 runtime 必须显式配置共享 secret 才能接通 Tool Bridge。

## 2026-06-17 P34 生产环境 Tool Bridge 失败必须 fail closed

### 现象

P33 解决了远端默认 token 的问题，但 workflow 仍有一个开发期遗留行为：Tool Bridge 不可用时，Agent Runtime 会返回本地候选正文，并在内部 trace 里标记 warn。这个行为对本地开发有用，但如果进入 live runtime，会让用户以为创作已经被主权后端接受，实际只是 Agent 本地生成。

### 原因

1. 创作者端的公网 live 模式必须证明 Mastra workflow 已经通过 FastAPI Tool Bridge。
2. 本地 fallback 适合开发和 disabled preview，不适合 production/live/staging/remote。
3. 如果 FastAPI 未接受 Tool Bridge 调用，state preview、质量检查和未来持久化都没有可信来源。
4. 产品上“生成了一段候选正文”会被用户理解为服务可用，因此不能用本地候选掩盖后端断线。

### 修复原则

1. 保留本地开发 fallback，避免影响 smoke 和离线开发。
2. 在受保护 deploy env 或显式 `MASTRA_REQUIRE_TOOL_BRIDGE=true` 时，Tool Bridge 失败直接抛错。
3. server 将 workflow 错误转成 500，让前端显示服务未连接，而不是展示伪成功正文。
4. fetch 级别的连接失败也包装成 `ToolBridgeError`，便于测试和定位。

### 本轮落地

- `packages/agent-runtime/src/toolBridge.ts` 增加 `requiresToolBridgeFailClosed` 和 `tool_bridge_unavailable` 错误包装。
- `packages/agent-runtime/src/workflows.ts` 在 socratic-create、state-preview、quality-brake 三个路径的 catch 内按环境决定 fallback 或 throw。
- Agent 单测覆盖 production 环境 FastAPI 不可达时 workflow reject。
- P14/P20 文档和 runtime activation 检查脚本都加入 protected Agent fail-closed 规则。
- P34 结论：本地可以保留兜底；远端 live runtime 必须由 FastAPI Tool Bridge 接受后才算成功。

## 2026-06-17 P35 模型适配必须协议优先，不能残留单厂商默认

### 现象

继续审计多模型适配时发现：后端虽然已经有 `LLMBackend`、routing、cache、budget guard 和多个 provider adapter，但默认策略里仍有两个历史遗留：默认 provider order 会展开到多个具体厂商；`OpenAICompatibleProvider` 默认 model/base URL 指向 DeepSeek；FastAPI 默认 CORS 仍包含旧 Kimi 预览域名。

### 原因

1. “适配任何大模型”的产品要求应以协议和能力为核心，而不是把某个厂商写成默认。
2. 具体厂商可以作为显式 adapter 或示例，但不能成为 runtime 的隐含身份。
3. 旧预览域名进入默认 CORS 会让团队误以为 Kimi 是当前正式链路的一部分。
4. 如果默认配置自带具体厂商，后续用户换成 DeepSeek、OpenRouter、Qwen、本地网关或其他 OpenAI-compatible 服务时，会继续出现“残留感”。

### 修复原则

1. 默认 provider order 只保留 `openai_compatible,local`。
2. OpenAI-compatible provider 必须显式提供 `API_KEY / BASE_URL / MODEL`；不硬编码任何具体厂商的 base URL 或 model。
3. DeepSeek/Kimi/Moonshot 等仍可作为显式 legacy/native adapter 使用，但必须由 env 明确选择。
4. 默认 CORS 只保留本地与 GitHub Pages，不保留旧单厂商预览域名。
5. 用脚本门禁检查 provider-neutral 默认、显式配置要求和无 Kimi CORS 残留。

### 本轮落地

- `backend/src/narrativeos/providers.py` 将默认 provider order 改为 `openai_compatible,local`。
- `OpenAICompatibleProvider` 移除 DeepSeek 默认 model/base URL，缺少 model 或 base URL 时直接报配置错误。
- `backend/src/narrativeos/api/app_factory.py` 移除旧 `ok.kimi.link` 默认 CORS。
- `backend/tests/test_provider_routing.py` 增加协议优先默认和 OpenAI-compatible 显式配置测试。
- `scripts/check-provider-agnostic-config.mjs` 纳入 root test，锁住无单厂商默认。
- `docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md` 改成中性 OpenAI-compatible 示例，具体厂商仅作为显式配置例子。
- P35 结论：平台现在保留多模型适配能力，但核心默认不再绑定 Kimi、DeepSeek 或任何单一供应商。

## 2026-06-17 P36 代表作品隐私门禁补强

### 现象

代表作品名已经进入加密 vault，公开规则只暴露 `rwref_*`，但 CI 里 `scan:reference-privacy` 发生在前端 build 之前。这样源码、历史和已有 dist 可以被扫到，但不能证明本次即将上传到 GitHub Pages 的新 bundle 已经被扫过。

### 修复原则

1. 代表作品隐私扫描必须覆盖源码、规则文档、Git 历史、runtime readiness artifact 和当前 Pages bundle。
2. build 产物必须在 build 后再次扫描，不能用 build 前扫描替代。
3. `reference-work-vault.enc.json`、`reference-work-public-refs.json` 和解密后的 private refs 数量与 ID 必须一致。

### 本轮落地

- `scripts/scan-reference-privacy.mjs` 增加 `artifacts/runtime` 扫描面。
- 扫描器校验 encrypted vault refCount、公有匿名 refCount 和本机解密 refs 长度/ID 一致。
- Pages workflow 在 `npm --prefix app run build` 后新增 `Scan built Pages privacy`。
- `REFERENCE_WORK_PRIVACY.md` 与审计文档同步说明 build 后扫描和 readiness artifact 扫描。

## 2026-06-17 P37 GitHub Actions Node 24 迁移

### 现象

GitHub Actions 每次发布都会出现 Node.js 20 deprecated annotation。虽然部署成功，但持续的黄色提示会稀释真正告警，后续验收时也容易误判 CI 健康度。

### 修复原则

1. 不猜 action 版本，先通过 GitHub API 查 tag 和 `action.yml` metadata。
2. 只升级到确认 `runs.using: node24` 或官方 composite 的 action major。
3. 升级后必须重新跑 Pages workflow，确认 build、build 后隐私扫描、artifact upload 和 deploy 全部通过。

### 本轮落地

- `actions/checkout` 升到 `v6`。
- `actions/setup-node` 升到 `v6`。
- `actions/setup-python` 升到 `v6`。
- `actions/upload-artifact` 升到 `v7`。
- `actions/configure-pages` 升到 `v6`。
- `actions/upload-pages-artifact` 升到 `v5`。
- `actions/deploy-pages` 升到 `v5`。

## 2026-06-17 P38 Public Live Runtime 配置断点收敛

### 现象

GitHub Pages 已经持续成功发布，但公开 Creator 仍处于 `VITE_PUBLIC_RUNTIME_MODE=disabled`。此前 `check:public-live-config` 默认只看当前进程 env，除非显式设置 `CHECK_GITHUB_REPO_VARS=true` 才读取 GitHub repository variables；这会让本地审计输出不够贴近真实 Pages 配置。

### 修复原则

1. Live runtime readiness 的事实源应优先包含 GitHub repository variables，因为 Pages workflow 正是从这些变量取远端 API/Agent URL。
2. 本地检查默认尝试读取 repo vars；只有明确设置 `CHECK_GITHUB_REPO_VARS=false` 才跳过。
3. 输出要说明 repo vars 是否已检查、来源是什么，以及缺失项是配置断点还是代码断点。

### 本轮落地

- `scripts/check-public-live-config.mjs` 默认调用 `gh variable list --repo jzvcpe-goat/parallel-universe-novel`。
- 输出新增 `repoVariableSource`。
- 当前断点仍是外部配置：缺少 `VITE_PUBLIC_RUNTIME_MODE=live`、`VITE_API_ORIGIN`、`VITE_AGENT_RUNTIME_BASE_URL`。

## 2026-06-17 P53 Reader Branch Trace Gate

### 现象

Reader 页面此前已经会在 UI 上展示选择、分支、下一幕和阅读反馈，但运行时矩阵里仍把 Reader branch persistence 记为未证明。真正的问题不是没有选择交互，而是选择是否穿过后端合同并能被 snapshot/worldline 读回。

### 修复原则

1. 读者端不能只改本地 state；选择必须进入后端可审计 ledger。
2. 复用已有 `route_choices` 表和 reader session step，不新增重复分支系统。
3. Public UI 不展示 `runId/ledger/provider/system` 等内部词；内部 trace 只进入 DTO、测试和后台文档。
4. 已证明能力必须写成 `route_choice_ledger_only`，不能夸大成 public branch publish 或完整 WorldInstance writeback。
5. P45 矩阵和检查脚本要同步更新，避免旧断点继续误导后续团队。

### 本轮落地

- `/v1/scene/advance` 接收 `source_run_id`、`worldline_id`、`branch_id`。
- `ProductRuntimeService.advance_scene` 在候选下一幕成功后写入 `route_choices` ledger。
- `/v1/reader/snapshot` 与 `/v1/timeline/worldlines/{id}/loom` 返回 `branch_writeback_summary`。
- `backend/tests/test_product_runtime_api.py` 新增 reader branch trace 持久化测试。
- `scripts/check-reader-branch-trace.mjs` 纳入 root test，防止回退到本地 UI 假状态。
- P45 矩阵更新为：Reader route-choice ledger 已证明；剩余断点是 branch publish、WorldInstance relationship writeback、事务 rollback 和 remote live runtime。

## 2026-06-17 P57 FastAPI TimeEngine Service

### 现象

时间引擎此前在 Agent Runtime 内已经能生成 deterministic Poisson/Hawkes-style candidate events，但 P45/P52 仍正确指出：这还不是 FastAPI runtime 内可读回、可审计、可回滚的后端服务。

### 修复原则

1. 不重新造一套时间系统，复用 `GenreKernel.timeControls` 和 P49 的候选事件算法形态。
2. 后端只写 `time_event_candidate_ledger_only`，不写 canon、不写 branch、不发布读者分支。
3. 同一 worldline、kernel、beat plan 和 source run 必须幂等 replay，方便 Agent Eval、CI 回放和人工排错。
4. `/loom` 可以展示最新 TimeEngine 摘要，但必须继续声明 candidate 边界。
5. 任何实现落地都要同步改合同文档、OpenAPI、检查脚本和 release sync manifest，避免旧 gate 把已完成能力误报为未完成。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/time-engine/candidates` 和 `/v1/timeline/worldlines/{id}/time-engine`。
- `ProductRuntimeService.plan_time_events` 持久化候选事件到 TimeEngine ledger。
- `ProductRuntimeService.worldline` 输出 `time_engine_summary`，存在候选 ledger 时将 density summary 标记为 `fastapi_time_engine`。
- `backend/tests/test_product_runtime_api.py` 覆盖 candidate write、idempotent replay、snapshot 和 `/loom` 汇总。
- `P57_FASTAPI_TIME_ENGINE_SERVICE.md` 写明 service contract 和下一步 Reader branch publish gate。

## 2026-06-17 P58 Reader Branch Publish Candidate Gate

### 现象

P53 已证明读者选择能进入 `route_choice_ledger_only`，P57 已证明 TimeEngine 能写 `time_event_candidate_ledger_only`，但两者之间还没有一个候选发布门禁。继续把这件事留成“public branch publish 未接”会误导后续团队：真正缺的是生产发布和事务回滚，不是候选链路本身。

### 修复原则

1. 不新增第二套分支系统，复用 route-choice ledger、WorldInstance patch candidate 和 TimeEngine candidate ledger。
2. Branch publish candidate 必须要求 `Idempotency-Key`，并只写 `branch_publish_candidate_ledger_only`。
3. 缺 route choice、缺 TimeEngine candidate 或缺幂等键时只返回 blocked，不写任何候选发布账本。
4. `/loom` 可以展示 `branch_publish_summary`，但 public UI 仍不显示生产发布入口。
5. 文档和机器 gate 必须同时更新，否则旧矩阵会继续把候选链路误报为没接。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/publish-candidate` POST/GET。
- `ProductRuntimeService.publish_branch_candidate` 消费 route choice 和 TimeEngine candidate events。
- 成功写入 `branch_publish_candidate_ledger_only`，并带 rollback plan 与 future transaction plan。
- `backend/tests/test_product_runtime_api.py` 覆盖缺幂等键 blocked、成功写入、idempotent replay、snapshot 和 `/loom` 汇总。
- `check:reader-branch-publish` 纳入 root test，防止候选发布链路回退。

## 2026-06-17 P59 Database Transaction Rollback Fixture

### 现象

P58 已经能把读者选择、WorldInstance patch candidate 和 TimeEngine candidate
接成 `branch_publish_candidate_ledger_only`，但 P45/P52 仍然把“数据库事务回滚”
写成未证明。这里不能直接跳到生产发布，否则会把候选账本误当成正式分支提交。

### 修复原则

1. 先证明事务边界，再谈正式分支发布。
2. 不新增生产业务表，不污染 canon/branch/WorldInstance；用现有 `analytics_events`
   做一次事务探针。
3. 探针必须在事务内可见，rollback 后不可见，且由新 session 复查。
4. 接口仍要求 `Idempotency-Key`，并要求已有 P58 branch publish candidate。
5. 文档措辞要区分“P59 单表 rollback fixture 已证明”和“生产多表 branch publish
   commit 未证明”，避免下一轮重复做同一个断点。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/publish-rollback-fixture`。
- Repository 新增 `prove_analytics_event_transaction_rollback`。
- `ProductRuntimeService.verify_branch_publish_transaction_rollback` 返回
  `database_transaction_rollback_fixture` 与 `rollback_fixture_only`。
- `backend/tests/test_product_runtime_api.py` 覆盖缺候选、缺幂等键、候选不匹配和
  成功回滚证明。
- `check:branch-publish-rollback-fixture` 纳入 root test，防止事务证明回退。

## 2026-06-17 P60 Branch Publish Authorization Gate

### 现象

P58/P59 已经能证明候选分支生成和数据库回滚边界，但“谁有权推进候选分支”
仍没有后端合同。如果直接把 P59 后的状态叫做发布，就会再次把候选链路误报为
生产链路。

### 修复原则

1. 发布授权要有独立门禁，不能藏在 branch publish candidate 或 rollback fixture
   里。
2. 授权必须要求 `Idempotency-Key`、`operator_id` 和显式 `confirmed = true`。
3. 授权前必须重跑结构质量门禁和 rollback fixture。
4. 授权结果只写 `branch_publish_authorization_ledger_only`，仍不写 public branch。
5. P45/P52 要继续把剩余断点指向“生产公开发布 + 多表提交”，而不是笼统说
   operator auth 没接。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/publish-authorization` POST/GET。
- `ProductRuntimeService.authorize_branch_publish_candidate` 写入授权候选账本。
- `/loom` 新增 `branch_publish_authorization_summary`。
- `backend/tests/test_product_runtime_api.py` 覆盖缺候选、缺幂等键、缺 operator、
  未确认、成功授权、幂等 replay、snapshot 和 `/loom`。
- `check:branch-publish-authorization` 纳入 root test，防止授权门禁回退。

## 2026-06-17 P61 Branch Commit Draft Gate

### 现象

P60 解决了“谁能授权候选分支继续前进”，但没有证明分支提交草案是否能在多表事务
边界内被回滚。继续只说“多表提交未证明”会过于粗糙；真正下一层应该是先证明
commit draft，而不是直接写生产 branch 表。

### 修复原则

1. P61 仍是草案层，不能写 production branch，也不能公开发布。
2. 必须要求 P60 `branch_publish_authorization_ledger_only`。
3. 必须用同一个 transaction 同时触碰两张现有表，证明多表 rollback 机制。
4. 探针 row 必须 rollback 后不可见，且用新 session 复查。
5. 文档和 gate 要把剩余断点收敛到 production release-owner gate、production
   branch tables 和 remote live runtime trace。

### 本轮落地

- Repository 新增 `prove_branch_commit_multitable_transaction_rollback`。
- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/commit-draft` POST/GET。
- `ProductRuntimeService.draft_branch_commit` 写入 `branch_commit_draft_ledger_only`。
- `/loom` 新增 `branch_commit_draft_summary`。
- `backend/tests/test_product_runtime_api.py` 覆盖缺候选、缺授权、缺幂等键、授权不匹配、
  成功草案、幂等 replay、snapshot 和 `/loom`。
- `check:branch-commit-draft` 纳入 root test，防止草案门禁回退。

## 2026-06-17 P62 Production Branch Commit Gate

### 现象

P61 已经证明 commit draft 能在多表事务边界内回滚，但仍没有真实生产分支表。
继续说“生产分支表未证明”已经不够精确；下一步应该先落私有生产表，再单独证明
公开发布和 Reader 可见性。

### 修复原则

1. P62 可以写真实 `production_branch_commits`，但只能是私有持久化。
2. 所有写入必须要求 `Idempotency-Key`、最新 P61 commit draft、`release_owner_id`
   和 `confirmed = true`。
3. `public_publish_enabled = true` 在 P62 必须被拒绝，避免把持久化误报为公开发布。
4. Repository 要同时写 `production_branch_commits` 与 `analytics_events`，作为生产
   分支提交审计证据。
5. P45/P52 的剩余断点要收敛到“公开发布、Reader 可见性、远端 live runtime、生产
   TimeEngine 拟合”，不能继续笼统写“生产分支表未证明”。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/commit` POST/GET。
- Repository 新增 `persist_production_branch_commit` 与 `latest_production_branch_commit`。
- DB 新增 `production_branch_commits` 模型、Postgres schema 和 `0013` migration。
- `ProductRuntimeService.commit_production_branch` 返回
  `write_scope = production_branch_table_private`。
- `/loom` 新增 `production_branch_commit_summary`。
- `backend/tests/test_product_runtime_api.py` 覆盖缺 draft、缺幂等键、缺 release owner、
  未确认、draft mismatch、禁止公开发布、成功私有持久化、幂等 replay、snapshot 和
  `/loom`。
- `check:production-branch-commit` 纳入 root test，防止私有生产提交门禁回退。

## 2026-06-17 P63 Production Public Publish Gate

### 现象

P62 已经能写真实生产分支表，但仍然不能让读者端看到该分支。如果继续把
`public_publish_enabled` 当成简单布尔值，会缺少发布责任、运营复核和回滚责任。

### 修复原则

1. 公开发布必须是独立表 `public_branch_releases`，不能直接改 P62 私有提交语义。
2. 必须要求最新 P62 `production_branch_table_private`。
3. 必须要求 `release_owner_id`、`ops_reviewer_id`、`rollback_owner_id`、
   `confirmed = true` 和 `public_publish_enabled = true`。
4. 发布成功只证明 Reader 可见，不证明远端 live runtime、付费商业上线或法务自动审批。
5. `/loom` 要暴露 `public_branch_release_summary`，前端只看业务摘要，不看表结构。

### 本轮落地

- FastAPI 新增 `/v1/timeline/worldlines/{id}/branches/public-publish` POST/GET。
- DB 新增 `public_branch_releases` 模型、Postgres schema 和 `0014` migration。
- Repository 新增 `persist_public_branch_release` 与 `latest_public_branch_release`。
- `ProductRuntimeService.publish_public_branch` 返回
  `write_scope = reader_visible_branch_release`。
- `/loom` 新增 `public_branch_release_summary`。
- `backend/tests/test_product_runtime_api.py` 覆盖缺 P62 commit、缺幂等键、owner mismatch、
  缺 ops reviewer、缺 rollback owner、未确认、未开发布开关、成功 Reader 可见发布、
  幂等 replay、snapshot 和 `/loom`。
- `check:public-branch-publish` 纳入 root test，防止 Reader 可见发布门禁回退。

## 2026-06-18 P4 文档核心重新清零

用户要求 P4 从头做，并明确废弃早期按单个题材测试沉淀出的约束逻辑。工程处理不是把旧词换成新词，而是把“案例派生全局约束”这个入口彻底关闭。

本轮原则：

1. `genre-runtime-rules.v1.json` 增加 `documentCore.deprecatedCasePolicy`，声明旧案例约束已清除、案例不能成为运行时规则、激活只能走 `profile_rule_only`。
2. `check:p4-document-core` 与 `scan:p4-rule-source` 都检查这个策略，后续任何全局 premise blacklist 或 hidden selected-genre exception 都应失败。
3. Narrative Runtime Engine 的断点文档改为要求所有题材、时代、地域、职业、叙事视角边界从 active `ConstraintProfile.rules[]` 进入生成前上下文和生成后质量门禁。
4. 允许历史 QA 和研究材料继续作为研究输入，但必须先被人类改写进 `GENRE_CONSTRAINT_RULES.md`、`GENRE_KERNEL_RULES.md` 和 runtime registry，才能成为产品规则。

## 2026-06-18 P64 TimeEngine Telemetry Fit Gate

P63 已经证明 Reader-visible public release，但 TimeEngine 仍只停在候选事件密度。P64 的目标是把“公开发布后的节奏反馈”变成可审计的生产拟合记录，同时不把它伪装成远端模型训练或 paid launch。

本轮原则：

1. 生产拟合必须要求最新 `reader_visible_branch_release` 和最新 `time_event_candidate_ledger_only`。
2. 写入必须有 `Idempotency-Key`、`fit_operator_id` 和 `confirmed = true`。
3. 成功写入 `time_engine_telemetry_fits` 与 `analytics_events`，返回 `write_scope = production_time_engine_fit`。
4. `/loom` 只暴露 `time_engine_fit_summary`，不暴露表结构、provider、raw state 或训练细节。
5. P49/P57 继续保持 candidate-contract scope；生产 telemetry fitting 由 P64 单独证明，下一断点是 remote live runtime trace。

验证记录：

- `test_time_engine_telemetry_fit_requires_public_release_and_operator` 覆盖缺 release、缺幂等键、缺 operator、未确认、release mismatch、run mismatch、成功拟合、幂等 replay、snapshot 和 `/loom`。
- `check:time-engine-telemetry-fit`、`check:time-engine-contract`、`check:product-runtime-coverage`、`check:runtime-engine-completion`、`check:runtime-completion-refresh` 均通过。
- `app` lint/build 与 agent runtime tests 通过。

## 2026-06-18 P65 Remote Live Runtime Trace Gate

P65 不是新增业务接口，而是把远端 live runtime 的证据链收口。以前容易把“本地链路可跑”或“Pages 页面可打开”误当成公开 live runtime 已经完成；这次改成机器门禁，只消费 P23 readiness、P46 activation、P47 trace continuity 三类 artifact。

本轮原则：

1. `check:remote-live-runtime-trace` 只输出 `hold_remote_live_trace_unproven`、`creator_remote_trace_ready_reader_partial` 或 `remote_live_trace_ready`。
2. 缺远端 FastAPI、远端 Agent Runtime 或 GitHub Pages runtime variables 时，门禁必须通过但保持 hold，不允许伪装成上线完成。
3. P65 artifact 只能包含检查 id、状态、源 artifact 文件名和下一步动作，不能出现 candidate 正文、系统提示、私有参考映射、provider secret 或 raw state。
4. 远程 live runtime 的真实上线仍必须由基础设施部署和 GitHub Actions 证据共同证明。

## 2026-06-18 P66 Remote Runtime Origin Provisioning Gate

P66 把 P65 暴露出的远端断点前移成部署前检查。它不绑定云厂商，也不把 GitHub Pages 当成后端；它只证明两个 HTTPS origin 和公开 runtime 变量是否已经可用。

本轮原则：

1. `deploy/runtime-production/origin.env.example` 只能放占位符，真实 Tool Bridge token、数据库 URL 和模型 key 必须留在服务端密钥仓库。
2. GitHub repository variables 只允许放 `VITE_PUBLIC_RUNTIME_MODE`、`VITE_API_ORIGIN`、`VITE_AGENT_RUNTIME_BASE_URL`、可选 `VITE_API_BASE_URL`。
3. `check:remote-origin-provisioning` 在缺远端服务时通过但输出 `remote_origin_unprovisioned`；严格模式由 `REQUIRE_REMOTE_ORIGIN_PROVISIONED=true` 控制。
4. 只有 `ready_for_public_live_runtime` 才能作为打开 P65 remote live trace 的前置证据。

## 2026-06-18 P67 Reference Vault Access Hardening Gate

代表作品隐私不能只靠“当前文件里没有明文”。P67 把加密 vault 和 key 访问方式也纳入工程门禁，防止团队后续把 key、映射表或解密内容误放进公开仓库。

本轮原则：

1. `reference-work-vault.enc.json` 必须保持 AES-256-GCM，只提交密文和加密元信息。
2. `reference-work-public-refs.json` 只能暴露 `id`，不允许 title、author、source label 或任何可逆映射。
3. 本地 key 必须在 `/Users/james/Documents/PUF/private/reference-work-vault.key`，且在公开 repo 外；存在时权限必须禁止 group/other 访问。
4. `.gitignore` 显式忽略 `private/` 和 `reference-work-vault.key`。
5. `check:reference-vault-access` 验证 access contract，`scan:reference-privacy` 验证泄漏面；两者都进入 root test。

## 2026-06-18 P68 Runtime Preview Compose Gate

P68 补上“进程 smoke 能跑”和“部署包真能跑”之间的断点。之前已有 Dockerfile、compose 和远端 origin 门禁，但没有把两个容器实际拉起来验证。

本轮原则：

1. `deploy/runtime-preview/docker-compose.yml` 的容器端口保持 8787/4111，宿主端口用 `RUNTIME_PREVIEW_API_PORT`、`RUNTIME_PREVIEW_AGENT_PORT` 避免本地冲突。
2. `check:runtime-preview-compose` 负责构建并启动 FastAPI 与 Agent Runtime 容器，验证两个 `/health`。
3. 只要 Docker 可用，root `npm run test` 就会跑 compose smoke；这让 GitHub Actions 也验证部署包，而不是只读 Dockerfile。
4. compose smoke 必须让 Agent Runtime 通过 FastAPI Tool Bridge 完成一次候选创作，不能只证明服务端口打开。
5. artifact 只记录健康状态、候选长度、追问数量和 Tool Bridge 是否接受，不记录候选正文、密钥、数据库 URL 或私有参考映射。
6. 本机 Docker daemon 未启动或 container registry 不可达时，普通模式记录 `runtime_preview_compose_not_executed`；严格模式 `REQUIRE_RUNTIME_PREVIEW_COMPOSE=true` 必须失败。

## 2026-06-18 P69 Remote Runtime Host Target Gate

P69 修的是另一个容易被忽略的上线断点：不是“代码能容器化”，而是“团队到底按什么宿主形态部署这两个服务”。如果这个选择不进入工程合同，后续很容易把 FastAPI、Agent Runtime、GitHub Pages 变量和 secret 边界混在一起。

本轮原则：

1. `deploy/runtime-production/host-profiles.json` 是宿主目标的机器可读来源，默认选择 `docker-compatible-two-service-paas`。
2. FastAPI 继续是业务事实主权方，Agent Runtime 只编排 workflow，不能直接访问数据库。
3. Tool Bridge token、数据库 URL、模型 key 只能进入 hosting provider secret store；GitHub Pages 只能拿公开 `VITE_*` origin 变量。
4. P69 只证明部署目标清晰，不证明远程服务已上线；P66 继续负责 origin 与 health，P65 继续负责 public live trace。
5. `check:remote-host-target`、`check:runtime-activation-package`、`check:remote-origin-provisioning` 共同防止上线步骤绕开主权边界。

## 2026-06-18 P70 Remote Runtime Deploy Manifest Gate

P70 承接 P69，不再停留在“选择宿主形态”，而是把默认宿主目标展开成两服务部署 manifest。这样后续无论交给哪种 Docker-compatible PaaS，都能照同一份服务合同部署，而不是临时猜 Dockerfile、端口和变量。

本轮原则：

1. `deploy/runtime-production/service-manifest.json` 记录 API/Agent 的 serviceName、Dockerfile、containerPort、healthPath 和 public origin variable。
2. API 是唯一数据库 owner；Agent 只能通过 `MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>` 调 FastAPI Tool Bridge。
3. `DATABASE_URL`、Tool Bridge token、模型 key、reference vault key 都列入 forbidden public variables。
4. manifest 明确 preflight：P69 host target、runtime deploy readiness、P68 compose；post-provision：P66 origin、readiness ledger、live browser QA。
5. `check:remote-deploy-manifest` 进入 root test，并被 P20/P66/P45/P52 引用，防止部署合同成为旁路文档。

## 2026-06-18 P71 Runtime Image Publish Gate

P71 补的是 P70 和 P66 中间的执行断点：有了部署 manifest，并不代表远端宿主能直接拉到可部署镜像。如果不把镜像发布纳入门禁，后续上线很容易回到手工 build、临时 tag 或不同环境镜像不一致。

本轮原则：

1. `.github/workflows/runtime-images.yml` 只负责构建和发布 FastAPI/Agent Runtime 两个容器镜像到 GHCR。
2. 镜像命名固定为 `ghcr.io/jzvcpe-goat/parallel-universe-novel-api` 和 `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime`，tag 使用 `<commit-sha>` 与 `runtime-latest`。
3. workflow 只能拿 `packages: write`，不能接触数据库 URL、Tool Bridge token、模型 key、reference vault key 或 Pages live variables。
4. `deploy/runtime-production/service-manifest.json` 记录镜像名和 tag 约定，让 Docker-compatible host 可以按同一份合同部署。
5. GHCR push 必须用 `push_with_retry` 抵抗 transient 5xx。镜像层已上传但 manifest/tag push 失败时，下一次重试可以复用已有层。
6. `check:runtime-image-workflow` 进入 root test，并被 P14/P20/P45/P52/P66/P70 引用，防止“部署文档有镜像，实际 CI 不发布镜像”的断层。
7. P71 不等于上线：远端 HTTPS origin、health、Pages live variables 和 public runtime trace 仍由 P66/P65 证明。

## 2026-06-18 P72 Runtime Image Publish Evidence Gate

P72 来自一次真实发布断点：镜像 workflow 已经成功 push，但本地 `gh api` 查询 package versions 被 `read:packages` 权限挡住。这个权限不应该成为普通 operator 验收镜像发布的必要条件。

本轮原则：

1. `check:runtime-image-publish-evidence` 读取 `Publish Runtime Images` 的 GitHub Actions run，而不是 GHCR package versions API。
2. 证据来自 workflow log：当前 commit 的 API/Agent image refs、`runtime-latest` refs 和 digest 行。
3. 默认模式不阻塞 Pages CI，因为 Pages CI 会先于手动镜像发布运行；此时输出 `passed_with_publish_blockers`。
4. 严格模式 `REQUIRE_RUNTIME_IMAGE_PUBLISHED=true` 用于手动触发 P71 后的验收，当前 commit 没有成功镜像发布则失败。
5. P72 仍然不代表远端服务上线；它只证明“远端宿主可以拉到这两张镜像”，P66/P65 继续负责 origin health 和 public runtime trace。

## 2026-06-18 P73 Remote Runtime Origin Execution Gate

P73 修的是“有镜像、有部署 manifest，但远端服务到底有没有被创建”的断点。没有服务 ID、HTTPS origin、provider secret-store evidence 和 health，就不能把 Pages 切到 live。

本轮原则：

1. `deploy/runtime-production/origin-execution-plan.json` 把 API/Agent 服务、镜像、端口、health、operator inputs 和 rollback 命令绑定在一起。
2. `check:remote-origin-execution` 默认输出 `remote_origin_execution_unassigned` 并通过，保证静态 Pages CI 不被未接远端服务阻塞。
3. 严格模式 `REQUIRE_REMOTE_ORIGIN_EXECUTED=true` 只有在 service id、origin、secret confirmation、health 都齐时才通过。
4. `REMOTE_API_SECRETS_CONFIGURED=true` 和 `REMOTE_AGENT_SECRETS_CONFIGURED=true` 只是 operator evidence flag，不允许出现 secret value。
5. P73 仍然不选择 cloud provider，不创建服务，不写数据库，不打开 Pages live；它只把“可以执行远端 origin 的条件”变成机器检查。

## 2026-06-18 P74 Remote Runtime Operator Handoff

P74 来自 P73 之后的真实协作断点：当前机器没有远端 provider CLI 或凭据时，不能假装完成部署，但也不能停在口头说明。必须生成一份不含密钥、可交给部署者执行的 operator pack。

本轮原则：

1. `check:remote-origin-operator-pack` 从 service manifest、origin execution plan 和当前 git HEAD 生成 JSON/Markdown handoff artifact。
2. Handoff artifact 只包含当前 commit 镜像、service assignment inputs、provider secret names、Pages variable commands、verification commands 和 rollback commands。
3. artifact 不允许包含 `DATABASE_URL` 值、Tool Bridge token 值、模型 key、system prompt、raw state 或 reference vault 内容。
4. 默认状态 `operator_pack_waiting_for_service_assignment` 是诚实状态；严格模式 `REQUIRE_REMOTE_OPERATOR_PACK_READY=true` 要求部署者已提供 service ids、HTTPS origins 和 secret-store confirmation。
5. P74 不替代 P73。P74 负责“交接包完整”，P73 负责“远端服务真的 ready”，P65/P23 负责“public live trace ready”。

## 2026-06-18 P75 Remote Runtime Assignment Intake

P75 修的是 P74 之后的协作断点：交接包已经告诉部署者要做什么，但如果没有一个受保护的 actual assignment 文件，部署结果仍然只能靠一次性环境变量或口头转述。

本轮原则：

1. 公开仓库只提交 `deploy/runtime-production/remote-assignment.example.json`，里面全部是占位符和 no-secret 说明。
2. 实际服务分配写入 `deploy/runtime-production/remote-assignment.local.json`，并由 `.gitignore` 忽略。
3. `check:remote-runtime-assignment-intake` 验证 service id、HTTPS origin、image ref、provider secret-store confirmation、Pages variable alignment 和 health。
4. 默认状态 `remote_assignment_missing` 不阻塞静态 CI；严格模式 `REQUIRE_REMOTE_ASSIGNMENT_READY=true` 用于远端部署前验收。
5. assignment 文件可以记录服务 ID 和公开 origin，但不能记录数据库 URL、Tool Bridge token、模型 key、provider API token、system prompt、raw state 或 reference vault 内容。

## 2026-06-18 P76 Live Cutover Attestation

P76 修的是 P75 之后的上线断点：远端服务健康检查能证明服务响应，但不能单独证明“谁把哪个服务、哪个镜像、哪个密钥仓库确认过”这类运营事实。

本轮原则：

1. GitHub Actions 不能读取被 `.gitignore` 保护的 `remote-assignment.local.json`，所以 P76 允许用非密钥 repository variables 做 cutover attestation。
2. 允许进入 CI 的只有 `REMOTE_API_SERVICE_ID`、`REMOTE_AGENT_SERVICE_ID`、`REMOTE_API_SECRETS_CONFIGURED=true`、`REMOTE_AGENT_SECRETS_CONFIGURED=true`。
3. P76 不替代 P23/P66/P73/P75；它只把 assignment、origin execution、origin provisioning 和 live readiness 合成一个最终上线前证据。
4. 默认 disabled 模式输出 `live_cutover_disabled`，不阻塞静态预览；严格模式 `REQUIRE_LIVE_CUTOVER_ATTESTED=true` 只允许 `live_cutover_attested` 通过。
5. 经验：健康检查、浏览器 smoke、服务归属、密钥仓库确认是四个不同证据，不能为了赶上线把它们合并成一句口头状态。

## 2026-06-18 P87 Remote Assignment Handoff

P87 是 P86 发布镜像之后、P75 真实服务分配之前的协作断点。镜像已经存在，但没有服务 ID、HTTPS origin 和 provider secret-store attestation 时，不能把 fixture 或占位符伪装成上线证据。

本轮原则：

1. `check:remote-assignment-handoff` 读取当前 P72 镜像证据，生成 `remote-assignment-handoff` JSON/Markdown artifact。
2. Artifact 只包含当前 API/Agent 镜像、目标 assignment 路径、非密钥模板、必填 operator inputs 和严格验证命令。
3. P87 不写 `remote-assignment.local.json`，不设置 GitHub variables，不创建远端服务，不把 fixture 当 ready。
4. Pages workflow 上传 `remote-assignment-handoff`，current-run artifact gate 强制要求它存在。
5. 经验：handoff artifact 的价值不是“完成部署”，而是把下一位 operator 需要填写的事实压缩成一页，同时保持所有 live gates 继续 blocked。

## 2026-06-18 P88 Current-Head Image Handoff Guard

P88 修的是 P87 暴露出的证据漂移断点：`latest artifact` 不一定等于 `current commit artifact`。如果新代码提交后还没重新发布 runtime images，handoff 不能继续引用上一版镜像。

本轮原则：

1. P87 只有在 P72 `runtime-image-publish-evidence` 的 `headSha` 等于当前 git HEAD 时，才允许输出 `assignment_handoff_ready_for_operator`。
2. 若 P72 证据存在但属于旧 commit，P87 必须输出 `runtime-image-evidence-current-head`，并继续等待重新发布镜像。
3. Handoff artifact 在阻塞状态下仍可生成当前 commit 的预期 image refs，方便 operator 看清下一步，但不能被严格模式放行。
4. 这条约束复用 P72 -> P87 -> P75 的既有顺序，不增加重复部署流程。

## 2026-06-18 P89 Remote Assignment Handoff Artifact Attestation

P89 修的是 P43/P87 之间的证据空洞：P43 只能证明 GitHub Actions 里有
`remote-assignment-handoff` artifact，不能证明里面的 JSON 内容可信。

本轮原则：

1. `check:remote-assignment-handoff-artifact` 本地读取最新 P87 artifact，
   CI 则下载当前 run 的 `remote-assignment-handoff` artifact。
2. 普通 required 模式只要求 artifact 存在、结构正确、public boundary
   没泄漏、image refs 指向当前 head。
3. 严格 ready 模式 `REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_READY=true`
   只在当前 head runtime images 已发布并 rerun Pages 后使用。
4. P89 不创建服务、不写 `remote-assignment.local.json`、不覆盖 P75/P79
   的真实服务分配门禁。
5. 经验：artifact metadata gate 和 artifact content gate 必须分开；否则
   不是误把空壳当证据，就是把正常的“镜像未发布”状态误判成 CI 失败。

## 2026-06-18 P94 Local Artifact Mode Coherence

P94 修的是 P85 本地 blocker ledger 的证据混配断点：`latest artifact`
不等于“同一个 head 的一组证据”。本地目录里可能同时存在旧 P72 镜像证据和
当前 P89 handoff attestation，如果直接按文件时间读取，会把两个不同提交的
事实拼成一个误导性的 release blocker。

本轮原则：

1. `check:remote-runtime-blockers` 优先读取 `headSha` 等于当前 git HEAD
   的 P72 `runtime-image-publish-evidence`。
2. 找不到当前 head 镜像证据时，P85 仍可生成 ledger，但
   `runtime-images-published` 必须 blocked，并带
   `runtime-image-evidence-current-head`。
3. P89 handoff attestation 要优先匹配所选 P72 image evidence 的 head，
   再 fallback 到最新 artifact；这样可以暴露旧镜像阻塞，而不是制造假的
   `handoff-artifact-head-mismatch`。
4. P90 不放松：交给 release owner 的 blocker artifact 仍必须包含当前 head
   的 P72/P89 证据。
5. 经验：本地模式可以用于诊断，但 release 证明必须有“同一 head 证据集”
   这个约束；否则长期 loop 里迟早会被旧 artifact 污染。

## 2026-06-18 P95 Activation Package Coherence Closure

P95 修的是 P94 完成后的交付清单遗漏：P94 已经约束 P85/P90 的本地与
current-run artifact head 一致性，但 `check:runtime-activation-package` 还没把
P94 当作上线包的一部分。

本轮原则：

1. Activation package 必须包含 `docs/backend/P94_LOCAL_ARTIFACT_MODE_COHERENCE.md`。
2. `check:runtime-activation-package` 必须验证 P94 里的
   `runtime-image-evidence-current-head`、`check:remote-runtime-blockers`、
   `check:remote-runtime-blockers-artifact` 和 P90 关系。
3. P20 runbook 的 blocker ledger 验证步骤必须明确 P94 coherence rule。
4. 经验：每次新增 artifact/content gate 后，都要检查 activation package 是否同步；
   否则本地 gate 绿了，交付清单仍可能缺一块。

## 2026-06-18 P92 Public Privacy Artifact Attestation

P92 修的是 P43/P80/Public Projection Privacy Audit 之间的证据空洞：P43
能证明 `reference-privacy` 和 `public-projection-privacy` release artifacts
存在，但不能证明里面的 JSON 真的通过、零违规、且保持 redaction flags。

本轮原则：

1. `check:public-privacy-artifacts` 本地读取最新 privacy artifacts，CI 则下载
   current run 的 `reference-privacy` 与 `public-projection-privacy` artifacts。
2. `reference-privacy` 必须保持 `P80_REFERENCE_PRIVACY_ARTIFACT_GATE`、`status:
   passed`、匿名 `sourceRefs`、零 violation count，并且不输出标题、作者、
   解密映射或 vault key。
3. `public-projection-privacy` 必须保持 `PUBLIC_PROJECTION_PRIVACY_AUDIT`、
   `status: passed`、零 violation count，并且不输出 provider prompt plumbing、
   vault metadata、代表作品映射或 deprecated case logic。
4. Pages workflow 顺序固定为 P43 metadata gate -> P92 privacy artifact content
   gate -> P89/P90 远端交接和 blocker artifact content gates。
5. 经验：privacy 类 release artifact 也必须做 content gate；只校验 artifact
   名字和大小会给公开侧隐私边界留下假绿。

## 2026-06-18 P93 Remote Assignment Artifact Attestation

P93 修的是 P43/P91/P79/P81 之间的证据空洞：GitHub Actions 能上传
`remote-assignment-schema`、`remote-assignment-execution-pack` 和
`remote-assignment-fixture-gate`，但 artifact metadata 不能证明里面的 JSON
和 Markdown 内容可信。

本轮原则：

1. `check:remote-assignment-artifacts` 本地读取最新 assignment artifacts，CI
   则下载 current run 的三类 assignment artifacts。
2. `remote-assignment-schema` 必须保持 P91 gate、指向被 `.gitignore` 保护的
   `remote-assignment.local.json`，并且不包含真实 assignment 内容。
3. `remote-assignment-execution-pack` 必须保持 P79 gate：local 缺 assignment
   时如实 blocked；fixture 严格模式可以 ready，但只能使用 `.invalid` reserved
   origins。
4. `remote-assignment-fixture-gate` 必须保持 P81 gate：fixture 无密钥、P79
   ready、P75 health 仍 pending，不能宣称 live runtime。
5. Pages workflow 顺序固定为 P43 metadata gate -> P92 privacy artifact content
   gate -> P93 assignment artifact content gate -> P89/P90 handoff/blocker
   content gates。
6. 经验：远端 assignment 证据比普通日志更容易被误读成“已经上线”。P93 只验内容
   一致性，不创建远端服务、不写 local assignment、不解除 live runtime blocker。
