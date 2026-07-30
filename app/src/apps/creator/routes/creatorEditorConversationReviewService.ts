import type { LiteraryDimension } from '@/features/creator-decision/types'

export type CreatorConversationReviewCommand = {
  recognized: true
  kind: 'review_current_manuscript'
  focusDimensions: LiteraryDimension[]
}

export type CreatorConversationReviewCommandResult =
  | CreatorConversationReviewCommand
  | { recognized: false }

const REVIEW_REQUEST = /(审阅|评审|复查|检查.{0,12}(?:正文|本章|连续性|因果|文学|问题)|连续性.{0,8}(?:检查|问题)|因果.{0,8}(?:检查|误读|问题)|定位.{0,8}原文)/

const DIMENSION_SIGNALS: Array<[LiteraryDimension, RegExp]> = [
  ['continuity', /(因果|连续性|前后矛盾|衔接)/],
  ['tension', /(张力|冲突|压力)/],
  ['information_control', /(信息边界|提前揭晓|人物所知)/],
  ['character_agency', /(人物选择|人物能动性|主动性)/],
  ['voice', /(声线|文风|语气)/],
  ['freshness', /(新鲜度|模板|套路)/],
  ['genre_fulfillment', /(题材兑现|类型兑现)/],
  ['repetition', /(重复|复述)/],
  ['exposition', /(解释过载|说明过多)/],
  ['scene_detail', /(现场细节|场景细节)/],
  ['pacing', /(节奏|拖沓|推进)/],
]

export function recognizeCreatorConversationReviewCommand(
  message: string,
): CreatorConversationReviewCommandResult {
  const normalized = message.trim()
  if (!REVIEW_REQUEST.test(normalized)) return { recognized: false }
  return {
    recognized: true,
    kind: 'review_current_manuscript',
    focusDimensions: DIMENSION_SIGNALS
      .filter(([, signal]) => signal.test(normalized))
      .map(([dimension]) => dimension),
  }
}
