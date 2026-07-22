import assert from 'node:assert/strict'
import {
  applyCreativeReminderAuthorUpdate,
  buildCreativeReminderSuggestions,
} from '../src/features/creator-pivot/creativeReminderEngine'
import { normalizeReaderSignalBatches } from '../src/features/creator-pivot/externalEchoAdapters'
import type { ReaderSignalSourceBatch } from '../src/features/creator-pivot/externalEchoContracts'

const rawText = '她为什么在这里突然相信守灯人？'
const signals = normalizeReaderSignalBatches([{
  source: 'question',
  cursor: 'question:1',
  fetchedAt: '2026-07-10T18:00:00.000Z',
  status: 'fresh',
  completeSnapshot: true,
  records: [{
    source: 'question',
    id: 'question:1',
    workId: 'work:1',
    branchId: 'branch:main',
    chapterId: 'chapter:7',
    text: rawText,
    category: 'confusion',
    visibility: 'visible',
    createdAt: '2026-07-10T17:00:00.000Z',
  }],
} satisfies ReaderSignalSourceBatch])

const suggested = buildCreativeReminderSuggestions(signals, [], '2026-07-10T18:00:01.000Z')
assert.equal(suggested.length, 1)
assert.equal(suggested[0].status, 'suggested')
assert.equal(suggested[0].createdBy, 'rule-engine')
assert.equal(suggested[0].localOnly, true)
assert.equal(JSON.stringify(suggested).includes(rawText), false, 'public signal text must not be copied into private interpretation')

const pinned = applyCreativeReminderAuthorUpdate(suggested[0], {
  status: 'pinned',
  authorNote: '下一章先补一个可以被读者看见的信任转折。',
  draftId: 'draft:8',
}, '2026-07-10T18:01:00.000Z')
assert.equal(pinned.status, 'pinned')
assert.equal(pinned.createdBy, 'author')
assert.equal(pinned.draftId, 'draft:8')

const regenerated = buildCreativeReminderSuggestions(signals, [pinned], '2026-07-10T18:02:00.000Z')
assert.equal(regenerated.length, 1, 'the same signal must not create a duplicate reminder')
assert.equal(regenerated[0].id, pinned.id)
assert.equal(regenerated[0].status, 'pinned', 'rule refresh must preserve author state')
assert.equal(regenerated[0].authorNote, pinned.authorNote, 'rule refresh must preserve private author interpretation')
assert.equal(regenerated[0].draftId, 'draft:8')

const dismissed = applyCreativeReminderAuthorUpdate(regenerated[0], { status: 'dismissed' })
const afterDismissRefresh = buildCreativeReminderSuggestions(signals, [dismissed])
assert.equal(afterDismissRefresh[0].status, 'dismissed', 'dismissed reminders must stay dismissed after refresh')

const deletedSignals = signals.map(signal => ({
  ...signal,
  readerVisible: false,
  visibility: 'deleted' as const,
}))
assert.equal(buildCreativeReminderSuggestions(deletedSignals, []).length, 0, 'tombstones must not create reminders')

console.log('CreativeReminder flow fixture passed.')
