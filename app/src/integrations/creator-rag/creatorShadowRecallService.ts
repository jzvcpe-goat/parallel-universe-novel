import type {
  ManualRecallGroup,
  ManualRecallItem,
} from '@/features/creator-decision/types'

import type {
  CreatorLanceDbRetriever,
  CreatorRagRetrievalQuery,
  CreatorRagRetrievalResult,
} from './creatorLanceDbRetriever'
import type { CreatorRagSourceRecord } from './creatorChineseTextSplitter'

export interface CreatorShadowRecallSource extends CreatorRagSourceRecord {
  group: ManualRecallGroup
  whyNow: string
  manualLocator: ManualRecallItem['locator']
}

export interface CreatorShadowRecallCandidate {
  proposalId: string
  sourceId: string
  sourceRevision: number
  authority: CreatorRagSourceRecord['authority']
  group: ManualRecallGroup
  evidenceText: string
  sourceLabel: string
  whyNow: string
  locator: {
    kind: ManualRecallItem['locator']['kind']
    targetId: string
    label: string
  }
  selectionState: 'unselected'
}

export interface CreatorShadowRecallProposal {
  schemaVersion: 'creator-shadow-recall-proposal.v1'
  status: 'shadow_only'
  workId: string
  branchId: string
  currentChapterNo: number
  queryText: string
  candidates: CreatorShadowRecallCandidate[]
  manualHardIncludeSourceIds: string[]
  authorSelectionRequired: true
  automaticSelectionApplied: false
  contextSnapshotChanged: false
  draftChanged: false
  canonChanged: false
  publicationPerformed: false
  createdAt: string
}

export interface CreatorShadowRecallService {
  propose(query: CreatorRagRetrievalQuery): Promise<CreatorShadowRecallProposal>
}

export interface CreatorConfirmedShadowRecallSelection {
  schemaVersion: 'creator-confirmed-shadow-recall-selection.v1'
  status: 'confirmed_not_applied'
  proposalCreatedAt: string
  workId: string
  branchId: string
  currentChapterNo: number
  selectedProposalIds: string[]
  selectedSources: Array<{
    proposalId: string
    sourceId: string
    sourceRevision: number
  }>
  manualRecallItems: ManualRecallItem[]
  authorConfirmed: true
  contextSnapshotChanged: false
  draftChanged: false
  canonChanged: false
  publicationPerformed: false
  confirmedAt: string
}

function assertSourceScope(source: CreatorShadowRecallSource, query: CreatorRagRetrievalQuery) {
  if (source.memoryGroup !== source.group) throw new Error(`shadow recall source memory group is inconsistent: ${source.id}`)
  if (source.workId !== query.workId) throw new Error(`shadow recall source belongs to another work: ${source.id}`)
  if (source.branchId !== query.branchId) throw new Error(`shadow recall source belongs to another branch: ${source.id}`)
  if (source.chapterNo > query.currentChapterNo) throw new Error(`shadow recall source is from a future chapter: ${source.id}`)
  if (query.allowedAuthorities?.length && !query.allowedAuthorities.includes(source.authority)) {
    throw new Error(`shadow recall source authority is not allowed: ${source.id}`)
  }
}

export function buildCreatorShadowRecallProposal(input: {
  query: CreatorRagRetrievalQuery
  sources: CreatorShadowRecallSource[]
  result: CreatorRagRetrievalResult
  createdAt: string
}): CreatorShadowRecallProposal {
  if (!input.query.text.trim()) throw new Error('shadow recall query text must not be empty')
  if (!Number.isInteger(input.query.currentChapterNo) || input.query.currentChapterNo < 1) {
    throw new Error('shadow recall currentChapterNo must be a positive integer')
  }

  const sourceById = new Map(input.sources.map(source => [source.id, source]))
  if (sourceById.size !== input.sources.length) throw new Error('shadow recall sources must have unique ids')
  const manualHardIncludeSourceIds = [...new Set(input.query.manualSelectedSourceIds ?? [])]
  for (const sourceId of manualHardIncludeSourceIds) {
    const source = sourceById.get(sourceId)
    if (!source) throw new Error(`shadow recall manual source does not exist: ${sourceId}`)
    assertSourceScope(source, input.query)
    if (!input.result.finalSourceIds.includes(sourceId)) {
      throw new Error(`shadow recall retriever dropped a manual hard include: ${sourceId}`)
    }
  }

  const seenAutomaticSourceIds = new Set<string>()
  const candidates = input.result.automaticResults.map(result => {
    if (seenAutomaticSourceIds.has(result.sourceId)) {
      throw new Error(`shadow recall result contains a duplicate source: ${result.sourceId}`)
    }
    seenAutomaticSourceIds.add(result.sourceId)
    const source = sourceById.get(result.sourceId)
    if (!source) throw new Error(`shadow recall result has an unknown source: ${result.sourceId}`)
    assertSourceScope(source, input.query)
    if (
      result.workId !== source.workId
      || result.branchId !== source.branchId
      || result.chapterNo !== source.chapterNo
      || result.authority !== source.authority
      || result.memoryGroup !== source.memoryGroup
      || result.revision !== source.revision
      || result.locator.recordId !== source.locator.recordId
    ) {
      throw new Error(`shadow recall result metadata does not match its source: ${result.sourceId}`)
    }
    const evidenceText = result.text.trim()
    if (!evidenceText) throw new Error(`shadow recall result has no inspectable evidence: ${result.sourceId}`)
    return {
      proposalId: `shadow-recall:${source.id}:${source.revision}`,
      sourceId: source.id,
      sourceRevision: source.revision,
      authority: source.authority,
      group: source.group,
      evidenceText,
      sourceLabel: source.locator.label,
      whyNow: source.whyNow,
      locator: {
        kind: source.manualLocator.kind,
        targetId: source.manualLocator.targetId,
        label: source.manualLocator.label,
      },
      selectionState: 'unselected' as const,
    }
  })

  return {
    schemaVersion: 'creator-shadow-recall-proposal.v1',
    status: 'shadow_only',
    workId: input.query.workId,
    branchId: input.query.branchId,
    currentChapterNo: input.query.currentChapterNo,
    queryText: input.query.text.trim(),
    candidates,
    manualHardIncludeSourceIds,
    authorSelectionRequired: true,
    automaticSelectionApplied: false,
    contextSnapshotChanged: false,
    draftChanged: false,
    canonChanged: false,
    publicationPerformed: false,
    createdAt: input.createdAt,
  }
}

