#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const rulePath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const packagePath = join(root, 'package.json')
const p50Path = join(root, 'docs/backend/P50_P4_DOCUMENT_CORE_RESET.md')
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
const packageJson = readJson(packagePath)
const p50Doc = readFileSync(p50Path, 'utf8')
const core = rules.documentCore || {}

assert(core.policy === 'document_registry_only', 'P4 must use document_registry_only policy')
assert(core.baselineContract === 'docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md', 'P4 must anchor to the v3 onboarding contract')
assert(core.runtimeTruth === 'docs/product/rules/genre-runtime-rules.v1.json', 'P4 runtime truth must be the genre runtime registry')
assert(Array.isArray(core.humanEditableSources), 'P4 must list human-editable sources')
assert(core.humanEditableSources.includes('docs/product/rules/GENRE_CONSTRAINT_RULES.md'), 'P4 must keep GENRE_CONSTRAINT_RULES.md as a human source')
assert(core.humanEditableSources.includes('docs/product/rules/GENRE_KERNEL_RULES.md'), 'P4 must keep GENRE_KERNEL_RULES.md as a human source')
assert(core.sourceAuthority?.primary === 'final_constraint_kernel_documents', 'P4 must use the final constraint/kernel documents as primary authority')
assert(core.sourceAuthority?.normalizedCorpus === '21_type_constraint_kernel_pdf_set', 'P4 must anchor to the 21-type document corpus')
assert(core.sourceAuthority?.compilePath === 'human_editable_rule_docs_then_runtime_registry', 'P4 must compile through human-editable rule docs before runtime registry')
assert(core.sourceAuthority?.runtimeResolver === 'registry_fields_only', 'P4 runtime resolver must read registry fields only')
assert(core.sourceAuthority?.temporaryRuntimeBranches === 'rejected', 'P4 must reject temporary runtime branches')
assert(core.deprecatedCasePolicy?.status === 'purged', 'P4 must purge deprecated case-derived constraints')
assert(core.deprecatedCasePolicy?.caseDerivedGlobalConstraints === 'rejected', 'P4 must reject case-derived global constraints')
assert(core.deprecatedCasePolicy?.activation === 'profile_rule_only', 'P4 activation must be profile_rule_only')
assert(core.deprecatedCasePolicy?.examplesAreNotRuntimeRules === true, 'P4 examples must remain non-executable')
assert(core.runtimeContract?.constraintApplication === 'active_profile_rules_only', 'P4 constraints must apply only through active ConstraintProfile.rules')
assert(core.runtimeContract?.kernelApplication === 'compatible_profile_only', 'P4 kernels must apply only through compatibleProfiles')
assert(core.runtimeContract?.noMatchBehavior === 'socratic_clarify_without_runtime_constraints', 'P4 no-match behavior must clarify instead of inventing runtime constraints')
assert(core.runtimeContract?.publicSurfacePolicy === 'hide_profile_ids_kernel_ids_source_refs_provider_prompt_plumbing', 'P4 public surfaces must hide internal rule plumbing')
assert(core.runtimeContract?.qualityBoundary === 'document_rule_fail_behavior_only', 'P4 quality brake must use documented failBehavior only')
for (const input of ['selected_template', 'selected_genre', 'story_direction', 'user_seed', 'explicit_author_override']) {
  assert(core.runtimeContract?.resolverInputs?.includes(input), `P4 runtimeContract must include resolver input ${input}`)
}
for (const output of ['activeProfiles', 'activeRules', 'activeKernels', 'activationEvidence', 'qualityBrakeDecision']) {
  assert(core.runtimeContract?.resolverOutputs?.includes(output), `P4 runtimeContract must include resolver output ${output}`)
}
assert(Array.isArray(core.nonExecutableInputs), 'P4 must declare non-executable research inputs')
const allowedNonExecutableInputs = new Set([
  'browser_qa_note',
  'research_intake_note',
  'provider_prompt_experiment',
  'backend_review_suggestion',
])
const unexpectedInputs = core.nonExecutableInputs.filter(input => !allowedNonExecutableInputs.has(input))
assert(unexpectedInputs.length === 0, `P4 non-executable inputs must stay generic research intake types: ${unexpectedInputs.join(', ')}`)
assert(core.nonExecutableInputs.includes('research_intake_note'), 'P4 must keep manual research notes non-executable until generalized into the registry')
assert(existsSync(join(root, core.baselineContract)), `missing ${core.baselineContract}`)
for (const source of core.humanEditableSources) assert(existsSync(join(root, source)), `missing ${source}`)
assert(packageJson.scripts?.['check:p4-deprecated-case-logic'] === 'node scripts/check-p4-deprecated-case-logic.mjs', 'package.json must expose check:p4-deprecated-case-logic')
assert(packageJson.scripts?.test?.includes('npm run check:p4-deprecated-case-logic'), 'root npm run test must include check:p4-deprecated-case-logic')
assert(p50Doc.includes('npm run check:p4-deprecated-case-logic'), 'P50 doc must document the deprecated case regression gate')
assert(p50Doc.includes('discarded premise-specific P4 logic'), 'P50 doc must explain the discarded premise-specific P4 boundary')
assert(p50Doc.includes('structural, not a replacement negative-word list'), 'P50 doc must define the P4 regression gate as structural, not a term list')
assert(p50Doc.includes('global premise ban lists outside active `ConstraintProfile.rules[]`'), 'P50 doc must forbid global premise ban lists outside active profile rules')

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
  sourceAuthority: core.sourceAuthority,
  deprecatedCasePolicy: core.deprecatedCasePolicy,
  runtimeContract: core.runtimeContract,
}
const artifactPath = join(outputDir, `p4-document-core-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
