#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const root = process.cwd()
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'validation/creator-ui/author-direction-prose-real-trial-2026-07-16/summary.json',
    },
    model: { type: 'string' },
  },
  strict: true,
})

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function countVisibleCharacters(value) {
  return Array.from(value).filter(character => !/\s/u.test(character)).length
}

function hasCompleteSceneEnding(value) {
  const trimmed = value.trim()
  if (!trimmed) return false
  const pairs = [['“', '”'], ['‘', '’'], ['「', '」'], ['『', '』'], ['（', '）'], ['(', ')'], ['【', '】'], ['[', ']']]
  const balanced = pairs.every(([opening, closing]) => (
    Array.from(trimmed).filter(character => character === opening).length
      === Array.from(trimmed).filter(character => character === closing).length
  ))
  const withoutTrailingClosers = trimmed.replace(/[”’」』）》）\]}]+$/u, '').trimEnd()
  return balanced && /[。！？!?…]$/u.test(withoutTrailingClosers)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(error => error ? reject(error) : resolve(port))
    })
  })
}

async function waitForHealth(url, childOutput) {
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

async function findNamedFiles(directory, targetName) {
  const found = []
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

async function readRunRecords(logRoot) {
  const manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  const records = []
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    let output = null
    try {
      output = JSON.parse(await readFile(path.join(path.dirname(manifestPath), 'response.json'), 'utf8'))
    } catch {
      // Failed role calls may not have a structured response.
    }
    records.push({ manifest, output })
  }
  return records.sort((left, right) => (
    left.manifest.pipelineId.localeCompare(right.manifest.pipelineId)
      || left.manifest.sequence - right.manifest.sequence
  ))
}

function frozenPayload() {
  const characterState = {
    location: '潮汐矿港的旧升降台',
    timePosition: '风暴到港前一小时',
    physicalCondition: '左掌有旧伤，不能持续攀抓',
    emotionalState: '克制而警觉',
    dominantDesire: '让同行者活着离开矿港',
    immediateGoal: '换到唯一可用的升降机配重芯',
    currentIntent: '不暴露密封匣真实用途的前提下完成交易',
    fear: '再次因独断失去同伴',
    woundTrigger: '听见锁链突然绷紧时会想起旧事故',
    defenseStrategy: '先把风险拆成可分配的小动作',
    beliefs: ['港务行会只认等价交换，不接受空头承诺'],
    falseBeliefs: ['临时搭档只会在有利可图时留下'],
    knowledge: ['知道配重芯能让升降机完成一次下降', '不知道商贩为何急于离港'],
    secrets: ['密封匣内保存着会改变队伍路线的残缺航图'],
    resources: ['一枚旧航标', '半卷耐盐绳', '可用一次的应急火种'],
    capabilities: ['能辨认矿港旧式机械', '擅长在压力下拆分任务'],
    limitations: ['左掌不能持续负重', '不能确认航图终点'],
    relationshipStances: ['对同行者黎芜保持合作但不完全信任'],
    trust: '愿意交付局部职责，不愿交出密封匣',
    obligations: ['欠港口商贩一次明确可兑现的协助'],
    recentChoice: '上一场拒绝交出密封匣以换取通行证明',
    paidCost: '因此失去官方升降许可，只剩旧升降台可用',
  }
  const selectedDirection = {
    id: 'option:frozen-resource-negotiation',
    label: '资源协商与职责交付',
    primaryChangedAxis: 'pressureSource',
    proposedAdjustment: '让稀缺的配重芯成为现场压力；主角通过协商把关键操作交给黎芜，并亲自承担一项未来必须兑现的港口义务，关系因此发生可见变化。',
    preservedAuthorIntent: ['保留密封匣秘密', '保留离港倒计时', '保留主角左掌旧伤'],
    addressesIssueCodes: ['causal_chain_repetition'],
    whyItBreaksRepetition: '本场不再依靠制度核验与拒绝推进，而以稀缺资源、协商、职责交付和义务代价改变关系。',
    expectedMechanismSignature: {
      pressureSource: 'resource',
      conflictEngine: 'negotiation',
      agencyPattern: 'delegation',
      costPattern: 'obligation',
      endingPattern: 'relationship_shift',
    },
    tradeoff: '动作规模受控，但人物之间的信任与欠债成为场景中心。',
    decisionId: 'scene-author-decision:frozen-trial',
    pipelineId: 'pipeline:frozen-trial',
    selectedAt: '2026-07-16T00:00:00.000Z',
  }
  return {
    fixture: 'real-author-direction-prose-trial-v1',
    session: {
      id: 'session:frozen-author-direction-trial',
      workId: 'work:frozen-original-world',
      branchId: 'branch:main',
      chapterId: 'chapter:frozen-scene',
      sceneId: 'scene:old-lift-negotiation',
      baseCanonRevision: 3,
    },
    intent: {
      id: 'intent:frozen-author-direction-trial',
      sessionId: 'session:frozen-author-direction-trial',
      revision: 2,
      status: 'locked',
      premise: '风暴封港前，失去官方许可的队伍必须从旧升降台下到矿层。',
      desiredReaderExperience: '紧迫、克制，并在一次具体分工中感到关系发生变化。',
      coreChoice: '主角是否愿意把关键操作交给尚未完全信任的同行者。',
      hardConstraints: ['只写旧升降台这一场', '密封匣内容不能揭晓', '不能凭空获得第二枚配重芯'],
      mustInclude: ['配重芯交易', '主角明确交付关键职责', '未来义务当场成立', '关系变化在行动中可见'],
      mustNotResolve: ['密封匣内航图终点', '港口商贩急于离港的真正原因'],
      informationPolicy: {
        charactersMustNotKnow: ['黎芜不知道密封匣里是航图', '主角不知道商贩真正动机'],
      },
      sceneMechanismDirection: selectedDirection,
    },
    candidate: {
      id: 'candidate:frozen-resource-negotiation',
      title: '把下降交给她',
      oneSentenceMechanism: '主角用可兑现义务换取配重芯，并把危险的校准动作交给黎芜。',
      mechanismSignature: selectedDirection.expectedMechanismSignature,
      strategyAxes: {
        conflictMode: 'negotiation',
        informationMode: 'partial_reveal',
        agencyOwnerId: 'character:protagonist',
        costType: 'obligation',
        pacing: 'balanced',
        viewpointId: 'character:protagonist',
      },
      beats: [
        '旧升降台只缺一枚配重芯，风暴倒计时迫近。',
        '商贩拒绝用普通物资交换，要求一个可兑现的未来协助。',
        '黎芜提出由她完成危险校准，迫使主角决定是否交付职责。',
        '主角接受义务并公开分工，配重芯安装却暴露左掌旧伤的限制。',
        '升降机开始下降；黎芜不再只是临时搭档，而成为掌握队伍退路的人。',
      ],
    },
    context: {
      activeCharacters: [
        {
          id: 'character:protagonist',
          name: '陆沉舟',
          goal: '带队从旧升降台下到矿层',
          belief: characterState.beliefs,
          knowledge: characterState.knowledge,
          falseBeliefs: characterState.falseBeliefs,
          emotionalState: characterState.emotionalState,
          resources: characterState.resources,
          state: characterState,
        },
        {
          id: 'character:liwu',
          name: '黎芜',
          goal: '证明自己不是随时会离队的临时搭档',
          belief: ['职责必须伴随真实权限'],
          knowledge: ['知道旧升降台的校准步骤', '不知道密封匣内容'],
          falseBeliefs: ['陆沉舟永远不会把关键动作交给别人'],
          emotionalState: '不耐烦中带着受伤的自尊',
          resources: ['一把细齿校准钳'],
          state: {
            ...characterState,
            dominantDesire: '获得与风险相称的信任',
            immediateGoal: '接手配重芯校准',
            currentIntent: '迫使陆沉舟公开交付职责而非口头安抚',
            knowledge: ['知道旧升降台的校准步骤', '不知道密封匣内容'],
            falseBeliefs: ['陆沉舟永远不会把关键动作交给别人'],
            resources: ['一把细齿校准钳'],
            obligations: [],
          },
        },
      ],
      recentSceneSummaries: [{
        sceneId: 'scene:permit-refusal',
        summary: '历史快照：上一场中，港务人员要求检查密封匣才发放许可；陆沉舟拒绝，失去官方升降许可，队伍只能转向旧升降台。',
        relevanceReason: '作者手动选择的直接因果前置；只约束本场开场处境。',
        mechanismSignature: {
          pressureSource: 'institution',
          conflictEngine: 'investigation',
          agencyPattern: 'refusal',
          costPattern: 'opportunity_loss',
          endingPattern: 'question_opened',
        },
      }],
      manualRecallItems: [
        {
          id: 'recall:frozen-causal',
          sourceId: 'canon:frozen-previous-scene',
          sourceRevision: 3,
          authority: 'canon',
          group: 'causal',
          statement: '正史：陆沉舟因拒绝检查密封匣而失去官方升降许可，风暴到港前只能使用旧升降台。',
          sourceLabel: '上一场已确认收尾',
          whyNow: '该后果必须成为本场开场压力，不能被新许可或巧合取消。',
          locator: { kind: 'canon', targetId: 'canon:frozen-previous-scene', label: '冻结夹具上一场收尾' },
        },
        {
          id: 'recall:frozen-character-knowledge',
          sourceId: 'asset:frozen-liwu-knowledge',
          sourceRevision: 1,
          authority: 'author',
          group: 'character_knowledge',
          statement: '黎芜知道旧升降台的校准步骤，但不知道密封匣内保存的是航图。',
          sourceLabel: '冻结人物卡',
          whyNow: '约束职责交付与对话中的信息边界。',
          locator: { kind: 'asset', targetId: 'asset:frozen-liwu-knowledge', label: '冻结人物卡知识项' },
        },
        {
          id: 'recall:frozen-timeline',
          sourceId: 'canon:frozen-timeline',
          sourceRevision: 1,
          authority: 'canon',
          group: 'timeline',
          statement: '当前时间是风暴到港前一小时，地点始终在潮汐矿港旧升降台。',
          sourceLabel: '冻结时空锚点',
          whyNow: '防止场景跳时跳地或越过倒计时压力。',
          locator: { kind: 'canon', targetId: 'canon:frozen-timeline', label: '冻结时空锚点' },
        },
      ],
      styleSamples: [],
    },
    request: {
      sessionId: 'session:frozen-author-direction-trial',
      intentRevision: 2,
      candidateRevision: 1,
      baseCanonRevision: 3,
      baseDraftRevision: 0,
      writingMode: 'new_scene',
      scope: { type: 'scene', sceneId: 'scene:old-lift-negotiation' },
      targetLength: { minimum: 2700, maximum: 3400 },
      protectedBlockIds: [],
    },
    currentBlocks: [],
  }
}

function redactedReview(review, draftBody) {
  if (!review) return null
  return {
    schemaVersion: review.schemaVersion,
    decision: review.decision,
    axisChecks: (review.axisChecks || []).map(check => ({
      axis: check.axis,
      expectedValue: check.expectedValue,
      decision: check.decision,
      evidenceQuoteSha256: typeof check.evidenceQuote === 'string' ? sha256(check.evidenceQuote) : null,
      evidenceQuoteLength: typeof check.evidenceQuote === 'string' ? countVisibleCharacters(check.evidenceQuote) : 0,
      evidenceLocatable: typeof check.evidenceQuote === 'string' ? draftBody.includes(check.evidenceQuote) : check.evidenceQuote === null,
    })),
    proposedAdjustmentCheck: {
      decision: review.proposedAdjustmentCheck?.decision,
      evidence: (review.proposedAdjustmentCheck?.evidenceQuotes || []).map(quote => ({
        sha256: sha256(quote),
        visibleLength: countVisibleCharacters(quote),
        locatable: draftBody.includes(quote),
      })),
    },
    compositeLiteraryScoreUsed: false,
  }
}

const outputPath = path.resolve(root, values.output)
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-real-author-direction-trial-'))
const logRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
const payload = frozenPayload()
const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const childOutput = { stdout: '', stderr: '', exited: false }
const bridge = spawn(process.execPath, ['scripts/creator-working-agent-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    TMPDIR: sandbox,
    PUF_CREATOR_WORKING_AGENT_PORT: String(port),
    ...(values.model ? { PUF_CREATOR_WORKING_AGENT_MODEL: values.model } : {}),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
bridge.stdout.on('data', chunk => { childOutput.stdout += chunk.toString() })
bridge.stderr.on('data', chunk => { childOutput.stderr += chunk.toString() })
bridge.on('exit', () => { childOutput.exited = true })

let summary
try {
  const health = await waitForHealth(`${baseUrl}/health`, childOutput)
  assert.equal(health.status, 'ready')
  assert.equal(health.privateDraftsRemainLocal, true)
  assert.ok(health.operations.includes('scene_draft'))

  const response = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'scene_draft', attempt: 'initial', payload }),
  })
  const responsePayload = JSON.parse(await response.text())
  const records = await readRunRecords(logRoot)
  assert.ok(records.length > 0, 'The real trial must produce Working Agent run manifests.')
  assert.ok(records.every(record => record.manifest.canonCommitAllowed === false))
  const writerRecord = records.find(record => record.manifest.role === 'Writer' && record.manifest.operation === 'scene_draft')
  const reviewRecords = records.filter(record => (
    record.manifest.role === 'Auditor'
      && record.manifest.operation.startsWith('scene_author_direction_draft_review')
  ))
  const latestReview = reviewRecords.at(-1)?.output || responsePayload.review || null
  const draftBody = typeof writerRecord?.output?.body === 'string'
    ? writerRecord.output.body
    : typeof responsePayload.body === 'string'
      ? responsePayload.body
      : ''
  const status = response.status === 200
    ? 'passed'
    : response.status === 422 && responsePayload.error === 'scene_draft_alignment_rejected'
      ? 'author_direction_rejected'
      : 'runtime_failed'

  summary = {
    schemaVersion: 'creator-author-direction-prose-real-trial.v1',
    trialId: `author-direction-prose-${randomUUID()}`,
    completedAt: new Date().toISOString(),
    status,
    httpStatus: response.status,
    fixture: {
      id: payload.fixture,
      source: 'frozen_original_single_scene',
      inputSha256: sha256(JSON.stringify(payload)),
      realWorkingAgent: true,
      modelOverride: values.model || null,
      realChapterMaterialUsed: false,
    },
    draft: {
      generated: Boolean(draftBody),
      visibleCharacterCount: draftBody ? countVisibleCharacters(draftBody) : 0,
      targetMinimum: payload.request.targetLength.minimum,
      targetMaximum: payload.request.targetLength.maximum,
      targetLengthPassed: draftBody
        ? countVisibleCharacters(draftBody) >= payload.request.targetLength.minimum
          && countVisibleCharacters(draftBody) <= payload.request.targetLength.maximum
        : false,
      completeSceneEnding: draftBody ? hasCompleteSceneEnding(draftBody) : false,
      bodySha256: draftBody ? sha256(draftBody) : null,
      bodyPersistedInRepository: false,
    },
    authorDirectionReview: redactedReview(latestReview, draftBody),
    runtime: {
      roleCallCount: records.length,
      pipelineCount: new Set(records.map(record => record.manifest.pipelineId)).size,
      sequence: records.map(record => ({
        sequence: record.manifest.sequence,
        role: record.manifest.role,
        operation: record.manifest.operation,
        status: record.manifest.status,
        privateDataBoundary: record.manifest.privateDataBoundary,
        canonCommitAllowed: record.manifest.canonCommitAllowed,
      })),
      writerCallCount: records.filter(record => record.manifest.role === 'Writer').length,
      proseAuditorCallCount: reviewRecords.length,
      bridgeErrorCode: response.ok ? null : responsePayload.error || 'unknown',
      bridgeErrorDetail: response.ok ? null : responsePayload.detail || null,
    },
    boundaries: {
      repositoryWritePerformed: false,
      canonCommitPerformed: false,
      authorSelectionPerformed: false,
      publicationPerformed: false,
      cloudDataChanged: false,
      chapter20AccessedOrChanged: false,
      chapter21AccessedOrChanged: false,
      rawPromptPersistedInRepository: false,
      rawDraftPersistedInRepository: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'This is one real Working Agent run over a frozen original scene, not a real user study or multi-model comparison.',
      'A pass proves this run met the declared author-direction and evidence-location gates; it does not prove general literary quality.',
      'A rejection is retained as valid fail-closed evidence and does not trigger a second Writer or whole-scene rewrite.',
      'The repository stores only hashes, counts, role order and gate decisions; raw prompts and prose remain temporary.',
    ],
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
  if (!['passed', 'author_direction_rejected'].includes(status)) process.exitCode = 1
} finally {
  if (!bridge.killed) bridge.kill('SIGTERM')
  await rm(sandbox, { recursive: true, force: true })
}
