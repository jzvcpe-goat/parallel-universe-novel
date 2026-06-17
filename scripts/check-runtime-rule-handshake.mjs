#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runtimeRulesMeta } from '../packages/agent-runtime/dist/src/constraints.js'

const root = resolve(new URL('..', import.meta.url).pathname)
const rulePath = resolve(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const rules = JSON.parse(readFileSync(rulePath, 'utf8'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(runtimeRulesMeta.version === rules.version, 'agent runtime rule version does not match rule JSON')
assert(runtimeRulesMeta.source === 'docs/product/rules/genre-runtime-rules.v1.json', 'agent runtime rule source is unstable')
assert(runtimeRulesMeta.profileCount === rules.constraintProfiles.length, 'agent runtime profile count does not match rule JSON')
assert(runtimeRulesMeta.kernelCount === rules.genreKernels.length, 'agent runtime kernel count does not match rule JSON')
assert(
  runtimeRulesMeta.privacy.representativeWorks === rules.privacy.representativeWorks,
  'agent runtime privacy representativeWorks does not match rule JSON',
)
assert(
  runtimeRulesMeta.privacy.publicReferenceField === rules.privacy.publicReferenceField,
  'agent runtime privacy publicReferenceField does not match rule JSON',
)

console.log(JSON.stringify({
  status: 'passed',
  source: runtimeRulesMeta.source,
  version: runtimeRulesMeta.version,
  profileCount: runtimeRulesMeta.profileCount,
  kernelCount: runtimeRulesMeta.kernelCount,
  privacy: runtimeRulesMeta.privacy,
}, null, 2))
