import { z } from 'zod'
import type { LongformContinuityChapter } from './longformContinuity'
import { CreationDecisionError } from './types'

export const longRangeStoryThreadFocusSchema = z.enum([
  'causal_state',
  'promise_arc',
])

export const longRangeStoryThreadDimensionSchema = z.enum([
  'causal_debt',
  'character_knowledge',
  'timeline_anchor',
  'promise',
  'foreshadowing',
  'character_arc',
])

export const longRangeStoryThreadFocusDimensions = {
  causal_state: ['causal_debt', 'character_knowledge', 'timeline_anchor'],
  promise_arc: ['promise', 'foreshadowing', 'character_arc'],
} as const satisfies Record<
  z.infer<typeof longRangeStoryThreadFocusSchema>,
  ReadonlyArray<z.infer<typeof longRangeStoryThreadDimensionSchema>>
>

export const longRangeStoryThreadStatusSchema = z.enum([
  'active',
  'progressed',
  'fulfilled',
  'broken',
])

const longRangeStoryThreadEvidenceSchema = z.object({
  chapter: z.number().int().positive(),
  quote: z.string().min(2).max(180),
  meaning: z.string().min(8).max(240),
}).strict()

export const longRangeStoryThreadSchema = z.object({
  threadId: z.string().min(4).max(80),
  dimension: longRangeStoryThreadDimensionSchema,
  label: z.string().min(2).max(40),
  statement: z.string().min(8).max(240),
  sourceChapter: z.number().int().positive(),
  sourceEvidenceQuote: z.string().min(2).max(180),
  status: longRangeStoryThreadStatusSchema,
  latestEvidence: longRangeStoryThreadEvidenceSchema.nullable(),
  involvedCharacters: z.array(z.string().min(1).max(80)).max(8),
  whyItMatters: z.string().min(8).max(240),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict()

export const longRangeStoryThreadFindingSchema = z.object({
  threadId: z.string().min(4).max(80),
  dimension: longRangeStoryThreadDimensionSchema,
  severity: z.enum(['hard_block', 'revision_candidate', 'watch']),
  sourceChapter: z.number().int().positive(),
  targetChapter: z.number().int().positive(),
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

export const longRangeStoryThreadReviewSchema = z.object({
  schemaVersion: z.literal('creator-long-range-story-thread-review.v1'),
  focus: longRangeStoryThreadFocusSchema,
  fromChapter: z.number().int().positive(),
  toChapter: z.number().int().positive(),
  inspectedChapterNumbers: z.array(z.number().int().positive()).min(2).max(20),
  inspectedDimensions: z.array(longRangeStoryThreadDimensionSchema).length(3),
  threads: z.array(longRangeStoryThreadSchema).max(24),
  findings: z.array(longRangeStoryThreadFindingSchema).max(12),
}).strict()

export type LongRangeStoryThreadReview = z.infer<typeof longRangeStoryThreadReviewSchema>
export type LongRangeStoryThread = z.infer<typeof longRangeStoryThreadSchema>

export const longRangeStoryThreadVerificationItemSchema = z.object({
  threadId: z.string().min(4).max(80),
  decision: z.enum(['verify', 'reject']),
  confirmedStatus: longRangeStoryThreadStatusSchema.nullable(),
  sourceEvidenceQuote: z.string().min(2).max(180),
  latestEvidenceQuote: z.string().min(2).max(180).nullable(),
  rationale: z.string().min(8).max(320),
}).strict()

export const longRangeStoryThreadFindingVerificationSchema = z.object({
  findingIndex: z.number().int().nonnegative(),
  threadId: z.string().min(4).max(80),
  decision: z.enum(['verify', 'reject']),
  confirmedSeverity: z.enum(['hard_block', 'revision_candidate', 'watch']).nullable(),
  sourceEvidenceQuote: z.string().min(2).max(180),
  targetEvidenceQuote: z.string().min(2).max(180),
  rationale: z.string().min(8).max(320),
}).strict()

export const longRangeStoryThreadVerificationSchema = z.object({
  schemaVersion: z.literal('creator-long-range-story-thread-verification.v1'),
  focus: longRangeStoryThreadFocusSchema,
  threadItems: z.array(longRangeStoryThreadVerificationItemSchema).max(24),
  findingItems: z.array(longRangeStoryThreadFindingVerificationSchema).max(12),
  rationale: z.string().min(8).max(320),
}).strict()

export type LongRangeStoryThreadVerification = z.infer<typeof longRangeStoryThreadVerificationSchema>

export interface LocatedLongRangeStoryThread {
  threadId: string
  sourceBlockId: string
  latestEvidenceBlockId: string | null
}

export interface LocatedLongRangeStoryThreadFinding {
  findingIndex: number
  sourceBlockId: string
  targetBlockId: string
}

function chapterMap(chapters: LongformContinuityChapter[]) {
  const byNumber = new Map<number, LongformContinuityChapter>()
  const chapterNumbers = chapters
    .map(chapter => chapter.chapterNumber)
    .sort((left, right) => left - right)
  for (const [index, chapterNumber] of chapterNumbers.entries()) {
    if (index > 0 && chapterNumber !== chapterNumbers[index - 1]! + 1) {
      throw new CreationDecisionError('model_output_invalid', 'Long-range story-thread input must be consecutive.')
    }
  }
  for (const chapter of chapters) {
    if (byNumber.has(chapter.chapterNumber)) {
      throw new CreationDecisionError('model_output_invalid', `Duplicate Chapter ${chapter.chapterNumber} thread input.`)
    }
    if (chapter.blocks.length === 0) {
      throw new CreationDecisionError('evidence_missing', `Chapter ${chapter.chapterNumber} has no accepted manuscript blocks.`)
    }
    byNumber.set(chapter.chapterNumber, chapter)
  }
  return { byNumber, chapterNumbers }
}

function locateQuote(chapter: LongformContinuityChapter, quote: string) {
  return chapter.blocks.find(block => block.text.includes(quote)) || null
}

function assertExactSequence(actual: readonly (string | number)[], expected: readonly (string | number)[], message: string) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new CreationDecisionError('model_output_invalid', message)
  }
}

export function validateLongRangeStoryThreadReview(input: {
  chapters: LongformContinuityChapter[]
  focus: z.infer<typeof longRangeStoryThreadFocusSchema>
  review: LongRangeStoryThreadReview
}) {
  if (input.chapters.length < 3) {
    throw new CreationDecisionError('model_output_invalid', 'A long-range thread review needs at least three chapters.')
  }
  const { byNumber, chapterNumbers } = chapterMap(input.chapters)
  const fromChapter = chapterNumbers[0]!
  const toChapter = chapterNumbers[chapterNumbers.length - 1]!
  if (
    input.review.focus !== input.focus
    || input.review.fromChapter !== fromChapter
    || input.review.toChapter !== toChapter
  ) {
    throw new CreationDecisionError('model_output_invalid', 'The long-range thread review changed its requested scope.')
  }
  assertExactSequence(
    input.review.inspectedChapterNumbers,
    chapterNumbers,
    'The long-range thread review did not account for every requested chapter.',
  )
  assertExactSequence(
    input.review.inspectedDimensions,
    longRangeStoryThreadFocusDimensions[input.focus],
    'The long-range thread review did not inspect its complete dimension group.',
  )

  const threadById = new Map<string, LongRangeStoryThread>()
  const locatedThreads: LocatedLongRangeStoryThread[] = []
  for (const thread of input.review.threads) {
    if (threadById.has(thread.threadId)) {
      throw new CreationDecisionError('model_output_invalid', 'The long-range thread review returned a duplicate thread id.')
    }
    if (!longRangeStoryThreadFocusDimensions[input.focus].includes(thread.dimension as never)) {
      throw new CreationDecisionError('model_output_invalid', 'A long-range thread escaped its requested dimension group.')
    }
    const sourceChapter = byNumber.get(thread.sourceChapter)
    const sourceBlock = sourceChapter && locateQuote(sourceChapter, thread.sourceEvidenceQuote)
    if (!sourceBlock) {
      throw new CreationDecisionError('evidence_missing', `Thread ${thread.threadId} lacks exact source evidence.`)
    }
    let latestEvidenceBlockId: string | null = null
    if (thread.status === 'active') {
      if (thread.latestEvidence !== null || thread.confidence === 'high') {
        throw new CreationDecisionError(
          'model_output_invalid',
          'An active thread must remain a medium/low-confidence source-only recall candidate.',
        )
      }
    } else {
      if (!thread.latestEvidence || thread.latestEvidence.chapter <= thread.sourceChapter) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'A progressed, fulfilled, or broken thread requires later exact evidence.',
        )
      }
      const latestChapter = byNumber.get(thread.latestEvidence.chapter)
      const latestBlock = latestChapter && locateQuote(latestChapter, thread.latestEvidence.quote)
      if (!latestBlock) {
        throw new CreationDecisionError('evidence_missing', `Thread ${thread.threadId} lacks exact latest evidence.`)
      }
      latestEvidenceBlockId = latestBlock.id
    }
    threadById.set(thread.threadId, thread)
    locatedThreads.push({ threadId: thread.threadId, sourceBlockId: sourceBlock.id, latestEvidenceBlockId })
  }

  const locatedFindings: LocatedLongRangeStoryThreadFinding[] = []
  const findingThreadIds = new Set<string>()
  for (const [findingIndex, finding] of input.review.findings.entries()) {
    const thread = threadById.get(finding.threadId)
    if (!thread || thread.status !== 'broken' || finding.dimension !== thread.dimension) {
      throw new CreationDecisionError('model_output_invalid', 'A long-range finding must belong to a broken thread.')
    }
    if (findingThreadIds.has(finding.threadId)) {
      throw new CreationDecisionError('model_output_invalid', 'A broken thread may have only one bounded repair finding.')
    }
    if (
      finding.sourceChapter !== thread.sourceChapter
      || finding.targetChapter < finding.sourceChapter + 2
      || finding.repairTargetChapter !== finding.targetChapter
      || thread.latestEvidence?.chapter !== finding.targetChapter
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A long-range repair must compare non-adjacent evidence and target only the later chapter.',
      )
    }
    const sourceChapter = byNumber.get(finding.sourceChapter)
    const targetChapter = byNumber.get(finding.targetChapter)
    const sourceBlock = sourceChapter && locateQuote(sourceChapter, finding.sourceEvidenceQuote)
    const targetBlock = targetChapter && locateQuote(targetChapter, finding.targetEvidenceQuote)
    if (!sourceBlock || !targetBlock) {
      throw new CreationDecisionError(
        'evidence_missing',
        `Long-range finding ${findingIndex} lacks exact evidence in both chapters.`,
      )
    }
    findingThreadIds.add(finding.threadId)
    locatedFindings.push({ findingIndex, sourceBlockId: sourceBlock.id, targetBlockId: targetBlock.id })
  }
  for (const thread of input.review.threads) {
    if ((thread.status === 'broken') !== findingThreadIds.has(thread.threadId)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'Every broken thread, and only a broken thread, must have one located finding.',
      )
    }
  }
  return { locatedThreads, locatedFindings }
}

