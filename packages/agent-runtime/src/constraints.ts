import type { ConstraintProfile, GenreKernel, SocraticCreateInput } from './types.js'

export const constraintProfiles: ConstraintProfile[] = [
  {
    id: 'xuanhuan-xianxia',
    displayName: '仙侠玄幻',
    layer: 'world',
    priority: 95,
    sourceRefs: ['rwref_0013', 'rwref_0027', 'rwref_0038'],
    signalTerms: ['修真', '仙侠', '玄幻', '灵气', '筑基', '金丹', '元婴', '化神', '飞升', '功法', '天劫', '灵根', '法宝'],
    entryModeSignals: ['获得传承', '觉醒灵根', '拜师入门', '秘境奇遇', '重生修仙'],
    toneSignals: ['逆天改命', '渡劫突破', '宗门大比', '秘境探险', '血脉觉醒'],
    rules: [
      {
        id: 'cultivation-must-have-cost',
        severity: 'hard',
        appliesWhen: ['genre_family=xuanhuan'],
        rule: '境界突破必须绑定资源消耗、身体代价或因果债务，不得无代价升级。',
        prohibitedTerms: ['一键升级', '满级重生', '无限资源', '瞬间满级', '天降外挂'],
        replacementGuidance: ['闭关突破', '境界跌落重修', '寻宝积累', '经年苦修', '机缘传承'],
        failBehavior: 'regenerate',
      },
      {
        id: 'xuanhuan-era-substrate',
        severity: 'hard',
        appliesWhen: ['genre_family=xuanhuan'],
        rule: '仙侠玄幻语境中的通信、交通、治疗和武器应使用世界内表达，避免现代科技词破坏时代基底。',
        prohibitedTerms: ['手机', '汽车', '枪械', '飞机', '医院'],
        replacementGuidance: ['传音玉简', '飞剑', '灵符弩', '传送阵', '医修洞府'],
        failBehavior: 'regenerate',
      },
    ],
  },
  {
    id: 'others-modern',
    displayName: '现代悬疑',
    layer: 'narrative',
    priority: 88,
    sourceRefs: ['rwref_0004', 'rwref_0016', 'rwref_0029'],
    signalTerms: ['现代悬疑', '推理', '案件', '证据链', '心理侧写', '现实主义', '多线叙事', '未解之谜', '时空交错', '都市谜案'],
    entryModeSignals: ['接手案件', '意外穿越', '职场新人', '身份暴露', '调查悬案', '旧案重启'],
    toneSignals: ['紧张悬疑', '逻辑推演', '历史穿插', '现代日常', '人性考验'],
    rules: [
      {
        id: 'logical-evidence-required',
        severity: 'hard',
        appliesWhen: ['genre_family=modern'],
        rule: '调查与推理必须依托完整证据链和合理心理侧写，不得凭空出现关键线索或靠读心术瞬间锁定答案。',
        prohibitedTerms: ['瞬间破案', '未解释证据', '读心术', '超自然破案', '无因巧合'],
        replacementGuidance: ['层层推理', '证据链完善', '心理侧写', '逻辑推理', '合理铺垫'],
        failBehavior: 'regenerate',
      },
      {
        id: 'modern-realism-boundary',
        severity: 'hard',
        appliesWhen: ['genre_family=modern'],
        rule: '现代类作品中的异常能力、穿越或历史架空必须有现实、科学或历史因果支撑。',
        prohibitedTerms: ['无解释修炼', '灵气复苏万能化', '法术破案', '系统面板破案'],
        replacementGuidance: ['调查训练', '社会机制', '技术线索', '制度漏洞'],
        failBehavior: 'regenerate',
      },
    ],
  },
  {
    id: 'game-litrpg',
    displayName: '游戏异界',
    layer: 'world',
    priority: 84,
    sourceRefs: ['rwref_0023', 'rwref_0024', 'rwref_0044'],
    signalTerms: ['虚拟游戏', '副本', '公会', '职业', '技能树', 'BOSS战', '装备掉落', 'PVP', '升级', '经验值', '隐藏任务', '攻略'],
    entryModeSignals: ['建角', '选择职业', '登录舱', '重生玩家', '隐藏职业'],
    toneSignals: ['团队协作', '策略博弈', '副本攻略', '竞技排名', '公会战争'],
    rules: [
      {
        id: 'system-interface-mandatory',
        severity: 'hard',
        appliesWhen: ['genre_family=game'],
        rule: '游戏异界必须明确存在可交互的系统界面、任务、奖励或数值反馈，成长来源不能模糊。',
        prohibitedTerms: ['无界面修炼', '随机升级', '模糊力量', '随意修炼', '法宝提升'],
        replacementGuidance: ['系统面板成长', '任务奖励升级', '明确数值', '系统任务驱动', '装备升级'],
        failBehavior: 'regenerate',
      },
      {
        id: 'quests-drive-progress',
        severity: 'hard',
        appliesWhen: ['genre_family=game'],
        rule: '剧情推进必须围绕任务目标、团队挑战、装备收集或失败惩罚展开。',
        prohibitedTerms: ['无任务驱动', '无惩罚', '随意成长', '自由漫游', '运气突破'],
        replacementGuidance: ['明确任务', '明确惩罚', '任务奖励', '副本攻略', '奖励爆率'],
        failBehavior: 'regenerate',
      },
    ],
  },
  {
    id: 'comedy-misfit',
    displayName: '喜剧反套路',
    layer: 'thematic',
    priority: 72,
    sourceRefs: ['rwref_0008', 'rwref_0010', 'rwref_0014', 'rwref_0019', 'rwref_0042'],
    signalTerms: ['吐槽', '反差', '沙雕', '掉马', '误会', '搞笑', '反套路', '段子', '笑点', '群像', '现代梗'],
    entryModeSignals: ['偷听心声', '掉马现场', '反派崩溃', '穿越搞笑', '超市经营'],
    toneSignals: ['轻松', '幽默', '搞笑日常', '反差反套路', '吐槽风暴'],
    rules: [
      {
        id: 'comedy-pressure-release',
        severity: 'soft',
        appliesWhen: ['genre_family=comedy'],
        rule: '喜剧反套路可以有危机，但危机必须被误会、反差行动或关系掉马转化为笑点推进。',
        prohibitedTerms: ['纯黑深虐', '无笑点压抑', '单调苦难'],
        replacementGuidance: ['误会升级', '反差行动', '关系掉马'],
        failBehavior: 'warn',
      },
    ],
  },
]

