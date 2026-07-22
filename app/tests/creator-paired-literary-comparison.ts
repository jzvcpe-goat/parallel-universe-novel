import assert from 'node:assert/strict'
import {
  pairedLiteraryDimensions,
  pairedLiteraryComparisonEvidenceIssues,
  pairedLiteraryComparisonVerificationEvidenceIssues,
  assertPairedLiteraryVerificationEvidenceRevision,
  validatePairedLiteraryComparison,
  validatePairedLiteraryComparisonVerification,
  type PairedLiteraryComparison,
  type PairedLiteraryComparisonVerification,
  type PairedLiteraryEvidenceBlock,
} from '../src/features/creator-decision/pairedLiteraryComparison'
import {
  requestPairedLiteraryComparisonFromWorkingAgent,
  requestPairedLiteraryComparisonVerificationFromWorkingAgent,
} from '../src/features/creator-decision/localWorkingAgent'

const comparisonId = 'paired-literary:test:chapter-20'
const candidateABlocks: PairedLiteraryEvidenceBlock[] = [
  { id: 'candidate_a:block:001', text: '候选甲让主角先触碰灼热的铁门，再因错误判断失去退路。' },
  { id: 'candidate_a:block:002', text: '余响停在门后。' },
]
const candidateBBlocks: PairedLiteraryEvidenceBlock[] = [
  { id: 'candidate_b:block:001', text: '候选乙让主角先观察门缝里的灰，再主动留下武器换取同伴通过。' },
  { id: 'candidate_b:block:002', text: '脚步声从下层逼近。' },
]

const actionableReasonByDimension = {
  continuity: 'canon_alignment_weaker',
  tension: 'causal_escalation_weaker',
  information_control: 'information_released_too_early',
  character_agency: 'choice_pre_scripted',
  voice: 'voice_flattened',
  freshness: 'mechanism_familiar',
  genre_fulfillment: 'genre_action_underrealized',
  repetition: 'language_repetitive',
  exposition: 'exposition_overloaded',
  scene_detail: 'embodied_detail_weaker',
  pacing: 'pacing_overcompressed',
} as const

const comparison: PairedLiteraryComparison = {
  schemaVersion: 'creator-paired-literary-comparison.v1',
  comparisonId,
  dimensions: pairedLiteraryDimensions.map((dimension, index) => {
    const preference = index % 3 === 0 ? 'candidate_a' : index % 3 === 1 ? 'candidate_b' : 'tie'
    return {
      dimension,
      preference,
      reasonCode: preference === 'tie' ? 'balanced_tradeoff' : actionableReasonByDimension[dimension],
      candidateAEvidenceBlockIds: ['candidate_a:block:001'],
      candidateBEvidenceBlockIds: ['candidate_b:block:001'],
      diagnosis: `维度 ${dimension} 的偏好由两段可定位行动证据支持。`,
      confidence: 'medium',
    }
  }),
  hardConstraints: [
    {
      candidate: 'candidate_a',
      status: 'pass',
      violationType: 'none',
      reasonCode: 'no_violation',
      evidenceBlockIds: [],
      diagnosis: '没有发现可定位的硬约束冲突。',
    },
    {
      candidate: 'candidate_b',
      status: 'pass',
      violationType: 'none',
      reasonCode: 'no_violation',
      evidenceBlockIds: [],
      diagnosis: '没有发现可定位的硬约束冲突。',
    },
  ],
  compositeLiteraryScoreUsed: false,
}

const locatedComparison = validatePairedLiteraryComparison({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison,
})
assert.equal(locatedComparison.dimensions.length, pairedLiteraryDimensions.length)

const verification: PairedLiteraryComparisonVerification = {
  schemaVersion: 'creator-paired-literary-comparison-verification.v1',
  comparisonId,
  dimensions: comparison.dimensions.map(item => ({
    dimension: item.dimension,
    decision: 'verify',
    confirmedPreference: item.preference,
    confirmedReasonCode: item.reasonCode,
    candidateAEvidenceBlockIds: ['candidate_a:block:001'],
    candidateBEvidenceBlockIds: ['candidate_b:block:001'],
    rationale: `重新定位证据后确认 ${item.dimension} 的首轮判断。`,
  })),
  hardConstraints: [
    {
      candidate: 'candidate_a',
      decision: 'verify',
      confirmedStatus: 'pass',
      confirmedViolationType: 'none',
      confirmedReasonCode: 'no_violation',
      evidenceBlockIds: [],
      rationale: '独立复核未发现硬约束冲突。',
    },
    {
      candidate: 'candidate_b',
      decision: 'verify',
      confirmedStatus: 'pass',
      confirmedViolationType: 'none',
      confirmedReasonCode: 'no_violation',
      evidenceBlockIds: [],
      rationale: '独立复核未发现硬约束冲突。',
    },
  ],
  compositeLiteraryScoreUsed: false,
}

