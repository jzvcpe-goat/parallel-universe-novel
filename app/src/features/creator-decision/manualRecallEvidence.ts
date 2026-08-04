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
const reportedAssertionPattern = /(?:据说|听说|传言|传闻|有人说|[\p{Script=Han}A-Za-z0-9·]{1,16}(?:说|表示|提到|写道|声称|宣称|断言|转述))[^，。；!?！？]{0,20}$/u
const hypotheticalAssertionPattern = /(?:^|[，,；;：:])(?:如果|假如|倘若|若|要是|即使|哪怕|万一|若要)/u
const rhetoricalAssertionPattern = /(?:谁(?:会|能)?相信|难道|岂(?:会|能)|怎么可能|何曾|不能说)/u
const postposedRejectionPattern = /(?:不属实|并非事实|不是真的|是假的|只是谎言|荒唐的说法)/u
const removalActionPattern = /(?:取了出来|拿了出来|取出来|拿出来|取出|拿出|移出|搬出|带出|取走|拿走)/gu
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
  const widerPrefix = text.slice(Math.max(0, propositionStart - 24), propositionStart)
  const clause = text.slice(bounds.start, bounds.end)

  if (hypotheticalAssertionPattern.test(clausePrefix)) return 'hypothetical' as const
  if (
    rhetoricalAssertionPattern.test(clause)
    || (/[?？]/u.test(clause) && /(?:谁|何|怎么|难道|岂)/u.test(clause))
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

function actualRemoval(sentence: string, constraint: RetentionConstraint) {
  const subject = escapeRegExp(constraint.subject)
  const container = escapeRegExp(constraint.container)
  const relatesToConstraint = (
    new RegExp(subject, 'u').test(sentence)
    && (
      new RegExp(container, 'u').test(sentence)
      || new RegExp(`(?:把|将|让)?${subject}.{0,12}(?:取|拿|移|搬|带)`, 'u').test(sentence)
    )
  )
  if (!relatesToConstraint) return false

  removalActionPattern.lastIndex = 0
  for (const match of sentence.matchAll(removalActionPattern)) {
    const matchStart = match.index ?? -1
    if (matchStart < 0) continue
    const action = match[0]
    const clause = clauseBounds(sentence, matchStart, matchStart + action.length)
    const prefix = sentence.slice(clause.start, matchStart)
    if (assertionModeAt(sentence, matchStart) !== 'assertive') continue
    if (matchedPropositionIsNegatedAt(sentence, action, matchStart)) continue
    if (unrealizedActionPattern.test(prefix)) continue
    return true
  }
  return false
}

function structuredRetentionAssessment(statement: string, sentence: string) {
  const constraint = retentionConstraint(statement)
  if (!constraint) return { supports: false, contradicts: false }

  const subjectIndex = sentence.indexOf(constraint.subject)
  if (subjectIndex < 0) return { supports: false, contradicts: false }
  if (assertionModeAt(sentence, subjectIndex) !== 'assertive') {
    return { supports: false, contradicts: false }
  }

  const subject = escapeRegExp(constraint.subject)
  const container = escapeRegExp(constraint.container)
  const locationDenial = (
    new RegExp(`${subject}.{0,12}(?:已经不在|已不在|并不在|不在).{0,10}${container}`, 'u').test(sentence)
    || new RegExp(
      `${subject}.{0,10}(?:没有|并未|未曾|从未|不再)(?:藏|留|放|位于)?(?:在|于)?.{0,10}${container}`,
      'u',
    ).test(sentence)
  )
  const locationSupport = new RegExp(
    `${subject}.{0,12}(?:仍|还|依然|一直|始终)?(?:藏|留|放|位于)(?:在|于)?.{0,10}${container}`,
    'u',
  ).test(sentence)
  const statementRejected = (
    locationSupport
    && postposedRejectionPattern.test(sentence.slice(subjectIndex))
  )
  const removal = actualRemoval(sentence, constraint)
  const thresholdReached = new RegExp(
    `${escapeRegExp(constraint.threshold)}(?:后|之后|时|当日|当天)`,
    'u',
  ).test(sentence)
  const prematureRemoval = removal && !thresholdReached

  return {
    supports: locationSupport && !locationDenial && !statementRejected && !prematureRemoval,
    contradicts: locationDenial || statementRejected || prematureRemoval,
  }
}

function retentionViolation(statement: string, sentence: string) {
  return structuredRetentionAssessment(statement, sentence).contradicts
}

export function matchManualRecallEvidence(
  statement: string,
  blocks: DraftBlock[],
): ManualRecallEvidenceMatch {
  const sentences = manuscriptSentences(blocks)
  let supportingSentence: string | null = null
  let contradictingSentence: string | null = null

  for (const sentence of sentences) {
    const structured = structuredRetentionAssessment(statement, sentence)
    if (structured.contradicts) contradictingSentence ||= sentence
    if (structured.supports) supportingSentence ||= sentence

    const sharedSpan = longestSharedSpan(statement, sentence)
    if (sharedSpan) {
      const assessment = matchedPropositionAssessment(statement, sentence, sharedSpan)
      if (assessment.contradicts) contradictingSentence ||= sentence
      if (assessment.supports) supportingSentence ||= sentence
    }
    if (!sharedSpan) {
      const anchors = contradictionAnchors(statement, sentence)
      if (oppositePolarityAnchorCount(statement, sentence, anchors) >= 2) {
        contradictingSentence ||= sentence
      }
    }
    if (retentionViolation(statement, sentence)) contradictingSentence ||= sentence
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
