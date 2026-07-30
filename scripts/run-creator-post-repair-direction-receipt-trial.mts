#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

import { sceneDraftDirectionReceiptFromReview } from '../app/src/features/creator-decision/localWorkingAgent.ts'
import { sceneAuthorDirectionDraftReviewSchema } from '../app/src/features/creator-decision/schemas.ts'
import { draftBlocksFromText } from '../app/src/features/creator-decision/sceneDrafting.ts'

const root = process.cwd()
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json',
    },
    model: { type: 'string' },
  },
  strict: true,
})

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const visibleLength = (value: string) => Array.from(value).filter(character => !/\s/u.test(character)).length

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(error => error ? reject(error) : resolve(port as number))
    })
  })
}

async function waitForHealth(url: string, childOutput: { stderr: string; exited: boolean }) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (childOutput.exited) throw new Error(`working-agent bridge exited early: ${childOutput.stderr}`)
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
    } catch {
      // The local bridge may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`working-agent bridge did not become ready: ${childOutput.stderr}`)
}

async function findNamedFiles(directory: string, targetName: string): Promise<string[]> {
  const found: string[] = []
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findNamedFiles(absolute, targetName))
    if (entry.isFile() && entry.name === targetName) found.push(absolute)
  }
  return found
}

const authorDirection = {
  id: 'option:frozen-post-repair-delegation',
  label: '资源协商与职责交付',
  primaryChangedAxis: 'agencyPattern',
  proposedAdjustment: '让唯一配重芯形成资源压力，以协商换取资源；主角把危险校准明确交给黎芜，自己承担可兑现义务，结尾让两人的关系因职责与退路重新分配。',
  preservedAuthorIntent: ['保留风暴倒计时', '保留主角左掌旧伤', '不揭晓密封匣内容'],
  addressesIssueCodes: ['causal_chain_repetition'],
  whyItBreaksRepetition: '不再用制度核验和拒绝推动，而由资源、协商、职责交付与义务代价改变关系。',
  expectedMechanismSignature: {
    pressureSource: 'resource',
    conflictEngine: 'negotiation',
    agencyPattern: 'delegation',
    costPattern: 'obligation',
    endingPattern: 'relationship_shift',
  },
  tradeoff: '动作规模受控，但信任变化必须落在实际权限和代价上。',
  decisionId: 'scene-author-decision:frozen-post-repair',
  pipelineId: 'pipeline:frozen-post-repair',
  selectedAt: '2026-07-17T00:00:00.000Z',
}

const beforeBlocks = [
  '旧升降台的风哨只剩一格。商贩把唯一一枚配重芯扣在掌心，拒绝用旧航标和耐盐绳交换。',
  '“钱货两清不够。”商贩说，“风暴过后，你替我从南堤取回一只封蜡铁匣，我现在才把芯给你。”陆沉舟答应这项能被追索的义务。',
  '陆沉舟把校准钳压在自己掌下，准备独自完成齿轮归零。左掌旧伤刚碰到扳杆，指节就失去力气。',
  '配重芯嵌入卡槽后，锁链开始绷紧。黎芜独自完成齿轮归零，陆沉舟只按她报出的刻度守住扳杆，没有夺回校准权。',
  '升降台向矿层落去。黎芜把校准钳扣在腰侧，队伍的退路从这一刻握在她手里；陆沉舟背上了风暴过后的南堤义务。',
]

const afterBlocks = [...beforeBlocks]
afterBlocks[2] = '陆沉舟把校准钳推到黎芜面前：“校准交给你。我守扳杆，也负责兑现南堤的债。”黎芜接过钳子，第一次拥有决定升降机能否下降的权限。左掌旧伤刚碰到扳杆，指节便失去力气。'

const changedBlockIndexes = beforeBlocks.flatMap((block, index) => block === afterBlocks[index] ? [] : [index])
assert.deepEqual(changedBlockIndexes, [2])

const intent = {
  id: 'intent:frozen-post-repair-direction-receipt',
  status: 'locked',
  premise: '风暴封港前，失去官方许可的队伍必须从旧升降台下到矿层。',
  desiredReaderExperience: '紧迫、克制，并在一次具体分工中感到关系发生变化。',
  coreChoice: '主角是否愿意把关键操作交给尚未完全信任的同行者。',
  hardConstraints: ['只写旧升降台这一场', '密封匣内容不能揭晓', '不能凭空获得第二枚配重芯'],
  mustInclude: ['配重芯交易', '明确交付校准职责', '未来义务成立', '关系变化在行动中可见'],
  mustNotResolve: ['密封匣内航图终点', '商贩急于离港的真正原因'],
  sceneMechanismDirection: authorDirection,
}

const beforeBody = beforeBlocks.join('\n\n')
const repairedBody = afterBlocks.join('\n\n')
const repairedDraftBlocks = draftBlocksFromText(repairedBody)
const outputPath = path.resolve(root, values.output)
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-post-repair-direction-trial-'))
const logRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const childOutput = { stderr: '', exited: false }
const bridge = spawn(process.execPath, ['scripts/creator-working-agent-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    TMPDIR: sandbox,
    PUF_CREATOR_WORKING_AGENT_PORT: String(port),
    ...(values.model ? { PUF_CREATOR_WORKING_AGENT_MODEL: values.model } : {}),
  },
  stdio: ['ignore', 'ignore', 'pipe'],
})
bridge.stderr.on('data', chunk => { childOutput.stderr += chunk.toString() })
bridge.on('exit', () => { childOutput.exited = true })

