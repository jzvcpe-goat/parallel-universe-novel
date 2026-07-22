import type {
  AdvisoryCraftFinding,
  ContextSnapshot,
  DraftBlock,
  LiteraryEvidence,
  LiteraryDimension,
  LiteraryFinding,
  LiteraryReview,
  ExtendedCraftReview,
  ManualRecallAdherenceReceipt,
  LocalRepairCandidate,
  LocalRepairFinding,
  RepairProposal,
  SceneDraftResult,
} from './types'
import { CreationDecisionError } from './types'
import { contextSnapshotFingerprint } from './contextCompiler'
import { draftTextFromBlocks, rebaseDraftBlockOffsets } from './sceneDrafting'

export function excerptHash(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function evidenceForText(block: DraftBlock, text: string) {
  const startOffset = block.text.indexOf(text)
  if (startOffset < 0) return null
  return {
    blockId: block.id,
    startOffset,
    endOffset: startOffset + text.length,
    excerptHash: excerptHash(text),
  }
}

export function evidenceForDraftQuote(
  blocks: DraftBlock[],
  text: string,
): LiteraryEvidence[] | null {
  if (!text) return null
  const manuscript = draftTextFromBlocks(blocks)
  const quoteStart = manuscript.indexOf(text)
  if (quoteStart < 0) return null

  const quoteEnd = quoteStart + text.length
  const evidence: LiteraryEvidence[] = []
  let blockStart = 0

  for (const block of blocks) {
    const blockEnd = blockStart + block.text.length
    const overlapStart = Math.max(quoteStart, blockStart)
    const overlapEnd = Math.min(quoteEnd, blockEnd)

    if (overlapStart < overlapEnd) {
      const startOffset = overlapStart - blockStart
      const endOffset = overlapEnd - blockStart
      evidence.push({
        blockId: block.id,
        startOffset,
        endOffset,
        excerptHash: excerptHash(block.text.slice(startOffset, endOffset)),
      })
    }

    blockStart = blockEnd + 2
  }

  return evidence.length > 0 ? evidence : null
}

function validateEvidenceCollection(
  finding: Pick<LiteraryFinding, 'evidence'>,
  blocks: DraftBlock[],
) {
  const blockById = new Map(blocks.map(block => [block.id, block]))
  return finding.evidence.length > 0 && finding.evidence.every(evidence => {
    const block = blockById.get(evidence.blockId)
    if (!block) return false
    if (evidence.startOffset < 0 || evidence.endOffset > block.text.length) return false
    if (evidence.endOffset <= evidence.startOffset) return false
    return excerptHash(block.text.slice(evidence.startOffset, evidence.endOffset)) === evidence.excerptHash
  })
}

export function validateFindingEvidence(finding: LiteraryFinding, blocks: DraftBlock[]) {
  return validateEvidenceCollection(finding, blocks)
}

export function validateAdvisoryFindingEvidence(
  finding: AdvisoryCraftFinding,
  blocks: DraftBlock[],
) {
  return validateEvidenceCollection(finding, blocks)
}

export function evidenceBlocksForFinding(
  finding: LiteraryFinding,
  blocks: DraftBlock[],
) {
  if (!validateFindingEvidence(finding, blocks)) return []
  const evidenceBlockIds = new Set(finding.evidence.map(item => item.blockId))
  return blocks.filter(block => evidenceBlockIds.has(block.id))
}

export function manuscriptRangeForFindingEvidence(
  finding: LiteraryFinding,
  blocks: DraftBlock[],
) {
  if (!validateFindingEvidence(finding, blocks)) return null
  const blockIndexById = new Map(blocks.map((block, index) => [block.id, index]))
  const located = finding.evidence
    .map(evidence => {
      const blockIndex = blockIndexById.get(evidence.blockId)
      if (blockIndex === undefined) return null
      return { block: blocks[blockIndex], blockIndex, evidence }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => (
      left.blockIndex - right.blockIndex
      || left.evidence.startOffset - right.evidence.startOffset
    ))
  if (!located.length) return null

  const first = located[0]
  const firstOnly = {
    startOffset: first.block.startOffset + first.evidence.startOffset,
    endOffset: first.block.startOffset + first.evidence.endOffset,
  }
  if (located.length === 1) return firstOnly

  for (let index = 1; index < located.length; index += 1) {
    const previous = located[index - 1]
    const current = located[index]
    if (
      current.blockIndex !== previous.blockIndex + 1
      || previous.evidence.endOffset !== previous.block.text.length
      || current.evidence.startOffset !== 0
    ) {
      return firstOnly
    }
  }

  const last = located[located.length - 1]
  return {
    startOffset: firstOnly.startOffset,
    endOffset: last.block.startOffset + last.evidence.endOffset,
  }
}

export function createLiteraryReview(input: {
  id: string
  sessionId: string
  context: ContextSnapshot
  draft: SceneDraftResult
  findings: LiteraryFinding[]
  extendedCraft?: ExtendedCraftReview
  modelFindingVerification?: LiteraryReview['modelFindingVerification']
  manualRecallAdherence?: ManualRecallAdherenceReceipt
  requestedFocusDimensions?: LiteraryDimension[]
  deterministicViolations?: string[]
  now?: string
}): LiteraryReview {
  const validFindings = input.findings.filter(finding => validateFindingEvidence(finding, input.draft.contentBlocks))
  const extendedCraft = input.extendedCraft
    ? {
        ...input.extendedCraft,
        findings: input.extendedCraft.findings.filter(finding => (
          validateAdvisoryFindingEvidence(finding, input.draft.contentBlocks)
        )),
      }
    : undefined
  return {
    schemaVersion: 'literary-review.v1',
    id: input.id,
    sessionId: input.sessionId,
    contextSnapshotId: input.context.id,
    contextCompilationPolicyVersion: input.context.compilationPolicyVersion,
    contextSourceFingerprint: input.context.sourceFingerprint,
    contextSnapshotFingerprint: contextSnapshotFingerprint(input.context),
    draftId: input.draft.draftId,
    baseCanonRevision: input.draft.baseCanonRevision,
    baseIntentRevision: input.draft.baseIntentRevision,
    baseCandidateRevision: input.draft.baseCandidateRevision,
    baseDraftRevision: input.draft.revision,
    findings: validFindings,
    extendedCraft,
    modelFindingVerification: input.modelFindingVerification,
    manualRecallAdherence: input.manualRecallAdherence,
    requestedFocusDimensions: [...new Set(input.requestedFocusDimensions || [])],
    deterministicViolations: input.deterministicViolations || [],
    status: 'active',
    createdAt: input.now || new Date().toISOString(),
  }
}

export function activeHardBlockFindings(review: LiteraryReview) {
  return review.findings.filter(finding => finding.status === 'active' && finding.severity === 'hard_block')
}

export function markReviewStaleAfterEdit(
  review: LiteraryReview,
  editedBlockIds: string[],
) {
  const edited = new Set(editedBlockIds)
  return {
    ...review,
    status: 'stale' as const,
    findings: review.findings.map(finding => finding.evidence.some(item => edited.has(item.blockId))
      ? { ...finding, status: 'stale' as const }
      : finding),
    extendedCraft: review.extendedCraft
      ? {
          ...review.extendedCraft,
          findings: review.extendedCraft.findings.map(finding => ({
            ...finding,
            status: 'stale' as const,
          })),
        }
      : undefined,
  }
}

export function createRepairProposal(input: {
  id: string
  review: LiteraryReview
  findingId: string
  finding?: LocalRepairFinding
  operation: RepairProposal['operation']
  proposedContent: string | null
  preservedFacts?: string[]
  targetBlockIds?: string[]
  verification?: RepairProposal['verification']
  createdAt?: string
}): RepairProposal {
  const literaryFinding = input.review.findings.find(item => item.id === input.findingId)
  const finding = input.finding || (literaryFinding && literaryFinding.status === 'active'
    ? {
        source: 'existing_product' as const,
        id: literaryFinding.id,
        dimension: literaryFinding.dimension,
        severity: literaryFinding.severity,
        evidence: literaryFinding.evidence,
        diagnosis: literaryFinding.diagnosis,
        repairDirection: literaryFinding.repairDirection,
        protectedBlockIds: literaryFinding.protectedBlockIds,
        confidence: literaryFinding.confidence,
      }
    : null)
  if (!finding || finding.id !== input.findingId) {
    throw new CreationDecisionError('evidence_missing', 'The selected review finding is no longer active.')
  }
  const evidenceBlockIds = new Set(finding.evidence.map(item => item.blockId))
  const targetBlockIds = Array.from(new Set(input.targetBlockIds || evidenceBlockIds))
  if (!targetBlockIds.length) {
    throw new CreationDecisionError('evidence_missing', 'A local repair must point to manuscript evidence.')
  }
  if (targetBlockIds.some(blockId => !evidenceBlockIds.has(blockId))) {
    throw new CreationDecisionError('evidence_missing', 'A local repair cannot target a block outside the selected finding evidence.')
  }
  return {
    schemaVersion: 'repair-proposal.v1',
    id: input.id,
    reviewId: input.review.id,
    findingId: finding.id,
    findingSource: finding.source === 'advisory_lens'
      ? { kind: 'advisory_lens', lensId: finding.lensId }
      : { kind: 'existing_product', dimension: finding.dimension },
    baseDraftRevision: input.review.baseDraftRevision,
    operation: input.operation,
    targetBlockIds,
    preservedFacts: input.preservedFacts || [],
    preservedBlockIds: finding.protectedBlockIds,
    proposedContent: input.proposedContent,
    verification: input.verification || null,
    status: 'proposed',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateLocalRepairPreservedFactEvidence(input: {
  sourceText: string
  candidate: LocalRepairCandidate
}) {
  if (input.candidate.preservedFacts.length === 0) return false
  return input.candidate.preservedFacts.every(item => (
    input.sourceText.includes(item.sourceEvidenceQuote)
    && input.candidate.proposedContent.includes(item.candidateEvidenceQuote)
  ))
}

export function hasCompleteLocalRepairVerification(proposal: RepairProposal) {
  if (proposal.operation !== 'replace_range') return true
  if (proposal.verification?.decision !== 'pass' || proposal.preservedFacts.length === 0) return false
  const rawVerifiedIndexes = proposal.verification.verifiedPreservedFactIndexes || []
  const verifiedIndexes = Array.from(new Set(rawVerifiedIndexes)).sort((left, right) => left - right)
  if (verifiedIndexes.length !== rawVerifiedIndexes.length) return false
  return verifiedIndexes.length === proposal.preservedFacts.length
    && verifiedIndexes.every((value, index) => value === index)
}

export function applyRepairProposal(input: {
  proposal: RepairProposal
  blocks: DraftBlock[]
  currentDraftRevision: number
}) {
  if (input.proposal.status !== 'proposed') {
    throw new CreationDecisionError('stale_result', 'Only a repair awaiting author decision can be applied.')
  }
  if (input.proposal.baseDraftRevision !== input.currentDraftRevision) {
    throw new CreationDecisionError('draft_revision_conflict', 'The manuscript changed after this local repair was proposed.')
  }
  const targetIds = new Set(input.proposal.targetBlockIds)
  const preservedIds = new Set(input.proposal.preservedBlockIds)
  if (input.blocks.some(block => targetIds.has(block.id) && (block.protected || preservedIds.has(block.id)))) {
    throw new CreationDecisionError('invalid_generation_scope', 'A protected manuscript block cannot be rewritten.')
  }
  if (input.proposal.operation === 'offer_variants') {
    throw new CreationDecisionError(
      'invalid_generation_scope',
      'A multi-block repair direction is guidance only and cannot be adopted as manuscript text.',
    )
  }
  if (
    ['replace_range', 'insert_after'].includes(input.proposal.operation)
    && input.proposal.proposedContent === null
  ) {
    throw new CreationDecisionError('evidence_missing', 'A prose repair must contain replacement text.')
  }
  if (input.proposal.operation === 'replace_range' && !hasCompleteLocalRepairVerification(input.proposal)) {
    throw new CreationDecisionError(
      'hard_block_unresolved',
      'The local replacement candidate has not passed complete independent review.',
    )
  }

  let applied = false
  const next: DraftBlock[] = []
  for (const block of input.blocks) {
    if (!targetIds.has(block.id)) {
      next.push(block)
      continue
    }
    if (input.proposal.operation === 'delete_range') {
      applied = true
      continue
    }
    if (input.proposal.operation === 'insert_after') {
      next.push(block)
      if (input.proposal.proposedContent !== null) {
        next.push({
          id: `${block.id}:repair`,
          text: input.proposal.proposedContent,
          startOffset: block.endOffset,
          endOffset: block.endOffset + input.proposal.proposedContent.length,
          protected: false,
        })
      }
      applied = true
      continue
    }
    if (input.proposal.proposedContent !== null) {
      next.push({
        ...block,
        text: input.proposal.proposedContent,
        endOffset: block.startOffset + input.proposal.proposedContent.length,
      })
    }
    applied = true
  }
  if (!applied) throw new CreationDecisionError('evidence_missing', 'The repair target no longer exists.')
  const rebased = rebaseDraftBlockOffsets(next)
  const manuscriptChanged = rebased.length !== input.blocks.length || rebased.some((block, index) => {
    const previous = input.blocks[index]
    return !previous || block.id !== previous.id || block.text !== previous.text
  })
  if (!manuscriptChanged) {
    throw new CreationDecisionError(
      'hard_block_unresolved',
      'The local repair does not change the manuscript evidence and cannot resolve its finding.',
    )
  }
  return rebased
}
