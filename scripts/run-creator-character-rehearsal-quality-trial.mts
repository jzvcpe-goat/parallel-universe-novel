import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  validateCharacterSimulationResult,
  type CharacterSimulationRequest,
} from '../app/src/features/creator-decision/characterSimulation'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
} from '../app/src/features/creator-decision/types'

interface SourcePayload {
  session: CreationSession
  intent: AuthorIntentContract
  context: ContextSnapshot
}

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://127.0.0.1:4318' },
    'source-prompt': { type: 'string' },
    output: { type: 'string' },
    'private-output': { type: 'string' },
  },
  strict: true,
})

function required(name: 'source-prompt' | 'output' | 'private-output') {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

function sourcePayload(prompt: string) {
  const marker = '当前资料：'
  const markerIndex = prompt.lastIndexOf(marker)
  assert.notEqual(markerIndex, -1)
  return JSON.parse(prompt.slice(markerIndex + marker.length).trim()) as SourcePayload
}

async function postLongRunningJson(url: string, payload: unknown) {
  const body = JSON.stringify(payload)
  return new Promise<{ ok: boolean; statusCode: number; body: unknown }>((resolveRequest, rejectRequest) => {
    const request = httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8')
        try {
          resolveRequest({
            ok: (response.statusCode ?? 500) >= 200 && (response.statusCode ?? 500) < 300,
            statusCode: response.statusCode ?? 500,
            body: JSON.parse(rawBody),
          })
        } catch (error) {
          rejectRequest(new Error(`Character rehearsal returned invalid JSON (${response.statusCode ?? 500}): ${rawBody}`, { cause: error }))
        }
      })
    })
    request.on('error', rejectRequest)
    request.end(body)
  })
}

const prompt = await readFile(resolve(required('source-prompt')), 'utf8')
const source = sourcePayload(prompt)
const semanticRevisionWarning = '候选已根据独立审校意见完成一次语义收缩；仍需作者确认。'
assert.match(source.session.chapterId, /:chapter:20$/)
const protagonist = source.context.activeCharacters[0]
assert.ok(protagonist, 'Chapter 20 must retain the selected protagonist card.')

const request: CharacterSimulationRequest = {
  schemaVersion: 'character-simulation-request.v1',
  requestId: `chapter-20-character-rehearsal:${randomUUID()}`,
  sessionId: source.session.id,
  workId: source.session.workId,
  chapterId: source.session.chapterId,
  contextSnapshotId: source.context.id,
  scenario: '第三目的地木条仍可能被继续辨认，但牵索偏载已经威胁学徒、货车和公开路线板。陆沉舟不能越线，只能用机械判断说服贺岚放弃木条并按受力顺序调度。请短暂排练两人对证据损失、现场权威和责任归属的冲突与选择。',
  rounds: 1,
  authorConfirmedExport: true,
  characters: [{
    id: protagonist.id,
    name: '陆沉舟',
    summary: protagonist.goal,
    state: {
      physicalCondition: '左膝夹板未拆，不能奔跑或战斗。',
      limitations: ['不能越过警戒线', '不能触摸木牌或打开货箱', '现场命令必须由贺岚或穆笙作出'],
      currentIntent: '在不越权的前提下报告受力顺序，先救人和保住路线板。',
      knowledge: '只能依据可见机械受力与公开编号判断，不能把游戏记忆当答案。',
    },
  }, {
    id: 'chapter-20-scene-character:he-lan',
    name: '贺岚',
    summary: '赫顿玛尔南门临时救济转运场看守，掌握木牌、公开路线板和现场调度权；必须在封场前保住人员、路线板与合规证据。',
    state: {
      currentIntent: '维持现场指挥权，在封场前完成合法核验并控制险情。',
      obligations: ['保护学徒与公开路线板', '只记录公开核验能够证明的事实'],
      relationshipStances: '认可陆沉舟的机械判断，但不允许他越过警戒线或代替现场指挥。',
      limitations: ['不能把转运序号直接写成第三目的地', '不能以救险为由扩大陆沉舟权限'],
    },
  }],
  settingFacts: [
    '同一混装批次已经依法确认进入南门临时救济转运场，并在此拆成三个救济去向。',
    '第三目的地木条已经风化，只剩转运序号；序号不是目的地结论。',
    '转运场仍在南门内侧受控公共区，本次核验不构成出城许可。',
  ],
  hardConstraints: [
    '排练不写小说正文，不决定正史，不新增人物经历、创伤、秘密或世界设定。',
    '陆沉舟不能越线、触摸木牌、打开货箱、奔跑或战斗。',
    '贺岚保留现场指挥权；陆沉舟只能报告可见的机械受力与编号位置。',
    '藤精只是受惊护巢，与旧批次、铜垫圈和九年前调度无关。',
  ],
}

