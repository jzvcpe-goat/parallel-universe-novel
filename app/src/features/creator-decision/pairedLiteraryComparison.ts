import { z } from 'zod'
import { CreationDecisionError } from './types'

export const pairedLiteraryDimensions = [
  'continuity',
  'tension',
  'information_control',
  'character_agency',
  'voice',
  'freshness',
  'genre_fulfillment',
  'repetition',
  'exposition',
  'scene_detail',
  'pacing',
] as const

export const pairedLiteraryDimensionSchema = z.enum(pairedLiteraryDimensions)
export const blindCandidateSchema = z.enum(['candidate_a', 'candidate_b'])
export const pairedPreferenceSchema = z.enum(['candidate_a', 'candidate_b', 'tie'])

export const pairedLiteraryTradeoffReasonCodes = [
  'canon_alignment_weaker',
  'causal_escalation_weaker',
  'information_released_too_early',
  'inference_outpaces_evidence',
  'choice_pre_scripted',
  'choice_consequence_weaker',
  'voice_flattened',
  'mechanism_familiar',
  'language_repetitive',
  'genre_action_underrealized',
  'exposition_overloaded',
  'embodied_detail_weaker',
  'pacing_overcompressed',
  'pacing_overextended',
  'beat_structure_mechanical',
  'ending_pressure_weaker',
  'balanced_tradeoff',
  'no_material_difference',
] as const

export const pairedLiteraryTradeoffReasonCodeSchema = z.enum(pairedLiteraryTradeoffReasonCodes)

export const pairedHardConstraintReasonCodes = [
  'no_violation',
  'required_causal_consequence_omitted',
  'canon_fact_contradicted',
  'character_knows_forbidden_fact',
  'timeline_location_contradicted',
  'explicit_hard_constraint_broken',
  'forbidden_resolution_revealed',
] as const

export const pairedHardConstraintReasonCodeSchema = z.enum(pairedHardConstraintReasonCodes)

type PairedLiteraryDimension = typeof pairedLiteraryDimensions[number]
type PairedLiteraryTradeoffReasonCode = typeof pairedLiteraryTradeoffReasonCodes[number]
type PairedHardConstraintReasonCode = typeof pairedHardConstraintReasonCodes[number]

const hardConstraintReasonCodesByViolation = {
  none: new Set<PairedHardConstraintReasonCode>(['no_violation']),
  continuity: new Set<PairedHardConstraintReasonCode>([
    'required_causal_consequence_omitted',
    'canon_fact_contradicted',
  ]),
  character_knowledge: new Set<PairedHardConstraintReasonCode>(['character_knows_forbidden_fact']),
  timeline: new Set<PairedHardConstraintReasonCode>(['timeline_location_contradicted']),
  hard_constraint: new Set<PairedHardConstraintReasonCode>(['explicit_hard_constraint_broken']),
  must_not_resolve: new Set<PairedHardConstraintReasonCode>(['forbidden_resolution_revealed']),
} as const

const tieReasonCodes = new Set<PairedLiteraryTradeoffReasonCode>([
  'balanced_tradeoff',
  'no_material_difference',
])

const reasonCodesByDimension: Record<PairedLiteraryDimension, ReadonlySet<PairedLiteraryTradeoffReasonCode>> = {
  continuity: new Set(['canon_alignment_weaker', 'inference_outpaces_evidence', 'balanced_tradeoff', 'no_material_difference']),
  tension: new Set(['causal_escalation_weaker', 'pacing_overcompressed', 'pacing_overextended', 'beat_structure_mechanical', 'ending_pressure_weaker', 'balanced_tradeoff', 'no_material_difference']),
  information_control: new Set(['information_released_too_early', 'inference_outpaces_evidence', 'exposition_overloaded', 'balanced_tradeoff', 'no_material_difference']),
  character_agency: new Set(['choice_pre_scripted', 'choice_consequence_weaker', 'balanced_tradeoff', 'no_material_difference']),
  voice: new Set(['voice_flattened', 'language_repetitive', 'balanced_tradeoff', 'no_material_difference']),
  freshness: new Set(['mechanism_familiar', 'language_repetitive', 'beat_structure_mechanical', 'balanced_tradeoff', 'no_material_difference']),
  genre_fulfillment: new Set(['genre_action_underrealized', 'embodied_detail_weaker', 'causal_escalation_weaker', 'balanced_tradeoff', 'no_material_difference']),
  repetition: new Set(['mechanism_familiar', 'language_repetitive', 'beat_structure_mechanical', 'balanced_tradeoff', 'no_material_difference']),
  exposition: new Set(['exposition_overloaded', 'information_released_too_early', 'balanced_tradeoff', 'no_material_difference']),
  scene_detail: new Set(['embodied_detail_weaker', 'genre_action_underrealized', 'balanced_tradeoff', 'no_material_difference']),
  pacing: new Set(['pacing_overcompressed', 'pacing_overextended', 'beat_structure_mechanical', 'causal_escalation_weaker', 'ending_pressure_weaker', 'balanced_tradeoff', 'no_material_difference']),
}

