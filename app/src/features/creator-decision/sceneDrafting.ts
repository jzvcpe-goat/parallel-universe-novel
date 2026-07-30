import type {
  CreationSession,
  DraftBlock,
  SceneDraftRequest,
  SceneDraftResult,
} from './types'
import { CreationDecisionError } from './types'
import { assertSingleSceneScope } from './stateMachine'

function stableHash(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function draftBlocksFromText(
  text: string,
  protectedBlockIds: string[] = [],
): DraftBlock[] {
  const protectedIds = new Set(protectedBlockIds)
  const paragraphs = text.split(/\n{2,}/)
  let cursor = 0
  return paragraphs.map((paragraph, index) => {
    const startOffset = text.indexOf(paragraph, cursor)
    const safeStart = startOffset >= 0 ? startOffset : cursor
    const endOffset = safeStart + paragraph.length
    cursor = endOffset
    const id = `draft-block:${index + 1}:${stableHash(paragraph)}`
    return {
      id,
      text: paragraph,
      startOffset: safeStart,
      endOffset,
      protected: protectedIds.has(id),
    }
  })
}

export function draftTextFromBlocks(blocks: DraftBlock[]) {
  return blocks.map(block => block.text).join('\n\n')
}

export function rebaseDraftBlockOffsets(blocks: DraftBlock[]) {
  let cursor = 0
  return blocks.map(block => {
    const startOffset = cursor
    const endOffset = startOffset + block.text.length
    cursor = endOffset + 2
    return { ...block, startOffset, endOffset }
  })
}

export function withoutSceneDraftDirectionReceipt(result: SceneDraftResult): SceneDraftResult {
  if (!result.directionReceipt) return result
  const next = { ...result }
  delete next.directionReceipt
  return next
}

export function draftBlockIdsForTextRange(
  blocks: DraftBlock[],
  startOffset: number,
  endOffset: number,
) {
  const start = Math.max(0, Math.min(startOffset, endOffset))
  const end = Math.max(start, Math.max(startOffset, endOffset))
  if (start === end) return []
  return blocks
    .filter(block => block.endOffset > start && block.startOffset < end)
    .map(block => block.id)
}

export function countHanCharacters(text: string) {
  return (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length
}

export function countVisibleCharacters(text: string) {
  return Array.from(text).filter(character => !/\s/u.test(character)).length
}

const sceneDelimiterPairs = [
  ['“', '”'],
  ['‘', '’'],
  ['「', '」'],
  ['『', '』'],
  ['（', '）'],
  ['(', ')'],
  ['【', '】'],
  ['[', ']'],
] as const

function occurrenceCount(text: string, character: string) {
  return Array.from(text).filter(item => item === character).length
}

export function hasCompleteSceneEnding(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false
  const delimitersBalanced = sceneDelimiterPairs.every(([opening, closing]) => (
    occurrenceCount(trimmed, opening) === occurrenceCount(trimmed, closing)
  ))
  if (!delimitersBalanced) return false
  const withoutTrailingClosers = trimmed.replace(/[”’」』）》）\]}]+$/u, '').trimEnd()
  return /[。！？!?…]$/u.test(withoutTrailingClosers)
}

export function markDraftResultFreshness(input: {
  result: SceneDraftResult
  session: CreationSession
  intentRevision: number
  candidateRevision: number
}) {
  const stale = input.result.baseCanonRevision !== input.session.baseCanonRevision
    || input.result.baseIntentRevision !== input.intentRevision
    || input.result.baseCandidateRevision !== input.candidateRevision
    || input.result.baseDraftRevision !== input.session.currentDraftRevision
  return { ...input.result, status: stale ? 'stale' as const : 'current' as const }
}

export function assertProtectedBlocksPreserved(input: {
  before: DraftBlock[]
  after: DraftBlock[]
  protectedBlockIds: string[]
}) {
  const beforeById = new Map(input.before.map(block => [block.id, block]))
  const afterById = new Map(input.after.map(block => [block.id, block]))
  for (const blockId of input.protectedBlockIds) {
    const before = beforeById.get(blockId)
    const after = afterById.get(blockId)
    if (!before || !after || before.text !== after.text) {
      throw new CreationDecisionError('invalid_generation_scope', `Protected block changed: ${blockId}`)
    }
  }
}

export function applySceneDraftToBlocks(input: {
  currentBlocks: DraftBlock[]
  generatedBlocks: DraftBlock[]
  request: SceneDraftRequest
}) {
  assertSingleSceneScope(input.request)
  const protectedIds = new Set(input.request.protectedBlockIds)
  if (input.request.scope.type === 'scene') {
    const retained = input.currentBlocks.filter(block => protectedIds.has(block.id))
    const generated = input.generatedBlocks.filter(block => !protectedIds.has(block.id))
    return [...retained, ...generated]
  }

  const selectedIds = new Set(
    input.request.scope.type === 'selected_text'
      ? input.request.scope.selectedBlockIds
      : input.request.scope.beatIds,
  )
  const replacement = [...input.generatedBlocks]
  const next: DraftBlock[] = []
  let inserted = false
  for (const block of input.currentBlocks) {
    if (!selectedIds.has(block.id)) {
      next.push(block)
      continue
    }
    if (protectedIds.has(block.id)) {
      next.push(block)
      continue
    }
    if (!inserted) {
      next.push(...replacement)
      inserted = true
    }
  }
  if (!inserted) throw new CreationDecisionError('invalid_generation_scope', 'Selected draft range no longer exists.')
  assertProtectedBlocksPreserved({
    before: input.currentBlocks,
    after: next,
    protectedBlockIds: input.request.protectedBlockIds,
  })
  return next
}

export function createDraftResult(input: {
  request: SceneDraftRequest
  contentBlocks: DraftBlock[]
  unplannedFactProposals?: string[]
  observedStateChanges?: SceneDraftResult['observedStateChanges']
  directionReceipt?: SceneDraftResult['directionReceipt']
  now?: string
}): SceneDraftResult {
  assertSingleSceneScope(input.request)
  return {
    schemaVersion: 'scene-draft.v1',
    draftId: `scene-draft:${stableHash(`${input.request.sessionId}:${input.request.baseDraftRevision + 1}:${input.now || ''}`)}`,
    sessionId: input.request.sessionId,
    baseCanonRevision: input.request.baseCanonRevision,
    baseIntentRevision: input.request.intentRevision,
    baseCandidateRevision: input.request.candidateRevision,
    baseDraftRevision: input.request.baseDraftRevision,
    revision: input.request.baseDraftRevision + 1,
    contentBlocks: input.contentBlocks,
    unplannedFactProposals: input.unplannedFactProposals || [],
    observedStateChanges: input.observedStateChanges || [],
    ...(input.directionReceipt ? { directionReceipt: input.directionReceipt } : {}),
    status: 'current',
    createdAt: input.now || new Date().toISOString(),
  }
}
