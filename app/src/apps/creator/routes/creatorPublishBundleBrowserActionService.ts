export interface CreatorPublishBundleBrowserPort {
  clearTimeout(timer: number): void
  createAnchor(): HTMLAnchorElement | null
  createObjectUrl(blob: Blob): string
  revokeObjectUrl(url: string): void
  setTimeout(callback: () => void, delayMs: number): number
}

const defaultCreatorPublishBundleBrowserPort: CreatorPublishBundleBrowserPort = {
  clearTimeout: timer => window.clearTimeout(timer),
  createAnchor: () => typeof document === 'undefined' ? null : document.createElement('a'),
  createObjectUrl: blob => URL.createObjectURL(blob),
  revokeObjectUrl: url => URL.revokeObjectURL(url),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

function scheduleCreatorPublishBundleEffect(
  action: () => void | Promise<void>,
  port: CreatorPublishBundleBrowserPort = defaultCreatorPublishBundleBrowserPort,
  delayMs = 0,
) {
  const timer = port.setTimeout(() => {
    void action()
  }, delayMs)
  return () => port.clearTimeout(timer)
}

export function scheduleCreatorPublishBundleContextLoad(
  load: () => void | Promise<void>,
  port?: CreatorPublishBundleBrowserPort,
  delayMs?: number,
) {
  return scheduleCreatorPublishBundleEffect(load, port, delayMs)
}

export function scheduleCreatorPublishBundleRouteDraftRefresh(
  refresh: () => void | Promise<void>,
  port?: CreatorPublishBundleBrowserPort,
  delayMs?: number,
) {
  return scheduleCreatorPublishBundleEffect(refresh, port, delayMs)
}

export function downloadCreatorPublishBundle(
  bytes: Uint8Array,
  fileName: string,
  port: CreatorPublishBundleBrowserPort = defaultCreatorPublishBundleBrowserPort,
) {
  const anchor = port.createAnchor()
  if (!anchor) return false
  const url = port.createObjectUrl(new Blob([bytes as BlobPart], { type: 'application/zip' }))
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  port.revokeObjectUrl(url)
  return true
}

export async function readCreatorPublishBundleReceiptFile(file: File) {
  return file.text()
}
