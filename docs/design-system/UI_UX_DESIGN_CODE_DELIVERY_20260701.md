# UI/UX Design And Code Delivery

> **Historical reference boundary:** This is a pre-Pivot UI snapshot retained for evidence only. It is not current authority for product framing, routes, copy, persistence, Agent actions, publishing, or component ownership. Use `docs/product/creator-pivot-v2-contract.md`, `docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md`, `docs/launch/043_SLICE_OWNERSHIP_MATRIX.md`, and current executable gates instead. Do not restore retired request-management, author model/provider settings, browser-owned direct publishing, or page-local CSS from this document.

Status: `historical_pre_pivot_reference`

> 独立审核文件：本文件只交付 Reader Web 与 Local Creator App 的 UI/UX 设计、组件体系、代码位置和验收证据。它不是后端、数据库、安全策略、支付或生产上线报告。

Date: 2026-07-01
Branch: `preview/ui-motion-polish-20260628`
Scope: UI/UX design and frontend code only

This is the standalone audit packet for the current Reader Web and Local Creator App UI/UX work. It excludes backend, Supabase policy, payment, and production-launch status.

Use this document as the single UI/UX review entry. It lists the product intent, implemented components, code ownership, preview links, verification commands, and known caveats for this branch.

## How To Review This Packet

审核时只看四件事：

1. 产品分离是否成立：Reader 是读者产品，Creator 是作者本地创作产品，不是同一套管理后台换皮。
2. 创作能力是否可见：Creator 必须体现半常驻写作助手、自然语言指令、候选采纳、快捷键补全、影响审阅和发布前判断。
3. 设计系统是否成立：页面必须组合 shadcn/Radix-compatible primitives、语义 token、LiquidGlass 组件和 Creator/Reader 专用组件，而不是继续写一次性页面 CSS。
4. 残留是否被清掉：产品界面不得出现工程、后端、模型、调试、演示、预览环境、数据策略等非产品词。

审核结论建议只给三档：

| Decision | Meaning |
| --- | --- |
| Pass | 可以把本分支的 UI/UX 方向作为下一步产品基线。 |
| Needs Changes | 方向基本成立，但需要列出具体页面和组件返工点。 |
| Reject | Reader/Creator 分离、作者创作 UX 或设计系统仍不成立，需要回到产品设计阶段。 |

## Delivery Boundary

| Included In This UI/UX Delivery | Excluded From This UI/UX Delivery |
| --- | --- |
| Reader 首页、书城、阅读页、会员/账号页的界面和组件。 | 后端 schema、RLS policy、云端运行时、支付开通、生产发布证明。 |
| Local Creator App 的登录、今日、读者请求、写作台、作品与支线、发布检查、创作设置。 | 作者真实模型调用、本地桌面打包、生产作者账号体系。 |
| shadcn/Radix-compatible 基础组件、LiquidGlass 自定义组件、语义 token、页面契约和扫描脚本。 | 外部前端并入、Next.js 迁移、全新视觉系统推倒重来。 |
| Google Chrome/Playwright 截图证据、Focused checks、Creator aggregate tests、build proof。 | 商业上线声明、PMF 数据、真实付费验证。 |

## Page-Level Review Map

