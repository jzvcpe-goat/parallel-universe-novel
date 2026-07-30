import { Bell, BookOpen, HeartPulse, MessageSquare, Route as RouteIcon } from 'lucide-react'
import { readerWishTypeLabel } from '../creatorViewHelpers'
import type {
  CreatorBranchSandboxCard,
  CreatorBranchSandboxFocusRow,
  CreatorFlightChoiceRecord,
  CreatorFlightResultRow,
  CreatorFlightStepRow,
  CreatorFlightSummaryCard,
  CreatorFlightTrustRow,
  CreatorStateDiffImpactCard,
  CreatorStateDiffSummaryItem,
} from '@/components/creator/workspace/CreatorImpactPanels'
import type { PmfChapter, PmfReaderRequest } from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
  type PublishMode,
} from './creatorEditorViewModels'

export function buildStateDiffViewModel({
  selectedWorkId,
  workTitle,
  direction,
  latestChapter,
  linkedRequest,
  publishMode,
  branchTitle,
}: {
  selectedWorkId: string
  workTitle: string
  direction: ChapterDirectionId
  latestChapter: PmfChapter | null
  linkedRequest: PmfReaderRequest | null
  publishMode: PublishMode
  branchTitle: string
}) {
  const destinationLabel = publishMode === 'main'
    ? '主线下一章'
    : branchTitle.trim()
      ? `支线「${branchTitle.trim()}」`
      : '新的 IF 支线'
  const anchorLabel = latestChapter ? `接在「${latestChapter.title}」之后` : '作为作品第一段公开内容'
  const requestLabel = linkedRequest ? readerWishTypeLabel(linkedRequest.request_type) : '自主更新'
  const directionLabel = chapterDirectionLabel(direction)
  const impactCards: CreatorStateDiffImpactCard[] = [
    {
      label: '人物目标',
      icon: <HeartPulse size={15} />,
      before: latestChapter ? '人物目标停在上一章的选择后果里。' : '人物还没有被读者正式认识。',
      after: direction === 'pressure'
        ? '本章会把目标推到必须行动的位置。'
        : direction === 'reveal'
          ? '本章会让人物拿到新的判断依据。'
          : '本章会把人物放进另一条选择后果里。',
      risk: '目标不清时，读者会只记住设定，记不住人物想要什么。',
      tone: direction === 'pressure' ? 'strong' : 'warm',
    },
    {
      label: '关系温度',
      icon: <MessageSquare size={15} />,
      before: linkedRequest ? '读者已经表达想看的方向。' : '这一章还没有承接外部期待。',
      after: linkedRequest ? `会回应「${requestLabel}」里的核心愿望。` : '会形成一条可继续追问的作品承诺。',
      risk: '回应太直白会像答题，回应太弱会让请求失去存在感。',
      tone: linkedRequest ? 'strong' : 'calm',
    },
    {
      label: '伏笔承诺',
      icon: <Bell size={15} />,
      before: latestChapter ? '上一章留下的悬念仍在等待兑现。' : '还没有可回收的公开伏笔。',
      after: direction === 'reveal'
        ? '本章会揭开一层信息，同时留下新的未解处。'
        : '本章会增加一个后续必须回应的钩子。',
      risk: '伏笔只增加不兑现，会让支线显得散。',
      tone: direction === 'reveal' ? 'strong' : 'warm',
    },
    {
      label: '地图与时间',
      icon: <RouteIcon size={15} />,
      before: anchorLabel,
      after: `发布到${destinationLabel}，按「${directionLabel}」推进。`,
      risk: publishMode === 'main' ? '主线更新要避免跳过关键后果。' : '支线需要说明从哪一章分出去。',
      tone: publishMode === 'main' ? 'calm' : 'strong',
    },
    {
      label: '读者已知',
      icon: <BookOpen size={15} />,
      before: latestChapter ? `读者目前停在「${latestChapter.title}」。` : '读者还没有正式进入作品。',
      after: selectedWorkId ? `读者会看到「${workTitle}」的新推进。` : '先选作品，才知道这段会写给谁看。',
      risk: '如果信息差没有管理好，读者会不知道该期待主线还是支线。',
      tone: selectedWorkId ? 'warm' : 'strong',
    },
  ]
  const readyCount = impactCards.filter(card => card.tone !== 'strong').length
  const hasHighAttention = readyCount < impactCards.length
  const summaryItems: CreatorStateDiffSummaryItem[] = [
    { label: '去向', value: destinationLabel },
    { label: '方向', value: directionLabel },
    { label: '来源', value: requestLabel },
  ]

  return {
    impactCards,
    summaryItems,
    statusLabel: hasHighAttention ? '需判断' : '可继续',
    statusVariant: hasHighAttention ? 'outline' as const : 'gold' as const,
    actionCopy: hasHighAttention ? '先确认分支去向，再进入发布包确认。' : '影响范围清楚，可以准备发布包确认。',
  }
}