function validateTradeoffReason(input: {
  dimension: PairedLiteraryDimension
  preference: z.infer<typeof pairedPreferenceSchema>
  reasonCode: PairedLiteraryTradeoffReasonCode
}, context: z.RefinementCtx) {
  if (!reasonCodesByDimension[input.dimension].has(input.reasonCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reasonCode'],
      message: `Reason code ${input.reasonCode} does not explain ${input.dimension}.`,
    })
  }
  if (input.preference === 'tie' && !tieReasonCodes.has(input.reasonCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reasonCode'],
      message: 'A tie must identify a balanced tradeoff or no material difference.',
    })
  }
  if (input.preference !== 'tie' && tieReasonCodes.has(input.reasonCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reasonCode'],
      message: 'A candidate preference needs an actionable weakness code, not a tie reason.',
    })
  }
}

const evidenceBlockIdListSchema = z.array(z.string().min(3).max(120)).min(1).max(3)

const pairedDimensionComparisonSchema = z.object({
  dimension: pairedLiteraryDimensionSchema,
  preference: pairedPreferenceSchema,
  reasonCode: pairedLiteraryTradeoffReasonCodeSchema,
  candidateAEvidenceBlockIds: evidenceBlockIdListSchema,
  candidateBEvidenceBlockIds: evidenceBlockIdListSchema,
  diagnosis: z.string().min(12).max(320),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict().superRefine((item, context) => validateTradeoffReason({
  dimension: item.dimension,
  preference: item.preference,
  reasonCode: item.reasonCode,
}, context))

const pairedHardConstraintAssessmentSchema = z.object({
  candidate: blindCandidateSchema,
  status: z.enum(['pass', 'fail']),
  violationType: z.enum([
    'none',
    'continuity',
    'character_knowledge',
    'timeline',
    'hard_constraint',
    'must_not_resolve',
  ]),
  reasonCode: pairedHardConstraintReasonCodeSchema,
  evidenceBlockIds: z.array(z.string().min(3).max(120)).max(3),
  diagnosis: z.string().min(8).max(280),
}).strict().superRefine((assessment, context) => {
  if (!hardConstraintReasonCodesByViolation[assessment.violationType].has(assessment.reasonCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reasonCode'],
      message: `Hard-constraint reason ${assessment.reasonCode} does not explain ${assessment.violationType}.`,
    })
  }
  if (assessment.status === 'pass') {
    if (
      assessment.violationType !== 'none'
      || assessment.reasonCode !== 'no_violation'
      || assessment.evidenceBlockIds.length > 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A passing hard-constraint assessment cannot include a violation or evidence quote.',
      })
    }
    return
  }
  if (assessment.violationType === 'none' || assessment.evidenceBlockIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A failing hard-constraint assessment needs a typed, located violation.',
    })
  }
})

export const pairedLiteraryComparisonSchema = z.object({
  schemaVersion: z.literal('creator-paired-literary-comparison.v1'),
  comparisonId: z.string().min(8).max(180),
  dimensions: z.array(pairedDimensionComparisonSchema).length(pairedLiteraryDimensions.length),
  hardConstraints: z.array(pairedHardConstraintAssessmentSchema).length(2),
  compositeLiteraryScoreUsed: z.literal(false),
}).strict()

const pairedDimensionVerificationSchema = z.object({
  dimension: pairedLiteraryDimensionSchema,
  decision: z.enum(['verify', 'reject']),
  confirmedPreference: pairedPreferenceSchema.nullable(),
  confirmedReasonCode: pairedLiteraryTradeoffReasonCodeSchema.nullable(),
  candidateAEvidenceBlockIds: evidenceBlockIdListSchema,
  candidateBEvidenceBlockIds: evidenceBlockIdListSchema,
  rationale: z.string().min(12).max(320),
}).strict().superRefine((item, context) => {
  if (item.decision === 'verify' && item.confirmedPreference === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A verified dimension needs a confirmed preference.',
    })
  }
  if (item.decision === 'verify' && item.confirmedReasonCode === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A verified dimension needs a confirmed tradeoff reason code.',
    })
  }
  if (item.decision === 'reject' && (item.confirmedPreference !== null || item.confirmedReasonCode !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A rejected dimension cannot retain a confirmed preference or reason code.',
    })
  }
  if (item.confirmedPreference !== null && item.confirmedReasonCode !== null) {
    validateTradeoffReason({
      dimension: item.dimension,
      preference: item.confirmedPreference,
      reasonCode: item.confirmedReasonCode,
    }, context)
  }
})

