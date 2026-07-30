#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()

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
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (childOutput.exited) throw new Error(`working-agent bridge exited early:\n${childOutput.stderr}`)
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
    } catch {
      // The local bridge may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error(`working-agent bridge did not become ready:\n${childOutput.stderr}`)
}

async function findNamedFiles(directory, targetName) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findNamedFiles(absolute, targetName))
    if (entry.isFile() && entry.name === targetName) found.push(absolute)
  }
  return found
}

const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-role-pipeline-'))
const binDirectory = path.join(sandbox, 'bin')
const fakeCodexPath = path.join(binDirectory, 'codex')
await import('node:fs/promises').then(({ mkdir }) => mkdir(binDirectory, { recursive: true }))
await writeFile(fakeCodexPath, `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
const args = process.argv.slice(2)
const schemaPath = args[args.indexOf('--output-schema') + 1]
const outputPath = args[args.indexOf('-o') + 1]
let prompt = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { prompt += chunk })
process.stdin.on('end', () => {
  let output
  if (schemaPath.endsWith('candidate-search.schema.json')) {
    const mechanisms = [
      {
        title: '断索协商',
        pressureSource: 'resource',
        conflictEngine: 'negotiation',
        agencyPattern: 'bargain',
        costPattern: 'obligation',
        endingPattern: 'relationship_shift',
        conflictMode: 'misalignment',
        informationMode: 'partial_reveal',
        pacing: 'balanced',
      },
      {
        title: '带伤撤离',
        pressureSource: 'body',
        conflictEngine: 'escape',
        agencyPattern: 'withdrawal',
        costPattern: 'separation',
        endingPattern: 'location_shift',
        conflictMode: 'sacrifice',
        informationMode: 'delayed_reveal',
        pacing: 'compressed',
      },
      {
        title: '误信反制',
        pressureSource: 'information',
        conflictEngine: 'revelation',
        agencyPattern: 'concealment',
        costPattern: 'exposure',
        endingPattern: 'question_opened',
        conflictMode: 'reversal',
        informationMode: 'false_belief',
        pacing: 'slow_burn',
      },
    ]
    output = {
      schemaVersion: 'creator-candidate-search.v1',
      candidates: mechanisms.map((mechanism, index) => ({
        title: mechanism.title,
        oneSentenceMechanism: '主角依据手选角色的有限所知行动，并让该选择在现场形成不同代价。',
        mechanismSignature: {
          pressureSource: mechanism.pressureSource,
          conflictEngine: mechanism.conflictEngine,
          agencyPattern: mechanism.agencyPattern,
          costPattern: mechanism.costPattern,
          endingPattern: mechanism.endingPattern,
        },
        conflictMode: mechanism.conflictMode,
        informationMode: mechanism.informationMode,
        pacing: mechanism.pacing,
        costType: '主角必须承担一项可见且无法立即撤销的现场代价。',
        beats: [0, 1, 2].map(beat => ({
          purpose: '推进当前场景目标',
          action: '主角依据现场证据采取一项可以观察的具体行动。',
          resistance: '人物有限所知和现场阻力让行动不能按原计划完成。',
          consequence: '人物选择改变了下一步可用动作并产生当前路径的代价。',
          informationChange: beat === 2 ? '人物只确认当前证据能够支持的有限事实。' : null,
        })),
        strengths: ['人物知识边界直接参与冲突'],
        risks: ['有限所知可能让人物付出额外代价'],
        clicheRisks: [],
        uncertainties: ['仍不能确认主索异常的真实来源'],
        irreversibleChanges: ['当前选择改变同伴之间的责任分配'],
        promisesCreated: [],
        futureDebts: ['本章代价必须在下一场继续施压'],
        characterCosts: ['主角承担新的现场义务'],
        assessment: {
          intentFit: 5,
          characterAgency: 4 + (index % 2),
          tensionPotential: 4,
          informationControl: 5,
          continuitySafety: 5,
          freshness: 3 + index,
          futureDebtFitness: 4,
        },
      })),
    }
  } else if (schemaPath.endsWith('scene-architecture.schema.json')) {
    const isMechanismRevision = prompt.includes('previousSceneArchitecture')
    const needsDensityRevision = prompt.includes('role-pipeline-author-direction-density')
      && !isMechanismRevision
    const isSemanticRevision = isMechanismRevision && (
      prompt.includes('role-pipeline-semantic-rejection')
      || prompt.includes('role-pipeline-fail-closed')
      || prompt.includes('role-pipeline-information-control-revision')
      || prompt.includes('role-pipeline-execution-quality-revision')
      || prompt.includes('role-pipeline-review-evidence-repair')
      || prompt.includes('role-pipeline-review-evidence-semantic-mutation')
      || prompt.includes('role-pipeline-review-evidence-persistent-invalid')
    )
    const isInformationControlFixture = prompt.includes('role-pipeline-information-control-revision')
    const isInformationControlRevision = isMechanismRevision && isInformationControlFixture
    const forceDeterministicRepeat = isMechanismRevision
      && (
        prompt.includes('role-pipeline-deterministic-fail-closed')
        || prompt.includes('role-pipeline-decision-option-unknown-issue')
        || prompt.includes('role-pipeline-decision-option-persistent-unknown-issue')
      )
    const honorAuthorDirection = isMechanismRevision
      && prompt.includes('role-pipeline-author-direction')
      && !prompt.includes('role-pipeline-author-direction-fail-closed')
    output = {
      schemaVersion: 'creator-scene-architecture.v1',
      sceneObjective: '让主角在现场压力下完成一次有代价的选择。',
      mechanismSignature: {
        pressureSource: honorAuthorDirection ? 'resource' : isSemanticRevision ? 'body' : isMechanismRevision && !forceDeterministicRepeat ? 'institution' : 'opponent',
        conflictEngine: honorAuthorDirection ? 'negotiation' : isSemanticRevision ? 'escape' : isMechanismRevision && !forceDeterministicRepeat ? 'investigation' : 'combat',
        agencyPattern: honorAuthorDirection ? 'delegation' : isSemanticRevision ? 'withdrawal' : isMechanismRevision && !forceDeterministicRepeat ? 'refusal' : 'improvisation',
        costPattern: honorAuthorDirection ? 'obligation' : isSemanticRevision ? 'separation' : isMechanismRevision && !forceDeterministicRepeat ? 'opportunity_loss' : 'injury',
        endingPattern: honorAuthorDirection ? 'relationship_shift' : isSemanticRevision ? 'location_shift' : isMechanismRevision && !forceDeterministicRepeat ? 'question_opened' : 'opponent_gain',
        differentiationEvidence: [
          '上一场依靠制度核验，本场由对手主动施压。',
          '上一场以机会损失收束，本场让对手取得现场优势。',
        ],
      },
      causalChain: Array.from({ length: needsDensityRevision ? 6 : 4 }, (_, index) => ({
        order: index + 1,
        purpose: '推进当前场景因果',
        action: '主角根据眼前证据采取一个可观察行动。',
        resistance: '环境和对手让该行动付出即时成本。',
        choice: '主角在两个有损选项之间明确作出选择。',
        consequence: '选择改变现场处境并约束下一步行动。',
        informationChange: index === 3 ? '主角只确认有限的新事实。' : null,
      })),
      informationBoundary: {
        observableEvidence: ['主角在门面上看见一道被灼黑的新划痕。'],
        allowedInference: isInformationControlFixture && !isInformationControlRevision
          ? '主角可以确认门后的力量来自敌对施术者，并正针对自己。'
          : '主角只能确认门后刚有高温力量活动过。',
        withheldInference: isInformationControlFixture && !isInformationControlRevision
          ? '主角只是不知道施术者的姓名。'
          : '主角仍不能确认力量来源、操作者身份或真实目的。',
        deliveryMode: 'action_first',
      },
      recallObligations: [],
      characterPressure: [{
        characterId: 'character:test',
        currentGoal: '完成当前现场目标',
        pressure: '环境阻力持续升级',
        choiceCost: '必须失去一项当前资源',
        knowledgeBoundary: '只能依据现场可观察证据判断',
      }],
      repetitionAvoidance: ['不使用突然收到下一站坐标作为结尾'],
      sensoryAnchors: ['金属摩擦声', '潮湿石面的冷意'],
      endingObligation: {
        arrivingConsequence: '主角的资源损失在场景结束前真实发生。',
        unresolvedPressure: '损失使下一步行动变得更困难。',
        forbiddenShortcut: '不能用旁人派发新任务代替本场后果。',
      },
    }
  } else if (schemaPath.endsWith('scene-architecture-review.schema.json')) {
    const baseEvidenceRepairScenario = prompt.includes('role-pipeline-review-evidence-repair')
      || prompt.includes('role-pipeline-review-evidence-semantic-mutation')
      || prompt.includes('role-pipeline-review-evidence-persistent-invalid')
    const informationEvidenceRepairScenario = prompt.includes('role-pipeline-review-information-evidence-repair')
      || prompt.includes('role-pipeline-review-information-evidence-semantic-mutation')
      || prompt.includes('role-pipeline-review-information-evidence-persistent-invalid')
    const evidenceRepairScenario = baseEvidenceRepairScenario || informationEvidenceRepairScenario
    const evidenceRepairFixture = evidenceRepairScenario && prompt.includes('"mode": "initial"')
    const evidenceRepairRequest = evidenceRepairFixture && prompt.includes('"invalidReview"')
    const invalidEvidence = baseEvidenceRepairScenario && evidenceRepairFixture && (
      !evidenceRepairRequest || prompt.includes('role-pipeline-review-evidence-persistent-invalid')
    )
    const mutateEvidenceRepairSemantics = evidenceRepairRequest
      && prompt.includes('role-pipeline-review-evidence-semantic-mutation')
    const invalidInformationEvidence = informationEvidenceRepairScenario && evidenceRepairFixture && (
      !evidenceRepairRequest || prompt.includes('role-pipeline-review-information-evidence-persistent-invalid')
    )
    const mutateInformationEvidenceRepairSemantics = evidenceRepairRequest
      && prompt.includes('role-pipeline-review-information-evidence-semantic-mutation')
    const forceAuthorDecision = prompt.includes('role-pipeline-fail-closed')
      || prompt.includes('role-pipeline-deterministic-fail-closed')
      || prompt.includes('role-pipeline-decision-option-unknown-issue')
      || prompt.includes('role-pipeline-decision-option-persistent-unknown-issue')
    const rejectSemanticRelabel = prompt.includes('role-pipeline-semantic-rejection')
      && prompt.includes('"mode": "initial"')
    const rejectInformationControl = prompt.includes('role-pipeline-information-control-revision')
      && prompt.includes('"mode": "initial"')
    const rejectExecutionQuality = prompt.includes('role-pipeline-execution-quality-revision')
      && prompt.includes('"mode": "initial"')
    const rejectMechanismReview = forceAuthorDecision
      || rejectSemanticRelabel
      || (baseEvidenceRepairScenario && evidenceRepairFixture)
    const rejectReview = rejectMechanismReview || rejectInformationControl || rejectExecutionQuality
    output = {
      schemaVersion: 'creator-scene-architecture-review.v1',
      decision: mutateEvidenceRepairSemantics ? 'pass' : rejectReview ? 'reject' : 'pass',
      verifiedDifferentiationAxes: rejectMechanismReview
        ? ['pressureSource', 'agencyPattern']
        : ['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern'],
      informationControlCheck: {
        decision: rejectInformationControl ? 'reject' : 'pass',
        observableEvidence: invalidInformationEvidence
          ? '主角注意到门面上似乎留有新的灼烧痕迹。'
          : '主角在门面上看见一道被灼黑的新划痕。',
        allowedInference: rejectInformationControl
          ? '主角可以确认门后的力量来自敌对施术者，并正针对自己。'
          : invalidInformationEvidence
          ? '主角据此判断门后不久前出现过高温力量。'
          : '主角只能确认门后刚有高温力量活动过。',
        withheldInference: rejectInformationControl
          ? '主角只是不知道施术者的姓名。'
          : invalidInformationEvidence
          ? '力量的来源、操作者和目的依旧无法确认。'
          : '主角仍不能确认力量来源、操作者身份或真实目的。',
        diagnosis: mutateInformationEvidenceRepairSemantics
          ? '修复引用时擅自改变了原审阅诊断，这一语义变化必须被门禁拒绝。'
          : rejectInformationControl
          ? '灼痕只能证明高温力量活动过，不能证明操作者敌意、身份或目标。'
          : '现场证据只支持有限结论，力量来源、操作者与目的仍保持未知。',
      },
      executionQualityChecks: [
        {
          dimension: 'causal_escalation',
          decision: rejectExecutionQuality ? 'reject' : 'pass',
          architectureEvidence: [invalidEvidence
            ? '不存在的因果升级证据'
            : '选择改变现场处境并约束下一步行动。'],
          diagnosis: rejectExecutionQuality
            ? '因果链只声称处境变化，没有让局部成功制造更窄的新问题，必须受限重构。'
            : '前一拍后果真实收窄下一拍动作，局部成功会制造新的现场阻力。',
        },
        {
          dimension: 'embodied_action',
          decision: 'pass',
          architectureEvidence: ['主角根据眼前证据采取一个可观察行动。'],
          diagnosis: '转折由人物动作、物件或现场环境的可观察变化推进。',
        },
        {
          dimension: 'choice_consequence',
          decision: 'pass',
          architectureEvidence: ['主角的资源损失在场景结束前真实发生。'],
          diagnosis: '人物选择造成的资源变化在本场到达，不是只用总结说明。',
        },
      ],
      issues: baseEvidenceRepairScenario && evidenceRepairFixture ? [{
        code: 'signature_mismatch',
        axis: 'pressureSource',
        architectureEvidence: invalidEvidence
          ? '不存在的场景骨架证据'
          : '让主角在现场压力下完成一次有代价的选择。',
        recentSceneEvidence: invalidEvidence
          ? '不存在的近期场景证据'
          : 'pressureSource: institution',
        diagnosis: '这条模拟输出用于证明无法定位的证据会触发一次 Auditor 修复。',
      }] : rejectMechanismReview ? [{
        code: 'superficial_difference',
        axis: 'conflictEngine',
        architectureEvidence: '让主角在现场压力下完成一次有代价的选择。',
        recentSceneEvidence: prompt.includes('role-pipeline-deterministic-fail-closed')
          ? 'pressureSource: opponent'
          : 'pressureSource: institution',
        diagnosis: '签名标签虽不同，但当前因果链仍复用近期场景的主要事件拓扑，不能进入正文。',
      }] : [],
      rationale: evidenceRepairFixture
        ? '这是一份证据定位无效、等待同角色修复的模拟审校。'
        : rejectInformationControl
        ? '现场证据不足以支持敌对施术者正在针对主角的结论，必须保留未知。'
        : rejectMechanismReview
        ? '只有两个轴形成实质差异，其余标签没有得到因果链支持。'
        : '场景的主要压力、冲突发动机、人物选择、代价和结尾均与近期场景形成可定位的结构差异。',
    }
  } else if (schemaPath.endsWith('scene-author-decision-options.schema.json')) {
    const forceUnknownIssue = prompt.includes('role-pipeline-decision-option-unknown-issue')
      && !prompt.includes('semanticRevisionReason')
    const forcePersistentUnknownIssue = prompt.includes('role-pipeline-decision-option-persistent-unknown-issue')
    const addressesIssueCodes = forceUnknownIssue || forcePersistentUnknownIssue
      ? ['causal_chain_repetition']
      : ['superficial_difference']
    output = {
      schemaVersion: 'creator-scene-author-decision-options.v1',
      question: '为了让这一章不再重复上一章的救险结构，你愿意改变哪个核心创作条件？',
      options: [
        {
          id: 'change-conflict-engine',
          label: '保留线索，改成谈判',
          primaryChangedAxis: 'conflictEngine',
          proposedAdjustment: '保留核验目标和证据边界，取消机械救援，让制度阻力与现场谈判迫使主角作出交换。',
          preservedAuthorIntent: ['保留公开核验目标', '保留人物知识边界'],
          addressesIssueCodes,
          whyItBreaksRepetition: '主要事件不再由环境险情和同组救援发动，而由制度冲突与互惠交换推进。',
          expectedMechanismSignature: {
            pressureSource: 'relationship',
            conflictEngine: 'negotiation',
            agencyPattern: 'bargain',
            costPattern: 'trust_loss',
            endingPattern: 'relationship_shift',
          },
          tradeoff: '动作强度降低，但人物关系和权限张力会成为本章中心。',
        },
        {
          id: 'change-cost-and-ending',
          label: '保留核验，改成揭露',
          primaryChangedAxis: 'costPattern',
          proposedAdjustment: '保留核验和有限所得，不再毁掉证据，让主角因公开一项有限事实而暴露自身判断来源。',
          preservedAuthorIntent: ['保留有限信息推进', '保留不揭晓穿越真相'],
          addressesIssueCodes,
          whyItBreaksRepetition: '代价从调查证据永久丢失改为身份暴露，结尾落到人物能力边界变化。',
          expectedMechanismSignature: {
            pressureSource: 'information',
            conflictEngine: 'revelation',
            agencyPattern: 'concealment',
            costPattern: 'exposure',
            endingPattern: 'capability_change',
          },
          tradeoff: '必须放弃原先的木条折裂代价，改由人物身份风险承担压力。',
        },
      ],
      requiresAuthorSelection: true,
      writerInvoked: false,
      canonCommitAllowed: false,
    }
  } else if (schemaPath.endsWith('scene-author-direction-draft-review.schema.json')) {
    const rejectDraftDirection = prompt.includes('option:draft-direction-reject')
    const invalidEvidence = prompt.includes('option:draft-evidence-fail-closed')
    const axes = [
      ['pressureSource', 'resource'],
      ['conflictEngine', 'negotiation'],
      ['agencyPattern', 'delegation'],
      ['costPattern', 'obligation'],
      ['endingPattern', 'relationship_shift'],
    ]
    output = {
      schemaVersion: 'creator-scene-author-direction-draft-review.v1',
      decision: rejectDraftDirection ? 'reject' : 'pass',
      axisChecks: axes.map(([axis, expectedValue]) => ({
        axis,
        expectedValue,
        decision: rejectDraftDirection && axis === 'costPattern' ? 'reject' : 'pass',
        evidenceQuote: invalidEvidence ? '正文中不存在的伪造证据' : '林林',
        diagnosis: rejectDraftDirection && axis === 'costPattern'
          ? '正文没有让人物承担已选择的义务代价。'
          : '正文逐字证据支持作者选择的该场景机制轴。',
      })),
      proposedAdjustmentCheck: {
        decision: 'pass',
        evidenceQuotes: [invalidEvidence ? '另一条正文中不存在的伪造证据' : '林林'],
        diagnosis: '正文中可定位到作者选定的资源协商场景调整。',
      },
      rationale: rejectDraftDirection
        ? '五轴中的代价机制没有在正文中到达，候选不能返回给作者采用。'
        : '五轴方向和作者选择的调整均有正文逐字证据。',
    }
  } else if (schemaPath.endsWith('scene-length-completion.schema.json')) {
    output = {
      schemaVersion: 'creator-scene-length-completion.v1',
      appendText: '续'.repeat(450) + '。',
    }
  } else if (schemaPath.endsWith('scene-draft.schema.json')) {
    const needsRuntimeNormalization = prompt.includes('role-pipeline-author-direction-normalization')
      && !prompt.includes('当前独立角色：Normalizer')
    const needsTargetedLengthCompletion = prompt.includes('role-pipeline-author-direction-length-completion')
    const isNormalizer = prompt.includes('当前独立角色：Normalizer')
    const bodyLength = needsTargetedLengthCompletion
      ? isNormalizer ? 2550 : 2500
      : needsRuntimeNormalization ? 2600 : 2800
    output = {
      schemaVersion: 'creator-scene-draft.v1',
      body: '林'.repeat(bodyLength) + '。',
      unplannedFactProposals: [],
      stateProposals: [],
    }
  } else if (schemaPath.endsWith('state-evidence.schema.json')) {
    output = {
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [{
        path: '/characters/character:manual-secondary/knowledge',
        value: '确认后角锁扣已经松动',
        reason: '次要角色在正文中亲眼确认锁扣状态。',
        irreversible: true,
        evidenceQuote: '亲眼看见后角锁扣已经松动',
        supportingEvidenceQuotes: [],
      }],
      continuityProposals: [],
    }
  } else if (schemaPath.endsWith('state-evidence-review.schema.json')) {
    output = {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'pass',
      verifiedCharacterProposalIndexes: [0],
      verifiedContinuityProposalIndexes: [],
      issues: [],
      rationale: '人物亲眼取得的知识有正文逐字证据，角色路径和不可逆语义均正确。',
    }
  } else if (schemaPath.endsWith('local-repair.schema.json')) {
    output = {
      schemaVersion: 'creator-local-repair.v1',
      findingId: 'finding:test',
      targetBlockId: 'block:test',
      operation: 'replace_range',
      proposedContent: '主角仍在石廊战场。他压低重心避开迎面的刀锋，肩甲仍被刮出一道火星；他借着冲力撞进石柱阴影，失去了正面追击的时机。',
      preservedFacts: [
        {
          fact: '主角仍在石廊战场',
          sourceEvidenceQuote: '主角仍在石廊战场',
          candidateEvidenceQuote: '主角仍在石廊战场',
        },
        {
          fact: '闪避使主角失去追击时机',
          sourceEvidenceQuote: '错过追击',
          candidateEvidenceQuote: '失去了正面追击的时机',
        },
      ],
      rationale: '只修复动作缺少即时阻力与代价的问题，不改变人物所知和场景结果。',
    }
  } else if (schemaPath.endsWith('local-repair-review.schema.json')) {
    output = {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: 'finding:test',
      targetBlockId: 'block:test',
      decision: 'pass',
      verifiedPreservedFactIndexes: [0, 1],
      issues: [],
      rationale: '候选修复了即时阻力，同时保留人物所知、时间地点与原有场景结果。',
    }
  } else if (schemaPath.endsWith('character-simulation-review.schema.json')) {
    output = {
      schemaVersion: 'creator-character-simulation-review.v1',
      requestId: 'simulation-request:role-pipeline',
      simulationRunId: 'mirofish-run:role-pipeline',
      decision: 'pass',
      verifiedCharacterProposalIndexes: [0],
      verifiedSettingProposalIndexes: [],
      issues: [],
      rationale: '人物卡只保留直接回答能够支持的临时选择变化，并继续等待作者确认。',
    }
  } else if (schemaPath.endsWith('literary-review.schema.json')) {
    if (prompt.includes('role-pipeline-literary-evidence-revision') && !prompt.includes('previousReview')) {
      if (!prompt.includes('作者本轮指定优先审阅维度：pacing、voice')) {
        throw new Error('Literary Auditor did not receive the human-specified focus dimensions.')
      }
      if (!prompt.includes('指定维度没有可逐字定位的正文证据时不得输出 finding')) {
        throw new Error('Focused literary review lost the exact-evidence fail-closed boundary.')
      }
    }
    const isEvidenceRevision = prompt.includes('previousReview')
    const staysInvalid = prompt.includes('role-pipeline-literary-evidence-fail-closed')
    output = {
      schemaVersion: 'creator-literary-review.v1',
      findings: [{
        dimension: 'character_agency',
        severity: 'revision_candidate',
        evidenceQuote: isEvidenceRevision && !staysInvalid ? '林林' : '正文中不存在的伪造人物选择',
        expected: '人物选择应当在当前场景中造成一项可见代价。',
        observed: '当前局部动作与代价之间仍需要正文证据支持。',
        readerImpact: '读者可能无法确认人物为何承担后续压力。',
        diagnosis: '人物能动性判断必须由当前正文逐字证据支撑。',
        repairDirection: '只在当前证据块内补足选择与即时后果的联系。',
        confidence: 'medium',
      }],
    }
  } else if (schemaPath.endsWith('literary-review-verification.schema.json')) {
    const reviewId = prompt.match(/"reviewId": "([^"]+)"/)?.[1]
    const findingsText = prompt.slice(prompt.indexOf('"findings": ['))
    const findingId = findingsText.match(/"id": "([^"]+)"/)?.[1]
    const dimension = findingsText.match(/"dimension": "([^"]+)"/)?.[1]
    const severity = findingsText.match(/"severity": "([^"]+)"/)?.[1]
    const evidenceQuote = findingsText.match(/"evidenceQuote": "([^"]+)"/)?.[1]
    output = {
      schemaVersion: 'creator-literary-review-verification.v1',
      reviewId,
      findings: [{
        findingId,
        dimension,
        severity,
        decision: prompt.includes('role-pipeline-literary-false-positive') ? 'reject' : 'verify',
        evidenceQuote,
        rationale: prompt.includes('role-pipeline-literary-false-positive')
          ? '该引文只呈现人物动作，不能支持首轮声称的硬阻断。'
          : '已独立复核同一正文位置，原问题和严重度均由该证据支持。',
      }],
      compositeLiteraryScoreUsed: false,
    }
  } else if (schemaPath.endsWith('paired-literary-comparison.schema.json')) {
    const dimensions = [
      'continuity',
      'tension',
      'information_control',
      'character_agency',
      'voice',
      'freshness',
      'genre_fulfillment',
      'repetition',
      'exposition',
      'scene_detail',
      'pacing',
    ]
    output = {
      schemaVersion: 'creator-paired-literary-comparison.v1',
      comparisonId: 'paired-literary:role-pipeline',
      dimensions: dimensions.map(dimension => ({
        dimension,
        preference: 'tie',
        reasonCode: 'balanced_tradeoff',
        candidateAEvidenceBlockIds: ['candidate_a:block:001'],
        candidateBEvidenceBlockIds: ['candidate_b:block:001'],
        diagnosis: '两条候选在该维度都提供了可定位行动，因此暂时判断为平局。',
        confidence: 'medium',
      })),
      hardConstraints: [
        { candidate: 'candidate_a', status: 'pass', violationType: 'none', reasonCode: 'no_violation', evidenceBlockIds: [], diagnosis: '未见硬约束冲突。' },
        { candidate: 'candidate_b', status: 'pass', violationType: 'none', reasonCode: 'no_violation', evidenceBlockIds: [], diagnosis: '未见硬约束冲突。' },
      ],
      compositeLiteraryScoreUsed: false,
    }
  } else if (schemaPath.endsWith('paired-literary-comparison-verification.schema.json')) {
    const dimensions = [
      'continuity',
      'tension',
      'information_control',
      'character_agency',
      'voice',
      'freshness',
      'genre_fulfillment',
      'repetition',
      'exposition',
      'scene_detail',
      'pacing',
    ]
    output = {
      schemaVersion: 'creator-paired-literary-comparison-verification.v1',
      comparisonId: 'paired-literary:role-pipeline',
      dimensions: dimensions.map(dimension => ({
        dimension,
        decision: 'verify',
        confirmedPreference: 'tie',
        confirmedReasonCode: 'balanced_tradeoff',
        candidateAEvidenceBlockIds: ['candidate_a:block:001'],
        candidateBEvidenceBlockIds: ['candidate_b:block:001'],
        rationale: '已独立重读两条候选并重新定位该维度的证据。',
      })),
      hardConstraints: [
        { candidate: 'candidate_a', decision: 'verify', confirmedStatus: 'pass', confirmedViolationType: 'none', confirmedReasonCode: 'no_violation', evidenceBlockIds: [], rationale: '未见硬约束冲突。' },
        { candidate: 'candidate_b', decision: 'verify', confirmedStatus: 'pass', confirmedViolationType: 'none', confirmedReasonCode: 'no_violation', evidenceBlockIds: [], rationale: '未见硬约束冲突。' },
      ],
      compositeLiteraryScoreUsed: false,
    }
  } else if (schemaPath.endsWith('longform-continuity-review.schema.json')) {
    output = {
      schemaVersion: 'creator-longform-continuity-review.v1',
      windowStart: 1,
      windowEnd: 2,
      inspectedTransitions: [{
        fromChapter: 1,
        toChapter: 2,
        status: 'pass',
        findingIndexes: [],
      }],
      findings: [],
    }
  } else if (schemaPath.endsWith('longform-continuity-verification.schema.json')) {
    output = {
      schemaVersion: 'creator-longform-continuity-verification.v1',
      items: [{
        findingIndex: 0,
        fromChapter: 1,
        toChapter: 2,
        decision: 'verify',
        confirmedSeverity: 'revision_candidate',
        sourceEvidenceQuote: '第一章后果',
        targetEvidenceQuote: '第二章承受后果',
        diagnosis: '前后章逐字证据共同支持这一项局部连续性问题。',
      }],
      rationale: '已独立重读前后章并逐项复核首轮问题。',
    }
  } else if (schemaPath.endsWith('long-range-story-thread-review.schema.json')) {
    output = {
      schemaVersion: 'creator-long-range-story-thread-review.v1',
      focus: 'causal_state',
      fromChapter: 1,
      toChapter: 3,
      inspectedChapterNumbers: [1, 2, 3],
      inspectedDimensions: ['causal_debt', 'character_knowledge', 'timeline_anchor'],
      threads: [{
        threadId: 'timeline:camp',
        dimension: 'timeline_anchor',
        label: '营地时空锚点',
        statement: '队伍在第一章末仍位于洛兰营地。',
        sourceChapter: 1,
        sourceEvidenceQuote: '第一章仍在洛兰营地',
        status: 'active',
        latestEvidence: null,
        involvedCharacters: [],
        whyItMatters: '后续移动需要从这个已确认的位置开始。',
        confidence: 'medium',
      }],
      findings: [],
    }
  } else if (schemaPath.endsWith('long-range-story-thread-verification.schema.json')) {
    output = {
      schemaVersion: 'creator-long-range-story-thread-verification.v1',
      focus: 'causal_state',
      threadItems: [{
        threadId: 'timeline:camp',
        decision: 'verify',
        confirmedStatus: 'active',
        sourceEvidenceQuote: '仍在洛兰营地',
        latestEvidenceQuote: null,
        rationale: '原始章节能够定位该时空锚点，后续没有明确推进证据。',
      }],
      findingItems: [],
      rationale: '已重新阅读完整章节范围并核对候选线程。',
    }
  } else {
    throw new Error('unexpected schema: ' + schemaPath + '\\n' + readFileSync(schemaPath, 'utf8').slice(0, 120))
  }
  writeFileSync(outputPath, JSON.stringify(output))
})
`)
await chmod(fakeCodexPath, 0o755)

