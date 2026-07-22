# Current UI Baseline

Date: 2026-07-01
Branch: `preview/ui-motion-polish-20260628`
Scope: Reader Web + Local Creator App UI baseline for the zero-cost PMF loop

This file locks the current UI/UX direction so the next phase can focus on P0 data closure instead of redesigning pages.

## Baseline Decision

The current UI direction is accepted as the next product baseline.

Do not restart the Creator visual system, page IA, or component structure in the next phase. The next phase should harden boundaries and connect the existing surfaces to the P0 data loop.

## Reader Routes

| Route | Surface | Baseline Responsibility |
| --- | --- | --- |
| `/` | Reader gateway | Public reading entry, featured work, branch/request value. |
| `/library` | Reader library | Browse works, categories, updates, and ranking-style discovery. |
| `/story` | Reader story | Read published chapters, inspect branch state, send reader requests, vote. |
| `/settings` | Reader account | Membership/account state, recovery, request allowance, reader data controls. |
| `/create` | Redirect | Public Reader build redirects to `/library`; no Creator entry. |
| `/studio` | Redirect | Public Reader build redirects to `/library`; no Creator entry. |

## Creator Routes

| Route | Surface | Baseline Responsibility |
| --- | --- | --- |
| `/creator/login` | Creator login | Author enters the local creator app. |
| `/creator` | Today | Current writing focus, judgment basis, and request-to-publication route. |
| `/creator/requests` | Reader requests | Request queue, filters, reader wish, author question, next writing action. |
| `/creator/editor` | Writing desk | Local draft, candidate suggestion, author adoption, impact review, publish handoff. |
| `/creator/works` | Works and branches | Main/IF line structure, branch actions, author notice, next-line decision. |
| `/creator/publish` | Publish check | Author-confirmed publication review and reader-facing placement. |
| `/creator/settings` | Local Workspace | Local saves, backup export, assistant permissions, operation records, local creation service, credential status, display preferences, workbench readiness. |

## Component Ownership

| Area | Owning Components |
| --- | --- |
| Today | `CreatorTodayNextStepsPanel`, `CreatorTodayPriorityPanel`, `CreatorTodayPathPanel`, `CreatorTodayEchoStatusPanel`, `CreatorWorkReadinessPanel`, `CreatorTodayContextRail` |
| External Echo | `CreatorEchoStatusStrip`, `CreatorEchoQueueCard`, `CreatorEchoDecisionPanels`, `CreatorEchoWritingRail` |
| Editor | `CreatorWorkspaceShell`, `CreatorAssistantSidecar`, `CreatorCommandPalette`, `CreatorCommandCandidate`, `CreatorReviewDock`, `CreatorPlanningPanels`, `CreatorInlineAssistantPanels`, `CreatorAgentAssistantPanels` |
| Works | `CreatorBranchLineCard`, `CreatorAuthorDecisionCard` |
| Publish | `CreatorPublishBundleReviewPanel`, `CreatorPublishBundleImpactStrip`, `CreatorPublishBundleContextPanel`, `CreatorAuthorDecisionCard` |
| Local Workspace | `CreatorSettingsBoundaryStrip`, `CreatorLocalWorkspacePanel`, `CreatorWorkspacePreferencesPanel`, `CreatorSettingsStatusRail` |
| Reader story | `ReaderStoryIndexPanel`, `ReaderStoryBranchPanel`, `ReaderStoryProgressPanel`, `ReaderRequestPanel` |
| Reader account | `ReaderAccount*`, `ReaderMembershipPlanPanel`, `ReaderCheckoutProgressPanel`, `ReaderDataControlPanel` |

## Locked Non-Goals

- Do not redesign Creator.
- Do not reintroduce Reader planet/depth/radial hero visuals into Creator.
- Do not add page-local glass/card systems.
- Do not bypass shadcn/Radix-compatible primitives and Creator components.
- Do not present the Creator as a cloud writing runtime.
- Do not store draft prose, candidate prose, prompts, provider responses, or credentials in cloud records.

## Canonical Review Links

Build and serve the review surfaces:

```bash
npm --prefix app run build:reader
npm --prefix app run preview -- --host 127.0.0.1 --port 5200 --outDir dist

npm --prefix app run build:creator:qa
npm --prefix app run preview -- --host 127.0.0.1 --port 5199 --outDir dist-creator-qa
```

Canonical links:

- Reader: `http://127.0.0.1:5200/`
- Reader story: `http://127.0.0.1:5200/story`
- Creator today: `http://127.0.0.1:5199/#/creator`
- Creator editor: `http://127.0.0.1:5199/#/creator/editor?request=request-fog-if-1`

Hash routes remain supported for Creator QA. Direct Creator routes remain supported in the local preview build, but hash routes are the canonical review path for signed-in QA fixtures.

## Baseline Gates

```bash
npm run check:creator-ui-contract
npm run check:design-system-boundary
npm run check:reader-creator-copy-boundary
npm run check:ui-copy
npm run check:creator-product-boundary
npm run check:no-production-mock-data
npm run check:creator-data-map
npm --prefix app run lint -- --max-warnings=0
npm --prefix app run build:reader
npm --prefix app run build:creator
```
