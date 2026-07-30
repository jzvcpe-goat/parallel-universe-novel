import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { sha256Bytes, sha256Text, stableJson } from '@/local-db/creatorLocalIntegrity'
import {
  publishBundleSchema,
  publishReceiptSchema,
  type PublishBundle,
  type PublishReceipt,
} from './publishBundleSchema'

export const PUBLISH_BUNDLE_MANIFEST_PATH = 'publish-bundle.json'
export const PUBLISH_BUNDLE_BODY_PATH = 'body.md'
export const PUBLISH_BUNDLE_READER_SUMMARY_PATH = 'reader-summary.md'
export const PUBLISH_BUNDLE_MARKDOWN_COPY_PATH = 'external-copy/markdown.md'
export const PUBLISH_BUNDLE_TEXT_COPY_PATH = 'external-copy/plain-text.txt'

const requiredPayloadPaths = [
  PUBLISH_BUNDLE_BODY_PATH,
  PUBLISH_BUNDLE_READER_SUMMARY_PATH,
  PUBLISH_BUNDLE_MARKDOWN_COPY_PATH,
  PUBLISH_BUNDLE_TEXT_COPY_PATH,
] as const

export interface CreatorPublishBundleInput {
  requestId?: string | null
  workId: string
  branchId?: string | null
  branchTitle?: string
  chapterTitle: string
  content: string
  localDraftRef: string
  workTitle: string
  branchKind: 'mainline' | 'if-branch'
  hookChapterId?: string | null
  readerSummary?: string
  readerSignalIds?: string[]
  creativeReminderIds?: string[]
}

export interface PreparedPublishBundlePackage {
  bundle: PublishBundle
  body: string
  bytes: Uint8Array
}

function payloadText(bundle: Pick<PublishBundle, 'chapter' | 'readerFacingSummary'>, body: string) {
  return {
    [PUBLISH_BUNDLE_BODY_PATH]: body,
    [PUBLISH_BUNDLE_READER_SUMMARY_PATH]: `${bundle.readerFacingSummary.trim()}\n`,
    [PUBLISH_BUNDLE_MARKDOWN_COPY_PATH]: `# ${bundle.chapter.title}\n\n${body}\n`,
    [PUBLISH_BUNDLE_TEXT_COPY_PATH]: `${bundle.chapter.title}\n\n${body}\n`,
  }
}

async function fileIntegrity(files: Record<string, string>) {
  const integrity: Record<string, { byteLength: number; sha256: string }> = {}
  for (const path of Object.keys(files).sort()) {
    const bytes = strToU8(files[path])
    integrity[path] = {
      byteLength: bytes.byteLength,
      sha256: await sha256Bytes(bytes),
    }
  }
  return integrity
}

function archiveBytes(bundle: PublishBundle, files: Record<string, string>) {
  const archive: Record<string, Uint8Array> = {
    [PUBLISH_BUNDLE_MANIFEST_PATH]: strToU8(JSON.stringify(bundle, null, 2)),
  }
  for (const [path, value] of Object.entries(files)) archive[path] = strToU8(value)
  return zipSync(archive, { level: 6 })
}

export async function createPublishBundle(
  input: CreatorPublishBundleInput,
  createdAt = new Date().toISOString(),
): Promise<PublishBundle> {
  const body = input.content.trim()
  const chapterTitle = input.chapterTitle.trim() || '未命名章节'
  const readerFacingSummary = input.readerSummary?.trim() || '作者确认后公开到读者阅读端。'
  const contentChecksum = await sha256Text(body)
  const bundleSeed = await sha256Text(stableJson({
    branchId: input.branchId || null,
    chapterTitle,
    contentChecksum,
    localDraftRef: input.localDraftRef,
    target: input.branchKind,
    workId: input.workId,
  }))
  const bundleId = `publish-bundle:${bundleSeed.slice(0, 32)}`
  const provisional = {
    chapter: { title: chapterTitle },
    readerFacingSummary,
  }
  const files = payloadText(provisional as Pick<PublishBundle, 'chapter' | 'readerFacingSummary'>, body)
  const filesIntegrity = await fileIntegrity(files)
  const idempotencyKey = await sha256Text(stableJson({
    bundleId,
    contentChecksum,
    target: input.branchKind,
  }))

  return publishBundleSchema.parse({
    schemaVersion: 1,
    bundleId,
    createdAt,
    createdBy: 'local-creator',
    work: {
      id: input.workId,
      title: input.workTitle.trim() || '未命名作品',
    },
    target: {
      kind: input.branchKind,
      branchId: input.branchId || undefined,
      branchTitle: input.branchTitle || undefined,
      hookChapterId: input.hookChapterId || undefined,
    },
    chapter: {
      title: chapterTitle,
      bodyFormat: 'markdown',
      bodyPath: PUBLISH_BUNDLE_BODY_PATH,
      wordCount: body.length,
      checksum: contentChecksum,
    },
    linkedFeedback: {
      readerSignalIds: input.readerSignalIds || [],
      readerRequestIds: input.requestId ? [input.requestId] : [],
      creativeReminderIds: input.creativeReminderIds || [],
    },
    readerFacingSummary,
    authorConfirmation: {
      confirmed: false,
    },
    destinations: [
      { target: 'own-platform', status: 'ready' },
      { target: 'manual-copy', status: 'ready' },
      { target: 'external-adapter', status: 'unsupported' },
    ],
    integrity: {
      algorithm: 'SHA-256',
      idempotencyKey,
      files: filesIntegrity,
    },
  })
}