const baseUrl = values['base-url']!.replace(/\/$/, '')
const healthResponse = await fetch(`${baseUrl}/health`)
assert.equal(healthResponse.ok, true)
const health = await healthResponse.json() as {
  characterSimulation?: { configured?: boolean; canonCommitAllowed?: boolean }
}
assert.equal(health.characterSimulation?.configured, true, 'MiroFish must be configured for a real rehearsal run.')
assert.equal(health.characterSimulation?.canonCommitAllowed, false)

const response = await postLongRunningJson(`${baseUrl}/v1/character-simulation`, { request })
const raw = response.body
assert.equal(response.ok, true, `Character rehearsal failed (${response.statusCode}): ${JSON.stringify(raw)}`)
const result = validateCharacterSimulationResult(request, raw)

const privateOutputPath = resolve(required('private-output'))
await mkdir(dirname(privateOutputPath), { recursive: true })
await writeFile(privateOutputPath, `${JSON.stringify({ request, result }, null, 2)}\n`, 'utf8')

const evidenceById = new Map(result.evidence.map(item => [item.id, item]))
const allProposalEvidenceIsDirectInterview = [
  ...result.characterCardProposals.flatMap(proposal => proposal.evidenceIds),
  ...result.characterCardProposals.flatMap(proposal => proposal.stateChanges.flatMap(change => change.evidenceIds)),
  ...result.settingAssetProposals.flatMap(proposal => proposal.evidenceIds),
].every(evidenceId => evidenceById.get(evidenceId)?.sourceArtifact === 'interviews')
const summary = {
  schemaVersion: 'creator-character-rehearsal-quality-trial.v1',
  completedAt: new Date().toISOString(),
  chapter: 20,
  provider: result.provider,
  simulationRunId: result.simulationRunId,
  sourcePromptSha256: sha256(prompt),
  request: {
    rounds: request.rounds,
    selectedCharacterIds: request.characters.map(character => character.id),
    selectedCharacterNames: request.characters.map(character => character.name),
    authorConfirmedExport: request.authorConfirmedExport,
    manuscriptBodyIncluded: false,
    lockedIntentAndContextOnly: true,
  },
  result: {
    evidenceCount: result.evidence.length,
    directInterviewEvidenceCount: result.evidence.filter(item => item.sourceArtifact === 'interviews').length,
    characterCardProposalCount: result.characterCardProposals.length,
    settingAssetProposalCount: result.settingAssetProposals.length,
    proposedCharacterIds: result.characterCardProposals.map(item => item.characterId),
    proposedStateDimensions: result.characterCardProposals.flatMap(item => item.stateChanges.map(change => change.dimension)),
    warningCount: result.warnings.length,
    boundedSemanticRevisionApplied: result.warnings.includes(semanticRevisionWarning),
    allProposalEvidenceIsDirectInterview,
    resultSha256: sha256(JSON.stringify(result)),
  },
  reviewBoundary: {
    pipeline: ['MiroFish', 'Reflector', 'Auditor'],
    resultReachedAuthorCandidateBoundary: true,
    cardSavePerformed: false,
    settingSavePerformed: false,
    canonCommitPerformed: false,
  },
  sideEffects: {
    repositoryWritePerformed: false,
    acceptedChapterChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  privateArtifactSha256: sha256(await readFile(privateOutputPath)),
  containsManuscriptText: false,
}
const outputPath = resolve(required('output'))
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
