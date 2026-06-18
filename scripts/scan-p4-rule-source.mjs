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

function refsFromText(value) {
  const text = String(value || '')
  if (/\bnone yet\b/i.test(text)) return []
  return [...text.matchAll(/rwref_\d{4}/g)].map(match => match[0])
}

function refListLabel(refs) {
  return refs.length ? refs.join(',') : 'none yet'
}

function expectSameRefs(actual, expected, message) {
  const actualLabel = refListLabel(actual)
  const expectedLabel = refListLabel(expected)
  expect(actualLabel === expectedLabel, `${message}; expected ${expectedLabel}, got ${actualLabel}`)
}

function tableSourceRefs(docText, itemId) {
  const escaped = escapeRegExp(itemId)
  const rowPattern = new RegExp(`^\\|\\s*\\\`${escaped}\\\`[^\\n]*\\|$`, 'm')
  const match = docText.match(rowPattern)
  if (!match) return null
  const cells = match[0].split('|').slice(1, -1).map(cell => cell.trim())
  return refsFromText(cells[2] || '')
}

function sectionSourceRefs(docText, itemId) {
  const escaped = escapeRegExp(itemId)
  const headerPattern = new RegExp(`^###\\s+\\\`${escaped}\\\`\\s*$`, 'm')
  const header = docText.match(headerPattern)
  if (!header?.index && header?.index !== 0) return null
  const bodyStart = header.index + header[0].length
  const rest = docText.slice(bodyStart)
  const nextHeaderIndex = rest.search(/^###\s+`/m)
  const body = nextHeaderIndex >= 0 ? rest.slice(0, nextHeaderIndex) : rest
  const sourceLine = body.match(/^Source refs:\s*(.+)$/m)
  if (!sourceLine) return null
  return refsFromText(sourceLine[1])
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
  expect(documentCore.sourceAuthority?.primary === 'final_constraint_kernel_documents', 'runtime rules must use final constraint/kernel documents as primary authority')
  expect(documentCore.sourceAuthority?.normalizedCorpus === '21_type_constraint_kernel_pdf_set', 'runtime rules must anchor to the 21-type document corpus')
  expect(documentCore.sourceAuthority?.compilePath === 'human_editable_rule_docs_then_runtime_registry', 'runtime rules must compile through human-editable docs')
  expect(documentCore.sourceAuthority?.runtimeResolver === 'registry_fields_only', 'runtime resolver must use registry fields only')
  expect(documentCore.sourceAuthority?.temporaryRuntimeBranches === 'rejected', 'runtime rules must reject temporary branches')
  expect(documentCore.deprecatedCasePolicy?.status === 'purged', 'runtime rules must purge deprecated case-derived constraints')
  expect(documentCore.deprecatedCasePolicy?.caseDerivedGlobalConstraints === 'rejected', 'runtime rules must reject case-derived global constraints')
  expect(documentCore.deprecatedCasePolicy?.activation === 'profile_rule_only', 'runtime rules must activate constraints only through selected profiles and rules')
  expect(documentCore.deprecatedCasePolicy?.examplesAreNotRuntimeRules === true, 'runtime rules must keep examples non-executable')
  expect(documentCore.runtimeContract?.constraintApplication === 'active_profile_rules_only', 'runtime rules must apply constraints only through active profile rules')
  expect(documentCore.runtimeContract?.kernelApplication === 'compatible_profile_only', 'runtime rules must select kernels only through compatible profiles')
  expect(documentCore.runtimeContract?.noMatchBehavior === 'socratic_clarify_without_runtime_constraints', 'runtime rules must clarify rather than invent constraints when no profile matches')
  expect(documentCore.runtimeContract?.publicSurfacePolicy === 'hide_profile_ids_kernel_ids_source_refs_provider_prompt_plumbing', 'runtime rules must keep internal profile/kernel plumbing out of public surfaces')
  expect(documentCore.runtimeContract?.qualityBoundary === 'document_rule_fail_behavior_only', 'runtime rules must route quality decisions through documented failBehavior only')
  for (const input of ['selected_template', 'selected_genre', 'story_direction', 'user_seed', 'explicit_author_override']) {
    expect(documentCore.runtimeContract?.resolverInputs?.includes(input), `runtime contract must include resolver input ${input}`)
  }
  for (const output of ['activeProfiles', 'activeRules', 'activeKernels', 'activationEvidence', 'qualityBrakeDecision']) {
    expect(documentCore.runtimeContract?.resolverOutputs?.includes(output), `runtime contract must include resolver output ${output}`)
  }
  expectArray(documentCore.humanEditableSources, 'runtime rules must list human-editable source documents')
  expect(documentCore.humanEditableSources.includes('docs/product/rules/GENRE_CONSTRAINT_RULES.md'), 'runtime rules must list GENRE_CONSTRAINT_RULES.md as a human source')
  expect(documentCore.humanEditableSources.includes('docs/product/rules/GENRE_KERNEL_RULES.md'), 'runtime rules must list GENRE_KERNEL_RULES.md as a human source')
  expectArray(documentCore.nonExecutableInputs, 'runtime rules must name non-executable research inputs')
  const allowedNonExecutableInputs = new Set([
    'browser_qa_note',
    'research_intake_note',
    'provider_prompt_experiment',
    'backend_review_suggestion',
  ])
  for (const inputType of documentCore.nonExecutableInputs || []) {
    expect(allowedNonExecutableInputs.has(inputType), `runtime rules must use generic research intake types, not ${inputType}`)
  }
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
      const expectedRefs = profile.sourceRefs || []
      const tableRefs = tableSourceRefs(constraintDocText, profile.id)
      if (tableRefs) {
        expectSameRefs(tableRefs, expectedRefs, `GENRE_CONSTRAINT_RULES.md table source refs for ${profile.id} must match runtime registry`)
      }
      const sectionRefs = sectionSourceRefs(constraintDocText, profile.id)
      if (sectionRefs) {
        expectSameRefs(sectionRefs, expectedRefs, `GENRE_CONSTRAINT_RULES.md section source refs for ${profile.id} must match runtime registry`)
      }
      for (const rule of profile.rules || []) {
        expect(constraintDocText.includes(`\`${rule.id}\``), `GENRE_CONSTRAINT_RULES.md must list rule id ${rule.id}`)
      }
    }
  } else {
    violations.push(`${relative(root, constraintRuleDoc)} missing human-editable constraint source`)
  }

  if (existsSync(kernelRuleDoc)) {
    const kernelDocText = readFileSync(kernelRuleDoc, 'utf8')
    for (const kernel of kernels) {
      expect(kernelDocText.includes(`\`${kernel.id}\``), `GENRE_KERNEL_RULES.md must list kernel id ${kernel.id}`)
      expect(kernelDocText.includes(kernel.name.replace(/内核$/, '')), `GENRE_KERNEL_RULES.md must list kernel name ${kernel.name}`)
      expect(kernelDocText.includes(kernel.pacingModel), `GENRE_KERNEL_RULES.md must list pacing model for ${kernel.id}`)
      const expectedRefs = kernel.sourceRefs || []
      const tableRefs = tableSourceRefs(kernelDocText, kernel.id)
      if (tableRefs) {
        expectSameRefs(tableRefs, expectedRefs, `GENRE_KERNEL_RULES.md table source refs for ${kernel.id} must match runtime registry`)
      }
      const sectionRefs = sectionSourceRefs(kernelDocText, kernel.id)
      if (sectionRefs) {
        expectSameRefs(sectionRefs, expectedRefs, `GENRE_KERNEL_RULES.md section source refs for ${kernel.id} must match runtime registry`)
      }
      for (const profileId of kernel.compatibleProfiles || []) {
        expect(kernelDocText.includes(`\`${profileId}\``), `GENRE_KERNEL_RULES.md must list compatible profile ${profileId}`)
      }
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

if (violations.length) {
  console.error(`P4 rule source scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log('P4 rule source scan passed')
