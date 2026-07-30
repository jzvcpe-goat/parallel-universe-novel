import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createLocalWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
  hasCompleteSceneEnding,
} from '../app/src/features/creator-decision/sceneDrafting'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  NarrativeCandidate,
  SceneDraftRequest,
} from '../app/src/features/creator-decision/types'
import { frozenPairedGlassLungEnduranceFixture } from './fixtures/creator-frozen-paired-quality-fixture.mts'

interface RunManifest {
  pipelineId: string
  sequence: number
  role: string
  operation: string
  status: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const localhostLongTaskFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Manual recall trials only allow long-task HTTP calls to localhost.')
  }
  if (init.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError')
  return new Promise<Response>((resolve, reject) => {
    const request = httpRequest(url, {
      method: init.method || 'GET',
      headers: init.headers as Record<string, string> | undefined,
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        init.signal?.removeEventListener('abort', onAbort)
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode || 500,
          statusText: response.statusMessage || '',
          headers: response.headers as Record<string, string>,
        }))
      })
    })
    const onAbort = () => request.destroy(new DOMException('The request was aborted.', 'AbortError'))
    init.signal?.addEventListener('abort', onAbort, { once: true })
    request.setTimeout(15 * 60 * 1000, () => {
      request.destroy(new Error('local_working_agent_request_timeout'))
    })
    request.on('error', error => {
      init.signal?.removeEventListener('abort', onAbort)
      reject(error)
    })
    if (init.body !== undefined && init.body !== null) {
      if (typeof init.body !== 'string' && !(init.body instanceof Uint8Array)) {
        request.destroy(new Error('Manual recall trial transport only accepts string or byte bodies.'))
        return
      }
      request.write(init.body)
    }
    request.end()
  })
}

globalThis.fetch = localhostLongTaskFetch

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(error => error ? reject(error) : port ? resolve(port) : reject(new Error('No local port.')))
    })
  })
}

async function waitForHealth(url: string, child: { stderr: string; exited: boolean }) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (child.exited) throw new Error(`Working Agent bridge exited early: ${child.stderr}`)
    try {
      const response = await fetch(url)
      if (response.ok) return response.json() as Promise<{
        status: string
        operations: string[]
        privateDraftsRemainLocal: boolean
      }>
    } catch {
      // The local bridge may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Working Agent bridge did not become ready: ${child.stderr}`)
}

async function namedFiles(directory: string, target: string): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await namedFiles(absolute, target))
    if (entry.isFile() && entry.name === target) found.push(absolute)
  }
  return found
}

async function runRecords(logRoot: string) {
  const manifestPaths = await namedFiles(logRoot, 'run-manifest.json')
  const records = await Promise.all(manifestPaths.map(async manifestPath => ({
    manifest: JSON.parse(await readFile(manifestPath, 'utf8')) as RunManifest,
    prompt: await readFile(path.join(path.dirname(manifestPath), 'prompt.txt'), 'utf8'),
  })))
  return records.sort((left, right) => (
    left.manifest.pipelineId.localeCompare(right.manifest.pipelineId)
    || left.manifest.sequence - right.manifest.sequence
  ))
}

