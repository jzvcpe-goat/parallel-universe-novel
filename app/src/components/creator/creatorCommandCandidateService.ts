import type {
  CreatorCommandSurfaceItem,
} from '@/components/creator/workspace/CreatorCommandPalette'
import type {
  CreatorCommandCandidateApplyMode,
  CreatorCommandCandidateModel,
} from '@/components/creator/workspace/CreatorCommandCandidate'
import type { CreatorAssistantScopeId } from '@/components/creator/workspace/CreatorAssistantSidecar'

export type CreatorAssistantScope = CreatorAssistantScopeId

export type CreatorCommand = CreatorCommandSurfaceItem & {
  scope: CreatorAssistantScope[]
}

export type CommandCandidate = CreatorCommandCandidateModel
export type CommandCandidateApplyMode = CreatorCommandCandidateApplyMode

export type CommandCandidateApplyDetail = {
  mode: CommandCandidateApplyMode
  label: string
  candidateId: string
  candidateTitle: string
}

export const creatorAssistantCommands: CreatorCommand[] = [
  {
    id: 'pick-request',
    scope: ['dashboard', 'requests'],
    label: '挑出今天最值得写的一条',
    shortcut: '⌘K',
    detail: '按热度、状态和读者原话，给作者一个明确切入点。',
    href: '/creator/requests',
    agentAction: 'select_priority_request',
  },
  {
    id: 'turn-request-into-scene',
    scope: ['requests', 'editor'],
    label: '把请求整理成一场戏',
    shortcut: '⌘↵',
    detail: '提炼人物、场景、冲突和这一章要兑现的承诺。',
    href: '/creator/editor',
    agentAction: 'convert_echo_to_scene',
  },
  {
    id: 'complete-next-beat',
    scope: ['editor'],
    label: '补下一句或下一段',
    shortcut: 'Tab',
    detail: '在不打断写作的情况下，顺着当前段落补一个可改的方向。',
    agentAction: 'complete_next_beat',
  },
  {
    id: 'rewrite-tone',
    scope: ['editor'],
    label: '把说明改成画面动作',
    shortcut: '⌘K',
    detail: '压低解释，把设定说明改成角色动作、场景细节和可感知的选择压力。',
    agentAction: 'rewrite_as_action',
  },
  {
    id: 'socratic-question',
    scope: ['dashboard', 'requests', 'editor', 'works'],
    label: '追问一个关键问题',
    shortcut: '⌘L',
    detail: '用一个问题逼近人物动机、场景压力或支线代价。',
    agentAction: 'ask_socratic_question',
  },
  {
    id: 'extract-setting',
    scope: ['editor', 'works'],
    label: '沉淀人物、场景和规则',
    shortcut: '⌘K',
    detail: '把正文里已经出现的信息收成作品设定，避免越写越散。',
    href: '/creator/works',
    agentAction: 'extract_setting_asset',
  },
  {
    id: 'branch-sandbox',
    scope: ['editor'],
    label: '创建支线试写',
    shortcut: '⌘K',
    detail: '把当前选择试成另一条走向，先放在草稿里比较。',
    agentAction: 'branch_sandbox',
  },
  {
    id: 'review-state-change',
    scope: ['editor'],
    label: '检查故事影响',
    shortcut: '⌘K',
    detail: '看这一章会改变读者已知、人物关系和世界线位置。',
    agentAction: 'inspect_story_impact',
  },
  {
    id: 'open-flight-record',
    scope: ['editor'],
    label: '查看建议依据',
    shortcut: '⌘K',
    detail: '回看这一章从请求到正文建议的关键步骤。',
    agentAction: 'open_suggestion_record',
  },
  {
    id: 'reader-promise-check',
    scope: ['publish'],
    label: '检查读者承诺是否兑现',
    shortcut: '⌘K',
    detail: '发布前看标题、正文、支线挂点和请求影响是否一致。',
    href: '/creator/publish',
    agentAction: 'check_reader_promise',
  },
]

export function assistantScopeForPath(pathname: string): CreatorAssistantScope {
  if (pathname.includes('/creator/requests') || pathname.includes('/creator/echo')) return 'requests'
  if (pathname.includes('/creator/editor') || pathname.includes('/creator/inspiration') || pathname.includes('/creator/write')) return 'editor'
  if (pathname.includes('/creator/works') || pathname.includes('/creator/library')) return 'works'
  if (pathname.includes('/creator/publish') || pathname.includes('/creator/bundles')) return 'publish'
  if (pathname.includes('/creator/settings') || pathname.includes('/creator/workspace')) return 'settings'
  return 'dashboard'
}

export function commandsForScope(scope: CreatorAssistantScope) {
  return creatorAssistantCommands.filter(command => command.scope.includes(scope))
}