const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const childOutput = { stdout: '', stderr: '', exited: false }
const rolePipelineCharacterState = {
  location: 'state-sentinel:location',
  timePosition: 'state-sentinel:timePosition',
  physicalCondition: 'state-sentinel:physicalCondition',
  emotionalState: 'state-sentinel:emotionalState',
  dominantDesire: 'state-sentinel:dominantDesire',
  immediateGoal: 'state-sentinel:immediateGoal',
  currentIntent: 'state-sentinel:currentIntent',
  fear: 'state-sentinel:fear',
  woundTrigger: 'state-sentinel:woundTrigger',
  defenseStrategy: 'state-sentinel:defenseStrategy',
  beliefs: ['state-sentinel:beliefs'],
  falseBeliefs: ['state-sentinel:falseBeliefs'],
  knowledge: ['state-sentinel:knowledge'],
  secrets: ['state-sentinel:secrets'],
  resources: ['state-sentinel:resources'],
  capabilities: ['state-sentinel:capabilities'],
  limitations: ['state-sentinel:limitations'],
  relationshipStances: ['state-sentinel:relationshipStances'],
  trust: 'state-sentinel:trust',
  obligations: ['state-sentinel:obligations'],
  recentChoice: 'state-sentinel:recentChoice',
  paidCost: 'state-sentinel:paidCost',
}
const rolePipelineSecondaryCharacterId = 'character:manual-secondary'
const rolePipelineSecondaryKnowledge = 'secondary-sentinel:只知道后角锁扣已经松动'
const rolePipelineSecondaryFalseBelief = 'secondary-sentinel:误以为主索仍会回拍'
const rolePipelineSecondaryResource = 'secondary-sentinel:一枚带裂纹的固定楔'
const rolePipelineCausalEnding = '当章收尾证据：主角先解除后角锁扣，再处理前角，主索没有回拍。'
const authorSelectedSceneMechanism = {
  id: 'option:author-direction',
  label: '资源协商主导',
  primaryChangedAxis: 'pressureSource',
  proposedAdjustment: '保留当前现场目标，改由稀缺资源和协商义务推动人物选择。',
  preservedAuthorIntent: ['保留当前现场目标', '保留人物知识边界'],
  addressesIssueCodes: ['causal_chain_repetition'],
  whyItBreaksRepetition: '压力、冲突、能动、代价和结尾五个轴都与近期场景不同。',
  expectedMechanismSignature: {
    pressureSource: 'resource',
    conflictEngine: 'negotiation',
    agencyPattern: 'delegation',
    costPattern: 'obligation',
    endingPattern: 'relationship_shift',
  },
  tradeoff: '动作强度降低，但资源义务和人物关系成为场景中心。',
  decisionId: 'scene-author-decision:test',
  pipelineId: 'pipeline:test',
  selectedAt: '2026-07-16T00:00:00.000Z',
}
const rolePipelinePayload = {
  fixture: 'role-pipeline',
  session: {
    id: 'session:role-pipeline',
  },
  intent: {
    id: 'intent:role-pipeline',
    sessionId: 'session:role-pipeline',
    revision: 7,
  },
  context: {
    activeCharacters: [
      {
        id: 'character:test',
        goal: '完成当前现场目标',
        belief: [],
        knowledge: ['只能依据现场可观察证据判断'],
        falseBeliefs: [],
        emotionalState: '克制',
        resources: ['一枚备用锁扣'],
        state: rolePipelineCharacterState,
      },
      {
        id: rolePipelineSecondaryCharacterId,
        goal: '在不暴露伤势的前提下协助固定主索',
        belief: ['主角会优先保护现场其他人'],
        knowledge: [rolePipelineSecondaryKnowledge],
        falseBeliefs: [rolePipelineSecondaryFalseBelief],
        emotionalState: '带伤警惕',
        resources: [rolePipelineSecondaryResource],
      },
    ],
    recentSceneSummaries: [{
      sceneId: 'local-canon:chapter:19',
      summary: `历史快照：只表示当章结束状态，当前有效状态以最新正史为准。${rolePipelineCausalEnding}`,
      relevanceReason: '作者手动选中的历史快照；仅明确正史与收尾证据可作已发生事实',
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
        id: 'manual-recall:local-causal:chapter:19',
        sourceId: 'local-canon:chapter:19',
        sourceRevision: 4,
        authority: 'canon',
        group: 'causal',
        statement: rolePipelineCausalEnding,
        sourceLabel: '第 19 章 · 本机已确认',
        whyNow: '上一章的收尾必须约束当前场景。',
        locator: {
          kind: 'canon',
          targetId: 'local-chapter:chapter:19',
          label: '定位到本机第 19 章正史',
        },
      },
      {
        id: 'manual-recall:character:manual-secondary',
        sourceId: rolePipelineSecondaryCharacterId,
        sourceRevision: 2,
        authority: 'author',
        group: 'character_knowledge',
        statement: rolePipelineSecondaryKnowledge,
        sourceLabel: '作者手选次要角色卡',
        whyNow: '次要角色参与当前主索处置，必须保留其有限所知。',
        locator: {
          kind: 'asset',
          targetId: rolePipelineSecondaryCharacterId,
          label: '定位到本机次要角色卡',
        },
      },
    ],
    styleSamples: [],
  },
}
const bridge = spawn(process.execPath, ['scripts/creator-working-agent-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PATH: `${binDirectory}:${process.env.PATH || ''}`,
    TMPDIR: sandbox,
    PUF_CREATOR_WORKING_AGENT_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
bridge.stdout.on('data', chunk => { childOutput.stdout += chunk.toString() })
bridge.stderr.on('data', chunk => { childOutput.stderr += chunk.toString() })
bridge.on('exit', () => { childOutput.exited = true })

try {
  const health = await waitForHealth(`${baseUrl}/health`, childOutput)
  assert.equal(health.roleRuntime.length, 10)
  assert.equal(health.roleRuntime.filter(item => item.status === 'wired').length, 8)
  assert.ok(health.operations.includes('direct_scene_draft'))
  assert.ok(health.operations.includes('scene_author_direction_draft_review'))
  assert.ok(health.operations.includes('literary_review_revision'))
  assert.ok(health.operations.includes('literary_review_verification'))
  assert.ok(health.operations.includes('paired_literary_comparison'))
  assert.ok(health.operations.includes('paired_literary_comparison_revision'))
  assert.ok(health.operations.includes('paired_literary_comparison_verification'))
  assert.ok(health.operations.includes('paired_literary_comparison_verification_revision'))
  assert.ok(health.operations.includes('longform_continuity_review'))
  assert.ok(health.operations.includes('longform_continuity_verification'))
  assert.ok(health.operations.includes('long_range_story_thread_review'))
  assert.ok(health.operations.includes('long_range_story_thread_revision'))
  assert.ok(health.operations.includes('long_range_story_thread_verification'))
  assert.ok(health.operations.includes('state_evidence'))
  assert.ok(health.operations.includes('state_evidence_review'))

  const manifestsBeforeMissingContext = await findNamedFiles(
    path.join(sandbox, 'parallel-universe-creator-working-agent'),
    'run-manifest.json',
  ).catch(() => [])
  const missingContextResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        context: {
          ...rolePipelinePayload.context,
          recentSceneSummaries: [],
        },
        request: {
          ...rolePipelinePayload.request,
          chapterNumber: 20,
          writingMode: 'continue_author_text',
        },
      },
    }),
  })
  const missingContextBody = await missingContextResponse.json()
  assert.equal(missingContextResponse.status, 428)
  assert.equal(missingContextBody.error, 'recent_scene_context_required')
  const manifestsAfterMissingContext = await findNamedFiles(
    path.join(sandbox, 'parallel-universe-creator-working-agent'),
    'run-manifest.json',
  ).catch(() => [])
  assert.equal(
    manifestsAfterMissingContext.length,
    manifestsBeforeMissingContext.length,
    'missing recent-scene evidence must stop before Architect or Writer is invoked',
  )

  const candidateSearchResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'candidate_search',
      attempt: 'initial',
      payload: rolePipelinePayload,
    }),
  })
  const candidateSearchText = await candidateSearchResponse.text()
  assert.equal(candidateSearchResponse.status, 200, candidateSearchText)
  assert.equal(JSON.parse(candidateSearchText).candidates.length, 3)
  const plannerManifestRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
  const plannerManifestPaths = await findNamedFiles(plannerManifestRoot, 'run-manifest.json')
  const plannerManifestIndex = (await Promise.all(plannerManifestPaths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8'))
  )))).findIndex(manifest => manifest.role === 'Planner' && manifest.operation === 'candidate_search')
  assert.ok(plannerManifestIndex >= 0, 'Planner candidate-search run manifest must exist')
  const plannerPrompt = await readFile(
    path.join(path.dirname(plannerManifestPaths[plannerManifestIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(
    plannerPrompt,
    new RegExp(rolePipelineSecondaryKnowledge),
    'Planner must retain manually selected secondary character knowledge',
  )
  assert.match(
    plannerPrompt,
    new RegExp(rolePipelineSecondaryFalseBelief),
    'Planner must retain manually selected secondary character false belief',
  )

  const standaloneDirectionReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_author_direction_draft_review',
      attempt: 'initial',
      payload: {
        fixture: 'role-pipeline-post-repair-direction-review',
        intent: {
          ...rolePipelinePayload.intent,
          sceneMechanismDirection: authorSelectedSceneMechanism,
        },
        draft: {
          body: '林林把最后一块干粮推给同伴，并当场承担了新的协商义务。',
        },
      },
    }),
  })
  const standaloneDirectionReviewText = await standaloneDirectionReviewResponse.text()
  assert.equal(standaloneDirectionReviewResponse.status, 200, standaloneDirectionReviewText)
  assert.equal(JSON.parse(standaloneDirectionReviewText).decision, 'pass')

  const rejectedStandaloneDirectionReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_author_direction_draft_review',
      attempt: 'initial',
      payload: {
        fixture: 'option:draft-direction-reject',
        intent: {
          ...rolePipelinePayload.intent,
          sceneMechanismDirection: authorSelectedSceneMechanism,
        },
        draft: {
          body: 'option:draft-direction-reject 林林把最后一块干粮推给同伴，但没有承担协商义务。',
        },
      },
    }),
  })
  const rejectedStandaloneDirectionReviewText = await rejectedStandaloneDirectionReviewResponse.text()
  assert.equal(rejectedStandaloneDirectionReviewResponse.status, 200, rejectedStandaloneDirectionReviewText)
  assert.equal(JSON.parse(rejectedStandaloneDirectionReviewText).decision, 'reject')

  const standaloneDirectionManifestRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
  const standaloneDirectionManifestPaths = await findNamedFiles(standaloneDirectionManifestRoot, 'run-manifest.json')
  const standaloneDirectionManifests = await Promise.all(standaloneDirectionManifestPaths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8'))
  )))
  const standaloneDirectionPipeline = standaloneDirectionManifests.filter(manifest => (
    manifest.operation === 'scene_author_direction_draft_review'
    && manifest.role === 'Auditor'
  ))
  assert.equal(standaloneDirectionPipeline.length, 2)
  assert.ok(standaloneDirectionPipeline.every(manifest => manifest.canonCommitAllowed === false))

  const literaryEvidencePayload = {
    fixture: 'role-pipeline-literary-evidence-revision',
    requestedFocusDimensions: ['pacing', 'voice'],
    context: rolePipelinePayload.context,
    draft: {
      contentBlocks: [{ id: 'block:literary-review', text: '林林把最后一块干粮推给同伴。' }],
    },
  }
  const literaryReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'literary_review',
      attempt: 'initial',
      payload: literaryEvidencePayload,
    }),
  })
  const literaryReviewText = await literaryReviewResponse.text()
  assert.equal(literaryReviewResponse.status, 200, literaryReviewText)
  const invalidLiteraryReview = JSON.parse(literaryReviewText)
  assert.equal(invalidLiteraryReview.findings[0].evidenceQuote, '正文中不存在的伪造人物选择')

  const literaryRevisionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'literary_review_revision',
      attempt: 'initial',
      payload: {
        ...literaryEvidencePayload,
        previousReview: invalidLiteraryReview,
        validationIssue: {
          code: 'evidence_missing',
          message: 'The character_agency literary finding does not quote the current manuscript exactly.',
        },
      },
    }),
  })
  const literaryRevisionText = await literaryRevisionResponse.text()
  assert.equal(literaryRevisionResponse.status, 200, literaryRevisionText)
  assert.equal(JSON.parse(literaryRevisionText).findings[0].evidenceQuote, '林林')

  for (const [fixture, expectedDecision] of [
    ['role-pipeline-literary-finding-verification', 'verify'],
    ['role-pipeline-literary-false-positive', 'reject'],
  ]) {
    const verificationResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'literary_review_verification',
        attempt: 'initial',
        payload: {
          fixture,
          reviewId: 'literary-review:role-pipeline',
          context: rolePipelinePayload.context,
          draft: { contentBlocks: [{ id: 'block:literary-review', text: '林林把最后一块干粮推给同伴。' }] },
          findings: [{
            id: 'working-agent-finding:role-pipeline',
            dimension: 'character_agency',
            severity: 'revision_candidate',
            evidenceQuote: '林林',
            expected: '人物选择应当造成可见代价。',
            observed: '当前动作的即时后果仍不明确。',
            readerImpact: '读者难以判断选择为何重要。',
            diagnosis: '动作和代价之间缺少可见联系。',
            repairDirection: '只补足该动作造成的即时限制。',
            confidence: 'medium',
          }],
        },
      }),
    })
    const verificationText = await verificationResponse.text()
    assert.equal(verificationResponse.status, 200, verificationText)
    assert.equal(JSON.parse(verificationText).findings[0].decision, expectedDecision)
  }

  const literaryManifestRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
  const literaryManifestPaths = await findNamedFiles(literaryManifestRoot, 'run-manifest.json')
  const literaryManifests = await Promise.all(literaryManifestPaths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8'))
  )))
  assert.ok(literaryManifests.some(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'literary_review'
  )))
  assert.ok(literaryManifests.some(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'literary_review_revision'
  )))
  assert.equal(literaryManifests.filter(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'literary_review_verification'
  )).length, 2)
  const literaryReviewManifestIndex = literaryManifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'literary_review'
  ))
  assert.ok(literaryReviewManifestIndex >= 0, 'Literary Auditor run manifest must exist')
  const literaryReviewPrompt = await readFile(
    path.join(path.dirname(literaryManifestPaths[literaryReviewManifestIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(
    literaryReviewPrompt,
    new RegExp(rolePipelineSecondaryKnowledge),
    'Literary Auditor must retain manually selected secondary character knowledge',
  )
  assert.match(
    literaryReviewPrompt,
    new RegExp(rolePipelineSecondaryFalseBelief),
    'Literary Auditor must retain manually selected secondary character false belief',
  )
  const literaryVerificationPromptPaths = literaryManifestPaths.filter((_, index) => (
    literaryManifests[index].role === 'Auditor'
    && literaryManifests[index].operation === 'literary_review_verification'
  ))
  assert.equal(literaryVerificationPromptPaths.length, 2)
  for (const verificationPromptPath of literaryVerificationPromptPaths) {
    const verificationPrompt = await readFile(
      path.join(path.dirname(verificationPromptPath), 'prompt.txt'),
      'utf8',
    )
    assert.match(
      verificationPrompt,
      new RegExp(rolePipelineSecondaryKnowledge),
      'Independent Literary Auditor must retain manually selected secondary character knowledge',
    )
    assert.match(
      verificationPrompt,
      new RegExp(rolePipelineSecondaryFalseBelief),
      'Independent Literary Auditor must retain manually selected secondary character false belief',
    )
  }

  const stateEvidenceDraft = {
    contentBlocks: [{
      id: 'block:secondary-knowledge',
      text: '守夜人俯身检查绳槽，亲眼看见后角锁扣已经松动，却仍误以为主索会突然回拍。',
    }],
  }
  const stateEvidenceResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'state_evidence',
      attempt: 'initial',
      payload: {
        fixture: 'role-pipeline-secondary-character-state-evidence',
        context: rolePipelinePayload.context,
        draft: stateEvidenceDraft,
      },
    }),
  })
  const stateEvidenceText = await stateEvidenceResponse.text()
  assert.equal(stateEvidenceResponse.status, 200, stateEvidenceText)
  const stateEvidenceResult = JSON.parse(stateEvidenceText)
  assert.equal(
    stateEvidenceResult.characterStateProposals[0].path,
    `/characters/${rolePipelineSecondaryCharacterId}/knowledge`,
  )
  assert.equal(stateEvidenceResult.characterStateProposals[0].irreversible, true)

  const stateEvidenceReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'state_evidence_review',
      attempt: 'initial',
      payload: {
        fixture: 'role-pipeline-secondary-character-state-evidence-review',
        context: rolePipelinePayload.context,
        draft: stateEvidenceDraft,
        evidence: stateEvidenceResult,
      },
    }),
  })
  const stateEvidenceReviewText = await stateEvidenceReviewResponse.text()
  assert.equal(stateEvidenceReviewResponse.status, 200, stateEvidenceReviewText)
  const stateEvidenceReviewResult = JSON.parse(stateEvidenceReviewText)
  assert.equal(stateEvidenceReviewResult.decision, 'pass')
  assert.deepEqual(stateEvidenceReviewResult.verifiedCharacterProposalIndexes, [0])

  const stateManifestRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
  const stateManifestPaths = await findNamedFiles(stateManifestRoot, 'run-manifest.json')
  const stateManifests = await Promise.all(stateManifestPaths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8'))
  )))
  for (const [role, operation, assertionMessage] of [
    ['Observer', 'state_evidence', 'Observer must retain manually selected secondary character knowledge'],
    ['Auditor', 'state_evidence_review', 'State Auditor must retain manually selected secondary character knowledge'],
  ]) {
    const manifestIndex = stateManifests.findIndex(manifest => (
      manifest.role === role && manifest.operation === operation
    ))
    assert.ok(manifestIndex >= 0, `${role} ${operation} run manifest must exist`)
    const prompt = await readFile(
      path.join(path.dirname(stateManifestPaths[manifestIndex]), 'prompt.txt'),
      'utf8',
    )
    assert.match(prompt, new RegExp(rolePipelineSecondaryCharacterId), `${assertionMessage}: id`)
    assert.match(prompt, new RegExp(rolePipelineSecondaryKnowledge), `${assertionMessage}: knowledge`)
    assert.match(prompt, new RegExp(rolePipelineSecondaryFalseBelief), `${assertionMessage}: false belief`)
  }

  const initialResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: rolePipelinePayload,
    }),
  })
  const initialResponseText = await initialResponse.text()
  assert.equal(initialResponse.status, 200, initialResponseText)
  const initialResult = JSON.parse(initialResponseText)
  assert.deepEqual(initialResult.stateProposals, [], 'Writer may return no state change instead of fabricating one')

  const logRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
  let manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  let manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const initialManifests = manifests.filter(manifest => manifest.operation === 'scene_architecture' || manifest.operation === 'scene_draft')
  assert.deepEqual(initialManifests.map(manifest => manifest.role).sort(), ['Architect', 'Writer'])
  assert.equal(new Set(initialManifests.map(manifest => manifest.pipelineId)).size, 1)
  assert.deepEqual(initialManifests.map(manifest => manifest.sequence).sort(), [1, 3])
  assert.ok(initialManifests.every(manifest => manifest.status === 'succeeded' && manifest.canonCommitAllowed === false))
  const initialPipelineId = initialManifests[0].pipelineId

  const architectManifestPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(initialPipelineId) && manifestPath.includes('01-architect')
  ))
  assert.ok(architectManifestPath, 'Architect run manifest must exist')
  const architectPrompt = await readFile(path.join(path.dirname(architectManifestPath), 'prompt.txt'), 'utf8')
  const structureAuditorManifestPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(initialPipelineId) && manifestPath.includes('02-auditor')
  ))
  assert.ok(structureAuditorManifestPath, 'Structure Auditor run manifest must exist')
  const structureAuditorPrompt = await readFile(
    path.join(path.dirname(structureAuditorManifestPath), 'prompt.txt'),
    'utf8',
  )
  const writerManifestPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(initialPipelineId) && manifestPath.includes('03-writer')
  ))
  assert.ok(writerManifestPath, 'Writer run manifest must exist')
  const writerPrompt = await readFile(path.join(path.dirname(writerManifestPath), 'prompt.txt'), 'utf8')
  assert.equal(Object.keys(rolePipelineCharacterState).length, 22)
  for (const dimension of Object.keys(rolePipelineCharacterState)) {
    assert.match(architectPrompt, new RegExp(`"${dimension}"`), `Architect prompt must retain ${dimension}`)
    assert.match(writerPrompt, new RegExp(`"${dimension}"`), `Writer prompt must retain ${dimension}`)
  }
  for (const prompt of [architectPrompt, structureAuditorPrompt, writerPrompt]) {
    assert.match(prompt, /"recentSceneSummaries"/)
    assert.match(prompt, /"manualRecallItems"/)
    assert.match(prompt, new RegExp(rolePipelineCausalEnding))
    assert.match(prompt, new RegExp(rolePipelineSecondaryCharacterId), 'manual secondary character id must reach the role prompt')
    assert.match(prompt, new RegExp(rolePipelineSecondaryKnowledge), 'manual secondary character knowledge must reach the role prompt')
    assert.match(prompt, new RegExp(rolePipelineSecondaryFalseBelief), 'manual secondary character false belief must reach the role prompt')
    assert.match(prompt, new RegExp(rolePipelineSecondaryResource), 'manual secondary character resource must reach the role prompt')
    assert.doesNotMatch(prompt, /"relationshipPosition"/)
    assert.match(prompt, /"mechanismSignature"/)
  }
  assert.match(writerPrompt, /"sceneArchitecture"/)
  assert.match(writerPrompt, /"writerLatitude"/)
  assert.match(writerPrompt, /dialogue wording/)
  assert.match(writerPrompt, /action-feedback-adjustment loops/)
  assert.match(writerPrompt, /局部成功要制造更窄的新阻力/)
  assert.match(writerPrompt, /不要机械地“一节拍一段”/)
  assert.match(writerPrompt, /段落经济性边界/)
  assert.match(writerPrompt, /连续两个段落不得只换说法重复/)
  assert.match(writerPrompt, /causalChain 不是需要逐项展开的镜头清单/)
  assert.match(writerPrompt, /creator-scene-architecture\.v1/)
  assert.match(writerPrompt, /context\.styleSamples 只用于学习句法节奏/)
  assert.match(writerPrompt, /不能据此恢复为当前事实/)

  const densityResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-author-direction-density',
        intent: {
          ...rolePipelinePayload.intent,
          sceneMechanismDirection: authorSelectedSceneMechanism,
        },
        request: {
          targetLength: { minimum: 2700, maximum: 3400 },
        },
      },
    }),
  })
  const densityText = await densityResponse.text()
  assert.equal(densityResponse.status, 200, densityText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const densityPipelineId = manifests.find(manifest => (
    manifest.operation === 'scene_architecture_revision'
    && manifests.some(candidate => (
      candidate.pipelineId === manifest.pipelineId
      && candidate.operation === 'scene_author_direction_draft_review'
    ))
  ))?.pipelineId
  assert.ok(densityPipelineId, 'an over-detailed 3000-character architecture must receive one bounded compression')
  const densityArchitectPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(densityPipelineId) && manifestPath.includes('03-architect')
  ))
  assert.ok(densityArchitectPath)
  const densityArchitectPrompt = await readFile(path.join(path.dirname(densityArchitectPath), 'prompt.txt'), 'utf8')
  assert.match(densityArchitectPrompt, /sceneArchitectureDensityIssues/)
  assert.match(densityArchitectPrompt, /4-5 个结果级因果节拍/)

  const executionQualityResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-execution-quality-revision',
      },
    }),
  })
  const executionQualityText = await executionQualityResponse.text()
  assert.equal(executionQualityResponse.status, 200, executionQualityText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  const executionRevisionPromptPaths = manifestPaths
    .filter(manifestPath => manifestPath.includes('03-architect'))
    .map(manifestPath => path.join(path.dirname(manifestPath), 'prompt.txt'))
  let executionRevisionPrompt = ''
  for (const promptPath of executionRevisionPromptPaths) {
    const candidatePrompt = await readFile(promptPath, 'utf8')
    if (candidatePrompt.includes('role-pipeline-execution-quality-revision')) {
      executionRevisionPrompt = candidatePrompt
      break
    }
  }
  assert.match(executionRevisionPrompt, /executionQualityChecks 有 reject/)
  assert.match(executionRevisionPrompt, /局部成功制造下一拍更窄的问题/)

  const evidenceRepairResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-review-evidence-repair',
      },
    }),
  })
  const evidenceRepairText = await evidenceRepairResponse.text()
  assert.equal(evidenceRepairResponse.status, 200, evidenceRepairText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const evidenceRepairPipelineId = manifests.find(manifest => (
    manifest.operation === 'scene_architecture_review_evidence_repair'
  ))?.pipelineId
  assert.ok(evidenceRepairPipelineId, 'unlocatable review evidence must trigger one bounded Auditor evidence repair')
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === evidenceRepairPipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Auditor:scene_architecture_review_evidence_repair',
      '4:Architect:scene_architecture_revision',
      '5:Auditor:scene_architecture_review',
      '6:Writer:scene_draft',
    ],
  )
  const evidenceRepairPromptPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(evidenceRepairPipelineId) && manifestPath.includes('03-auditor')
  ))
  assert.ok(evidenceRepairPromptPath)
  const evidenceRepairPrompt = await readFile(path.join(path.dirname(evidenceRepairPromptPath), 'prompt.txt'), 'utf8')
  assert.match(evidenceRepairPrompt, /validationError\.evidenceIssues/)
  assert.match(evidenceRepairPrompt, /allowedEvidenceCatalog/)
  assert.match(evidenceRepairPrompt, /不存在的因果升级证据/)
  assert.match(evidenceRepairPrompt, /不存在的场景骨架证据/)
  assert.match(evidenceRepairPrompt, /不存在的近期场景证据/)
  assert.match(evidenceRepairPrompt, /\$\.sceneArchitecture\.causalChain\[0\]\.consequence/)
  assert.match(evidenceRepairPrompt, /\$\.context\.recentSceneSummaries\[0\]\.mechanismSignature\.pressureSource/)
  assert.match(evidenceRepairPrompt, /pressureSource: institution/)

  for (const [fixture, expectedError] of [
    ['role-pipeline-review-evidence-semantic-mutation', 'scene_architecture_review_evidence_revision_semantic_change'],
    ['role-pipeline-review-evidence-persistent-invalid', 'scene_architecture_review_evidence_revision_catalog_mismatch'],
  ]) {
    const failClosedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'scene_draft',
        attempt: 'initial',
        payload: {
          ...rolePipelinePayload,
          fixture,
        },
      }),
    })
    const failClosedText = await failClosedResponse.text()
    assert.equal(failClosedResponse.status, 500, failClosedText)
    assert.match(failClosedText, new RegExp(expectedError))
    manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
    manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
    let repairPromptPath = null
    for (const manifestPath of manifestPaths) {
      if (!manifestPath.includes('03-auditor')) continue
      const candidatePrompt = await readFile(path.join(path.dirname(manifestPath), 'prompt.txt'), 'utf8')
      if (candidatePrompt.includes(fixture)) {
        repairPromptPath = manifestPath
        break
      }
    }
    assert.ok(repairPromptPath, `${fixture} must run exactly one evidence-only Auditor correction`)
    const failedPipelineId = manifests.find(manifest => repairPromptPath.includes(manifest.pipelineId))?.pipelineId
    assert.ok(failedPipelineId)
    assert.deepEqual(
      manifests
        .filter(manifest => manifest.pipelineId === failedPipelineId)
        .sort((left, right) => left.sequence - right.sequence)
        .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
      [
        '1:Architect:scene_architecture',
        '2:Auditor:scene_architecture_review',
        '3:Auditor:scene_architecture_review_evidence_repair',
      ],
    )
  }

  const informationEvidenceRepairResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-review-information-evidence-repair',
      },
    }),
  })
  const informationEvidenceRepairText = await informationEvidenceRepairResponse.text()
  assert.equal(informationEvidenceRepairResponse.status, 200, informationEvidenceRepairText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  let informationEvidenceRepairPromptPath = null
  for (const manifestPath of manifestPaths) {
    if (!manifestPath.includes('03-auditor')) continue
    const candidatePrompt = await readFile(path.join(path.dirname(manifestPath), 'prompt.txt'), 'utf8')
    if (candidatePrompt.includes('role-pipeline-review-information-evidence-repair')) {
      informationEvidenceRepairPromptPath = manifestPath
      break
    }
  }
  assert.ok(
    informationEvidenceRepairPromptPath,
    'paraphrased information-boundary references must trigger one bounded Auditor correction',
  )
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const informationEvidenceRepairPipelineId = manifests.find(manifest => (
    informationEvidenceRepairPromptPath.includes(manifest.pipelineId)
  ))?.pipelineId
  assert.ok(informationEvidenceRepairPipelineId)
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === informationEvidenceRepairPipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Auditor:scene_architecture_review_evidence_repair',
      '4:Writer:scene_draft',
    ],
  )
  const informationEvidenceRepairPrompt = await readFile(
    path.join(path.dirname(informationEvidenceRepairPromptPath), 'prompt.txt'),
    'utf8',
  )
  assert.match(informationEvidenceRepairPrompt, /informationBoundary\.observableEvidence/)
  assert.match(informationEvidenceRepairPrompt, /informationBoundary\.allowedInference/)
  assert.match(informationEvidenceRepairPrompt, /informationBoundary\.withheldInference/)
  assert.match(informationEvidenceRepairPrompt, /主角注意到门面上似乎留有新的灼烧痕迹/)
  assert.match(informationEvidenceRepairPrompt, /informationControlCheck 的 decision\/diagnosis/)

  for (const [fixture, expectedError] of [
    [
      'role-pipeline-review-information-evidence-semantic-mutation',
      'scene_architecture_review_evidence_revision_semantic_change',
    ],
    [
      'role-pipeline-review-information-evidence-persistent-invalid',
      'scene_architecture_review_evidence_revision_catalog_mismatch',
    ],
  ]) {
    const failClosedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'scene_draft',
        attempt: 'initial',
        payload: {
          ...rolePipelinePayload,
          fixture,
        },
      }),
    })
    const failClosedText = await failClosedResponse.text()
    assert.equal(failClosedResponse.status, 500, failClosedText)
    assert.match(failClosedText, new RegExp(expectedError))
    manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
    manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
    let repairPromptPath = null
    for (const manifestPath of manifestPaths) {
      if (!manifestPath.includes('03-auditor')) continue
      const candidatePrompt = await readFile(path.join(path.dirname(manifestPath), 'prompt.txt'), 'utf8')
      if (candidatePrompt.includes(fixture)) {
        repairPromptPath = manifestPath
        break
      }
    }
    assert.ok(repairPromptPath, `${fixture} must run exactly one information-reference correction`)
    const failedPipelineId = manifests.find(manifest => repairPromptPath.includes(manifest.pipelineId))?.pipelineId
    assert.ok(failedPipelineId)
    assert.deepEqual(
      manifests
        .filter(manifest => manifest.pipelineId === failedPipelineId)
        .sort((left, right) => left.sequence - right.sequence)
        .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
      [
        '1:Architect:scene_architecture',
        '2:Auditor:scene_architecture_review',
        '3:Auditor:scene_architecture_review_evidence_repair',
      ],
    )
  }

  const repeatedMechanismPayload = {
    ...rolePipelinePayload,
    fixture: 'role-pipeline-mechanism-revision',
    context: {
      ...rolePipelinePayload.context,
      recentSceneSummaries: [{
        ...rolePipelinePayload.context.recentSceneSummaries[0],
        mechanismSignature: {
          pressureSource: 'opponent',
          conflictEngine: 'combat',
          agencyPattern: 'improvisation',
          costPattern: 'injury',
          endingPattern: 'opponent_gain',
        },
      }],
    },
  }
  const mechanismRevisionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: repeatedMechanismPayload,
    }),
  })
  const mechanismRevisionText = await mechanismRevisionResponse.text()
  assert.equal(mechanismRevisionResponse.status, 200, mechanismRevisionText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const mechanismPipelineId = manifests.find(manifest => (
    manifest.operation === 'scene_architecture_revision'
    && manifest.pipelineId !== densityPipelineId
  ))?.pipelineId
  assert.ok(mechanismPipelineId, 'a repeated 3/5-or-greater scene mechanism must trigger one Architect revision')
  const mechanismPipeline = manifests
    .filter(manifest => manifest.pipelineId === mechanismPipelineId)
    .sort((left, right) => left.sequence - right.sequence)
  assert.deepEqual(
    mechanismPipeline.map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
    ],
  )
  const revisedArchitectPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(mechanismPipelineId) && manifestPath.includes('03-architect')
  ))
  assert.ok(revisedArchitectPath)
  const revisedArchitectPrompt = await readFile(path.join(path.dirname(revisedArchitectPath), 'prompt.txt'), 'utf8')
  assert.match(revisedArchitectPrompt, /sceneMechanismIssues/)
  assert.match(revisedArchitectPrompt, /至少三个轴不同/)

  const authorDirectionPayload = {
    ...rolePipelinePayload,
    fixture: 'role-pipeline-author-direction',
    intent: {
      ...rolePipelinePayload.intent,
      sceneMechanismDirection: authorSelectedSceneMechanism,
    },
  }
  const authorDirectionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: authorDirectionPayload,
    }),
  })
  const authorDirectionText = await authorDirectionResponse.text()
  assert.equal(authorDirectionResponse.status, 200, authorDirectionText)
  const authorDirectionResult = JSON.parse(authorDirectionText)
  assert.equal(
    authorDirectionResult.authorDirectionReview?.schemaVersion,
    'creator-scene-author-direction-draft-review.v1',
    'a passing prose-direction review must travel with the candidate response',
  )
  assert.equal(
    authorDirectionResult.authorDirectionReview?.decision,
    'pass',
    'only a passing prose-direction review may accompany a successful candidate',
  )

  const normalizedDirectionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...authorDirectionPayload,
        fixture: 'role-pipeline-author-direction-normalization',
      },
    }),
  })
  const normalizedDirectionText = await normalizedDirectionResponse.text()
  assert.equal(normalizedDirectionResponse.status, 200, normalizedDirectionText)
  const normalizedDirectionResult = JSON.parse(normalizedDirectionText)
  assert.ok(
    Array.from(normalizedDirectionResult.body).filter(character => !/\s/u.test(character)).length >= 2700,
    'the bridge must normalize the candidate before returning it to application validation',
  )
  assert.equal(
    normalizedDirectionResult.authorDirectionReview?.decision,
    'pass',
    'the independent direction review must evaluate and travel with the final normalized prose',
  )
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const normalizedDirectionPipelineId = manifests.find(manifest => (
    manifest.role === 'Normalizer'
    && manifest.operation === 'scene_draft:schema_repair'
    && manifests.some(candidate => (
      candidate.pipelineId === manifest.pipelineId
      && candidate.operation === 'scene_author_direction_draft_review'
    ))
  ))?.pipelineId
  assert.ok(normalizedDirectionPipelineId, 'runtime normalization must remain in the same reviewed scene pipeline')
  const normalizedDirectionPipeline = manifests
    .filter(manifest => manifest.pipelineId === normalizedDirectionPipelineId)
    .sort((left, right) => left.sequence - right.sequence)
  assert.deepEqual(
    normalizedDirectionPipeline.slice(-3).map(manifest => `${manifest.role}:${manifest.operation}`),
    [
      'Writer:scene_draft',
      'Normalizer:scene_draft:schema_repair',
      'Auditor:scene_author_direction_draft_review',
    ],
    'normalization must happen before the final prose-direction review',
  )

  const lengthCompletionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...authorDirectionPayload,
        fixture: 'role-pipeline-author-direction-length-completion',
      },
    }),
  })
  const lengthCompletionText = await lengthCompletionResponse.text()
  assert.equal(lengthCompletionResponse.status, 200, lengthCompletionText)
  const lengthCompletionResult = JSON.parse(lengthCompletionText)
  const lengthCompletedVisibleCharacters = Array.from(lengthCompletionResult.body)
    .filter(character => !/\s/u.test(character)).length
  assert.ok(lengthCompletedVisibleCharacters >= 2950 && lengthCompletedVisibleCharacters <= 3150)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const lengthCompletionPipelineId = manifests.find(manifest => (
    manifest.role === 'Writer'
    && manifest.operation === 'scene_draft:length_completion'
  ))?.pipelineId
  assert.ok(lengthCompletionPipelineId, 'a still-short normalized draft must receive one append-only Writer completion')
  const lengthCompletionPipeline = manifests
    .filter(manifest => manifest.pipelineId === lengthCompletionPipelineId)
    .sort((left, right) => left.sequence - right.sequence)
  assert.deepEqual(
    lengthCompletionPipeline.slice(-4).map(manifest => `${manifest.role}:${manifest.operation}`),
    [
      'Writer:scene_draft',
      'Normalizer:scene_draft:schema_repair',
      'Writer:scene_draft:length_completion',
      'Auditor:scene_author_direction_draft_review',
    ],
    'append-only length completion must happen after Normalizer and before final prose review',
  )
  const authorDirectionPipelineId = manifests.find(manifest => (
    manifest.operation === 'scene_architecture_revision'
    && manifest.pipelineId !== mechanismPipelineId
  ))?.pipelineId
  assert.ok(authorDirectionPipelineId, 'an Architect mismatch must receive one bounded revision toward the author-selected mechanism')
  const authorDirectionPipeline = manifests
    .filter(manifest => manifest.pipelineId === authorDirectionPipelineId)
    .sort((left, right) => left.sequence - right.sequence)
  assert.deepEqual(
    authorDirectionPipeline.map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
      '6:Auditor:scene_author_direction_draft_review',
    ],
  )
  const authorDirectionRevisionPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(authorDirectionPipelineId) && manifestPath.includes('03-architect')
  ))
  const authorDirectionWriterPath = manifestPaths.find(manifestPath => (
    manifestPath.includes(authorDirectionPipelineId) && manifestPath.includes('05-writer')
  ))
  assert.ok(authorDirectionRevisionPath, 'the bounded Architect revision prompt must exist')
  assert.ok(authorDirectionWriterPath, 'Writer may run only after the author-selected mechanism passes')
  const authorDirectionRevisionPrompt = await readFile(path.join(path.dirname(authorDirectionRevisionPath), 'prompt.txt'), 'utf8')
  const authorDirectionWriterPrompt = await readFile(path.join(path.dirname(authorDirectionWriterPath), 'prompt.txt'), 'utf8')
  assert.match(authorDirectionRevisionPrompt, /sceneAuthorDirectionIssues/)
  assert.match(authorDirectionRevisionPrompt, /expectedMechanismSignature/)
  assert.match(authorDirectionRevisionPrompt, /resource/)
  assert.match(authorDirectionWriterPrompt, /"pressureSource": "resource"/)
  assert.match(authorDirectionWriterPrompt, /"endingPattern": "relationship_shift"/)

  const beforeDraftDirectionRejectionPipelineIds = new Set(manifests.map(manifest => manifest.pipelineId))
  const draftDirectionRejectionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...authorDirectionPayload,
        fixture: 'role-pipeline-author-direction-draft-reject',
        intent: {
          ...authorDirectionPayload.intent,
          sceneMechanismDirection: {
            ...authorSelectedSceneMechanism,
            id: 'option:draft-direction-reject',
          },
        },
      },
    }),
  })
  const draftDirectionRejectionResult = await draftDirectionRejectionResponse.json()
  assert.equal(draftDirectionRejectionResponse.status, 422, JSON.stringify(draftDirectionRejectionResult))
  assert.equal(draftDirectionRejectionResult.error, 'scene_draft_alignment_rejected')
  assert.equal(draftDirectionRejectionResult.detail, 'scene_author_direction_draft_rejected')
  assert.deepEqual(draftDirectionRejectionResult.rejectedAxes, ['costPattern'])
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const draftDirectionRejectionPipelineIds = [...new Set(manifests.map(manifest => manifest.pipelineId))]
    .filter(pipelineId => !beforeDraftDirectionRejectionPipelineIds.has(pipelineId))
  assert.equal(draftDirectionRejectionPipelineIds.length, 1)
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === draftDirectionRejectionPipelineIds[0])
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
      '6:Auditor:scene_author_direction_draft_review',
    ],
    'a prose-level direction rejection must stop without another Writer rewrite',
  )

  const beforeDraftEvidenceFailurePipelineIds = new Set(manifests.map(manifest => manifest.pipelineId))
  const draftEvidenceFailureResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...authorDirectionPayload,
        fixture: 'role-pipeline-author-direction-draft-evidence-fail-closed',
        intent: {
          ...authorDirectionPayload.intent,
          sceneMechanismDirection: {
            ...authorSelectedSceneMechanism,
            id: 'option:draft-evidence-fail-closed',
          },
        },
      },
    }),
  })
  const draftEvidenceFailureResult = await draftEvidenceFailureResponse.json()
  assert.equal(draftEvidenceFailureResponse.status, 500, JSON.stringify(draftEvidenceFailureResult))
  assert.equal(draftEvidenceFailureResult.error, 'working_agent_failed')
  assert.match(draftEvidenceFailureResult.detail, /scene_author_direction_draft_review_evidence_missing/)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const draftEvidenceFailurePipelineIds = [...new Set(manifests.map(manifest => manifest.pipelineId))]
    .filter(pipelineId => !beforeDraftEvidenceFailurePipelineIds.has(pipelineId))
  assert.equal(draftEvidenceFailurePipelineIds.length, 1)
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === draftEvidenceFailurePipelineIds[0])
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
      '6:Auditor:scene_author_direction_draft_review',
      '7:Auditor:scene_author_direction_draft_review_evidence_repair',
    ],
    'unlocatable prose evidence may receive one Auditor-only repair and must then fail closed',
  )

  const beforeDirectionFailurePipelineIds = new Set(manifests.map(manifest => manifest.pipelineId))
  const authorDirectionFailClosedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...authorDirectionPayload,
        fixture: 'role-pipeline-author-direction-fail-closed',
      },
    }),
  })
  const authorDirectionFailClosedResult = await authorDirectionFailClosedResponse.json()
  assert.equal(authorDirectionFailClosedResponse.status, 500, JSON.stringify(authorDirectionFailClosedResult))
  assert.equal(authorDirectionFailClosedResult.error, 'working_agent_failed')
  assert.match(authorDirectionFailClosedResult.detail, /scene_author_direction_not_honored/)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const directionFailurePipelineIds = [...new Set(manifests.map(manifest => manifest.pipelineId))]
    .filter(pipelineId => !beforeDirectionFailurePipelineIds.has(pipelineId))
  assert.equal(directionFailurePipelineIds.length, 1, 'the failed author-direction attempt must remain one bounded pipeline')
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === directionFailurePipelineIds[0])
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
    ],
    'a second mismatch must stop before Planner or Writer instead of silently overriding the author',
  )

  const deterministicFailClosedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...repeatedMechanismPayload,
        fixture: 'role-pipeline-deterministic-fail-closed',
      },
    }),
  })
  const deterministicFailClosedResult = await deterministicFailClosedResponse.json()
  assert.equal(deterministicFailClosedResponse.status, 409, JSON.stringify(deterministicFailClosedResult))
  assert.equal(deterministicFailClosedResult.error, 'author_decision_required')
  assert.equal(deterministicFailClosedResult.decision.decisionId, `scene-author-decision:${deterministicFailClosedResult.decision.pipelineId}`)
  assert.equal(deterministicFailClosedResult.decision.sessionId, rolePipelinePayload.session.id)
  assert.equal(deterministicFailClosedResult.decision.intentId, rolePipelinePayload.intent.id)
  assert.equal(deterministicFailClosedResult.decision.intentRevision, rolePipelinePayload.intent.revision)
  assert.equal(deterministicFailClosedResult.decision.writerInvoked, false)
  assert.equal(deterministicFailClosedResult.decision.canonCommitAllowed, false)
  assert.ok(deterministicFailClosedResult.decision.revisionMechanismIssues.length > 0)
  assert.equal(deterministicFailClosedResult.decision.decisionOptions.requiresAuthorSelection, true)
  assert.equal(deterministicFailClosedResult.decision.decisionOptions.options.length, 2)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === deterministicFailClosedResult.decision.pipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Planner:scene_author_decision_options',
    ],
  )

  const correctedDecisionOptionResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-decision-option-unknown-issue',
        intent: {
          ...rolePipelinePayload.intent,
          testMarker: 'role-pipeline-decision-option-unknown-issue',
        },
      },
    }),
  })
  const correctedDecisionOptionResult = await correctedDecisionOptionResponse.json()
  assert.equal(correctedDecisionOptionResponse.status, 409, JSON.stringify(correctedDecisionOptionResult))
  assert.equal(correctedDecisionOptionResult.error, 'author_decision_required')
  assert.equal(correctedDecisionOptionResult.decision.writerInvoked, false)
  assert.equal(correctedDecisionOptionResult.decision.canonCommitAllowed, false)
  assert.deepEqual(
    correctedDecisionOptionResult.decision.decisionOptions.options
      .flatMap(option => option.addressesIssueCodes),
    ['superficial_difference', 'superficial_difference'],
  )
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === correctedDecisionOptionResult.decision.pipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Planner:scene_author_decision_options',
      '6:Planner:scene_author_decision_options_semantic_revision',
    ],
    'an unknown issue code must receive exactly one Planner-only semantic correction before author choice',
  )

  const beforePersistentUnknownIssuePipelineIds = new Set(manifests.map(manifest => manifest.pipelineId))
  const persistentUnknownIssueResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-decision-option-persistent-unknown-issue',
        intent: {
          ...rolePipelinePayload.intent,
          testMarker: 'role-pipeline-decision-option-persistent-unknown-issue',
        },
      },
    }),
  })
  const persistentUnknownIssueResult = await persistentUnknownIssueResponse.json()
  assert.equal(persistentUnknownIssueResponse.status, 500, JSON.stringify(persistentUnknownIssueResult))
  assert.equal(persistentUnknownIssueResult.error, 'working_agent_failed')
  assert.equal(persistentUnknownIssueResult.detail, 'scene_author_decision_options_unknown_issue')
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const persistentUnknownIssuePipelineIds = [...new Set(manifests.map(manifest => manifest.pipelineId))]
    .filter(pipelineId => !beforePersistentUnknownIssuePipelineIds.has(pipelineId))
  assert.equal(persistentUnknownIssuePipelineIds.length, 1)
  const persistentUnknownIssuePipelineId = persistentUnknownIssuePipelineIds[0]
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === persistentUnknownIssuePipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Planner:scene_author_decision_options',
      '6:Planner:scene_author_decision_options_semantic_revision',
    ],
    'a second unknown issue code must fail closed before Writer or author selection',
  )

  const semanticReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-semantic-rejection',
      },
    }),
  })
  const semanticReviewText = await semanticReviewResponse.text()
  assert.equal(semanticReviewResponse.status, 200, semanticReviewText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const semanticPipelineId = manifests.find(manifest => (
    manifest.operation === 'scene_architecture_review'
    && manifest.pipelineId !== mechanismPipelineId
    && manifest.pipelineId !== densityPipelineId
    && manifest.pipelineId !== authorDirectionPipelineId
    && manifest.pipelineId !== normalizedDirectionPipelineId
    && manifest.pipelineId !== draftDirectionRejectionPipelineIds[0]
    && manifest.pipelineId !== draftEvidenceFailurePipelineIds[0]
    && manifest.pipelineId !== directionFailurePipelineIds[0]
    && manifest.pipelineId !== deterministicFailClosedResult.decision.pipelineId
    && manifest.pipelineId !== correctedDecisionOptionResult.decision.pipelineId
    && manifest.pipelineId !== persistentUnknownIssuePipelineId
    && !manifests.some(candidate => (
      candidate.pipelineId === manifest.pipelineId
      && candidate.operation.startsWith('scene_author_direction')
    ))
    && manifest.sequence === 4
  ))?.pipelineId
  assert.ok(semanticPipelineId, 'an Auditor-rejected semantic relabel must trigger one bounded Architect revision')
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === semanticPipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
    ],
  )

  const informationControlResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-information-control-revision',
      },
    }),
  })
  const informationControlText = await informationControlResponse.text()
  assert.equal(informationControlResponse.status, 200, informationControlText)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  const informationRevisionCandidates = await Promise.all(
    manifestPaths
      .filter(manifestPath => manifestPath.includes('03-architect'))
      .map(async manifestPath => ({
        manifestPath,
        prompt: await readFile(path.join(path.dirname(manifestPath), 'prompt.txt'), 'utf8'),
      })),
  )
  const informationRevisionArchitectPath = informationRevisionCandidates.find(candidate => (
    candidate.prompt.includes('role-pipeline-information-control-revision')
  ))?.manifestPath
  assert.ok(
    informationRevisionArchitectPath,
    'an information-control rejection must trigger one bounded Architect revision',
  )
  const informationControlPipelineId = JSON.parse(
    await readFile(informationRevisionArchitectPath, 'utf8'),
  ).pipelineId
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  assert.deepEqual(
    manifests
      .filter(manifest => manifest.pipelineId === informationControlPipelineId)
      .sort((left, right) => left.sequence - right.sequence)
      .map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Writer:scene_draft',
    ],
  )
  const informationRevisionArchitectPrompt = await readFile(
    path.join(path.dirname(informationRevisionArchitectPath), 'prompt.txt'),
    'utf8',
  )
  assert.match(informationRevisionArchitectPrompt, /informationControlCheck/)
  assert.match(informationRevisionArchitectPrompt, /重新分离现场可观察证据、有限推断和仍需保留的未知/)

  const failClosedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'initial',
      payload: {
        ...rolePipelinePayload,
        fixture: 'role-pipeline-fail-closed',
      },
    }),
  })
  const failClosedResult = await failClosedResponse.json()
  assert.equal(failClosedResponse.status, 409, JSON.stringify(failClosedResult))
  assert.equal(failClosedResult.error, 'author_decision_required')
  assert.equal(failClosedResult.decision.reason, 'scene_architecture_repetition')
  assert.equal(failClosedResult.decision.writerInvoked, false)
  assert.equal(failClosedResult.decision.boundedRevisionExhausted, true)
  assert.equal(failClosedResult.decision.initialReview.decision, 'reject')
  assert.equal(failClosedResult.decision.revisionReview.decision, 'reject')
  assert.equal(failClosedResult.decision.decisionOptions.requiresAuthorSelection, true)
  assert.equal(failClosedResult.decision.decisionOptions.writerInvoked, false)
  assert.equal(failClosedResult.decision.decisionOptions.canonCommitAllowed, false)
  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const failClosedPipeline = manifests
    .filter(manifest => manifest.pipelineId === failClosedResult.decision.pipelineId)
    .sort((left, right) => left.sequence - right.sequence)
  assert.deepEqual(
    failClosedPipeline.map(manifest => `${manifest.sequence}:${manifest.role}:${manifest.operation}`),
    [
      '1:Architect:scene_architecture',
      '2:Auditor:scene_architecture_review',
      '3:Architect:scene_architecture_revision',
      '4:Auditor:scene_architecture_review',
      '5:Planner:scene_author_decision_options',
    ],
  )

  const repairResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'scene_draft',
      attempt: 'schema_repair',
      schemaIssues: ['body: too small'],
      previousValue: { body: '未完成' },
      payload: { fixture: 'normalizer-repair' },
    }),
  })
  const repairResponseText = await repairResponse.text()
  assert.equal(repairResponse.status, 200, repairResponseText)
  JSON.parse(repairResponseText)

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const normalizerRuns = manifests.filter(manifest => manifest.role === 'Normalizer')
  assert.ok(normalizerRuns.length >= 2)
  const standaloneNormalizerRun = normalizerRuns.find(manifest => manifest.sequence === 1)
  assert.ok(standaloneNormalizerRun)
  assert.equal(standaloneNormalizerRun.operation, 'scene_draft:schema_repair')
  assert.equal(standaloneNormalizerRun.canonCommitAllowed, false)

  const localRepairResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'local_repair',
      attempt: 'initial',
      payload: {
        fixture: 'reviser-candidate',
        context: rolePipelinePayload.context,
        finding: { id: 'finding:test', diagnosis: '动作没有可见代价', repairDirection: '补足局部阻力与即时损失' },
        evidenceQuote: '他侧身避开刀锋',
        targetBlock: { id: 'block:test', text: '主角仍在石廊战场。他侧身避开刀锋，错过追击。', protected: false },
        neighboringBlocks: [],
      },
    }),
  })
  const localRepairResponseText = await localRepairResponse.text()
  assert.equal(localRepairResponse.status, 200, localRepairResponseText)
  const localRepairResult = JSON.parse(localRepairResponseText)
  assert.equal(localRepairResult.operation, 'replace_range')
  assert.equal(localRepairResult.targetBlockId, 'block:test')
  assert.deepEqual(localRepairResult.preservedFacts.map(item => item.fact), [
    '主角仍在石廊战场',
    '闪避使主角失去追击时机',
  ])

  const localRepairReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'local_repair_review',
      attempt: 'initial',
      payload: {
        fixture: 'auditor-repair-review',
        context: rolePipelinePayload.context,
        finding: { id: 'finding:test', diagnosis: '动作没有可见代价', repairDirection: '补足局部阻力与即时损失' },
        targetBlock: { id: 'block:test', text: '主角仍在石廊战场。他侧身避开刀锋，错过追击。', protected: false },
        neighboringBlocks: [],
        repair: localRepairResult,
      },
    }),
  })
  const localRepairReviewResponseText = await localRepairReviewResponse.text()
  assert.equal(localRepairReviewResponse.status, 200, localRepairReviewResponseText)
  const localRepairReviewResult = JSON.parse(localRepairReviewResponseText)
  assert.equal(localRepairReviewResult.decision, 'pass')
  assert.deepEqual(localRepairReviewResult.verifiedPreservedFactIndexes, [0, 1])

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const reviserRuns = manifests.filter(manifest => manifest.role === 'Reviser')
  assert.equal(reviserRuns.length, 1)
  assert.equal(reviserRuns[0].operation, 'local_repair')
  assert.equal(reviserRuns[0].canonCommitAllowed, false)
  const reviserManifestPath = manifestPaths.find(manifestPath => manifestPath.includes('01-reviser'))
  assert.ok(reviserManifestPath, 'Reviser run manifest must exist')
  const reviserPrompt = await readFile(path.join(path.dirname(reviserManifestPath), 'prompt.txt'), 'utf8')
  assert.match(reviserPrompt, /只针对已经定位的一个文学问题/)
  assert.match(reviserPrompt, /"targetBlock"/)
  assert.match(reviserPrompt, /sourceEvidenceQuote/)
  assert.match(reviserPrompt, /intentPreservationRequirements/)
  assert.match(reviserPrompt, /不得把三个人缩成一个人/)
  assert.match(reviserPrompt, /auditor_revision/)
  assert.match(reviserPrompt, /唯一一次受独立 Auditor 意见约束的修订/)
  assert.match(reviserPrompt, /efficacy_retry/)
  assert.match(reviserPrompt, /chapterComparisonBlocks/)
  assert.match(reviserPrompt, /不论当前是 initial、auditor_revision 还是 efficacy_retry/)
  assert.match(reviserPrompt, /判断—转述—执行/)
  assert.match(reviserPrompt, /context\.styleSamples 只用于学习句法节奏/)
  assert.match(
    reviserPrompt,
    new RegExp(rolePipelineSecondaryKnowledge),
    'Reviser must retain manually selected secondary character knowledge',
  )
  assert.match(
    reviserPrompt,
    new RegExp(rolePipelineSecondaryFalseBelief),
    'Reviser must retain manually selected secondary character false belief',
  )

  const repairAuditorRuns = manifests.filter(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'local_repair_review'
  ))
  assert.equal(repairAuditorRuns.length, 1)
  assert.equal(repairAuditorRuns[0].canonCommitAllowed, false)
  const repairAuditorManifestIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'local_repair_review'
  ))
  const repairAuditorManifestPath = manifestPaths[repairAuditorManifestIndex]
  assert.ok(repairAuditorManifestPath, 'repair Auditor run manifest must exist')
  const repairAuditorPrompt = await readFile(path.join(path.dirname(repairAuditorManifestPath), 'prompt.txt'), 'utf8')
  assert.match(repairAuditorPrompt, /与 Reviser 分离/)
  assert.match(repairAuditorPrompt, /"repair"/)
  assert.match(repairAuditorPrompt, /verifiedPreservedFactIndexes/)
  assert.match(repairAuditorPrompt, /intentPreservationRequirements/)
  assert.match(repairAuditorPrompt, /author_intent/)
  assert.match(repairAuditorPrompt, /efficacy_retry/)
  assert.match(repairAuditorPrompt, /把同维度问题迁移到另一个块/)
  assert.match(repairAuditorPrompt, /判断—转述—执行/)
  assert.match(
    repairAuditorPrompt,
    new RegExp(rolePipelineSecondaryKnowledge),
    'Repair Auditor must retain manually selected secondary character knowledge',
  )
  assert.match(
    repairAuditorPrompt,
    new RegExp(rolePipelineSecondaryFalseBelief),
    'Repair Auditor must retain manually selected secondary character false belief',
  )

  const characterReviewResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'character_simulation_review',
      attempt: 'initial',
      payload: {
        request: {
          requestId: 'simulation-request:role-pipeline',
          characters: [{
            id: 'character:test',
            name: '测试人物',
            summary: '只在当前场景中接受一次临时排练。',
            state: rolePipelineCharacterState,
          }],
        },
        simulation: {
          requestId: 'simulation-request:role-pipeline',
          simulationRunId: 'mirofish-run:role-pipeline',
          evidence: [{
            id: 'evidence:interview',
            sourceArtifact: 'interviews',
            actorIds: ['character:test'],
            quote: '我会先说明风险，再让同伴共同决定。',
          }],
          characterCardProposals: [{
            id: 'character-proposal:test',
            characterId: 'character:test',
            evidenceIds: ['evidence:interview'],
          }],
          settingAssetProposals: [],
        },
      },
    }),
  })
  const characterReviewResponseText = await characterReviewResponse.text()
  assert.equal(characterReviewResponse.status, 200, characterReviewResponseText)
  const characterReviewResult = JSON.parse(characterReviewResponseText)
  assert.equal(characterReviewResult.decision, 'pass')
  assert.deepEqual(characterReviewResult.verifiedCharacterProposalIndexes, [0])

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const characterAuditorRuns = manifests.filter(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'character_simulation_review'
  ))
  assert.equal(characterAuditorRuns.length, 1)
  assert.equal(characterAuditorRuns[0].canonCommitAllowed, false)
  const characterAuditorManifestIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'character_simulation_review'
  ))
  const characterAuditorManifestPath = manifestPaths[characterAuditorManifestIndex]
  assert.ok(characterAuditorManifestPath, 'character-simulation Auditor manifest must exist')
  const characterAuditorPrompt = await readFile(path.join(path.dirname(characterAuditorManifestPath), 'prompt.txt'), 'utf8')
  assert.match(characterAuditorPrompt, /与 Reflector 分离/)
  assert.match(characterAuditorPrompt, /22 维人物状态语义/)
  assert.match(characterAuditorPrompt, /不是正文、不是正史、不是 Canon Patch/)

  const continuityResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'longform_continuity_review',
      attempt: 'initial',
      payload: {
        campaignId: 'continuity-campaign:role-pipeline',
        workId: 'work:test',
        windowStart: 1,
        windowEnd: 2,
        chapters: [
          { chapterNumber: 1, chapterId: 'chapter:1', blocks: [{ id: 'block:1', text: '第一章后果。' }] },
          { chapterNumber: 2, chapterId: 'chapter:2', blocks: [{ id: 'block:2', text: '第二章承受后果。' }] },
        ],
      },
    }),
  })
  const continuityResponseText = await continuityResponse.text()
  assert.equal(continuityResponse.status, 200, continuityResponseText)
  const continuityResult = JSON.parse(continuityResponseText)
  assert.equal(continuityResult.inspectedTransitions.length, 1)
  assert.equal(continuityResult.inspectedTransitions[0].status, 'pass')

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const continuityAuditorIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'longform_continuity_review'
  ))
  assert.ok(continuityAuditorIndex >= 0, 'long-form continuity Auditor manifest must exist')
  assert.equal(manifests[continuityAuditorIndex].canonCommitAllowed, false)
  const continuityPrompt = await readFile(
    path.join(path.dirname(manifestPaths[continuityAuditorIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(continuityPrompt, /逐一检查输入窗口内所有相邻章节/)
  assert.match(continuityPrompt, /双章逐字证据/)
  assert.match(continuityPrompt, /repairTargetChapter 必须是后章/)

  const continuityVerificationResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'longform_continuity_verification',
      attempt: 'initial',
      payload: {
        campaignId: 'continuity-verification:role-pipeline',
        workId: 'work:test',
        windowStart: 1,
        windowEnd: 2,
        chapters: [
          { chapterNumber: 1, chapterId: 'chapter:1', blocks: [{ id: 'block:1', text: '第一章后果。' }] },
          { chapterNumber: 2, chapterId: 'chapter:2', blocks: [{ id: 'block:2', text: '第二章承受后果。' }] },
        ],
        findings: [{
          dimension: 'causal_handoff',
          severity: 'revision_candidate',
          fromChapter: 1,
          toChapter: 2,
          sourceEvidenceQuote: '第一章后果',
          targetEvidenceQuote: '第二章承受后果',
          expected: '第二章需要清楚承受第一章已经形成的后果。',
          observed: '第二章对后果的承接存在一处可以局部澄清的歧义。',
          readerImpact: '读者可能无法稳定追踪前后章之间的因果变化。',
          diagnosis: '前后章因果交接需要独立复核。',
          repairTargetChapter: 2,
          repairDirection: '只在第二章局部澄清已到达的后果。',
          confidence: 'medium',
        }],
      },
    }),
  })
  const continuityVerificationText = await continuityVerificationResponse.text()
  assert.equal(continuityVerificationResponse.status, 200, continuityVerificationText)
  const continuityVerificationResult = JSON.parse(continuityVerificationText)
  assert.equal(continuityVerificationResult.items.length, 1)
  assert.equal(continuityVerificationResult.items[0].decision, 'verify')

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const continuityVerificationIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'longform_continuity_verification'
  ))
  assert.ok(continuityVerificationIndex >= 0, 'independent continuity verification manifest must exist')
  assert.equal(manifests[continuityVerificationIndex].canonCommitAllowed, false)
  const continuityVerificationPrompt = await readFile(
    path.join(path.dirname(manifestPaths[continuityVerificationIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(continuityVerificationPrompt, /与首轮连续性审阅分离/)
  assert.match(continuityVerificationPrompt, /不能升级/)
  assert.match(continuityVerificationPrompt, /必须 reject/)

  const directDraftResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'direct_scene_draft',
      attempt: 'initial',
      payload: {
        comparisonId: 'paired-literary:role-pipeline',
        commonBrief: '完成当前单场景，并让人物选择产生即时代价。',
        context: rolePipelinePayload.context,
      },
    }),
  })
  const directDraftText = await directDraftResponse.text()
  assert.equal(directDraftResponse.status, 200, directDraftText)
  assert.equal(JSON.parse(directDraftText).body.length > 2700, true)

  const pairedPayload = {
    comparisonId: 'paired-literary:role-pipeline',
    sharedContext: { commonBrief: '同一匿名写作任务' },
    candidateA: { blocks: [{ id: 'candidate_a:block:001', text: '候选甲证据，人物采取行动并承受代价。' }] },
    candidateB: { blocks: [{ id: 'candidate_b:block:001', text: '候选乙证据，人物采取行动并承受代价。' }] },
  }
  const pairedResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'paired_literary_comparison',
      attempt: 'initial',
      payload: pairedPayload,
    }),
  })
  const pairedText = await pairedResponse.text()
  assert.equal(pairedResponse.status, 200, pairedText)
  const pairedResult = JSON.parse(pairedText)
  assert.equal(pairedResult.dimensions.length, 11)
  assert.equal(pairedResult.compositeLiteraryScoreUsed, false)

  const pairedVerificationResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'paired_literary_comparison_verification',
      attempt: 'initial',
      payload: {
        ...pairedPayload,
        firstPassComparison: pairedResult,
      },
    }),
  })
  const pairedVerificationText = await pairedVerificationResponse.text()
  assert.equal(pairedVerificationResponse.status, 200, pairedVerificationText)
  const pairedVerificationResult = JSON.parse(pairedVerificationText)
  assert.equal(pairedVerificationResult.dimensions.every(item => item.decision === 'verify'), true)

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const directWriterIndex = manifests.findIndex(manifest => (
    manifest.role === 'Writer' && manifest.operation === 'direct_scene_draft'
  ))
  const pairedAuditorIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'paired_literary_comparison'
  ))
  const pairedVerificationAuditorIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'paired_literary_comparison_verification'
  ))
  assert.ok(directWriterIndex >= 0, 'direct Writer manifest must exist')
  assert.ok(pairedAuditorIndex >= 0, 'blind comparison Auditor manifest must exist')
  assert.ok(pairedVerificationAuditorIndex >= 0, 'blind verification Auditor manifest must exist')
  const directWriterPrompt = await readFile(
    path.join(path.dirname(manifestPaths[directWriterIndex]), 'prompt.txt'),
    'utf8',
  )
  const pairedAuditorPrompt = await readFile(
    path.join(path.dirname(manifestPaths[pairedAuditorIndex]), 'prompt.txt'),
    'utf8',
  )
  const pairedVerificationPrompt = await readFile(
    path.join(path.dirname(manifestPaths[pairedVerificationAuditorIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(directWriterPrompt, /没有场景建筑师、详细节拍表或修订反馈/)
  assert.match(pairedAuditorPrompt, /不知道、也不得猜测它们的生成路径/)
  assert.match(pairedAuditorPrompt, /不选“总冠军”/)
  assert.match(pairedVerificationPrompt, /第二位独立中文小说文学编辑/)
  assert.match(pairedVerificationPrompt, /不能静默替换偏好/)

  const longRangeThreadPayload = {
    campaignId: 'long-range-thread:role-pipeline',
    workId: 'work:test',
    focus: 'causal_state',
    fromChapter: 1,
    toChapter: 3,
    chapters: [
      { chapterNumber: 1, chapterId: 'chapter:1', blocks: [{ id: 'block:1', text: '第一章仍在洛兰营地。' }] },
      { chapterNumber: 2, chapterId: 'chapter:2', blocks: [{ id: 'block:2', text: '第二章整理补给。' }] },
      { chapterNumber: 3, chapterId: 'chapter:3', blocks: [{ id: 'block:3', text: '第三章准备出发。' }] },
    ],
  }
  const longRangeThreadResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'long_range_story_thread_review',
      attempt: 'initial',
      payload: longRangeThreadPayload,
    }),
  })
  const longRangeThreadText = await longRangeThreadResponse.text()
  assert.equal(longRangeThreadResponse.status, 200, longRangeThreadText)
  const longRangeThreadResult = JSON.parse(longRangeThreadText)
  assert.deepEqual(longRangeThreadResult.inspectedChapterNumbers, [1, 2, 3])
  assert.equal(longRangeThreadResult.threads[0].status, 'active')

  const longRangeThreadVerificationResponse = await fetch(`${baseUrl}/v1/creator-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'long_range_story_thread_verification',
      attempt: 'initial',
      payload: {
        ...longRangeThreadPayload,
        threads: longRangeThreadResult.threads,
        findings: longRangeThreadResult.findings,
      },
    }),
  })
  const longRangeThreadVerificationText = await longRangeThreadVerificationResponse.text()
  assert.equal(longRangeThreadVerificationResponse.status, 200, longRangeThreadVerificationText)
  const longRangeThreadVerificationResult = JSON.parse(longRangeThreadVerificationText)
  assert.equal(longRangeThreadVerificationResult.threadItems[0].decision, 'verify')

  manifestPaths = await findNamedFiles(logRoot, 'run-manifest.json')
  manifests = await Promise.all(manifestPaths.map(async manifestPath => JSON.parse(await readFile(manifestPath, 'utf8'))))
  const threadObserverIndex = manifests.findIndex(manifest => (
    manifest.role === 'Observer' && manifest.operation === 'long_range_story_thread_review'
  ))
  const threadAuditorIndex = manifests.findIndex(manifest => (
    manifest.role === 'Auditor' && manifest.operation === 'long_range_story_thread_verification'
  ))
  assert.ok(threadObserverIndex >= 0, 'long-range thread Observer manifest must exist')
  assert.ok(threadAuditorIndex >= 0, 'long-range thread Auditor manifest must exist')
  assert.equal(manifests[threadObserverIndex].canonCommitAllowed, false)
  assert.equal(manifests[threadAuditorIndex].canonCommitAllowed, false)
  const threadObserverPrompt = await readFile(
    path.join(path.dirname(manifestPaths[threadObserverIndex]), 'prompt.txt'),
    'utf8',
  )
  const threadAuditorPrompt = await readFile(
    path.join(path.dirname(manifestPaths[threadAuditorIndex]), 'prompt.txt'),
    'utf8',
  )
  assert.match(threadObserverPrompt, /完整阅读输入的已确认章节/)
  assert.match(threadObserverPrompt, /active 表示截至 toChapter 尚未看到明确推进或回收/)
  assert.match(threadAuditorPrompt, /与长程线索观察员分离/)
  assert.match(threadAuditorPrompt, /不得因为缺少后文就生成 finding/)

  console.log('[creator-working-agent-role-pipeline] PASS (Architect -> independent scene Auditor -> Writer gate; author-direction prose Auditor; bounded Auditor evidence repair; fail-closed author re-decision options; direct-vs-workflow blind comparison; independent comparison verification; selected causal and 22-dimension context; Normalizer repair; Reviser -> Auditor repair gate; Reflector -> Auditor rehearsal gate; adjacent continuity and long-range thread verification gates)')
} finally {
  if (!childOutput.exited) {
    bridge.kill('SIGTERM')
    await once(bridge, 'exit')
  }
  await rm(sandbox, { recursive: true, force: true })
}
