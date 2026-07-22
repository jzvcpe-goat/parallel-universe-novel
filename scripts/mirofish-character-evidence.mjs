function evidenceIndex(summary) {
  return new Map((summary.evidence || []).map(evidence => [evidence.id, evidence]))
}

function assertEvidenceIds(evidenceIds, evidenceById, label) {
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    throw new Error(`mirofish_proposal_evidence_missing:${label}`)
  }
  for (const evidenceId of evidenceIds) {
    if (!evidenceById.has(evidenceId)) {
      throw new Error(`mirofish_proposal_evidence_unknown:${label}:${evidenceId}`)
    }
  }
}

function hasSelectedInterviewEvidence(evidenceIds, evidenceById, characterId = null) {
  return evidenceIds.some(evidenceId => {
    const evidence = evidenceById.get(evidenceId)
    return evidence?.sourceArtifact === 'interviews'
      && (!characterId || evidence.actorIds.includes(characterId))
  })
}

export function assertMiroFishEvidence(summary, request, artifacts) {
  const selectedIds = new Set(request.characters.map(character => character.id))
  for (const evidence of summary.evidence || []) {
    const source = artifacts[evidence.sourceArtifact] || ''
    if (!evidence.quote || !source.includes(evidence.quote)) {
      throw new Error(`mirofish_evidence_not_located:${evidence.id || 'unknown'}`)
    }
    if (!Array.isArray(evidence.actorIds) || evidence.actorIds.some(actorId => !selectedIds.has(actorId))) {
      throw new Error(`mirofish_evidence_unknown_actor:${evidence.id || 'unknown'}`)
    }
  }

  const evidenceById = evidenceIndex(summary)
  for (const proposal of summary.characterCardProposals || []) {
    if (!selectedIds.has(proposal.characterId)) {
      throw new Error(`mirofish_proposal_unknown_character:${proposal.characterId || 'unknown'}`)
    }
    assertEvidenceIds(proposal.evidenceIds, evidenceById, proposal.id)
    if (!hasSelectedInterviewEvidence(proposal.evidenceIds, evidenceById, proposal.characterId)) {
      throw new Error(`mirofish_direct_character_evidence_required:${proposal.id}`)
    }
    for (const stateChange of proposal.stateChanges || []) {
      assertEvidenceIds(stateChange.evidenceIds, evidenceById, `${proposal.id}:${stateChange.dimension}`)
      if (!hasSelectedInterviewEvidence(stateChange.evidenceIds, evidenceById, proposal.characterId)) {
        throw new Error(`mirofish_direct_state_evidence_required:${proposal.id}:${stateChange.dimension}`)
      }
    }
  }

  for (const proposal of summary.settingAssetProposals || []) {
    assertEvidenceIds(proposal.evidenceIds, evidenceById, proposal.id)
    if (!hasSelectedInterviewEvidence(proposal.evidenceIds, evidenceById)) {
      throw new Error(`mirofish_direct_setting_evidence_required:${proposal.id}`)
    }
  }
}
