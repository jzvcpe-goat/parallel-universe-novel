import type { WritingAssistLensId } from '@/features/creator-decision/types'

const lensLabels: Record<WritingAssistLensId, string> = {
  continuity: '前后因果',
  tension: '场景压力',
  information_control: '信息揭示',
  character_agency: '人物选择',
  voice: '人物声线',
  freshness: '表达新鲜度',
  genre_fulfillment: '类型兑现',
  repetition: '重复与变奏',
  exposition: '设定交代',
  scene_detail: '现场细节',
  pacing: '推进节奏',
  pov_focalization: '视角距离',
  dialogue_subtext: '对话潜台词',
  prose_rhythm: '句段节律',
  imagery_system: '意象线索',
  theme_progression: '主题推进',
  emotional_arc: '情绪弧线',
  ending_payoff: '段尾兑现',
  cultural_specificity: '生活质感',
}

export function creatorWritingAssistLensLabel(lensId: WritingAssistLensId) {
  return lensLabels[lensId]
}
