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

Registry sync table:

| Kernel ID | Name | Compatible profile |
| --- | --- | --- |
| `kernel-xuanhuan-xianxia` | 仙侠玄幻内核 | `xuanhuan-xianxia` |
| `kernel-modern-other` | 其他现代内核 | `modern-other` |
| `kernel-modern-supernatural` | 现代都市超能内核 | `modern-supernatural` |
| `kernel-game-litrpg` | 游戏异界内核 | `game-litrpg` |
| `kernel-system-litrpg` | 系统流内核 | `system-litrpg` |
| `kernel-comedy-misfit` | 喜剧反套路内核 | `comedy-misfit` |
| `kernel-quick-transmigration` | 快穿逆袭内核 | `quick-transmigration` |
| `kernel-horror-infinite` | 恐怖无限流内核 | `horror-infinite` |
| `kernel-apocalypse` | 末世内核 | `apocalypse` |
| `kernel-wuxia-historical` | 武侠历史内核 | `wuxia-historical` |
| `kernel-alchemy-craft` | 炼丹炼器内核 | `alchemy-craft` |
| `kernel-sci-fi-space` | 科幻文明内核 | `sci-fi-space` |
| `kernel-transmigration` | 穿越重生内核 | `transmigration` |
| `kernel-male-farming-base` | 男频基建流内核 | `male-farming-base` |
| `kernel-farming-domestic` | 种田致富内核 | `farming-domestic` |
| `kernel-family-clan-group` | 群像家族内核 | `family-clan-group` |
| `kernel-sweet-pet-marriage` | 甜宠先婚后爱内核 | `sweet-pet-marriage` |
| `kernel-danmei-romance` | 耽美内核 | `danmei-romance` |
| `kernel-chase-wife-crematorium` | 追妻火葬场内核 | `chase-wife-crematorium` |
| `kernel-female-rebirth-revenge` | 女频重生复仇内核 | `female-rebirth-revenge` |
| `kernel-era-female` | 年代女强内核 | `era-female` |

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
