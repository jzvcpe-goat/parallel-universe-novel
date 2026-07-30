#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  assertMiroFishCharacterReview,
  assertMiroFishSemanticRevisionPreservesVerified,
} from './mirofish-character-review.mjs'

const request = {
  requestId: 'simulation-request:test',
}
const result = {
  requestId: request.requestId,
  simulationRunId: 'mirofish-run:test',
  evidence: [
    { id: 'evidence:character', quote: '我会先说明风险，再让同伴共同决定。' },
    { id: 'evidence:setting', quote: '旧门只有在两人同时压住刻印时才会打开。' },
  ],
  characterCardProposals: [{
    id: 'character-proposal:test',
    evidenceIds: ['evidence:character'],
  }],
  settingAssetProposals: [{
    id: 'setting-proposal:test',
    evidenceIds: ['evidence:setting'],
  }],
}
const pass = {
  schemaVersion: 'creator-character-simulation-review.v1',
  requestId: request.requestId,
  simulationRunId: result.simulationRunId,
  decision: 'pass',
  verifiedCharacterProposalIndexes: [0],
  verifiedSettingProposalIndexes: [0],
  issues: [],
  rationale: '两项候选都由各自绑定的直接回答支持，且仍保持为待作者审阅的候选。',
}

assert.doesNotThrow(() => assertMiroFishCharacterReview(pass, request, result))
assert.throws(
  () => assertMiroFishCharacterReview({
    ...pass,
    verifiedSettingProposalIndexes: [],
  }, request, result),
  /mirofish_review_incomplete_coverage|mirofish_review_pass_incomplete/,
  'a passing review must account for every proposal',
)
assert.throws(
  () => assertMiroFishCharacterReview({
    ...pass,
    decision: 'reject',
    verifiedCharacterProposalIndexes: [],
    issues: [{
      proposalKind: 'character',
      proposalIndex: 0,
      code: 'evidence_overclaim',
      evidenceQuote: '这句并不存在于候选所引用的证据中。',
      diagnosis: '候选把未出现的内容当作直接回答。',
    }],
  }, request, result),
  /mirofish_review_issue_evidence_unbound/,
  'a review issue must point to evidence bound to the reviewed proposal',
)
assert.throws(
  () => assertMiroFishCharacterReview({
    ...pass,
    decision: 'reject',
    issues: [{
      proposalKind: 'character',
      proposalIndex: 0,
      code: 'evidence_overclaim',
      evidenceQuote: '我会先说明风险，再让同伴共同决定。',
      diagnosis: '这句只证明当下选择，不能证明永久性格变化。',
    }],
  }, request, result),
  /mirofish_review_character_both_verified_and_rejected/,
  'one proposal cannot be both verified and rejected',
)
assert.doesNotThrow(() => assertMiroFishCharacterReview({
  ...pass,
  decision: 'reject',
  verifiedCharacterProposalIndexes: [],
  issues: [{
    proposalKind: 'character',
    proposalIndex: 0,
    code: 'evidence_overclaim',
    evidenceQuote: '我会先说明风险，再让同伴共同决定。',
    diagnosis: '这句只证明当下选择，不能证明永久性格变化。',
  }],
}, request, result))

const partialReject = {
  ...pass,
  decision: 'reject',
  verifiedSettingProposalIndexes: [],
  issues: [{
    proposalKind: 'setting',
    proposalIndex: 0,
    code: 'evidence_overclaim',
    evidenceQuote: '旧门只有在两人同时压住刻印时才会打开。',
    diagnosis: '这条证据不足以支持候选中的永久规则。',
  }],
}
const validRevision = {
  ...structuredClone(result),
  settingAssetProposals: [],
}
assert.doesNotThrow(
  () => assertMiroFishSemanticRevisionPreservesVerified(result, partialReject, validRevision),
  'semantic revision may remove a rejected proposal while preserving verified candidates',
)
assert.throws(
  () => assertMiroFishSemanticRevisionPreservesVerified(result, partialReject, {
    ...structuredClone(validRevision),
    characterCardProposals: [{
      ...structuredClone(result.characterCardProposals[0]),
      title: '偷偷改写已验证人物卡',
    }],
  }),
  /mirofish_semantic_revision_changed_verified_proposal/,
  'semantic revision must not rewrite a verified proposal',
)
assert.throws(
  () => assertMiroFishSemanticRevisionPreservesVerified(result, partialReject, {
    ...structuredClone(validRevision),
    evidence: [{
      ...structuredClone(result.evidence[0]),
      quote: '被改写的证据',
    }, structuredClone(result.evidence[1])],
  }),
  /mirofish_semantic_revision_changed_verified_evidence/,
  'semantic revision must not rewrite evidence bound to a verified proposal',
)
assert.throws(
  () => assertMiroFishSemanticRevisionPreservesVerified(result, partialReject, {
    ...structuredClone(validRevision),
    characterCardProposals: [
      structuredClone(result.characterCardProposals[0]),
      { id: 'character-proposal:invented', evidenceIds: ['evidence:character'] },
    ],
  }),
  /mirofish_semantic_revision_added_proposal/,
  'semantic revision must not introduce a new proposal identity',
)

console.log('[mirofish-character-review] PASS')
