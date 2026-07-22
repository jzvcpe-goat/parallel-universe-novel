export interface CreatorWorksBrowserPort {
  clearTimeout(timer: number): void
  setTimeout(callback: () => void, delayMs: number): number
}

const defaultCreatorWorksBrowserPort: CreatorWorksBrowserPort = {
  clearTimeout: timer => window.clearTimeout(timer),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

export function scheduleCreatorWorksInitialLoad(
  load: () => void | Promise<void>,
  port: CreatorWorksBrowserPort = defaultCreatorWorksBrowserPort,
  delayMs = 0,
) {
  const timer = port.setTimeout(() => {
    void load()
  }, delayMs)

  return () => port.clearTimeout(timer)
}