| Surface | Route | User Job | UI/UX Requirement | Code Owner |
| --- | --- | --- | --- | --- |
| Reader gateway | `/` | 快速知道这是可阅读、可请求、可分支的小说入口。 | 宇宙入口和书城感要强，但不能出现阅读器正文或作者工作台残留。 | `app/src/pages/Home.tsx`, `app/src/components/reader/*`, `UniverseDepth` |
| Reader library | `/library` | 浏览作品、分类、热度和更新。 | 作品发现优先，分类和榜单是产品语言，不是题材研究说明。 | `app/src/pages/Library.tsx` |
| Reader story | `/story` | 舒服阅读正文，查看章节、分支、请求和进度。 | 中间保持安静阅读，两侧是索引和分支/进度浮层；请求入口是读者行为，不显示创作过程。 | `ReaderStoryIndexPanel`, `ReaderStoryBranchPanel`, `ReaderStoryProgressPanel`, `ReaderRequestPanel` |
| Reader account | `/settings` | 管理会员、请求额度、账号恢复和数据控制。 | 它是读者账号页，不是创作设置页。 | `ReaderAccount*`, `ReaderMembershipPlanPanel` |
| Creator login | `/creator/login` | 作者进入本地创作端。 | 只表达作者工作台和本地创作边界，不像公网后台登录页。 | `LocalCreatorApp.tsx`, `CreatorShell` |
| Creator today | `/creator` | 作者一打开就知道今天先写什么。 | 以“下一步写作行动”为主，不做泛化 dashboard。 | `CreatorTodayPriorityPanel`, `CreatorTaskCard`, `CreatorStatePanel` |
| Creator requests | `/creator/requests` | 处理读者想看的下一章或 IF 支线。 | 显示读者愿望、可写场景、作者一问和马上做，而不是任务流水账。 | `CreatorRequest*` |
| Creator editor | `/creator/editor` | 写正文、接受建议、追问、看影响、准备发布。 | 三栏写作台，半常驻写作助手，支持 `Tab`, `Cmd/Ctrl+K`, `Cmd/Ctrl+L`, `Cmd/Ctrl+I`。 | `CreatorWritingWorkspace`, `CreatorAgentComposer`, `CreatorAssistantDock` |
| Creator works | `/creator/works` | 管理作品主线、IF 支线和章节挂点。 | 主线/IF 线清楚分离，作者能从结构直接回到写作。 | `CreatorBranchLineCard` |
| Creator publish | `/creator/publish` | 发布前确认章节、分支、请求影响和失败保护。 | 作者最后确认，不自动发布；读者端影响要说清楚。 | `CreatorPublish*` |
| Local Workspace | `/creator/settings` | 管理本机保存、备份、助手权限、操作记录、写作方式、显示偏好和工作台状态。 | 兼容 URL 仍为 settings，但产品面是本机工作区，不暴露实现名词。 | `CreatorLocalWorkspacePanel`, `CreatorSettings*` |

## Design-System Evidence

本轮 UI/UX 不是页面 CSS 临摹，而是按组件系统收口：

| Layer | Evidence | Rule |
| --- | --- | --- |
| shadcn-compatible primitives | `app/src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx`, `textarea.tsx`, `dialog.tsx`, `sheet.tsx`, `select.tsx`, `collapsible.tsx`, `popover.tsx` | 页面不得绕过这些基础组件重建同类交互。 |
| Liquid glass material | `app/src/components/ui/liquid-glass.tsx`, `docs/design-system/liquid-glass.md` | 只作为受控材质层使用，不允许每页自造玻璃卡。 |
| Semantic tokens | `app/src/styles/parallel-universe-tokens.css`, `app/src/index.css` | 颜色、边框、纸张、工作台、玻璃和动效必须先进入 token。 |
| Reader components | `app/src/components/reader/*` | Reader 只管阅读、请求、投票、账号和会员。 |
| Creator components | `app/src/components/creator/*` | Creator 只管作者工作、写作助手、草稿、发布和设置。 |
| Registry and contracts | `app/src/design-system/registry.ts`, `page-contracts.ts`, `parallel-universe-ui.registry.json` | 页面和组件的责任要可扫描、可 gate。 |

## Creator Agent-Assist UX

这部分是创作端区别于普通写作后台的核心：

| Capability | Product Behavior | Verification |
| --- | --- | --- |
| Semi-resident assistant | 写作台右侧常驻创作助手，能解释当前建议、候选正文和采纳影响。 | `browser-local-creator-authenticated-routes.mjs` |
| Natural-language command | 作者可以用自然语言要求改写、追问、补段落，而不是填表。 | `CreatorAgentComposer` contract |
| Candidate adoption | 每次建议都先显示“采纳后会改变什么”，再让作者决定是否采纳。 | `check:creator-m4-editor` |
| Review-time command | 作者在看问题卡、故事影响、支线试写或建议依据时，仍能用一行自然语言要求补写、改写、看影响或试支线。 | `CreatorReviewCommandBar`, `check:creator-m4-editor` |
| Cross-page author judgment | 作品结构和发布检查也要出现创作助手的作者一问，把支线/发布信息变成下一步创作判断，而不是只显示状态表。 | `CreatorAuthorDecisionCard`, `check:creator-m5-works`, `check:creator-m6-publish` |
| Shortcut completion | `Tab` 从正文输入框接受下一句，`Cmd/Ctrl+K` 改写，`Cmd/Ctrl+L` 追问，`Cmd/Ctrl+I` 看影响审阅。 | Chrome QA presses actual keys |
| Impact review | 发布前看人物、伏笔、支线影响，不把作者直接推入发布。 | `⌘I 看影响审阅` gate |
| Local draft boundary | 草稿、发布检查、设置都用作者语言描述，不显示工程状态。 | `check:ui-copy`, browser copy scan |