export function commandCandidateApplyMode(label: string): CommandCandidateApplyMode {
  if (label.includes('替换')) return 'replace'
  if (label.includes('插入')) return 'insert'
  if (label.includes('分支') || label.includes('视角')) return 'branch'
  return 'hold'
}

const commandCandidateCancellationLabels = new Set([
  '关闭',
  '废弃',
  '稍后再看',
  '稍后处理',
  '暂不沉淀',
])

export function resolveCommandCandidateOption(label: string) {
  const applyMode = commandCandidateApplyMode(label)
  if (commandCandidateCancellationLabels.has(label)) {
    return {
      applyMode,
      feedback: '已暂存当前判断；正文没有变化。',
      kind: 'cancel' as const,
    }
  }

  return {
    applyMode,
    kind: 'apply' as const,
  }
}

export const commandIntentKeywords: Record<string, string[]> = {
  'pick-request': ['今天', '优先', '最值得', '先写', '热度', '请求'],
  'turn-request-into-scene': ['请求', '一场戏', '场景', '人物在场', '代价', '整理成戏'],
  'complete-next-beat': ['续写', '补写', '下一句', '下一段', '正文', '接着写', '补一段'],
  'rewrite-tone': ['说明书', '解释', '压低', '改写', '画面', '动作', '语气', '太直白'],
  'socratic-question': ['追问', '为什么', '动机', '必须', '代价', '问题', '选择'],
  'extract-setting': ['设定', '人物', '场景', '规则', '沉淀', '记下来', '收进'],
  'branch-sandbox': ['分支', 'if', '支线', '另一种', '试写', '实验'],
  'review-state-change': ['影响', '状态', '改变', '读者已知', '关系', '世界线'],
  'open-flight-record': ['形成', '过程', '为什么这样', '回看', '依据'],
  'reader-promise-check': ['发布', '承诺', '标题', '读者', '检查', '兑现'],
}

export function assistantScopeLabel(scope: CreatorAssistantScope) {
  const labels: Record<CreatorAssistantScope, string> = {
    dashboard: '今日创作路径',
    requests: '外界回声',
    editor: '写作台',
    works: '作品结构',
    publish: '发布包确认',
    settings: '本机工作区',
  }
  return labels[scope]
}

export function commandContextForScope(scope: CreatorAssistantScope) {
  const contexts: Record<CreatorAssistantScope, {
    focus: string
    output: string
    guard: string
    examples: string[]
  }> = {
    dashboard: {
      focus: '从今天最值得写的一条开始',
      output: '优先候选',
      guard: '只整理建议，不替作者选择',
      examples: ['今天先写哪条？', '把最热回声挑出来', '继续最近草稿'],
    },
    requests: {
      focus: '把读者愿望整理成可写场景',
      output: '场景候选',
      guard: '不改变回声状态',
      examples: ['把这条回声整理成一场戏', '先问这条支线的代价', '挑一条最值得写的回声'],
    },
    editor: {
      focus: '围绕当前正文给出下一步',
      output: '正文候选',
      guard: '不直接改正文',
      examples: ['补下一段', '这段像说明书，压成动作', '追问人物为什么必须现在行动', '看这一章会影响什么'],
    },
    works: {
      focus: '把已写内容沉淀为作品资产',
      output: '设定候选',
      guard: '确认前不锁死设定',
      examples: ['把人物动机收进设定', '整理这条支线的规则', '追问这个人物还缺什么'],
    },
    publish: {
      focus: '发布前检查读者能看到什么',
      output: '发布候选',
      guard: '不直接公开',
      examples: ['检查读者承诺', '标题和正文是否一致？', '这章回应了哪个请求？'],
    },
    settings: {
      focus: '调整写作环境和显示方式',
      output: '设置建议',
      guard: '不改变公开内容',
      examples: ['调成安静写作', '减少动效', '检查当前写作方式'],
    },
  }
  return contexts[scope]
}

