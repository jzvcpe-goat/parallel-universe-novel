import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { unzipSync, strFromU8 } from 'fflate'
import {
  buildLiteraryValueEvidenceReport,
  type LiteraryValueCampaignReceipt,
} from '../app/src/features/creator-decision/literaryValueEvaluation'
import {
  canonStatePatchSchema,
  creationDecisionEventSchema,
  literaryReviewSchema,
  repairProposalSchema,
} from '../app/src/features/creator-decision/schemas'

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    output: { type: 'string' },
    'continuity-receipt': { type: 'string', multiple: true },
    'long-range-receipt': { type: 'string', multiple: true },
  },
  strict: true,
})

if (!values.workspace || !values.output) {
  throw new Error('Usage: validate-creator-literary-value-evidence --workspace <package.zip> --output <report.json> [--continuity-receipt <summary.json>] [--long-range-receipt <summary.json>]')
}

type CampaignSummary = {
  schemaVersion?: string
  scope?: { fromChapter?: number; toChapter?: number; stopLine?: number }
  workflow?: Record<string, unknown>
  results?: {
    findings?: Array<{ dimension?: string; verificationDecision?: string }>
    threads?: Array<{ dimension?: string; verificationDecision?: string }>
  }
  sideEffects?: {
    chapter21AccessedOrChanged?: boolean
    workspaceChanged?: boolean
    acceptedManuscriptChanged?: boolean
    canonChanged?: boolean
    cloudDataChanged?: boolean
  }
  privacy?: {
    manuscriptTextCopiedIntoRepositoryEvidence?: boolean
    evidenceQuotesCopiedIntoRepositoryEvidence?: boolean
    repositoryEvidenceUsesHashesOnly?: boolean
  }
}

function countVerifiedDimensions(items: Array<{ dimension?: string; verificationDecision?: string }> | undefined) {
  return (items || []).reduce<Record<string, number>>((counts, item) => {
    if (item.verificationDecision !== 'verify' || !item.dimension) return counts
    counts[item.dimension] = (counts[item.dimension] || 0) + 1
    return counts
  }, {})
}

async function receiptFromSummary(
  inputPath: string,
  kind: LiteraryValueCampaignReceipt['kind'],
): Promise<LiteraryValueCampaignReceipt> {
  const bytes = new Uint8Array(await readFile(resolve(inputPath)))
  const summary = JSON.parse(new TextDecoder().decode(bytes)) as CampaignSummary
  const expectedSchema = kind === 'adjacent_continuity'
    ? 'creator-longform-continuity-campaign.v1'
    : 'creator-long-range-story-thread-campaign.v1'
  if (summary.schemaVersion !== expectedSchema) {
    throw new Error(`${basename(inputPath)} must use ${expectedSchema}.`)
  }
  if (summary.scope?.fromChapter !== 1 || summary.scope?.toChapter !== 20 || summary.scope?.stopLine !== 20) {
    throw new Error(`${basename(inputPath)} must be a frozen Chapter 1-20 receipt.`)
  }
  if (summary.sideEffects?.chapter21AccessedOrChanged !== false) {
    throw new Error(`${basename(inputPath)} must prove that Chapter 21 was not accessed or changed.`)
  }
  if (
    summary.sideEffects?.workspaceChanged !== false
    || summary.sideEffects?.acceptedManuscriptChanged !== false
    || summary.sideEffects?.canonChanged !== false
    || summary.sideEffects?.cloudDataChanged !== false
  ) {
    throw new Error(`${basename(inputPath)} must be read-only with no Canon or cloud side effects.`)
  }
  if (
    summary.privacy?.manuscriptTextCopiedIntoRepositoryEvidence !== false
    || summary.privacy?.evidenceQuotesCopiedIntoRepositoryEvidence !== false
    || summary.privacy?.repositoryEvidenceUsesHashesOnly !== true
  ) {
    throw new Error(`${basename(inputPath)} must preserve the hashed public-evidence boundary.`)
  }
  const independentlyVerified = kind === 'adjacent_continuity'
    ? summary.workflow?.everyFindingIndependentlyAccountedFor === true
      && summary.workflow?.everyFindingHasTwoLocatedChapterEvidenceQuotes === true
    : summary.workflow?.everyThreadIndependentlyAccountedFor === true
      && summary.workflow?.everyFindingIndependentlyAccountedFor === true
  if (!independentlyVerified) {
    throw new Error(`${basename(inputPath)} is missing its independent verification receipt.`)
  }

  return {
    kind,
    receiptSha256: createHash('sha256').update(bytes).digest('hex'),
    fromChapter: 1,
    toChapter: 20,
    independentlyVerified: true,
    privateTextCopiedIntoReceipt: false,
    verifiedFindingCounts: countVerifiedDimensions(summary.results?.findings),
    verifiedThreadCounts: countVerifiedDimensions(summary.results?.threads),
  }
}

const workspacePath = resolve(values.workspace)
const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const archive = unzipSync(workspaceBytes)
const recordsEntry = archive['records.json']
if (!recordsEntry) throw new Error('Workspace package does not contain records.json.')
const workspace = JSON.parse(strFromU8(recordsEntry)) as {
  records?: Array<{ family: string; value: unknown }>
}
const records = workspace.records || []
const familyCounts = records.reduce<Record<string, number>>((counts, record) => {
  counts[record.family] = (counts[record.family] || 0) + 1
  return counts
}, {})

const campaignReceipts = await Promise.all([
  ...(values['continuity-receipt'] || []).map(path => receiptFromSummary(path, 'adjacent_continuity')),
  ...(values['long-range-receipt'] || []).map(path => receiptFromSummary(path, 'long_range_threads')),
])

const report = buildLiteraryValueEvidenceReport({
  reviews: records
    .filter(record => record.family === 'literaryReviews')
    .map(record => literaryReviewSchema.parse(record.value)),
  repairs: records
    .filter(record => record.family === 'repairProposals')
    .map(record => repairProposalSchema.parse(record.value)),
  events: records
    .filter(record => record.family === 'creationDecisionEvents')
    .map(record => creationDecisionEventSchema.parse(record.value)),
  canonPatches: records
    .filter(record => record.family === 'canonPatches')
    .map(record => canonStatePatchSchema.parse(record.value)),
  campaignReceipts,
})

const output = {
  schemaVersion: 'creator-literary-value-evidence-run.v1',
  source: {
    kind: 'local_workspace_package',
    packageFile: basename(workspacePath),
    packageSha256: createHash('sha256').update(workspaceBytes).digest('hex'),
    packageByteLength: workspaceBytes.byteLength,
    recordFamilyCounts: familyCounts,
    chapter21AccessedOrChanged: false,
    rawManuscriptPersistedInReport: false,
    campaignReceipts: campaignReceipts.map(receipt => ({
      kind: receipt.kind,
      receiptSha256: receipt.receiptSha256,
      fromChapter: receipt.fromChapter,
      toChapter: receipt.toChapter,
      independentlyVerified: receipt.independentlyVerified,
    })),
  },
  report,
  claimBoundary: 'This is a local evidence aggregation run. It does not prove stable literary-quality improvement, professional human preference, author trust, automatic RAG quality, publication readiness, or Chapter 21 capability.',
}

await writeFile(resolve(values.output), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  output: resolve(values.output),
  reviewCount: report.reviewEvidence.reviewCount,
  authorDecisionCount: report.authorWorkflow.decisions.uniqueFindingDecisionCount,
  repairCount: report.authorWorkflow.boundedRepair,
}, null, 2))
