import type {
  DraftBlock,
  ManualRecallAdherenceStatus,
} from './types'

const minimumExactEvidenceLength = 6
const contradictionAnchorLength = 2
const negationTokens = ['不存在', '没有', '并无', '未曾', '从未', '不再', '并未', '无从', '不能', '不可']
const clauseBoundaryPattern = /[。！？!?；;，,：:]/u
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

function matchedPropositionPolarities(text: string, matchedText: string) {
  const polarities: boolean[] = []
  let searchStart = 0

  while (searchStart <= text.length - matchedText.length) {
    const matchStart = text.indexOf(matchedText, searchStart)
    if (matchStart < 0) break
    polarities.push(matchedPropositionIsNegatedAt(text, matchedText, matchStart))
    searchStart = matchStart + Math.max(1, matchedText.length)
  }

  return polarities
}

function matchedPropositionHasOppositePolarity(
  statement: string,
  sentence: string,
  matchedText: string,
) {
  const statementPolarities = matchedPropositionPolarities(statement, matchedText)
  const sentencePolarities = matchedPropositionPolarities(sentence, matchedText)
  return sentencePolarities.some(polarity => !statementPolarities.includes(polarity))
}

function oppositePolarityAnchorCount(statement: string, sentence: string, anchors: Set<string>) {
  return [...anchors].filter(anchor => (
    matchedPropositionHasOppositePolarity(statement, sentence, anchor)
  )).length
}

export function matchManualRecallEvidence(
  statement: string,
  blocks: DraftBlock[],
): ManualRecallEvidenceMatch {
  const sentences = manuscriptSentences(blocks)

  for (const sentence of sentences) {
    const sharedSpan = longestSharedSpan(statement, sentence)
    if (!sharedSpan) continue
    if (matchedPropositionHasOppositePolarity(statement, sentence, sharedSpan)) {
      return {
        status: 'violated',
        evidenceQuote: sentence,
        diagnosis: '正文中的可定位片段与记忆卡极性相反，不能视为遵循。',
      }
    }
    return {
      status: 'respected',
      evidenceQuote: sentence,
      diagnosis: '当前正文包含足够具体、极性一致且可逐字定位的召回承接证据。',
    }
  }

  for (const sentence of sentences) {
    const anchors = contradictionAnchors(statement, sentence)
    if (oppositePolarityAnchorCount(statement, sentence, anchors) >= 2) {
      return {
        status: 'violated',
        evidenceQuote: sentence,
        diagnosis: '正文同时提及记忆卡中的多个具体锚点，却明确否定其成立。',
      }
    }
  }

  return {
    status: 'omitted',
    evidenceQuote: null,
    diagnosis: '当前正文没有足够具体、极性一致的可定位证据证明这张记忆卡已被承接。',
  }
}
