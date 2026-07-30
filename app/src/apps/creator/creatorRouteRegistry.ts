export type CreatorRouteStage =
  | 'today_path'
  | 'external_echo'
  | 'inspiration_to_draft'
  | 'local_writing_library'
  | 'writing_desk'
  | 'publish_bundle'
  | 'local_workspace'

export type CreatorRouteState = 'legacy_compatible' | 'pivot_target'

export interface CreatorRouteCopy {
  title: string
  description: string
}

export interface CreatorRouteDefinition extends CreatorRouteCopy {
  id: string
  href: string
  icon: string
  label: string
  stage: CreatorRouteStage
  state: CreatorRouteState
  legacyHref?: string
}

export interface CreatorRouteAlias {
  href: string
  legacyHref: string
  stage: CreatorRouteStage
}

export const creatorLegacyRoutes: readonly CreatorRouteDefinition[] = [
  {
    id: 'creator-home',
    icon: 'creatorHome',
    label: '今日',
    href: '/creator',
    title: '今日创作路径',
    description: '先看外界回声和本机草稿，再进入写作、发布和作品维护。',
    stage: 'today_path',
    state: 'legacy_compatible',
  },
  {
    id: 'creator-requests',
    icon: 'creatorInbox',
    label: '外界回声',
    href: '/creator/requests',
    title: '外界回声',
    description: '把读者想看的下一章、IF 支线和续写反馈整理成可写的创作提醒。',
    stage: 'external_echo',
    state: 'legacy_compatible',
  },
  {
    id: 'creator-editor',
    icon: 'creatorWrite',
    label: '写作台',
    href: '/creator/editor',
    title: '写作台',
    description: '围绕一条创作提醒安静写作，草稿确认后再进入发布包确认。',
    stage: 'writing_desk',
    state: 'legacy_compatible',
  },
  {
    id: 'creator-works',
    icon: 'creatorWorks',
    label: '作品与支线',
    href: '/creator/works',
    title: '作品与支线',
    description: '查看作品、主线、IF 支线、章节挂点和作者公告，管理读者能看到的结构。',
    stage: 'local_writing_library',
    state: 'legacy_compatible',
  },
  {
    id: 'creator-publish',
    icon: 'creatorPublish',
    label: '发布包',
    href: '/creator/publish',
    title: '发布包',
    description: '确认作品、支线、挂点、关联回声、公开标题和正文预览，再由作者决定是否发布。',
    stage: 'publish_bundle',
    state: 'legacy_compatible',
  },
  {
    id: 'creator-settings',
    icon: 'creatorSettings',
    label: '本机工作区',
    href: '/creator/settings',
    title: '本机工作区',
    description: '管理本机保存、备份、操作记录、助手权限和当前工作状态。',
    stage: 'local_workspace',
    state: 'legacy_compatible',
  },
] as const

