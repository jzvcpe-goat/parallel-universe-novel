import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createLocalWorkingAgent,
  requestManualRecallAdherenceReviewFromWorkingAgent,
  requestPairedLiteraryComparisonFromWorkingAgent,
  requestPairedLiteraryComparisonVerificationFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
  hasCompleteSceneEnding,
} from '../app/src/features/creator-decision/sceneDrafting'
import { evaluateCandidateQualityGate } from '../app/src/features/creator-decision/candidateQualityGate'
import { compileContextSnapshot } from '../app/src/features/creator-decision/contextCompiler'
import { authorIntentContractSchema } from '../app/src/features/creator-decision/schemas'
import type { PairedLiteraryEvidenceBlock } from '../app/src/features/creator-decision/pairedLiteraryComparison'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationContextSource,
  CreationSession,
  LiteraryReview,
  ManualRecallAdherenceReceipt,
  ManualRecallItem,
  NarrativeCandidate,
  SceneDraftRequest,
  SceneDraftResult,
} from '../app/src/features/creator-decision/types'
import {
  frozenPairedArchiveTribunalRefusalFixture,
  frozenPairedFloodgateSacrificeFixture,
  frozenPairedGlassLungEnduranceFixture,
} from './fixtures/creator-frozen-paired-quality-fixture.mts'

type TrialArm = 'manual_recall_selected' | 'manual_recall_absent'
type BlindLabel = 'candidate_a' | 'candidate_b'

interface RunManifest {
  pipelineId: string
  sequence: number
  role: string
  operation: string
  status: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const root = process.cwd()
const scenarioId = process.argv.find(argument => argument.startsWith('--scenario='))?.split('=')[1]
  ?? 'glass-lung'
const outputArgument = process.argv.find(argument => argument.startsWith('--output='))?.slice('--output='.length)
const defaultOutputByScenario: Record<string, string> = {
  'glass-lung': 'validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json',
  'archive-tribunal': 'validation/creator-ui/manual-recall-effect-archive-tribunal-real-trial-2026-07-18/summary.json',
  'floodgate': 'validation/creator-ui/manual-recall-effect-floodgate-real-trial-2026-07-18/summary.json',
}
assert.ok(defaultOutputByScenario[scenarioId], `Unknown manual recall effect scenario: ${scenarioId}`)
const outputPath = path.resolve(root, outputArgument ?? defaultOutputByScenario[scenarioId]!)

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const localhostLongTaskFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Manual recall effect trials only allow long-task HTTP calls to localhost.')
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
    request.setTimeout(15 * 60 * 1000, () => request.destroy(new Error('local_working_agent_request_timeout')))
    request.on('error', error => {
      init.signal?.removeEventListener('abort', onAbort)
      reject(error)
    })
    if (init.body !== undefined && init.body !== null) {
      if (typeof init.body !== 'string' && !(init.body instanceof Uint8Array)) {
        request.destroy(new Error('Manual recall effect trial transport only accepts string or byte bodies.'))
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
      server.close(error => error
        ? reject(error)
        : typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('No local port.')))
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

async function runManifests(logRoot: string) {
  const paths = await namedFiles(logRoot, 'run-manifest.json')
  const manifests = await Promise.all(paths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8')) as RunManifest
  )))
  return manifests.sort((left, right) => (
    left.pipelineId.localeCompare(right.pipelineId) || left.sequence - right.sequence
  ))
}

function evidenceBlocks(text: string, label: BlindLabel): PairedLiteraryEvidenceBlock[] {
  const chunks: string[] = []
  for (const paragraph of text.replaceAll('\r\n', '\n').split(/\n\s*\n|\n/u).map(item => item.trim()).filter(Boolean)) {
    const sentences = paragraph.match(/[^。！？!?；;]+[。！？!?；;]?/gu) ?? [paragraph]
    let current = ''
    for (const sentence of sentences) {
      const next = `${current}${sentence}`.trim()
      if (current && countVisibleCharacters(next) > 420) {
        chunks.push(current)
        current = sentence.trim()
      } else {
        current = next
      }
    }
    if (current) chunks.push(current)
  }
  assert.ok(chunks.length > 0)
  return chunks.map((text, index) => ({
    id: `${label}:block:${String(index + 1).padStart(3, '0')}`,
    text,
  }))
}

