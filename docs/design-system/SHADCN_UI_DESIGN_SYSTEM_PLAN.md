# 平行宇宙小说 shadcn/ui 设计系统落地方案

Last updated: 2026-06-12

## 结论

这套产品适合用 shadcn/ui 做工程底座，但不应该把 shadcn 当成一套通用皮肤直接套上去。正确路径是：

```text
shadcn-compatible primitives
-> 平行宇宙小说 tokens
-> 小说业务 patterns
-> 统一 page layouts
-> 内部 registry
```

当前项目已经具备 Radix、CVA、Tailwind、`cn()`、`components.json` 等基础。落地重点是建立边界和资产，而不是重装项目。

## 已落地文件

```text
app/components.json
app/src/styles/parallel-universe-tokens.css
app/src/components/ui/button-variants.ts
app/src/components/ui/button.tsx
app/src/components/ui/badge-variants.ts
app/src/components/ui/badge.tsx
app/src/components/ui/card-variants.ts
app/src/components/ui/card.tsx
app/src/components/ui/input.tsx
app/src/components/ui/textarea.tsx
app/src/components/ui/label-variants.ts
app/src/components/ui/label.tsx
app/src/components/ui/dialog.tsx
app/src/components/design-system/ParallelUniverseShell.tsx
app/src/components/design-system/Panel.tsx
app/src/components/design-system/PageHeader.tsx
app/src/components/design-system/BookCard.tsx
app/src/components/design-system/ReadingPaper.tsx
app/src/components/design-system/ChoiceCard.tsx
app/src/components/design-system/CreatorConversationPanel.tsx
app/src/components/design-system/CreatorDialogueThread.tsx
app/src/components/design-system/CreatorReasoningMap.tsx
app/src/components/design-system/CreatorStoryNotes.tsx
app/src/components/design-system/StudioTrendOpsPanel.tsx
app/src/components/design-system/CapabilityMapPanel.tsx
app/src/components/design-system/SettingCard.tsx
app/src/components/design-system/PlanCard.tsx
app/src/design-system/variants.ts
app/src/design-system/registry.ts
app/src/design-system/page-contracts.ts
app/public/parallel-assets/brand/parallel-universe-mark.svg
scripts/check-reader-creator-copy-boundary.mjs
scripts/check-design-system-boundary.mjs
```

Compatibility re-exports preserve the current app imports:

```text
app/src/components/primitives/Button.ts
app/src/components/primitives/Badge.ts
app/src/components/primitives/Card.ts
```

The CVA variant definitions intentionally live in `.ts` files so React Fast Refresh component files only export components and types.

## P0 Product Contract

Reader-facing product pages share the same public shell:

```text
发现
阅读
书城
创作
会员
```

Use `ParallelUniverseShell` for new reader-facing pages and during migration. Do not create another navigation structure for discovery, reader, library, or creator surfaces.

Studio is a direct/backstage surface for creators and operators. The current `/settings` route is productized as the public `会员` entry because subscription and checkout-start contracts are live. Payment provider details and operator settings still stay out of the ordinary user rail.

Frontend source of truth: the current Vite + React + TypeScript app is the product frontend. External frontends, including backend-team Next.js screens, are reference material only. Before any external frontend UI is merged, a subagent approval review must decide whether to import, adapt, or reject it. Approved imports should prefer extracting contracts, copy, or small patterns into the current shadcn-compatible design system instead of merging whole pages or framework structure. Avoid duplicate development: do not rebuild an existing product entry, page structure, navigation model, or interaction pattern in a second frontend. New packages should contribute missing API contracts, domain models, backend capabilities, tests, deployment scripts, or small reusable business logic.

## Token Rules

Use tokens instead of hard-coded colors for new code:

```text
--pu-void-950       page background
--pu-panel-900      dark panels
--pu-line-700       borders
--pu-ink-100        primary text
--pu-ink-500        secondary text
--pu-gold-500       primary commercial CTA
--pu-cyan-500       secondary action / worldline signal
--pu-paper          reading paper
--pu-paper-ink      reader text
```

The legacy variables such as `--manuscript-gold` and `--worldline-cyan` can remain while pages migrate. New components should prefer `--pu-*`.

## Primitive Rules

The shadcn-compatible layer lives in `src/components/ui`.

Do:

- Keep primitive variants small and semantic.
- Use `gold` for primary commercial actions.
- Use `generation` for creation/generation actions.
- Use `stasis`, `flux`, `collapse` badges for stable / pending / risk states.
- Keep radius at 8px unless the component is the manuscript paper.

Do not:

- Add page-specific variants to primitives.
- Put book names, route names, or backend states into primitive variants.
- Reintroduce large rounded cards or nested card shells.

## Pattern Rules

Use domain patterns for product meaning:

```text
BookCard             discovery/library/template cards
ReadingPaper         reader center manuscript surface
ChoiceCard           reader decision choices
CreatorConversationPanel  natural-language creator entry with prompt, textarea, action and examples
CreatorDialogueThread     submitted creator flow with seed, opening draft, follow-up questions and composer
CreatorStoryNotes         author-facing story notes for character, scene, rule, conflict and hook context
StudioTrendOpsPanel       backstage trend refresh and scan-contract panel for Studio only
CapabilityMapPanel        backstage frontend/service capability map for Studio only
SettingCard          character/scene/rule/conflict/outline cards
PlanCard             payment plans
Panel                dark product panels
PageHeader           page-level title and actions
```

Every route must map to `app/src/design-system/page-contracts.ts` before UI work:

```text
/          discover  -> BookCard + Panel
/library   library   -> PageHeader + BookCard + Panel
/story     reader    -> ReadingPaper + ChoiceCard + Panel
/create    creator   -> PageHeader + Panel + CreatorConversationPanel + CreatorDialogueThread + CreatorStoryNotes
/studio    studio    -> PageHeader + Panel + StudioTrendOpsPanel + CapabilityMapPanel + SettingCard
/settings  settings  -> PageHeader + Panel
/billing   billing   -> PageHeader + PlanCard
```

This is the important maintenance rule: page files should compose these patterns instead of inventing new local card styles.

These patterns map directly to the image2 screen map:

```text
design/concept/parallel-universe-unified-image2-screen-map.png
```

## Copy Boundary

Reader and creator surfaces must not show engineering vocabulary:

```text
API
OpenAPI
PRD
fallback
demo
provider
database
endpoint
后台
后端
接口
时间织机
system prompt
System Prompt
系统从正文提取
底盘预设
绑定
```

Allowed product language:

```text
需要你确认
方向参考
我已记住
你刚告诉我
已确认
创作引导
故事笔记
质量评分
发布门禁
正史
分支
```

Studio may show source policy, prompt version, quality details, and release state. Reader and creator pages should stay story/product-facing.

Creator page rule: the main path is natural-language conversation. Prompt source, model source, extraction details, frozen templates, and other implementation language belong in Studio or handoff docs, not in the author-facing creation flow.

Studio ops rule: trend refresh, function-call metadata, service mapping and publish checks must use Studio-specific patterns such as `StudioTrendOpsPanel` and `CapabilityMapPanel`. Do not rebuild those cards inside page files.

Automated guard:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run check:copy-boundary
npm run check:design-system
```

## Migration Order

1. Keep existing pages working through primitive re-exports.
2. Migrate new settings and billing pages through `ParallelUniverseShell`, `PageHeader`, and `PlanCard`.
3. Replace page-local book card markup with `BookCard`.
4. Replace reader center article with `ReadingPaper`.
5. Replace choice markup with `ChoiceCard`.
6. Replace creator setting card markup with `SettingCard`.
7. Replace creator empty-state markup with `CreatorConversationPanel`.
8. Replace submitted creator flow markup with `CreatorDialogueThread` and story side notes with `CreatorStoryNotes`.
9. Replace page-local dark shells with `Panel` and `PageHeader`.
10. Replace Studio trend-refresh and capability-map markup with `StudioTrendOpsPanel` and `CapabilityMapPanel`.
11. Replace repeated topic/filter and ranked-list markup with `TopicFilterBar` and `RankedWorldList`.
12. Convert `AuthModal` to `Dialog` to gain Radix focus trap and keyboard behavior.
13. Reduce hard-coded `bg-[#...]` / `text-[#...]` values gradually.

## Validation

Run before claiming a design-system migration is safe:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run lint -- --max-warnings=0
npm run check:copy-boundary
npm run check:design-system
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm audit --audit-level=moderate

cd /Users/james/Documents/PUF/workspaces/integration-harness
npm --prefix app run check:alignment
./scripts/verify-parallel-universe-prototype.sh
```

Current verified status on 2026-06-12:

```text
npm run lint -- --max-warnings=0       PASS
npm run check:copy-boundary            PASS
npm run check:design-system            PASS
npx tsc --noEmit -p tsconfig.app.json  PASS
npm run build                          PASS
npm audit --audit-level=moderate       PASS, 0 vulnerabilities
npm run check:alignment                PASS, 28 frontend API calls / 114 OpenAPI paths / 6 routes
```

Manual visual QA:

```text
/                         1440x900 and 390x844
/library                  1440x900 and 390x844
/story?world=beacon-beyond 1440x900 and 390x844
/create                   1440x900 and 390x844
/studio                   1440x900 and 390x844
```

Watch for:

- text overflow
- mobile bottom navigation overlap
- focus ring visibility
- dialog keyboard behavior
- reader paper width
- copy boundary violations

## Registry Direction

The code registry is currently local:

```text
app/src/design-system/registry.ts
```

When stable, convert it into a shadcn registry package so downstream prototypes can install:

```bash
npx shadcn@latest add <registry>/parallel-universe-shell.json
npx shadcn@latest add <registry>/reading-paper.json
npx shadcn@latest add <registry>/book-card.json
```
