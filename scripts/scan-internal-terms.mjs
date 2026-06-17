#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = new URL('..', import.meta.url).pathname
const terms = [
  'system prompt',
  'rawHash',
  'StateVector',
  'AgentRun',
  'CHANGES JSON',
  'provider',
]

const targets = [
  'app/src/pages',
  'app/src/components',
  'app/src/features',
]

let failed = false

for (const target of targets) {
  let files = []
  try {
    files = execFileSync('rg', ['--files', join(root, target)], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } catch {
    continue
  }
  for (const file of files) {
    const body = readFileSync(file, 'utf8')
    const stringLiterals = [...body.matchAll(/['"`]([^'"`]*)['"`]/g)].map(match => match[1] || '')
    for (const literal of stringLiterals) {
      for (const term of terms) {
        if (literal.includes(term)) {
          failed = true
          console.error(`internal term leak: ${term} in ${file}`)
        }
      }
    }
    for (const literal of stringLiterals.filter(value => /fallback/i.test(value))) {
      if (
        literal === 'fallback'
        || literal.includes('fallbackTemplateId')
        || literal.includes('frontend_local_fallback')
      ) {
        continue
      }
      failed = true
      console.error(`internal term leak: fallback in ${file}`)
    }
  }
}

if (failed) process.exit(1)
console.log('internal term scan passed')