function glassLungRecallItems(): ManualRecallItem[] {
  return [
    {
      id: 'recall:effect:causal',
      sourceId: 'canon:chapter-06-right-hand-vibration',
      sourceRevision: 6,
      authority: 'canon',
      group: 'causal',
      statement: '许照第六章右手无名指被孢晶灼伤，高频振动时会突然失去握力；不能让他用右手持续抓住风箱回程杆。',
      sourceLabel: '第 6 章已确认后果',
      whyNow: '旧伤必须改变当前风箱操作，而不是只作为背景说明。',
      locator: { kind: 'canon', targetId: 'canon:chapter-06-right-hand-vibration', label: '第 6 章正史' },
    },
    {
      id: 'recall:effect:knowledge',
      sourceId: 'asset:wenlan-right-hand-unknown',
      sourceRevision: 3,
      authority: 'author',
      group: 'character_knowledge',
      statement: '闻澜不知道许照右手会在高频振动时失力，只能从动作异常作有限怀疑，不能直接说出旧伤原因。',
      sourceLabel: '闻澜人物知识边界',
      whyNow: '防止配角提前知道远程章节中的私密伤势。',
      locator: { kind: 'asset', targetId: 'asset:wenlan-right-hand-unknown', label: '闻澜人物卡' },
    },
    {
      id: 'recall:effect:timeline',
      sourceId: 'canon:east-vent-third-bell',
      sourceRevision: 4,
      authority: 'canon',
      group: 'timeline',
      statement: '东侧通风闸会在第三次铜铃后锁死，当前已响过两次；本场必须停留在风箱台和塌陷苗床。',
      sourceLabel: '温室时空锚点',
      whyNow: '让倒计时与地点限制实际进入动作。',
      locator: { kind: 'canon', targetId: 'canon:east-vent-third-bell', label: '温室时空锚点' },
    },
    {
      id: 'recall:effect:promise',
      sourceId: 'canon:surveyor-brass-compass-promise',
      sourceRevision: 8,
      authority: 'canon',
      group: 'promise',
      statement: '许照答应把被困测绘员的黄铜罗盘原样交还本人；本场不得打开、转赠或把罗盘当成工具。',
      sourceLabel: '第 8 章未兑现承诺',
      whyNow: '救援场景必须保护这项旧承诺，但不能提前消费。',
      locator: { kind: 'canon', targetId: 'canon:surveyor-brass-compass-promise', label: '第 8 章承诺' },
    },
  ]
}

function archiveTribunalRecallItems(): ManualRecallItem[] {
  return [
    {
      id: 'recall:effect:tribunal:causal',
      sourceId: 'canon:chapter-04-archive-ink-seal',
      sourceRevision: 4,
      authority: 'canon',
      group: 'causal',
      statement: '季衡第四章左手食指被档案墨封伤，接触誓约墨会立刻痉挛；他不能用左手完成听证宣誓签名。',
      sourceLabel: '第 4 章已确认后果',
      whyNow: '旧伤必须改变宣誓动作，不能只作为背景提及。',
      locator: { kind: 'canon', targetId: 'canon:chapter-04-archive-ink-seal', label: '第 4 章正史' },
    },
    {
      id: 'recall:effect:tribunal:knowledge',
      sourceId: 'asset:luoya-ink-seal-unknown',
      sourceRevision: 2,
      authority: 'author',
      group: 'character_knowledge',
      statement: '洛鸦不知道季衡左手的墨封伤，只能看见他换手或拒绝签名，不能直接说出伤势来源。',
      sourceLabel: '洛鸦人物知识边界',
      whyNow: '防止竞争者无依据知道远程章节中的私密伤势。',
      locator: { kind: 'asset', targetId: 'asset:luoya-ink-seal-unknown', label: '洛鸦人物卡' },
    },
    {
      id: 'recall:effect:tribunal:timeline',
      sourceId: 'canon:tribunal-third-sand-chime',
      sourceRevision: 7,
      authority: 'canon',
      group: 'timeline',
      statement: '第三次砂钟鸣响后听证记录会立即封存，当前已经响过两次；本场必须留在第三听证室。',
      sourceLabel: '听证时空锚点',
      whyNow: '让制度倒计时进入问答和签署动作。',
      locator: { kind: 'canon', targetId: 'canon:tribunal-third-sand-chime', label: '听证时空锚点' },
    },
    {
      id: 'recall:effect:tribunal:promise',
      sourceId: 'canon:witness-paper-bird-promise',
      sourceRevision: 9,
      authority: 'canon',
      group: 'promise',
      statement: '季衡答应把证人交付的纸鸟保持封口并原样交还；本场不得拆开、烧毁或交给档案庭。',
      sourceLabel: '第 9 章未兑现承诺',
      whyNow: '听证搜证压力必须保护这项承诺，但不能提前消费其内容。',
      locator: { kind: 'canon', targetId: 'canon:witness-paper-bird-promise', label: '第 9 章承诺' },
    },
  ]
}

