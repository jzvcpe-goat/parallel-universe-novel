# Genre Kernel Rules

Purpose: this file is the human-editable source for GenreKernel rules.

Current runtime source:

- Frontend implementation: `app/src/features/parallel-universe/data.ts`
- Frontend type contract: `app/src/features/parallel-universe/types.ts`
- Runtime object: `GenreKernel`

## Editing Contract

Use this file to manually revise:

- genre kernel identity and category
- thesis
- pacing model
- event structure
- character motive rules
- conflict rules
- climax and payoff rules
- time engine controls
- visible quality metrics

After manual edits, product / engineering should sync:

- `app/src/features/parallel-universe/data.ts`
- backend world-template / creator-template seed data when backend becomes source of truth
- future memo-distilled kernel config store
- tests or contract checks that validate kernel IDs used by `WorldTemplate.kernelId`

## Type Contract

```ts
interface GenreKernel {
  id: string
  name: string
  category: string
  thesis: string
  pacingModel: string
  eventStructure: string
  motiveRules: string[]
  conflictRules: string[]
  climaxRules: string[]
  timeControls: {
    baseRate: number
    burst: number
    decay: number
    foreshadowPressure: number
  }
  metrics: Array<{
    label: string
    value: number
    tone: 'gold' | 'cyan' | 'teal' | 'rose'
  }>
}
```

## Time Controls

These values are currently product-facing prototype parameters, not final simulation constants.

| Field | Meaning | Editing Guidance |
|---|---|---|
| `baseRate` | normal event density | Higher means more frequent plot events during calm sections. |
| `burst` | burst density after trigger events | Higher means major events cause stronger chain reactions. |
| `decay` | aftermath decay speed | Higher means burst pressure settles faster. |
| `foreshadowPressure` | pressure from unresolved hooks | Higher means unresolved foreshadowing matures into events sooner. |

## Current Kernels

### `kernel-cosmic-xuanhuan`

Name: 玄幻命运核

Category: 玄幻 / 仙侠

Thesis:

力量增长必须伴随愿力、债务和代价，否则世界会崩成纯升级表。

Pacing model:

序章低密度，试炼和天劫进入爆发，余波必须回收人物债。

Event structure:

誓愿 -> 诱惑 -> 债务交换 -> 误认 -> 命运试炼 -> 代价落地

Motive rules:

- 主角困境先于能力展示
- 反派必须有可理解的修行逻辑
- 每次破境都写入关系债

Conflict rules:

- 外部战斗必须触发内部取舍
- 宗门规则不能只做背景板
- 奇遇需要留下可追责的因果

Climax rules:

- 高潮前至少回收一个早期伏笔
- 胜利要带来新限制
- 余波要改变一段关系

Time controls:

```json
{
  "baseRate": 0.36,
  "burst": 0.82,
  "decay": 0.42,
  "foreshadowPressure": 0.76
}
```

Metrics:

- 节奏弹性: 86, tone `gold`
- 命运压力: 78, tone `cyan`
- 伏笔回收: 73, tone `teal`

### `kernel-urban-suspense`

Name: 都市悬疑核

Category: 都市 / 悬疑

Thesis:

证据链、人物动机和时间线互相校验，选择不是换文本，而是换真相成本。

Pacing model:

日常低压铺设线索，关键证据引发短时连锁，随后进入审问和反证余波。

Event structure:

异常物 -> 证词偏差 -> 误导线索 -> 代价选择 -> 公开或隐藏

Motive rules:

- 每个人都要保护某个秘密
- 主角不能免费得到真相
- 亲密关系也是证据来源

Conflict rules:

- 线索必须改变行动
- 反转要能回看成立
- 每个选择都留下证据损耗

Climax rules:

- 高潮揭示一个事实和一个误解
- 证据公开会制造新敌人
- 沉默会让旧案继续扩散

Time controls:

```json
{
  "baseRate": 0.42,
  "burst": 0.74,
  "decay": 0.5,
  "foreshadowPressure": 0.68
}
```

Metrics:

