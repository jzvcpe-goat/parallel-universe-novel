#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const receiptPath = resolve(
  root,
  'validation/creator-writing/chapter-20-mirofish-character-rehearsal-2026-07-18.json',
)
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(receiptPath), 'missing real Chapter 20 MiroFish rehearsal receipt')
const receiptText = existsSync(receiptPath) ? readFileSync(receiptPath, 'utf8') : ''
const receipt = receiptText ? JSON.parse(receiptText) : {}

expect(receipt.schemaVersion === 'creator-character-rehearsal-quality-trial.v1', 'receipt schema mismatch')
expect(receipt.chapter === 20, 'rehearsal must remain on Chapter 20')
expect(receipt.provider === 'mirofish', 'rehearsal must use the real MiroFish provider')
expect(receipt.simulationRunId === 'run_f32c84a9f292', 'frozen simulation run id drifted')
expect(
  receipt.sourcePromptSha256 === 'ebd1993adc561c4a8a8cabe1611be0b5af5523b0f871df048076c48babe42884',
  'rehearsal must use the frozen real Chapter 20 prompt',
)
expect(receipt.request?.rounds === 1, 'Chapter 20 rehearsal must remain one round')
expect(
  JSON.stringify(receipt.request?.selectedCharacterNames) === JSON.stringify(['陆沉舟', '贺岚']),
  'rehearsal must contain exactly the two author-selected real characters',
)
expect(receipt.request?.selectedCharacterIds?.length === 2, 'rehearsal must contain exactly two selected character ids')
expect(receipt.request?.authorConfirmedExport === true, 'external character export requires author confirmation')
expect(receipt.request?.manuscriptBodyIncluded === false, 'manuscript body must not leave the Creator process')
expect(receipt.request?.lockedIntentAndContextOnly === true, 'rehearsal input must remain bounded to locked intent and Context')

expect(receipt.result?.evidenceCount === 7, 'frozen run must retain all seven evidence items')
expect(receipt.result?.directInterviewEvidenceCount === 7, 'every frozen evidence item must come from direct interviews')
expect(receipt.result?.characterCardProposalCount === 2, 'frozen run must retain two character-card proposals')
expect(receipt.result?.settingAssetProposalCount === 2, 'frozen run must retain two setting-asset proposals')
expect(receipt.result?.proposedCharacterIds?.length === 2, 'only two selected characters may own proposals')
expect(
  receipt.result?.proposedCharacterIds?.every(id => receipt.request?.selectedCharacterIds?.includes(id)),
  'an unselected character owns a proposal',
)
expect(receipt.result?.proposedStateDimensions?.length === 0, 'this frozen run must not invent a 22-dimension state change')
expect(receipt.result?.boundedSemanticRevisionApplied === true, 'the rejected overclaim must trigger bounded semantic revision')
expect(receipt.result?.allProposalEvidenceIsDirectInterview === true, 'every proposal must bind direct interview evidence')
expect(
  receipt.result?.resultSha256 === 'f38af2a0178fd019d8b7bd8f2eb60f25371e08dc38b64633317315e992553be0',
  'frozen result hash drifted',
)

expect(
  JSON.stringify(receipt.reviewBoundary?.pipeline) === JSON.stringify(['MiroFish', 'Reflector', 'Auditor']),
  'rehearsal must preserve the external simulation and independent review pipeline',
)
expect(receipt.reviewBoundary?.resultReachedAuthorCandidateBoundary === true, 'result must stop at the author candidate boundary')
for (const boundary of ['cardSavePerformed', 'settingSavePerformed', 'canonCommitPerformed']) {
  expect(receipt.reviewBoundary?.[boundary] === false, `rehearsal crossed review boundary ${boundary}`)
}
for (const boundary of [
  'repositoryWritePerformed',
  'acceptedChapterChanged',
  'chapter21AccessedOrChanged',
  'cloudDataChanged',
  'publicationPerformed',
]) {
  expect(receipt.sideEffects?.[boundary] === false, `rehearsal crossed side-effect boundary ${boundary}`)
}
expect(receipt.containsManuscriptText === false, 'public receipt must not contain manuscript text')
expect(/^[a-f0-9]{64}$/.test(receipt.privateArtifactSha256 ?? ''), 'private artifact must be represented by a SHA-256 only')

for (const privateField of ['scenario', 'settingFacts', 'hardConstraints', 'evidence', 'characterCardProposals', 'settingAssetProposals']) {
  expect(!receiptText.includes(`"${privateField}"`), `public receipt leaked private field ${privateField}`)
}
for (const privateTextMarker of ['第三目的地木条', '牵索偏载', '当前资料：']) {
  expect(!receiptText.includes(privateTextMarker), `public receipt leaked private text marker ${privateTextMarker}`)
}

if (failures.length > 0) {
  console.error('[creator-chapter-20-mirofish-rehearsal] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-chapter-20-mirofish-rehearsal] PASS')
console.log(JSON.stringify({
  chapter: receipt.chapter,
  simulationRunId: receipt.simulationRunId,
  selectedCharacters: receipt.request.selectedCharacterNames,
  evidenceCount: receipt.result.evidenceCount,
  characterCardProposalCount: receipt.result.characterCardProposalCount,
  settingAssetProposalCount: receipt.result.settingAssetProposalCount,
  candidateOnly: true,
  literaryGainProven: false,
}, null, 2))
