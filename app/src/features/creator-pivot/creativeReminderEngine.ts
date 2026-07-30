import type { CreativeReminder, LocalReaderSignalCache } from '@/local-db/schema'

const reminderCopy: Record<CreativeReminder['type'], { title: string; note: string }> = {
  reader_confusion: {
    title: '读者理解断点',
    note: '检查人物动机、因果或信息揭示是否需要在后续场景中补足。',
  },
  reader_desire: {
    title: '读者期待',
    note: '判断这份期待应兑现、延迟，还是转成更有代价的下一步。',
  },
  branch_seed: {
    title: '支线火花',
    note: '先确认另一种选择会让谁失去什么，再决定是否进入支线。',
  },
  scene_pressure: {
    title: '场景压力',
    note: '保留读者有反应的场面，并让下一次出现承担新的冲突功能。',
  },
  character_question: {
    title: '人物追问',
    note: '先回答人物为什么此刻这样选择，以及这个选择要付出什么代价。',
  },
  foreshadowing_recall: {
    title: '高亮回声',
    note: '判断这个被读者记住的承诺应在后续回收、反转还是继续加压。',
  },
  pacing_warning: {
    title: '节奏提醒',
    note: '检查当前章节是否跳过了必要的选择、后果或情绪停顿。',
  },
}

function reminderTypeForSignal(signal: LocalReaderSignalCache): CreativeReminder['type'] {
  if (signal.sourceType === 'confusion') return 'reader_confusion'
  if (signal.sourceType === 'continuity_note') return 'pacing_warning'
  if (signal.sourceType === 'question') return 'character_question'
  if (signal.sourceType === 'branch_wish') return 'branch_seed'
  if (signal.sourceType === 'highlight') return 'foreshadowing_recall'
  if (signal.sourceType === 'reaction') return 'scene_pressure'
  return 'reader_desire'
}

function reminderSourceIds(signal: LocalReaderSignalCache) {
  return [signal.id, ...signal.sourceRefs.map(ref => ref.cloudId)]
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort()
}

export function buildCreativeReminderSuggestions(
  signals: LocalReaderSignalCache[],
  existing: CreativeReminder[],
  now = new Date().toISOString(),
) {
  const currentById = new Map(existing.map(reminder => [reminder.id, reminder]))
  return signals
    .filter(signal => signal.readerVisible && signal.visibility === 'visible')
    .map(signal => {
      const type = reminderTypeForSignal(signal)
      const id = `creative-reminder:${signal.workId}:${signal.normalizedHash}:${type}`
      const current = currentById.get(id)
      const copy = reminderCopy[type]
      const sourceSignalIds = reminderSourceIds(signal)
      return {
        id,
        workId: signal.workId,
        sourceSignalIds: [...new Set([...(current?.sourceSignalIds || []), ...sourceSignalIds])].sort(),
        draftId: current?.draftId,
        chapterId: signal.chapterId || current?.chapterId,
        type,
        title: current?.title || copy.title,
        authorNote: current?.authorNote || copy.note,
        status: current?.status || 'suggested',
        createdBy: current?.createdBy || 'rule-engine',
        localOnly: true,
        createdAt: current?.createdAt || now,
        updatedAt: current && current.sourceSignalIds.join('|') === sourceSignalIds.join('|')
          ? current.updatedAt
          : now,
      } satisfies CreativeReminder
    })
}

export interface CreativeReminderAuthorUpdate {
  status?: Extract<CreativeReminder['status'], 'pinned' | 'used' | 'dismissed'>
  title?: string
  authorNote?: string
  draftId?: string | null
  chapterId?: string | null
}

export function applyCreativeReminderAuthorUpdate(
  reminder: CreativeReminder,
  update: CreativeReminderAuthorUpdate,
  now = new Date().toISOString(),
): CreativeReminder {
  return {
    ...reminder,
    title: update.title?.trim() || reminder.title,
    authorNote: update.authorNote?.trim() || reminder.authorNote,
    status: update.status || reminder.status,
    draftId: update.draftId === null ? undefined : update.draftId || reminder.draftId,
    chapterId: update.chapterId === null ? undefined : update.chapterId || reminder.chapterId,
    createdBy: reminder.createdBy === 'rule-engine' ? 'author' : reminder.createdBy,
    localOnly: true,
    updatedAt: now,
  }
}