try {
  const health = await waitForHealth(`${baseUrl}/health`, childOutput)
  assert.equal(health.status, 'ready')
  assert.ok(health.operations.includes('scene_author_direction_draft_review'))

  const response = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_author_direction_draft_review',
      attempt: 'initial',
      payload: {
        fixture: 'frozen-original-post-repair-direction-receipt-v1',
        intent,
        authorDirection,
        draft: { body: repairedBody },
      },
    }),
  })
  const rawReview = await response.json()
  const review = sceneAuthorDirectionDraftReviewSchema.parse(rawReview)
  const receipt = review.decision === 'pass'
    ? sceneDraftDirectionReceiptFromReview({ review, draftBlocks: repairedDraftBlocks })
    : null
  const manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  const manifests = await Promise.all(manifestPaths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8'))
  )))
  const operationManifests = manifests.filter(manifest => manifest.operation === 'scene_author_direction_draft_review')
  assert.ok(operationManifests.length >= 1)

  const summary = {
    schemaVersion: 'creator-post-repair-direction-receipt-real-trial.v1',
    trialId: `post-repair-direction-receipt:${randomUUID()}`,
    completedAt: new Date().toISOString(),
    status: review.decision === 'pass' && receipt ? 'passed' : 'author_direction_rejected',
    httpStatus: response.status,
    fixture: {
      id: 'frozen-original-post-repair-direction-receipt-v1',
      source: 'frozen_original_bounded_repair',
      realWorkingAgent: true,
      realChapterMaterialUsed: false,
      inputSha256: sha256(JSON.stringify({ intent, beforeBody, repairedBody })),
      modelOverride: values.model || null,
    },
    repair: {
      scope: 'bounded_blocks',
      changedBlockCount: changedBlockIndexes.length,
      beforeBlockCount: beforeBlocks.length,
      afterBlockCount: afterBlocks.length,
      beforeBodySha256: sha256(beforeBody),
      repairedBodySha256: sha256(repairedBody),
      repairedVisibleLength: visibleLength(repairedBody),
      wholeTextRewritePerformed: false,
      authorTextOverwritten: false,
    },
    review: {
      decision: review.decision,
      axisChecks: review.axisChecks.map(check => ({
        axis: check.axis,
        expectedValue: check.expectedValue,
        decision: check.decision,
        evidenceQuoteSha256: check.evidenceQuote ? sha256(check.evidenceQuote) : null,
        evidenceQuoteLength: check.evidenceQuote ? visibleLength(check.evidenceQuote) : 0,
        evidenceLocatable: check.evidenceQuote ? repairedBody.includes(check.evidenceQuote) : true,
      })),
      proposedAdjustmentDecision: review.proposedAdjustmentCheck.decision,
      proposedAdjustmentEvidenceCount: review.proposedAdjustmentCheck.evidenceQuotes.length,
      proposedAdjustmentEvidenceLocatable: review.proposedAdjustmentCheck.evidenceQuotes.every(quote => repairedBody.includes(quote)),
      compositeLiteraryScoreUsed: false,
    },
    receipt: receipt ? {
      schemaVersion: receipt.schemaVersion,
      decision: receipt.decision,
      reviewer: receipt.reviewer,
      axisCheckCount: receipt.axisChecks.length,
      proposedAdjustmentEvidenceCount: receipt.proposedAdjustmentEvidence.length,
      allEvidenceMappedToCurrentBlocks: [
        ...receipt.axisChecks.flatMap(check => check.evidence),
        ...receipt.proposedAdjustmentEvidence,
      ].every(evidence => repairedDraftBlocks.some(block => block.id === evidence.blockId)),
      receiptSha256: sha256(JSON.stringify(receipt)),
    } : null,
    runtime: {
      realWorkingAgentCallCount: operationManifests.length,
      roleOperations: operationManifests.map(manifest => ({
        role: manifest.role,
        operation: manifest.operation,
        status: manifest.status,
        privateDataBoundary: manifest.privateDataBoundary,
        canonCommitAllowed: manifest.canonCommitAllowed,
      })),
    },
    boundaries: {
      repositoryWritePerformed: false,
      candidateAdopted: false,
      canonChanged: false,
      chapter20AccessedOrChanged: false,
      chapter21AccessedOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
      rawBeforeOrAfterBodyPersistedInRepository: false,
      rawReviewPersistedInRepository: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'This is one real Auditor run over a frozen original bounded repair, not a generated chapter or user study.',
      'A pass proves receipt reconstruction for this repaired candidate only; it does not prove literary improvement.',
      'A rejection is valid fail-closed evidence and does not trigger another repair or rewrite.',
    ],
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
} finally {
  if (!bridge.killed) bridge.kill('SIGTERM')
  await rm(sandbox, { recursive: true, force: true })
}