export function buildBranchSandboxViewModel({
  publishMode,
  branchTitle,
  linkedRequest,
  direction,
  latestChapter,
  contentReady,
}: {
  publishMode: PublishMode
  branchTitle: string
  linkedRequest: PmfReaderRequest | null
  direction: ChapterDirectionId
  latestChapter: PmfChapter | null
  contentReady: boolean
}) {
  const baseLineTitle = publishMode === 'main' ? '当前主线方向' : '当前支线方向'
  const baseLineBody = publishMode === 'main'
    ? '继续主线，把外界回声写成正式推进。'
    : `沿用「${branchTitle}」，先完善这一条 IF 支线。`
  const branchQuestion = publishMode === 'main'
    ? '这个变化值得离开主线吗？'
    : '这条支线值得继续独立吗？'
  const branchFocusRows: CreatorBranchSandboxFocusRow[] = [
    { label: '保住主线', value: publishMode === 'main' ? '主线先不动' : '支线先不公开' },
    { label: '试错范围', value: contentReady ? '只比较当前章' : '等正文成形再比' },
    { label: '作者动作', value: '采用 / 保留 / 放弃' },
  ]
  const sandboxCards: CreatorBranchSandboxCard[] = [
    {
      key: 'A',
      label: '支线试写 A：另一种选择',
      question: '如果主角当时做了另一种选择，故事会不会更想看？',
      summary: linkedRequest
        ? '把读者想看的另一面写成一条支线试写。'
        : '从人物没有做出的选择切一条支线试写。',
      upside: '能快速判断支线是否更有张力。',
      risk: '如果代价不清楚，会像普通番外。',
      impact: latestChapter ? `挂在第 ${latestChapter.chapter_no} 章之后` : '先挂在当前草稿之后',
      keepIf: '选择会产生更清楚的代价。',
      dropIf: '只是把同一场戏换个说法。',
      verdict: linkedRequest ? '建议试写' : '可作为备选',
      verdictVariant: linkedRequest ? 'gold' : 'outline',
      action: '试一条支线',
    },
    {
      key: 'B',
      label: '支线试写 B：换视角',
      question: '换一个见证者，会不会让信息差更强？',
      summary: '用配角、反对者或见证者视角重写同一场戏。',
      upside: '容易制造信息差，也能补人物动机。',
      risk: '如果切太远，主线推进会短暂停下。',
      impact: `围绕「${chapterDirectionLabel(direction)}」比较张力`,
      keepIf: '新视角能暴露主角看不见的压力。',
      dropIf: '只是解释设定，没有推动选择。',
      verdict: direction === 'branch' ? '适合比较' : '谨慎尝试',
      verdictVariant: direction === 'branch' ? 'gold' : 'outline',
      action: '换视角',
    },
    {
      key: 'C',
      label: '支线试写 C：保留异常',
      question: '这个不合理之处，能不能变成后续伏笔？',
      summary: '把当前不合常理的地方保留下来，作为后续伏笔。',
      upside: '能把矛盾变成悬念，而不是立刻解释。',
      risk: '需要后续章节兑现，否则读者会觉得悬空。',
      impact: contentReady ? '影响当前正文的结尾承诺' : '等有正文后再判断影响',
      keepIf: '异常能在后续章节获得回收位置。',
      dropIf: '异常只是作者没想清楚。',
      verdict: contentReady ? '可进入比较' : '等待正文',
      verdictVariant: 'outline',
      action: '保留异常伏笔',
    },
  ]

  return {
    question: branchQuestion,
    focusRows: branchFocusRows,
    baseline: { label: '主线', title: baseLineTitle, body: baseLineBody },
    cards: sandboxCards,
    footerCopy: '可采用到主线、保留为 IF 支线，或直接放弃；默认不公开。',
  }
}