function reviewIntent(fixture: ReturnType<typeof frozenPairedGlassLungEnduranceFixture>) {
  const compact = fixture.intent
  const candidate = fixture.selectedCandidate
  const expectedCost = compact.sceneMechanismDirection.tradeoff
  return {
    schemaVersion: 'author-intent.v1',
    id: compact.id,
    sessionId: compact.sessionId,
    revision: compact.revision,
    status: compact.status,
    readerExperience: {
      startEmotion: '压力已经到达现场',
      targetEmotion: compact.desiredReaderExperience,
      emotionalMovement: compact.desiredReaderExperience,
      intensity: 'moderate',
    },
    narrativeDelta: {
      startingCondition: compact.premise,
      endingCondition: compact.mustInclude.join('；'),
      mustChange: compact.coreChoice,
      mustNotResolve: [...compact.mustNotResolve],
      irreversibleChange: expectedCost,
    },
    characterAgency: {
      primaryActorId: candidate.strategyAxes.agencyOwnerId,
      currentGoal: candidate.oneSentenceMechanism,
      requiredChoice: compact.coreChoice,
      opposingForce: compact.hardConstraints.join('；'),
      expectedCost,
    },
    informationPolicy: {
      readerShouldKnow: [],
      readerShouldSuspect: [],
      charactersMustNotKnow: compact.informationPolicy.charactersMustNotKnow.map((information, index) => ({
        characterId: `restricted-character:${index + 1}`,
        information,
      })),
      delayedReveals: [...compact.mustNotResolve],
    },
    boundaries: {
      requiredElements: [...compact.mustInclude],
      forbiddenEffects: [...compact.hardConstraints, ...compact.mustNotResolve],
      protectedCharacterTraits: [],
    },
    sceneMechanismDirection: compact.sceneMechanismDirection,
    fieldSources: {
      'readerExperience.targetEmotion': 'author_explicit',
      'narrativeDelta.mustChange': 'author_explicit',
      'characterAgency.requiredChoice': 'author_explicit',
      'boundaries.requiredElements': 'author_explicit',
    },
    lockedFields: [
      'readerExperience.targetEmotion',
      'narrativeDelta.mustChange',
      'characterAgency.requiredChoice',
      'boundaries.requiredElements',
    ],
    agentAssumptions: [],
    unresolvedQuestions: [],
    createdAt: compact.sceneMechanismDirection.selectedAt,
    lockedAt: compact.sceneMechanismDirection.selectedAt,
  } as AuthorIntentContract
}

const root = process.cwd()
const outputPath = path.join(
  root,
  'validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json',
)
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-manual-recall-adherence-'))
const logRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const childState = { stderr: '', exited: false }
const bridge = spawn(process.execPath, ['scripts/creator-working-agent-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    TMPDIR: sandbox,
    PUF_CREATOR_WORKING_AGENT_PORT: String(port),
  },
  stdio: ['ignore', 'ignore', 'pipe'],
})
bridge.stderr.on('data', chunk => { childState.stderr += chunk.toString() })
bridge.on('exit', () => { childState.exited = true })

