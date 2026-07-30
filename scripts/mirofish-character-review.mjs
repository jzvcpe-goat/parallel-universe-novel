import { isDeepStrictEqual } from 'node:util'

function assertUniqueIndexes(indexes, label) {
  if (!Array.isArray(indexes) || new Set(indexes).size !== indexes.length) {
    throw new Error(`mirofish_review_duplicate_indexes:${label}`)
  }
}

function assertUniqueProposalIds(items, label) {
  const ids = items.map(item => item?.id)
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
    throw new Error(`mirofish_semantic_revision_proposal_ids_invalid:${label}`)
  }
}

function evidenceIdsForProposal(proposal) {
  return new Set([
    ...(proposal?.evidenceIds || []),
    ...(proposal?.stateChanges || []).flatMap(change => change?.evidenceIds || []),
  ])
}

export function assertMiroFishSemanticRevisionPreservesVerified(previousResult, review, revisedResult) {
  const previousCharacter = previousResult?.characterCardProposals || []
  const previousSetting = previousResult?.settingAssetProposals || []
  const revisedCharacter = revisedResult?.characterCardProposals || []
  const revisedSetting = revisedResult?.settingAssetProposals || []
  assertUniqueProposalIds(previousCharacter, 'previous_character')
  assertUniqueProposalIds(previousSetting, 'previous_setting')
  assertUniqueProposalIds(revisedCharacter, 'revised_character')
  assertUniqueProposalIds(revisedSetting, 'revised_setting')

  const previousIds = new Set([
    ...previousCharacter.map(item => item.id),
    ...previousSetting.map(item => item.id),
  ])
  for (const proposal of [...revisedCharacter, ...revisedSetting]) {
    if (!previousIds.has(proposal.id)) {
      throw new Error(`mirofish_semantic_revision_added_proposal:${proposal.id}`)
    }
  }

  const previousEvidence = new Map((previousResult?.evidence || []).map(item => [item.id, item]))
  const revisedEvidence = new Map((revisedResult?.evidence || []).map(item => [item.id, item]))
  const verified = [
    ...(review?.verifiedCharacterProposalIndexes || []).map(index => ({
      kind: 'character',
      proposal: previousCharacter[index],
      revised: revisedCharacter,
    })),
    ...(review?.verifiedSettingProposalIndexes || []).map(index => ({
      kind: 'setting',
      proposal: previousSetting[index],
      revised: revisedSetting,
    })),
  ]

  for (const item of verified) {
    if (!item.proposal) throw new Error(`mirofish_semantic_revision_verified_index_invalid:${item.kind}`)
    const revisedProposal = item.revised.find(proposal => proposal.id === item.proposal.id)
    if (!revisedProposal) {
      throw new Error(`mirofish_semantic_revision_removed_verified_proposal:${item.proposal.id}`)
    }
    if (!isDeepStrictEqual(revisedProposal, item.proposal)) {
      throw new Error(`mirofish_semantic_revision_changed_verified_proposal:${item.proposal.id}`)
    }
    for (const evidenceId of evidenceIdsForProposal(item.proposal)) {
      if (!previousEvidence.has(evidenceId) || !revisedEvidence.has(evidenceId)) {
        throw new Error(`mirofish_semantic_revision_verified_evidence_missing:${evidenceId}`)
      }
      if (!isDeepStrictEqual(revisedEvidence.get(evidenceId), previousEvidence.get(evidenceId))) {
        throw new Error(`mirofish_semantic_revision_changed_verified_evidence:${evidenceId}`)
      }
    }
  }

  return revisedResult
}

function expectedIndexes(items) {
  return items.map((_, index) => index)
}

function sameIndexes(actual, expected) {
  return actual.length === expected.length
    && [...actual].sort((left, right) => left - right)
      .every((value, index) => value === expected[index])
}

function proposalForIssue(result, issue) {
  if (issue.proposalKind === 'character') {
    return result.characterCardProposals?.[issue.proposalIndex]
  }
  if (issue.proposalKind === 'setting') {
    return result.settingAssetProposals?.[issue.proposalIndex]
  }
  return null
}

export function assertMiroFishCharacterReview(review, request, result) {
  if (!review || typeof review !== 'object') throw new Error('mirofish_review_invalid')
  if (review.schemaVersion !== 'creator-character-simulation-review.v1') {
    throw new Error('mirofish_review_schema_invalid')
  }
  if (review.requestId !== request.requestId || review.requestId !== result.requestId) {
    throw new Error('mirofish_review_request_mismatch')
  }
  if (review.simulationRunId !== result.simulationRunId) {
    throw new Error('mirofish_review_run_mismatch')
  }
  if (!['pass', 'reject'].includes(review.decision)) throw new Error('mirofish_review_decision_invalid')

  const verifiedCharacter = review.verifiedCharacterProposalIndexes || []
  const verifiedSetting = review.verifiedSettingProposalIndexes || []
  const issues = review.issues || []
  assertUniqueIndexes(verifiedCharacter, 'character')
  assertUniqueIndexes(verifiedSetting, 'setting')

  const expectedCharacter = expectedIndexes(result.characterCardProposals || [])
  const expectedSetting = expectedIndexes(result.settingAssetProposals || [])
  if (verifiedCharacter.some(index => !expectedCharacter.includes(index))) {
    throw new Error('mirofish_review_character_index_invalid')
  }
  if (verifiedSetting.some(index => !expectedSetting.includes(index))) {
    throw new Error('mirofish_review_setting_index_invalid')
  }

  const issueKeys = new Set()
  for (const issue of issues) {
    const proposal = proposalForIssue(result, issue)
    if (!proposal) throw new Error('mirofish_review_issue_index_invalid')
    const proposalKey = `${issue.proposalKind}:${issue.proposalIndex}`
    issueKeys.add(proposalKey)
    if (issue.proposalKind === 'character' && verifiedCharacter.includes(issue.proposalIndex)) {
      throw new Error('mirofish_review_character_both_verified_and_rejected')
    }
    if (issue.proposalKind === 'setting' && verifiedSetting.includes(issue.proposalIndex)) {
      throw new Error('mirofish_review_setting_both_verified_and_rejected')
    }
    const allowedEvidenceQuotes = new Set(
      (proposal.evidenceIds || [])
        .map(evidenceId => result.evidence?.find(item => item.id === evidenceId)?.quote)
        .filter(Boolean),
    )
    if (!allowedEvidenceQuotes.has(issue.evidenceQuote)) {
      throw new Error(`mirofish_review_issue_evidence_unbound:${proposalKey}`)
    }
  }

  const accountedCharacter = new Set([
    ...verifiedCharacter.map(index => `character:${index}`),
    ...Array.from(issueKeys).filter(key => key.startsWith('character:')),
  ])
  const accountedSetting = new Set([
    ...verifiedSetting.map(index => `setting:${index}`),
    ...Array.from(issueKeys).filter(key => key.startsWith('setting:')),
  ])
  if (accountedCharacter.size !== expectedCharacter.length || accountedSetting.size !== expectedSetting.length) {
    throw new Error('mirofish_review_incomplete_coverage')
  }

  if (review.decision === 'pass') {
    if (issues.length) throw new Error('mirofish_review_pass_with_issues')
    if (!sameIndexes(verifiedCharacter, expectedCharacter) || !sameIndexes(verifiedSetting, expectedSetting)) {
      throw new Error('mirofish_review_pass_incomplete')
    }
  } else if (!issues.length) {
    throw new Error('mirofish_review_reject_without_issues')
  }

  return review
}
