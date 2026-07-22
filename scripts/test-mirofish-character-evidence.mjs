#!/usr/bin/env node

import assert from 'node:assert/strict'
import { assertMiroFishEvidence } from './mirofish-character-evidence.mjs'

const request = {
  characters: [
    { id: 'character:gu-yao' },
    { id: 'character:zhou-yan' },
  ],
}
const artifacts = {
  interviews: '顾遥：我接受限量救治，但拒绝无人判断。',
  report: 'The pair will consequently adopt a constrained rationing rule.',
}
const directEvidence = {
  id: 'evidence:gu-interview',
  sourceArtifact: 'interviews',
  actorIds: ['character:gu-yao'],
  quote: '我接受限量救治',
}
const reportEvidence = {
  id: 'evidence:report',
  sourceArtifact: 'report',
  actorIds: ['character:gu-yao', 'character:zhou-yan'],
  quote: 'adopt a constrained rationing rule',
}
const proposal = {
  id: 'proposal:gu',
  characterId: 'character:gu-yao',
  evidenceIds: ['evidence:gu-interview'],
  stateChanges: [{ dimension: 'currentIntent', evidenceIds: ['evidence:gu-interview'] }],
}

assert.doesNotThrow(() => assertMiroFishEvidence({
  evidence: [directEvidence, reportEvidence],
  characterCardProposals: [proposal],
  settingAssetProposals: [],
}, request, artifacts))

assert.throws(() => assertMiroFishEvidence({
  evidence: [reportEvidence],
  characterCardProposals: [{ ...proposal, evidenceIds: ['evidence:report'], stateChanges: [] }],
  settingAssetProposals: [],
}, request, artifacts), /mirofish_direct_character_evidence_required/)

assert.throws(() => assertMiroFishEvidence({
  evidence: [directEvidence],
  characterCardProposals: [{ ...proposal, characterId: 'character:unknown' }],
  settingAssetProposals: [],
}, request, artifacts), /mirofish_proposal_unknown_character/)

assert.throws(() => assertMiroFishEvidence({
  evidence: [{ ...directEvidence, quote: '不存在的回答' }],
  characterCardProposals: [],
  settingAssetProposals: [],
}, request, artifacts), /mirofish_evidence_not_located/)

console.log('[mirofish-character-evidence] PASS')