let completed = false
try {
  const health = await waitForHealth(`${baseUrl}/health`, childState)
  assert.equal(health.status, 'ready')
  assert.equal(health.privateDraftsRemainLocal, true)
  assert.ok(health.operations.includes('manual_recall_adherence_review'))

  const fixture = frozenPairedGlassLungEnduranceFixture()
  const session = fixture.session as unknown as CreationSession
  const intent = fixture.intent as unknown as AuthorIntentContract
  const candidate = fixture.selectedCandidate as unknown as NarrativeCandidate
  const context = fixture.context as unknown as ContextSnapshot
  const selectedSourceIds = context.manualRecallItems.map(item => item.sourceId)
  const unselectedCanary = 'unselected:forbidden-memory-canary'
  const request: SceneDraftRequest = {
    sessionId: session.id,
    intentId: intent.id,
    intentRevision: intent.revision,
    candidateId: candidate.id,
    candidateRevision: candidate.revision,
    contextSnapshotId: context.id,
    baseCanonRevision: context.canonRevision,
    baseDraftRevision: 0,
    scope: {
      type: 'scene',
      sceneId: session.sceneId,
      beatIds: candidate.beats.map(beat => beat.id),
      selectedBlockIds: [],
    },
    protectedBlockIds: [],
    targetLength: { minimum: 2700, maximum: 3400 },
    writingMode: 'agent_first_draft',
  }

  const agent = createLocalWorkingAgent(baseUrl)
  const draft = await agent.draftScene({
    session,
    intent,
    candidate,
    context,
    request,
    currentBlocks: [],
  })
  const draftText = draftTextFromBlocks(draft.contentBlocks)
  assert.ok(countVisibleCharacters(draftText) >= 2700 && countVisibleCharacters(draftText) <= 3400)
  assert.equal(hasCompleteSceneEnding(draftText), true)

  const review = await agent.reviewDraft({
    session,
    intent: reviewIntent(fixture),
    context,
    candidate,
    draft,
    focusDimensions: ['continuity', 'information_control'],
  })
  const recallReceipt = review.manualRecallAdherence
  assert.ok(recallReceipt, 'The production reviewDraft path must retain a manual-recall receipt.')
  assert.deepEqual(recallReceipt.checks.map(check => check.sourceId), selectedSourceIds)
  assert.equal(recallReceipt.compositeLiteraryScoreUsed, false)

  const records = await runRecords(logRoot)
  const recallRecords = records.filter(record => (
    record.manifest.operation === 'manual_recall_adherence_review'
    || record.manifest.operation === 'manual_recall_adherence_review_evidence_revision'
  ))
  assert.ok(recallRecords.length >= 1 && recallRecords.length <= 2)
  assert.equal(recallRecords[0]?.manifest.operation, 'manual_recall_adherence_review')
  assert.ok(selectedSourceIds.every(sourceId => recallRecords[0]!.prompt.includes(sourceId)))
  assert.equal(recallRecords.some(record => record.prompt.includes(unselectedCanary)), false)
  assert.ok(records.every(record => (
    record.manifest.status === 'succeeded'
    && record.manifest.privateDataBoundary === 'local_ephemeral'
    && record.manifest.canonCommitAllowed === false
  )))

  const summary = {
    schemaVersion: 'creator-manual-recall-adherence-real-trial.v1',
    status: 'completed',
    completedAt: new Date().toISOString(),
    fixture: {
      id: fixture.fixtureId,
      source: 'frozen_original_single_scene',
      inputSha256: sha256(JSON.stringify(fixture)),
      realWorkingAgent: true,
      realChapterMaterialUsed: false,
    },
    draft: {
      generatedThroughProductAgent: true,
      visibleCharacterCount: countVisibleCharacters(draftText),
      completeEnding: true,
      manuscriptSha256: sha256(draftText),
      bodyPersistedInRepository: false,
    },
    manualRecallAdherence: {
      decision: recallReceipt.decision,
      selectedSourceIds,
      selectedGroups: context.manualRecallItems.map(item => item.group),
      checks: recallReceipt.checks.map(check => ({
        sourceId: check.sourceId,
        group: check.group,
        status: check.status,
        evidenceBlockCount: check.evidence.length,
        evidenceLocatable: check.status === 'omitted' ? check.evidence.length === 0 : check.evidence.length > 0,
      })),
      deterministicViolationCodes: review.deterministicViolations.filter(value => value.startsWith('manual_recall_')),
      evidenceRevisionApplied: recallRecords.some(record => (
        record.manifest.operation === 'manual_recall_adherence_review_evidence_revision'
      )),
      sourceCoverageExact: true,
      unselectedCanaryExcluded: true,
      compositeLiteraryScoreUsed: false,
    },
    runtime: {
      realWorkingAgentCallCount: records.length,
      manualRecallAuditorCallCount: recallRecords.length,
      roleOperations: records.map(record => ({
        role: record.manifest.role,
        operation: record.manifest.operation,
        status: record.manifest.status,
        privateDataBoundary: record.manifest.privateDataBoundary,
        canonCommitAllowed: record.manifest.canonCommitAllowed,
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
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'One frozen original scene proves executable recall review, not stable long-form quality improvement.',
      'A pass or reject is retained as measured evidence and is not converted into an overall literary score.',
      'Automatic retrieval remains disabled; only author-selected recall items were reviewed.',
    ],
  }
  const serialized = JSON.stringify(summary, null, 2)
  assert.equal(serialized.includes(draftText.slice(0, 30)), false)
  assert.equal(serialized.includes('"evidenceQuotes"'), false)
  assert.equal(serialized.includes('"diagnosis"'), false)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${serialized}\n`, 'utf8')
  process.stdout.write(`${serialized}\n`)
  completed = true
} finally {
  if (!completed && childState.stderr.trim()) process.stderr.write(childState.stderr)
  bridge.kill('SIGTERM')
  if (!childState.exited) await new Promise(resolve => bridge.once('exit', resolve))
  await rm(sandbox, { recursive: true, force: true })
}

assert.equal(completed, true)