const locatedVerification = validatePairedLiteraryComparisonVerification({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison,
  verification,
})
assert.equal(locatedVerification.dimensions.every(item => item.decision === 'verify'), true)

const missingEvidence = structuredClone(comparison)
missingEvidence.dimensions[0]!.candidateAEvidenceBlockIds = ['candidate_a:block:999']
missingEvidence.dimensions[1]!.candidateBEvidenceBlockIds = ['candidate_b:block:999']
assert.deepEqual(
  pairedLiteraryComparisonEvidenceIssues({ candidateABlocks, candidateBBlocks, comparison: missingEvidence }),
  [
    { section: 'dimension', dimension: 'continuity', candidate: 'candidate_a', blockId: 'candidate_a:block:999' },
    { section: 'dimension', dimension: 'tension', candidate: 'candidate_b', blockId: 'candidate_b:block:999' },
  ],
)
assert.throws(() => validatePairedLiteraryComparison({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison: missingEvidence,
}), /unlocatable manuscript block id/)

const wrongOrder = structuredClone(comparison)
const first = wrongOrder.dimensions[0]!
wrongOrder.dimensions[0] = wrongOrder.dimensions[1]!
wrongOrder.dimensions[1] = first
assert.throws(() => validatePairedLiteraryComparison({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison: wrongOrder,
}), /every literary dimension exactly once/)

const silentPreferenceChange = structuredClone(verification)
silentPreferenceChange.dimensions[0]!.confirmedPreference = 'candidate_b'
assert.throws(() => validatePairedLiteraryComparisonVerification({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison,
  verification: silentPreferenceChange,
}), /without silently changing it/)

const silentReasonChange = structuredClone(verification)
silentReasonChange.dimensions[0]!.confirmedReasonCode = 'inference_outpaces_evidence'
assert.throws(() => validatePairedLiteraryComparisonVerification({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison,
  verification: silentReasonChange,
}), /reason code without silently changing it/)

const invalidTieReason = structuredClone(comparison)
const tieItem = invalidTieReason.dimensions.find(item => item.preference === 'tie')!
tieItem.reasonCode = 'mechanism_familiar'
assert.throws(() => validatePairedLiteraryComparison({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison: invalidTieReason,
}), /tie must identify a balanced tradeoff/i)

const hardConstraintComparison = structuredClone(comparison)
hardConstraintComparison.hardConstraints[0] = {
  candidate: 'candidate_a',
  status: 'fail',
  violationType: 'continuity',
  reasonCode: 'required_causal_consequence_omitted',
  evidenceBlockIds: ['candidate_a:block:001'],
  diagnosis: '候选遗漏了当前场景必须承接的上一场因果后果。',
}
const silentHardConstraintReasonChange = structuredClone(verification)
silentHardConstraintReasonChange.hardConstraints[0] = {
  candidate: 'candidate_a',
  decision: 'verify',
  confirmedStatus: 'fail',
  confirmedViolationType: 'continuity',
  confirmedReasonCode: 'canon_fact_contradicted',
  evidenceBlockIds: ['candidate_a:block:001'],
  rationale: '复核声称同一个连续性失败来自正史矛盾。',
}
assert.throws(() => validatePairedLiteraryComparisonVerification({
  comparisonId,
  candidateABlocks,
  candidateBBlocks,
  comparison: hardConstraintComparison,
  verification: silentHardConstraintReasonChange,
}), /reason code without silently changing it/)

