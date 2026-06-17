#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const rulePath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const outputDir = join(root, 'artifacts/runtime')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys)
    return keys
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key)
      collectKeys(nested, keys)
    }
  }
  return keys
}

const rules = readJson(rulePath)
const core = rules.documentCore || {}

assert(core.policy === 'document_registry_only', 'P4 must use document_registry_only policy')
assert(core.baselineContract === 'docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md', 'P4 must anchor to the v3 onboarding contract')
assert(core.runtimeTruth === 'docs/product/rules/genre-runtime-rules.v1.json', 'P4 runtime truth must be the genre runtime registry')
assert(Array.isArray(core.humanEditableSources), 'P4 must list human-editable sources')
assert(core.humanEditableSources.includes('docs/product/rules/GENRE_CONSTRAINT_RULES.md'), 'P4 must keep GENRE_CONSTRAINT_RULES.md as a human source')
assert(core.humanEditableSources.includes('docs/product/rules/GENRE_KERNEL_RULES.md'), 'P4 must keep GENRE_KERNEL_RULES.md as a human source')
assert(Array.isArray(core.nonExecutableInputs), 'P4 must declare non-executable research inputs')
assert(core.nonExecutableInputs.includes('historical_negative_sample'), 'P4 must mark historical negative samples as non-executable')
assert(existsSync(join(root, core.baselineContract)), `missing ${core.baselineContract}`)
for (const source of core.humanEditableSources) assert(existsSync(join(root, source)), `missing ${source}`)

const forbiddenKeys = collectKeys(rules).filter(key => /promptCase|legacyCase|caseOverride|scenarioPatch|oneOff|adHoc/i.test(key))
assert(forbiddenKeys.length === 0, `P4 registry contains case-specific override keys: ${forbiddenKeys.join(', ')}`)

assert(Array.isArray(rules.constraintProfiles) && rules.constraintProfiles.length >= 21, 'P4 registry must expose the document profile set')
assert(Array.isArray(rules.genreKernels) && rules.genreKernels.length >= rules.constraintProfiles.length, 'P4 registry must expose compatible kernels')

const profileIds = new Set(rules.constraintProfiles.map(profile => profile.id))
for (const profile of rules.constraintProfiles) {
  assert(profile.sourceRefs?.every(ref => /^rwref_\d{4}$/.test(ref)), `${profile.id} sourceRefs must remain anonymous`)
  assert(profile.rules?.length > 0, `${profile.id} must contain document rules`)
}
for (const kernel of rules.genreKernels) {
  assert(kernel.compatibleProfiles?.some(id => profileIds.has(id)), `${kernel.id} must connect to at least one document profile`)
  assert(kernel.sourceRefs?.every(ref => /^rwref_\d{4}$/.test(ref)), `${kernel.id} sourceRefs must remain anonymous`)
}

mkdirSync(outputDir, { recursive: true })
const artifact = {
  status: 'passed',
  scope: 'P4 document-core constraint and kernel reset',
  source: relative(root, rulePath),
  policy: core.policy,
  profileCount: rules.constraintProfiles.length,
  kernelCount: rules.genreKernels.length,
  nonExecutableInputs: core.nonExecutableInputs,
}
const artifactPath = join(outputDir, `p4-document-core-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
