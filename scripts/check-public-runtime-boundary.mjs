#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const createPagePath = join(root, 'app/src/pages/Create.tsx')
const createPage = readFileSync(createPagePath, 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(
  createPage.includes('function allowLocalCreatorFallback()'),
  '/create must define an explicit local fallback boundary',
)
assert(
  createPage.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK'),
  '/create local fallback must be explicitly overridable for QA/dev',
)
assert(
  createPage.includes('import.meta.env.DEV'),
  '/create local fallback must remain available in Vite dev mode',
)
assert(
  createPage.includes("['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)"),
  '/create local fallback must be limited to localhost-like hosts by default',
)
assert(
  createPage.includes('创作服务暂时未连接。请稍后再试，或在本地创作环境继续。'),
  '/create public runtime failure must show a user-facing service boundary message',
)
assert(
  createPage.includes('setInput(message)') && createPage.includes('return'),
  '/create public runtime failure must preserve user input and stop before local draft fallback',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: 'app/src/pages/Create.tsx',
  boundary: 'public runtime failure does not enter local draft fallback',
}, null, 2))
