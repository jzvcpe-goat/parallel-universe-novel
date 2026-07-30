import type {
  PublishMode,
  WritingGuideStep,
} from './creatorEditorViewModels'
import type {
  EditorAssistAction,
  ReviewDockTab,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'

export type CreatorStoryFlowStageId = 'seed' | 'shape' | 'plan' | 'draft' | 'review' | 'repair' | 'commit' | 'continue' | 'publish'

export interface CreatorEditorCommandPatch {
  activeWritingCommand?: WritingCommandId
  assistAction?: EditorAssistAction
  guideStep?: WritingGuideStep
  publishMode?: PublishMode
  reviewDockTab?: ReviewDockTab
  notice?: string
}

export function resolveBranchExperimentDecision(
  label: string,
  decision: 'merge' | 'keep' | 'discard',
): CreatorEditorCommandPatch {
  if (decision === 'merge') {
    return {
      guideStep: 'publish',
      reviewDockTab: 'state',
      notice: `${label} 准备进入正式剧情判断；先看影响范围，再由作者确认。`,
    }
  }
  if (decision === 'keep') {
    return {
      publishMode: 'if',
      guideStep: 'scene',
      notice: `${label} 已保留为 IF 支线候选；先存草稿，不会影响正式剧情。`,
    }
  }
  return {
    guideStep: 'draft',
    notice: `${label} 已废弃；当前正文和正式剧情保持不变。`,
  }
}

export function resolveStoryFlowStage(stage: CreatorStoryFlowStageId): CreatorEditorCommandPatch {
  if (stage === 'seed') {
    return {
      guideStep: 'intent',
      notice: '回到故事种子：先判断读者真正想追什么。',
    }
  }
  if (stage === 'shape' || stage === 'plan') {
    return {
      guideStep: 'scene',
      notice: '回到章节规划：先确认场景、方向和这一章的代价。',
    }
  }
  if (stage === 'draft') {
    return {
      guideStep: 'draft',
      notice: '回到正文生成：可以手写，也可以使用补全候选。',
    }
  }
  if (stage === 'review') {
    return {
      reviewDockTab: 'review',
      guideStep: 'memory',
      notice: '已打开质量问题卡；先看正文是否兑现读者承诺。',
    }
  }
  if (stage === 'repair') {
    return {
      assistAction: 'complete',
      notice: '已准备修复候选；确认前不会改变草稿。',
    }
  }
  if (stage === 'commit') {
    return {
      reviewDockTab: 'state',
      guideStep: 'publish',
      notice: '已打开发布确认；先看这一章会改变什么。',
    }
  }
  return {
    guideStep: 'publish',
    notice: '继续创作前，先完成当前章的发布包确认或草稿保存。',
  }
}
