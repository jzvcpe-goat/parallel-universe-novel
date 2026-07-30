import { finalizeCandidateSearch } from './candidateSearch'
import { normalizeCharacterStatePath } from './characterState'
import { compileContextSnapshot } from './contextCompiler'
import {
  createLiteraryReview,
  evidenceForText,
  excerptHash,
} from './literaryReview'
import {
  buildLocalRepairIntentPreservationRequirements,
  localRepairIntentPreservationIssues,
} from './localRepairIntentPreservation'
import {
  createManualRecallAdherenceReceipt,
  manualRecallAdherenceViolations,
} from './manualRecallAdherence'
import {
  applySceneDraftToBlocks,
  countVisibleCharacters,
  createDraftResult,
  draftBlocksFromText,
} from './sceneDrafting'
import {
  assertDraftingAllowed,
  assertCandidateSearchAllowed,
  createEmptyIntent,
} from './stateMachine'
import { CreationDecisionError } from './types'
import type {
  AuthorIntentContract,
  CandidateAssessment,
  CanonStatePatch,
  ConflictMode,
  DraftBlock,
  InformationMode,
  IntentQuestion,
  LocalRepairCandidate,
  LocalRepairReview,
  LiteraryFinding,
  NarrativeCandidate,
  NarrativeBeat,
  SceneMechanismSignature,
  StatePatchOperation,
  WritingAgentCapabilities,
} from './types'