- 证据一致: 84, tone `cyan`
- 人物可信: 81, tone `gold`
- 阅读自然度: 77, tone `teal`

### `kernel-romance-choice`

Name: 情感选择核

Category: 言情 / 成长

Thesis:

情感推进来自具体行动和误会修正，不来自空泛告白。

Pacing model:

亲密感缓慢累积，误会触发爆发，余波用日常行动修复或撕裂。

Event structure:

靠近 -> 误读 -> 保护/伤害 -> 选择公开 -> 关系重排

Motive rules:

- 角色表达爱意的方式必须不同
- 误会要来自真实价值冲突
- 修复需要付行动成本

Conflict rules:

- 选择必须影响第三方关系
- 甜点和伤点交替出现
- 沉默也是选择

Climax rules:

- 高潮必须逼迫角色说出真实需求
- HE / BE 都要付出代价
- 余波落到生活细节

Time controls:

```json
{
  "baseRate": 0.3,
  "burst": 0.58,
  "decay": 0.64,
  "foreshadowPressure": 0.54
}
```

Metrics:

- 情绪递进: 88, tone `rose`
- 行动表达: 80, tone `gold`
- 关系张力: 75, tone `cyan`

### `kernel-history-frontier`

Name: 历史权谋核

Category: 历史 / 权谋

Thesis:

历史选择必须让忠诚、民命和合法性互相冲突，胜利不能只靠主角正确。

Pacing model:

围城低压建立秩序，密诏版本触发信任爆发，余波落到军民命运。

Event structure:

边城压力 -> 诏书矛盾 -> 旧臣分裂 -> 民命抉择 -> 历史定稿

Motive rules:

- 忠臣也要有立场盲区
- 敌将不能只是压迫者
- 每个版本的真相都要服务某种生存逻辑

Conflict rules:

- 公开真相会破坏秩序
- 保全性命会背负骂名
- 死守必须写清军民成本

Climax rules:

- 高潮必须让百姓成为选择主体
- 结局要改变史书叙述
- 牺牲不能替代政治后果

Time controls:

```json
{
  "baseRate": 0.34,
  "burst": 0.7,
  "decay": 0.56,
  "foreshadowPressure": 0.72
}
```

Metrics:

- 立场张力: 87, tone `gold`
- 历史可信: 83, tone `cyan`
- 牺牲代价: 79, tone `rose`

### `kernel-scifi-memory`

Name: 科幻身份核

Category: 科幻 / 记忆

Thesis:

身份悬疑要把记忆、证据和选择拆开，让“我是谁”最终落到行动上。

Pacing model:

异常记忆先制造追捕，云端真相引发爆发，结尾把选择权还给个体。

Event structure:

记忆错位 -> 清除追捕 -> 云端探索 -> 自我对峙 -> 选择协议

Motive rules:

- AI 角色必须有约束而非万能
- 反抗者要像主角的另一种答案
- 痛苦记忆不能被写成廉价负担

Conflict rules:

- 每次取证都提高身份风险
- 算法秩序必须有真实好处
- 自由选择要付城市级成本

Climax rules:

- 高潮同时解决身份与城市规则
- 胜利必须保留代价
- 开放结局要能扩展系列

Time controls:

```json
{
  "baseRate": 0.44,
  "burst": 0.78,
  "decay": 0.48,
  "foreshadowPressure": 0.66
}
```

Metrics:

- 身份悬疑: 88, tone `cyan`
- 科幻规则: 82, tone `teal`
- 存在张力: 80, tone `gold`

## Manual Kernel Template

Copy this section when adding a new kernel.

### `<kernel-id>`

Name:

Category:

Thesis:

Pacing model:

Event structure:

Motive rules:

- 

Conflict rules:

- 

Climax rules:

- 

Time controls:

```json
{
  "baseRate": 0,
  "burst": 0,
  "decay": 0,
  "foreshadowPressure": 0
}
```

Metrics:

- `<metric label>`: `<0-100>`, tone `<gold|cyan|teal|rose>`

