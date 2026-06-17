import type { WorldTemplate } from '@/features/parallel-universe/types'

export interface MarketTrendItem {
  id: string
  rank: number
  label: string
  category: string
  sample: string
  signals: string[]
  tone: string
  heat: number
  template_id: string
  template_title: string
  hooks: string
  keywords: string
  cadence?: 'weekly' | 'monthly'
  recommendation_weight?: number
}

export interface MarketTemplateRecommendation {
  template_id: string
  template_title: string
  rank: number
  label: string
  tone: string
  hooks: string
  keywords: string
  reason: string
}

export interface MarketTrendScanScheduleItem {
  cadence: 'weekly' | 'monthly'
  cron: string
  window_days: number
  timezone: string
  product_effect: string
}

export interface MarketTrendFunctionCall {
  name: 'scan_market_trends'
  description: string
  arguments: {
    cadence: 'weekly' | 'monthly'
    window_days: number
    force: boolean
  }
  schema: {
    name: 'scan_market_trends'
    description: string
    parameters: Record<string, unknown>
  }
  schedule: MarketTrendScanScheduleItem
  status: string
}

export interface MarketTrendPayload {
  cadence: 'weekly' | 'monthly'
  generated_at: string
  next_refresh: string
  source_status: string
  scan_schedule: Record<'weekly' | 'monthly', MarketTrendScanScheduleItem>
  function_call: MarketTrendFunctionCall
  source_adapters?: Array<{
    id: string
    status: string
    handoff?: string
  }>
  ops?: {
    source_health: Array<{
      id: string
      status: string
      message: string
      items: number
      scanned_at: string
    }>
    audit: {
      cadence: 'weekly' | 'monthly'
      window_days: number
      sources_attempted: number
      sources_succeeded: number
      sources_failed: number
      dedupe_key: string
      normalization: string
      fallback_used: boolean
    }
    weight_changes: Array<{
      template_id: string
      rank: number
      recommendation_weight: number
    }>
    manual_locks: string[]
  }
  top_categories: string[]
  trends: MarketTrendItem[]
  template_recommendations: MarketTemplateRecommendation[]
  refresh_policy: {
    weekly: string
    monthly: string
  }
}