function stableId(prefix: string, value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}:${Math.abs(hash >>> 0).toString(36)}`
}

function evidenceQuoteContaining(text: string, anchors: string[]) {
  const positions = anchors.map(anchor => text.indexOf(anchor))
  if (positions.some(position => position < 0)) return null
  const start = Math.min(...positions)
  const end = Math.max(...positions.map((position, index) => position + anchors[index]!.length))
  return text.slice(start, end)
}

function sharedManualRecallEvidence(statement: string, blocks: DraftBlock[]) {
  const manuscript = blocks.map(block => block.text).join('\n')
  const chunks = statement.match(/[\p{Script=Han}A-Za-z0-9·]+/gu) || []
  for (const chunk of chunks.sort((left, right) => right.length - left.length)) {
    for (let length = Math.min(18, chunk.length); length >= 2; length -= 1) {
      for (let start = 0; start + length <= chunk.length; start += 1) {
        const quote = chunk.slice(start, start + length)
        if (manuscript.includes(quote)) return quote
      }
    }
  }
  return null
}

function intentQuestions(intent: AuthorIntentContract): IntentQuestion[] {
  const questions: IntentQuestion[] = []
  if (!intent.readerExperience.targetEmotion.trim() || !intent.narrativeDelta.mustChange.trim()) {
    questions.push({
      id: `${intent.id}:reader-experience`,
      fieldPath: 'readerExperience.targetEmotion',
      importance: 'blocking',
      question: '这一场结束时，你最希望读者确认哪种变化？',
      reason: '先固定读者体验，候选路径才不会只换措辞。',
      options: [
        {
          id: 'confirm-anomaly',
          label: '让核心异常变成不可否认的事实',
          consequence: '场景先兑现题材钩子，再把解释和终局答案留到后面。',
          patch: {
            readerExperience: {
              targetEmotion: '确认核心异常真实存在，并看见它开始改变人物处境',
              emotionalMovement: '从怀疑走向确信',
              intensity: 'restrained',
            },
            narrativeDelta: {
              mustChange: '核心异常必须通过一个可见后果得到证实',
            },
          },
        },
        {
          id: 'change-alignment',
          label: '让人物关系或阵营发生变化',
          consequence: '把题材钩子压到人物选择上，让变化产生后续债务。',
          patch: {
            readerExperience: {
              targetEmotion: '看见人物关系或阵营因选择而改变',
              emotionalMovement: '从观望走向紧张',
              intensity: 'explosive',
            },
            narrativeDelta: {
              mustChange: '至少一名人物必须因选择改变原有立场',
            },
          },
        },
      ],
      answeredBy: null,
    })
  }
  const informationPolicyIsEmpty = intent.informationPolicy.readerShouldKnow.length === 0
    && intent.informationPolicy.readerShouldSuspect.length === 0
    && intent.informationPolicy.charactersMustNotKnow.length === 0
    && intent.informationPolicy.delayedReveals.length === 0
  if (!intent.characterAgency.requiredChoice.trim() || informationPolicyIsEmpty) {
    questions.push({
      id: `${intent.id}:agency-information`,
      fieldPath: 'characterAgency.requiredChoice',
      importance: 'blocking',
      question: '谁必须作出选择，以及谁暂时不能知道真相？',
      reason: '人物选择和信息边界共同决定这一场如何成立。',
      options: [
        {
          id: 'act-before-explaining',
          label: '主角先行动，解释留到后果出现之后',
          consequence: '保留信息差，让选择先产生可见代价。',
          patch: {
            characterAgency: {
              requiredChoice: '在无法解释全部真相时先完成一个不可撤回的行动',
              expectedCost: '失去安全退路，并承担被误解的后果',
            },
            informationPolicy: {
              readerShouldKnow: ['主角已经作出选择，但完整原因仍未公开'],
              readerShouldSuspect: ['选择的真实代价将在后续到达'],
              charactersMustNotKnow: [{
                characterId: 'counterpart',
                information: '主角行动背后的完整原因',
              }],
              delayedReveals: ['行动背后的完整真相'],
            },
          },
        },
        {
          id: 'pay-visible-cost',
          label: '让主角当场支付一个看得见的代价',
          consequence: '减少抽象说明，用资源、关系或机会的损失证明选择。',
          patch: {
            characterAgency: {
              requiredChoice: '为了推进目标主动放弃一项现实资源或关系保障',
              expectedCost: '必须当场失去一项原本可以保住的东西',
            },
            informationPolicy: {
              readerShouldKnow: ['主角已经为选择付出第一笔代价'],
              readerShouldSuspect: ['更大的后果尚未完全出现'],
              charactersMustNotKnow: [{
                characterId: 'counterpart',
                information: '主角愿意付出的全部代价',
              }],
              delayedReveals: ['选择将引发的长期后果'],
            },
          },
        },
      ],
      answeredBy: null,
    })
  }
  return questions.slice(0, 2)
}

function candidateBeats(input: {
  candidateId: string
  actorId: string
  mechanism: string
  resistance: string
  cost: string
  informationChange: string
  endingAction: string
}): NarrativeBeat[] {
  return [
    {
      id: `${input.candidateId}:beat:1`,
      order: 1,
      purpose: '建立可见行动',
      actingCharacterId: input.actorId,
      action: input.mechanism,
      resistance: input.resistance,
      consequence: input.cost,
      informationChange: null,
      statePreconditions: ['人物拥有执行行动所需的时间和资源'],
      stateEffects: ['关系位置开始变化'],
    },
    {
      id: `${input.candidateId}:beat:2`,
      order: 2,
      purpose: '让阻力实际作用',
      actingCharacterId: input.actorId,
      action: `行动受阻后，人物换一种方式继续：${input.mechanism}`,
      resistance: input.resistance,
      consequence: input.cost,
      informationChange: input.informationChange,
      statePreconditions: ['信息边界仍然成立'],
      stateEffects: ['选择成本进入场景'],
    },
    {
      id: `${input.candidateId}:beat:3`,
      order: 3,
      purpose: '形成场景压力差',
      actingCharacterId: input.actorId,
      action: input.endingAction,
      resistance: '信息边界迫使人物不能解释完整原因',
      consequence: `选择已经发生，${input.cost}`,
      informationChange: input.informationChange,
      statePreconditions: ['结尾不能提前解决全部冲突'],
      stateEffects: ['创建后续兑现承诺'],
    },
  ]
}

interface ReferenceCandidateProfile {
  conflictMode: ConflictMode
  informationMode: InformationMode
  costType: string
  pacing: 'compressed' | 'balanced' | 'slow_burn'
  title: string
  mechanism: string
  resistance: string
  cost: string
  info: string
  endingAction: string
  mechanismSignature: SceneMechanismSignature
}

function compactIntentText(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact ? compact.slice(0, 96) : fallback
}

function runtimeInformationBoundaryText(
  boundary: AuthorIntentContract['informationPolicy']['charactersMustNotKnow'][number] | string | undefined,
) {
  if (typeof boundary === 'string') return boundary.trim()
  return boundary?.information?.trim() || ''
}

function candidateProfilesFor(intent: AuthorIntentContract): ReferenceCandidateProfile[] {
  const choice = compactIntentText(
    intent.characterAgency.requiredChoice,
    intent.narrativeDelta.mustChange || '让核心异常产生一个可见后果',
  )
  const opposition = compactIntentText(
    intent.characterAgency.opposingForce,
    '眼前局势和既有承诺同时阻止这个选择',
  )
  const cost = compactIntentText(
    intent.characterAgency.expectedCost || intent.narrativeDelta.irreversibleChange || '',
    '人物失去一条原本安全的退路',
  )
  const delayedTruth = compactIntentText(
    runtimeInformationBoundaryText(intent.informationPolicy.charactersMustNotKnow[0])
      || intent.informationPolicy.delayedReveals[0]
      || intent.narrativeDelta.mustNotResolve[0]
      || '',
    '完整原因仍不能被所有在场人物知道',
  )
  const requiredChange = compactIntentText(intent.narrativeDelta.mustChange, choice)

  const profiles: ReferenceCandidateProfile[] = [
    {
      conflictMode: 'concealment',
      informationMode: 'delayed_reveal',
      costType: cost,
      pacing: 'balanced',
      title: '安静完成选择',
      mechanism: choice,
      resistance: opposition,
      cost,
      info: delayedTruth,
      endingAction: `用一个不可撤回的动作证明：${requiredChange}`,
      mechanismSignature: {
        pressureSource: 'information',
        conflictEngine: 'infiltration',
        agencyPattern: 'concealment',
        costPattern: 'exposure',
        endingPattern: 'consequence_arrives',
      },
    },
    {
      conflictMode: 'misalignment',
      informationMode: 'dramatic_irony',
      costType: cost,
      pacing: 'slow_burn',
      title: '让阻力当场反咬',
      mechanism: `人物尝试完成“${choice}”，却被“${opposition}”迫使改变方法`,
      resistance: `阻力主动升级：${opposition}`,
      cost,
      info: `读者先看见选择，场内人物仍误读：${delayedTruth}`,
      endingAction: `人物留下能证明“${requiredChange}”的痕迹，却无法立刻解释`,
      mechanismSignature: {
        pressureSource: 'relationship',
        conflictEngine: 'negotiation',
        agencyPattern: 'improvisation',
        costPattern: 'trust_loss',
        endingPattern: 'relationship_shift',
      },
    },
    {
      conflictMode: 'sacrifice',
      informationMode: 'partial_reveal',
      costType: cost,
      pacing: 'compressed',
      title: '先支付选择的代价',
      mechanism: `人物先失去“${cost}”，才换来完成“${choice}”的机会`,
      resistance: opposition,
      cost,
      info: `只揭示代价，不揭示：${delayedTruth}`,
      endingAction: `让“${cost}”以物件、关系或机会的损失落地`,
      mechanismSignature: {
        pressureSource: 'resource',
        conflictEngine: 'sacrifice',
        agencyPattern: 'sacrifice',
        costPattern: 'resource_loss',
        endingPattern: 'irreversible_loss',
      },
    },
    {
      conflictMode: 'confrontation',
      informationMode: 'direct_reveal',
      costType: cost,
      pacing: 'compressed',
      title: '把冲突推到台前',
      mechanism: `人物公开执行“${choice}”，迫使阻力正面回应`,
      resistance: opposition,
      cost,
      info: `直接释放部分信息，同时保护：${delayedTruth}`,
      endingAction: `让对抗当场改变局势：${requiredChange}`,
      mechanismSignature: {
        pressureSource: 'opponent',
        conflictEngine: 'combat',
        agencyPattern: 'command',
        costPattern: 'position_loss',
        endingPattern: 'opponent_gain',
      },
    },
    {
      conflictMode: 'reversal',
      informationMode: 'false_belief',
      costType: cost,
      pacing: 'slow_burn',
      title: '用误判完成反转',
      mechanism: `人物表面顺从“${opposition}”，实际借此完成“${choice}”`,
      resistance: `对手因错误判断暂时放松警惕，但代价仍由人物承担`,
      cost,
      info: `读者先发现真实选择，其他人物仍相信错误解释：${delayedTruth}`,
      endingAction: `用一个双重含义的动作证明：${requiredChange}`,
      mechanismSignature: {
        pressureSource: 'information',
        conflictEngine: 'revelation',
        agencyPattern: 'bargain',
        costPattern: 'obligation',
        endingPattern: 'question_opened',
      },
    },
  ]
  const direction = intent.sceneMechanismDirection
  if (!direction) return profiles
  return [
    {
      ...profiles[0],
      title: direction.label,
      mechanism: direction.proposedAdjustment,
      cost: direction.tradeoff,
      endingAction: direction.whyItBreaksRepetition,
      mechanismSignature: direction.expectedMechanismSignature,
    },
    ...profiles.filter(profile => (
      JSON.stringify(profile.mechanismSignature) !== JSON.stringify(direction.expectedMechanismSignature)
    )),
  ].slice(0, 3)
}

const candidateAssessments: Array<Omit<CandidateAssessment, 'candidateId'>> = [
  { intentFit: 5, characterAgency: 5, tensionPotential: 3, informationControl: 5, continuitySafety: 5, freshness: 3, futureDebtFitness: 4 },
  { intentFit: 4, characterAgency: 4, tensionPotential: 4, informationControl: 5, continuitySafety: 4, freshness: 4, futureDebtFitness: 5 },
  { intentFit: 5, characterAgency: 4, tensionPotential: 4, informationControl: 4, continuitySafety: 5, freshness: 5, futureDebtFitness: 3 },
  { intentFit: 2, characterAgency: 5, tensionPotential: 5, informationControl: 2, continuitySafety: 2, freshness: 4, futureDebtFitness: 3 },
  { intentFit: 4, characterAgency: 4, tensionPotential: 3, informationControl: 4, continuitySafety: 3, freshness: 5, futureDebtFitness: 5 },
]

function sceneClause(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[。！？!?；;，,：:]+$/u, '')
    .trim()
}

function paragraphForBeat(beat: NarrativeBeat, index: number) {
  const action = sceneClause(beat.action)
  const resistance = sceneClause(beat.resistance)
  const consequence = sceneClause(beat.consequence)
  const hasInformationChange = Boolean(beat.informationChange?.trim())

  if (index === 0) {
    return `${action}。${resistance}逼近时，${consequence}。人物只能继续把选择做完，不能停下来解释。`
  }

  if (index === 1) {
    const informationSentence = hasInformationChange
      ? '与此同时，动作留下了可见后果，完整原因仍没有被任何人说破。'
      : ''
    return `${resistance}真正落到眼前。${action}。${consequence}。${informationSentence}`
  }

  const informationSentence = hasInformationChange
    ? '线索停在能够被怀疑、还不能被证实的位置。'
    : ''
  return `${action}。${consequence}。${informationSentence}场景停在新后果已经到达、旧问题仍不能退回的位置。`
}

function finding(input: Omit<LiteraryFinding, 'status'>): LiteraryFinding {
  return { ...input, status: 'active' }
}

function firstEvidence(blocks: DraftBlock[]) {
  const block = blocks.find(item => item.text.trim())
  if (!block) return null
  const excerpt = block.text.slice(0, Math.min(24, block.text.length))
  return {
    block,
    evidence: {
      blockId: block.id,
      startOffset: 0,
      endOffset: excerpt.length,
      excerptHash: excerptHash(excerpt),
    },
  }
}

function firstMatchingEvidence(blocks: DraftBlock[], phrases: string[]) {
  for (const phrase of phrases) {
    const block = blocks.find(item => item.text.includes(phrase))
    if (!block) continue
    const evidence = evidenceForText(block, phrase)
    if (evidence) return { block, phrase, evidence }
  }
  return null
}

const genericIntentSignals = new Set([
  '这一', '一场', '本场', '本章', '主角', '人物', '读者', '选择', '必须', '不能', '不得',
  '一个', '已经', '需要', '当前', '场景', '开始', '发生', '通过', '得到', '之后', '之前',
])

function intentSignalNgrams(source: string) {
  const chunks = source
    .replace(/[，。；：、！？!?\s]/gu, ' ')
    .replace(/(?:这一场|这一章|本场|本章|主角|人物|读者|必须|不能|不得|不要|暂不|需要|已经|当前|通过|得到|开始|发生|一个|在|把|并|而|又|但|与|和|为|是|要|将|的|了)/gu, ' ')
    .match(/[\u3400-\u9fff]{2,}/gu) || []
  const signals: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= 8) signals.push(chunk)
    const maximumWidth = Math.min(4, chunk.length)
    for (let width = maximumWidth; width >= 2; width -= 1) {
      for (let index = 0; index <= chunk.length - width; index += 1) {
        signals.push(chunk.slice(index, index + width))
      }
    }
  }
  return Array.from(new Set(signals.filter(signal => !genericIntentSignals.has(signal))))
}

function assertLiteraryReviewIntentCompatibility(intent: AuthorIntentContract) {
  const runtimeIntent = intent as Partial<AuthorIntentContract>
  const informationPolicy = runtimeIntent.informationPolicy as Partial<AuthorIntentContract['informationPolicy']> | undefined
  const boundaries = runtimeIntent.boundaries as Partial<AuthorIntentContract['boundaries']> | undefined
  const characterAgency = runtimeIntent.characterAgency as Partial<AuthorIntentContract['characterAgency']> | undefined
  const narrativeDelta = runtimeIntent.narrativeDelta as Partial<AuthorIntentContract['narrativeDelta']> | undefined
  const issues = [
    !Array.isArray(informationPolicy?.charactersMustNotKnow) && 'informationPolicy.charactersMustNotKnow',
    !Array.isArray(boundaries?.requiredElements) && 'boundaries.requiredElements',
    (!runtimeIntent.fieldSources || typeof runtimeIntent.fieldSources !== 'object') && 'fieldSources',
    typeof characterAgency?.primaryActorId !== 'string' && 'characterAgency.primaryActorId',
    typeof narrativeDelta?.mustChange !== 'string' && 'narrativeDelta.mustChange',
  ].filter((issue): issue is string => Boolean(issue))
  if (issues.length === 0) return
  throw new CreationDecisionError(
    'intent_incomplete',
    `Literary review requires a current author intent contract; missing or invalid: ${issues.join(', ')}.`,
    { issues },
  )
}

export function matchAuthorIntentSignals(intent: AuthorIntentContract, manuscript: string) {
  assertLiteraryReviewIntentCompatibility(intent)
  const source = intent.boundaries.requiredElements.join(' ')
  const requiredSignals = intentSignalNgrams(source)
  return {
    requiredSignals,
    matchedSignals: requiredSignals.filter(signal => manuscript.includes(signal)),
  }
}

function hasAuthorExplicitIntent(intent: AuthorIntentContract) {
  assertLiteraryReviewIntentCompatibility(intent)
  return Object.values(intent.fieldSources).some(source => source === 'author_explicit')
}

export const referenceWritingAgent: WritingAgentCapabilities = {
  async buildContextSnapshot(input) {
    return compileContextSnapshot(input)
  },

  async proposeIntentContract(input) {
    const base = createEmptyIntent({
      sessionId: input.session.id,
      revision: input.session.currentIntentRevision + 1,
      primaryActorId: input.seed.characterAgency?.primaryActorId || 'protagonist',
    })
    const intent: AuthorIntentContract = {
      ...base,
      readerExperience: { ...base.readerExperience, ...input.seed.readerExperience },
      narrativeDelta: { ...base.narrativeDelta, ...input.seed.narrativeDelta },
      characterAgency: { ...base.characterAgency, ...input.seed.characterAgency },
      informationPolicy: { ...base.informationPolicy, ...input.seed.informationPolicy },
      boundaries: { ...base.boundaries, ...input.seed.boundaries },
      sceneMechanismDirection: input.seed.sceneMechanismDirection,
      fieldSources: input.seed.fieldSources || {},
      agentAssumptions: input.seed.agentAssumptions || [],
      lockedFields: input.seed.lockedFields || [],
      unresolvedQuestions: [],
    }
    return { ...intent, unresolvedQuestions: intentQuestions(intent) }
  },

  async generateCandidates(input) {
    assertCandidateSearchAllowed({ session: input.session, intent: input.intent })
    const actorId = input.intent.characterAgency.primaryActorId
    const profiles = candidateProfilesFor(input.intent)
    const rawCandidates: NarrativeCandidate[] = profiles.map((profile, index) => {
      const candidateId = stableId('narrative-candidate', `${input.session.id}:${input.intent.revision}:${index}`)
      return {
        schemaVersion: 'narrative-candidate.v1',
        id: candidateId,
        sessionId: input.session.id,
        intentRevision: input.intent.revision,
        contextSnapshotId: input.context.id,
        revision: input.session.currentCandidateRevision + 1,
        status: 'active',
        title: profile.title,
        oneSentenceMechanism: profile.mechanism,
        mechanismSignature: profile.mechanismSignature,
        strategyAxes: {
          conflictMode: profile.conflictMode,
          informationMode: profile.informationMode,
          agencyOwnerId: actorId,
          costType: profile.costType,
          pacing: profile.pacing,
          viewpointId: actorId,
        },
        beats: candidateBeats({
          candidateId,
          actorId,
          mechanism: profile.mechanism,
          resistance: profile.resistance,
          cost: profile.cost,
          informationChange: profile.info,
          endingAction: profile.endingAction,
        }),
        projectedEffects: {
          stateChanges: [],
          irreversibleChanges: [profile.cost],
          promisesCreated: ['选择的后果将在后续场景到达'],
          promisesConsumed: [],
          futureDebts: [profile.info],
          characterCosts: [profile.cost],
        },
        tradeoffs: {
          strengths: [profile.mechanism],
          risks: [profile.cost],
          clicheRisks: index === 3 ? ['直接摊牌可能过早消耗信息错位'] : [],
          uncertainties: ['具体动作需要作者结合当前正文确认'],
        },
        validation: {
          hardConstraintPassed: profile.informationMode !== 'direct_reveal'
            || input.intent.informationPolicy.charactersMustNotKnow.length === 0,
          violations: profile.informationMode === 'direct_reveal'
            && input.intent.informationPolicy.charactersMustNotKnow.length > 0
              ? ['information_boundary_violation']
              : [],
        },
      }
    })
    const assessments = rawCandidates.map((candidate, index) => ({
      candidateId: candidate.id,
      ...candidateAssessments[index],
    }))
    return finalizeCandidateSearch({ rawCandidates, assessments, context: input.context })
  },

  async draftScene(input) {
    assertDraftingAllowed({
      session: input.session,
      intent: input.intent,
      selectedCandidate: input.candidate,
      request: input.request,
    })
    const selectedBeatIds = input.request.scope.type === 'selected_beats'
      ? new Set(input.request.scope.beatIds)
      : null
    const beats = selectedBeatIds
      ? input.candidate.beats.filter(beat => selectedBeatIds.has(beat.id))
      : input.candidate.beats
    const generatedText = beats.map(paragraphForBeat).join('\n\n').slice(0, input.request.targetLength.maximum)
    const generatedBlocks = draftBlocksFromText(generatedText)
    const contentBlocks = input.request.scope.type === 'selected_text'
      ? applySceneDraftToBlocks({
          currentBlocks: input.currentBlocks,
          generatedBlocks,
          request: input.request,
        })
      : input.request.writingMode === 'continue_author_text'
        ? [...input.currentBlocks, ...generatedBlocks]
        : applySceneDraftToBlocks({
            currentBlocks: input.currentBlocks,
            generatedBlocks,
            request: input.request,
          })
    const evidenceBlockId = generatedBlocks[0]?.id
    const actorState = input.context.activeCharacters
      .find(character => character.id === input.intent.characterAgency.primaryActorId)
      ?.state
    const currentRelationshipPosition = actorState?.relationshipStances || actorState?.relationshipPosition
    const observedStateChanges: StatePatchOperation[] = []
    if (evidenceBlockId) {
      observedStateChanges.push({
          op: currentRelationshipPosition === undefined ? 'add' as const : 'replace' as const,
          path: normalizeCharacterStatePath(
            `/characters/${input.intent.characterAgency.primaryActorId}/relationshipStances`,
          ),
          ...(currentRelationshipPosition === undefined
            ? {}
            : { expectedPreviousValue: currentRelationshipPosition }),
          value: 'withdrawing',
          evidenceBlockIds: [evidenceBlockId],
          reason: input.intent.narrativeDelta.mustChange,
          irreversible: Boolean(input.intent.narrativeDelta.irreversibleChange),
      })
      const informationBoundary = input.intent.informationPolicy.charactersMustNotKnow[0]
        || input.intent.informationPolicy.delayedReveals[0]
      if (informationBoundary) {
        const statement = typeof informationBoundary === 'string'
          ? informationBoundary
          : informationBoundary.information
        observedStateChanges.push({
          op: 'add',
          path: `/world/informationBoundaries/${stableId('boundary', statement)}/status`,
          value: 'withheld',
          evidenceBlockIds: [evidenceBlockId],
          reason: `本场继续保留信息边界：${statement}`,
          irreversible: false,
        })
      }
      const recalledPromise = input.context.manualRecallItems.find(item => item.group === 'promise')
      if (recalledPromise) {
        observedStateChanges.push({
          op: 'add',
          path: `/promises/${stableId('reader-promise', recalledPromise.sourceId)}/status`,
          value: 'advanced',
          evidenceBlockIds: [evidenceBlockId],
          reason: recalledPromise.statement,
          irreversible: false,
        })
      }
    }
    return createDraftResult({
      request: input.request,
      contentBlocks,
      observedStateChanges,
    })
  },

  async reviewDraft(input) {
    assertLiteraryReviewIntentCompatibility(input.intent)
    const findings: LiteraryFinding[] = []
    const deterministicViolations: string[] = []
    const blocks = input.draft.contentBlocks
    const allText = blocks.map(block => block.text).join('\n')

    for (const boundary of input.intent.informationPolicy.charactersMustNotKnow) {
      const information = runtimeInformationBoundaryText(boundary)
      if (!information) continue
      const directPhrases = [information]
      if (information.includes('离开')) directPhrases.push('我要离开', '我会离开', '决定离开')
      for (const phrase of directPhrases) {
        const block = blocks.find(item => item.text.includes(phrase))
        if (!block) continue
        const evidence = evidenceForText(block, phrase)
        if (!evidence) continue
        findings.push(finding({
          id: stableId('finding', `${input.draft.draftId}:information:${block.id}:${phrase}`),
          dimension: 'information_control',
          severity: 'hard_block',
          evidence: [evidence],
          expected: `${typeof boundary === 'string' ? '受限人物' : boundary.characterId}在本场结束前仍不能知道：${information}`,
          observed: `正文直接释放了“${phrase}”。`,
          readerImpact: '既定的信息错位提前消失，后续发现失去作用。',
          diagnosis: '人物知识边界与正文证据冲突。',
          repairDirection: '只改写这一处表达，让读者从行动确认变化，而不是让人物直接宣告。',
          protectedBlockIds: [],
          confidence: 'high',
        }))
        break
      }
    }

    const duplicate = blocks.find((block, index) => blocks.some((other, otherIndex) => (
      index !== otherIndex && block.text.trim().length > 12 && block.text.trim() === other.text.trim()
    )))
    if (duplicate) {
      const evidence = evidenceForText(duplicate, duplicate.text)
      if (evidence) findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:repetition:${duplicate.id}`),
        dimension: 'repetition',
        severity: 'revision_candidate',
        evidence: [evidence],
        expected: '相邻场景动作应继续推进，而不是复述同一段表达。',
        observed: '出现完全相同的段落。',
        readerImpact: '推进感停滞。',
        diagnosis: '表达重复，不是题材节拍本身的问题。',
        repairDirection: '只替换重复段落，保留已成立事实。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const shortEvidence = firstEvidence(blocks)
    const visibleLength = countVisibleCharacters(allText)
    if (shortEvidence && visibleLength < 1200) {
      findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:scene-length:${visibleLength}`),
        dimension: 'tension',
        severity: 'revision_candidate',
        evidence: [shortEvidence.evidence],
        expected: '当前章节场景应形成完整的目标、阻力升级、选择、代价和段尾新压力。',
        observed: `当前正文只有约 ${visibleLength} 个非空白可见字符，尚不足以承载完整场景因果。`,
        readerImpact: '冲突刚出现就结束，人物选择和后果没有获得足够篇幅落地。',
        diagnosis: '这是未完成场景，不应被当作可发布章节。',
        repairDirection: '沿当前动作继续补足阻力升级、一次信息转折和后果到达，不重写已有段落。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const templateEvidence = firstMatchingEvidence(blocks, [
      '主角整理并带走只属于自己的物品',
      '旧关系和既有承诺仍在拉扯人物',
      '对方的习惯性反应制造误判',
      '人物以一个具体动作结束场景',
    ])
    if (templateEvidence) {
      findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:template:${templateEvidence.block.id}:${templateEvidence.phrase}`),
        dimension: 'freshness',
        severity: 'revision_candidate',
        evidence: [templateEvidence.evidence],
        expected: '正文动作应来自本章人物、地点、物件与锁定意图。',
        observed: `正文使用了可跨题材复用的抽象动作：“${templateEvidence.phrase}”。`,
        readerImpact: '人物和世界失去辨识度，作者刚确认的故事种子没有进入现场。',
        diagnosis: '参考模板泄漏到正文。',
        repairDirection: '只替换证据所在句，改成当前人物使用当前物件、受当前规则阻碍的具体动作。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const metaNarrationEvidence = firstMatchingEvidence(blocks, [
      '本章将',
      '这一章将',
      '接下来的剧情',
      '读者会看到',
    ])
    if (metaNarrationEvidence) {
      findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:meta-narration:${metaNarrationEvidence.block.id}:${metaNarrationEvidence.phrase}`),
        dimension: 'exposition',
        severity: 'revision_candidate',
        evidence: [metaNarrationEvidence.evidence],
        expected: '正文应让情节通过现场行动、感官和人物反应发生。',
        observed: `正文直接向读者说明创作安排：“${metaNarrationEvidence.phrase}”。`,
        readerImpact: '叙事现场被创作说明打断，读者被拉出故事。',
        diagnosis: '元叙事说明进入了候选正文。',
        repairDirection: '只替换证据所在句，把说明改成当前场景中可观察的动作或后果。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const overusedPhrase = [
      '与此同时',
      '就在这时',
      '下一刻',
      '不由得',
      '心中一动',
      '眼中闪过',
    ].find(phrase => allText.split(phrase).length - 1 >= 3)
    if (overusedPhrase) {
      const overusedEvidence = firstMatchingEvidence(blocks, [overusedPhrase])
      if (overusedEvidence) findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:overused-phrase:${overusedPhrase}`),
        dimension: 'freshness',
        severity: 'revision_candidate',
        evidence: [overusedEvidence.evidence],
        expected: '转场和反应应由具体动作节奏承担，不连续依赖同一连接短语。',
        observed: `“${overusedPhrase}”在当前正文中出现 ${allText.split(overusedPhrase).length - 1} 次。`,
        readerImpact: '句式节奏机械，人物反应趋同。',
        diagnosis: '同一模板短语被重复用作叙事推进器。',
        repairDirection: '只处理重复出现的连接句，保留场景事实与已成立动作。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const intentSignals = matchAuthorIntentSignals(input.intent, allText)
    if (
      shortEvidence
      && hasAuthorExplicitIntent(input.intent)
      && intentSignals.requiredSignals.length >= 2
      && intentSignals.matchedSignals.length === 0
    ) {
      findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:intent-drift`),
        dimension: 'genre_fulfillment',
        severity: 'hard_block',
        evidence: [shortEvidence.evidence],
        expected: '正文应承接作者已锁定的故事种子、人物与关键动作。',
        observed: '证据段落没有出现任何已锁定的题材、人物或冲突信号。',
        readerImpact: '候选虽然语句通顺，却属于另一场故事。',
        diagnosis: '生成结果偏离作者意图。',
        repairDirection: '拒绝当前候选，重新生成当前场景；不要局部润色掩盖整体偏题。',
        protectedBlockIds: [],
        confidence: 'high',
      }))
    }

    const evidence = firstEvidence(blocks)
    if (evidence && !/[，。！？；]/.test(allText)) {
      findings.push(finding({
        id: stableId('finding', `${input.draft.draftId}:voice`),
        dimension: 'voice',
        severity: 'taste_note',
        evidence: [evidence.evidence],
        expected: '句间节奏应当让读者感到动作和余波的层次。',
        observed: '当前段落缺少可辨认的节奏停顿。',
        readerImpact: '长段阅读容易失去重心。',
        diagnosis: '这是表达选择，不是事实错误。',
        repairDirection: '作者可选择拆句；不阻断正史确认。',
        protectedBlockIds: [],
        confidence: 'medium',
      }))
    }

    for (const operation of input.draft.observedStateChanges) {
      if (!operation.evidenceBlockIds.every(blockId => blocks.some(block => block.id === blockId))) {
        deterministicViolations.push(`state_patch_evidence_missing:${operation.path}`)
      }
    }
    const manualRecallAdherence = input.context.manualRecallItems.length
      ? createManualRecallAdherenceReceipt({
          review: {
            schemaVersion: 'creator-manual-recall-adherence-review.v1',
            decision: input.context.manualRecallItems.every(item => (
              Boolean(sharedManualRecallEvidence(item.statement, blocks))
            )) ? 'pass' : 'reject',
            checks: input.context.manualRecallItems.map(item => {
              const quote = sharedManualRecallEvidence(item.statement, blocks)
              return {
                sourceId: item.sourceId,
                group: item.group,
                status: quote ? 'respected' as const : 'omitted' as const,
                evidenceQuotes: quote ? [quote] : [],
                diagnosis: quote
                  ? '当前正文包含可逐字定位的召回承接证据。'
                  : '当前正文没有可定位证据证明这张记忆卡已被承接。',
              }
            }),
            rationale: '本机参考审阅只依据当前正文中的逐字重合证据判断，不推断隐含遵循。',
          },
          selectedRecallItems: input.context.manualRecallItems,
          draftBlocks: blocks,
        })
      : undefined
    if (manualRecallAdherence) {
      deterministicViolations.push(...manualRecallAdherenceViolations(manualRecallAdherence))
    }
    return createLiteraryReview({
      id: stableId('literary-review', `${input.draft.draftId}:${input.draft.revision}`),
      sessionId: input.session.id,
      context: input.context,
      draft: input.draft,
      findings,
      manualRecallAdherence,
      requestedFocusDimensions: input.focusDimensions,
      deterministicViolations,
    })
  },

  async proposeRepair(input): Promise<LocalRepairCandidate> {
    const evidence = input.finding.evidence.find(item => item.blockId === input.targetBlock.id)
    if (!evidence) {
      throw new CreationDecisionError('evidence_missing', 'The local repair target must contain the reviewed evidence.')
    }
    const evidenceText = input.targetBlock.text.slice(evidence.startOffset, evidence.endOffset).trim()
    if (!evidenceText) {
      throw new CreationDecisionError('evidence_missing', 'The local repair evidence must resolve to current manuscript text.')
    }
    const findingDimension = 'dimension' in input.finding
      ? input.finding.dimension
      : input.finding.lensId
    const replacement = findingDimension === 'repetition'
      ? '她没有重复先前的动作，只把未出口的话压回喉间，转身去承担已经做出的选择。'
      : findingDimension === 'information_control'
        ? '她没有解释，只把已经做出的选择落实在动作里。'
        : findingDimension === 'exposition'
          ? '门外的脚步骤然停住，桌上那盏灯同时暗了一层。'
          : '她停了一瞬，随即用一个更明确的动作承接了前面的选择。'
    const proposedContent = findingDimension === 'repetition'
      ? replacement
      : `${input.targetBlock.text.slice(0, evidence.startOffset)}${replacement}${input.targetBlock.text.slice(evidence.endOffset)}`
    const intentRequirements = buildLocalRepairIntentPreservationRequirements({
      intent: input.intent,
      targetBlockText: input.targetBlock.text,
    })
    const preservedFacts = intentRequirements.flatMap(requirement => {
      const candidateEvidenceQuote = evidenceQuoteContaining(proposedContent, requirement.requiredAnchors)
      return candidateEvidenceQuote
        ? [{
            fact: requirement.statement,
            sourceEvidenceQuote: requirement.sourceEvidenceQuote,
            candidateEvidenceQuote,
          }]
        : []
    })
    if (preservedFacts.length === 0) {
      const sourceEvidenceQuote = input.targetBlock.text.slice(evidence.endOffset).trim()
        || input.targetBlock.text.slice(0, evidence.startOffset).trim()
        || evidenceText
      const candidateEvidenceQuote = proposedContent.includes(sourceEvidenceQuote)
        ? sourceEvidenceQuote
        : replacement
      preservedFacts.push({
        fact: '证据段中不属于修订目标的叙事信息保持可定位。',
        sourceEvidenceQuote,
        candidateEvidenceQuote,
      })
    }

    return {
      schemaVersion: 'creator-local-repair.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      operation: 'replace_range',
      proposedContent,
      preservedFacts,
      rationale: `只替换证据所在段，处理“${input.finding.diagnosis}”，不改动其他正文块。`,
    }
  },

  async reviewRepair(input): Promise<LocalRepairReview> {
    const issues = localRepairIntentPreservationIssues({
      candidate: input.repair,
      requirements: buildLocalRepairIntentPreservationRequirements({
        intent: input.intent,
        targetBlockText: input.targetBlock.text,
      }),
    })
    if (input.repair.findingId !== input.finding.id || input.repair.targetBlockId !== input.targetBlock.id) {
      issues.push({
        dimension: 'scope',
        severity: 'hard_block',
        sourceEvidenceQuote: input.targetBlock.text,
        candidateEvidenceQuote: input.repair.proposedContent,
        diagnosis: '局部候选与当前审阅证据块不一致。',
      })
    }
    if (!input.repair.proposedContent.trim() || input.repair.proposedContent === input.targetBlock.text) {
      issues.push({
        dimension: 'repair_goal',
        severity: 'hard_block',
        sourceEvidenceQuote: input.targetBlock.text,
        candidateEvidenceQuote: input.repair.proposedContent || null,
        diagnosis: '局部候选没有形成可验证的正文变化。',
      })
    }
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: issues.some(issue => issue.severity === 'hard_block') ? 'reject' : 'pass',
      verifiedPreservedFactIndexes: input.repair.preservedFacts.map((_, index) => index),
      issues,
      rationale: issues.length
        ? '局部候选未通过确定性范围与作者意图检查。'
        : '局部候选只改动当前证据块，且没有缩窄已锁定作者意图。',
    }
  },

  async proposeCanonPatch(input): Promise<CanonStatePatch> {
    return {
      schemaVersion: 'canon-state-patch.v1',
      id: stableId('canon-patch', `${input.session.id}:${input.draft.draftId}:${input.draft.revision}`),
      sessionId: input.session.id,
      workId: input.session.workId,
      chapterId: input.session.chapterId,
      baseCanonRevision: input.session.baseCanonRevision,
      sourceDraftRevision: input.draft.revision,
      status: 'proposed',
      operations: input.draft.observedStateChanges,
      createdAt: new Date().toISOString(),
    }
  },
}