## Review Question

Does the frontend now express two clean products:

- Public Reader Web: reading, branch choice, reader requests, voting, membership/account recovery.
- Local Creator App: request handling, author writing, assistant-guided candidates, local draft review, branch management, publish review, and writing-tool preferences.

## Product Principles

1. Reader and Creator are separate products, not two skins over the same dashboard.
2. Reader pages use story, reading, request, vote, update, membership, and recovery language.
3. Creator pages use author work, reader wish, writable scene, author question, candidate adoption, private draft, publish review, and writing preference language.
4. shadcn/Radix-style primitives are the base: `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Tabs`, `Alert`, `Dialog`, `Collapsible`, `Select`, `ScrollArea`.
5. Liquid glass is a controlled material layer, not a license to create page-local glass boards.
6. Product surfaces must not show engineering terms such as Supabase, RLS, provider, fallback, API key, backend, interface, trace, system prompt, sync, writeback, raw hash, or service switches.

## Live Preview Links

- Reader build: start with `npm --prefix app run preview -- --host 127.0.0.1 --port 5200 --outDir dist`
- Reader home: `http://127.0.0.1:5200/`
- Reader library: `http://127.0.0.1:5200/library`
- Reader story: `http://127.0.0.1:5200/story?qa=reader-story-components`
- Reader account: `http://127.0.0.1:5200/settings?qa=reader-membership-plan-panel-2`
- Creator QA build: start with `npm --prefix app run preview -- --host 127.0.0.1 --port 5199 --outDir dist-creator-qa`
- Creator today: `http://127.0.0.1:5199/#/creator?qa=ui-review-20260701`
- Creator requests: `http://127.0.0.1:5199/#/creator/requests?qa=ui-review-20260701`
- Creator editor: `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=local-creator-authenticated`
- Creator works: `http://127.0.0.1:5199/#/creator/works?qa=author-decision-card`
- Creator publish: `http://127.0.0.1:5199/#/creator/publish?qa=author-decision-card`
- Creator settings: `http://127.0.0.1:5199/#/creator/settings?qa=ui-review-20260701`

Route note: Creator QA and the in-app browser review links use hash routes because they are the most stable when a tab already has older `#/creator` state. Direct browser routes such as `/creator/editor?...` remain supported by the local preview build, and legacy hash-style review links normalize to the same Creator surface.

## Implemented Reader Components

| Component | File | Owns | Main Gate |
| --- | --- | --- | --- |
| `ReaderRequestComposer` | `app/src/components/reader/ReaderRequestComposer.tsx` | Request type tabs, text entry, request flow, status note, disabled state, send action. | `check:reader-request-components` |
| `ReaderHotRequestList` | `app/src/components/reader/ReaderHotRequestList.tsx` | Hot request rows, vote action, published-state feedback, contextual empty state. | `check:reader-request-components` |
| `ReaderStoryIndexPanel` | `app/src/components/reader/ReaderStoryIndexPanel.tsx` | `/story` left rail, cover, current chapter, and branch map. | `check:reader-story-components` |
| `ReaderStoryBranchPanel` | `app/src/components/reader/ReaderStoryBranchPanel.tsx` | `/story` branch focus, shelf action, branch summary, and branch metrics. | `check:reader-story-components` |
| `ReaderStoryProgressPanel` | `app/src/components/reader/ReaderStoryProgressPanel.tsx` | `/story` reading progress, page position, shelf state, next-scene state, worldline feedback. | `check:reader-story-components` |
| `ReaderAccountHeroCard` | `app/src/components/reader/ReaderAccountHeroCard.tsx` | `/settings` first-viewport account or plan summary. | `check:reader-account-components` |
| `ReaderEntitlementSummaryGrid` | `app/src/components/reader/ReaderEntitlementSummaryGrid.tsx` | Reading credits, request credits, archive-state cards. | `check:reader-account-components` |
| `ReaderAccountMergePanel` | `app/src/components/reader/ReaderAccountMergePanel.tsx` | Account recovery, login/register, browser archive check, merge controls. | `check:reader-account-components` |
| `ReaderAccountStatusGrid` | `app/src/components/reader/ReaderAccountStatusGrid.tsx` | Reading progress, request activity, cross-device recovery cards. | `check:reader-account-components` |
| `ReaderDataControlPanel` | `app/src/components/reader/ReaderDataControlPanel.tsx` | Export, delete preview, confirmation, public-safe account messages. | `check:reader-account-components` |
| `ReaderCheckoutProgressPanel` | `app/src/components/reader/ReaderCheckoutProgressPanel.tsx` | Checkout progress, status refresh, return-to-reading action. | `check:reader-account-components` |
| `ReaderMembershipPlanPanel` | `app/src/components/reader/ReaderMembershipPlanPanel.tsx` | Membership plan selection and checkout-safe error display. | `check:reader-account-components` |

