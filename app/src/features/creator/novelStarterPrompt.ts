export type NovelStarterPhase = 'seed' | 'break_soil' | 'growth'

export const novelArchitectureDimensions = [
  { id: 'premise', label: '故事钩子', source: 'manual', detail: '作者给出不可替代的第一画面或核心异常。' },
  { id: 'protagonist', label: '主角缺口', source: 'manual_confirm', detail: '系统可提案，但姓名、欲望、伤口和底线需要作者确认。' },
  { id: 'characters', label: '人物关系', source: 'manual_confirm', detail: '关键关系和情感债由作者确认，角色功能位可由模板建议。' },
  { id: 'scene', label: '场景锚点', source: 'manual_or_template', detail: '首章地点、时代质感和可见物件要落到具体画面。' },
  { id: 'world_rule', label: '世界规则', source: 'manual_confirm', detail: '规则必须制造选择代价，不能只是解释设定。' },
  { id: 'conflict_engine', label: '冲突推进', source: 'memo_frozen', detail: '由类型模板给出升级、追凶、权谋、情感拉扯等推进机制。' },
  { id: 'reader_hook', label: '章节钩子', source: 'memo_frozen', detail: '由平台化结构沉淀首章钩子、章末悬念和爽点密度。' },
  { id: 'pov_tone', label: '视角与文风', source: 'manual_confirm', detail: '人称、叙述距离、句子密度和情绪温度需要快速确认。' },
  { id: 'outline', label: '章纲骨架', source: 'memo_seeded', detail: '前 3-10 章由类型节拍预置，正文推进中逐步更新。' },
] as const

export const novelInputSourceMatrix = {
  manual: [
    '故事种子 / 第一画面 / 核心异常',
    '主角姓名、身份、欲望、伤口、底线',
    '关键人物关系和情感债',
    '首章场景的特殊物件、地点和时代质感',
    '世界规则中必须保留或禁止的部分',
    '叙事人称、文风和读者情绪方向',
  ],
  memoFrozen: [
    '类型节拍：开局、升级、反转、章末钩子密度',
    '角色功能位：对手、盟友、诱惑者、见证者、导师位',
    '主流题材冲突模型：资源争夺、真相追索、权力博弈、关系拉扯',
    '场景库参数：首章高压地点、转折场、信息差场、代价场',
    '卷纲骨架：前详后略、阶段目标、高潮回收节奏',
    '质量阈值：人设统一、开篇不过载、冲突推动剧情、钩子清晰',
  ],
  autoDerived: [
    '从正文沉淀故事笔记并分类保存',
    '把用户回答写回下一段正文',
    '生成候选人物卡、场景卡、伏笔卡和章纲卡',
    '检查人物一致性、时间一致性、伏笔回收和阅读自然度',
  ],
} as const

export const novelStarterPrompt = {
  source: 'novel_starter_guide',
  version: 'story_architecture_v2',
  title: '小说启动引导',
  promise: '用三分钟创作属于你的故事',
  firstQuestion: '你脑海里最先浮现的是哪个画面？',
  emptyTitle: '先给我一个画面',
  emptyDescription: '一个画面、一句话、一种情绪都可以。收到后我会先写 300-800 字开场，同时沉淀人物、场景、世界规则和冲突推进。',
  seedExamples: [
    '一座会在午夜改写名字的城市',
    '雨夜里，一个少女望着燃烧的图书馆',
    '失踪的灯塔守夜人留下最后一页航海日志',
  ],
  layers: [
    {
      id: 'seed',
      title: '种子',
      detail: '只收一个开放灵感，不分类、不分析、不问卷。',
    },
    {
      id: 'break_soil',
      title: '破土',
      detail: '立即写出可读开场，让设定从正文里自然露出来。',
    },
    {
      id: 'growth',
      title: '生长',
      detail: '用户确认感觉后，再围绕下一场戏补关键设定。',
    },
  ],
  principles: [
    '永远先给正文，后问问题',
    '每轮最多两个问题',
    '不用复杂表格、问卷或十步设定表',
    '问题必须能在 30 秒内回答',
    '每次回答都要体现在下一段文字里',
    '每段正文都要维护人物、场景、规则、冲突和钩子',
    '类型节奏由 Memo 模板预置，原创意图由作者确认',
  ],
  requestContext: {
    guide_id: 'novel_starter_guide',
    guide_version: 'story_architecture_v2',
    launch_method: 'seed_break_grow',
    rule: 'write_first_ask_later',
    max_questions_per_turn: 2,
    creative_dimensions: novelArchitectureDimensions.map(item => item.id),
  },
  inputSourceMatrix: novelInputSourceMatrix,
} as const