function floodgateRecallItems(): ManualRecallItem[] {
  return [
    {
      id: 'recall:effect:floodgate:causal',
      sourceId: 'canon:chapter-03-black-tide-key',
      sourceRevision: 3,
      authority: 'canon',
      group: 'causal',
      statement: '唐葵第三章的黄铜备用钥匙浸过黑潮，受热就会碎裂；不能把它当作开闸热源或完好的机械钥匙。',
      sourceLabel: '第 3 章已确认后果',
      whyNow: '旧物损坏必须封死一个看似廉价的替代方案。',
      locator: { kind: 'canon', targetId: 'canon:chapter-03-black-tide-key', label: '第 3 章正史' },
    },
    {
      id: 'recall:effect:floodgate:knowledge',
      sourceId: 'asset:hezao-counterweight-unknown',
      sourceRevision: 4,
      authority: 'author',
      group: 'character_knowledge',
      statement: '何藻不知道主配重是唐葵上一场强推捷径造成的，只知道机构已经卡死，不能直接指责她造成故障。',
      sourceLabel: '何藻人物知识边界',
      whyNow: '防止被困者越过视角知道场外选择。',
      locator: { kind: 'asset', targetId: 'asset:hezao-counterweight-unknown', label: '何藻人物卡' },
    },
    {
      id: 'recall:effect:floodgate:timeline',
      sourceId: 'canon:floodgate-third-shutter',
      sourceRevision: 5,
      authority: 'canon',
      group: 'timeline',
      statement: '撤离井三道警戒闸已落下两道，第三道落下即封井；本场不得离开潮钟机房和井口。',
      sourceLabel: '撤离井时空锚点',
      whyNow: '让六分钟倒计时具有可见的阶段推进。',
      locator: { kind: 'canon', targetId: 'canon:floodgate-third-shutter', label: '撤离井时空锚点' },
    },
    {
      id: 'recall:effect:floodgate:promise',
      sourceId: 'canon:worker-ledger-return-promise',
      sourceRevision: 7,
      authority: 'canon',
      group: 'promise',
      statement: '唐葵答应把系黑绳的工人名册完整交回遇难者家属；本场不得撕页、点燃或拿它垫住机械。',
      sourceLabel: '第 7 章未兑现承诺',
      whyNow: '危机中必须保护另一项长期责任，不能用它替代描图镜的牺牲。',
      locator: { kind: 'canon', targetId: 'canon:worker-ledger-return-promise', label: '第 7 章承诺' },
    },
  ]
}

