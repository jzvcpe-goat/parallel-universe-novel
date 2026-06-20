export function quoteEnv(value) {
  return String(value ?? '').replace(/\n/g, '\\n')
}

export function toEnvFile(entries) {
  return `${Object.entries(entries)
    .map(([key, value]) => `${key}=${quoteEnv(value)}`)
    .join('\n')}\n`
}
