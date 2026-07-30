import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pairedLiteraryDimensions } from '../app/src/features/creator-decision/pairedLiteraryComparison.ts'
import { decidePairedQualityCampaignTuning } from '../app/src/features/creator-decision/pairedQualityCampaign.ts'
import {
  frozenPairedQualityCoreFixtureIds,
  frozenPairedQualityFixtureIds,
} from './fixtures/creator-frozen-paired-quality-fixture.mts'

type GenerationPath = 'direct_writer' | 'architect_writer_workflow'
type ConfirmedPreference = GenerationPath | 'tie' | null
type PairedLiteraryDimension = typeof pairedLiteraryDimensions[number]

interface TrialDimension {
  dimension: string
  reasonCode: string
  verificationDecision: 'verify' | 'reject'
  confirmedPreference: ConfirmedPreference
  confirmedReasonCode: string | null
}

interface TrialHardConstraint {
  path: GenerationPath
  firstPassStatus: 'pass' | 'fail'
  violationType: string
  reasonCode: string
  verificationDecision: 'verify' | 'reject'
  confirmedStatus: 'pass' | 'fail' | null
  confirmedViolationType: string | null
  confirmedReasonCode: string | null
}

interface TrialSummary {
  schemaVersion: string
  trialId: string
  fixture: {
    id: string
    inputSha256: string
    realWorkingAgent: boolean
    realChapterMaterialUsed: boolean
  }
  candidates: {
    directWriter: { visibleLength: number; completeEnding: boolean }
    architectWriterWorkflow: {
      visibleLength: number
      completeEnding: boolean
      directionReceiptPresent: boolean
      refinement?: {
        literaryReviewCompleted: boolean
        literaryReviewCount: number
        actionableFindingCount: number
        localRepairCycleLimit: number
        localRepairCycles: Array<{
          dimension: string
          reviserAttempts: number
          independentReviewDecision: 'pass' | 'reject'
          applied: boolean
          disposition: string
        }>
        appliedRepairCount: number
        wholeTextRewritePerformed: boolean
        authorTextOverwritten: boolean
      }
    }
  }
  evaluation: {
    dimensions: TrialDimension[]
    hardConstraints: TrialHardConstraint[]
    overallWinnerDeclared: boolean
    compositeLiteraryScoreUsed: boolean
  }
  runtime: { realWorkingAgentCallCount: number }
  boundaries: Record<string, boolean>
}

const root = process.cwd()
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json',
    },
    model: { type: 'string' },
    'fixture-set': { type: 'string', default: 'core' },
    'reuse-campaign': { type: 'string' },
    'reuse-existing': { type: 'boolean', default: false },
    'review-focus': { type: 'string' },
  },
  strict: true,
})

if (!['core', 'extended'].includes(values['fixture-set'])) {
  throw new Error('--fixture-set must be core or extended.')
}
const selectedFixtureIds = values['fixture-set'] === 'extended'
  ? frozenPairedQualityFixtureIds
  : frozenPairedQualityCoreFixtureIds

const outputPath = path.resolve(root, values.output)
const outputDirectory = path.dirname(outputPath)
const trialDirectory = path.join(outputDirectory, 'trials')

