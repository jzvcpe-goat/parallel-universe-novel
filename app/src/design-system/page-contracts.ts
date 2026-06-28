export type ParallelUniverseSurface =
  | 'discover'
  | 'library'
  | 'reader'
  | 'creator'
  | 'studio'
  | 'settings'
  | 'billing'

export type ParallelUniversePattern =
  | 'ParallelUniverseShell'
  | 'Panel'
  | 'PageHeader'
  | 'BookCard'
  | 'ReadingPaper'
  | 'ChoiceCard'
  | 'TopicFilterBar'
  | 'RankedWorldList'
  | 'CreatorConversationPanel'
  | 'CreatorDialogueThread'
  | 'CreatorReasoningMap'
  | 'CreatorStoryNotes'
  | 'StudioTrendOpsPanel'
  | 'CapabilityMapPanel'
  | 'SettingCard'
  | 'PlanCard'

export const pageSurfaceContracts: Record<
  ParallelUniverseSurface,
  {
    route: string
    audience: 'reader' | 'creator' | 'operator' | 'account'
    purpose: string
    requiredPatterns: ParallelUniversePattern[]
    primaryAction: string
    liveWhen: string
    blockedCopy: string[]
  }
> = {
  discover: {
    route: '/',
    audience: 'reader',
    purpose: '像书城首页一样承接新用户，让读者按热门题材索引发现作品并开始阅读。',
    requiredPatterns: ['ParallelUniverseShell', 'Panel', 'BookCard', 'TopicFilterBar', 'RankedWorldList'],
    primaryAction: '开始阅读',
    liveWhen: '热门题材索引、榜单和作品推荐来自同一套趋势排序，题材点击能进入书城筛选。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型', '起点', '番茄', '绑定', '底盘'],
  },
  library: {
    route: '/library',
    audience: 'reader',
    purpose: '承载热门题材索引、榜单、更新和作品筛选。',
    requiredPatterns: ['ParallelUniverseShell', 'PageHeader', 'BookCard', 'Panel', 'TopicFilterBar', 'RankedWorldList'],
    primaryAction: '阅读作品',
    liveWhen: 'URL topic、筛选栏、作品排序和创作入口共享同一套趋势合同。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型', '起点', '番茄', '绑定', '底盘'],
  },
  reader: {
    route: '/story',
    audience: 'reader',
    purpose: '提供长文本阅读、选择点、个人分支和阅读反馈。',
    requiredPatterns: ['ParallelUniverseShell', 'ReadingPaper', 'ChoiceCard', 'Panel'],
    primaryAction: '继续阅读',
    liveWhen: '正文至少 200 字/页、可滚动、可翻页，选择后反馈更新。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型', '时间织机'],
  },
  creator: {
    route: '/create',
    audience: 'creator',
    purpose: '通过自然语言对话生成第一段正文，并用可见创作脉络和故事笔记保持人物、场景、规则和风格一致。',
    requiredPatterns: ['ParallelUniverseShell', 'PageHeader', 'Panel', 'CreatorConversationPanel', 'CreatorDialogueThread', 'CreatorReasoningMap', 'CreatorStoryNotes'],
    primaryAction: '生成开场',
    liveWhen: '输入故事种子后能生成正文、追问问题、继续输入，并把结构化信息产品化为创作脉络和故事笔记。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型', '系统从正文提取', '底盘预设', '绑定', '底盘', '起点', '番茄', '思维链'],
  },
  studio: {
    route: '/studio',
    audience: 'operator',
    purpose: '创作者和运营处理发布检查、题材配置、待审章节和外部工具策略。',
    requiredPatterns: ['ParallelUniverseShell', 'PageHeader', 'Panel', 'StudioTrendOpsPanel', 'CapabilityMapPanel', 'SettingCard'],
    primaryAction: '确认发布',
    liveWhen: '只对创作和运营开放，不作为普通读者首屏入口。',
    blockedCopy: ['PRD 映照', '后端泄漏', '时间织机'],
  },
  settings: {
    route: '/settings',
    audience: 'account',
    purpose: '展示会员权益、阅读次数、互动请求和开通状态。',
    requiredPatterns: ['ParallelUniverseShell', 'PageHeader', 'Panel', 'PlanCard'],
    primaryAction: '开通会员',
    liveWhen: '权益和开通请求连接真实合同；支付实现字段不进入页面。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型'],
  },
  billing: {
    route: '/billing',
    audience: 'account',
    purpose: '展示会员权益、支付计划和创作者权益。',
    requiredPatterns: ['ParallelUniverseShell', 'PageHeader', 'PlanCard'],
    primaryAction: '开通会员',
    liveWhen: '支付不可用时不显示真实购买按钮，只展示权益和等待名单。',
    blockedCopy: ['后端', '接口', 'PRD', 'demo', '原型'],
  },
}

export const shadcnImplementationRules = [
  '页面优先组合 design-system patterns；若必须新增业务卡片样式，先抽成 pattern 再落页面。',
  '交互控件从 components/ui 取 Button、Badge、Card、Input、Textarea、Dialog、Select、Tabs、Table、Alert、Checkbox、ScrollArea。',
  '液态玻璃表面统一使用 components/ui/LiquidGlass 与 Panel/Card 的 glass 语义；页面不得手写新的玻璃面板体系。',
  '新颜色必须先进入 parallel-universe-tokens.css，再进入 variant 或 pattern。',
  '读者页只能出现故事、阅读、选择和反馈语言；创作室才可以出现发布检查和运营语言。',
  '创作页主路径优先自然语言对话；内部结构只能产品化为创作脉络和故事笔记，不显示系统字段解释或原始思维链。',
  '热门题材索引可以出现在首页、书城和创作页，但只能用产品语言；来源平台、绑定关系和底盘解释留在交接文档或 Studio。',
  '普通用户主导航只保留发现、阅读、书城、会员；Local Creator、Studio 和运营设置不进入公网主导航。',
] as const
