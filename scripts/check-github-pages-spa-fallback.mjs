#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const workflowPath = join(root, '.github/workflows/pages.yml')
const workflow = readFileSync(workflowPath, 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(
  workflow.includes('npm --prefix app run build'),
  'GitHub Pages workflow must build the Creator Studio app',
)
assert(
  workflow.includes('VITE_ROUTER_MODE: hash'),
  'GitHub Pages workflow must build with HashRouter so public deep links use /#/route',
)
assert(
  workflow.includes('cp app/dist/index.html app/dist/404.html'),
  'GitHub Pages workflow must copy index.html to 404.html for BrowserRouter deep links',
)
assert(
  workflow.includes('path: app/dist'),
  'GitHub Pages workflow must upload app/dist after the SPA fallback is created',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: '.github/workflows/pages.yml',
  routerMode: 'hash',
  fallback: 'app/dist/404.html',
}, null, 2))
