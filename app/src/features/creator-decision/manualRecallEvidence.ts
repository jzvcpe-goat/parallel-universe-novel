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
const removalActionPattern = /(?:取了出来|拿了出来|抽了出来|取出来|拿出来|抽出来|取出|拿出|抽出|移出|搬出|带出|取走|拿走|带走|转移|藏到)/gu
const unrealizedActionPattern = /(?:才(?:能|可|可以)?|可以|允许|应当|应该|必须|需要|不得|禁止|不能|不可|打算|计划|准备|想要|试图|若要)[^，。；!?！？]{0,8}$/u
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
  mode: 'assertive' | 'reported' | 'hypothetical' | 'rhetorical'
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

type RemovalTiming = 'none' | 'premature' | 'allowed'

function actionTargetsSubject(
  sentence: string,
  actionStart: number,
  actionEnd: number,
  constraint: RetentionConstraint,
  subjectActive: boolean,
) {
  const subject = escapeRegExp(constraint.subject)
  const bounds = clauseBounds(sentence, actionStart, actionEnd)
  const clause = sentence.slice(bounds.start, bounds.end)
  const actionOffset = actionStart - bounds.start
  const before = clause.slice(0, actionOffset)
  const after = clause.slice(actionOffset)
  if (new RegExp(subject, 'u').test(clause)) {
    return (
      new RegExp(`(?:把|将|让)?${subject}[^，。；!?！？]{0,18}$`, 'u').test(before)
      || new RegExp(`^(?:了|出来|走|到|在|向|至|进|入|往|回|去|开|离开|离)?[^，。；!?！？]{0,10}${subject}`, 'u').test(after)
      || new RegExp(`${subject}.{0,8}(?:被|已被|已经被)`, 'u').test(before)
    )
  }
  return subjectActive && (
    /(?:把|将|让)它[^，。；!?！？]{0,18}$/u.test(before)
    || /^(?:了|出来|走|到|在|向|至|进|入|往|回|去|开|离开|离)?[^，。；!?！？]{0,6}它/u.test(after)
  )
}

function removalTiming(
  sentence: string,
  constraint: RetentionConstraint,
  subjectActive: boolean,
): RemovalTiming {
  const threshold = escapeRegExp(constraint.threshold)

  removalActionPattern.lastIndex = 0
  for (const match of sentence.matchAll(removalActionPattern)) {
    const matchStart = match.index ?? -1
    if (matchStart < 0) continue
    const action = match[0]
    const clause = clauseBounds(sentence, matchStart, matchStart + action.length)
    const prefix = sentence.slice(clause.start, matchStart)
    const fullClause = sentence.slice(clause.start, clause.end)
    const eventContext = sentence
    if (!actionTargetsSubject(
      sentence,
      matchStart,
      matchStart + action.length,
      constraint,
      subjectActive,
    )) {
      continue
    }
    if (assertionModeAt(sentence, matchStart) !== 'assertive') continue
    if (matchedPropositionIsNegatedAt(sentence, action, matchStart)) continue
    if (
      unrealizedActionPattern.test(prefix)
      || /(?:尚未|还未|没有|并未|未曾|从未)[^，。；!?！？]{0,8}(?:取|拿|抽|移|搬|带|转移)/u.test(fullClause)
      || new RegExp(
        `(?:必须|应当|需要|须).{0,24}(?:等到|直到)${threshold}.{0,8}(?:才|才能|方可|方能)`,
        'u',
      ).test(eventContext)
    ) {
      continue
    }
    if (
      new RegExp(`(?:还没到|未到|不到|早于)${threshold}`, 'u').test(eventContext)
      || new RegExp(`${threshold}前`, 'u').test(eventContext)
      || /(?:第一|第二|一|二)次涨潮(?:前|时|当日|当天)?/u.test(eventContext)
    ) {
      return 'premature'
    }
    if (
      new RegExp(`${threshold}(?:后|之后|刚过|已过|时|当日|当天)`, 'u').test(eventContext)
    ) {
      return 'allowed'
    }
    return 'premature'
  }
  return 'none'
}

function structuredRetentionAssessment(
  statement: string,
  sentence: string,
  context: { subjectActive: boolean; priorSupport: boolean },
) {
  const constraint = retentionConstraint(statement)
  if (!constraint) return { supports: false, contradicts: false }

  const subjectIndex = sentence.indexOf(constraint.subject)
  const propositionStart = subjectIndex >= 0 ? subjectIndex : 0
  const mode = assertionModeAt(sentence, propositionStart)
  const rejectionOfPrior = (
    context.priorSupport
    && postposedRejectionPattern.test(sentence)
  )
  if (rejectionOfPrior) return { supports: false, contradicts: true }
  if (subjectIndex < 0 && !context.subjectActive) {
    return { supports: false, contradicts: false }
  }
  if (mode !== 'assertive') return { supports: false, contradicts: false }

  const subject = escapeRegExp(constraint.subject)
  const container = escapeRegExp(constraint.container)
  const locationDenial = (
    new RegExp(`${subject}[^，。；!?！？]{0,12}(?:已经不在|已不在|并不在|不在)[^，。；!?！？]{0,10}${container}`, 'u').test(sentence)
    || new RegExp(
      `${subject}[^，。；!?！？]{0,10}(?:没有|并未|未曾|从未|不再)(?:藏|留|放|位于)?(?:在|于)?[^，。；!?！？]{0,10}${container}`,
      'u',
    ).test(sentence)
    || new RegExp(`${container}[^，。；!?！？]{0,12}(?:已)?(?:找不到|没有|不见)[^，。；!?！？]{0,8}${subject}`, 'u').test(sentence)
    || new RegExp(
      `${subject}[^，。；!?！？]{0,12}(?:被)?(?:藏到|藏在|移到|转移到)[^，。；!?！？]{0,12}(?:外部|外面|之外|抽屉|药箱|别处)`,
      'u',
    ).test(sentence)
  )
  const locationSupport = new RegExp(
    `${subject}[^，。；!?！？]{0,12}(?:仍|还|依然|一直|始终)?(?:藏|留|放|位于|在)(?:在|于)?[^，。；!?！？]{0,10}${container}`,
    'u',
  ).test(sentence)
  const statementRejected = (
    locationSupport
    && postposedRejectionPattern.test(sentence.slice(subjectIndex))
  )
  const removal = removalTiming(sentence, constraint, context.subjectActive || subjectIndex >= 0)
  const prematureRemoval = removal === 'premature'

  return {
    supports: (
      (locationSupport || removal === 'allowed')
      && !locationDenial
      && !statementRejected
      && !prematureRemoval
    ),
    contradicts: locationDenial || statementRejected || prematureRemoval,
  }
}

export function matchManualRecallEvidence(
  statement: string,
  blocks: DraftBlock[],
): ManualRecallEvidenceMatch {
  const sentences = manuscriptSentences(blocks)
  const constraint = retentionConstraint(statement)
  let supportingSentence: string | null = null
  let contradictingSentence: string | null = null
  let subjectActive = false

  for (const sentence of sentences) {
    const structured = structuredRetentionAssessment(statement, sentence, {
      subjectActive,
      priorSupport: supportingSentence !== null,
    })
    if (structured.contradicts) contradictingSentence ||= sentence
    if (structured.supports) supportingSentence ||= sentence
    if (constraint && sentence.includes(constraint.subject)) subjectActive = true

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