function commandCandidateVariants(id: string, primaryLabel: string): CommandCandidate['variants'] {
  const variants: Record<string, CommandCandidate['variants']> = {
    'complete-next-beat': [
      {
        label: '候选 A',
        title: '行动推进',
        effect: '把下一段落落到人物动作，让章节更快进入选择。',
        risk: '推进太快时，悬念可能没有停留空间。',
        action: '插入为备选',
      },
      {
        label: '候选 B',
        title: '悬念留白',
        effect: '保留一个没有立刻解释的变化，让段尾更有追读感。',
        risk: '如果后续不兑现，会让伏笔显得悬空。',
        action: '放入分支',
      },
    ],
    'rewrite-tone': [
      {
        label: '候选 A',
        title: '动作替代说明',
        effect: '把解释拆进人物动作和场景反应，读者更容易跟着看。',
        risk: '如果压得太低，关键信息可能不够清楚。',
        action: '插入为备选',
      },
      {
        label: '候选 B',
        title: '保留一点解释',
        effect: '保留必要信息，再用一处细节承接氛围。',
        risk: '节奏会比纯动作慢一点。',
        action: '替换当前段落',
      },
    ],
    'branch-sandbox': [
      {
        label: '候选 A',
        title: '保留当前选择',
        effect: '沿当前章节承诺继续推进，用试写比较后果。',
        risk: '如果差异太小，试写线会像普通备份。',
        action: '保留当前选择',
      },
      {
        label: '候选 B',
        title: '换视角试写',
        effect: '用另一位人物承受代价，快速判断支线张力。',
        risk: '切视角太远会让主线暂时失焦。',
        action: '换视角试写',
      },
    ],
    'review-state-change': [
      {
        label: '候选 A',
        title: '先看影响',
        effect: '先确认人物目标、读者已知和支线位置，再进入检查。',
        risk: '跳过这一步容易把未确认变化写进正式剧情。',
        action: '查看故事影响',
      },
      {
        label: '候选 B',
        title: '先存草稿',
        effect: '保留当前正文，稍后再判断是否进入公开检查。',
        risk: '暂存太久会让外界回声停留在处理中。',
        action: '只保存草稿',
      },
    ],
    'open-flight-record': [
      {
        label: '候选 A',
        title: '查看建议依据',
        effect: '回看本章为什么选择当前推进方式。',
        risk: '只适合解释判断，不替代正文审阅。',
        action: '查看建议依据',
      },
      {
        label: '候选 B',
        title: '回到正文',
        effect: '关闭解释层，继续处理标题、正文和发布去向。',
        risk: '如果仍有疑问，可能漏掉弱尾钩或方向偏差。',
        action: '回到正文',
      },
    ],
    'socratic-question': [
      {
        label: '候选 A',
        title: '追问动机',
        effect: '逼近人物为什么现在必须行动。',
        risk: '问题太抽象时，需要作者补一句具体场景。',
        action: '回答这个问题',
      },
      {
        label: '候选 B',
        title: '追问代价',
        effect: '先确定不行动会失去什么，再补正文。',
        risk: '代价过重会改变原本章节方向。',
        action: '换一个问题',
      },
    ],
    'extract-setting': [
      {
        label: '候选 A',
        title: '沉淀人物',
        effect: '把正文里的动机和关系变化收成角色记忆。',
        risk: '过早定死人物，会削弱后续反转空间。',
        action: '收进人物',
      },
      {
        label: '候选 B',
        title: '沉淀规则',
        effect: '把场景规则和选择代价收进作品规则。',
        risk: '规则太满会挤压正文的探索感。',
        action: '收进规则',
      },
    ],
    'reader-promise-check': [
      {
        label: '候选 A',
        title: '核对标题',
        effect: '确认标题承诺和正文兑现一致。',
        risk: '标题过强会让正文显得没有满足感。',
        action: '检查标题',
      },
      {
        label: '候选 B',
        title: '核对请求回应',
        effect: '确认读者能看出这章回应了什么。',
        risk: '回应太直白会像任务反馈。',
        action: '检查请求回应',
      },
    ],
    'turn-request-into-scene': [
      {
        label: '候选 A',
        title: '先定人物',
        effect: '确认谁在场，谁承担读者想看的变化。',
        risk: '人物过多会让第一场戏分散。',
        action: '确认人物',
      },
      {
        label: '候选 B',
        title: '先定代价',
        effect: '先明确选择的后果，再进入写作台。',
        risk: '代价不清会让场景像设定说明。',
        action: '确认代价',
      },
    ],
    'pick-request': [
      {
        label: '候选 A',
        title: '高热回声',
        effect: '先处理读者最集中的愿望。',
        risk: '只追热度可能牺牲作者当前节奏。',
        action: '查看高热回声',
      },
      {
        label: '候选 B',
        title: '最近草稿',
        effect: '先把已经启动的写作推进到可发布状态。',
        risk: '新请求会继续等待。',
        action: '继续最近草稿',
      },
    ],
  }

  return variants[id] || [
    {
      label: '候选 A',
      title: '采用为候选',
      effect: '把当前动作先收成可比较建议。',
      risk: '采用前仍需要作者确认影响。',
      action: primaryLabel,
    },
    {
      label: '候选 B',
      title: '保留为备选',
      effect: '不改变正文，把动作放到稍后处理。',
      risk: '备选过多会增加后续筛选成本。',
      action: '保留为备选',
    },
  ]
}

