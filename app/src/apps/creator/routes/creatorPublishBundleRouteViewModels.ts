import type { CreatorPublishBundleInput } from '@/features/creator-pivot/publishBundlePackage'
import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import type { PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'
import {
  branchTypeLabel,
  readerWishTypeLabel,
  workTitleForId,
} from '../creatorViewHelpers'
import {
  createPublishBundleLifecycleViewModel,
  resolveCreatorPublishBundleActiveRecord,
} from './creatorPublishLifecycleViewModels'

export interface CreatorPublishBundleRouteViewModelInput {
  activeDraftRef: string
  authorization: { authorized: boolean } | null
  branches: PmfBranch[]
  chapters: PmfChapter[]
  drafts: PmfLocalDraft[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  requests: PmfReaderRequest[]
  routeDraftRef: string | null
  works: PmfWork[]
}

export function createCreatorPublishBundleRouteViewModel({
  activeDraftRef,
  authorization,
  branches,
  chapters,
  drafts,
  publishBundles,
  publishReceipts,
  requests,
  routeDraftRef,
  works,
}: CreatorPublishBundleRouteViewModelInput) {
  const activeDraft = routeDraftRef
    ? drafts.find(draft => draft.localDraftRef === routeDraftRef) || null
    : drafts.find(draft => draft.localDraftRef === activeDraftRef) || drafts[0] || null
  const activeWork = activeDraft ? works.find(work => work.id === activeDraft.workId) || null : null
  const activeBranch = activeDraft ? branches.find(branch => branch.id === activeDraft.branchId) || null : null
  const linkedRequest = activeDraft?.requestId
    ? requests.find(request => request.id === activeDraft.requestId) || null
    : null
  const activeBundle = resolveCreatorPublishBundleActiveRecord(activeDraft?.localDraftRef, publishBundles)
  const parentChapter = activeBranch?.parent_chapter_id
    ? chapters.find(chapter => chapter.id === activeBranch.parent_chapter_id) || null
    : null
  const previousChapter = activeDraft
    ? [...chapters]
      .filter(chapter => chapter.branch_id === activeDraft.branchId)
      .sort((left, right) => right.chapter_no - left.chapter_no)[0] || null
    : null
  const canPrepareBundle = Boolean(
    activeDraft?.workId
    && activeDraft.branchId
    && activeDraft.title.trim()
    && activeDraft.content.trim(),
  )
  const canPublish = canPrepareBundle && authorization?.authorized === true
  const activeWorkTitle = activeDraft
    ? activeWork?.title || workTitleForId(activeDraft.workId)
    : '未选择'
  const activeBranchTitle = activeDraft
    ? activeBranch?.title || (activeDraft.branchId.endsWith(':main') ? '主线' : 'IF 支线')
    : '待确认'
  const publishLineLabel = activeDraft
    ? activeBranch ? branchTypeLabel(activeBranch) : activeDraft.branchId.endsWith(':main') ? '主线' : 'IF 支线'
    : '待确认'
  const readerLocationLabel = activeDraft
    ? `${activeWorkTitle} / ${activeBranchTitle} / 下一章`
    : '待选择私密草稿'
  const anchorLabel = parentChapter
    ? `第 ${parentChapter.chapter_no} 章 · ${parentChapter.title}`
    : previousChapter
      ? `接在第 ${previousChapter.chapter_no} 章之后`
      : '新线开端'
  const requestImpactLabel = linkedRequest
    ? `${readerWishTypeLabel(linkedRequest.request_type)} 会显示为已发布`
    : '不会更新外界回声状态'
  const publishedRequestImpact = linkedRequest
    ? `${readerWishTypeLabel(linkedRequest.request_type)} 已处理`
    : '这次发布未关联外界回声'
  const publishBundleInput: CreatorPublishBundleInput | null = activeDraft
    ? {
      requestId: activeDraft.requestId,
      workId: activeDraft.workId,
      workTitle: activeWorkTitle,
      branchId: activeDraft.branchId,
      branchTitle: activeBranch?.title,
      branchKind: activeDraft.branchId.endsWith(':main') ? 'mainline' : 'if-branch',
      hookChapterId: activeBranch?.parent_chapter_id || null,
      chapterTitle: activeDraft.title,
      content: activeDraft.content,
      localDraftRef: activeDraft.localDraftRef,
      readerSummary: linkedRequest
        ? `${readerWishTypeLabel(linkedRequest.request_type)} 已进入发布包。`
        : '作者确认后公开到读者阅读端。',
    }
    : null

  return {
    activeBranchTitle,
    activeBundle,
    activeDraft,
    activeWorkTitle,
    anchorLabel,
    canPrepareBundle,
    confirmGates: [
      '发布后读者可以看到这章内容。',
      linkedRequest ? '关联回声会显示为已发布。' : '这次发布不会关联外界回声。',
      '私密草稿仍只对作者可见。',
    ],
    lifecycle: createPublishBundleLifecycleViewModel(
      activeBundle,
      publishReceipts,
      canPrepareBundle,
      canPublish,
    ),
    linkedRequest,
    mustGates: [
      { label: '作品已确定', pass: Boolean(activeWork) },
      { label: '发布线已确定', pass: Boolean(activeBranch || activeDraft?.branchId) },
      { label: '标题已填写', pass: Boolean(activeDraft?.title.trim()) },
      { label: '正文已填写', pass: Boolean(activeDraft?.content.trim()) },
      { label: '作者状态可用', pass: authorization?.authorized === true },
    ],
    publishBundleInput,
    publishDecisionAnswer: !activeDraft
      ? '先选择一份私密草稿，再看公开位置和读者承诺。'
      : !canPublish
        ? '先补齐标题、正文、作品去向和作者状态，再回到发布确认。'
        : linkedRequest
          ? '读者愿望、公开位置和正文基础都具备；发布前再读一遍预览即可。'
          : '可以发布，但建议先确认它是否真的推进当前作品节奏。',
    publishDecisionQuestion: !activeDraft
      ? '现在要先检查哪一份草稿？'
      : !canPublish
        ? '这份草稿还差什么才能公开？'
        : linkedRequest
          ? '这次公开是否兑现读者愿望？'
          : '这次公开是否值得不带请求发布？',
    publishDecisionSteps: [
      {
        label: '正文',
        value: activeDraft ? `${activeDraft.content.trim().length} 字` : '未选择',
        tone: activeDraft && activeDraft.content.trim().length >= 120 ? 'gold' as const : 'outline' as const,
      },
      {
        label: '读者愿望',
        value: linkedRequest ? '会回应' : '未关联',
        tone: linkedRequest ? 'gold' as const : 'outline' as const,
      },
      {
        label: '公开位置',
        value: publishLineLabel,
        tone: activeBranch ? 'outline' as const : 'stasis' as const,
      },
    ],
    publishLineLabel,
    publishReviewSignals: [
      activeDraft?.title.trim()
        ? '标题已经能指向一次明确更新。'
        : '标题还没有告诉读者这次更新的看点。',
      linkedRequest
        ? `这次发布会回应「${readerWishTypeLabel(linkedRequest.request_type)}」。`
        : '这次发布没有关联外界回声，建议确认它是否仍符合当前作品节奏。',
      activeDraft && activeDraft.content.trim().length >= 120
        ? '正文长度足够进行一次发布判断。'
        : '正文还偏短，最好先补一个具体动作或选择代价。',
    ],
    publishedRequestImpact,
    readerLocationLabel,
    requestImpactLabel,
    warningGates: [
      { label: '未关联外界回声', warn: !linkedRequest },
      { label: '正文较短', warn: Boolean(activeDraft && activeDraft.content.trim().length < 120) },
      { label: '标题偏长', warn: Boolean(activeDraft && activeDraft.title.trim().length > 28) },
      { label: 'IF 支线缺少挂点', warn: Boolean(activeBranch?.branch_type === 'if' && !parentChapter) },
      { label: '支线说明待补', warn: Boolean(activeBranch && !activeBranch.summary) },
    ],
  }
}