function trialFixture() {
  const scenario = {
    'glass-lung': {
      source: frozenPairedGlassLungEnduranceFixture(),
      recalls: glassLungRecallItems(),
      fixtureId: 'frozen-original-manual-recall-effect-v1',
    },
    'archive-tribunal': {
      source: frozenPairedArchiveTribunalRefusalFixture(),
      recalls: archiveTribunalRecallItems(),
      fixtureId: 'frozen-original-manual-recall-effect-archive-tribunal-v1',
    },
    floodgate: {
      source: frozenPairedFloodgateSacrificeFixture(),
      recalls: floodgateRecallItems(),
      fixtureId: 'frozen-original-manual-recall-effect-floodgate-v1',
    },
  }[scenarioId]!
  const source = scenario.source
  const recalls = scenario.recalls
  const session: CreationSession = {
    schemaVersion: 'creation-session.v1',
    id: source.session.id,
    workId: source.session.workId,
    chapterId: source.session.chapterId,
    sceneId: source.session.sceneId,
    branchId: source.session.branchId,
    phase: 'candidate_selected',
    baseCanonRevision: source.session.baseCanonRevision,
    currentIntentRevision: source.intent.revision,
    currentCandidateRevision: source.selectedCandidate.revision,
    currentDraftRevision: 0,
    lockedIntentId: source.intent.id,
    selectedCandidateId: source.selectedCandidate.id,
    activeDraftId: null,
    activeReviewId: null,
    proposedCanonPatchId: null,
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  }
  const intent = authorIntentContractSchema.parse({
    schemaVersion: 'author-intent.v1',
    id: source.intent.id,
    sessionId: source.intent.sessionId,
    revision: source.intent.revision,
    status: source.intent.status,
    readerExperience: {
      startEmotion: source.intent.premise,
      targetEmotion: source.intent.desiredReaderExperience,
      emotionalMovement: source.intent.desiredReaderExperience,
      intensity: 'moderate',
    },
    narrativeDelta: {
      startingCondition: source.intent.premise,
      endingCondition: source.intent.desiredReaderExperience,
      mustChange: source.selectedCandidate.oneSentenceMechanism,
      mustNotResolve: source.intent.mustNotResolve,
      irreversibleChange: source.selectedCandidate.strategyAxes.costType,
    },
    characterAgency: {
      primaryActorId: source.selectedCandidate.strategyAxes.agencyOwnerId,
      currentGoal: source.intent.premise,
      requiredChoice: source.intent.coreChoice,
      opposingForce: source.intent.hardConstraints.join('；'),
      expectedCost: source.selectedCandidate.strategyAxes.costType,
    },
    informationPolicy: {
      readerShouldKnow: source.intent.mustInclude,
      readerShouldSuspect: source.intent.mustNotResolve,
      charactersMustNotKnow: source.intent.informationPolicy.charactersMustNotKnow.map(information => {
        const namedCharacter = source.context.activeCharacters.find(character => (
          'name' in character
          && typeof character.name === 'string'
          && information.includes(character.name)
        ))
        return {
          characterId: namedCharacter?.id ?? source.selectedCandidate.strategyAxes.agencyOwnerId,
          information,
        }
      }),
      delayedReveals: source.intent.mustNotResolve,
    },
    boundaries: {
      requiredElements: [source.intent.premise, ...source.intent.mustInclude],
      forbiddenEffects: [...source.intent.hardConstraints, ...source.intent.mustNotResolve],
      protectedCharacterTraits: [],
    },
    sceneMechanismDirection: source.intent.sceneMechanismDirection,
    fieldSources: {
      readerExperience: 'author_explicit',
      narrativeDelta: 'author_explicit',
      characterAgency: 'author_explicit',
      informationPolicy: 'author_explicit',
      boundaries: 'author_explicit',
      sceneMechanismDirection: 'author_selected',
    },
    lockedFields: [
      'readerExperience',
      'narrativeDelta',
      'characterAgency',
      'informationPolicy',
      'boundaries',
      'sceneMechanismDirection',
    ],
    agentAssumptions: [],
    unresolvedQuestions: [],
    createdAt: '2026-07-16T00:00:00.000Z',
    lockedAt: '2026-07-16T00:00:00.000Z',
  }) as AuthorIntentContract
  const contextSource = (manualRecallItems: ManualRecallItem[]): CreationContextSource => ({
    canonRevision: source.session.baseCanonRevision,
    kernelRevision: 1,
    constraintRevision: 1,
    activeCharacters: source.context.activeCharacters.map(character => {
      const state = 'state' in character
        && character.state
        && typeof character.state === 'object'
        && !Array.isArray(character.state)
          ? character.state as CreationContextSource['activeCharacters'][number]['state']
          : undefined
      return {
        id: character.id,
        goal: character.goal,
        belief: character.belief,
        knowledge: character.knowledge,
        falseBeliefs: character.falseBeliefs,
        emotionalState: character.emotionalState,
        resources: character.resources,
        ...(state ? { state } : {}),
      }
    }),
    relevantRelationships: [],
    activePromises: [],
    unresolvedForeshadowing: [],
    currentTimeline: source.context.recentSceneSummaries.at(-1)?.summary ?? null,
    relevantWorldRules: [],
    kernelRules: [],
    hardConstraints: [
      ...source.intent.hardConstraints,
      ...source.intent.mustNotResolve.map(item => `本场不得解决：${item}`),
    ],
    relevantRegressionExamples: [],
    recentSceneSummaries: source.context.recentSceneSummaries as ContextSnapshot['recentSceneSummaries'],
    styleSamples: source.context.styleSamples,
    manualRecallItems,
    manifest: source.context.recentSceneSummaries.map((scene, index) => ({
      sourceId: scene.sceneId,
      sourceRevision: Math.max(1, source.session.baseCanonRevision - index),
      authority: 'canon',
      includedReason: scene.relevanceReason,
    })),
  })
  const treatmentContext = compileContextSnapshot({
    session,
    intent,
    source: contextSource(recalls),
    now: '2026-07-16T00:00:00.000Z',
  })
  const baselineContext = compileContextSnapshot({
    session,
    intent,
    source: contextSource([]),
    now: '2026-07-16T00:00:00.000Z',
  })
  const serializedBaseline = JSON.stringify(baselineContext)
  for (const recall of recalls) {
    assert.equal(serializedBaseline.includes(recall.sourceId), false)
    assert.equal(serializedBaseline.includes(recall.statement), false)
  }
  return {
    fixtureId: scenario.fixtureId,
    session,
    intent,
    candidate: source.selectedCandidate as unknown as NarrativeCandidate,
    recalls,
    treatmentContext,
    baselineContext,
  }
}