export const marketTrendFallback: MarketTrendPayload = {
  cadence: 'weekly',
  generated_at: 'local-snapshot',
  next_refresh: '下一个周周期',
  source_status: 'local_snapshot',
  scan_schedule: {
    weekly: {
      cadence: 'weekly',
      cron: '0 8 * * MON',
      window_days: 7,
      timezone: 'Asia/Shanghai',
      product_effect: 'refresh_homepage_recommendations_and_creator_template_order',
    },
    monthly: {
      cadence: 'monthly',
      cron: '0 8 1 * *',
      window_days: 30,
      timezone: 'Asia/Shanghai',
      product_effect: 'recalibrate_template_weights_and_new_template_candidates',
    },
  },
  function_call: {
    name: 'scan_market_trends',
    description: 'Scan hot fiction topic directions and refresh template recommendation weights.',
    arguments: {
      cadence: 'weekly',
      window_days: 7,
      force: false,
    },
    schema: {
      name: 'scan_market_trends',
      description: 'Scan hot fiction topic directions and refresh template recommendation weights.',
      parameters: {},
    },
    schedule: {
      cadence: 'weekly',
      cron: '0 8 * * MON',
      window_days: 7,
      timezone: 'Asia/Shanghai',
      product_effect: 'refresh_homepage_recommendations_and_creator_template_order',
    },
    status: 'local_snapshot_ready',
  },
  source_adapters: [
    {
      id: 'local_snapshot',
      status: 'fallback',
    },
  ],
  ops: {
    source_health: [
      {
        id: 'local_snapshot',
        status: 'fallback',
        message: '本地兜底索引。',
        items: 6,
        scanned_at: 'local-snapshot',
      },
    ],
    audit: {
      cadence: 'weekly',
      window_days: 7,
      sources_attempted: 1,
      sources_succeeded: 1,
      sources_failed: 0,
      dedupe_key: 'template_id_or_trend_id',
      normalization: 'heat_0_100_rank_weight',
      fallback_used: true,
    },
    weight_changes: [],
    manual_locks: [],
  },
  top_categories: ['脑洞都市', '系统流', '玄幻悬疑', '都市谜案', '仙侠权谋', '历史权谋', '情感成长'],
  trends: [
    {
      id: 'urban-brain-system',
      rank: 1,
      label: '脑洞都市',
      category: '都市脑洞',
      sample: '反内卷、摸鱼变强、异能反转',
      signals: ['系统流', '都市异能', '快节奏'],
      tone: '高热',
      heat: 98,
      template_id: 'algorithm-city',
      template_title: '算法城市',
      hooks: '身份错位、记忆备份、自我定义',
      keywords: '算法城市、备份人格、都市高压、异常规则',
    },
    {
      id: 'system-mission-ledger',
      rank: 2,
      label: '系统流',
      category: '系统流',
      sample: '任务、代价、身份反噬',
      signals: ['系统流', '任务代价', '身份反噬'],
      tone: '高热',
      heat: 97,
      template_id: 'echo-ledger',
      template_title: '任务回声',
      hooks: '任务不是奖励、记忆回收、身份反噬',
      keywords: '系统流、任务代价、记忆回声、身份反噬',
    },
    {
      id: 'xuanhuan-suspense-rules',
      rank: 3,
      label: '玄幻悬疑',
      category: '玄幻悬疑',
      sample: '灯塔、古契、失落王朝',
      signals: ['规则怪谈', '中式恐怖', '禁忌真相'],
      tone: '强悬疑',
      heat: 96,
      template_id: 'beacon-beyond',
      template_title: '灯塔之外',
      hooks: '命运反转、禁忌真相、王朝旧债',
      keywords: '灯塔、古契、失落王朝、真相代价',
    },
    {
      id: 'urban-cold-case',
      rank: 4,
      label: '都市谜案',
      category: '现实悬疑',
      sample: '雨夜、旧案、证据反转',
      signals: ['冷案重启', '社会派推理', '证据冲突'],
      tone: '上升',
      heat: 91,
      template_id: 'rain-bridge',
      template_title: '雨夜桥边',
      hooks: '证据冲突、身份互保、真相迟到',
      keywords: '雨夜、旧案、录像证据、证人保护',
    },
    {
      id: 'immortal-contract-politics',
      rank: 5,
      label: '仙侠权谋',
      category: '仙侠修仙',
      sample: '宗门、契书、背叛代价',
      signals: ['宗门经营', '气运博弈', '契约代价'],
      tone: '精选',
      heat: 88,
      template_id: 'jade-contract',
      template_title: '玉京契书',
      hooks: '契约反噬、师门清算、修行债务',
      keywords: '宗门、契书、背叛代价、修仙债务',
    },
    {
      id: 'frontier-edict-politics',
      rank: 6,
      label: '历史权谋',
      category: '历史架空',
      sample: '边城、密诏、旧臣抉择',
      signals: ['边塞经营', '王朝博弈', '忠诚困局'],
      tone: '稳热',
      heat: 86,
      template_id: 'frontier-edict',
      template_title: '边城密诏',
      hooks: '密诏两难、旧臣抉择、军民自决',
      keywords: '边城、密诏、旧臣抉择、军民自决',
    },
    {
      id: 'emotional-growth-letter',
      rank: 7,
      label: '情感成长',
      category: '情感成长',
      sample: '来信、错过、重逢选择',
      signals: ['破镜重圆', '记忆代价', '关系成长'],
      tone: '共情',
      heat: 82,
      template_id: 'lotus-lane',
      template_title: '莲巷来信',
      hooks: '错过重逢、记忆代价、重新选择',
      keywords: '来信、错过、重逢选择、记忆代价',
    },
  ],
  template_recommendations: [],
  refresh_policy: {
    weekly: '每周更新首页推荐和创作方向排序。',
    monthly: '每月校准长期题材趋势。',
  },
}

marketTrendFallback.template_recommendations = marketTrendFallback.trends.map((item, index) => ({
  template_id: item.template_id,
  template_title: item.template_title,
  rank: index + 1,
  label: item.label,
  tone: item.tone,
  hooks: item.hooks,
  keywords: item.keywords,
  reason: `${item.label}热度 ${item.heat}`,
}))

