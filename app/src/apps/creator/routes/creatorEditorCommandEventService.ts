import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  resolveCommandCandidateApply,
  type CreatorCommandCandidateApplyInput,
} from './creatorEditorCandidateController'
import { resolveEditorShortcut } from './creatorEditorAssistantController'
import type { WritingCommandId } from './creatorEditorAssistantViewModels'
import {
  resolveEditorCommandCandidateStatePatch,
  resolveEditorCommandStatePatch,
  type CreatorEditorCommandStatePatch,
} from './creatorEditorCommandPatchController'
import type { ChapterDirectionId } from './creatorEditorViewModels'

export const editorCommandCandidateApplyEventName = 'creator-command-candidate-apply'

export interface EditorCommandEventTarget {
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions | boolean): void
  removeEventListener(type: string, listener: EventListener, options?: EventListenerOptions | boolean): void
}

interface EditorCommandEventContext {
  assistantSuggestion: string
  content: string
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
}

export interface BindEditorCommandCandidateApplyInput {
  applyPatch: (patch: CreatorEditorCommandStatePatch | null) => void
  context: EditorCommandEventContext
  target?: EditorCommandEventTarget | null
}

export interface BindEditorShortcutInput extends BindEditorCommandCandidateApplyInput {
  contentReady: boolean
  executeCommand?: (command: WritingCommandId) => void
  titleReady: boolean
}

function defaultEditorCommandEventTarget(): EditorCommandEventTarget | null {
  return typeof window === 'undefined' ? null : window
}

export function bindEditorCommandCandidateApply({
  applyPatch,
  context,
  target = defaultEditorCommandEventTarget(),
}: BindEditorCommandCandidateApplyInput): () => void {
  if (!target) return () => undefined

  const handleCommandCandidateApply: EventListener = (event) => {
    const detail = (event as CustomEvent<CreatorCommandCandidateApplyInput>).detail
    if (!detail) return
    const resolution = resolveCommandCandidateApply(detail)
    applyPatch(resolveEditorCommandCandidateStatePatch({
      ...context,
      resolution,
    }))
  }

  target.addEventListener(editorCommandCandidateApplyEventName, handleCommandCandidateApply)
  return () => target.removeEventListener(editorCommandCandidateApplyEventName, handleCommandCandidateApply)
}

export function bindEditorShortcut({
  applyPatch,
  contentReady,
  context,
  executeCommand,
  target = defaultEditorCommandEventTarget(),
  titleReady,
}: BindEditorShortcutInput): () => void {
  if (!target) return () => undefined

  const handleEditorShortcut: EventListener = (event) => {
    const keyboardEvent = event as KeyboardEvent
    if (!(keyboardEvent.metaKey || keyboardEvent.ctrlKey)) return
    const patch = resolveEditorShortcut({
      contentReady,
      shortcut: keyboardEvent.key.toLowerCase(),
      titleReady,
    })
    if (!patch) return

    keyboardEvent.preventDefault()
    keyboardEvent.stopPropagation()
    const shortcut = keyboardEvent.key.toLowerCase()
    const executableCommand: WritingCommandId | null = shortcut === 'k' && contentReady
      ? 'temper'
      : shortcut === 'l'
        ? 'question'
        : shortcut === 'i' && titleReady && contentReady
          ? 'state'
          : null
    if (executableCommand && executeCommand) {
      executeCommand(executableCommand)
      return
    }
    applyPatch(resolveEditorCommandStatePatch({
      ...context,
      patch,
    }))
  }

  target.addEventListener('keydown', handleEditorShortcut, { capture: true })
  return () => target.removeEventListener('keydown', handleEditorShortcut, { capture: true })
}