export function confirmCreatorShadowRecallSelection(input: {
  proposal: CreatorShadowRecallProposal
  currentSources: CreatorShadowRecallSource[]
  selectedProposalIds: string[]
  authorConfirmed: true
  confirmedAt: string
}): CreatorConfirmedShadowRecallSelection {
  if (input.authorConfirmed !== true) throw new Error('shadow recall selection requires explicit author confirmation')
  if (input.proposal.status !== 'shadow_only' || input.proposal.automaticSelectionApplied) {
    throw new Error('shadow recall selection requires an unmodified shadow proposal')
  }
  const selectedProposalIds = [...new Set(input.selectedProposalIds)]
  if (!selectedProposalIds.length) throw new Error('shadow recall selection requires at least one selected proposal')
  if (selectedProposalIds.length !== input.selectedProposalIds.length) {
    throw new Error('shadow recall selection contains duplicate proposal ids')
  }

  const candidateById = new Map(input.proposal.candidates.map(candidate => [candidate.proposalId, candidate]))
  if (candidateById.size !== input.proposal.candidates.length) {
    throw new Error('shadow recall proposal contains duplicate candidate ids')
  }
  const currentSourceById = new Map(input.currentSources.map(source => [source.id, source]))
  if (currentSourceById.size !== input.currentSources.length) {
    throw new Error('shadow recall current sources must have unique ids')
  }

  const manualRecallItems = selectedProposalIds.map(proposalId => {
    const candidate = candidateById.get(proposalId)
    if (!candidate) throw new Error(`shadow recall selection references an unknown proposal: ${proposalId}`)
    const source = currentSourceById.get(candidate.sourceId)
    if (!source) throw new Error(`shadow recall selection source is no longer available: ${candidate.sourceId}`)
    assertSourceScope(source, {
      text: input.proposal.queryText,
      workId: input.proposal.workId,
      branchId: input.proposal.branchId,
      currentChapterNo: input.proposal.currentChapterNo,
    })
    if (
      source.revision !== candidate.sourceRevision
      || source.authority !== candidate.authority
      || source.group !== candidate.group
      || source.manualLocator.kind !== candidate.locator.kind
      || source.manualLocator.targetId !== candidate.locator.targetId
    ) {
      throw new Error(`shadow recall selection source revision or metadata is stale: ${candidate.sourceId}`)
    }
    return {
      id: `manual-recall:shadow:${candidate.sourceId}:${candidate.sourceRevision}`,
      sourceId: candidate.sourceId,
      sourceRevision: candidate.sourceRevision,
      authority: candidate.authority,
      group: candidate.group,
      statement: candidate.evidenceText,
      sourceLabel: candidate.sourceLabel,
      whyNow: candidate.whyNow,
      locator: candidate.locator,
    }
  })
  const selectedSources = selectedProposalIds.map((proposalId, index) => ({
    proposalId,
    sourceId: manualRecallItems[index]!.sourceId,
    sourceRevision: manualRecallItems[index]!.sourceRevision,
  }))

  return {
    schemaVersion: 'creator-confirmed-shadow-recall-selection.v1',
    status: 'confirmed_not_applied',
    proposalCreatedAt: input.proposal.createdAt,
    workId: input.proposal.workId,
    branchId: input.proposal.branchId,
    currentChapterNo: input.proposal.currentChapterNo,
    selectedProposalIds,
    selectedSources,
    manualRecallItems,
    authorConfirmed: true,
    contextSnapshotChanged: false,
    draftChanged: false,
    canonChanged: false,
    publicationPerformed: false,
    confirmedAt: input.confirmedAt,
  }
}

export function createCreatorShadowRecallService(input: {
  retriever: CreatorLanceDbRetriever
  sources: CreatorShadowRecallSource[]
  now?: () => string
}): CreatorShadowRecallService {
  return {
    async propose(query: CreatorRagRetrievalQuery) {
      const result = await input.retriever.retrieve(query)
      return buildCreatorShadowRecallProposal({
        query,
        sources: input.sources,
        result,
        createdAt: input.now?.() ?? new Date().toISOString(),
      })
    },
  }
}