function requestFor(input: {
  session: CreationSession
  intent: AuthorIntentContract
  candidate: NarrativeCandidate
  context: ContextSnapshot
}): SceneDraftRequest {
  return {
    sessionId: input.session.id,
    intentId: input.intent.id,
    intentRevision: input.intent.revision,
    candidateId: input.candidate.id,
    candidateRevision: input.candidate.revision,
    contextSnapshotId: input.context.id,
    baseCanonRevision: input.context.canonRevision,
    baseDraftRevision: 0,
    scope: {
      type: 'scene',
      sceneId: input.session.sceneId,
      beatIds: input.candidate.beats.map(beat => beat.id),
      selectedBlockIds: [],
    },
    protectedBlockIds: [],
    targetLength: { minimum: 2700, maximum: 3400 },
    writingMode: 'agent_first_draft',
  }
}

function armSummary(input: {
  draft: SceneDraftResult
  receipt: ManualRecallAdherenceReceipt
}) {
  const text = draftTextFromBlocks(input.draft.contentBlocks)
  return {
    visibleCharacterCount: countVisibleCharacters(text),
    completeEnding: hasCompleteSceneEnding(text),
    manuscriptSha256: sha256(text),
    adherenceDecision: input.receipt.decision,
    fulfilledOrRespectedCount: input.receipt.checks.filter(check => (
      check.status === 'fulfilled' || check.status === 'respected'
    )).length,
    violatedOrOmittedCount: input.receipt.checks.filter(check => (
      check.status === 'violated' || check.status === 'omitted'
    )).length,
    checks: input.receipt.checks.map(check => ({
      sourceId: check.sourceId,
      group: check.group,
      status: check.status,
      evidenceBlockCount: check.evidence.length,
      evidenceLocatable: check.status === 'omitted' ? check.evidence.length === 0 : check.evidence.length > 0,
    })),
  }
}

function productReviewSummary(review: LiteraryReview) {
  const activeFindings = review.findings.filter(finding => finding.status === 'active')
  return {
    reviewSha256: sha256(JSON.stringify({
      findings: activeFindings.map(finding => ({
        dimension: finding.dimension,
        severity: finding.severity,
        evidence: finding.evidence,
      })),
      deterministicViolations: review.deterministicViolations,
      manualRecallAdherence: review.manualRecallAdherence,
    })),
    requestedFocusDimensions: review.requestedFocusDimensions ?? [],
    activeFindingCount: activeFindings.length,
    activeFindings: activeFindings.map(finding => ({
      dimension: finding.dimension,
      severity: finding.severity,
      evidenceBlockCount: new Set(finding.evidence.map(item => item.blockId)).size,
      evidenceLocatable: finding.evidence.length > 0,
    })),
    actionableFindingVerificationCompleted: activeFindings.some(finding => (
      finding.severity === 'hard_block' || finding.severity === 'revision_candidate'
    ))
      ? Boolean(review.modelFindingVerification)
      : true,
    manualRecallAdherenceDecision: review.manualRecallAdherence?.decision ?? null,
    deterministicViolationCount: review.deterministicViolations.length,
  }
}

function candidateGateSummary(gate: ReturnType<typeof evaluateCandidateQualityGate>) {
  return {
    allowed: gate.allowed,
    blockers: gate.blockers,
  }
}

