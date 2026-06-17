import type { BackendErrorDetail } from '@/types'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const configuredApiOrigin = String(import.meta.env.VITE_API_ORIGIN || '').trim()
const fallbackOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000'
const apiOriginFromLegacyBase = configuredApiBase.replace(/\/v1\/?$/, '')

const API_ORIGIN = trimTrailingSlash(
  configuredApiOrigin || apiOriginFromLegacyBase || fallbackOrigin,
)
const API_BASE = trimTrailingSlash(
  configuredApiBase || `${API_ORIGIN}/v1`,
)
const HEALTH_URL = `${API_ORIGIN}/health`
const FORCE_LOCAL = import.meta.env.VITE_API_LOCAL === 'true'
const WS_URL = String(import.meta.env.VITE_WS_URL || '').trim()
  || API_ORIGIN.replace(/^http/i, (match) => (match.toLowerCase() === 'https' ? 'wss' : 'ws')) + '/ws/v1/narrative'

let backendStatusPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  status: number
  code: string
  reason: string
  detail?: BackendErrorDetail | unknown
  latencyMs?: number
  url?: string
  retryable: boolean

  constructor(
    status: number,
    code: string,
    message: string,
    options?: {
      detail?: BackendErrorDetail | unknown
      latencyMs?: number
      url?: string
      retryable?: boolean
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.reason = message
    this.detail = options?.detail
    this.latencyMs = options?.latencyMs
    this.url = options?.url
    this.retryable = Boolean(options?.retryable)
  }
}

function tokenHeaders(): Record<string, string> {
  const token = localStorage.getItem('qi_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function normalizeBackendError(
  status: number,
  url: string,
  payload: unknown,
  latencyMs: number,
): ApiError {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const detail = record.detail
    if (detail && typeof detail === 'object') {
      const typed = detail as BackendErrorDetail
      return new ApiError(
        status,
        String(typed.code || `http_${status}`),
        String(
          typed.reason
          || typed.code
          || record.message
          || `请求失败 (${status})`,
        ),
        {
          detail: typed,
          latencyMs,
          url,
          retryable: Boolean(typed.retryable),
        },
      )
    }

    if (typeof detail === 'string') {
      return new ApiError(status, `http_${status}`, detail, {
        detail,
        latencyMs,
        url,
      })
    }

    if (typeof record.message === 'string') {
      return new ApiError(status, `http_${status}`, record.message, {
        detail: payload,
        latencyMs,
        url,
      })
    }

    if (typeof record.code === 'string') {
      return new ApiError(status, record.code, String(record.reason || record.code), {
        detail: payload,
        latencyMs,
        url,
      })
    }
  }

  return new ApiError(status, `http_${status}`, `请求失败 (${status})`, {
    detail: payload,
    latencyMs,
    url,
  })
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  if (!text) return undefined

  const normalized = text.trim()
  if (
    contentType.includes('text/html')
    || /^<!doctype html/i.test(normalized)
    || /<html[\s>]/i.test(normalized)
  ) {
    return { message: '后端返回了非 JSON 响应，当前入口未接入真实 API。' }
  }

  return { message: normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized }
}

export async function checkBackend(): Promise<boolean> {
  if (FORCE_LOCAL) return false
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 2000)
  try {
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

export async function getBackendStatus(): Promise<boolean> {
  if (backendStatusPromise === null) {
    backendStatusPromise = checkBackend()
  }
  return backendStatusPromise
}

export function resetBackendStatus(): void {
  backendStatusPromise = null
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  if (FORCE_LOCAL) {
    throw new ApiError(503, 'api_local_enabled', '当前启用了本地演示模式，真实后端请求已禁用。', {
      url: path,
    })
  }

  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  const headers = new Headers(options?.headers || {})
  headers.set('Accept', 'application/json')
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  for (const [key, value] of Object.entries(tokenHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }

  const started = performance.now()

  try {
    const response = await fetch(url, {
      method,
      credentials: 'include',
      ...options,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const latencyMs = Math.round(performance.now() - started)
    const payload = await parseResponseBody(response)
    const contentType = response.headers.get('content-type') || ''

    if (
      response.ok
      && response.status !== 204
      && !contentType.includes('application/json')
    ) {
      throw new ApiError(
        503,
        'api_non_json_response',
        '后端返回了非 JSON 响应，当前入口将切换到本地演示模式。',
        {
          detail: payload,
          latencyMs,
          url,
          retryable: true,
        },
      )
    }

    if (!response.ok) {
      throw normalizeBackendError(response.status, url, payload, latencyMs)
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    const latencyMs = Math.round(performance.now() - started)
    throw new ApiError(
      503,
      'network_unreachable',
      '无法连接到后端服务，请检查 API 地址、CORS 配置和服务状态。',
      {
        detail: error instanceof Error ? { reason: error.message } : error,
        latencyMs,
        url,
        retryable: true,
      },
    )
  }
}

export function unsupportedFeature(code: string, reason: string): Promise<never> {
  return Promise.reject(new ApiError(501, code, reason, { detail: { code, reason } }))
}

export const runtimeConfig = {
  apiOrigin: API_ORIGIN,
  apiBase: API_BASE,
  healthUrl: HEALTH_URL,
  wsUrl: WS_URL,
  localMode: FORCE_LOCAL,
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestInit) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestInit) => request<T>('DELETE', path, undefined, options),
}
