# 平行宇宙小说 Prompt-Driven UI System

## Purpose

本文件用于把 AI UI 生成提示词变成可维护的工程设计系统，而不是一次性概念图。

参考原则：

- v0: shadcn/ui 是可复制进项目的源码组件体系，生成结果必须能落到本项目组件和 token。参考：[v0 design systems](https://v0.app/docs/design-systems)。
- Lovable: prompt 必须结构化描述目标、上下文、约束和输出。参考：[Lovable prompting docs](https://docs.lovable.dev/prompting/prompting-one) 与 [Lovable prompting handbook](https://lovable.dev/blog/2025-01-16-lovable-prompting-handbook)。
- Bolt: prompt 要清楚说明功能、边界、交互和验收标准。参考：[Bolt prompting guide](https://support.bolt.new/best-practices/prompting-effectively)。

## Visual Source

本轮 Image2 资产：

- Reader Gateway: `/parallel-assets/backgrounds/reader-gateway-planets.png`
- Story Reader: `/parallel-assets/backgrounds/story-reader-planets.png`

使用规则：

- 背景图只作为景深层，不直接承载正文。
- Reader 首页可以使用最强的行星纵深。
- Story 阅读页必须保护正文纸张的对比度。
- Creator 工作台不使用行星景深图；它使用深色本地工作台底色、低噪声网格和液态玻璃控制层。

## Project UI Prompt Template

```text
# Product Context
平行宇宙小说：读者阅读作品、请求下一章或 IF 支线、投票影响更新；作者在本地创作端处理请求、写作、确认发布。

# Target Surface
[Reader 首页 / Reader 阅读页 / Reader 请求面板 / Creator 工作台 / Creator 写作台]

# Visual Direction
Reader 使用跨时代、文学感、行星景深和世界线分裂；Creator 使用专业本地工作台、低噪声深色底面、液态玻璃控制层和安静编辑区。

# Component System
Use shadcn/ui primitives, Tailwind semantic tokens, and existing LiquidGlass component variants. Do not introduce another UI framework.

# Required UI Capabilities
[列出页面必须承载的真实功能，例如请求、投票、发布预览、作品管理]

# Copy Boundary
不出现 demo/fallback/Supabase/RLS/trace/provider/API key/后端/接口/同步/回写/作者本机 等工程词。

# Interaction
subtle motion, hover focus, branch pulse, glass depth, reduced-motion fallback.

# Output
Production-ready React + TypeScript component structure and CSS-token-friendly class design.
```

## Component Mapping

| Surface | Image Layer | Glass Layer | Core Product Action |
| --- | --- | --- | --- |
| Reader Gateway | aligned planets with wide negative space | light liquid panels | start reading, explore worlds |
| Library | constellation index | compact glass filters | find a universe |
| Story Reader | quiet paper over distant planets | side rails and request dock | read, choose, request |
| Creator Workbench | no image layer; quiet dark workbench | restrained liquid controls | process requests, write, publish |
| Creator Editor | no image layer; calm editor surface | destination and publish panels only | draft and confirm |

## Product Copy Rule

用户界面只解释故事和操作结果，不解释实现方式。工程词进入 docs、tests、handoff、evidence，不进入 Reader/Creator product UI。
