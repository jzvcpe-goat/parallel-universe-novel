export const parallelUniverseDesignSystemRegistry = {
  id: 'parallel-universe-novel-ui',
  title: '平行宇宙小说 UI Design System',
  shell: {
    component: '@/components/design-system/ParallelUniverseShell',
    requiredRailOrder: ['发现', '阅读', '书城', '创作', '会员'],
    rule: 'Reader-facing product pages share the public rail. Studio and operator settings stay direct/backstage surfaces; member billing becomes public only through productized membership copy.',
  },
  primitives: [
    { name: 'Button', path: '@/components/ui/button', source: 'shadcn-compatible' },
    { name: 'Badge', path: '@/components/ui/badge', source: 'shadcn-compatible' },
    { name: 'Card', path: '@/components/ui/card', source: 'shadcn-compatible' },
    { name: 'Input', path: '@/components/ui/input', source: 'shadcn-compatible' },
    { name: 'Textarea', path: '@/components/ui/textarea', source: 'shadcn-compatible' },
    { name: 'Label', path: '@/components/ui/label', source: 'shadcn-compatible' },
    { name: 'Dialog', path: '@/components/ui/dialog', source: 'radix-shadcn-compatible' },
  ],
  patterns: [
    { name: 'Panel', path: '@/components/design-system/Panel', surfaces: ['all'] },
    { name: 'PageHeader', path: '@/components/design-system/PageHeader', surfaces: ['discover', 'library', 'creator', 'studio', 'settings', 'billing'] },
    { name: 'BookCard', path: '@/components/design-system/BookCard', surfaces: ['discover', 'library', 'template-detail'] },
    { name: 'TopicFilterBar', path: '@/components/design-system/TopicFilterBar', surfaces: ['discover', 'library'] },
    { name: 'RankedWorldList', path: '@/components/design-system/RankedWorldList', surfaces: ['discover', 'library'] },
    { name: 'ReadingPaper', path: '@/components/design-system/ReadingPaper', surfaces: ['reader'] },
    { name: 'ChoiceCard', path: '@/components/design-system/ChoiceCard', surfaces: ['reader', 'choice-result'] },
    { name: 'CreatorConversationPanel', path: '@/components/design-system/CreatorConversationPanel', surfaces: ['creator'] },
    { name: 'CreatorDialogueThread', path: '@/components/design-system/CreatorDialogueThread', surfaces: ['creator'] },
    { name: 'CreatorReasoningMap', path: '@/components/design-system/CreatorReasoningMap', surfaces: ['creator'] },
    { name: 'CreatorStoryNotes', path: '@/components/design-system/CreatorStoryNotes', surfaces: ['creator'] },
    { name: 'StudioTrendOpsPanel', path: '@/components/design-system/StudioTrendOpsPanel', surfaces: ['studio'] },
    { name: 'CapabilityMapPanel', path: '@/components/design-system/CapabilityMapPanel', surfaces: ['studio'] },
    { name: 'SettingCard', path: '@/components/design-system/SettingCard', surfaces: ['creator', 'studio'] },
    { name: 'PlanCard', path: '@/components/design-system/PlanCard', surfaces: ['billing'] },
  ],
  pageContracts: {
    path: '@/design-system/page-contracts',
    rule: 'Each product route must declare a surface contract before UI migration or new feature work.',
    liveNavRule: 'Public navigation is 发现 / 阅读 / 书城 / 创作 / 会员. Studio and operator settings remain direct/backstage surfaces.',
  },
  copyBoundary: {
    readerForbidden: ['API', 'OpenAPI', 'PRD', 'fallback', 'demo', 'provider', 'database', 'endpoint', '后台', '后端', '接口', '时间织机'],
    creatorAllowed: ['需要你确认', '我已记住', '方向参考', '创作引导', '创作脉络', '故事笔记'],
    studioAllowed: ['质量评分', '发布门禁', '来源策略', '待审章节', '主线', '分支'],
  },
} as const

export type ParallelUniverseDesignSystemRegistry = typeof parallelUniverseDesignSystemRegistry
