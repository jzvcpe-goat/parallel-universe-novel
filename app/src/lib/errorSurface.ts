export const ERROR_SURFACE_MATRIX = {
  400: { ui: 'BAD_REQUEST', action: 'show_details', retryable: false },
  401: { ui: 'AUTH_REQUIRED', action: 'redirect_login', retryable: false },
  403: { ui: 'FORBIDDEN', action: 'show_upgrade', retryable: false },
  404: { ui: 'NOT_FOUND', action: 'redirect_home', retryable: false },
  429: { ui: 'RATE_LIMITED', action: 'exponential_backoff', retryable: true, retry_after_header: true },
  500: { ui: 'SERVER_ERROR', action: 'retry_with_backoff', retryable: true },
  501: { ui: 'FEATURE_UNAVAILABLE', action: 'show_roadmap', retryable: false },
  503: { ui: 'SERVICE_DOWN', action: 'degrade_to_offline', retryable: true },
  WS_MISSING: { ui: 'REALTIME_OFFLINE', action: 'degrade_to_polling', retryable: true, max_delay: 30 },
} as const