function withCommandVariants(candidate: Omit<CommandCandidate, 'variants'>): CommandCandidate {
  return {
    ...candidate,
    variants: commandCandidateVariants(candidate.id, candidate.primaryLabel),
  }
}

export function commandCandidateFor(command: CreatorCommand, scope: CreatorAssistantScope): CommandCandidate {
  const candidates: Record<string, Omit<CommandCandidate, 'variants'>> = {
    'complete-next-beat': {
      id: command.id,
      title: '下一句候选',
      body: '生成 2 个方向：一个把压力落到人物行动，一个把悬念留到段尾。先放在候选卡里，由作者决定是否采用。',
      options: ['替换当前段落', '插入为备选', '放入分支', '废弃'],
      primaryLabel: '插入为备选',
      feedback: '已保留为备选；正文不会自动变化。',
    },
    'branch-sandbox': {
      id: command.id,
      title: '支线试写候选',
      body: '这条命令会创建一条可比较的实验方向：保留当前选择、换视角试写，或让另一个人物承担代价。',
      options: ['保留当前选择', '换视角试写', '放入分支', '废弃'],
      primaryLabel: '放入分支',
      feedback: '已放入支线试写；主线不会被改动。',
    },
    'rewrite-tone': {
      id: command.id,
      title: '改写语气候选',
      body: '这条命令会把解释性的句子先改成动作、感官和场景压力。候选只放在卡片里，作者确认前正文不变化。',
      options: ['替换当前段落', '插入为备选', '只看候选', '废弃'],
      primaryLabel: '插入为备选',
      feedback: '已生成改写候选；正文不会自动变化。',
    },
    'review-state-change': {
      id: command.id,
      title: '故事影响候选',
      body: '建议先查看人物目标、读者已知和世界线位置的变化，再决定是否进入发布包确认。',
      options: ['查看故事影响', '只保存草稿', '进入发布包确认', '稍后再看'],
      primaryLabel: '查看故事影响',
      feedback: '已把故事影响放到本次审阅重点。',
    },
    'open-flight-record': {
      id: command.id,
      title: '建议依据候选',
      body: '可以回看这章从请求、章节目标、方向选择到正文建议的建议依据，用来判断是否可信。',
      options: ['查看建议依据', '回到正文', '保留记录', '关闭'],
      primaryLabel: '查看建议依据',
      feedback: '已打开建议依据提醒。',
    },
    'socratic-question': {
      id: command.id,
      title: '关键追问候选',
      body: '这一段最值得追问的是：人物为什么现在才行动？如果不行动，他会失去什么？',
      options: ['回答这个问题', '换一个问题', '收进设定', '稍后再问'],
      primaryLabel: '回答这个问题',
      feedback: '已把追问保留在创作助手里。',
    },
    'extract-setting': {
      id: command.id,
      title: '设定沉淀候选',
      body: '从当前正文里可以沉淀人物动机、场景状态、世界规则和支线承诺，先作为候选等待作者确认。',
      options: ['收进人物', '收进场景', '收进规则', '暂不沉淀'],
      primaryLabel: '收进规则',
      feedback: '已生成设定候选；等待作者确认。',
    },
    'reader-promise-check': {
      id: command.id,
      title: '读者承诺候选',
      body: '发布前建议核对：标题是否承诺了正文兑现的内容，外界回声是否能看出被回应。',
      options: ['检查标题', '检查正文', '检查回声回应', '返回修改'],
      primaryLabel: '检查回声回应',
      feedback: '已把读者承诺纳入发布包。',
    },
    'turn-request-into-scene': {
      id: command.id,
      title: '场景候选',
      body: '这条回声可以变成一场戏：先确认谁在场、谁承担代价、选择会改变哪条线。',
      options: ['确认人物', '确认代价', '进入写作台', '稍后处理'],
      primaryLabel: '进入写作台',
      feedback: '已把请求整理成场景候选。',
    },
    'pick-request': {
      id: command.id,
      title: '今日优先候选',
      body: '建议优先处理已看到、高热或正在写的回声，先减少作者在列表里的选择成本。',
      options: ['查看高热回声', '继续最近草稿', '看待发布内容', '稍后再选'],
      primaryLabel: '查看高热回声',
      feedback: '已生成今日优先候选。',
    },
  }

  return withCommandVariants(candidates[command.id] || {
    id: command.id,
    title: scope === 'editor' ? '写作动作候选' : '下一步候选',
    body: command.detail,
    options: ['采用为候选', '保留为备选', '稍后再看', '废弃'],
    primaryLabel: '保留为备选',
    feedback: '已保留为候选。',
  })
}
