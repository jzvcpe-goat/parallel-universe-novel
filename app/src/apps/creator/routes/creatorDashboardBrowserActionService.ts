export interface CreatorDashboardBrowserPort {
  clearTimeout(timer: number): void
  setTimeout(callback: () => void, delayMs: number): number
}

const defaultCreatorDashboardBrowserPort: CreatorDashboardBrowserPort = {
  clearTimeout: timer => window.clearTimeout(timer),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

export function scheduleCreatorDashboardInitialLoad(
  load: () => void | Promise<void>,
  port: CreatorDashboardBrowserPort = defaultCreatorDashboardBrowserPort,
  delayMs = 0,
) {
  const timer = port.setTimeout(() => {
    void load()
  }, delayMs)

  return () => port.clearTimeout(timer)
}
