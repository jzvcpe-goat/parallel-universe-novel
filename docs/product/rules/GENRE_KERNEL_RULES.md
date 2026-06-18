# Genre Kernel Rules

Purpose: this file is the human-editable source for `GenreKernel` rules used by the Mastra runtime.

Current runtime source:

- `packages/agent-runtime/src/constraints.ts`
- `packages/agent-runtime/src/types.ts`

Representative works are private research inputs. Public kernel docs and runtime payloads must use anonymous `sourceRefs` only. See `REFERENCE_WORK_PRIVACY.md`.

## Kernel Object Schema

```ts
interface GenreKernel {
  id: string
  name: string
  category: string
  compatibleProfiles: string[]
  sourceRefs?: string[]
  thesis: string
  antiThesis: string
  pacingModel: string
  eventStructure: string[]
  motiveRules: string[]
  conflictRules: string[]
  climaxRules: string[]
  timeControls: {
    baseRate: number
    burst: number
    decay: number
    foreshadowPressure: number
    maxOpenLoops?: number
  }
}
```

## Active Kernels

Runtime source `genre-runtime-rules.v1.json` is currently version 2 and contains one kernel for each active ConstraintProfile. Kernel selection follows the sorted active profile order:

1. Explicit selected genre/template profile.
2. Secondary profiles inferred from the seed.
3. Compatible kernels sorted by profile order.

Kernel application is `compatible_profile_only`: a kernel cannot activate from
an isolated browser note, prompt experiment, or one-off negative example. If a
new premise changes pacing, event structure, motive pressure, conflict
pressure, climax recovery, or time controls, update the human-editable
ConstraintProfile and GenreKernel docs first, then sync the runtime registry.

The active kernel IDs are:

- `kernel-xuanhuan-xianxia`
- `kernel-modern-other`
- `kernel-modern-supernatural`
- `kernel-game-litrpg`
- `kernel-system-litrpg`
- `kernel-comedy-misfit`
- `kernel-quick-transmigration`
- `kernel-horror-infinite`
- `kernel-apocalypse`
- `kernel-wuxia-historical`
- `kernel-alchemy-craft`
- `kernel-sci-fi-space`
- `kernel-transmigration`
- `kernel-male-farming-base`
- `kernel-farming-domestic`
- `kernel-family-clan-group`
- `kernel-sweet-pet-marriage`
- `kernel-danmei-romance`
- `kernel-chase-wife-crematorium`
- `kernel-female-rebirth-revenge`
- `kernel-era-female`

Complete registry sync table:

| Kernel | Category | Source refs | Compatible profile | Pacing model |
| --- | --- | --- | --- | --- |
| `kernel-xuanhuan-xianxia` / 仙侠玄幻内核 | xuanhuan | `rwref_0013`, `rwref_0030` | `xuanhuan-xianxia` | 凡人机缘 -> 拜师入宗 -> 筑基突破 -> 夺宝立仇 -> 天劫考验 |
| `kernel-modern-other` / 其他现代内核 | modern | `rwref_0004`, `rwref_0016` | `modern-other` | 现实异常 -> 证据矛盾 -> 关系暴露 -> 风险取证 -> 真相代价 |
| `kernel-modern-supernatural` / 现代都市超能内核 | modern_supernatural | `rwref_0009`, `rwref_0011`, `rwref_0012` | `modern-supernatural` | 日常异常 -> 能力觉醒 -> 身份伪装 -> 机构介入 -> 公开代价 |
| `kernel-game-litrpg` / 游戏异界内核 | game | `rwref_0034`, `rwref_0041` | `game-litrpg` | 登录建角 -> 任务目标 -> 队伍协作 -> 奖惩反馈 -> 公会压力 |
| `kernel-system-litrpg` / 系统流内核 | system | `rwref_0005`, `rwref_0017` | `system-litrpg` | 绑定系统 -> 任务诱因 -> 成本暴露 -> 选择执行 -> 奖惩结算 |
| `kernel-comedy-misfit` / 喜剧反套路内核 | comedy | `rwref_0008`, `rwref_0010`, `rwref_0014`, `rwref_0019` | `comedy-misfit` | 误会出现 -> 反差行动 -> 掉马边缘 -> 群像误读 -> 关系推进 |
| `kernel-quick-transmigration` / 快穿逆袭内核 | quick_transmigration | none yet | `quick-transmigration` | 接收任务 -> 身份落点 -> 目标反转 -> 代价执行 -> 结算离场 |
| `kernel-horror-infinite` / 恐怖无限流内核 | horror_infinite | `rwref_0021`, `rwref_0025`, `rwref_0027` | `horror-infinite` | 规则入场 -> 小错试探 -> 队友裂痕 -> 核心禁忌 -> 逃生代价 |
| `kernel-apocalypse` / 末世内核 | apocalypse | `rwref_0020`, `rwref_0040` | `apocalypse` | 灾变爆发 -> 资源抢夺 -> 小队成形 -> 基地秩序 -> 人性清算 |
| `kernel-wuxia-historical` / 武侠历史内核 | wuxia | `rwref_0001`, `rwref_0002` | `wuxia-historical` | 江湖入局 -> 门派牵制 -> 朝堂阴影 -> 侠义两难 -> 名声代价 |
| `kernel-alchemy-craft` / 炼丹炼器内核 | alchemy | `rwref_0008`, `rwref_0018`, `rwref_0032`, `rwref_0038` | `alchemy-craft` | 需求出现 -> 灵材搜集 -> 工艺试错 -> 失败反噬 -> 成品代价 |
| `kernel-sci-fi-space` / 科幻文明内核 | sci_fi | `rwref_0007`, `rwref_0015`, `rwref_0039` | `sci-fi-space` | 异常信号 -> 技术验证 -> 伦理争议 -> 文明风险 -> 选择后果 |
| `kernel-transmigration` / 穿越重生内核 | transmigration | `rwref_0022`, `rwref_0023` | `transmigration` | 醒来错位 -> 身份试探 -> 信息差兑现 -> 蝴蝶效应 -> 新命运选择 |
| `kernel-male-farming-base` / 男频基建流内核 | male_farming | `rwref_0004`, `rwref_0024` | `male-farming-base` | 荒地接手 -> 资源盘点 -> 技术试制 -> 人口组织 -> 外敌考验 |
| `kernel-farming-domestic` / 种田致富内核 | farming | `rwref_0031`, `rwref_0033` | `farming-domestic` | 家庭困境 -> 手艺试水 -> 邻里反馈 -> 小赚积累 -> 关系修复 |
| `kernel-family-clan-group` / 群像家族内核 | family_clan | `rwref_0028`, `rwref_0029`, `rwref_0035`, `rwref_0042` | `family-clan-group` | 家族危机 -> 分支立场 -> 利益碰撞 -> 代际选择 -> 家业重排 |
| `kernel-sweet-pet-marriage` / 甜宠先婚后爱内核 | romance | `rwref_0003`, `rwref_0006`, `rwref_0036`, `rwref_0043` | `sweet-pet-marriage` | 契约同居 -> 边界磨合 -> 小事照顾 -> 误会修复 -> 双向承认 |
| `kernel-danmei-romance` / 耽美内核 | danmei | `rwref_0026`, `rwref_0044` | `danmei-romance` | 立场相遇 -> 信息互探 -> 克制保护 -> 旧伤暴露 -> 双向选择 |
| `kernel-chase-wife-crematorium` / 追妻火葬场内核 | crematorium | `rwref_0037`, `rwref_0045` | `chase-wife-crematorium` | 伤害揭露 -> 离场自救 -> 追悔补偿 -> 边界重建 -> 重新选择 |
| `kernel-female-rebirth-revenge` / 女频重生复仇内核 | rebirth_revenge | none yet | `female-rebirth-revenge` | 惨死回起点 -> 身份稳固 -> 信息差布局 -> 家族博弈 -> 仇敌清算 |
| `kernel-era-female` / 年代女强内核 | era_realism | none yet | `era-female` | 时代落点 -> 家庭困局 -> 政策窗口 -> 创业试水 -> 事业扩张 |

