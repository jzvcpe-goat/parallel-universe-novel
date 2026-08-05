import type {
  DraftBlock,
  ManualRecallAdherenceStatus,
} from './types'

const minimumExactEvidenceLength = 6
const contradictionAnchorLength = 2
const negationTokens = [
  '不存在',
  '已经不在',
  '并不在',
  '不在',
  '没有',
  '并无',
  '未曾',
  '从未',
  '不再',
  '并未',
  '无从',
  '不能',
  '不可',
]
const clauseBoundaryPattern = /[。！？!?；;，,：:]/u
const reportedAssertionPattern = /(?:据说|听说|传言|传闻|根据传闻|相传|有人说|[\p{Script=Han}A-Za-z0-9·]{1,16}(?:说|表示|提到|写道|写着|记载|声称|宣称|断言|转述))[\s，,：:“”"'《》]*$/u
const hypotheticalAssertionPattern = /(?:^|[，,；;：:])(?:如果|假如|假设|倘若|若|要是|只要|除非|无论|即使|哪怕|万一|若要)/u
const rhetoricalAssertionPattern = /(?:谁(?:会|能|都不会)?相信|难道|莫非|岂(?:会|能)|怎会|怎么可能|何曾|不能说|不会相信)/u
const postposedRejectionPattern = /(?:不属实|并非事实|不是真的|是假的|只是谎言|荒唐的说法|否认了?(?:此事|这件事|这一点)|这(?:句)?话纯属杜撰|纯属杜撰)/u
const ignoredContradictionAnchors = new Set([
  '必须',
  '始终',
  '直到',
  '才能',
  '任何',
  '有关',
  '内部',
  '当前',
  '已经',
  '仍然',
  '继续',
])

export interface ManualRecallEvidenceMatch {
  status: Extract<ManualRecallAdherenceStatus, 'respected' | 'violated' | 'omitted'>
  evidenceQuote: string | null
  diagnosis: string
}

function manuscriptSentences(blocks: DraftBlock[]) {
  return blocks.flatMap(block => (
    block.text
      .split(/(?<=[。！？!?；;])/u)
      .map(sentence => sentence.trim())
      .filter(Boolean)
  ))
}

function lexicalChunks(text: string) {
  return text.match(/[\p{Script=Han}A-Za-z0-9·]+/gu) || []
}

function longestSharedSpan(statement: string, sentence: string) {
  for (const chunk of lexicalChunks(statement)) {
    const maximum = Math.min(18, chunk.length)
    for (let length = maximum; length >= minimumExactEvidenceLength; length -= 1) {
      for (let start = 0; start + length <= chunk.length; start += 1) {
        const candidate = chunk.slice(start, start + length)
        if (sentence.includes(candidate)) return candidate
      }
    }
  }
  return ''
}

function contradictionAnchors(statement: string, sentence: string) {
  const anchors = new Set<string>()
  for (const chunk of lexicalChunks(statement)) {
    for (let start = 0; start + contradictionAnchorLength <= chunk.length; start += 1) {
      const candidate = chunk.slice(start, start + contradictionAnchorLength)
      if (!ignoredContradictionAnchors.has(candidate) && sentence.includes(candidate)) {
        anchors.add(candidate)
      }
    }
  }
  return anchors
}

function matchedPropositionIsNegatedAt(
  text: string,
  matchedText: string,
  matchStart: number,
) {
  let clauseStart = matchStart
  while (clauseStart > 0 && !clauseBoundaryPattern.test(text[clauseStart - 1]!)) {
    clauseStart -= 1
  }
  const propositionPrefix = text.slice(clauseStart, matchStart + matchedText.length)
  return negationTokens.some(token => propositionPrefix.includes(token))
}

interface PropositionOccurrence {
  negated: boolean
  mode: 'assertive' | 'reported' | 'hypothetical' | 'rhetorical' | 'epistemic'
  rejectedAfterward: boolean
}

function clauseBounds(text: string, matchStart: number, matchEnd: number) {
  let start = matchStart
  let end = matchEnd
  while (start > 0 && !clauseBoundaryPattern.test(text[start - 1]!)) start -= 1
  while (end < text.length && !clauseBoundaryPattern.test(text[end]!)) end += 1
  return { start, end }
}

function assertionModeAt(text: string, propositionStart: number) {
  const bounds = clauseBounds(text, propositionStart, propositionStart)
  const clausePrefix = text.slice(bounds.start, propositionStart)
  const widerPrefix = text.slice(0, propositionStart)
  const sentence = text.trim()

  if (
    hypotheticalAssertionPattern.test(clausePrefix)
    || hypotheticalAssertionPattern.test(widerPrefix)
    || /无论[^，。；!?！？]{0,20}是否/u.test(widerPrefix)
  ) {
    return 'hypothetical' as const
  }
  if (
    rhetoricalAssertionPattern.test(sentence)
    || /[?？]/u.test(sentence)
  ) {
    return 'rhetorical' as const
  }
  if (
    /(?:所谓|似乎|或许|也许|可能|大概|据推测|猜测|尚待确认|有待确认|无法确认)/u.test(sentence)
    || /是否[^。；!?！？]{0,24}(?:待|需|需要|尚待|有待)(?:确认|查明|核实)/u.test(sentence)
  ) {
    return 'epistemic' as const
  }
  if (reportedAssertionPattern.test(widerPrefix)) return 'reported' as const
  return 'assertive' as const
}

function matchedPropositionOccurrences(text: string, matchedText: string) {
  const occurrences: PropositionOccurrence[] = []
  let searchStart = 0

  while (searchStart <= text.length - matchedText.length) {
    const matchStart = text.indexOf(matchedText, searchStart)
    if (matchStart < 0) break
    const matchEnd = matchStart + matchedText.length
    const bounds = clauseBounds(text, matchStart, matchEnd)
    const suffix = text.slice(matchEnd, bounds.end)
    const mode = assertionModeAt(text, matchStart)
    occurrences.push({
      negated: matchedPropositionIsNegatedAt(text, matchedText, matchStart),
      mode,
      rejectedAfterward: mode !== 'rhetorical' && postposedRejectionPattern.test(suffix),
    })
    searchStart = matchStart + Math.max(1, matchedText.length)
  }

  return occurrences
}

function matchedPropositionAssessment(
  statement: string,
  sentence: string,
  matchedText: string,
) {
  const statementPolarities = matchedPropositionOccurrences(statement, matchedText)
    .map(item => item.negated)
  const occurrences = matchedPropositionOccurrences(sentence, matchedText)
  return {
    supports: occurrences.some(item => (
      item.mode === 'assertive'
      && !item.rejectedAfterward
      && statementPolarities.includes(item.negated)
    )),
    contradicts: occurrences.some(item => (
      item.mode === 'assertive'
      && (
        item.rejectedAfterward
        || !statementPolarities.includes(item.negated)
      )
    )),
  }
}

function oppositePolarityAnchorCount(statement: string, sentence: string, anchors: Set<string>) {
  return [...anchors].filter(anchor => (
    matchedPropositionAssessment(statement, sentence, anchor).contradicts
  )).length
}

interface RetentionConstraint {
  subject: string
  container: string
  threshold: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function retentionConstraint(statement: string): RetentionConstraint | null {
  const location = statement.match(
    /^([^，。；]{1,16}?)(?:必须|应当|需要|须)?(?:始终|一直|仍然|仍)?(?:藏|留|放|位于)(?:在|于)?([^，。；]{1,16}?)(?:内部|里面|内)/u,
  )
  const threshold = statement.match(
    /直到([^，。；]{1,16}?)(?:才|才能|方可|方能|才可以)(?:被)?(?:取出|拿出|移出)/u,
  )
  if (!location?.[1] || !location[2] || !threshold?.[1]) return null
  return {
    subject: location[1].trim(),
    container: location[2].trim(),
    threshold: threshold[1].trim(),
  }
}

type RetentionRelation = 'support' | 'violation' | 'allowed_transition' | 'uncertain' | 'irrelevant'

interface RetentionDiscourse {
  latestEntity: string | null
  priorSupport: boolean
}

interface RetentionSentenceAssessment {
  relation: RetentionRelation
  latestEntity: string | null
}

const transitionActionPattern = /(?:取了出来|拿了出来|抽了出来|取出来|拿出来|抽出来|取出|拿出|抽出|移出|搬出|带出|取走|拿走|带走|转移|藏到|离开|消失|不见|交给|塞进)/gu
const explicitUnrealizedPattern = /(?:打算|计划|准备|想要|试图|拟|尚未|还未|没有|并未|未曾|从未|不得|禁止|不能|不可|必须|应当|需要|须)/u
const chineseOrdinal = new Map([
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
  ['十', 10],
])

function tideOrdinal(text: string) {
  const match = text.match(/第([一二三四五六七八九十\d]+)次涨潮/u)
  if (!match?.[1]) return null
  if (/^\d+$/u.test(match[1])) return Number(match[1])
  return chineseOrdinal.get(match[1]) ?? null
}

function transitionTimeRelation(
  sentence: string,
  actionStart: number,
  constraint: RetentionConstraint,
) {
  const thresholdOrdinal = tideOrdinal(constraint.threshold)
  const preceding = sentence.slice(0, actionStart)
  const markers = [...preceding.matchAll(/第([一二三四五六七八九十\d]+)次涨潮(?:刚过|已过|之后|以后|后|之前|以前|前|时|当日|当天)?/gu)]
  const nearest = markers.at(-1)
  if (!nearest || thresholdOrdinal === null) return 'unknown' as const
  const ordinal = tideOrdinal(nearest[0])
  if (ordinal === null) return 'unknown' as const
  const markerPrefix = preceding.slice(
    Math.max(0, (nearest.index ?? 0) - 6),
    nearest.index ?? 0,
  )
  if (/(?:还没到|尚未到|未到|不到|早于)$/u.test(markerPrefix)) {
    return 'premature' as const
  }
  if (/(?:刚过|已过|之后|以后|后)$/u.test(nearest[0])) {
    return ordinal >= thresholdOrdinal ? 'allowed' as const : 'premature' as const
  }
  if (/(?:之前|以前|前)$/u.test(nearest[0])) {
    return ordinal <= thresholdOrdinal ? 'premature' as const : 'allowed' as const
  }
  return ordinal >= thresholdOrdinal ? 'allowed' as const : 'premature' as const
}

function extractedActionTarget(
  sentence: string,
  action: string,
  actionStart: number,
  discourse: RetentionDiscourse,
  constraint: RetentionConstraint,
) {
  const prefix = sentence.slice(0, actionStart)
  const suffix = sentence.slice(actionStart + action.length)
  const localObjects = [
    ...prefix.matchAll(/(?:拿起|取出|拿出|抽出|带走|取走|拿走)(?:了)?(?:一[卷枚把个只本张件])?([^，。；!?！？而但]{1,12})/gu),
  ]
  const localLatestEntity = (
    localObjects.at(-1)?.[1]?.trim()
    || (prefix.includes(constraint.subject) ? constraint.subject : null)
    || discourse.latestEntity
  )
  const explicitBefore = prefix.match(/(?:把|将|让)([^，。；!?！？而但]{1,16})$/u)?.[1]?.trim()
  if (explicitBefore) {
    if (explicitBefore.startsWith('它')) return localLatestEntity
    if (explicitBefore.startsWith(constraint.subject)) return constraint.subject
    return explicitBefore
  }
  const passiveBefore = prefix.match(/([^，。；!?！？而但]{1,16}?)(?:已经|已)?被$/u)?.[1]?.trim()
  if (passiveBefore) return passiveBefore
  if (/^(?:了|出来|走|到|进|入|往|回|去|开)?它/u.test(suffix)) {
    return localLatestEntity
  }
  if (/^(?:离开|消失|不见|交给|塞进|转移|藏到)$/u.test(action)) {
    return localLatestEntity
  }
  const explicitAfter = suffix.match(/^(?:了|出来|走|到|进|入|往|回|去|开|离)?(?:一[卷枚把个只本张件])?([^，。；!?！？而但]{1,12})/u)?.[1]?.trim()
  if (explicitAfter && !/^(?:旧钟内部|灯塔|船长|自己的衣袋)/u.test(explicitAfter)) {
    return explicitAfter
  }
  const actorBoundary = prefix.match(/(?:而|但|随后|然后)([^，。；!?！？]{1,16})$/u)?.[1]
  if (actorBoundary && /(?:守灯人|船长|她|他)$/u.test(actorBoundary.trim())) return null
  return localLatestEntity
}

function latestExplicitEntity(
  sentence: string,
  constraint: RetentionConstraint,
  fallback: string | null,
) {
  const explicitObjects = [
    ...sentence.matchAll(/(?:拿起|取出|拿出|抽出|带走|取走|拿走)(?:了)?(?:一[卷枚把个只本张件])?([^，。；!?！？而但]{1,12})/gu),
  ]
  const latestObject = explicitObjects.at(-1)?.[1]?.trim()
  if (latestObject) return latestObject
  if (sentence.includes(constraint.subject)) return constraint.subject
  return fallback
}

function structuredRetentionAssessment(
  statement: string,
  sentence: string,
  discourse: RetentionDiscourse,
): RetentionSentenceAssessment {
  const constraint = retentionConstraint(statement)
  if (!constraint) return { relation: 'irrelevant', latestEntity: discourse.latestEntity }

  const subjectIndex = sentence.indexOf(constraint.subject)
  const propositionStart = subjectIndex >= 0 ? subjectIndex : 0
  const mode = assertionModeAt(sentence, propositionStart)
  const rejectionOfPrior = (
    discourse.priorSupport
    && postposedRejectionPattern.test(sentence)
  )
  const nextLatestEntity = latestExplicitEntity(sentence, constraint, discourse.latestEntity)
  if (rejectionOfPrior) return { relation: 'violation', latestEntity: nextLatestEntity }
  if (subjectIndex >= 0 && mode !== 'assertive') {
    return { relation: 'uncertain', latestEntity: nextLatestEntity }
  }

  const subject = escapeRegExp(constraint.subject)
  const container = escapeRegExp(constraint.container)
  const locationDenial = (
    new RegExp(`${subject}[^，。；!?！？而但]{0,12}(?:已经不在|已不在|并不在|不在)[^，。；!?！？而但]{0,10}${container}`, 'u').test(sentence)
    || new RegExp(
      `${subject}[^，。；!?！？而但]{0,10}(?:没有|并未|未曾|从未|不再)(?:藏|留|放|位于)?(?:在|于)?[^，。；!?！？而但]{0,10}${container}`,
      'u',
    ).test(sentence)
    || new RegExp(`${container}[^，。；!?！？而但]{0,12}(?:已)?(?:找不到|没有|不见)[^，。；!?！？而但]{0,8}${subject}`, 'u').test(sentence)
    || new RegExp(
      `${subject}[^，。；!?！？而但]{0,12}(?:被)?(?:藏到|藏在|移到|转移到)[^，。；!?！？而但]{0,12}(?:外部|外面|之外|抽屉|药箱|别处)`,
      'u',
    ).test(sentence)
    || new RegExp(`${subject}[^，。；!?！？而但]{0,12}(?:已经)?(?:离开|消失|不见)(?:了)?[^，。；!?！？而但]{0,10}${container}?`, 'u').test(sentence)
    || new RegExp(`${subject}[^，。；!?！？而但]{0,12}(?:已经)?不见了`, 'u').test(sentence)
  )
  const locationSupport = new RegExp(
    `${subject}[^，。；!?！？而但]{0,12}(?:仍|还|依然|一直|始终)?(?:藏|留|放|位于|在)(?:在|于)?[^，。；!?！？而但]{0,10}${container}`,
    'u',
  ).test(sentence)
  const statementRejected = (
    locationSupport
    && postposedRejectionPattern.test(sentence.slice(subjectIndex))
  )

  if (locationDenial || statementRejected) {
    return { relation: 'violation', latestEntity: nextLatestEntity }
  }

  transitionActionPattern.lastIndex = 0
  let sawUnrealizedTransition = false
  for (const match of sentence.matchAll(transitionActionPattern)) {
    const actionStart = match.index ?? -1
    if (actionStart < 0) continue
    const target = extractedActionTarget(
      sentence,
      match[0],
      actionStart,
      discourse,
      constraint,
    )
    if (target !== constraint.subject) continue
    const bounds = clauseBounds(sentence, actionStart, actionStart + match[0].length)
    const actionClause = sentence.slice(bounds.start, bounds.end)
    if (
      assertionModeAt(sentence, actionStart) !== 'assertive'
      || matchedPropositionIsNegatedAt(sentence, match[0], actionStart)
      || explicitUnrealizedPattern.test(actionClause.slice(0, actionStart - bounds.start))
    ) {
      sawUnrealizedTransition = true
      continue
    }
    const timeRelation = transitionTimeRelation(sentence, actionStart, constraint)
    if (timeRelation === 'allowed') {
      return { relation: 'allowed_transition', latestEntity: nextLatestEntity }
    }
    return { relation: 'violation', latestEntity: nextLatestEntity }
  }

  if (locationSupport) {
    return { relation: 'support', latestEntity: nextLatestEntity }
  }
  if (sawUnrealizedTransition) {
    return { relation: 'irrelevant', latestEntity: nextLatestEntity }
  }
  if (subjectIndex >= 0) {
    return { relation: 'uncertain', latestEntity: nextLatestEntity }
  }
  if (discourse.latestEntity === constraint.subject && sentence.includes('它')) {
    return { relation: 'uncertain', latestEntity: nextLatestEntity }
  }
  return { relation: 'irrelevant', latestEntity: nextLatestEntity }
}

export function matchManualRecallEvidence(
  statement: string,
  blocks: DraftBlock[],
): ManualRecallEvidenceMatch {
  const sentences = manuscriptSentences(blocks)
  const constraint = retentionConstraint(statement)
  let supportingSentence: string | null = null
  let contradictingSentence: string | null = null
  let uncertainSentence: string | null = null
  let latestEntity: string | null = null

  for (const sentence of sentences) {
    const structured = structuredRetentionAssessment(statement, sentence, {
      latestEntity,
      priorSupport: supportingSentence !== null,
    })
    latestEntity = structured.latestEntity
    if (structured.relation === 'violation') contradictingSentence ||= sentence
    if (
      structured.relation === 'support'
      || structured.relation === 'allowed_transition'
    ) {
      supportingSentence ||= sentence
      uncertainSentence = null
    }
    if (structured.relation === 'uncertain') uncertainSentence ||= sentence

    const sharedSpan = longestSharedSpan(statement, sentence)
    if (sharedSpan) {
      const assessment = matchedPropositionAssessment(statement, sentence, sharedSpan)
      if (assessment.contradicts) contradictingSentence ||= sentence
      if (!constraint && assessment.supports) supportingSentence ||= sentence
    }
    if (!sharedSpan) {
      const anchors = contradictionAnchors(statement, sentence)
      if (oppositePolarityAnchorCount(statement, sentence, anchors) >= 2) {
        contradictingSentence ||= sentence
      }
    }
  }

  if (contradictingSentence) {
    return {
      status: 'violated',
      evidenceQuote: contradictingSentence,
      diagnosis: '正文中的可定位片段否定或提前破坏了记忆卡约束，不能视为遵循。',
    }
  }
  if (constraint && uncertainSentence) {
    return {
      status: 'omitted',
      evidenceQuote: null,
      diagnosis: '正文出现与记忆卡相关但无法可靠确认为事实的命题，必须由作者复核。',
    }
  }
  if (supportingSentence) {
    return {
      status: 'respected',
      evidenceQuote: supportingSentence,
      diagnosis: '当前正文包含足够具体、极性一致且可逐字定位的召回承接证据。',
    }
  }

  return {
    status: 'omitted',
    evidenceQuote: null,
    diagnosis: '当前正文没有足够具体、极性一致的可定位证据证明这张记忆卡已被承接。',
  }
}
