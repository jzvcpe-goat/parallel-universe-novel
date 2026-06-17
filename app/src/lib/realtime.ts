import type { WsEvent } from '@/types'

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'realtime_unavailable'

export function getRetryDelay(attempt: number): number {
  const base = 1000
  const cap = 30000
  const exponential = Math.min(cap, base * Math.pow(2, attempt))
  return Math.random() * exponential
}

interface RealtimeClientOptions {
  url: string
  onStatus: (status: RealtimeStatus) => void
  onEvent: (event: WsEvent) => void
}

export class RealtimeClient {
  private socket: WebSocket | null = null
  private attempt = 0
  private stopped = false
  private retryTimer: number | null = null
  private options: RealtimeClientOptions

  constructor(options: RealtimeClientOptions) {
    this.options = options
  }

  connect() {
    this.stopped = false
    this.openSocket()
  }

  close() {
    this.stopped = true
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer)
    this.socket?.close()
    this.socket = null
    this.options.onStatus('closed')
  }

  private openSocket() {
    if (this.stopped) return
    this.options.onStatus('connecting')
    console.info('[integration-harness:ws]', { event: 'connect', url: this.options.url, attempt: this.attempt })

    try {
      this.socket = new WebSocket(this.options.url)
    } catch {
      this.scheduleRetry('constructor_failed')
      return
    }

    this.socket.onopen = () => {
      this.attempt = 0
      this.options.onStatus('open')
      console.info('[integration-harness:ws]', { event: 'open', url: this.options.url })
    }

    this.socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(String(message.data)) as WsEvent['payload'] & { type?: string; payload?: Record<string, unknown> }
        this.options.onEvent({
          type: String(parsed.type || 'message'),
          payload: (parsed.payload || parsed) as Record<string, unknown>,
          receivedAt: new Date().toISOString(),
        })
      } catch {
        this.options.onEvent({
          type: 'message',
          payload: { raw: String(message.data) },
          receivedAt: new Date().toISOString(),
        })
      }
    }

    this.socket.onclose = () => this.scheduleRetry('closed')
    this.socket.onerror = () => this.scheduleRetry('error')
  }

  private scheduleRetry(reason: string) {
    if (this.stopped) return
    const delay = getRetryDelay(this.attempt)
    this.options.onStatus('realtime_unavailable')
    console.info('[integration-harness:ws]', {
      event: 'retry',
      reason,
      attempt: this.attempt,
      delay_ms: Math.round(delay),
      max_delay_ms: 30000,
    })
    this.attempt += 1
    this.retryTimer = window.setTimeout(() => this.openSocket(), delay)
  }
}