export async function buildPublishBundlePackage(
  bundle: PublishBundle,
  body: string,
): Promise<Uint8Array> {
  const parsed = publishBundleSchema.parse(bundle)
  const normalizedBody = body.trim()
  if (await sha256Text(normalizedBody) !== parsed.chapter.checksum) {
    throw new Error('Publish bundle body checksum mismatch')
  }
  const files = payloadText(parsed, normalizedBody)
  const actualIntegrity = await fileIntegrity(files)
  for (const path of requiredPayloadPaths) {
    const expected = parsed.integrity.files[path]
    const actual = actualIntegrity[path]
    if (!expected || expected.byteLength !== actual.byteLength || expected.sha256 !== actual.sha256) {
      throw new Error(`Publish bundle file integrity mismatch: ${path}`)
    }
  }
  return archiveBytes(parsed, files)
}

export async function preparePublishBundlePackage(
  input: CreatorPublishBundleInput,
  createdAt = new Date().toISOString(),
): Promise<PreparedPublishBundlePackage> {
  const body = input.content.trim()
  const bundle = await createPublishBundle(input, createdAt)
  const bytes = await buildPublishBundlePackage(bundle, body)
  return { body, bundle, bytes }
}

export async function confirmPublishBundleManifest(
  bundle: PublishBundle,
  confirmedAt: string,
): Promise<PublishBundle> {
  return publishBundleSchema.parse({
    ...bundle,
    authorConfirmation: {
      confirmed: true,
      confirmedAt,
      confirmationText: '作者已确认发布包内容与公开去向。',
    },
  })
}

export async function parsePublishBundlePackage(bytes: Uint8Array): Promise<PreparedPublishBundlePackage> {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('Publish bundle is not a readable ZIP archive')
  }
  const manifestBytes = files[PUBLISH_BUNDLE_MANIFEST_PATH]
  if (!manifestBytes) throw new Error('Publish bundle is missing publish-bundle.json')
  const bundle = publishBundleSchema.parse(JSON.parse(strFromU8(manifestBytes)))
  const declaredPaths = new Set(Object.keys(bundle.integrity.files))
  for (const path of requiredPayloadPaths) {
    if (!declaredPaths.has(path) || !files[path]) throw new Error(`Publish bundle is missing ${path}`)
    const expected = bundle.integrity.files[path]
    if (files[path].byteLength !== expected.byteLength || await sha256Bytes(files[path]) !== expected.sha256) {
      throw new Error(`Publish bundle checksum mismatch: ${path}`)
    }
  }
  const unexpected = Object.keys(files).filter(path => path !== PUBLISH_BUNDLE_MANIFEST_PATH && !declaredPaths.has(path))
  if (unexpected.length) throw new Error(`Publish bundle has undeclared files: ${unexpected.sort().join(', ')}`)
  const body = strFromU8(files[PUBLISH_BUNDLE_BODY_PATH]).trim()
  if (await sha256Text(body) !== bundle.chapter.checksum) throw new Error('Publish bundle body checksum mismatch')
  return { body, bundle, bytes }
}

export function publishBundleFileName(bundle: PublishBundle) {
  return `publish-bundle-${bundle.bundleId.replace(/[^a-zA-Z0-9_-]/g, '-')}.zip`
}

export function serializePublishReceipt(receipt: PublishReceipt) {
  return `${JSON.stringify(publishReceiptSchema.parse(receipt), null, 2)}\n`
}

export function parsePublishReceipt(value: string | Uint8Array) {
  const text = typeof value === 'string' ? value : strFromU8(value)
  return publishReceiptSchema.parse(JSON.parse(text))
}