async function runFixture(fixtureId: string, index: number) {
  const trialPath = path.join(trialDirectory, `${String(index + 1).padStart(2, '0')}-${fixtureId}.json`)
  const args = [
    'run',
    'validate:creator-frozen-paired-quality',
    '--',
    '--fixture',
    fixtureId,
    '--output',
    trialPath,
  ]
  if (values.model) args.push('--model', values.model)
  if (values['review-focus']) args.push('--review-focus', values['review-focus'])
  const env = { ...process.env }
  delete env.PUF_CREATOR_PAIRED_DEBUG_FIRST_PATH
  process.stdout.write(`[frozen-paired-campaign] ${index + 1}/${selectedFixtureIds.length} ${fixtureId}\n`)
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npm', args, {
      cwd: root,
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Frozen paired-quality fixture ${fixtureId} failed with ${code}:\n${stderr}`))
    })
  })
  return {
    trialPath,
    summary: JSON.parse(await readFile(trialPath, 'utf8')) as TrialSummary,
  }
}

async function readExistingFixture(fixtureId: string, index: number) {
  const trialPath = path.join(trialDirectory, `${String(index + 1).padStart(2, '0')}-${fixtureId}.json`)
  try {
    const summary = JSON.parse(await readFile(trialPath, 'utf8')) as TrialSummary
    process.stdout.write(`[frozen-paired-campaign] reuse existing ${index + 1}/${selectedFixtureIds.length} ${fixtureId}\n`)
    return { trialPath, summary }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

interface ReusableCampaignSummary {
  trials: Array<{ fixtureId: string; evidencePath: string }>
}

const reusableTrials = new Map<string, string>()
if (values['reuse-campaign']) {
  const reusableCampaignPath = path.resolve(root, values['reuse-campaign'])
  const reusableCampaign = JSON.parse(
    await readFile(reusableCampaignPath, 'utf8'),
  ) as ReusableCampaignSummary
  for (const trial of reusableCampaign.trials) {
    const reusableTrialPath = path.resolve(root, trial.evidencePath)
    const allowedRoot = path.resolve(root, 'validation/creator-ui')
    if (!reusableTrialPath.startsWith(`${allowedRoot}${path.sep}`)) {
      throw new Error(`Reusable trial must stay under validation/creator-ui: ${trial.evidencePath}`)
    }
    reusableTrials.set(trial.fixtureId, reusableTrialPath)
  }
}

async function readReusableCampaignFixture(fixtureId: string, index: number) {
  const trialPath = reusableTrials.get(fixtureId)
  if (!trialPath) return null
  process.stdout.write(`[frozen-paired-campaign] reuse campaign ${index + 1}/${selectedFixtureIds.length} ${fixtureId}\n`)
  return {
    trialPath,
    summary: JSON.parse(await readFile(trialPath, 'utf8')) as TrialSummary,
  }
}

await mkdir(trialDirectory, { recursive: true })
const trials = []
for (const [index, fixtureId] of selectedFixtureIds.entries()) {
  const existing = values['reuse-existing']
    ? await readExistingFixture(fixtureId, index)
    : null
  const reusable = await readReusableCampaignFixture(fixtureId, index)
  trials.push(existing || reusable || await runFixture(fixtureId, index))
}

assert.equal(trials.length, selectedFixtureIds.length)
assert.equal(new Set(trials.map(item => item.summary.fixture.id)).size, trials.length)
assert.equal(new Set(trials.map(item => item.summary.fixture.inputSha256)).size, trials.length)

const dimensionOutcomes = Object.fromEntries(pairedLiteraryDimensions.map(dimension => [dimension, {
  architectWriterWorkflow: 0,
  directWriter: 0,
  tie: 0,
  rejected: 0,
}])) as Record<PairedLiteraryDimension, {
  architectWriterWorkflow: number
  directWriter: number
  tie: number
  rejected: number
}>
const weaknessReasonCounts: Record<GenerationPath, Record<string, number>> = {
  direct_writer: {},
  architect_writer_workflow: {},
}
const hardConstraintOutcomes: Record<GenerationPath, {
  pass: number
  fail: number
  rejected: number
  reasonCounts: Record<string, number>
}> = {
  direct_writer: { pass: 0, fail: 0, rejected: 0, reasonCounts: {} },
  architect_writer_workflow: { pass: 0, fail: 0, rejected: 0, reasonCounts: {} },
}

for (const { summary } of trials) {
  assert.equal(summary.schemaVersion, 'creator-frozen-paired-quality-real-trial.v1')
  assert.equal(summary.fixture.realWorkingAgent, true)
  assert.equal(summary.fixture.realChapterMaterialUsed, false)
  assert.equal(summary.evaluation.overallWinnerDeclared, false)
  assert.equal(summary.evaluation.compositeLiteraryScoreUsed, false)
  assert.equal(summary.evaluation.dimensions.length, pairedLiteraryDimensions.length)
  for (const item of summary.evaluation.dimensions) {
    const outcome = dimensionOutcomes[item.dimension]
    assert.ok(outcome)
    if (item.verificationDecision === 'reject' || item.confirmedPreference === null) {
      outcome.rejected += 1
      continue
    }
    if (item.confirmedPreference === 'tie') {
      outcome.tie += 1
      continue
    }
    if (item.confirmedPreference === 'architect_writer_workflow') {
      outcome.architectWriterWorkflow += 1
      const reason = item.confirmedReasonCode!
      weaknessReasonCounts.direct_writer[reason] = (weaknessReasonCounts.direct_writer[reason] || 0) + 1
    } else {
      outcome.directWriter += 1
      const reason = item.confirmedReasonCode!
      weaknessReasonCounts.architect_writer_workflow[reason] = (
        weaknessReasonCounts.architect_writer_workflow[reason] || 0
      ) + 1
    }
  }
  for (const item of summary.evaluation.hardConstraints) {
    const outcome = hardConstraintOutcomes[item.path]
    if (item.verificationDecision === 'reject' || item.confirmedStatus === null) {
      outcome.rejected += 1
      continue
    }
    outcome[item.confirmedStatus] += 1
    const reason = item.confirmedReasonCode!
    outcome.reasonCounts[reason] = (outcome.reasonCounts[reason] || 0) + 1
  }
  assert.ok(Object.values(summary.boundaries).every(value => value === false || value === true))
  assert.equal(summary.boundaries.repositoryWritePerformed, false)
  assert.equal(summary.boundaries.candidateAdopted, false)
  assert.equal(summary.boundaries.canonChanged, false)
  assert.equal(summary.boundaries.chapter20AccessedOrChanged, false)
  assert.equal(summary.boundaries.chapter21AccessedOrChanged, false)
  assert.equal(summary.boundaries.cloudDataChanged, false)
  assert.equal(summary.boundaries.publicationPerformed, false)
}

const qualityTuningDecision = decidePairedQualityCampaignTuning({
  trials: trials.map(({ summary }) => ({
    fixtureId: summary.fixture.id,
    confirmedDimensions: summary.evaluation.dimensions,
    hardConstraints: summary.evaluation.hardConstraints,
  })),
})

const campaignSummary = {
  schemaVersion: 'creator-frozen-paired-quality-campaign.v1',
  completedAt: new Date().toISOString(),
  trialCount: trials.length,
  fixtureIds: trials.map(item => item.summary.fixture.id),
  inputSha256s: trials.map(item => item.summary.fixture.inputSha256),
  trials: trials.map(({ trialPath, summary }) => ({
    fixtureId: summary.fixture.id,
    inputSha256: summary.fixture.inputSha256,
    trialId: summary.trialId,
    evidencePath: path.relative(root, trialPath),
    directWriterLength: summary.candidates.directWriter.visibleLength,
    architectWriterWorkflowLength: summary.candidates.architectWriterWorkflow.visibleLength,
    directionReceiptPresent: summary.candidates.architectWriterWorkflow.directionReceiptPresent,
    workflowRefinement: summary.candidates.architectWriterWorkflow.refinement || null,
    confirmedDimensions: summary.evaluation.dimensions.map(item => ({
      dimension: item.dimension,
      verificationDecision: item.verificationDecision,
      confirmedPreference: item.confirmedPreference,
      confirmedReasonCode: item.confirmedReasonCode,
    })),
    hardConstraints: summary.evaluation.hardConstraints.map(item => ({
      path: item.path,
      verificationDecision: item.verificationDecision,
      confirmedStatus: item.confirmedStatus,
      confirmedViolationType: item.confirmedViolationType,
      confirmedReasonCode: item.confirmedReasonCode,
    })),
    realWorkingAgentCallCount: summary.runtime.realWorkingAgentCallCount,
  })),
  aggregate: {
    dimensionOutcomes,
    weaknessReasonCounts,
    hardConstraintOutcomes,
    qualityTuningDecision,
    overallWinnerDeclared: false,
    compositeLiteraryScoreUsed: false,
  },
  boundaries: {
    repositoryWritePerformed: false,
    candidateAdopted: false,
    canonChanged: false,
    chapter20AccessedOrChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
    rawDraftPersistedInRepository: false,
    rawBlindMappingPersistedInRepository: false,
  },
  limitations: [
    `${trials.length} frozen original scenes are still insufficient to establish statistical literary improvement.`,
    'Model-based blind review does not replace professional author or editor adjudication.',
    'No candidate was adopted and no real chapter material was read or changed.',
  ],
}

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputPath, `${JSON.stringify(campaignSummary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(campaignSummary, null, 2)}\n`)
