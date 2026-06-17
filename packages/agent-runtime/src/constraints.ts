import type { ConstraintProfile, GenreKernel, SocraticCreateInput } from './types.js'

export const constraintProfiles: ConstraintProfile[] = [
  {
    id: 'western-fantasy-transmigration-non-game',
    displayName: '西幻穿越非游戏化',
    layer: 'world',
    priority: 100,
    signalTerms: ['西幻', '西方玄幻', '异世界', '地下城', '圣堂', '魔法', '佣兵', '公会', '魔物'],
    entryModeSignals: ['穿越', '醒来', '异世界', '前世', '来到另一个世界'],
    toneSignals: ['非游戏化', '不是游戏', '不要系统', '没有系统', '本土感', '中文网文'],
    rules: [
      {
        id: 'wf-world-substrate',
        severity: 'hard',
        appliesWhen: ['genre=western_fantasy', 'entry=transmigration'],
        rule: '制度、职业、地名和物件必须服从西方玄幻现实，不默认借用中式古代官署、宗门或科举体系。',
        prohibitedTerms: ['清河县', '县衙', '衙门', '仵作', '宗门', '科举', '大理寺', '锦衣卫'],
        replacementGuidance: ['城邦/领地/边境矿城', '治安官/圣堂书记/验尸修士/医师', '行会/学院/圣堂派系'],
        failBehavior: 'block',
      },
      {
        id: 'wf-no-game-interface',
        severity: 'hard',
        appliesWhen: ['tone=non_game'],
        rule: '地下城必须是现实地理、灾厄源、矿井、遗迹或制度化边境，禁止系统面板、玩家、经验值和掉落奖励等游戏 UI。',
        prohibitedTerms: ['系统面板', '玩家', '经验值', '等级面板', '副本奖励', '打怪掉落', '职业数值'],
        replacementGuidance: ['地下城/遗迹/矿井/禁区', '契约报酬/遗物/生存资源', '身份/技艺/训练痕迹'],
        failBehavior: 'block',
      },
      {
        id: 'wf-local-feel-without-cn-bureaucracy',
        severity: 'soft',
        appliesWhen: ['tone=local_webnovel_feel'],
        rule: '本土感落在主角处事、人情账、风险规避、信息差和小人物破局，不把世界制度改成古代中国。',
        failBehavior: 'warn',
      },
    ],
  },
  {
    id: 'xuanhuan-suspense',
    displayName: '玄幻悬疑',
    layer: 'narrative',
    priority: 80,
    signalTerms: ['玄幻悬疑', '东方玄幻悬疑', '灯塔', '古契', '失落王朝', '真相', '禁忌'],
    entryModeSignals: ['异常开场', '旧案', '失踪', '禁忌物'],
    toneSignals: ['高压', '真相代价', '伏笔'],
    rules: [
      {
        id: 'xh-truth-cost',
        severity: 'hard',
        appliesWhen: ['genre=xuanhuan_suspense'],
        rule: '每个真相必须带来关系、时间或身份代价，不能只作为谜语展示。',
        failBehavior: 'regenerate',
      },
      {
        id: 'xh-foreshadow-anchor',
        severity: 'soft',
        appliesWhen: ['genre=xuanhuan_suspense'],
        rule: '首段必须留下可回收的物件、地点或誓约伏笔。',
        failBehavior: 'warn',
      },
    ],
  },
  {
    id: 'urban-mystery',
    displayName: '都市谜案',
    layer: 'narrative',
    priority: 70,
    signalTerms: ['都市', '谜案', '旧案', '证据', '雨夜', '监控', '失踪', '案卷'],
    entryModeSignals: ['旧案重启', '证据反转', '现实调查'],
    toneSignals: ['冷感', '快节奏', '证人保护'],
    rules: [
      {
        id: 'urban-evidence-chain',
        severity: 'hard',
        appliesWhen: ['genre=urban_mystery'],
        rule: '谜案推进必须依赖证据链、人物动机和现实风险，不依赖超自然万能解释。',
        failBehavior: 'regenerate',
      },
      {
        id: 'urban-first-reversal',
        severity: 'soft',
        appliesWhen: ['genre=urban_mystery'],
        rule: '首段应出现一个让证据含义反转的细节。',
        failBehavior: 'warn',
      },
    ],
  },
]

