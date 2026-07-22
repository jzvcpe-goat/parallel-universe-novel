export interface CreatorEchoBrowserPort {
  addEventListener(type: string, listener: EventListener): void
  clearInterval(timer: number): void
  clearTimeout(timer: number): void
  getVisibilityState(): DocumentVisibilityState
  open(url: string, target: string, features: string): void
  removeEventListener(type: string, listener: EventListener): void
  setInterval(callback: () => void, delayMs: number): number
  setTimeout(callback: () => void, delayMs: number): number
}

type CreatorEchoReaderPerspectiveResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    url: string
  }

const defaultCreatorEchoBrowserPort: CreatorEchoBrowserPort = {
  addEventListener: (type, listener) => window.addEventListener(type, listener),
  clearInterval: timer => window.clearInterval(timer),
  clearTimeout: timer => window.clearTimeout(timer),
  getVisibilityState: () => document.visibilityState,
  open: (url, target, features) => {
    window.open(url, target, features)
  },
  removeEventListener: (type, listener) => window.removeEventListener(type, listener),
  setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

export function scheduleCreatorEchoInitialLoad(
  load: () => void | Promise<void>,
  port: CreatorEchoBrowserPort = defaultCreatorEchoBrowserPort,
  delayMs = 0,
) {
  const timer = port.setTimeout(() => {
    void load()
  }, delayMs)
  return () => port.clearTimeout(timer)
}

export function scheduleCreatorEchoActionReset(
  reset: () => void,
  port: CreatorEchoBrowserPort = defaultCreatorEchoBrowserPort,
  delayMs = 120,
) {
  return port.setTimeout(reset, delayMs)
}

export function scheduleCreatorEchoVisibilityRefresh(
  load: () => void | Promise<void>,
  port: CreatorEchoBrowserPort = defaultCreatorEchoBrowserPort,
  delayMs = 60_000,
) {
  const timer = port.setInterval(() => {
    if (port.getVisibilityState() === 'visible') void load()
  }, delayMs)
  return () => port.clearInterval(timer)
}

export function subscribeCreatorEchoWorkspaceRefresh(
  refreshLocal: () => void,
  port: CreatorEchoBrowserPort = defaultCreatorEchoBrowserPort,
) {
  const listener: EventListener = event => {
    const family = (event as CustomEvent<{ recordFamily?: string }>).detail?.recordFamily
    if (family === 'creativeReminders' || family === 'readerSignals' || family === 'readerSignalSources') {
      refreshLocal()
    }
  }
  port.addEventListener('puf:local-workspace-rehydrated', listener)
  return () => port.removeEventListener('puf:local-workspace-rehydrated', listener)
}

export function openCreatorEchoReaderPerspective(
  workId: string,
  readerOrigin: string,
  port: CreatorEchoBrowserPort = defaultCreatorEchoBrowserPort,
): CreatorEchoReaderPerspectiveResult {
  const origin = readerOrigin.trim()
  if (!origin) return { ok: false, notice: '暂未配置阅读端入口。' }

  const target = new URL(`/story?work=${encodeURIComponent(workId)}`, origin)
  const url = target.toString()
  port.open(url, '_blank', 'noopener,noreferrer')
  return { ok: true, url }
}
