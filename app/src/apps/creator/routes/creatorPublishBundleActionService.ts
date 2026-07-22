import {
  publishOwnPlatformBundle,
  type CreatorPublishBundleResult,
} from '@/features/creator-pivot/publishBundleAdapter'
import {
  applyLocalPublishReceipt,
  confirmLocalPublishBundle,
  markLocalPublishBundleExported,
  prepareLocalPublishBundle,
  reviewLocalPublishBundle,
  type PublishBundleLifecycleSnapshot,
} from '@/features/creator-pivot/publishBundleLifecycle'
import type { CreatorPublishBundleInput } from '@/features/creator-pivot/publishBundlePackage'
import type { PmfResult } from '@/lib/pmfSupabase'
import { confirmCreatorAgentConfirmation } from '@/agent-surface/confirmation'
import { createCreatorAgentExecutor } from '@/agent-surface/executor'
import type { CreatorAgentActionName } from '@/agent-surface/actions'

export interface CreatorPublishBundleSubmitPort {
  submitBundle(bundleId: string): Promise<PmfResult<CreatorPublishBundleResult>>
}

const defaultCreatorPublishBundleSubmitPort: CreatorPublishBundleSubmitPort = {
  submitBundle: publishOwnPlatformBundle,
}

export interface CreatorPublishBundleAuthorConfirmation {
  source: 'confirm-dialog'
  confirmedAt: string
}

function actionFailure(code: string, message: string): PmfResult<never> {
  return { ok: false, code, message }
}

async function runAuthorConfirmedAction<Name extends CreatorAgentActionName, Result>(input: {
  actionName: Name
  actionInput: Record<string, unknown>
  authorConfirmation: CreatorPublishBundleAuthorConfirmation
  handler: () => Promise<Result>
  outputKind: string
  outputRecordId: (result: Result) => string | undefined
}): Promise<PmfResult<Result>> {
  let actionResult: Result | null = null
  const execute = createCreatorAgentExecutor({
    [input.actionName]: async (parsedInput: { targetId: string }) => {
      actionResult = await input.handler()
      return {
        kind: input.outputKind,
        targetId: parsedInput.targetId,
        recordId: input.outputRecordId(actionResult),
        messageCode: input.outputKind,
      }
    },
  })
  const requested = await execute({
    actionName: input.actionName,
    input: input.actionInput,
  })
  if (requested.status !== 'awaiting_confirmation') {
    return actionFailure('confirmation_unavailable', '作者确认未能建立。')
  }
  const confirmed = await confirmCreatorAgentConfirmation(
    requested.receipt.id,
    input.authorConfirmation.confirmedAt,
  )
  if (!confirmed.ok) {
    return actionFailure(`confirmation_${confirmed.reason}`, '作者确认已失效。')
  }
  const completed = await execute({
    actionName: input.actionName,
    input: input.actionInput,
    operationId: requested.operationId,
    confirmationReceiptId: confirmed.receipt.id,
  })
  if (completed.status !== 'succeeded' || !actionResult) {
    return actionFailure(`agent_${completed.status}`, '操作未完成。')
  }
  return { ok: true, data: actionResult }
}

export async function runCreatorPreparePublishBundle(
  input: CreatorPublishBundleInput,
): Promise<PmfResult<PublishBundleLifecycleSnapshot & { bytes: Uint8Array }>> {
  let prepared: Awaited<ReturnType<typeof prepareLocalPublishBundle>> | null = null
  const execute = createCreatorAgentExecutor({
    prepare_publish_bundle: async parsedInput => {
      prepared = await prepareLocalPublishBundle(input)
      return {
        kind: 'bundle_prepared',
        targetId: parsedInput.targetId,
        recordId: prepared.record.id,
        messageCode: 'bundle_prepared',
      }
    },
  })
  const completed = await execute({
    actionName: 'prepare_publish_bundle',
    input: {
      route: '/creator/bundles',
      targetId: input.localDraftRef,
      draftId: input.localDraftRef,
    },
  })
  if (completed.status !== 'succeeded' || !prepared) {
    return actionFailure(`agent_${completed.status}`, '发布包准备未完成。')
  }
  return { ok: true, data: prepared }
}

export async function runCreatorReviewPublishBundle(
  bundleId: string,
): Promise<PmfResult<PublishBundleLifecycleSnapshot>> {
  let reviewed: PublishBundleLifecycleSnapshot | null = null
  const execute = createCreatorAgentExecutor({
    review_publish_bundle: async parsedInput => {
      reviewed = await reviewLocalPublishBundle(bundleId)
      return {
        kind: 'bundle_reviewed',
        targetId: parsedInput.targetId,
        recordId: reviewed.record.id,
        messageCode: 'bundle_reviewed',
      }
    },
  })
  const completed = await execute({
    actionName: 'review_publish_bundle',
    input: { route: '/creator/bundles', targetId: bundleId, bundleId },
  })
  if (completed.status !== 'succeeded' || !reviewed) {
    return actionFailure(`agent_${completed.status}`, '发布包审阅状态未保存。')
  }
  return { ok: true, data: reviewed }
}

export function runConfirmedCreatorBundleConfirmation(
  bundleId: string,
  authorConfirmation: CreatorPublishBundleAuthorConfirmation,
) {
  return runAuthorConfirmedAction({
    actionName: 'confirm_publish_bundle',
    actionInput: { route: '/creator/bundles', targetId: bundleId, bundleId },
    authorConfirmation,
    handler: () => confirmLocalPublishBundle(bundleId, authorConfirmation.confirmedAt),
    outputKind: 'bundle_confirmed',
    outputRecordId: result => result.record.id,
  })
}

export function runConfirmedCreatorBundleExport(
  bundleId: string,
  authorConfirmation: CreatorPublishBundleAuthorConfirmation,
) {
  return runAuthorConfirmedAction({
    actionName: 'export_publish_bundle',
    actionInput: { route: '/creator/bundles', targetId: bundleId, bundleId },
    authorConfirmation,
    handler: () => markLocalPublishBundleExported(bundleId, authorConfirmation.confirmedAt),
    outputKind: 'bundle_exported',
    outputRecordId: result => result.record.id,
  })
}

export function runConfirmedCreatorBundleSubmit(
  bundleId: string,
  authorConfirmation: CreatorPublishBundleAuthorConfirmation,
  port: CreatorPublishBundleSubmitPort = defaultCreatorPublishBundleSubmitPort,
) {
  return runAuthorConfirmedAction({
    actionName: 'submit_publish_bundle',
    actionInput: { route: '/creator/bundles', targetId: bundleId, bundleId },
    authorConfirmation,
    handler: async () => {
      const result = await port.submitBundle(bundleId)
      if (!result.ok) throw new Error(result.code || 'publish_failed')
      return result.data
    },
    outputKind: 'bundle_submitted',
    outputRecordId: result => result.receipt.receiptId,
  })
}

export function importCreatorPublishBundleReceipt(bundleId: string, receipt: string | Uint8Array) {
  return applyLocalPublishReceipt(bundleId, receipt)
}