const pairedHardConstraintVerificationSchema = z.object({
  candidate: blindCandidateSchema,
  decision: z.enum(['verify', 'reject']),
  confirmedStatus: z.enum(['pass', 'fail']).nullable(),
  confirmedViolationType: z.enum([
    'none',
    'continuity',
    'character_knowledge',
    'timeline',
    'hard_constraint',
    'must_not_resolve',
  ]).nullable(),
  confirmedReasonCode: pairedHardConstraintReasonCodeSchema.nullable(),
  evidenceBlockIds: z.array(z.string().min(3).max(120)).max(3),
  rationale: z.string().min(8).max(280),
}).strict().superRefine((item, context) => {
  if (
    item.decision === 'verify'
    && (
      item.confirmedStatus === null
      || item.confirmedViolationType === null
      || item.confirmedReasonCode === null
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A verified hard-constraint item needs a confirmed status, violation type, and reason code.',
    })
  }
  if (
    item.decision === 'reject'
    && (
      item.confirmedStatus !== null
      || item.confirmedViolationType !== null
      || item.confirmedReasonCode !== null
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A rejected hard-constraint item cannot retain a confirmed status, violation type, or reason code.',
    })
  }
  if (item.confirmedViolationType !== null && item.confirmedReasonCode !== null) {
    if (!hardConstraintReasonCodesByViolation[item.confirmedViolationType].has(item.confirmedReasonCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmedReasonCode'],
        message: 'A confirmed hard-constraint reason must explain the confirmed violation type.',
      })
    }
  }
})

export const pairedLiteraryComparisonVerificationSchema = z.object({
  schemaVersion: z.literal('creator-paired-literary-comparison-verification.v1'),
  comparisonId: z.string().min(8).max(180),
  dimensions: z.array(pairedDimensionVerificationSchema).length(pairedLiteraryDimensions.length),
  hardConstraints: z.array(pairedHardConstraintVerificationSchema).length(2),
  compositeLiteraryScoreUsed: z.literal(false),
}).strict()

export type PairedLiteraryComparison = z.infer<typeof pairedLiteraryComparisonSchema>
export type PairedLiteraryComparisonVerification = z.infer<typeof pairedLiteraryComparisonVerificationSchema>
export type BlindCandidate = z.infer<typeof blindCandidateSchema>
export interface PairedLiteraryEvidenceBlock {
  id: string
  text: string
}

export interface PairedLiteraryComparisonEvidenceIssue {
  section: 'dimension' | 'hard_constraint'
  dimension?: PairedLiteraryDimension
  candidate: BlindCandidate
  blockId: string
}

function assertOrderedDimensions(dimensions: Array<{ dimension: string }>, label: string) {
  const actual = dimensions.map(item => item.dimension)
  if (
    actual.length !== pairedLiteraryDimensions.length
    || actual.some((dimension, index) => dimension !== pairedLiteraryDimensions[index])
  ) {
    throw new CreationDecisionError(
      'model_output_invalid',
      `${label} must account for every literary dimension exactly once and in contract order.`,
    )
  }
}

function blockMap(blocks: PairedLiteraryEvidenceBlock[], label: string) {
  const result = new Map<string, string>()
  for (const block of blocks) {
    if (!block.id || !block.text.trim() || result.has(block.id)) {
      throw new CreationDecisionError('model_output_invalid', `${label} contains an invalid evidence block.`)
    }
    result.set(block.id, block.text)
  }
  if (result.size === 0) {
    throw new CreationDecisionError('model_output_invalid', `${label} has no evidence blocks.`)
  }
  return result
}

function assertBothCandidates<T extends { candidate: BlindCandidate }>(items: T[], label: string) {
  const candidates = items.map(item => item.candidate)
  if (candidates[0] !== 'candidate_a' || candidates[1] !== 'candidate_b') {
    throw new CreationDecisionError(
      'model_output_invalid',
      `${label} must account for candidate_a and candidate_b exactly once in order.`,
    )
  }
}

