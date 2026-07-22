import type { CreatorDisplayPreferences } from './creatorSettingsLoadService'

export interface CreatorSettingsBrowserPort {
  createAnchor(): HTMLAnchorElement | null
  createObjectUrl(blob: Blob): string
  getDocumentElementDataset(): DOMStringMap | null
  revokeObjectUrl(url: string): void
}

export interface CreatorSettingsBrowserTimerPort {
  clearTimeout(timer: number): void
  setTimeout(callback: () => void, delayMs: number): number
}

const defaultCreatorSettingsBrowserPort: CreatorSettingsBrowserPort = {
  createAnchor: () => {
    if (typeof document === 'undefined') return null
    return document.createElement('a')
  },
  createObjectUrl: blob => URL.createObjectURL(blob),
  getDocumentElementDataset: () => {
    if (typeof document === 'undefined') return null
    return document.documentElement.dataset
  },
  revokeObjectUrl: url => URL.revokeObjectURL(url),
}

const defaultCreatorSettingsBrowserTimerPort: CreatorSettingsBrowserTimerPort = {
  clearTimeout: timer => window.clearTimeout(timer),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

export function applyCreatorSettingsDisplayPreferences(
  preferences: CreatorDisplayPreferences,
  port: CreatorSettingsBrowserPort = defaultCreatorSettingsBrowserPort,
) {
  const dataset = port.getDocumentElementDataset()
  if (!dataset) return

  dataset.creatorMotion = preferences.reduceMotion ? 'reduced' : 'normal'
  dataset.creatorTransparency = preferences.reduceTransparency ? 'reduced' : 'normal'
}

export function downloadCreatorWorkspacePackage(
  bytes: Uint8Array,
  exportedAt: string,
  port: CreatorSettingsBrowserPort = defaultCreatorSettingsBrowserPort,
) {
  const anchor = port.createAnchor()
  if (!anchor) return false

  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
  const url = port.createObjectUrl(blob)
  anchor.href = url
  anchor.download = `parallel-universe-local-workspace-${exportedAt.slice(0, 10)}.pufw.zip`
  anchor.click()
  port.revokeObjectUrl(url)
  return true
}

export function scheduleCreatorSettingsActionReset(
  reset: () => void,
  delayMs = 160,
  port: CreatorSettingsBrowserTimerPort = defaultCreatorSettingsBrowserTimerPort,
) {
  return port.setTimeout(reset, delayMs)
}

export function scheduleCreatorSettingsRouteEffect(
  run: () => void,
  delayMs = 0,
  port: CreatorSettingsBrowserTimerPort = defaultCreatorSettingsBrowserTimerPort,
) {
  const timer = port.setTimeout(run, delayMs)
  return () => port.clearTimeout(timer)
}
