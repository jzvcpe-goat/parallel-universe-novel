export function readHashRoute() {
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return null
  const route = hash.slice(1)
  if (!route || route.startsWith('//')) return null
  return route
}

export function normalizeInitialHashRoute(baseName?: string) {
  const route = readHashRoute()
  if (!route) return
  const normalizedBase = baseName && baseName !== '/' ? baseName : ''
  window.history.replaceState(window.history.state, '', `${normalizedBase}${route}`)
}