export function pairedLiteraryComparisonEvidenceIssues(input: {
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
  comparison: PairedLiteraryComparison
}): PairedLiteraryComparisonEvidenceIssue[] {
  const candidateABlocks = blockMap(input.candidateABlocks, 'candidate_a')
  const candidateBBlocks = blockMap(input.candidateBBlocks, 'candidate_b')
  const issues: PairedLiteraryComparisonEvidenceIssue[] = []
  for (const item of input.comparison.dimensions) {
    for (const blockId of item.candidateAEvidenceBlockIds) {
      if (!candidateABlocks.has(blockId)) {
        issues.push({ section: 'dimension', dimension: item.dimension, candidate: 'candidate_a', blockId })
      }
    }
    for (const blockId of item.candidateBEvidenceBlockIds) {
      if (!candidateBBlocks.has(blockId)) {
        issues.push({ section: 'dimension', dimension: item.dimension, candidate: 'candidate_b', blockId })
      }
    }
  }
  for (const item of input.comparison.hardConstraints) {
    const blocks = item.candidate === 'candidate_a' ? candidateABlocks : candidateBBlocks
    for (const blockId of item.evidenceBlockIds) {
      if (!blocks.has(blockId)) {
        issues.push({ section: 'hard_constraint', candidate: item.candidate, blockId })
      }
    }
  }
  return issues
}

export function pairedLiteraryComparisonVerificationEvidenceIssues(input: {
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
  verification: PairedLiteraryComparisonVerification
}): PairedLiteraryComparisonEvidenceIssue[] {
  const candidateABlocks = blockMap(input.candidateABlocks, 'candidate_a')
  const candidateBBlocks = blockMap(input.candidateBBlocks, 'candidate_b')
  const issues: PairedLiteraryComparisonEvidenceIssue[] = []
  for (const item of input.verification.dimensions) {
    for (const blockId of item.candidateAEvidenceBlockIds) {
      if (!candidateABlocks.has(blockId)) {
        issues.push({ section: 'dimension', dimension: item.dimension, candidate: 'candidate_a', blockId })
      }
    }
    for (const blockId of item.candidateBEvidenceBlockIds) {
      if (!candidateBBlocks.has(blockId)) {
        issues.push({ section: 'dimension', dimension: item.dimension, candidate: 'candidate_b', blockId })
      }
    }
  }
  for (const item of input.verification.hardConstraints) {
    const blocks = item.candidate === 'candidate_a' ? candidateABlocks : candidateBBlocks
    for (const blockId of item.evidenceBlockIds) {
      if (!blocks.has(blockId)) {
        issues.push({ section: 'hard_constraint', candidate: item.candidate, blockId })
      }
    }
  }
  return issues
}

export function assertPairedLiteraryVerificationEvidenceRevision(input: {
  previous: PairedLiteraryComparisonVerification
  revised: PairedLiteraryComparisonVerification
  evidenceIssues: PairedLiteraryComparisonEvidenceIssue[]
}) {
  const affectedDimensionSides = new Set(input.evidenceIssues
    .filter(issue => issue.section === 'dimension')
    .map(issue => `${issue.dimension}:${issue.candidate}`))
  const affectedHardCandidates = new Set(input.evidenceIssues
    .filter(issue => issue.section === 'hard_constraint')
    .map(issue => issue.candidate))
  for (let index = 0; index < input.previous.dimensions.length; index += 1) {
    const previous = input.previous.dimensions[index]!
    const revised = input.revised.dimensions[index]!
    if (
      revised.dimension !== previous.dimension
      || revised.decision !== previous.decision
      || revised.confirmedPreference !== previous.confirmedPreference
      || revised.confirmedReasonCode !== previous.confirmedReasonCode
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'The verification evidence revision changed a literary judgment.',
      )
    }
    if (
      !affectedDimensionSides.has(`${previous.dimension}:candidate_a`)
      && JSON.stringify(revised.candidateAEvidenceBlockIds) !== JSON.stringify(previous.candidateAEvidenceBlockIds)
    ) {
      throw new CreationDecisionError('model_output_invalid', 'The verification revision changed unaffected Candidate A evidence.')
    }
    if (
      !affectedDimensionSides.has(`${previous.dimension}:candidate_b`)
      && JSON.stringify(revised.candidateBEvidenceBlockIds) !== JSON.stringify(previous.candidateBEvidenceBlockIds)
    ) {
      throw new CreationDecisionError('model_output_invalid', 'The verification revision changed unaffected Candidate B evidence.')
    }
    if (
      !affectedDimensionSides.has(`${previous.dimension}:candidate_a`)
      && !affectedDimensionSides.has(`${previous.dimension}:candidate_b`)
      && revised.rationale !== previous.rationale
    ) {
      throw new CreationDecisionError('model_output_invalid', 'The verification revision changed an unaffected rationale.')
    }
  }
  for (let index = 0; index < input.previous.hardConstraints.length; index += 1) {
    const previous = input.previous.hardConstraints[index]!
    const revised = input.revised.hardConstraints[index]!
    if (
      revised.candidate !== previous.candidate
      || revised.decision !== previous.decision
      || revised.confirmedStatus !== previous.confirmedStatus
      || revised.confirmedViolationType !== previous.confirmedViolationType
      || revised.confirmedReasonCode !== previous.confirmedReasonCode
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'The verification evidence revision changed a hard-constraint judgment.',
      )
    }
    if (
      !affectedHardCandidates.has(previous.candidate)
      && JSON.stringify(revised) !== JSON.stringify(previous)
    ) {
      throw new CreationDecisionError('model_output_invalid', 'The verification revision changed an unaffected hard constraint.')
    }
  }
  return input.revised
}

