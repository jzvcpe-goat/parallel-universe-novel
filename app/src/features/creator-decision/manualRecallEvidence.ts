import type {
  DraftBlock,
  ManualRecallAdherenceStatus,
} from './types'

const minimumExactEvidenceLength = 6
const contradictionAnchorLength = 2
const negationTokens = ['不存在', '没有', '并无', '未曾', '从未', '不再', '并未', '无从', '不能', '不可']
const clauseBoundaryPattern = /[。！？!?；;，,：:]/u
const uncertainAssertionPattern = /(?:据说|听说|传言|传闻|有人说|声称|宣称|如果|假如|倘若|难道|不能说)/u
const postposedRejectionPattern = /(?:不属实|并非事实|不是真的|是假的|只是谎言|荒唐的说法)/u
const removalActionPattern = /取出/u
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
  uncertain: boolean
  rejectedAfterward: boolean
}

function clauseBounds(text: string, matchStart: number, matchEnd: number) {
  let start = matchStart
  let end = matchEnd
  while (start > 0 && !clauseBoundaryPattern.test(text[start - 1]!)) start -= 1
  while (end < text.length && !clauseBoundaryPattern.test(text[end]!)) end += 1
  return { start, end }
}

function matchedPropositionOccurrences(text: string, matchedText: string) {
  const occurrences: PropositionOccurrence[] = []
  let searchStart = 0

  while (searchStart <= text.length - matchedText.length) {
    const matchStart = text.indexOf(matchedText, searchStart)
    if (matchStart < 0) break
    const matchEnd = matchStart + matchedText.length
    const bounds = clauseBounds(text, matchStart, matchEnd)
    const prefix = text.slice(bounds.start, matchStart)
    const suffix = text.slice(matchEnd, bounds.end)
    const rhetorical = /难道/u.test(suffix)
    occurrences.push({
      negated: matchedPropositionIsNegatedAt(text, matchedText, matchStart),
      uncertain: uncertainAssertionPattern.test(prefix) || rhetorical,
      rejectedAfterward: !rhetorical && postposedRejectionPattern.test(suffix),
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
      !item.uncertain
      && !item.rejectedAfterward
      && statementPolarities.includes(item.negated)
    )),
    contradicts: occurrences.some(item => (
      !item.uncertain
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

function positiveRemoval(sentence: string) {
  const matchStart = sentence.search(removalActionPattern)
  if (matchStart < 0) return false
  return !matchedPropositionIsNegatedAt(sentence, '取出', matchStart)
}

function retentionViolation(statement: string, sentence: string) {
  const retention = statement.match(/直到([^，。；]{1,16}?)(?:才|才能)取出/u)
  if (!retention || !positiveRemoval(sentence)) return false
  const anchors = contradictionAnchors(statement, sentence)
  if (!longestSharedSpan(statement, sentence) && anchors.size < 2) return false
  const removalIndex = sentence.search(removalActionPattern)
  if (
    uncertainAssertionPattern.test(sentence.slice(0, removalIndex))
    || /难道/u.test(sentence)
  ) return false
  const threshold = retention[1]?.trim()
  if (!threshold) return false
  if (sentence.includes(`${threshold}前`)) return true
  if (sentence.includes(threshold) && /(?:后|时|当日|当天)/u.test(sentence)) return false
  return true
}

export function matchManualRecallEvidence(
  statement: string,
  blocks: DraftBlock[],
): ManualRecallEvidenceMatch {
  const sentences = manuscriptSentences(blocks)
  let supportingSentence: string | null = null
  let contradictingSentence: string | null = null

  for (const sentence of sentences) {
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
