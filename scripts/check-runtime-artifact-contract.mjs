#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const distConstraints = resolve(root, 'packages/agent-runtime/dist/src/constraints.js')
const distWorkflows = resolve(root, 'packages/agent-runtime/dist/src/workflows.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(
  existsSync(distConstraints) && existsSync(distWorkflows),
  'agent runtime dist files are missing; run npm --workspace @narrativeos/agent-runtime build first',
)

const { constraintProfiles, resolveKernels } = await import(distConstraints)
const { socraticCreateWorkflow } = await import(distWorkflows)

const forbiddenFragments = [
  'sourceRefs',
  'source_refs',
  'representativeWorks',
  'representative_works',
  'workTitle',
  'authorName',
  'source_evidence',
  'provider',
  'system prompt',
  'rawHash',
  'StateVector',
  'AgentRun',
  'CHANGES JSON',
  'canon_written',
  'branch_written',
  'rwref_',
  '《',
  '》',
]

function firstText(values, fallback) {
  return values?.find(value => String(value || '').trim().length > 0) || fallback
}

function seedForProfile(profile) {
  const signal = firstText(profile.signalTerms, profile.displayName)
  const entry = firstText(profile.entryModeSignals, '一个必须立刻处理的开场事件')
  const tone = firstText(profile.toneSignals, '选择代价')
  return `我想写${profile.displayName}，从${entry}开始，${signal}和${tone}会把人物推到选择前。`
}

function scanPrivateFragments(value, path = 'runtimeArtifact', hits = []) {
  if (value == null) return hits
  if (typeof value === 'string') {
    for (const fragment of forbiddenFragments) {
      if (value.includes(fragment)) hits.push(`${path} contains forbidden fragment ${fragment}`)
    }
    return hits
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateFragments(item, `${path}[${index}]`, hits))
    return hits
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      for (const fragment of forbiddenFragments) {
        if (key.includes(fragment)) hits.push(`${path}.${key} uses forbidden key fragment ${fragment}`)
      }
      scanPrivateFragments(child, `${path}.${key}`, hits)
    }
  }
  return hits
}

function assertRuntimeArtifact(output, profile) {
  const artifact = output.runtimeArtifact
  assert(artifact && typeof artifact === 'object', `${profile.id} missing runtimeArtifact`)
  assert(artifact.version === 1, `${profile.id} runtimeArtifact.version must be 1`)
  assert(artifact.narrativeRun?.id === output.runId, `${profile.id} narrativeRun id must match runId`)
  assert(artifact.narrativeRun?.projectId === output.projectId, `${profile.id} narrativeRun projectId must match`)
  assert(artifact.narrativeRun?.sessionId === output.sessionId, `${profile.id} narrativeRun sessionId must match`)
  assert(artifact.narrativeRun?.authoringMode === 'co_write', `${profile.id} authoringMode must be co_write`)
  assert(artifact.narrativeRun?.decision === 'candidate', `${profile.id} initial runtime decision must stay candidate`)

  assert(Array.isArray(artifact.constraintSet) && artifact.constraintSet.length > 0, `${profile.id} constraintSet missing`)
  assert(artifact.constraintSet[0].profileId === profile.id, `${profile.id} primary constraint missing from artifact`)
  assert(Array.isArray(artifact.kernelSelection) && artifact.kernelSelection.length > 0, `${profile.id} kernelSelection missing`)
  assert(
    artifact.kernelSelection[0].kernelId === resolveKernels([profile])[0]?.id,
    `${profile.id} kernelSelection must match compatible GenreKernel`,
  )
  assert(Array.isArray(artifact.scenePlan?.beats) && artifact.scenePlan.beats.length > 0, `${profile.id} scenePlan beats missing`)
  assert(Array.isArray(artifact.scenePlan?.choiceSlots) && artifact.scenePlan.choiceSlots.length <= 2, `${profile.id} choiceSlots must stay Socratic`)
  assert(Array.isArray(artifact.stateWritebackPreview) && artifact.stateWritebackPreview.length > 0, `${profile.id} stateWritebackPreview missing`)
  assert(artifact.timeConsistencyReport?.status === 'pass', `${profile.id} timeConsistencyReport must pass in seed flow`)
  assert(artifact.qualityBrakeReport?.result === output.qualityPreview?.result, `${profile.id} quality report must match qualityPreview`)
  assert(artifact.qualityBrakeReport?.decision === artifact.narrativeRun?.decision, `${profile.id} quality decision must match narrative decision`)
  assert(artifact.branchGenerationResult?.status === 'not_generated', `${profile.id} branch must not be generated before author confirmation`)
  assert(artifact.branchGenerationResult?.reason === 'author_confirmation_required', `${profile.id} branch reason must require author confirmation`)
  assert(artifact.branchGenerationResult?.visibility === 'private', `${profile.id} branch visibility must stay private`)

  const privateHits = scanPrivateFragments(artifact)
  assert(privateHits.length === 0, `${profile.id} runtimeArtifact privacy leak:\n- ${privateHits.join('\n- ')}`)
}

const checked = []
for (const profile of constraintProfiles) {
  const output = await socraticCreateWorkflow({
    seed: seedForProfile(profile),
    genre: profile.displayName,
    context: {
      story_direction: {
        label: profile.displayName,
        tone: firstText(profile.toneSignals, profile.displayName),
        keywords: [
          profile.displayName,
          firstText(profile.signalTerms, profile.displayName),
          firstText(profile.entryModeSignals, profile.displayName),
        ].join(' '),
      },
      main_universe_template: {
        title: `${profile.displayName}开场`,
        genre: profile.displayName,
      },
    },
  }, { preferToolBridge: false })

  assertRuntimeArtifact(output, profile)
  checked.push(profile.id)
}

console.log(JSON.stringify({
  status: 'passed',
  checkedProfiles: checked.length,
  artifactVersion: 1,
  privacy: 'no_source_refs_or_representative_work_fragments',
}, null, 2))