export function validatePairedLiteraryComparison(input: {
  comparisonId: string
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
  comparison: PairedLiteraryComparison
}) {
  const comparison = pairedLiteraryComparisonSchema.parse(input.comparison)
  if (comparison.comparisonId !== input.comparisonId) {
    throw new CreationDecisionError('model_output_invalid', 'The blind comparison changed its comparison id.')
  }
  assertOrderedDimensions(comparison.dimensions, 'The blind comparison')
  assertBothCandidates(comparison.hardConstraints, 'The blind comparison hard-constraint section')
  const evidenceIssues = pairedLiteraryComparisonEvidenceIssues({
    candidateABlocks: input.candidateABlocks,
    candidateBBlocks: input.candidateBBlocks,
    comparison,
  })
  if (evidenceIssues.length > 0) {
    const details = evidenceIssues.map(issue => (
      `${issue.section}:${issue.dimension || 'none'}:${issue.candidate}:${issue.blockId}`
    )).join(', ')
    throw new CreationDecisionError(
      'evidence_missing',
      `The blind comparison contains an unlocatable manuscript block id: ${details}`,
    )
  }
  return comparison
}

export function validatePairedLiteraryComparisonVerification(input: {
  comparisonId: string
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
  comparison: PairedLiteraryComparison
  verification: PairedLiteraryComparisonVerification
}) {
  const verification = pairedLiteraryComparisonVerificationSchema.parse(input.verification)
  if (verification.comparisonId !== input.comparisonId) {
    throw new CreationDecisionError('model_output_invalid', 'The blind verification changed its comparison id.')
  }
  assertOrderedDimensions(verification.dimensions, 'The blind verification')
  assertBothCandidates(verification.hardConstraints, 'The blind verification hard-constraint section')
  for (const item of verification.dimensions) {
    const original = input.comparison.dimensions.find(candidate => candidate.dimension === item.dimension)
    if (!original) {
      throw new CreationDecisionError('model_output_invalid', 'The blind verification introduced a new dimension.')
    }
    if (item.decision === 'verify' && item.confirmedPreference !== original.preference) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A verified dimension must confirm the original preference without silently changing it.',
      )
    }
    if (item.decision === 'verify' && item.confirmedReasonCode !== original.reasonCode) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A verified dimension must confirm the original reason code without silently changing it.',
      )
    }
  }

  for (const item of verification.hardConstraints) {
    const original = input.comparison.hardConstraints.find(candidate => candidate.candidate === item.candidate)
    if (!original) {
      throw new CreationDecisionError('model_output_invalid', 'The blind verification introduced a new candidate.')
    }
    if (item.decision === 'verify' && item.confirmedStatus !== original.status) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A verified hard-constraint item must confirm the original status.',
      )
    }
    if (item.decision === 'verify' && item.confirmedViolationType !== original.violationType) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A verified hard-constraint item must confirm the original violation type.',
      )
    }
    if (item.decision === 'verify' && item.confirmedReasonCode !== original.reasonCode) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A verified hard-constraint item must confirm the original reason code without silently changing it.',
      )
    }
  }

  const evidenceIssues = pairedLiteraryComparisonVerificationEvidenceIssues({
    candidateABlocks: input.candidateABlocks,
    candidateBBlocks: input.candidateBBlocks,
    verification,
  })
  if (evidenceIssues.length > 0) {
    const details = evidenceIssues.map(issue => (
      `${issue.section}:${issue.dimension || 'none'}:${issue.candidate}:${issue.blockId}`
    )).join(', ')
    throw new CreationDecisionError(
      'evidence_missing',
      `The blind verification contains an unlocatable manuscript block id: ${details}`,
    )
  }

  return verification
}