## Implemented Creator Components

| Area | Components | Owns |
| --- | --- | --- |
| Shell/navigation | `CreatorShell`, `WorkspaceNav`, `LocalStatusPill` | Creator-only workbench navigation and author status. |
| Today | `CreatorTodayPriorityPanel`, `CreatorTaskCard`, `CreatorStatePanel`, `CreatorActionBar` | Author next work, current tasks, judgment metrics, and the request -> draft -> publish -> reader-update route. |
| Reader requests | `CreatorRequestStatusStrip`, `CreatorRequestQueueCard`, `CreatorRequestNextActionPanel`, `CreatorRequestDecisionPanel`, `CreatorRequestWritingRail` | Reader wish to author decision flow. |
| Editor | `CreatorWritingWorkspace`, `CreatorAgentComposer`, `CreatorAssistantDock`, `CreatorEditorAssistPanel`, `CreatorEditorReadinessStrip`, `CreatorDestinationPanel` | Three-zone writing desk, semi-resident assistant, candidates, adoption plan, local shortcuts. |
| Works | `CreatorBranchLineCard`, `CreatorAuthorDecisionCard` | Main/IF line cards, chapter previews, request pressure, archive confirmation, writing handoff, and assistant-led next-line judgment. |
| Publish | `CreatorAuthorDecisionCard`, `CreatorPublishReviewPanel`, `CreatorPublishImpactStrip`, `CreatorPublishContextPanel` | Author-confirmed publication review, reader-facing impact preview, and publish-time author question. |
| Local Workspace | `CreatorSettingsBoundaryStrip`, `CreatorLocalWorkspacePanel`, `CreatorWorkspacePreferencesPanel`, `CreatorSettingsStatusRail` | Local saves, backup/recovery, assistant permissions, operation records, display preferences, readiness, and public boundary. |

## Code And Contract Files

| File | Role |
| --- | --- |
| `app/src/design-system/registry.ts` | Human-readable design-system component registry. |
| `app/src/design-system/page-contracts.ts` | Route-to-pattern contract and blocked-copy rules. |
| `app/src/registry/parallel-universe-ui.registry.json` | shadcn-compatible registry export list. |
| `app/src/components/patterns/HashRouteBridge.tsx` | Non-visual review-link compatibility bridge for browser-route previews. |
| `app/src/lib/hashRoute.ts` | Route-shaped hash parser and pre-render URL normalization helper. |
| `app/src/styles/parallel-universe-tokens.css` | Semantic tokens for Reader/Creator surfaces. |
| `app/src/index.css` | Token-backed selectors and component layout states. |
| `app/vite.config.ts` | Surface-specific build base: Reader keeps GitHub Pages-safe relative assets, Creator uses localhost-safe root assets so direct Creator routes render in preview. |
| `docs/design-system/components.md` | Component ownership and anti-regression rules. |
| `docs/harness/page-acceptance-tests.md` | Page-level acceptance criteria. |
| `docs/design-system/UI_UX_REVIEW_PACKET_20260701.md` | Reviewer-facing UI/UX packet. |
| `docs/design-system/UI_UX_DESIGN_CODE_REVIEW_HANDOFF_20260701.md` | Detailed history, evidence, commands, and known caveats. |
| `docs/design-system/DEVELOPMENT_NOTES.md` | Incremental UI/UX development log. |

