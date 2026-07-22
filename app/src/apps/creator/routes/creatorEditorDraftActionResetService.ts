import { editorDraftActionResetDelayMs } from './creatorEditorDraftActionController'

export type CancelEditorDraftActionReset = () => void

export interface EditorDraftActionResetPort {
  scheduleReset(reset: () => void, delayMs: number): CancelEditorDraftActionReset
}

const browserEditorDraftActionResetPort: EditorDraftActionResetPort = {
  scheduleReset(reset, delayMs) {
    if (typeof window === 'undefined') return () => undefined
    const timer = window.setTimeout(reset, delayMs)
    return () => window.clearTimeout(timer)
  },
}

export function scheduleEditorDraftActionReset(
  reset: () => void,
  port: EditorDraftActionResetPort = browserEditorDraftActionResetPort,
): CancelEditorDraftActionReset {
  return port.scheduleReset(reset, editorDraftActionResetDelayMs)
}
