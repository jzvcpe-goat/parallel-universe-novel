import { signOutPmf } from '@/lib/pmfSupabase'
import { isLocalCreatorHost } from '@/local-db/creatorLocalSettingsRepository'
import type { CreatorSessionState } from '@/apps/creator/creatorSessionService'
import type { CommandCandidateApplyDetail } from '@/components/creator/creatorCommandCandidateService'

interface CreatorFrameShortcutHandlers {
  closeSurfaces(): void
  openCommands(): void
  sessionStatus: CreatorSessionState['status']
  toggleAssistant(): void
}

export function detectCreatorLocalSurface() {
  return isLocalCreatorHost()
}

export function signOutCreatorSession() {
  return signOutPmf()
}

export function bindCreatorFrameShortcuts(
  { closeSurfaces, openCommands, sessionStatus, toggleAssistant }: CreatorFrameShortcutHandlers,
  target: Window = window,
) {
  function handleKeyDown(event: KeyboardEvent) {
    const isCommand = event.metaKey || event.ctrlKey
    if (isCommand && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (sessionStatus === 'signed_in') openCommands()
    }
    if (isCommand && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      if (sessionStatus === 'signed_in') toggleAssistant()
    }
    if (event.key === 'Escape') closeSurfaces()
  }

  target.addEventListener('keydown', handleKeyDown)
  return () => target.removeEventListener('keydown', handleKeyDown)
}

export function dispatchCreatorCommandCandidateApply(
  detail: CommandCandidateApplyDetail,
  target: Window = window,
) {
  target.dispatchEvent(new CustomEvent('creator-command-candidate-apply', { detail }))
}
