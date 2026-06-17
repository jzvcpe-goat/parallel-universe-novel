# 平行宇宙小说 shadcn/ui 设计系统 v1 QA

Date: 2026-06-12

## Scope

本轮验证覆盖设计系统 v1 的工程迁移结果：

- tokens -> shadcn-compatible primitives -> 小说业务组件 -> page contracts -> copy boundary
- `/`、`/library`、`/story`、`/create`、`/studio` 核心页面开始消费统一设计系统
- `/story` 已迁移到 `ReadingPaper + ChoiceCard + Panel`
- `/`、`/library` 已接入 `BookCard + Panel`
- `/create` 已接入 `SettingCard + Panel`
- `/studio` 已接入 `Panel` 工作台表面

## Automated Checks

```text
npx tsc --noEmit -p tsconfig.app.json        PASS
npm run check:copy-boundary                  PASS
npm run lint -- --max-warnings=0             PASS
npm run build                                PASS
```

Build note:

```text
Browserslist data is 6 months old.
This is a maintenance warning and did not block the build.
```

## Browser QA

Preview URL:

```text
http://127.0.0.1:4173/?qa=shadcn-system-v1
```

Screenshot artifact folder:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/visual-qa/shadcn-system-v1
```

Captured routes and viewports:

```text
/        desktop 1440x900, mobile 390x844
/story   desktop 1440x900, mobile 390x844
/create  desktop 1440x900, mobile 390x844
/studio  desktop 1440x900, mobile 390x844
```

Browser assertions:

```text
All checked routes loaded with title 平行宇宙小说.
No horizontal overflow detected.
No forbidden reader/creator copy detected: 后端, PRD, demo, 原型, 接口, 时间织机.
/story contains .pu-manuscript from ReadingPaper.
/story contains 2 story choice cards.
```

## Screenshot Files

```text
desktop-home.png
desktop-story.png
desktop-create.png
desktop-studio.png
mobile-home.png
mobile-story.png
mobile-create.png
mobile-studio.png
qa-summary.json
```

## Remaining Migration Work

The design system is now enforceable, but not every old local class has been deleted. The remaining cleanup should continue in this order:

1. Replace more sidebar and Studio local `narrative-panel` usage with `Panel`.
2. Replace remaining page-local book row styles with `BookCard` variants.
3. Add Settings and Billing live routes only when their real save/payment behavior exists.
4. Convert `AuthModal` fully to the shadcn-compatible `Dialog`.