## Verification Commands

Latest focused pass:

```bash
npm run check:creator-m4-editor
npm run check:creator-ui-contract
npm run check:reader-story-components
npm run check:design-system-boundary
npm --prefix app run lint -- --max-warnings=0
npm --prefix app run build:reader
npm --prefix app run build:creator
npm --prefix app run build:creator:qa
npm run test:creator
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/browser-local-creator-authenticated-routes.mjs
git diff --check
```

Additional review commands:

```bash
npm run check:reader-request-components
npm run check:reader-account-components
npm run check:reader-creator-copy-boundary
npm run check:public-reader-bundle-boundary
git diff --check
```

## Screenshot Evidence

| Screenshot | Route | Focus |
| --- | --- | --- |
| `artifacts/visual-qa/reader-story/story-reader-index-branch-progress-components.png` | `/story` | `ReaderStoryIndexPanel`, `ReaderStoryBranchPanel`, and `ReaderStoryProgressPanel`; DOM check found one of each, readable metric text, and zero forbidden engineering terms. |
| `artifacts/visual-qa/reader-story/story-reader-branch-progress-components.png` | `/story` | Prior `ReaderStoryBranchPanel` and `ReaderStoryProgressPanel` evidence retained for comparison. |
| `artifacts/visual-qa/reader-request-components/story-reader-request-components.png` | `/story` | `ReaderRequestComposer` and `ReaderHotRequestList`. |
| `artifacts/visual-qa/reader-account/settings-reader-membership-plan-panel.png` | `/settings` | `ReaderMembershipPlanPanel` with no direct plan rendering from the page. |
| `artifacts/visual-qa/reader-account/settings-reader-checkout-progress-panel.png` | `/settings` | `ReaderCheckoutProgressPanel`. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-editor.png` | `/creator/editor` | Three-zone writing desk and semi-resident writing assistant. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-requests.png` | `/creator/requests` | Reader request to author decision flow. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-works.png` | `/creator/works` | Work-line structure, IF/main separation, and assistant next-line judgment. |
| `artifacts/visual-qa/local-creator-authenticated/route-creator-publish.png` | `/creator/publish` | Author-confirmed publish review. |

## Latest Live Verification

Validated on 2026-07-01 from current preview branch:

| Surface | URL | Browser Check |
| --- | --- | --- |
| Reader routes | `http://127.0.0.1:5200/`, `/library`, `/story`, `/settings` | Fixed Reader preview renders public reading surfaces; checked the four routes show reader-facing content and no Creator navigation or publish/settings residue. |
| Creator editor | `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=local-creator-authenticated` | Found the signed-in writing desk, semi-resident writing assistant, two writing textareas, no login lock, and zero forbidden engineering terms. |
| Creator hash compatibility | `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=hash-compat` | Legacy hash-style review links remain supported and land on the same Creator writing surface. |
| Creator quality copy | `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=quality-issue-card` | The writing desk uses `质量问题卡` for author-facing quality guidance and blocks old `质量审阅` / `审阅建议` wording from returning. |
| Creator workbench material | `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=creator-paper-shell` | Computed style found the Creator root and main scroll surface, with no radial gradient and no image URL on either surface; the CSS contract now requires scoped paper/ruling tokens and blocks Reader planet/depth residue from returning. |
| Creator direct route | `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1&qa=direct-route-fixed` | Creator route renders the writing desk, has two text areas, and shows zero forbidden engineering terms. This fixes the blank preview caused by Reader-style relative asset paths in the Creator QA build. |
| Creator settings copy | `http://127.0.0.1:5199/#/creator/settings?qa=settings-direct-fixed` | Creator settings route renders writing preferences, current-state cards, and publication promises with zero forbidden engineering terms. |
| Creator keyboard shortcuts | authenticated route QA | Browser QA now presses `Tab`, `⌘L`, `⌘K`, and `⌘I` in the writing desk. `Tab` must append the next prose suggestion from the focused正文 field; `⌘I` must open impact review without opening the global command center. |
| Creator settings version copy | authenticated route QA | QA/build version values render as `内测版`, and `预览版` is blocked from the author-facing settings surface. |
| Creator shortcut semantics | `check:creator-m4-editor` | The primary `⌘I` quick action is labelled `看影响审阅`, so the author understands it opens review/impact context before any publish confirmation. |
| Creator review-time command | `check:creator-m4-editor` | The review dock now includes `CreatorReviewCommandBar`, so quality, impact, branch-trial, and rationale views still keep a natural-language writing command visible. Compact assistant mode no longer hides the command form. |
| Creator cross-page judgment | `check:creator-m5-works`, `check:creator-m6-publish` | Works and Publish now render `CreatorAuthorDecisionCard`: `这条线下一步` and `发布前最后一问` keep agent-style author judgment visible outside the editor. |
| Creator Today route | `check:creator-m2-today` | `CreatorTodayPriorityPanel` now owns `今日判断依据` and `今日写作路线`, so the first signed-in screen reads as one guided author route instead of separate status strips. |
| Creator aggregate UI gate | `npm run test:creator` | Full Creator UI chain passes after the Today route refactor, including copy boundary, design tokens, component ownership, Reader/Creator boundary, and author-flow contract. |
| Creator manual review port | `http://127.0.0.1:5199/#/creator?qa=manual-review` | Fixed `creator-qa` preview renders signed-in Creator surfaces; checked `/creator`, `/creator/editor`, and `/creator/requests` are not the signed-out lock page. |
| Creator browser screenshots | `scripts/browser-local-creator-authenticated-routes.mjs` | Google Chrome route QA passed and regenerated signed-in screenshots for `/creator`, `/creator/requests`, `/creator/editor`, `/creator/works`, `/creator/publish`, and `/creator/settings`. |

