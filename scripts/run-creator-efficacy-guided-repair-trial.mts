import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  createLocalWorkingAgent,
  requestSceneAuthorDirectionDraftReviewFromWorkingAgent,
  sceneDraftDirectionReceiptFromReview,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  applyRepairProposal,
  createLiteraryReview,
  createRepairProposal,
  evidenceForDraftQuote,
} from '../app/src/features/creator-decision/literaryReview'
import {
  countVisibleCharacters,
  createDraftResult,
  draftBlocksFromText,
  draftTextFromBlocks,
  hasCompleteSceneEnding,
  withoutSceneDraftDirectionReceipt,
} from '../app/src/features/creator-decision/sceneDrafting'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
  SceneDraftRequest,
  SceneDraftResult,
} from '../app/src/features/creator-decision/types'
import { frozenPairedQualityFixture } from './fixtures/creator-frozen-paired-quality-fixture.mts'
import {
  assessOptionalLocalRepairEfficacy,
  executeBoundedOptionalLocalRepair,
  executeSingleEfficacyGuidedRepair,
  selectEfficacyGuidedRetryTarget,
} from './frozen-paired-quality-local-repair.mts'

interface RunManifest {
  pipelineId: string
  sequence: number
  role: string
  operation: string
  status: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

interface FrozenCompactIntent {
  id: string
  sessionId: string
  revision: number
  status: 'locked'
  premise: string
  desiredReaderExperience: string
  coreChoice: string
  hardConstraints: string[]
  mustInclude: string[]
  mustNotResolve: string[]
  informationPolicy: { charactersMustNotKnow: string[] }
  sceneMechanismDirection?: AuthorIntentContract['sceneMechanismDirection']
}

const root = process.cwd()
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'validation/creator-ui/efficacy-guided-repair-real-trial-2026-07-17/summary.json',
    },
    model: { type: 'string' },
  },
  strict: true,
})

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

const localhostLongTaskFetch: typeof fetch = async (input, init: RequestInit = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Efficacy-guided repair trials only allow localhost HTTP transport.')
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
        request.destroy(new Error('Trial transport only accepts string or byte request bodies.'))
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

async function waitForHealth(url: string, output: { stderr: string; exited: boolean }) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (output.exited) throw new Error(`Working Agent bridge exited early: ${output.stderr}`)
    try {
      const response = await fetch(url)
      if (response.ok) {
        return response.json() as Promise<{
          status: string
          operations: string[]
          privateDraftsRemainLocal: boolean
        }>
      }
    } catch {
      // The bridge may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Working Agent bridge did not become ready: ${output.stderr}`)
}

async function findNamedFiles(directory: string, targetName: string): Promise<string[]> {
  const found: string[] = []
  let entries
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

async function runManifests(logRoot: string) {
  const paths = await findNamedFiles(logRoot, 'run-manifest.json')
  const manifests = await Promise.all(paths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8')) as RunManifest
  )))
  return manifests.sort((left, right) => (
    left.pipelineId.localeCompare(right.pipelineId) || left.sequence - right.sequence
  ))
}

function domainReviewIntent(input: {
  compact: FrozenCompactIntent
  candidate: NarrativeCandidate
}): AuthorIntentContract {
  const expectedCost = input.compact.sceneMechanismDirection?.tradeoff
    || '当前选择必须在本场形成可见代价'
  return {
    schemaVersion: 'author-intent.v1',
    id: input.compact.id,
    sessionId: input.compact.sessionId,
    revision: input.compact.revision,
    status: input.compact.status,
    readerExperience: {
      startEmotion: '压力已经到达现场',
      targetEmotion: input.compact.desiredReaderExperience,
      emotionalMovement: input.compact.desiredReaderExperience,
      intensity: 'moderate',
    },
    narrativeDelta: {
      startingCondition: input.compact.premise,
      endingCondition: input.compact.mustInclude.join('；'),
      mustChange: input.compact.coreChoice,
      mustNotResolve: [...input.compact.mustNotResolve],
      irreversibleChange: expectedCost,
    },
    characterAgency: {
      primaryActorId: input.candidate.strategyAxes.agencyOwnerId,
      currentGoal: input.candidate.oneSentenceMechanism || input.compact.premise,
      requiredChoice: input.compact.coreChoice,
      opposingForce: input.compact.hardConstraints.join('；'),
      expectedCost,
    },
    informationPolicy: {
      readerShouldKnow: [],
      readerShouldSuspect: [],
      charactersMustNotKnow: input.compact.informationPolicy.charactersMustNotKnow.map((information, index) => ({
        characterId: `restricted-character:${index + 1}`,
        information,
      })),
      delayedReveals: [...input.compact.mustNotResolve],
    },
    boundaries: {
      requiredElements: [...input.compact.mustInclude],
      forbiddenEffects: [...input.compact.hardConstraints, ...input.compact.mustNotResolve],
      protectedCharacterTraits: [],
    },
    sceneMechanismDirection: input.compact.sceneMechanismDirection,
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
    createdAt: input.compact.sceneMechanismDirection?.selectedAt || '2026-07-17T00:00:00.000Z',
    lockedAt: input.compact.sceneMechanismDirection?.selectedAt || '2026-07-17T00:00:00.000Z',
  }
}

