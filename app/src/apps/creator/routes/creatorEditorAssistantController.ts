import type { CreatorEditorCommandPatch } from './creatorEditorCommandController'
import type {
  EditorAssistAction,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'

export interface CreatorEditorShortcutInput {
  shortcut: string
  contentReady: boolean
  titleReady: boolean
}

export function resolveWritingCommand(command: WritingCommandId): CreatorEditorCommandPatch {
  if (command === 'complete') {
    return {
      activeWritingCommand: command,
      assistAction: 'complete',
    }
  }
  if (command === 'temper') {
    return {
      activeWritingCommand: command,
      assistAction: 'temper',
    }
  }
  if (command === 'question') {
    return {
      activeWritingCommand: command,
      assistAction: 'question',
    }
  }
  if (command === 'state') {
    return {
      activeWritingCommand: command,
      reviewDockTab: 'state',
      guideStep: 'publish',
      notice: '已打开影响范围；先看这章会改变什么，再决定是否进入发布包确认。',
    }
  }
  if (command === 'sandbox') {
    return {
      activeWritingCommand: command,
      reviewDockTab: 'branch',
      publishMode: 'if',
      guideStep: 'scene',
      notice: '已打开支线试写；大改会先进试写比较，不会直接影响主线。',
    }
  }
  return {
    activeWritingCommand: command,
    reviewDockTab: 'record',
    notice: '已打开建议依据；用来判断这一章建议是否可信。',
  }
}

export function resolveEditorAssistAction(
  action: EditorAssistAction,
  noticeOverride?: string,
): CreatorEditorCommandPatch {
  return {
    assistAction: action,
    notice: noticeOverride,
  }
}

export function resolveEditorShortcut({
  shortcut,
  contentReady,
  titleReady,
}: CreatorEditorShortcutInput): CreatorEditorCommandPatch | null {
  if (!['k', 'l', 'i'].includes(shortcut)) return null

  if (shortcut === 'k') {
    if (!contentReady) {
      return {
        notice: '先写出一段正文，再压低解释。',
      }
    }
    return {
      activeWritingCommand: 'temper',
      assistAction: 'temper',
    }
  }

  if (shortcut === 'l') {
    return {
      activeWritingCommand: 'question',
      assistAction: 'question',
    }
  }

  if (!titleReady || !contentReady) {
    return {
      notice: '补齐标题和正文后，再看这一章会改变什么。',
    }
  }
  return {
    activeWritingCommand: 'state',
    reviewDockTab: 'state',
    guideStep: 'publish',
    notice: '已打开影响范围；先看这章会改变什么，再决定是否进入发布包确认。',
  }
}

export function resolveReviewFix(label: string): CreatorEditorCommandPatch {
  if (label === '换标题' || label === '生成标题候选') {
    return {
      assistAction: 'title',
      notice: '已打开标题修复建议；采用前不会改变草稿。',
    }
  }
  if (label === '补一段' || label === '补写下一段' || label === '补写开场') {
    return {
      assistAction: 'complete',
      notice: '已打开段落修复建议；采用前不会改变草稿。',
    }
  }
  if (label === '让语气更克制') {
    return {
      assistAction: 'temper',
      notice: '已打开语气修复建议；采用前不会改变草稿。',
    }
  }
  if (label === '看影响范围') {
    return {
      reviewDockTab: 'state',
      guideStep: 'publish',
      notice: '已打开影响范围；先看这章会改变什么，再决定是否进入发布包确认。',
    }
  }
  if (label === '加钩子') {
    return {
      assistAction: 'hook',
      guideStep: 'draft',
      notice: '已打开结尾钩子修复建议；采用前不会改变草稿。',
    }
  }
  return {
    assistAction: 'question',
    notice: `${label} 已转成关键追问；先确认承诺再继续写。`,
  }
}
