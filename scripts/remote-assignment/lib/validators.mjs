export function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`)
  }
}

export function assertBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }
}

export function assertRuntimeMode(value) {
  const allowed = ['edge-only', 'hybrid', 'full-remote']
  if (!allowed.includes(value)) {
    throw new Error(`runtime_mode must be one of: ${allowed.join(', ')}`)
  }
}

export function assertHttpsUrl(value, label) {
  assertString(value, label)
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid URL`)
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use https`)
  if (
    url.hostname === 'localhost'
    || url.hostname === '127.0.0.1'
    || url.hostname === '0.0.0.0'
    || url.hostname === '::1'
    || url.hostname.endsWith('.local')
    || url.hostname.endsWith('.invalid')
    || url.hostname === 'example.com'
  ) {
    throw new Error(`${label} must be a production-ready HTTPS origin`)
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${label} must not contain credentials, query, or hash`)
  }
}

export function assertNoPlaceholder(value, label) {
  assertString(value, label)
  const normalized = value.trim().toLowerCase()
  const banned = [
    '<',
    '>',
    'tbd',
    'todo',
    'unknown',
    'example',
    'example.com',
    'your-vercel-project',
    'supabase-project-ref',
    'changeme',
    'replace_me',
    'fill_',
  ]
  for (const token of banned) {
    if (normalized.includes(token)) {
      throw new Error(`${label} contains placeholder token: ${token}`)
    }
  }
}

export function assertNoPrivateTerms(value, label = 'payload') {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /profile\.id/i,
    /kernel\.id/i,
  ]
  const hits = forbidden.filter(pattern => pattern.test(text)).map(String)
  if (hits.length) throw new Error(`${label} contains private/internal material: ${hits.join(', ')}`)
}