export const creatorPivotRoutes: readonly CreatorRouteDefinition[] = [
  {
    id: 'creator-today-path',
    icon: 'creatorHome',
    label: '今日创作路径',
    href: '/creator',
    title: '今日创作路径',
    description: '从正在写的章节、外界回声和本机草稿里，确定今天最值得推进的一步。',
    stage: 'today_path',
    state: 'pivot_target',
  },
  {
    id: 'creator-echo',
    icon: 'creatorInbox',
    label: '外界回声',
    href: '/creator/echo',
    legacyHref: '/creator/requests',
    title: '外界回声',
    description: '把读者反馈沉淀成可写的创作提醒，而不是把作者推入待办列表。',
    stage: 'external_echo',
    state: 'pivot_target',
  },
  {
    id: 'creator-inspiration',
    icon: 'creatorSpark',
    label: '灵感到正文',
    href: '/creator/inspiration',
    legacyHref: '/creator/editor',
    title: '灵感到正文',
    description: '从一句想法开始，逐步确认人物、场景、冲突、代价和下一段正文。',
    stage: 'inspiration_to_draft',
    state: 'pivot_target',
  },
  {
    id: 'creator-library',
    icon: 'creatorWorks',
    label: '本机写作智库',
    href: '/creator/library',
    legacyHref: '/creator/works',
    title: '本机写作智库',
    description: '管理人物、地点、势力、物品、能力、规则、伏笔和写作方法卡。',
    stage: 'local_writing_library',
    state: 'pivot_target',
  },
  {
    id: 'creator-writing-desk',
    icon: 'creatorWrite',
    label: '写作台',
    href: '/creator/write',
    legacyHref: '/creator/editor',
    title: '写作台',
    description: '安静写正文；助手只在作者需要时给下一句、结构提醒或卡文急救。',
    stage: 'writing_desk',
    state: 'pivot_target',
  },
  {
    id: 'creator-bundles',
    icon: 'creatorPublish',
    label: '发布包',
    href: '/creator/bundles',
    legacyHref: '/creator/publish',
    title: '发布包',
    description: '先生成可审查的发布包和回执，再决定发到读者端或外部平台。',
    stage: 'publish_bundle',
    state: 'pivot_target',
  },
  {
    id: 'creator-workspace',
    icon: 'creatorSettings',
    label: '本机工作区',
    href: '/creator/workspace',
    legacyHref: '/creator/settings',
    title: '本机工作区',
    description: '管理本机保存、备份、导入导出、操作记录和助手权限。',
    stage: 'local_workspace',
    state: 'pivot_target',
  },
] as const

const defaultPivotHrefByLegacyPath: Readonly<Record<string, string>> = {
  '/creator': '/creator',
  '/creator/requests': '/creator/echo',
  '/creator/editor': '/creator/write',
  '/creator/works': '/creator/library',
  '/creator/publish': '/creator/bundles',
  '/creator/settings': '/creator/workspace',
}

export const creatorLoginCopy: CreatorRouteCopy = {
  title: '进入创作工作台',
  description: '登录后查看外界回声、编辑章节、管理 IF 支线，并在确认后发布更新。',
}

export function getCreatorPivotRouteAliases(): readonly CreatorRouteAlias[] {
  return creatorPivotRoutes
    .filter((route): route is CreatorRouteDefinition & { legacyHref: string } => Boolean(route.legacyHref))
    .map(route => ({
      href: route.href,
      legacyHref: route.legacyHref,
      stage: route.stage,
    }))
}

export function resolveCreatorLegacyPath(pathname: string) {
  return creatorPivotRoutes.find(route => route.href === pathname)?.legacyHref || pathname
}

export function resolveCreatorActivePivotHref(pathname: string) {
  const exactPivotRoute = creatorPivotRoutes.find(route => route.href === pathname)
  if (exactPivotRoute) return exactPivotRoute.href
  return defaultPivotHrefByLegacyPath[pathname] || pathname
}

export function resolveCreatorPageCopy(pathname: string): CreatorRouteCopy {
  if (pathname === '/creator/login') return creatorLoginCopy
  const exactPivotRoute = creatorPivotRoutes.find(route => route.href === pathname)
  if (exactPivotRoute) return exactPivotRoute
  const activePivotHref = resolveCreatorActivePivotHref(pathname)
  return (
    creatorPivotRoutes.find(route => route.href === activePivotHref) ||
    creatorLegacyRoutes.find(route => route.href === pathname) ||
    creatorPivotRoutes[0]
  )
}

export function getCreatorLegacyNavItems(activePath: string) {
  return creatorLegacyRoutes.map(route => ({
    id: route.id,
    icon: route.icon,
    label: route.label,
    href: route.href,
    active: activePath === route.href,
  }))
}

export function getCreatorPivotNavItems(activePath: string) {
  const activePivotHref = resolveCreatorActivePivotHref(activePath)
  return creatorPivotRoutes.map(route => ({
    id: route.id,
    icon: route.icon,
    label: route.label,
    href: route.href,
    active: activePivotHref === route.href,
  }))
}