marketTrendFallback.ops!.weight_changes = marketTrendFallback.trends.map((item, index) => ({
  template_id: item.template_id,
  rank: index + 1,
  recommendation_weight: maxRecommendationWeight(index + 1),
}))

function maxRecommendationWeight(rank: number) {
  return Math.max(1, 101 - rank)
}

export function trendForTemplate(payload: MarketTrendPayload, templateId: string): MarketTrendItem {
  return payload.trends.find(item => item.template_id === templateId)
    || marketTrendFallback.trends.find(item => item.template_id === templateId)
    || marketTrendFallback.trends[1]
}

export function writingToneForTrend(item: Pick<MarketTrendItem, 'template_id' | 'tone'>): string {
  const tones: Record<string, string> = {
    'algorithm-city': '快节奏、荒诞、带反转',
    'echo-ledger': '快节奏、任务压迫、身份反噬',
    'beacon-beyond': '阴冷、密集、禁忌感强',
    'rain-bridge': '冷静、潮湿、证据感强',
    'jade-contract': '克制、古典、代价感强',
    'frontier-edict': '沉稳、压迫、权谋张力强',
    'lotus-lane': '温柔、遗憾、情绪细腻',
  }
  return tones[item.template_id] || item.tone
}

const creatorSeedSignals: Record<string, string[]> = {
  'algorithm-city': ['算法', '系统', '备份', '记忆', '都市', '异能', '身份', '高压', '清除', '协议'],
  'echo-ledger': ['系统流', '任务', '奖励', '惩罚', '记忆', '回声', '身份', '债务', '终端'],
  'beacon-beyond': ['灯塔', '灯码', '雾港', '王庭', '古契', '失落', '王朝', '禁忌', '真相'],
  'rain-bridge': ['雨夜', '桥', '桥洞', '录像', '监控', '证据', '旧案', '证人', '冷案', '警方'],
  'jade-contract': ['宗门', '契书', '仙侠', '修仙', '师门', '灵契', '气运', '祭坛', '背叛'],
  'frontier-edict': ['边城', '密诏', '守城', '开门', '迎敌', '旧臣', '军民', '王朝', '边塞'],
  'lotus-lane': ['来信', '错过', '重逢', '情感', '关系', '记忆', '遗憾', '莲巷', '明天'],
}

function scoreTextMatch(text: string, signals: string[]) {
  return signals.reduce((score, signal) => {
    const clean = signal.trim().toLowerCase()
    if (!clean) return score
    return text.includes(clean) ? score + Math.max(1, Math.min(6, clean.length)) : score
  }, 0)
}

export function inferTemplateIdFromStorySeed(
  seed: string,
  payload: MarketTrendPayload,
  fallbackTemplateId = 'beacon-beyond',
): string {
  const text = seed.trim().toLowerCase()
  if (!text) return fallbackTemplateId

  const candidates = payload.trends.map(item => {
    const trendSignals = [
      item.label,
      item.category,
      item.sample,
      item.hooks,
      item.keywords,
      item.template_title,
      ...item.signals,
      ...(creatorSeedSignals[item.template_id] || []),
    ]
    const directLabel = text.includes(item.label.toLowerCase()) ? 12 : 0
    const score = directLabel + scoreTextMatch(text, trendSignals)
    return { templateId: item.template_id, score }
  })

  const winner = candidates.sort((a, b) => b.score - a.score)[0]
  const fallbackScore = candidates.find(item => item.templateId === fallbackTemplateId)?.score || 0
  if (!winner || winner.score < 6) return fallbackTemplateId
  if (fallbackScore >= winner.score - 2) return fallbackTemplateId
  return winner.templateId
}

export function orderTemplatesByMarketTrends(
  templates: WorldTemplate[],
  payload: MarketTrendPayload,
): WorldTemplate[] {
  const order = new Map(payload.template_recommendations.map((item, index) => [item.template_id, index]))
  return [...templates].sort((a, b) => {
    const left = order.has(a.id) ? Number(order.get(a.id)) : 999
    const right = order.has(b.id) ? Number(order.get(b.id)) : 999
    if (left !== right) return left - right
    return b.choiceCount - a.choiceCount
  })
}