const severityRank = {
  watch: 0,
  revision_candidate: 1,
  hard_block: 2,
} as const

export function validateLongRangeStoryThreadVerification(input: {
  chapters: LongformContinuityChapter[]
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
}) {
  const { byNumber } = chapterMap(input.chapters)
  if (input.verification.focus !== input.review.focus) {
    throw new CreationDecisionError('model_output_invalid', 'Thread verification changed the requested focus.')
  }
  if (input.verification.threadItems.length !== input.review.threads.length) {
    throw new CreationDecisionError('model_output_invalid', 'Thread verification did not account for every thread.')
  }
  if (input.verification.findingItems.length !== input.review.findings.length) {
    throw new CreationDecisionError('model_output_invalid', 'Thread verification did not account for every finding.')
  }

  const threadById = new Map(input.review.threads.map(thread => [thread.threadId, thread]))
  const threadDecisionById = new Map<string, 'verify' | 'reject'>()
  const locatedThreads: LocatedLongRangeStoryThread[] = []
  for (const item of input.verification.threadItems) {
    const thread = threadById.get(item.threadId)
    if (!thread || threadDecisionById.has(item.threadId)) {
      throw new CreationDecisionError('model_output_invalid', 'Thread verification contains an unknown or duplicate thread.')
    }
    if (item.decision === 'verify') {
      if (item.confirmedStatus !== thread.status) {
        throw new CreationDecisionError('model_output_invalid', 'A verified thread must preserve its reviewed status.')
      }
    } else if (item.confirmedStatus !== null) {
      throw new CreationDecisionError('model_output_invalid', 'A rejected thread cannot retain a confirmed status.')
    }
    const sourceChapter = byNumber.get(thread.sourceChapter)
    const sourceBlock = sourceChapter && locateQuote(sourceChapter, item.sourceEvidenceQuote)
    if (!sourceBlock) {
      throw new CreationDecisionError('evidence_missing', `Verification for ${thread.threadId} lacks exact source evidence.`)
    }
    let latestEvidenceBlockId: string | null = null
    if (thread.latestEvidence) {
      const latestChapter = byNumber.get(thread.latestEvidence.chapter)
      const latestBlock = item.latestEvidenceQuote && latestChapter
        ? locateQuote(latestChapter, item.latestEvidenceQuote)
        : null
      if (!latestBlock) {
        throw new CreationDecisionError('evidence_missing', `Verification for ${thread.threadId} lacks later evidence.`)
      }
      latestEvidenceBlockId = latestBlock.id
    } else if (item.latestEvidenceQuote !== null) {
      throw new CreationDecisionError('model_output_invalid', 'A source-only active thread cannot gain later evidence in verification.')
    }
    threadDecisionById.set(item.threadId, item.decision)
    locatedThreads.push({ threadId: item.threadId, sourceBlockId: sourceBlock.id, latestEvidenceBlockId })
  }

  const locatedFindings: LocatedLongRangeStoryThreadFinding[] = []
  const findingIndexes = new Set<number>()
  for (const item of input.verification.findingItems) {
    if (item.findingIndex >= input.review.findings.length || findingIndexes.has(item.findingIndex)) {
      throw new CreationDecisionError('model_output_invalid', 'Finding verification contains an invalid or duplicate index.')
    }
    findingIndexes.add(item.findingIndex)
    const finding = input.review.findings[item.findingIndex]!
    if (item.threadId !== finding.threadId) {
      throw new CreationDecisionError('model_output_invalid', 'Finding verification changed its thread identity.')
    }
    if (threadDecisionById.get(finding.threadId) === 'reject' && item.decision !== 'reject') {
      throw new CreationDecisionError('model_output_invalid', 'A rejected thread cannot retain a verified finding.')
    }
    if (item.decision === 'verify') {
      if (!item.confirmedSeverity || severityRank[item.confirmedSeverity] > severityRank[finding.severity]) {
        throw new CreationDecisionError('model_output_invalid', 'Finding verification cannot omit or escalate severity.')
      }
    } else if (item.confirmedSeverity !== null) {
      throw new CreationDecisionError('model_output_invalid', 'A rejected finding cannot retain severity.')
    }
    const sourceChapter = byNumber.get(finding.sourceChapter)
    const targetChapter = byNumber.get(finding.targetChapter)
    const sourceBlock = sourceChapter && locateQuote(sourceChapter, item.sourceEvidenceQuote)
    const targetBlock = targetChapter && locateQuote(targetChapter, item.targetEvidenceQuote)
    if (!sourceBlock || !targetBlock) {
      throw new CreationDecisionError('evidence_missing', `Finding verification ${item.findingIndex} lacks dual evidence.`)
    }
    locatedFindings.push({ findingIndex: item.findingIndex, sourceBlockId: sourceBlock.id, targetBlockId: targetBlock.id })
  }
  return {
    locatedThreads: locatedThreads.sort((left, right) => left.threadId.localeCompare(right.threadId)),
    locatedFindings: locatedFindings.sort((left, right) => left.findingIndex - right.findingIndex),
  }
}

function sameStructuredValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function validateLongRangeStoryThreadRevision(input: {
  chapters: LongformContinuityChapter[]
  previousReview: LongRangeStoryThreadReview
  previousVerification: LongRangeStoryThreadVerification
  revisedReview: LongRangeStoryThreadReview
}) {
  const located = validateLongRangeStoryThreadReview({
    chapters: input.chapters,
    focus: input.previousReview.focus,
    review: input.revisedReview,
  })
  const previousThreadById = new Map(input.previousReview.threads.map(thread => [thread.threadId, thread]))
  const verificationById = new Map(
    input.previousVerification.threadItems.map(item => [item.threadId, item]),
  )
  for (const revisedThread of input.revisedReview.threads) {
    const previousThread = previousThreadById.get(revisedThread.threadId)
    const verification = verificationById.get(revisedThread.threadId)
    if (!previousThread || !verification) {
      throw new CreationDecisionError('model_output_invalid', 'Thread revision introduced a new thread.')
    }
    if (verification.decision === 'verify') {
      if (!sameStructuredValue(revisedThread, previousThread)) {
        throw new CreationDecisionError('model_output_invalid', 'Thread revision changed an independently verified thread.')
      }
      continue
    }
    if (
      revisedThread.dimension !== previousThread.dimension
      || revisedThread.sourceChapter !== previousThread.sourceChapter
      || revisedThread.sourceEvidenceQuote !== previousThread.sourceEvidenceQuote
      || revisedThread.status === 'broken'
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A rejected thread may only be removed or corrected without changing its source identity or adding a new finding.',
      )
    }
  }
  for (const previousThread of input.previousReview.threads) {
    const verification = verificationById.get(previousThread.threadId)
    if (
      verification?.decision === 'verify'
      && !input.revisedReview.threads.some(thread => thread.threadId === previousThread.threadId)
    ) {
      throw new CreationDecisionError('model_output_invalid', 'Thread revision removed an independently verified thread.')
    }
  }

  const verifiedPreviousFindings = input.previousReview.findings.filter((_, findingIndex) => (
    input.previousVerification.findingItems.find(item => item.findingIndex === findingIndex)?.decision === 'verify'
  ))
  if (!sameStructuredValue(input.revisedReview.findings, verifiedPreviousFindings)) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'Thread revision must preserve verified findings exactly and remove rejected findings without inventing new ones.',
    )
  }
  return located
}