const repeatedParagraph = '陆沉舟又把分工从头说了一遍：黎芜看压力针，他守绞盘，商贩退到黄线外。每个名字、每个动作、每次呼吸都和上一遍相同，仿佛只要重复得足够完整，摇晃的升降台就会替他作出决定。'

function frozenTrialText() {
  const paragraphs = [
    '风暴还没越过盐堤，潮声已经沿着废弃轨道灌进旧升降井。陆沉舟把密封匣压在肋下，左掌贴住冰冷的绞盘外壳，旧伤被金属的震动一寸寸唤醒。井口的红灯每隔七息熄一次，意味着备用电池只够他们把轿厢送到矿层，绝不够再升回来。官方许可已经失去，眼前这座锈蚀机械是唯一的路。',
    '黎芜跪在配重槽前，用细齿钳挑开结盐的卡簧。空槽像一只被拔掉牙齿的嘴，旁边刻着旧式警告：缺芯启动，制动爪将在第三十米失效。她没抬头，只说市场上最后一枚配重芯就在灰棚商贩手里。陆沉舟顺着她的目光看过去，商贩正把一只铜盒夹在腋下，脚尖始终朝着离港坡道。',
    '商贩不收盐票，也不要陆沉舟的旧航标。他要的是一项未来义务：下次北泵站封闸时，陆沉舟必须替他带一个人穿过巡检线，而且不得追问身份。条件说出口后，黎芜的钳口停在卡簧上。密封匣里的航图没有被提及，商贩急于离港的真正原因也仍藏在他不断回望盐堤的动作里。',
    '陆沉舟没有立刻答应。他先问义务何时失效，又问那个人是否携带会伤害队伍的东西。商贩只肯保证不会带火器，并把期限压在三个月内。双方一句一句缩小风险，像在风里搭一座看不见的桥。黎芜插话，把配重芯接入后的校准步骤分成四段，明确指出最危险的一段必须有人留在轿厢外侧读取压力针。',
    repeatedParagraph,
    '商贩把铜盒放上护栏，盒底被风吹得轻轻磕响。他提醒陆沉舟，风暴一旦压过盐堤，北泵站会先关闭下层通道；现在不答应，所有筹码都会变成废铁。陆沉舟盯着铜盒，却把问题转向黎芜：如果把外侧校准交给她，她需要什么权限。黎芜说，她要掌握制动指令，也要队伍在她报数时无条件执行。',
    '这不是一句帮忙，而是把退路交到一个尚未完全信任的人手里。陆沉舟的左掌在绞盘上打滑，锁链骤然绷紧的声音让他想起旧事故中断掉的救援索。他本能地想把所有步骤重新抓回自己手里，却看见黎芜已经把钳子横放在膝上，等的不是安慰，而是与风险相称的职责。',
    '他最终向商贩确认了义务：三个月内，只协助一人穿过北泵站巡检线；若对方携带火器或伤害队伍，约定立即失效。商贩在旧航标背面划下盐印，把配重芯推过来。陆沉舟没有得到第二枚芯，也没有得到免费的退路；他用一次具体而危险的未来协助换到了眼前唯一能启动机械的资源。',
    repeatedParagraph,
    '随后他改了口。黎芜负责压力针、制动杆和最后校准，拥有中止下降的权限；陆沉舟只守绞盘与主索，任何人不得越过她画出的黄线。商贩挑眉，像第一次发现这支临时队伍里还有第二个能下令的人。黎芜把细齿钳重新扣上卡簧，没有道谢，只让所有人重复一次她的停机手势。',
    '配重芯卡进槽口时，锈层下传出沉闷的咬合声。黎芜报出第一组压力，陆沉舟按她的节奏松开半圈绞盘。轿厢向下沉了半尺，又被制动爪猛地拽住。左掌旧伤让他几乎握不住把手，他却没有越权去碰黎芜的制动杆，只把耐盐绳缠到前臂，让自己承担主索突然回弹的力。',
    '第二组压力比预估高出两格。商贩已经退到黄线外，仍忍不住催促快一点。黎芜没有理他，她要求卸掉密封匣旁的一只水桶，把重量移到轿厢后角。陆沉舟照做，却不解释匣内是什么。航图终点继续被封在铜扣后面，黎芜只知道那只匣子必须被带下去，不知道它为什么值得冒险。',
    repeatedParagraph,
    '重复的话落下后，黎芜终于抬眼。她指出问题不在谁记得分工，而在陆沉舟是否真的允许别人执行。她把制动杆推到试锁位，要求他松开主索两指宽。那两指宽意味着一旦她判断错误，轿厢会带着所有人坠下第一段井壁；也意味着她若判断正确，制动爪会在真正下降前重新咬合。',
    '陆沉舟松手。主索从掌心滑过，旧伤立刻裂开一线血色。轿厢下坠，黎芜在第三次金属碰响前扳回制动杆，压力针停在绿色窄区。她没有看陆沉舟的伤，只报出可以下降。这个动作比任何保证都更明确：她接住了被交付的职责，而他没有在危险到来时把权限夺回去。',
    '商贩收起刻着盐印的旧航标副片，提醒陆沉舟别忘了北泵站的约定。未来义务已经成立，不会因为他们活着下井就消失。陆沉舟让他把期限和禁带火器的条件再说一遍，这一次不是拖延，而是把代价钉牢。他知道自己买到的不是好运，只是把眼前的死亡换成了未来必须偿还的风险。',
    '黎芜进入轿厢前，把细齿钳留在外侧卡簧上，作为返程时重新校准的标记。她站到制动杆旁，要求队伍依次报出负重。陆沉舟最后一个进入，把主索交到她伸出的手边，却没有替她握住。两人的位置悄悄换了：他仍承担决定的代价，她却掌握了所有人能否停下的权力。',
    '风暴压上盐堤，井口的红灯连续熄灭。黎芜喊出下降，轿厢越过第一道锈梁。商贩留在上方，铜盒在怀里反出一线暗光，他真正急于离港的原因仍未揭开。陆沉舟抬头看见井口缩成一枚灰白圆点，密封匣里的航图终点也仍然无人知晓。',
    '下降到第二道锈梁时，副槽里传来一阵细碎刮擦。黎芜让所有人把重心移向井壁，又用钳柄轻敲压力表外框，判断配重芯并没有断裂，只是盐粒进入齿面。陆沉舟没有替她下结论，他按住想开口的队员，让轿厢保持安静。职责交出去之后，他第一次需要用克制而不是命令证明自己仍在承担风险。',
    '黎芜把制动杆压低半寸，让齿轮在负重下自行排出盐屑。这个动作没有出现在她先前描述的四段步骤里，陆沉舟看见压力针抖到红区边缘，手臂已经绷紧，却仍等她报数。三息后，刮擦声变成均匀的啮合声。她抬起两根手指，示意危机过去，也等于告诉他：权限不是象征，她会为临场判断负责。',
    '队伍里最年轻的搬运工问，返程时没有新的配重芯该怎么办。陆沉舟没有给出虚假的保证，只说他们必须在矿层找到另一条出口，或者找到能重新烧结芯体的炉匠。眼前这枚资源只能完成一次下降，这个限制没有被奇迹抹掉。众人沉默下来，明白商贩卖给他们的是进入问题深处的机会，不是脱身的答案。',
    '黎芜听见这句话，把返程标记的位置重新报给所有人，然后补充：若他们能回来，谁也不得在未检查主索前启动轿厢。陆沉舟答应，并把这条规则记在旧航标背面的盐印旁。新的合作不只是一场危险里的默契，它开始产生下一次行动仍要遵守的约束，这让两人的关系变化有了可持续的重量。',
    '第三十米处，制动爪果然短暂失压。黎芜没有慌，她用配重芯争来的两息把压力导回副槽，再命令陆沉舟放掉半圈主索。陆沉舟照做，左掌的血沿绳纹渗开。轿厢在黑暗里重重一顿，随后稳定下降；这次没有人重复分工，因为每个人都已经在行动中承担了自己的那一部分。',
    '矿层的冷风从下方托起衣角时，黎芜把制动权交回一半，只让陆沉舟负责最终落锁。她没有把全部权限还给他，陆沉舟也没有要求。轿厢落上缓冲梁，金属余震渐渐止住。上方风暴封住归路，北泵站的未来义务留在盐印里，而他们之间第一次出现了一种能够被下一场继续检验的信任。',
  ]
  return paragraphs.join('\n\n')
}

