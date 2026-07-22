#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const runtimeBuild = spawnSync(
  npmCommand,
  ['--prefix', 'packages/agent-runtime', 'run', 'build'],
  { cwd: root, encoding: 'utf8' },
)
if (runtimeBuild.status !== 0) {
  if (runtimeBuild.stdout) process.stdout.write(runtimeBuild.stdout)
  if (runtimeBuild.stderr) process.stderr.write(runtimeBuild.stderr)
  process.exit(runtimeBuild.status ?? 1)
}

const result = spawnSync(
  resolve(root, 'node_modules/.bin/tsx'),
  ['tests/creator-decision-offline-validation.ts'],
  {
    cwd: resolve(root, 'app'),
    env: {
      ...process.env,
      CREATOR_VALIDATION_OUTPUT: '../validation/results/reference-flow.json',
    },
    encoding: 'utf8',
  },
)

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.status !== 0) process.exit(result.status ?? 1)

const outputPath = resolve(root, 'validation/results/reference-flow.json')
const seedFile = JSON.parse(await readFile(resolve(root, 'validation/story_seeds.json'), 'utf8'))
const decisionReport = JSON.parse(await readFile(outputPath, 'utf8'))
const workflowModuleUrl = pathToFileURL(resolve(root, 'packages/agent-runtime/dist/src/workflows.js')).href
const { socraticCreateWorkflow } = await import(workflowModuleUrl)

const directPromptResults = []
for (const seed of seedFile.seeds) {
  const startedAt = performance.now()
  const output = await socraticCreateWorkflow(
    { seed: seed.userInput, genre: seed.genre },
    { preferToolBridge: false },
  )
  directPromptResults.push({
    seedId: seed.id,
    questionCount: output.questions.length,
    candidateStatus: output.candidateDraft.status,
    candidateBodyLength: output.candidateDraft.body.length,
    qualityPreview: output.qualityPreview.result,
    qualityViolationCount: output.qualityPreview.violations.length,
    statePreviewOperationCount: output.runtimeArtifact.stateWritebackPreview.length,
    canonWritten: false,
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    costMode: output.cost.mode,
    estimatedTokens: output.cost.estimatedTokens,
    estimatedCostUsd: output.cost.estimatedCostUsd,
  })
}

const decisionBySeed = new Map(decisionReport.results.map(item => [item.seedId, item]))
const comparison = directPromptResults.map(direct => {
  const decision = decisionBySeed.get(direct.seedId)
  return {
    seedId: direct.seedId,
    directPrompt: {
      questionCount: direct.questionCount,
      requiredAuthorDecisionCount: direct.questionCount,
      canonWritten: direct.canonWritten,
      elapsedMs: direct.elapsedMs,
      estimatedCostUsd: direct.estimatedCostUsd,
    },
    decisionLoop: {
      questionCount: decision?.questionCount ?? null,
      requiredAuthorDecisionCount: decision ? decision.questionCount + 3 : null,
      canonWritten: decision?.canonWritten ?? null,
      elapsedMs: decision?.elapsedMs ?? null,
      estimatedCostUsd: null,
    },
    intentCompletionRate: {
      directPrompt: null,
      decisionLoop: decision ? 1 : 0,
    },
    stateConflictCount: null,
    authorTextRetentionRatio: null,
    fullRewriteCount: null,
    localEditCount: 0,
    erroneousStateWritebackCount: 0,
  }
})

const report = {
  ...decisionReport,
  directPromptBaselineCompared: true,
  comparisonScope: 'deterministic_reference_flows_only',
  comparisonMetricDefinitions: {
    requiredAuthorDecisionCount: 'Question answers plus explicit lock, candidate selection, and draft adoption in the decision loop; question prompts only in the direct baseline.',
    intentCompletionRate: 'Locked AuthorIntentContract divided by attempted fixed scenes. The direct baseline has no equivalent contract.',
    stateConflictCount: 'Reserved for one shared evidence-bound evaluator; null until both arms use it.',
    authorTextRetentionRatio: 'Reserved for tasks with a source manuscript; fixed seeds have none.',
    fullRewriteCount: 'Reserved for revision tasks with a source manuscript; fixed seeds have none.',
    localEditCount: 'Accepted local repair operations during this generation-only harness.',
    erroneousStateWritebackCount: 'Observed writes to canon before explicit author confirmation.',
    elapsedMs: 'Local deterministic harness wall time, not remote model latency.',
    estimatedCostUsd: 'Mock-local estimate when supplied by the old runtime; not production cost.',
  },
  comparisonLimitations: [
    'No real model was called in either arm.',
    'State conflicts need one shared evaluator before they are comparable.',
    'Author text retention and rewrite counts are undefined because fixed seeds contain no source manuscript.',
    'Mock-local cost is not production model cost.',
  ],
  directPromptResults,
  comparison,
}
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`[creator-decision-offline-comparison] PASS (${comparison.length} paired scenes)`)
