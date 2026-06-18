#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const outputDir = join(root, 'artifacts/runtime')

const scannedRoots = [
  'docs/product/rules',
  'packages/agent-runtime/src',
  'packages/agent-runtime/scripts',
  'backend/src/narrativeos/api',
  'backend/src/narrativeos/services',
  'backend/tests',
  'app/src',
]

const deprecatedCaseSignals = [
  '西幻',
  '非游戏化',
  '禁古代官署职业',
  '古代官署职业',
  '清河县',
  '仵作',
  '县衙',
  '地下城与勇士',
  'western fantasy',
  'non-gamified',
  'ancient-office',
  'caseDerivedGlobalConstraints = allowed',
]

const requiredDocumentCore = {
  policy: 'document_registry_only',
  deprecatedCaseStatus: 'purged',
  activation: 'profile_rule_only',
  examplesAreNotRuntimeRules: true,
  temporaryRuntimeBranches: 'rejected',
}

function walk(path, files = []) {
  if (!existsSync(path)) return files
  const stat = statSync(path)
  if (stat.isFile()) {
    if (/\.(ts|tsx|js|mjs|py|json|md|yaml|yml|css)$/.test(path)) files.push(path)
    return files
  }
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'artifacts') continue
    walk(join(path, entry), files)
  }
  return files
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const rulePath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const runtimeRules = JSON.parse(readFileSync(rulePath, 'utf8'))
const core = runtimeRules.documentCore || {}

assert(core.policy === requiredDocumentCore.policy, 'P4 must keep document_registry_only policy')
assert(core.deprecatedCasePolicy?.status === requiredDocumentCore.deprecatedCaseStatus, 'P4 deprecated case policy must stay purged')
assert(core.deprecatedCasePolicy?.activation === requiredDocumentCore.activation, 'P4 activation must stay profile_rule_only')
assert(core.deprecatedCasePolicy?.examplesAreNotRuntimeRules === requiredDocumentCore.examplesAreNotRuntimeRules, 'P4 examples must stay non-executable')
assert(core.sourceAuthority?.temporaryRuntimeBranches === requiredDocumentCore.temporaryRuntimeBranches, 'P4 temporary runtime branches must stay rejected')

const scannedFiles = scannedRoots.flatMap(scanRoot => walk(join(root, scanRoot)))
const violations = []

for (const file of scannedFiles) {
  const rel = relative(root, file)
  const text = readFileSync(file, 'utf8')
  for (const signal of deprecatedCaseSignals) {
    let index = text.indexOf(signal)
    while (index !== -1) {
      violations.push(`${rel}:${lineNumber(text, index)} contains deprecated case-derived P4 signal "${signal}"`)
      index = text.indexOf(signal, index + signal.length)
    }
  }
}

if (violations.length) {
  console.error(`P4 deprecated case logic scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

mkdirSync(outputDir, { recursive: true })
const artifact = {
  status: 'passed',
  scope: 'P4 deprecated case-derived logic purge',
  source: relative(root, rulePath),
  scannedRoots,
  scannedFileCount: scannedFiles.length,
  deprecatedCasePolicy: core.deprecatedCasePolicy,
  sourceAuthority: core.sourceAuthority,
}
const artifactPath = join(outputDir, `p4-deprecated-case-logic-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
