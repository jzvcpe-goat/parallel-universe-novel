import { z } from 'zod'

export const publishSha256Schema = z.string().regex(/^[a-f0-9]{64}$/)

const publishPackageFileSchema = z.object({
  byteLength: z.number().int().nonnegative(),
  sha256: publishSha256Schema,
})

export const publishBundleSchema = z.object({
  schemaVersion: z.literal(1),
  bundleId: z.string().min(1),
  createdAt: z.string().min(1),
  createdBy: z.literal('local-creator'),
  work: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
  target: z.object({
    kind: z.enum(['mainline', 'if-branch']),
    branchId: z.string().optional(),
    branchTitle: z.string().optional(),
    hookChapterId: z.string().optional(),
    chapterOrder: z.number().int().positive().optional(),
  }),
  chapter: z.object({
    title: z.string().min(1),
    bodyFormat: z.literal('markdown'),
    bodyPath: z.literal('body.md'),
    wordCount: z.number().int().nonnegative(),
    checksum: publishSha256Schema,
  }),
  linkedFeedback: z.object({
    readerSignalIds: z.array(z.string()),
    readerRequestIds: z.array(z.string()),
    creativeReminderIds: z.array(z.string()),
  }),
  readerFacingSummary: z.string(),
  authorConfirmation: z.object({
    confirmed: z.boolean(),
    confirmedAt: z.string().optional(),
    confirmationText: z.string().optional(),
  }),
  destinations: z.array(z.object({
    target: z.enum(['own-platform', 'manual-copy', 'external-adapter']),
    platformId: z.string().optional(),
    status: z.enum(['planned', 'ready', 'unsupported']),
  })),
  integrity: z.object({
    algorithm: z.literal('SHA-256'),
    idempotencyKey: publishSha256Schema,
    files: z.record(z.string(), publishPackageFileSchema),
  }),
}).superRefine((bundle, context) => {
  if (bundle.authorConfirmation.confirmed && !bundle.authorConfirmation.confirmedAt) {
    context.addIssue({
      code: 'custom',
      message: 'confirmed publish bundle requires confirmedAt',
      path: ['authorConfirmation', 'confirmedAt'],
    })
  }
  if (!bundle.authorConfirmation.confirmed && bundle.authorConfirmation.confirmedAt) {
    context.addIssue({
      code: 'custom',
      message: 'unconfirmed publish bundle must not include confirmedAt',
      path: ['authorConfirmation', 'confirmedAt'],
    })
  }
})

export const publishReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  receiptId: z.string().min(1),
  bundleId: z.string().min(1),
  target: z.enum(['own-platform', 'external-platform', 'manual-copy']),
  platformId: z.string().optional(),
  status: z.enum(['submitted', 'published', 'failed', 'needs_manual_action']),
  idempotencyKey: publishSha256Schema,
  contentChecksum: publishSha256Schema,
  attempt: z.number().int().positive(),
  targetUrl: z.string().optional(),
  externalId: z.string().optional(),
  message: z.string().optional(),
  createdAt: z.string().min(1),
})

export type PublishBundle = z.infer<typeof publishBundleSchema>

export type PublishReceipt = z.infer<typeof publishReceiptSchema>