const fixture = trialFixture()
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-manual-recall-effect-'))
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
let partialFullProductReview: Record<string, unknown> | null = null
try {
  const health = await waitForHealth(`${baseUrl}/health`, childState)
  assert.equal(health.status, 'ready')
  assert.equal(health.privateDraftsRemainLocal, true)
  assert.ok(health.operations.includes('manual_recall_adherence_review'))
  assert.ok(health.operations.includes('paired_literary_comparison'))
  assert.ok(health.operations.includes('paired_literary_comparison_verification'))

  const agent = createLocalWorkingAgent(baseUrl)
  const generationOrder: TrialArm[] = randomBytes(1)[0]! % 2 === 0
    ? ['manual_recall_selected', 'manual_recall_absent']
    : ['manual_recall_absent', 'manual_recall_selected']
  const drafts = {} as Record<TrialArm, SceneDraftResult>
  for (const arm of generationOrder) {
    const context = arm === 'manual_recall_selected'
      ? fixture.treatmentContext
      : fixture.baselineContext
    drafts[arm] = await agent.draftScene({
      session: fixture.session,
      intent: fixture.intent,
      candidate: fixture.candidate,
      context,
      request: requestFor({
        session: fixture.session,
        intent: fixture.intent,
        candidate: fixture.candidate,
        context,
      }),
      currentBlocks: [],
    })
  }

  const texts = {
    manual_recall_selected: draftTextFromBlocks(drafts.manual_recall_selected.contentBlocks),
    manual_recall_absent: draftTextFromBlocks(drafts.manual_recall_absent.contentBlocks),
  }
  for (const text of Object.values(texts)) {
    const length = countVisibleCharacters(text)
    assert.ok(length >= 2700 && length <= 3400)
    assert.equal(hasCompleteSceneEnding(text), true)
  }
  assert.notEqual(sha256(texts.manual_recall_selected), sha256(texts.manual_recall_absent))

  const reviewOrder: TrialArm[] = randomBytes(1)[0]! % 2 === 0
    ? ['manual_recall_selected', 'manual_recall_absent']
    : ['manual_recall_absent', 'manual_recall_selected']
  const fullReviews = {} as Record<TrialArm, LiteraryReview>
  for (const arm of reviewOrder) {
    fullReviews[arm] = await agent.reviewDraft({
      session: fixture.session,
      intent: fixture.intent,
      candidate: fixture.candidate,
      context: arm === 'manual_recall_selected'
        ? fixture.treatmentContext
        : fixture.baselineContext,
      draft: drafts[arm],
      focusDimensions: ['repetition', 'exposition'],
    })
  }

  const receipts = {
    manual_recall_selected: fullReviews.manual_recall_selected.manualRecallAdherence
      ?? await requestManualRecallAdherenceReviewFromWorkingAgent({
        baseUrl,
        selectedRecallItems: fixture.recalls,
        draftBlocks: drafts.manual_recall_selected.contentBlocks,
      }),
    manual_recall_absent: await requestManualRecallAdherenceReviewFromWorkingAgent({
      baseUrl,
      selectedRecallItems: fixture.recalls,
      draftBlocks: drafts.manual_recall_absent.contentBlocks,
    }),
  }

  const candidateQualityGates = {} as Record<TrialArm, ReturnType<typeof candidateGateSummary>>
  partialFullProductReview = {
    reviewOrder,
    focusDimensions: ['repetition', 'exposition'],
    manualRecallSelected: productReviewSummary(fullReviews.manual_recall_selected),
    manualRecallAbsent: productReviewSummary(fullReviews.manual_recall_absent),
    candidateQualityGate: candidateQualityGates,
    candidateAdoptionAttempted: false,
  }
  for (const arm of ['manual_recall_selected', 'manual_recall_absent'] as TrialArm[]) {
    const draft = drafts[arm]
    const review = fullReviews[arm]
    const gate = evaluateCandidateQualityGate({
      session: {
        ...fixture.session,
        phase: 'reviewing',
        currentDraftRevision: draft.revision,
        activeDraftId: draft.draftId,
        activeReviewId: review.id,
        updatedAt: review.createdAt,
      },
      intent: fixture.intent,
      context: arm === 'manual_recall_selected'
        ? fixture.treatmentContext
        : fixture.baselineContext,
      draft,
      review,
      repairs: [],
    })
    candidateQualityGates[arm] = candidateGateSummary(gate)
    const expectedHardBlockCount = review.findings.filter(finding => (
      finding.status === 'active' && finding.severity === 'hard_block'
    )).length
    const expectedRevisionCandidateCount = review.findings.filter(finding => (
      finding.status === 'active' && finding.severity === 'revision_candidate'
    )).length
    assert.ok(
      expectedHardBlockCount + expectedRevisionCandidateCount > 0,
      `${arm} must contain at least one verified actionable literary finding.`,
    )
    assert.equal(gate.allowed, false, `${arm} must remain blocked after the measured full product review.`)
    assert.equal(
      gate.blockers.find(blocker => blocker.code === 'active_hard_block')?.count ?? 0,
      expectedHardBlockCount,
      `${arm} hard blockers must exactly mirror the active literary review.`,
    )
    assert.equal(
      gate.blockers.find(blocker => blocker.code === 'active_revision_candidate')?.count ?? 0,
      expectedRevisionCandidateCount,
      `${arm} revision blockers must exactly mirror the active literary review.`,
    )
    const contractFailureCodes = new Set([
      'intent_not_locked',
      'intent_revision_mismatch',
      'draft_revision_mismatch',
      'context_not_current',
      'review_not_current',
      'direction_receipt_missing',
      'direction_receipt_axis_mismatch',
      'direction_receipt_evidence_invalid',
      'direction_adjustment_evidence_invalid',
      'manual_recall_receipt_missing',
      'manual_recall_receipt_mismatch',
      'manual_recall_receipt_evidence_invalid',
    ])
    assert.equal(gate.blockers.some(blocker => contractFailureCodes.has(blocker.code)), false)
  }

  const mapping: Record<BlindLabel, TrialArm> = randomBytes(1)[0]! % 2 === 0
    ? { candidate_a: 'manual_recall_selected', candidate_b: 'manual_recall_absent' }
    : { candidate_a: 'manual_recall_absent', candidate_b: 'manual_recall_selected' }
  const candidateABlocks = evidenceBlocks(texts[mapping.candidate_a], 'candidate_a')
  const candidateBBlocks = evidenceBlocks(texts[mapping.candidate_b], 'candidate_b')
  const comparisonId = `manual-recall-effect:${randomUUID()}`
  const sharedContext = {
    fixtureId: fixture.fixtureId,
    authorIntent: fixture.intent,
    selectedLongRangeMemory: fixture.recalls.map(item => ({
      sourceId: item.sourceId,
      group: item.group,
      statement: item.statement,
      whyNow: item.whyNow,
    })),
    evaluationRule: 'Compare execution without guessing which candidate received the selected memory.',
  }
  const comparison = await requestPairedLiteraryComparisonFromWorkingAgent({
    baseUrl,
    comparisonId,
    sharedContext,
    candidateABlocks,
    candidateBBlocks,
  })
  const verification = await requestPairedLiteraryComparisonVerificationFromWorkingAgent({
    baseUrl,
    comparisonId,
    sharedContext,
    candidateABlocks,
    candidateBBlocks,
    comparison: comparison.comparison,
  })
  const armFor = (value: BlindLabel | 'tie') => value === 'tie' ? 'tie' : mapping[value]
  const dimensions = comparison.comparison.dimensions.map(item => {
    const verified = verification.dimensions.find(candidate => candidate.dimension === item.dimension)!
    return {
      dimension: item.dimension,
      firstPassPreference: armFor(item.preference),
      reasonCode: item.reasonCode,
      verificationDecision: verified.decision,
      confirmedPreference: verified.confirmedPreference ? armFor(verified.confirmedPreference) : null,
      confirmedReasonCode: verified.confirmedReasonCode,
      confidence: item.confidence,
    }
  })
  const hardConstraints = comparison.comparison.hardConstraints.map(item => {
    const verified = verification.hardConstraints.find(candidate => candidate.candidate === item.candidate)!
    return {
      arm: mapping[item.candidate],
      firstPassStatus: item.status,
      violationType: item.violationType,
      reasonCode: item.reasonCode,
      verificationDecision: verified.decision,
      confirmedStatus: verified.confirmedStatus,
      confirmedViolationType: verified.confirmedViolationType,
      confirmedReasonCode: verified.confirmedReasonCode,
    }
  })

  const manifests = await runManifests(logRoot)
  for (const operation of [
    'scene_architecture',
    'scene_draft',
    'literary_review',
    'manual_recall_adherence_review',
    'paired_literary_comparison',
    'paired_literary_comparison_verification',
  ]) assert.ok(manifests.some(item => item.operation === operation), `Missing real operation ${operation}.`)
  assert.equal(manifests.filter(item => item.operation === 'scene_draft').length, 2)
  assert.equal(manifests.filter(item => item.operation === 'literary_review').length, 2)
  assert.ok(manifests.every(item => (
    item.status === 'succeeded'
    && item.privateDataBoundary === 'local_ephemeral'
    && item.canonCommitAllowed === false
  )))

  const summary = {
    schemaVersion: 'creator-manual-recall-effect-real-trial.v1',
    trialId: comparisonId,
    completedAt: new Date().toISOString(),
    status: 'real_single_pair_measured_no_stability_claim',
    fixture: {
      id: fixture.fixtureId,
      scenarioId,
      source: 'frozen_original_single_scene',
      inputSha256: sha256(JSON.stringify(fixture)),
      recallSourceCount: fixture.recalls.length,
      recallGroups: fixture.recalls.map(item => item.group),
      recallSourcesAbsentFromBaselineContext: true,
      realWorkingAgent: true,
      realChapterMaterialUsed: false,
    },
    fairness: {
      sameSession: true,
      sameLockedIntent: true,
      sameSelectedCandidate: true,
      sameTargetLength: true,
      sameWorkingAgentBridge: true,
      onlyAuthoredContextDifference: 'manualRecallItems',
      contextIdentityRecomputedPerArm: true,
      generationOrderRandomized: true,
      candidateLabelsRandomized: true,
      evaluatorSawArmIdentity: false,
      verifierSawArmIdentity: false,
      privateMappingSha256: sha256(JSON.stringify(mapping)),
      compositeLiteraryScoreUsed: false,
    },
    arms: {
      manualRecallSelected: armSummary({
        draft: drafts.manual_recall_selected,
        receipt: receipts.manual_recall_selected,
      }),
      manualRecallAbsent: armSummary({
        draft: drafts.manual_recall_absent,
        receipt: receipts.manual_recall_absent,
      }),
    },
    blindLiteraryComparison: {
      comparisonAttempts: comparison.attempts,
      evidenceRevisionApplied: comparison.evidenceRevisionApplied,
      independentVerificationCompleted: true,
      dimensions,
      hardConstraints,
      overallWinnerDeclared: false,
      compositeLiteraryScoreUsed: false,
    },
    fullProductReview: {
      ...partialFullProductReview,
      candidateQualityGate: {
        manualRecallSelected: candidateQualityGates.manual_recall_selected,
        manualRecallAbsent: candidateQualityGates.manual_recall_absent,
      },
    },
    runtime: {
      realWorkingAgentCallCount: manifests.length,
      generationOrder,
      roleOperations: manifests.map(item => ({
        role: item.role,
        operation: item.operation,
        status: item.status,
        privateDataBoundary: item.privateDataBoundary,
        canonCommitAllowed: item.canonCommitAllowed,
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
      rawDraftPersistedInRepository: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'One randomized frozen-scene pair measures one execution and does not prove stable literary improvement.',
      'The trial tests author-selected long-range memory effect, not automatic retrieval quality.',
      'No candidate was adopted and the receipt retains no manuscript or raw model output.',
    ],
  }
  const serialized = JSON.stringify(summary, null, 2)
  for (const text of Object.values(texts)) {
    assert.equal(serialized.includes(text.slice(0, 30)), false)
  }
  assert.equal(serialized.includes('evidenceQuotes'), false)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${serialized}\n`, 'utf8')
  process.stdout.write(`${serialized}\n`)
  completed = true
} catch (error) {
  const manifests = await runManifests(logRoot)
  const failure = {
    schemaVersion: 'creator-manual-recall-effect-failed-attempt.v1',
    failedAt: new Date().toISOString(),
    status: 'real_trial_failed_closed',
    scenarioId,
    fixtureId: fixture.fixtureId,
    error: {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: typeof error === 'object' && error && 'code' in error ? String(error.code) : null,
      message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    },
    runtime: {
      completedRoleCallCount: manifests.length,
      roleOperations: manifests.map(item => ({
        role: item.role,
        operation: item.operation,
        status: item.status,
        privateDataBoundary: item.privateDataBoundary,
        canonCommitAllowed: item.canonCommitAllowed,
      })),
    },
    fullProductReview: partialFullProductReview,
    boundaries: {
      repositoryWritePerformed: false,
      candidateAdopted: false,
      canonChanged: false,
      chapter20AccessedOrChanged: false,
      chapter21AccessedOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
      rawDraftPersistedInRepository: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(
    path.join(path.dirname(outputPath), 'failed-attempt.json'),
    `${JSON.stringify(failure, null, 2)}\n`,
    'utf8',
  )
  throw error
} finally {
  if (!completed && childState.stderr.trim()) process.stderr.write(childState.stderr)
  bridge.kill('SIGTERM')
  if (!childState.exited) await new Promise(resolve => bridge.once('exit', resolve))
  await rm(sandbox, { recursive: true, force: true })
}

assert.equal(completed, true)