export const genreKernels: GenreKernel[] = [
  {
    id: 'kernel-xuanhuan-xianxia',
    name: '仙侠玄幻',
    category: 'xuanhuan',
    compatibleProfiles: ['xuanhuan-xianxia'],
    sourceRefs: ['rwref_0013', 'rwref_0027', 'rwref_0038'],
    thesis: '成长不是免费升级，而是资源、身体、因果和关系债共同塑造的修行压力。',
    antiThesis: '不要把境界、法宝和机缘写成无代价外挂。',
    pacingModel: '传承触发 -> 资源稀缺 -> 代价突破 -> 关系债显形 -> 天劫或追责',
    eventStructure: ['传承触发', '资源稀缺', '代价突破', '关系债显形', '天劫追责'],
    motiveRules: ['先写困境再写能力', '每次成长都要欠下某种债', '反派需要自洽的修行逻辑'],
    conflictRules: ['资源争夺必须改变关系', '奇遇必须留下因果', '突破必须引发新的限制'],
    climaxRules: ['高潮至少回收一个早期因果', '胜利必须带来新债务或新限制'],
    timeControls: { baseRate: 0.36, burst: 0.82, decay: 0.42, foreshadowPressure: 0.76, maxOpenLoops: 5 },
  },
  {
    id: 'kernel-others-modern',
    name: '现代悬疑',
    category: 'modern',
    compatibleProfiles: ['others-modern'],
    sourceRefs: ['rwref_0004', 'rwref_0016', 'rwref_0029'],
    thesis: '证据链不是答案，而是逼迫人物承担真相成本的压力系统。',
    antiThesis: '不要用巧合、读心或万能超自然解释替代证据链。',
    pacingModel: '现实异常 -> 证据矛盾 -> 心理侧写 -> 风险暴露 -> 真相代价',
    eventStructure: ['现实异常', '证据矛盾', '心理侧写', '风险暴露', '真相代价'],
    motiveRules: ['每个关键人物都要保护一个秘密', '主角不能免费得到真相', '关系也是证据来源'],
    conflictRules: ['线索必须改变行动', '反转要能回看成立', '公开证据会伤害某个保护对象'],
    climaxRules: ['高潮同时揭示一个事实和一个误解', '证据公开必须制造新后果'],
    timeControls: { baseRate: 0.42, burst: 0.74, decay: 0.5, foreshadowPressure: 0.68, maxOpenLoops: 4 },
  },
  {
    id: 'kernel-game-litrpg',
    name: '游戏异界',
    category: 'game',
    compatibleProfiles: ['game-litrpg'],
    sourceRefs: ['rwref_0023', 'rwref_0024', 'rwref_0044'],
    thesis: '成长由任务、职业分工、装备反馈和团队策略共同驱动。',
    antiThesis: '不要让主角脱离任务结构随机变强，也不要让团队职业失去意义。',
    pacingModel: '登录/建角 -> 任务目标 -> 队伍协作 -> 奖惩反馈 -> 排名或公会压力',
    eventStructure: ['登录建角', '任务目标', '队伍协作', '奖惩反馈', '公会压力'],
    motiveRules: ['成长目标必须可见', '失败惩罚必须明确', '团队关系推动下一场挑战'],
    conflictRules: ['个人操作与职业克制冲突', '任务奖励与公会利益冲突', '信息优势必须付出暴露风险'],
    climaxRules: ['高潮必须同时兑现任务目标和团队代价'],
    timeControls: { baseRate: 0.52, burst: 0.76, decay: 0.44, foreshadowPressure: 0.5, maxOpenLoops: 3 },
  },
  {
    id: 'kernel-comedy-misfit',
    name: '喜剧反套路',
    category: 'comedy',
    compatibleProfiles: ['comedy-misfit'],
    sourceRefs: ['rwref_0008', 'rwref_0010', 'rwref_0014', 'rwref_0019', 'rwref_0042'],
    thesis: '笑点来自误会、身份反差和行动错位，但每个笑点仍要推动关系或局势变化。',
    antiThesis: '不要只堆段子；笑点必须改变人物处境。',
    pacingModel: '误会出现 -> 反差行动 -> 掉马边缘 -> 群像误读 -> 关系推进',
    eventStructure: ['误会出现', '反差行动', '掉马边缘', '群像误读', '关系推进'],
    motiveRules: ['人物要认真做荒诞事', '误会来自真实信息差', '每个笑点改变一段关系'],
    conflictRules: ['危机要被反差行动转化', '吐槽不能替代行动', '群像误读必须升级选择压力'],
    climaxRules: ['高潮让身份或误会局部公开，并产生新的关系代价'],
    timeControls: { baseRate: 0.48, burst: 0.62, decay: 0.58, foreshadowPressure: 0.46, maxOpenLoops: 4 },
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
  return constraintProfiles
    .filter(profile => includesAny(text, profile.signalTerms) || includesAny(text, profile.entryModeSignals) || includesAny(text, profile.toneSignals))
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