The Creator review link should use `/creator/editor?...`; the previous `#/creator/editor?...` shape is supported as a compatibility path and should normalize to the same writing desk.

## Latest Change Summary

- Added `ReaderStoryIndexPanel`, `ReaderStoryBranchPanel`, and `ReaderStoryProgressPanel`.
- Replaced `/story` inline left-rail index/map markup and branch/progress right-rail markup with Reader components.
- Added `check:reader-story-components` and wired it into `test:creator`.
- Updated design-system registry, page contracts, shadcn registry JSON, components doc, page acceptance tests, UI/UX review packet, handoff, and development notes.
- Added `HashRouteBridge` so browser-route previews remain inspectable even when a reviewer opens an older hash-style Creator link.
- Aligned the Creator editor quality surface around `质量问题卡`, replacing old process-flavored `质量审阅` / `审阅建议` copy and adding a gate so the mismatch cannot silently return.
- Reworked the Creator workbench background into paper/ruling material tokens and added a CSS-block gate so Reader planet/depth/radial hero residue cannot re-enter the Creator shell.
- Changed Creator builds to use localhost-safe root asset paths while keeping Reader builds on GitHub Pages-safe relative asset paths.
- Strengthened the Creator writing-assistant proof: browser QA now verifies real keyboard shortcuts for `Tab`, `⌘L`, `⌘K`, and `⌘I` instead of relying on visible shortcut labels alone.
- Replaced the settings version value `预览版` with `内测版` and added gates so preview/build wording does not leak into author-facing settings.
- Aligned the `⌘I` quick action copy with its actual behavior: it now says `看影响审阅` instead of implying direct publish judgment.
- Added `CreatorReviewCommandBar` to the review dock and changed compact assistant CSS so author command input remains visible during candidate/review states.
- Added `CreatorAuthorDecisionCard` and wired it into `/creator/works` and `/creator/publish`, so structural and publish surfaces also show `作者一问`, decision basis, and a direct author next action using shadcn `Card`/`Badge`/`Button` composition.
- Expanded `CreatorTodayPriorityPanel` so `/creator` shows one guided writing route with `今日判断依据` and `今日写作路线`; removed page-local Today decision strips and moved that interaction back into the Creator component system.
- Updated `check:creator-author-flow-contract` so it verifies the new `CreatorTodayPriorityPanel` route responsibility instead of requiring the removed `TodayFlowRail`.
- Captured `/story` and `/creator/editor` screenshot evidence with Google Chrome/Playwright from live dev previews.

## Known Review Caveats

- This branch is still a preview branch and has not been merged into `main`.
- This document does not claim backend, RLS, payment, or production launch readiness.
- The Reader and Creator visual systems are now more componentized, but final product approval should still inspect live preview routes, not only screenshots.
- Creator review should use the `5190` direct links above for the latest local QA build.
