import { compileContextSnapshot } from '@/features/creator-decision/contextCompiler'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationContextSource,
  CreationSession,
} from '@/features/creator-decision/types'
import type { CreatorConfirmedShadowRecallSelection } from '@/integrations/creator-rag/creatorShadowRecallService'

function assertConfirmedSelection(input: {
  session: CreationSession
  selection: CreatorConfirmedShadowRecallSelection
}) {
  if (
    input.selection.schemaVersion !== 'creator-confirmed-shadow-recall-selection.v1'
    || input.selection.status !== 'confirmed_not_applied'
    || input.selection.authorConfirmed !== true
    || input.selection.contextSnapshotChanged
  ) {
    throw new Error('Creator Context requires a confirmed and unapplied shadow recall selection')
  }
  if (input.selection.workId !== input.session.workId) {
    throw new Error('confirmed shadow recall selection belongs to another work')
  }
  if (input.selection.branchId !== input.session.branchId) {
    throw new Error('confirmed shadow recall selection belongs to another branch')
  }
  if (
    input.selection.selectedProposalIds.length !== input.selection.selectedSources.length
    || input.selection.selectedSources.length !== input.selection.manualRecallItems.length
  ) {
    throw new Error('confirmed shadow recall selection has inconsistent selected-source counts')
  }
  input.selection.selectedSources.forEach((selected, index) => {
    const item = input.selection.manualRecallItems[index]
    if (
      selected.proposalId !== input.selection.selectedProposalIds[index]
      || selected.sourceId !== item?.sourceId
      || selected.sourceRevision !== item.sourceRevision
    ) {
      throw new Error('confirmed shadow recall selection source receipt does not match its manual item')
    }
  })
}

export function applyConfirmedShadowRecallToContextSource(input: {
  session: CreationSession
  source: CreationContextSource
  selection: CreatorConfirmedShadowRecallSelection
}): CreationContextSource {
  assertConfirmedSelection(input)
  const incomingSourceIds = new Set<string>()
  for (const item of input.selection.manualRecallItems) {
    if (incomingSourceIds.has(item.sourceId)) {
      throw new Error(`confirmed shadow recall selection repeats a source: ${item.sourceId}`)
    }
    incomingSourceIds.add(item.sourceId)
    const existingItem = input.source.manualRecallItems?.find(existing => existing.sourceId === item.sourceId)
    if (existingItem && existingItem.sourceRevision !== item.sourceRevision) {
      throw new Error(`confirmed shadow recall conflicts with an existing manual source revision: ${item.sourceId}`)
    }
    const existingManifest = input.source.manifest.find(entry => entry.sourceId === item.sourceId)
    if (existingManifest && (
      existingManifest.sourceRevision !== item.sourceRevision
      || existingManifest.authority !== item.authority
    )) {
      throw new Error(`confirmed shadow recall conflicts with the current manifest: ${item.sourceId}`)
    }
  }

  const manualRecallBySource = new Map(
    (input.source.manualRecallItems ?? []).map(item => [item.sourceId, item]),
  )
  for (const item of input.selection.manualRecallItems) manualRecallBySource.set(item.sourceId, item)
  const manifestBySource = new Map(input.source.manifest.map(entry => [entry.sourceId, entry]))
  for (const item of input.selection.manualRecallItems) {
    manifestBySource.set(item.sourceId, {
      sourceId: item.sourceId,
      sourceRevision: item.sourceRevision,
      authority: item.authority,
      includedReason: `author_confirmed_shadow_recall:${item.group}`,
    })
  }
  return {
    ...input.source,
    manualRecallItems: Array.from(manualRecallBySource.values()),
    manifest: Array.from(manifestBySource.values()),
  }
}

export function compileContextWithConfirmedShadowRecall(input: {
  session: CreationSession
  intent: AuthorIntentContract
  source: CreationContextSource
  selection: CreatorConfirmedShadowRecallSelection
  now?: string
}): ContextSnapshot {
  const source = applyConfirmedShadowRecallToContextSource(input)
  return compileContextSnapshot({
    session: input.session,
    intent: input.intent,
    source,
    now: input.now,
  })
}
