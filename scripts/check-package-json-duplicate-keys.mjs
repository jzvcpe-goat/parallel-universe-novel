import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
const scriptsStart = source.indexOf('"scripts"')
const scriptsEnd = source.indexOf('\n  },', scriptsStart)
if (scriptsStart < 0 || scriptsEnd < 0) throw new Error('package.json scripts object is missing')

const keys = [...source.slice(scriptsStart, scriptsEnd).matchAll(/^\s{4}"([^"\\]+)"\s*:/gm)].map(match => match[1])
const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
if (duplicates.length) throw new Error(`package.json contains duplicate script keys: ${[...new Set(duplicates)].join(', ')}`)

console.log(`[package-json-duplicate-keys] PASS (${keys.length} script keys)`)