export function buildFlightRecorderViewModel({
  linkedRequest,
  direction,
  contentReady,
  titleReady,
  destinationReady,
}: {
  linkedRequest: PmfReaderRequest | null
  direction: ChapterDirectionId
  contentReady: boolean
  titleReady: boolean
  destinationReady: boolean
}) {
  const trustedCount = [contentReady, titleReady, destinationReady].filter(Boolean).length
  const trustLabel = trustedCount >= 3 ? '可以相信，但仍要确认' : '只能作为写作线索'
  const trustQuestion = linkedRequest
    ? '这次建议有没有真正回应读者愿望？'
    : '这次建议有没有稳住本章承诺？'
  const trustRows: CreatorFlightTrustRow[] = [
    { label: '来源', value: linkedRequest ? '来自读者想看的变化' : '来自当前作品压力', ready: true },
    { label: '取舍', value: `采用「${chapterDirectionLabel(direction)}」`, ready: true },
    { label: '可用度', value: trustLabel, ready: trustedCount >= 3 },
  ]
  const summaryCards: CreatorFlightSummaryCard[] = [
    {
      label: '输入来源',
      value: linkedRequest ? '读者愿望' : '作者主动推进',
      detail: linkedRequest ? '先回应当前请求，再组织本章。' : '从作品当前压力继续往前写。',
    },
    {
      label: '本章目标',
      value: chapterDirectionLabel(direction),
      detail: '只保留一个主要承诺，避免一章承担太多。',
    },
    {
      label: '审阅结论',
      value: contentReady ? '已有可审段落' : '等待正文候选',
      detail: contentReady ? '可以看节奏、尾钩和读者承诺。' : '先写出第一段，再进入质量判断。',
    },
  ]
  const directionRecords: CreatorFlightChoiceRecord[] = [
    {
      id: 'pressure',
      label: '压迫推进',
      reason: '外界回声带着明确紧张感，先让人物付出行动。',
      verdict: direction === 'pressure' ? '当前采用' : '暂不采用',
      outcome: direction === 'pressure' ? '适合先拉起动作' : '紧张感可保留到下一段',
      selected: direction === 'pressure',
    },
    {
      id: 'reveal',
      label: '线索推进',
      reason: '适合补证据和反转，但信息量会更重。',
      verdict: direction === 'reveal' ? '当前采用' : '暂不采用',
      outcome: direction === 'reveal' ? '适合让判断被推翻' : '证据量暂时压后',
      selected: direction === 'reveal',
    },
    {
      id: 'branch',
      label: '分线推进',
      reason: '适合回应 IF 请求，但主线会短暂停下。',
      verdict: direction === 'branch' ? '当前采用' : '暂不采用',
      outcome: direction === 'branch' ? '适合进入支线比较' : '先不让主线停顿',
      selected: direction === 'branch',
    },
  ]
  const rows: CreatorFlightStepRow[] = [
    {
      label: linkedRequest ? '读取外界回声' : '自主起稿',
      body: linkedRequest ? '已把读者想看的方向带入本章目标。' : '没有请求时，先从作品当前压力切入。',
      ready: true,
    },
    {
      label: '选择推进方式',
      body: `比较三种写法后，当前按「${chapterDirectionLabel(direction)}」组织章节。`,
      ready: true,
    },
    {
      label: '保留当前方向',
      body: '先让这一章只兑现一个主要承诺，避免方向过散。',
      ready: true,
    },
    {
      label: '形成正文建议',
      body: contentReady ? '已有正文，下一步适合审阅和改写。' : '等待作者写出第一段正文。',
      ready: contentReady,
    },
    {
      label: '发布前确认',
      body: titleReady && destinationReady ? '标题和去向已具备，可以进入发布包确认。' : '标题和发布去向还需要补齐。',
      ready: titleReady && destinationReady,
    },
  ]
  const resultRows: CreatorFlightResultRow[] = [
    { label: '可继续', value: titleReady && contentReady ? '标题和正文已具备' : '先补齐标题或正文' },
    { label: '需确认', value: destinationReady ? '发布位置已明确' : '还要确认发布位置' },
    { label: '下一步', value: titleReady && contentReady && destinationReady ? '查看影响后确认' : '先补齐可审内容' },
  ]

  return {
    trustQuestion,
    trustStatusLabel: '建议依据只解释取舍，不替作者做决定；最后仍要回到正文、影响范围和发布确认。',
    trustStatusVariant: trustedCount >= 3 ? 'gold' as const : 'outline' as const,
    trustRows,
    summaryCards,
    stepRows: rows,
    resultRows,
    choiceRecords: directionRecords,
  }
}
