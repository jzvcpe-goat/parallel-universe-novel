import { z } from 'zod'
import { CreationDecisionError } from './types'

export const longformContinuityDimensionSchema = z.enum([
  'causal_handoff',
  'knowledge_boundary',
  'timeline',
  'promise',
  'foreshadowing',
  'character_motivation',
  'setting_consistency',
  'repetition',
  'voice_drift',
])

export const longformContinuityFindingSchema = z.object({
  dimension: longformContinuityDimensionSchema,
  severity: z.enum(['hard_block', 'revision_candidate', 'watch']),
  fromChapter: z.number().int().positive(),
  toChapter: z.number().int().positive(),
  sourceEvidenceQuote: z.string().min(2).max(180),
  targetEvidenceQuote: z.string().min(2).max(180),
  expected: z.string().min(8).max(240),
  observed: z.string().min(8).max(240),
  readerImpact: z.string().min(8).max(240),
  diagnosis: z.string().min(8).max(240),
  repairTargetChapter: z.number().int().positive(),
  repairDirection: z.string().min(8).max(240),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict()

export const longformContinuityTransitionSchema = z.object({
  fromChapter: z.number().int().positive(),
  toChapter: z.number().int().positive(),
  status: z.enum(['pass', 'needs_revision', 'blocked']),
  findingIndexes: z.array(z.number().int().nonnegative()).max(8),
}).strict()

export const longformContinuityReviewSchema = z.object({
  schemaVersion: z.literal('creator-longform-continuity-review.v1'),
  windowStart: z.number().int().positive(),
  windowEnd: z.number().int().positive(),
  inspectedTransitions: z.array(longformContinuityTransitionSchema).min(1).max(8),
  findings: z.array(longformContinuityFindingSchema).max(12),
}).strict()

export type LongformContinuityReview = z.infer<typeof longformContinuityReviewSchema>

export const longformContinuityVerificationItemSchema = z.object({
  findingIndex: z.number().int().nonnegative(),
  fromChapter: z.number().int().positive(),
  toChapter: z.number().int().positive(),
  decision: z.enum(['verify', 'reject']),
  confirmedSeverity: z.enum(['hard_block', 'revision_candidate', 'watch']).nullable(),
  sourceEvidenceQuote: z.string().min(2).max(180),
  targetEvidenceQuote: z.string().min(2).max(180),
  diagnosis: z.string().min(8).max(320),
}).strict()

export const longformContinuityVerificationSchema = z.object({
  schemaVersion: z.literal('creator-longform-continuity-verification.v1'),
  items: z.array(longformContinuityVerificationItemSchema).max(12),
  rationale: z.string().min(8).max(320),
}).strict()

export type LongformContinuityVerification = z.infer<typeof longformContinuityVerificationSchema>

export interface LongformContinuityChapter {
  chapterNumber: number
  chapterId: string
  blocks: Array<{
    id: string
    text: string
  }>
}

export interface LocatedLongformContinuityFinding {
  findingIndex: number
  sourceBlockId: string
  targetBlockId: string
}

export interface LocatedLongformContinuityVerification {
  findingIndex: number
  sourceBlockId: string
  targetBlockId: string
}

function chapterMap(chapters: LongformContinuityChapter[]) {
  const byNumber = new Map<number, LongformContinuityChapter>()
  for (const chapter of chapters) {
    if (!Number.isInteger(chapter.chapterNumber) || chapter.chapterNumber <= 0) {
      throw new CreationDecisionError('model_output_invalid', 'Long-form continuity chapters require positive chapter numbers.')
    }
    if (byNumber.has(chapter.chapterNumber)) {
      throw new CreationDecisionError('model_output_invalid', `Duplicate Chapter ${chapter.chapterNumber} continuity input.`)
    }
    if (chapter.blocks.length === 0) {
      throw new CreationDecisionError('evidence_missing', `Chapter ${chapter.chapterNumber} has no accepted manuscript blocks.`)
    }
    byNumber.set(chapter.chapterNumber, chapter)
  }
  return byNumber
}

function expectedTransitions(chapters: LongformContinuityChapter[]) {
  const chapterNumbers = chapters
    .map(chapter => chapter.chapterNumber)
    .sort((left, right) => left - right)
  const transitions: Array<{ fromChapter: number; toChapter: number }> = []
  for (let index = 1; index < chapterNumbers.length; index += 1) {
    const fromChapter = chapterNumbers[index - 1]!
    const toChapter = chapterNumbers[index]!
    if (toChapter !== fromChapter + 1) {
      throw new CreationDecisionError(
        'model_output_invalid',
        `Long-form continuity input skips Chapter ${fromChapter + 1}.`,
      )
    }
    transitions.push({ fromChapter, toChapter })
  }
  return transitions
}

function locateQuote(chapter: LongformContinuityChapter, quote: string) {
  return chapter.blocks.find(block => block.text.includes(quote)) || null
}

export function validateLongformContinuityReview(input: {
  chapters: LongformContinuityChapter[]
  review: LongformContinuityReview
}) {
  const chapters = [...input.chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)
  if (chapters.length < 2) {
    throw new CreationDecisionError('model_output_invalid', 'A continuity review needs at least two consecutive chapters.')
  }
  const byNumber = chapterMap(chapters)
  const expected = expectedTransitions(chapters)
  if (
    input.review.windowStart !== chapters[0]!.chapterNumber
    || input.review.windowEnd !== chapters[chapters.length - 1]!.chapterNumber
  ) {
    throw new CreationDecisionError('model_output_invalid', 'The continuity review changed its requested chapter window.')
  }
  if (input.review.inspectedTransitions.length !== expected.length) {
    throw new CreationDecisionError('model_output_invalid', 'The continuity review did not account for every adjacent transition.')
  }

  const locatedFindings: LocatedLongformContinuityFinding[] = []
  const findingKeys = new Set<string>()
  for (const [findingIndex, finding] of input.review.findings.entries()) {
    if (finding.toChapter !== finding.fromChapter + 1) {
      throw new CreationDecisionError('model_output_invalid', 'Continuity findings must compare adjacent chapters.')
    }
    if (finding.repairTargetChapter !== finding.toChapter) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A continuity repair must target the later chapter and cannot rewrite accepted history.',
      )
    }
    const sourceChapter = byNumber.get(finding.fromChapter)
    const targetChapter = byNumber.get(finding.toChapter)
    if (!sourceChapter || !targetChapter) {
      throw new CreationDecisionError('evidence_missing', 'A continuity finding references a chapter outside its review window.')
    }
    const sourceBlock = locateQuote(sourceChapter, finding.sourceEvidenceQuote)
    const targetBlock = locateQuote(targetChapter, finding.targetEvidenceQuote)
    if (!sourceBlock || !targetBlock) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The Chapter ${finding.fromChapter}-${finding.toChapter} continuity finding lacks exact evidence in both manuscripts.`,
      )
    }
    const findingKey = [
      finding.dimension,
      finding.fromChapter,
      finding.toChapter,
      sourceBlock.id,
      finding.sourceEvidenceQuote,
      targetBlock.id,
      finding.targetEvidenceQuote,
    ].join(':')
    if (findingKeys.has(findingKey)) {
      throw new CreationDecisionError('model_output_invalid', 'The continuity review returned a duplicate finding.')
    }
    findingKeys.add(findingKey)
    locatedFindings.push({ findingIndex, sourceBlockId: sourceBlock.id, targetBlockId: targetBlock.id })
  }

  for (const [transitionIndex, transition] of input.review.inspectedTransitions.entries()) {
    const expectedTransition = expected[transitionIndex]!
    if (
      transition.fromChapter !== expectedTransition.fromChapter
      || transition.toChapter !== expectedTransition.toChapter
    ) {
      throw new CreationDecisionError('model_output_invalid', 'Continuity transitions must remain complete and ordered.')
    }
    const indexes = [...transition.findingIndexes].sort((left, right) => left - right)
    if (new Set(indexes).size !== indexes.length || indexes.some(index => index >= input.review.findings.length)) {
      throw new CreationDecisionError('model_output_invalid', 'A continuity transition references invalid or duplicate findings.')
    }
    const transitionFindings = indexes.map(index => input.review.findings[index]!)
    if (transitionFindings.some(finding => (
      finding.fromChapter !== transition.fromChapter || finding.toChapter !== transition.toChapter
    ))) {
      throw new CreationDecisionError('model_output_invalid', 'A continuity transition claimed another chapter pair\'s finding.')
    }
    if (transition.status === 'pass' && indexes.length > 0) {
      throw new CreationDecisionError('model_output_invalid', 'A passing transition cannot retain active findings.')
    }
    if (transition.status === 'needs_revision' && (
      indexes.length === 0 || transitionFindings.some(finding => finding.severity === 'hard_block')
    )) {
      throw new CreationDecisionError('model_output_invalid', 'A revision transition needs only non-blocking located findings.')
    }
    if (transition.status === 'blocked' && !transitionFindings.some(finding => finding.severity === 'hard_block')) {
      throw new CreationDecisionError('model_output_invalid', 'A blocked transition requires a located hard-block finding.')
    }
  }

  const referencedFindingIndexes = new Set(
    input.review.inspectedTransitions.flatMap(transition => transition.findingIndexes),
  )
  if (referencedFindingIndexes.size !== input.review.findings.length) {
    throw new CreationDecisionError('model_output_invalid', 'Every continuity finding must belong to exactly one transition.')
  }
  return locatedFindings
}

const severityRank = {
  watch: 0,
  revision_candidate: 1,
  hard_block: 2,
} as const

export function validateLongformContinuityVerification(input: {
  chapters: LongformContinuityChapter[]
  findings: LongformContinuityReview['findings']
  verification: LongformContinuityVerification
}) {
  const byNumber = chapterMap(input.chapters)
  if (input.verification.items.length !== input.findings.length) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'The independent continuity verification did not account for every finding.',
    )
  }

  const locatedItems: LocatedLongformContinuityVerification[] = []
  const verifiedIndexes = new Set<number>()
  for (const item of input.verification.items) {
    if (item.findingIndex >= input.findings.length || verifiedIndexes.has(item.findingIndex)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'The independent continuity verification contains an invalid or duplicate finding index.',
      )
    }
    verifiedIndexes.add(item.findingIndex)
    const finding = input.findings[item.findingIndex]!
    if (item.fromChapter !== finding.fromChapter || item.toChapter !== finding.toChapter) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'The independent continuity verification changed a finding chapter pair.',
      )
    }
    if (item.decision === 'verify') {
      if (!item.confirmedSeverity) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'A verified continuity finding requires a confirmed severity.',
        )
      }
      if (severityRank[item.confirmedSeverity] > severityRank[finding.severity]) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'Independent continuity verification cannot escalate the original finding severity.',
        )
      }
    } else if (item.confirmedSeverity !== null) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A rejected continuity finding cannot retain a confirmed severity.',
      )
    }

    const sourceChapter = byNumber.get(item.fromChapter)
    const targetChapter = byNumber.get(item.toChapter)
    if (!sourceChapter || !targetChapter) {
      throw new CreationDecisionError(
        'evidence_missing',
        'The independent continuity verification references a chapter outside its evidence set.',
      )
    }
    const sourceBlock = locateQuote(sourceChapter, item.sourceEvidenceQuote)
    const targetBlock = locateQuote(targetChapter, item.targetEvidenceQuote)
    if (!sourceBlock || !targetBlock) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The Chapter ${item.fromChapter}-${item.toChapter} verification lacks exact evidence in both manuscripts.`,
      )
    }
    locatedItems.push({
      findingIndex: item.findingIndex,
      sourceBlockId: sourceBlock.id,
      targetBlockId: targetBlock.id,
    })
  }

  const expectedIndexes = input.findings.map((_, index) => index)
  const actualIndexes = [...verifiedIndexes].sort((left, right) => left - right)
  if (actualIndexes.some((value, index) => value !== expectedIndexes[index])) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'The independent continuity verification skipped a finding.',
    )
  }
  return locatedItems.sort((left, right) => left.findingIndex - right.findingIndex)
}
