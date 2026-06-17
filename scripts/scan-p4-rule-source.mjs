#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

const workflowSource = join(root, 'packages/agent-runtime/src/workflows.ts')
const runtimeRulesSource = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const constraintRuleDoc = join(root, 'docs/product/rules/GENRE_CONSTRAINT_RULES.md')
const kernelRuleDoc = join(root, 'docs/product/rules/GENRE_KERNEL_RULES.md')
const ruleDocSources = [
  constraintRuleDoc,
  kernelRuleDoc,
]
const runtimeImplementationSources = [
  join(root, 'packages/agent-runtime/src/constraints.ts'),
  join(root, 'packages/agent-runtime/src/workflows.ts'),
  join(root, 'packages/agent-runtime/src/workflows.test.ts'),
  join(root, 'backend/src/narrativeos/services/creator_dialogue.py'),
  join(root, 'backend/tests/test_creator_dialogue_api.py'),
  join(root, 'backend/tests/test_tool_bridge_api.py'),
  join(root, 'scripts/smoke-creator-chain.mjs'),
]
const activeContractSources = [
  ...runtimeImplementationSources,
  join(root, 'docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md'),
  join(root, 'docs/product/rules/GENRE_CONSTRAINT_RULES.md'),
  join(root, 'docs/product/rules/GENRE_KERNEL_RULES.md'),
]
const forbiddenWorkflowPatterns = [
  {
    pattern: /profile\.id\s*={2,3}\s*['"]/,
    message: 'workflow must not branch on hardcoded profile ids; use active GenreKernel fields instead',
  },
  {
    pattern: /kernel\.id\s*={2,3}\s*['"]/,
    message: 'workflow must not branch on hardcoded kernel ids; use document-derived kernel fields instead',
  },
]
const staleDocPatterns = [
  {
    pattern: /\bothers-modern\b/,
    message: 'rule docs must use current registry id modern-other, not stale others-modern',
  },
  {
    pattern: /\bkernel-others-modern\b/,
    message: 'rule docs must use current registry id kernel-modern-other, not stale kernel-others-modern',
  },
]
const retiredPromptCasePatterns = [
  'd2VzdGVybl9mYW50YXN5X3RyYW5zbWlncmF0aW9u',
  'bm9uX2dhbWU=',
  'YmFuX2FuY2llbnRfY2hpbmVzZV9vZmZpY2lhbF9yb2xlcw==',
  'd2VzdGVybi1mYW50YXN5',
  'bm9uLWdhbWUgZHVuZ2Vvbg==',
  'YW5jaWVudCBDaGluZXNlIG9mZmljaWFsIHJvbGVz',
  '6KW/5bm7',
  '6Z2e5ri45oiP5YyW',
  '5Y+k5Luj5a6Y572y',
  '5riF5rKz5Y6/',
  '5Lu15L2c',
  '5Y6/6KGZ',
].map(encoded => new RegExp(Buffer.from(encoded, 'base64').toString('utf8'), 'i'))
function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expect(condition, message) {
  if (!condition) violations.push(message)
}

function expectArray(value, message) {
  expect(Array.isArray(value) && value.length > 0, message)
}

function hasPlainReferenceLeak(value) {
  return /《[^》]+》|workTitle|authorName|representativeWorkTitle/.test(JSON.stringify(value))
}

const violations = []

if (!existsSync(runtimeRulesSource)) {
  violations.push(`${relative(root, runtimeRulesSource)} missing runtime rule source`)
} else {
  const runtimeRules = JSON.parse(readFileSync(runtimeRulesSource, 'utf8'))
  const profiles = runtimeRules.constraintProfiles || []
  const kernels = runtimeRules.genreKernels || []
  const documentCore = runtimeRules.documentCore || {}
  const profileIds = new Set(profiles.map(profile => profile.id))
  const kernelProfileIds = new Set(kernels.flatMap(kernel => kernel.compatibleProfiles || []))
  const registryIds = [
    ...profiles.map(profile => String(profile.id || '')).filter(Boolean),
    ...kernels.map(kernel => String(kernel.id || '')).filter(Boolean),
  ]

  expect(runtimeRules.version >= 2, 'runtime rules must use the document-derived versioned registry')
  expect(documentCore.policy === 'document_registry_only', 'runtime rules must declare document_registry_only policy')
  expect(documentCore.baselineContract === 'docs/baseline/NarrativeOS_Quantum_Engineering_Contract_v3_Onboarding.md', 'runtime rules must point to the v3 baseline contract')
  expect(documentCore.runtimeTruth === 'docs/product/rules/genre-runtime-rules.v1.json', 'runtime rules must declare themselves as runtime truth')
  expectArray(documentCore.humanEditableSources, 'runtime rules must list human-editable source documents')
  expect(documentCore.humanEditableSources.includes('docs/product/rules/GENRE_CONSTRAINT_RULES.md'), 'runtime rules must list GENRE_CONSTRAINT_RULES.md as a human source')
  expect(documentCore.humanEditableSources.includes('docs/product/rules/GENRE_KERNEL_RULES.md'), 'runtime rules must list GENRE_KERNEL_RULES.md as a human source')
  expectArray(documentCore.nonExecutableInputs, 'runtime rules must name non-executable research inputs')
  expectArray(profiles, 'runtime rules must contain ConstraintProfile entries')
  expectArray(kernels, 'runtime rules must contain GenreKernel entries')
  expect(!hasPlainReferenceLeak(runtimeRules), 'runtime rules must not expose representative work titles or author fields')

  for (const profile of profiles) {
    expect(typeof profile.id === 'string' && profile.id.length > 0, 'ConstraintProfile.id is required')
    expect(typeof profile.displayName === 'string' && profile.displayName.length > 0, `${profile.id || 'unknown'} displayName is required`)
    expect(['world', 'thematic', 'character', 'narrative', 'safety'].includes(profile.layer), `${profile.id} layer must follow the v3 contract`)
    expect(Number.isFinite(profile.priority), `${profile.id} priority must be numeric`)
    expectArray(profile.signalTerms, `${profile.id} signalTerms must be populated`)
    expectArray(profile.entryModeSignals, `${profile.id} entryModeSignals must be populated`)
    expectArray(profile.toneSignals, `${profile.id} toneSignals must be populated`)
    expectArray(profile.rules, `${profile.id} rules must be populated`)
    for (const ref of profile.sourceRefs || []) {
      expect(/^rwref_\d{4}$/.test(ref), `${profile.id} sourceRefs must use anonymous rwref ids`)
    }
    for (const rule of profile.rules || []) {
      expect(typeof rule.id === 'string' && rule.id.length > 0, `${profile.id} rule.id is required`)
      expect(['hard', 'soft'].includes(rule.severity), `${profile.id}/${rule.id} severity must be hard or soft`)
      expectArray(rule.appliesWhen, `${profile.id}/${rule.id} appliesWhen must be populated`)
      expect(typeof rule.rule === 'string' && rule.rule.length > 0, `${profile.id}/${rule.id} rule text is required`)
      expect(['allow', 'warn', 'repair', 'regenerate', 'block'].includes(rule.failBehavior), `${profile.id}/${rule.id} failBehavior must follow the v3 contract`)
    }
  }

  for (const kernel of kernels) {
    expect(typeof kernel.id === 'string' && kernel.id.length > 0, 'GenreKernel.id is required')
    expect(typeof kernel.name === 'string' && kernel.name.length > 0, `${kernel.id || 'unknown'} name is required`)
    expectArray(kernel.compatibleProfiles, `${kernel.id} compatibleProfiles must be populated`)
    expect(typeof kernel.thesis === 'string' && kernel.thesis.length > 0, `${kernel.id} thesis is required`)
    expect(typeof kernel.antiThesis === 'string' && kernel.antiThesis.length > 0, `${kernel.id} antiThesis is required`)
    expectArray(kernel.eventStructure, `${kernel.id} eventStructure must be populated`)
    expectArray(kernel.motiveRules, `${kernel.id} motiveRules must be populated`)
    expectArray(kernel.conflictRules, `${kernel.id} conflictRules must be populated`)
    expectArray(kernel.climaxRules, `${kernel.id} climaxRules must be populated`)
    expect(kernel.timeControls && Number.isFinite(kernel.timeControls.baseRate), `${kernel.id} timeControls.baseRate is required`)
    for (const ref of kernel.sourceRefs || []) {
      expect(/^rwref_\d{4}$/.test(ref), `${kernel.id} sourceRefs must use anonymous rwref ids`)
    }
    for (const profileId of kernel.compatibleProfiles || []) {
      expect(profileIds.has(profileId), `${kernel.id} references missing profile ${profileId}`)
    }
  }

  for (const profile of profiles) {
    expect(kernelProfileIds.has(profile.id), `${profile.id} must have at least one compatible GenreKernel`)
  }

  if (existsSync(constraintRuleDoc)) {
    const constraintDocText = readFileSync(constraintRuleDoc, 'utf8')
    for (const profile of profiles) {
      expect(constraintDocText.includes(`\`${profile.id}\``), `GENRE_CONSTRAINT_RULES.md must list profile id ${profile.id}`)
      expect(constraintDocText.includes(profile.displayName), `GENRE_CONSTRAINT_RULES.md must list displayName ${profile.displayName}`)
    }
  } else {
    violations.push(`${relative(root, constraintRuleDoc)} missing human-editable constraint source`)
  }

  if (existsSync(kernelRuleDoc)) {
    const kernelDocText = readFileSync(kernelRuleDoc, 'utf8')
    for (const kernel of kernels) {
      expect(kernelDocText.includes(`\`${kernel.id}\``), `GENRE_KERNEL_RULES.md must list kernel id ${kernel.id}`)
      expect(kernelDocText.includes(kernel.name.replace(/内核$/, '')), `GENRE_KERNEL_RULES.md must list kernel name ${kernel.name}`)
    }
  } else {
    violations.push(`${relative(root, kernelRuleDoc)} missing human-editable kernel source`)
  }

  for (const source of runtimeImplementationSources) {
    if (!existsSync(source)) continue
    const text = readFileSync(source, 'utf8')
    for (const id of registryIds) {
      const pattern = new RegExp(`['"\`]${escapeRegExp(id)}['"\`]`)
      const match = text.match(pattern)
      if (match?.index !== undefined) {
        violations.push(
          `${relative(root, source)}:${lineNumber(text, match.index)} must not hardcode registry id ${id}; load it from ${relative(root, runtimeRulesSource)}`,
        )
      }
    }
  }
}

if (existsSync(workflowSource)) {
  const workflowText = readFileSync(workflowSource, 'utf8')
  for (const check of forbiddenWorkflowPatterns) {
    const match = workflowText.match(check.pattern)
    if (match?.index !== undefined) {
      violations.push(`${relative(root, workflowSource)}:${lineNumber(workflowText, match.index)} ${check.message}`)
    }
  }
}

for (const docSource of ruleDocSources) {
  if (!existsSync(docSource)) continue
  const text = readFileSync(docSource, 'utf8')
  for (const check of staleDocPatterns) {
    const match = text.match(check.pattern)
    if (match?.index !== undefined) {
      violations.push(`${relative(root, docSource)}:${lineNumber(text, match.index)} ${check.message}`)
    }
  }
}

for (const source of activeContractSources) {
  if (!existsSync(source)) continue
  const text = readFileSync(source, 'utf8')
  for (const pattern of retiredPromptCasePatterns) {
    const match = text.match(pattern)
    if (match?.index !== undefined) {
      violations.push(
        `${relative(root, source)}:${lineNumber(text, match.index)} must not encode retired prompt-case constraints; add document-derived ConstraintProfile rules instead`,
      )
    }
  }
}

if (violations.length) {
  console.error(`P4 rule source scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log('P4 rule source scan passed')
