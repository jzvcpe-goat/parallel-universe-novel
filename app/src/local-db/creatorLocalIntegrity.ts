const textEncoder = new TextEncoder()

export function utf8Bytes(value: string) {
  return textEncoder.encode(value)
}

export function utf8ByteLength(value: string) {
  return utf8Bytes(value).byteLength
}

export async function sha256Bytes(value: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', value as BufferSource)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function sha256Text(value: string) {
  return sha256Bytes(utf8Bytes(value))
}

export function stableJson(value: unknown): string {
  if (typeof value === 'undefined') return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .filter(key => typeof record[key] !== 'undefined')
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`
}
