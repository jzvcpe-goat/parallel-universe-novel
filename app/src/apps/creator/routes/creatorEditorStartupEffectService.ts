import type { CreatorEditorRouteQuery } from './creatorEditorRouteController'
import { resolveEditorRouteBootstrap } from './creatorEditorRouteController'
import { runEditorReminderBootstrap } from './creatorEditorReminderService'
import {
  runEditorStartupLoad,
  type RunEditorStartupLoadResult,
} from './creatorEditorStartupLoadService'
import {
  resolveEditorStartupStatePatch,
  type CreatorEditorStartupStatePatch,
} from './creatorEditorStartupPatchController'

export type { CreatorEditorStartupStatePatch } from './creatorEditorStartupPatchController'

export const editorStartupEffectDelayMs = 0

type CancelEditorStartupEffect = () => void

export interface EditorStartupEffectTimerPort {
  scheduleStartup(startup: () => void, delayMs: number): CancelEditorStartupEffect
}

interface EditorStartupEffectCurrentState {
  currentBranchTitle: string
  currentSelectedWorkId: string
  currentTitle: string
}

interface RunEditorStartupEffectInput extends CreatorEditorRouteQuery, EditorStartupEffectCurrentState {}

type EditorStartupLoadSuccess = Extract<RunEditorStartupLoadResult, { ok: true }>

export type RunEditorStartupEffectResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    creativeReminders: EditorStartupLoadSuccess['creativeReminders']
    startupLoad: EditorStartupLoadSuccess
    statePatch: CreatorEditorStartupStatePatch
  }

const browserEditorStartupEffectTimerPort: EditorStartupEffectTimerPort = {
  scheduleStartup(startup, delayMs) {
    if (typeof window === 'undefined') return () => undefined
    const timer = window.setTimeout(startup, delayMs)
    return () => window.clearTimeout(timer)
  },
}

export function scheduleEditorStartupEffect(
  startup: () => void,
  port: EditorStartupEffectTimerPort = browserEditorStartupEffectTimerPort,
): CancelEditorStartupEffect {
  return port.scheduleStartup(startup, editorStartupEffectDelayMs)
}

export async function runEditorStartupEffect(
  input: RunEditorStartupEffectInput,
  loadStartup: typeof runEditorStartupLoad = runEditorStartupLoad,
): Promise<RunEditorStartupEffectResult> {
  const startupLoad = await loadStartup()
  if (!startupLoad.ok) return startupLoad

  const bootstrap = resolveEditorRouteBootstrap({
    requestId: input.requestId,
    routeDraftRef: input.routeDraftRef,
    routeWorkId: input.routeWorkId,
    routeBranchId: input.routeBranchId,
    routeChapterNumber: input.routeChapterNumber,
    requests: startupLoad.requests,
    works: startupLoad.works,
    branches: startupLoad.branches,
    chapters: startupLoad.chapters,
    drafts: startupLoad.drafts,
    creativeReminders: startupLoad.creativeReminders,
  })
  const reminderBootstrap = runEditorReminderBootstrap({
    creativeReminders: startupLoad.creativeReminders,
    nextRequest: bootstrap.nextRequest,
    missingReminderStatus: bootstrap.missingReminderStatus,
  })

  return {
    ok: true,
    creativeReminders: reminderBootstrap.creativeReminders,
    startupLoad,
    statePatch: resolveEditorStartupStatePatch({
      bootstrap,
      currentBranchTitle: input.currentBranchTitle,
      currentSelectedWorkId: input.currentSelectedWorkId,
      currentTitle: input.currentTitle,
    }),
  }
}