function revisionDraft(input: { previous: SceneDraftResult; contentBlocks: SceneDraftResult['contentBlocks'] }) {
  return {
    ...withoutSceneDraftDirectionReceipt(input.previous),
    draftId: `efficacy-guided-draft:${randomUUID()}`,
    baseDraftRevision: input.previous.revision,
    revision: input.previous.revision + 1,
    contentBlocks: input.contentBlocks,
    status: 'current' as const,
    createdAt: new Date().toISOString(),
  }
}

function verificationCounts(review: LiteraryReview) {
  return {
    performed: Boolean(review.modelFindingVerification),
    verifiedFindingCount: review.modelFindingVerification?.verifiedFindingIds.length || 0,
    rejectedFindingCount: review.modelFindingVerification?.rejectedFindingIds.length || 0,
  }
}

const outputPath = path.resolve(root, values.output)
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-efficacy-guided-repair-'))
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

let summary: Record<string, unknown> | null = null
try {
  const health = await waitForHealth(`${baseUrl}/health`, childOutput)
  assert.equal(health.status, 'ready')
  assert.equal(health.privateDraftsRemainLocal, true)
  for (const operation of [
    'local_repair',
    'local_repair_review',
    'literary_review',
    'literary_review_verification',
    'scene_author_direction_draft_review',
  ]) assert.ok(health.operations.includes(operation), `Missing operation ${operation}`)

  const fixture = frozenPairedQualityFixture()
  const session: CreationSession = {
    schemaVersion: 'creation-session.v1',
    ...fixture.session,
    phase: 'reviewing',
    currentIntentRevision: fixture.intent.revision,
    currentCandidateRevision: fixture.selectedCandidate.revision,
    currentDraftRevision: 0,
    lockedIntentId: fixture.intent.id,
    selectedCandidateId: fixture.selectedCandidate.id,
    activeDraftId: null,
    activeReviewId: null,
    proposedCanonPatchId: null,
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
  }
  const candidate = fixture.selectedCandidate as unknown as NarrativeCandidate
  const context = fixture.context as unknown as ContextSnapshot
  const intent = domainReviewIntent({
    compact: fixture.intent as unknown as FrozenCompactIntent,
    candidate,
  })
  const request: SceneDraftRequest = {
    sessionId: session.id,
    intentId: intent.id,
    intentRevision: intent.revision,
    candidateId: candidate.id,
    candidateRevision: candidate.revision,
    contextSnapshotId: context.id,
    baseCanonRevision: session.baseCanonRevision,
    baseDraftRevision: 0,
    scope: { type: 'scene', sceneId: session.sceneId, beatIds: [], selectedBlockIds: [] },
    protectedBlockIds: [],
    targetLength: { minimum: 2700, maximum: 3400 },
    writingMode: 'agent_first_draft',
  }
  const frozenText = frozenTrialText()
  const frozenLength = countVisibleCharacters(frozenText)
  assert.ok(frozenLength >= 2700 && frozenLength <= 3400, `Frozen fixture length ${frozenLength} is outside 2700-3400.`)
  assert.equal(hasCompleteSceneEnding(frozenText), true)
  const initialDraft = createDraftResult({
    request,
    contentBlocks: draftBlocksFromText(frozenText),
    now: '2026-07-17T00:00:00.000Z',
  })
  assert.equal(Number.isInteger(initialDraft.revision), true)
  assert.equal(initialDraft.baseDraftRevision, 0)
  assert.equal(initialDraft.revision, 1)
  const initialEvidence = evidenceForDraftQuote(initialDraft.contentBlocks, repeatedParagraph)
  assert.ok(initialEvidence?.length === 1, 'Frozen deterministic finding must point to one block.')
  const initialFinding: LiteraryFinding = {
    id: 'finding:frozen-three-block-repetition',
    dimension: 'repetition',
    severity: 'revision_candidate',
    evidence: initialEvidence,
    expected: '分工只需在变化发生时更新，不能用原样复述代替推进。',
    observed: '同一段分工说明在正文中原样重复。',
    readerImpact: '选择停滞，关系变化被解释覆盖。',
    diagnosis: '这是冻结夹具中人为植入、可定位的重复段。',
    repairDirection: '只替换证据段，让该处以现场动作推进，同时保留职责与知识边界。',
    protectedBlockIds: [],
    confidence: 'high',
    status: 'active',
  }
  const initialReview = createLiteraryReview({
    id: 'review:frozen-three-block-repetition',
    sessionId: session.id,
    context,
    draft: initialDraft,
    findings: [initialFinding],
    requestedFocusDimensions: ['repetition'],
    now: '2026-07-17T00:00:01.000Z',
  })
  const agent = createLocalWorkingAgent(baseUrl)
  assert.ok(agent.proposeRepair && agent.reviewRepair)
  const firstTargetBlock = initialDraft.contentBlocks.find(block => block.id === initialEvidence[0].blockId)
  assert.ok(firstTargetBlock)
  const firstInput = {
    session,
    intent,
    context,
    candidate,
    draft: initialDraft,
    review: initialReview,
    finding: initialFinding,
    targetBlock: firstTargetBlock,
  }
  const firstAttempt = await executeBoundedOptionalLocalRepair({
    proposeInitial: () => agent.proposeRepair!({ ...firstInput, attempt: 'initial' }),
    review: repair => agent.reviewRepair!({ ...firstInput, repair }),
    proposeAuditorRevision: (previousRepair, repairReview) => agent.proposeRepair!({
      ...firstInput,
      attempt: 'auditor_revision',
      previousRepair,
      repairReview,
    }),
  })

  let firstDraft: SceneDraftResult | null = null
  let firstReview: LiteraryReview | null = null
  let retryTarget: ReturnType<typeof selectEfficacyGuidedRetryTarget> = null
  let retryStatus: 'not_run' | 'completed' | 'rejected' | 'failed_closed' = 'not_run'
  let retryAuditorDecision: 'pass' | 'reject' | 'not_run' = 'not_run'
  let finalDraft: SceneDraftResult = initialDraft
  let finalReview: LiteraryReview | null = null
  let directionReviewDecision: 'pass' | 'reject' | 'not_run' = 'not_run'
  let directionReceiptCreated = false
  let retainDecision: 'retained_after_all_gates' | 'reverted_to_frozen_original' = 'reverted_to_frozen_original'

  if (firstAttempt.status === 'completed' && firstAttempt.independentReview.decision === 'pass') {
    const firstProposal = createRepairProposal({
      id: `repair:first:${randomUUID()}`,
      review: initialReview,
      findingId: initialFinding.id,
      operation: firstAttempt.repair.operation,
      proposedContent: firstAttempt.repair.proposedContent,
      preservedFacts: firstAttempt.repair.preservedFacts.map(item => item.fact),
      targetBlockIds: [firstTargetBlock.id],
      verification: firstAttempt.independentReview,
    })
    const firstBlocks = applyRepairProposal({
      proposal: firstProposal,
      blocks: initialDraft.contentBlocks,
      currentDraftRevision: initialDraft.revision,
    })
    const firstText = draftTextFromBlocks(firstBlocks)
    if (
      countVisibleCharacters(firstText) >= request.targetLength.minimum
      && countVisibleCharacters(firstText) <= request.targetLength.maximum
      && hasCompleteSceneEnding(firstText)
    ) {
      firstDraft = revisionDraft({ previous: initialDraft, contentBlocks: firstBlocks })
      firstReview = await agent.reviewDraft({
        session,
        intent,
        context,
        candidate,
        draft: firstDraft,
        focusDimensions: ['repetition'],
      })
      const firstEfficacy = assessOptionalLocalRepairEfficacy({
        targetDimension: 'repetition',
        findings: firstReview.findings,
      })
      if (firstEfficacy.decision === 'revert_original_candidate') {
        retryTarget = selectEfficacyGuidedRetryTarget({
          targetDimension: 'repetition',
          findings: firstReview.findings,
          blocks: firstDraft.contentBlocks,
        })
      }
      const retryFinding = retryTarget
        ? firstReview.findings.find(finding => finding.id === retryTarget?.findingId)
        : null
      const retryBlock = retryTarget
        ? firstDraft.contentBlocks.find(block => block.id === retryTarget?.targetBlockId)
        : null
      if (retryFinding && retryBlock) {
        const retryInput = {
          session,
          intent,
          context,
          candidate,
          draft: firstDraft,
          review: firstReview,
          finding: retryFinding,
          targetBlock: retryBlock,
        }
        const retryAttempt = await executeSingleEfficacyGuidedRepair({
          propose: () => agent.proposeRepair!({ ...retryInput, attempt: 'efficacy_retry' }),
          review: repair => agent.reviewRepair!({
            ...retryInput,
            attempt: 'efficacy_retry',
            repair,
          }),
        })
        retryStatus = retryAttempt.status
        retryAuditorDecision = retryAttempt.status === 'failed_closed'
          ? 'not_run'
          : retryAttempt.independentReview.decision
        if (retryAttempt.status === 'completed') {
          const retryProposal = createRepairProposal({
            id: `repair:efficacy-guided:${randomUUID()}`,
            review: firstReview,
            findingId: retryFinding.id,
            operation: retryAttempt.repair.operation,
            proposedContent: retryAttempt.repair.proposedContent,
            preservedFacts: retryAttempt.repair.preservedFacts.map(item => item.fact),
            targetBlockIds: [retryBlock.id],
            verification: retryAttempt.independentReview,
          })
          const retryBlocks = applyRepairProposal({
            proposal: retryProposal,
            blocks: firstDraft.contentBlocks,
            currentDraftRevision: firstDraft.revision,
          })
          const retryText = draftTextFromBlocks(retryBlocks)
          if (
            countVisibleCharacters(retryText) >= request.targetLength.minimum
            && countVisibleCharacters(retryText) <= request.targetLength.maximum
            && hasCompleteSceneEnding(retryText)
          ) {
            const retryDraft = revisionDraft({ previous: firstDraft, contentBlocks: retryBlocks })
            finalReview = await agent.reviewDraft({
              session,
              intent,
              context,
              candidate,
              draft: retryDraft,
              focusDimensions: ['repetition'],
            })
            const finalEfficacy = assessOptionalLocalRepairEfficacy({
              targetDimension: 'repetition',
              findings: finalReview.findings,
            })
            if (finalEfficacy.decision === 'retain_revised_candidate') {
              const directionReview = await requestSceneAuthorDirectionDraftReviewFromWorkingAgent({
                baseUrl,
                intent,
                draft: retryDraft,
              })
              directionReviewDecision = directionReview.decision
              if (directionReview.decision === 'pass') {
                finalDraft = {
                  ...retryDraft,
                  directionReceipt: sceneDraftDirectionReceiptFromReview({
                    review: directionReview,
                    draftBlocks: retryDraft.contentBlocks,
                  }),
                }
                directionReceiptCreated = true
                retainDecision = 'retained_after_all_gates'
              }
            }
          }
        }
      }
    }
  }

  const manifests = await runManifests(logRoot)
  const firstVerification = firstReview ? verificationCounts(firstReview) : verificationCounts(initialReview)
  const finalVerification = finalReview ? verificationCounts(finalReview) : verificationCounts(initialReview)
  const firstTargetDimensionCount = firstReview?.findings.filter(finding => (
    finding.status === 'active'
    && finding.dimension === 'repetition'
    && ['hard_block', 'revision_candidate'].includes(finding.severity)
  )).length || 0
  const finalTargetDimensionCount = finalReview?.findings.filter(finding => (
    finding.status === 'active'
    && finding.dimension === 'repetition'
    && ['hard_block', 'revision_candidate'].includes(finding.severity)
  )).length || 0

  summary = {
    schemaVersion: 'creator-efficacy-guided-repair-trial.v1',
    generatedAt: new Date().toISOString(),
    fixture: {
      id: 'frozen-original-three-block-repetition-v1',
      source: 'synthetic_frozen_original',
      realChapterMaterialUsed: false,
      bodyHash: sha256(frozenText),
      visibleLength: frozenLength,
      repeatedBlockOccurrenceCount: frozenText.split(repeatedParagraph).length - 1,
      rawBodyPersisted: false,
      rawEvidencePersisted: false,
      rawDiagnosisPersisted: false,
    },
    execution: {
      realWorkingAgent: true,
      runCount: 1,
      retryLimit: 1,
      deterministicInitialFinding: true,
      requestedFocusDimensions: ['repetition'],
      operationCount: manifests.length,
      operations: manifests.map(item => ({
        role: item.role,
        operation: item.operation,
        status: item.status,
        privateDataBoundary: item.privateDataBoundary,
        canonCommitAllowed: item.canonCommitAllowed,
      })),
    },
    firstRepair: {
      status: firstAttempt.status,
      reviserAttempts: firstAttempt.reviserAttempts,
      auditorDecision: firstAttempt.status === 'completed'
        ? firstAttempt.independentReview.decision
        : firstAttempt.independentReviewDecision,
      preservedFactCount: firstAttempt.status === 'completed'
        ? firstAttempt.repair.preservedFacts.length
        : firstAttempt.preservedFactCount,
      proposedDraftCreated: Boolean(firstDraft),
      proposedDraftHash: firstDraft ? sha256(draftTextFromBlocks(firstDraft.contentBlocks)) : null,
    },
    postFirstRepairReview: {
      performed: Boolean(firstReview),
      targetDimensionFindingCount: firstTargetDimensionCount,
      semanticVerificationPerformed: firstVerification.performed,
      verifiedModelFindingCount: firstVerification.verifiedFindingCount,
      rejectedModelFindingCount: firstVerification.rejectedFindingCount,
      eligibleRetryTargetFound: Boolean(retryTarget),
      retryEvidenceBlockCount: retryTarget ? 1 : 0,
    },
    efficacyGuidedRetry: {
      performed: retryStatus !== 'not_run',
      attemptCount: retryStatus === 'not_run' ? 0 : 1,
      status: retryStatus,
      auditorDecision: retryAuditorDecision,
    },
    postRetryReview: {
      performed: Boolean(finalReview),
      targetDimensionFindingCount: finalTargetDimensionCount,
      semanticVerificationPerformed: finalVerification.performed,
      verifiedModelFindingCount: finalVerification.verifiedFindingCount,
      rejectedModelFindingCount: finalVerification.rejectedFindingCount,
    },
    directionRetention: {
      reviewPerformed: directionReviewDecision !== 'not_run',
      decision: directionReviewDecision,
      receiptCreated: directionReceiptCreated,
    },
    outcome: {
      decision: retainDecision,
      finalBodyHash: sha256(draftTextFromBlocks(finalDraft.contentBlocks)),
      finalVisibleLength: countVisibleCharacters(draftTextFromBlocks(finalDraft.contentBlocks)),
      targetDimensionCleared: Boolean(finalReview) && finalTargetDimensionCount === 0,
      generalLiteraryImprovementProven: false,
    },
    boundaries: {
      authorTextOverwritten: false,
      wholeTextRewritePerformed: false,
      authorChoicePerformed: false,
      candidateAdopted: false,
      canonWritePerformed: false,
      localRepositoryWritePerformed: false,
      cloudWritePerformed: false,
      publishPerformed: false,
      chapter20ReadOrWritten: false,
      chapter21ReadOrWritten: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'This isolated frozen-original trial validates one bounded repair workflow branch, not general literary quality.',
      'A retained result means only that the same target dimension cleared and author-direction evidence passed in this run.',
      'No real chapter, author choice, candidate adoption, Canon write, repository write, cloud write, or publication was used.',
    ],
  }
} finally {
  bridge.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 100))
  if (!childOutput.exited) bridge.kill('SIGKILL')
  await rm(sandbox, { recursive: true, force: true })
}

assert.ok(summary)
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ output: path.relative(root, outputPath), summary }, null, 2))
