import assert from 'node:assert/strict'
import {
  normalizeReaderSignalBatches,
  sourceSyncStatesFromBatches,
} from '../src/features/creator-pivot/externalEchoAdapters'
import type { ReaderSignalSourceBatch } from '../src/features/creator-pivot/externalEchoContracts'
import {
  cloudExternalEchoBatch,
  decodeExternalEchoCloudCursor,
  encodeExternalEchoCloudCursor,
  unavailableCloudExternalEchoBatch,
  type CloudExternalEchoRow,
} from '../src/features/creator-pivot/externalEchoCloudProjection'

const fetchedAt = '2026-07-10T18:00:00.000Z'
const common = {
  workId: 'work:1',
  branchId: 'branch:main',
  chapterId: 'chapter:7',
  visibility: 'visible' as const,
  createdAt: '2026-07-10T17:00:00.000Z',
}

const batches: ReaderSignalSourceBatch[] = [
  {
    source: 'request',
    cursor: 'request:2',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [{
      ...common,
      source: 'request',
      id: 'request:1',
      text: '想看妹妹先发现真相。',
      requestType: 'if_branch',
      status: 'pending',
      voteCount: 4,
    }],
  },
  {
    source: 'comment',
    cursor: 'comment:3',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [
      {
        ...common,
        source: 'comment',
        id: 'comment:duplicate',
        text: '想看妹妹先发现真相。',
        category: 'comment',
      },
      {
        ...common,
        source: 'comment',
        id: 'comment:edited',
        text: '旧的评论内容',
        category: 'comment',
        updatedAt: '2026-07-10T17:01:00.000Z',
      },
      {
        ...common,
        source: 'comment',
        id: 'comment:edited',
        text: '新的评论内容',
        category: 'comment',
        updatedAt: '2026-07-10T17:02:00.000Z',
      },
    ],
  },
  {
    source: 'highlight',
    cursor: 'highlight:1',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [{
      ...common,
      source: 'highlight',
      id: 'highlight:1',
      text: '她不是被抛弃，而是被保存。',
      anchorText: '她不是被抛弃',
      highlightCount: 18,
    }],
  },
  {
    source: 'reaction',
    cursor: 'reaction:1',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [{
      ...common,
      source: 'reaction',
      id: 'reaction:1',
      text: '这一幕让我很想继续看。',
      reaction: 'want_more',
      count: 9,
    }],
  },
  {
    source: 'question',
    cursor: 'question:1',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [{
      ...common,
      source: 'question',
      id: 'question:1',
      text: '她为什么突然相信守灯人？',
      category: 'confusion',
    }],
  },
  {
    source: 'vote_aggregate',
    cursor: 'vote:1',
    fetchedAt,
    status: 'fresh',
    completeSnapshot: true,
    records: [{
      ...common,
      source: 'vote_aggregate',
      id: 'vote:1',
      requestId: 'request:1',
      text: '读者支持展开这条支线。',
      count: 4,
    }],
  },
]

const signals = normalizeReaderSignalBatches(batches)
assert.equal(signals.length, 6, 'source-id dedup and content-hash dedup must both apply')

const duplicate = signals.find(signal => signal.rawText === '想看妹妹先发现真相。')
assert.ok(duplicate)
assert.deepEqual(
  duplicate.sourceRefs.map(ref => ref.source).sort(),
  ['comment', 'request'],
  'same normalized content must retain both public source references',
)
assert.equal(duplicate.weight, 5)

assert.equal(signals.some(signal => signal.rawText === '旧的评论内容'), false)
assert.equal(signals.some(signal => signal.rawText === '新的评论内容'), true)
assert.equal(signals.find(signal => signal.sourceType === 'highlight')?.weight, 18)
assert.equal(signals.find(signal => signal.sourceType === 'confusion')?.source, 'question')

const states = sourceSyncStatesFromBatches(batches, [])
assert.equal(states.length, 6)
assert.equal(states.every(state => state.status === 'fresh' && state.cursor), true)

const offline = sourceSyncStatesFromBatches([{
  source: 'comment',
  cursor: null,
  fetchedAt: '2026-07-10T18:01:00.000Z',
  status: 'offline',
  errorCode: 'network_unavailable',
  completeSnapshot: false,
  records: [],
}], states)
assert.equal(offline[0].cursor, 'comment:3', 'offline refresh must preserve the last successful cursor')
assert.equal(offline[0].lastSuccessfulAt, fetchedAt)

const tombstone = normalizeReaderSignalBatches([{
  source: 'comment',
  cursor: 'comment:4',
  fetchedAt: '2026-07-10T18:02:00.000Z',
  status: 'fresh',
  completeSnapshot: true,
  records: [{
    ...common,
    source: 'comment',
    id: 'comment:deleted',
    text: '已经删除的公开留言',
    category: 'comment',
    visibility: 'deleted',
  }],
}])[0]
assert.equal(tombstone.visibility, 'deleted')
assert.equal(tombstone.readerVisible, false)
assert.equal(Boolean(tombstone.tombstonedAt), true)

const cloudRows: CloudExternalEchoRow[] = [
  {
    id: 'comment:cloud-1',
    source: 'comment',
    work_id: 'work:1',
    branch_id: 'branch:main',
    chapter_id: 'chapter:7',
    text: '这条留言来自真实云端投影。',
    anchor_text: null,
    category: 'continuity_note',
    reaction: null,
    weight: 1,
    visibility: 'visible',
    moderation_status: 'pending',
    created_at: '2026-07-10T18:03:00.000Z',
    updated_at: '2026-07-10T18:04:00.000Z',
  },
]
const cloudBatch = cloudExternalEchoBatch('comment', cloudRows, '2026-07-10T18:05:00.000Z')
assert.equal(cloudBatch.records.length, 1)
assert.equal(cloudBatch.completeSnapshot, true)
assert.equal(cloudBatch.records[0]?.source, 'comment')
assert.equal(cloudBatch.records[0]?.updatedAt, '2026-07-10T18:04:00.000Z')
const decodedCursor = decodeExternalEchoCloudCursor(cloudBatch.cursor)
assert.deepEqual(decodedCursor, {
  updatedAt: '2026-07-10T18:04:00.000Z',
  id: 'comment:cloud-1',
})
assert.equal(
  encodeExternalEchoCloudCursor(decodedCursor!),
  cloudBatch.cursor,
  'cloud cursor must be stable across persistence and reload',
)

const incrementalBatch = cloudExternalEchoBatch(
  'comment',
  [],
  '2026-07-10T18:06:00.000Z',
  cloudBatch.cursor,
)
assert.equal(incrementalBatch.completeSnapshot, false)
assert.equal(incrementalBatch.cursor, cloudBatch.cursor)
const unavailable = unavailableCloudExternalEchoBatch(
  'comment',
  '2026-07-10T18:07:00.000Z',
  cloudBatch.cursor,
  'PGRST202',
)
assert.equal(unavailable.status, 'error')
assert.equal(unavailable.completeSnapshot, false)
assert.equal(unavailable.cursor, cloudBatch.cursor)

console.log('ReaderSignal adapter fixture passed.')