function clean(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function inferNovelStarterTone(seed: string) {
  const text = clean(seed)
  if (!text) return '先用强钩子和清晰画面试写'
  if (/(雨|遗憾|错过|孤独|旧|信|梦)/.test(text)) return '克制、潮湿、带一点未说出口的遗憾'
  if (/(灯塔|失踪|档案|真相|案件|录像|秘密)/.test(text)) return '悬疑、压迫、让真相带着代价'
  if (/(修仙|玄幻|神|妖|魔法|宗门|契)/.test(text)) return '奇幻、命运感、每个规则都要付代价'
  if (/(城市|赛博|AI|算法|未来|太空)/i.test(text)) return '现代异化、冷光、规则像系统一样逼近人'
  return '先抓住异常，再让人物行动'
}

export function inferNovelStarterCards(seed: string, latest = '') {
  const subject = clean(seed || latest)
  const tone = inferNovelStarterTone(subject)
  const genreSignal = /(修仙|玄幻|神|妖|魔法|宗门|契)/.test(subject)
    ? '玄幻 / 奇幻'
    : /(城市|案件|侦探|失踪|录像|档案|都市)/.test(subject)
      ? '都市悬疑'
      : /(AI|算法|未来|太空|赛博)/i.test(subject)
        ? '科幻'
        : '待从正文里确认'
  return {
    seed: subject,
    tone,
    genre_signal: genreSignal,
    protagonist_hint: '先让主角在行动里出现，不急着贴标签',
    character_web_hint: '至少保留一个对手或关系债，让主角不是独自在设定里行动',
    opening_scene_hint: subject ? `首章场景围绕“${subject}”落到可见物件、地点和压力源` : '先用具体地点和可见物件承载故事压力',
    pov_hint: '默认第三人称有限视角；若用户给出强烈自述感，再切换第一人称',
    world_rule_hint: '世界规则只在影响下一场戏时确认',
    central_tension: '异常、选择和代价之间的拉扯',
    conflict_engine_hint: '由类型模板提供推进机制，用户只确认最在意的代价',
    outline_hint: '先生成首章和前三章方向，后续章纲跟随正文持续更新',
    input_sources: {
      manual: [...novelInputSourceMatrix.manual],
      memo_frozen: [...novelInputSourceMatrix.memoFrozen],
      auto_derived: [...novelInputSourceMatrix.autoDerived],
    },
    confirmed: subject ? [`故事种子：${subject}`, `开场气质：${tone}`, `类型信号：${genreSignal}`] : [],
    open_questions: subject ? ['这段开场的气质对吗？', '主角的第一处伤口更像失去、亏欠，还是不甘？'] : [],
  }
}

export function buildNovelStarterStory(seed: string, phase: NovelStarterPhase) {
  const subject = clean(seed) || '一个还没有说出口的故事画面'

  if (phase === 'growth') {
    return (
      `主角终于伸手碰到那件东西时，房间里的声音全都低了下去。不是安静，而是像有人把世界按进水里，只剩他的心跳一下一下撞着耳膜。\n\n` +
      `他看见的不是答案，而是一段本不该属于他的记忆：有人站在同样的夜色里，说出了和“${subject}”有关的第一句谎话。\n\n` +
      `那句谎话并不宏大，甚至很轻。轻到当年所有人都愿意相信它，轻到现在追究起来反而显得残忍。可故事最锋利的地方就在这里：如果他继续查，就会伤到还活着的人；如果他停下，失踪的、死去的、被抹掉名字的人，就只能继续替这座世界保持体面。\n\n` +
      `门外的脚步又回来了。这一次，对方没有经过，而是停在门口，轻轻敲了三下。主角把那件东西攥进掌心，终于明白下一章不是解释世界，而是决定先相信谁。`
    )
  }

  return (
    `凌晨的风从门缝里挤进来时，主角第一次意识到，自己以为已经结束的事，其实只是换了一种方式回到眼前。\n\n` +
    `那件东西安静得不合时宜，像一枚还没有爆开的雷。它不解释来处，也不请求相信，只把一个事实摆在那里：有人在很久以前替他做过选择，而现在，代价终于轮到他来付。\n\n` +
    `他没有立刻伸手。真正吓人的不是异常本身，而是异常精准地知道他的软处。窗外有人经过，脚步在门口停了一下，又继续往前。就在那几秒里，他听见自己心里冒出一个念头：如果现在假装没看见，天亮以后，一切也许还能照旧。\n\n` +
    `可那东西偏偏在这时动了。不是猛烈的动，而是轻轻偏转了一寸，像有人从看不见的地方把故事翻到下一页。纸面、屏幕、雨痕或火光，全都指向同一句话：别把真相交给第一个赶来的人。\n\n` +
    `他终于把它翻过来，看见背面还有一行极小的字。那不是署名，也不是警告，而是一个只有他知道的人名。\n\n` +
    `这个名字让“${subject}”不再只是异常。它变成了一封迟到的通知：有人还活着，有人撒了谎，而他必须在第一个赶来的人开口之前，决定自己要先保护谁。`
  )
}

export function buildNovelStarterQuestions(phase: NovelStarterPhase) {
  if (phase === 'seed') return [novelStarterPrompt.firstQuestion]
  if (phase === 'growth') return ['下一段我们要让主角主动追上危险，还是先让一个关系人物付出代价？']
  return ['我把它写成这种开场气质，对吗？', '主角的第一处伤口更像失去、亏欠，还是不甘？']
}