One-off intake notes are not kernel rules. Future special constraints must be added as document-derived profiles or user-selected doctrine flags.

## P4 Kernel Boundary

`GenreKernel` is selected only through active `ConstraintProfile.compatibleProfiles`
relationships in `genre-runtime-rules.v1.json`. It must not infer hidden
exceptions from a one-off intake note. If a new premise
changes pacing, event structure, motive pressure, conflict pressure, climax
recovery, or time controls, the team must first update the document registry and
then let the resolver select the matching kernel through the normal profile
activation flow.

Kernel logic may transform profile rules into a BeatPlan, but it may not rewrite
the registry from inside the workflow and may not branch on hardcoded profile or
kernel IDs.

### `kernel-xuanhuan-xianxia`

Name: 仙侠玄幻

Compatible profile: `xuanhuan-xianxia`

Source refs: `rwref_0013`, `rwref_0027`, `rwref_0038`

Thesis:

成长不是免费升级，而是资源、身体、因果和关系债共同塑造的修行压力。

Pacing model:

传承触发 -> 资源稀缺 -> 代价突破 -> 关系债显形 -> 天劫或追责

### `kernel-modern-other`

Name: 现代悬疑

Compatible profile: `modern-other`

Source refs: `rwref_0004`, `rwref_0016`

Thesis:

证据链不是答案，而是逼迫人物承担真相成本的压力系统。

Pacing model:

现实异常 -> 证据矛盾 -> 心理侧写 -> 风险暴露 -> 真相代价

### `kernel-game-litrpg`

Name: 游戏异界

Compatible profile: `game-litrpg`

Source refs: `rwref_0023`, `rwref_0024`, `rwref_0044`

Thesis:

成长由任务、职业分工、装备反馈和团队策略共同驱动。

Pacing model:

登录/建角 -> 任务目标 -> 队伍协作 -> 奖惩反馈 -> 排名或公会压力

### `kernel-comedy-misfit`

Name: 喜剧反套路

Compatible profile: `comedy-misfit`

Source refs: `rwref_0008`, `rwref_0010`, `rwref_0014`, `rwref_0019`, `rwref_0042`

Thesis:

笑点来自误会、身份反差和行动错位，但每个笑点仍要推动关系或局势变化。

Pacing model:

误会出现 -> 反差行动 -> 掉马边缘 -> 群像误读 -> 关系推进

## Editing Contract

1. Do not paste representative work titles into this file.
2. Update `sourceRefs` only with IDs from `reference-work-public-refs.json`.
3. Sync runtime edits to `packages/agent-runtime/src/constraints.ts`.
4. Run `npm run scan:reference-privacy` and `npm run test`.