const originalFetch = globalThis.fetch
try {
  const requests: Array<Record<string, unknown>> = []
  const responses = [missingEvidence, comparison]
  globalThis.fetch = async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)))
    return new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const repairedResult = await requestPairedLiteraryComparisonFromWorkingAgent({
    baseUrl: 'http://127.0.0.1:4318',
    comparisonId,
    sharedContext: { fixture: 'all-evidence-issues' },
    candidateABlocks,
    candidateBBlocks,
  })
  assert.equal(repairedResult.attempts, 2)
  assert.equal(repairedResult.evidenceRevisionApplied, true)
  assert.equal(requests.length, 2)
  assert.equal(requests[1]!.operation, 'paired_literary_comparison_revision')
  assert.deepEqual(
    (requests[1]!.payload as { validationError: { evidenceIssues: unknown[] } }).validationError.evidenceIssues,
    [
      { section: 'dimension', dimension: 'continuity', candidate: 'candidate_a', blockId: 'candidate_a:block:999' },
      { section: 'dimension', dimension: 'tension', candidate: 'candidate_b', blockId: 'candidate_b:block:999' },
    ],
  )

  requests.length = 0
  responses.push(wrongOrder)
  await assert.rejects(
    requestPairedLiteraryComparisonFromWorkingAgent({
      baseUrl: 'http://127.0.0.1:4318',
      comparisonId,
      sharedContext: { fixture: 'non-evidence-error' },
      candidateABlocks,
      candidateBBlocks,
    }),
    /every literary dimension exactly once/,
  )
  assert.equal(requests.length, 1, 'non-evidence contract errors must not invoke the comparison revision')
} finally {
  globalThis.fetch = originalFetch
}

const missingVerificationEvidence = structuredClone(verification)
missingVerificationEvidence.dimensions[0]!.candidateAEvidenceBlockIds = ['candidate_a:block:998']
missingVerificationEvidence.dimensions[1]!.candidateBEvidenceBlockIds = ['candidate_b:block:998']
const verificationEvidenceIssues = pairedLiteraryComparisonVerificationEvidenceIssues({
  candidateABlocks,
  candidateBBlocks,
  verification: missingVerificationEvidence,
})
assert.deepEqual(verificationEvidenceIssues, [
  { section: 'dimension', dimension: 'continuity', candidate: 'candidate_a', blockId: 'candidate_a:block:998' },
  { section: 'dimension', dimension: 'tension', candidate: 'candidate_b', blockId: 'candidate_b:block:998' },
])

try {
  const requests: Array<Record<string, unknown>> = []
  const responses: unknown[] = [missingVerificationEvidence, verification]
  globalThis.fetch = async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)))
    return new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const repairedVerification = await requestPairedLiteraryComparisonVerificationFromWorkingAgent({
    baseUrl: 'http://127.0.0.1:4318',
    comparisonId,
    sharedContext: { fixture: 'verification-all-evidence-issues' },
    candidateABlocks,
    candidateBBlocks,
    comparison,
  })
  assert.equal(repairedVerification.dimensions.every(item => item.decision === 'verify'), true)
  assert.equal(requests.length, 2)
  assert.equal(requests[1]!.operation, 'paired_literary_comparison_verification_revision')
  assert.deepEqual(
    (requests[1]!.payload as { validationError: { evidenceIssues: unknown[] } }).validationError.evidenceIssues,
    verificationEvidenceIssues,
  )

  const changedJudgment = structuredClone(verification)
  changedJudgment.dimensions[0]!.confirmedPreference = 'candidate_b'
  assert.throws(() => assertPairedLiteraryVerificationEvidenceRevision({
    previous: missingVerificationEvidence,
    revised: changedJudgment,
    evidenceIssues: verificationEvidenceIssues,
  }), /changed a literary judgment/)

  requests.length = 0
  responses.push(silentPreferenceChange)
  await assert.rejects(
    requestPairedLiteraryComparisonVerificationFromWorkingAgent({
      baseUrl: 'http://127.0.0.1:4318',
      comparisonId,
      sharedContext: { fixture: 'verification-non-evidence-error' },
      candidateABlocks,
      candidateBBlocks,
      comparison,
    }),
    /without silently changing it/,
  )
  assert.equal(requests.length, 1, 'non-evidence verification errors must not invoke evidence correction')
} finally {
  globalThis.fetch = originalFetch
}

process.stdout.write('creator paired literary comparison tests passed\n')