export const genreKernels: GenreKernel[] = [
  {
    id: 'kernel-western-frontier-transmigration',
    name: '西幻边境穿越',
    category: 'western_fantasy',
    compatibleProfiles: ['western-fantasy-transmigration-non-game'],
    thesis: '外来者的优势来自认知差、社会债和制度裂缝，而不是系统面板或数值碾压。',
    antiThesis: '不要把地下城写成游戏副本，也不要把西幻制度改成中式官署。',
    pacingModel: '压迫开场 -> 身份成本 -> 地下城扰动 -> 社会债 -> 制度冲突 -> 代价胜利',
    eventStructure: ['异界醒来', '身份代价', '边境契约', '地下城扰动', '社会债', '制度审判', '代价胜利'],
    motiveRules: ['生存优先', '信息差破局', '先欠债再换资源'],
    conflictRules: ['制度不信任外来者', '地下城灾厄逼近日常秩序', '人情债与真相代价冲突'],
    climaxRules: ['胜利必须付出身份、关系或时间代价'],
    timeControls: { baseRate: 0.42, burst: 0.72, decay: 0.38, foreshadowPressure: 0.66, maxOpenLoops: 4 },
  },
  {
    id: 'kernel-xuanhuan-suspense',
    name: '玄幻悬疑',
    category: 'xuanhuan_suspense',
    compatibleProfiles: ['xuanhuan-suspense'],
    thesis: '异常物件打开旧真相，主角每靠近一次答案就失去一种安全感。',
    antiThesis: '不要只堆设定名词；每个谜面都要拖动人物选择。',
    pacingModel: '异常 -> 查证 -> 代价 -> 反证 -> 选择',
    eventStructure: ['异常出现', '旧线索复燃', '证词矛盾', '代价选择', '伏笔回响'],
    motiveRules: ['守护某人', '追索失落真相', '避免旧错重演'],
    conflictRules: ['真相与秩序冲突', '救人与公开冲突', '伏笔成熟带来压力'],
    climaxRules: ['高潮必须回收至少一个首章伏笔'],
    timeControls: { baseRate: 0.36, burst: 0.7, decay: 0.42, foreshadowPressure: 0.74, maxOpenLoops: 5 },
  },
  {
    id: 'kernel-urban-mystery',
    name: '都市谜案',
    category: 'urban_mystery',
    compatibleProfiles: ['urban-mystery'],
    thesis: '证据不是答案，而是迫使人物选择是否承担真相的代价。',
    antiThesis: '不要让巧合替代证据链。',
    pacingModel: '现实异常 -> 证据反转 -> 关系压力 -> 旧案重启 -> 决策',
    eventStructure: ['证据异常', '目击者摇摆', '旧案重启', '保护或公开', '反转代价'],
    motiveRules: ['保护证人', '洗清旧案', '揭开现实利益链'],
    conflictRules: ['真相公开会伤害保护对象', '证据链被权力重写', '主角信用被消耗'],
    climaxRules: ['高潮必须让证据与人物动机同时反转'],
    timeControls: { baseRate: 0.48, burst: 0.68, decay: 0.46, foreshadowPressure: 0.58, maxOpenLoops: 3 },
  },
]

function textFromInput(input: SocraticCreateInput): string {
  return [
    input.seed,
    input.genre,
    input.selectedTemplate?.genre,
    input.selectedTemplate?.title,
    input.selectedTemplate?.openingPremise,
    JSON.stringify(input.context || {}),
  ].filter(Boolean).join(' ')
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.toLowerCase().includes(term.toLowerCase()))
}

export function resolveConstraints(input: SocraticCreateInput): ConstraintProfile[] {
  const text = textFromInput(input)
  const westernActive = includesAny(text, constraintProfiles[0].signalTerms)
  return constraintProfiles
    .filter(profile => includesAny(text, profile.signalTerms) || includesAny(text, profile.entryModeSignals))
    .filter(profile => !(westernActive && profile.id === 'xuanhuan-suspense' && !text.includes('玄幻悬疑')))
    .sort((a, b) => b.priority - a.priority)
}

export function resolveKernels(profiles: ConstraintProfile[]): GenreKernel[] {
  const profileIds = new Set(profiles.map(profile => profile.id))
  return genreKernels.filter(kernel => kernel.compatibleProfiles.some(id => profileIds.has(id)))
}

export function evaluateConstraintViolations(text: string, profiles: ConstraintProfile[]) {
  return profiles.flatMap(profile =>
    profile.rules.flatMap(rule => {
      const prohibited = rule.prohibitedTerms || []
      const hits = prohibited.filter(term => text.includes(term))
      if (hits.length === 0) return []
      return [{
        ruleId: rule.id,
        severity: rule.severity,
        message: `候选文本触发「${profile.displayName}」约束：${hits.join('、')}`,
      }]
    }),
  )
}
