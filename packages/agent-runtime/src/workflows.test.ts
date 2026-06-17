import test from 'node:test'
import assert from 'node:assert/strict'
import { socraticCreateWorkflow } from './workflows.js'

test('socratic workflow returns candidate draft and at most two questions', async () => {
  const result = await socraticCreateWorkflow({
    seed: '我想写一个仙侠玄幻故事，主角得到一枚裂纹玉简，突破前必须先还一笔因果债。',
    genre: '仙侠玄幻',
  }, { preferToolBridge: false })

  assert.equal(result.candidateDraft.status, 'candidate')
  assert.ok(result.candidateDraft.body.length > 200)
  assert.ok(result.questions.length <= 2)
  assert.ok(result.activeConstraints.some(item => item.profileId === 'xuanhuan-xianxia'))
  assert.equal(result.qualityPreview.result, 'pass')
  assert.ok(result.ledger[0].inputHash)
})

test('constraint preview blocks prohibited mismatched terms', async () => {
  const result = await socraticCreateWorkflow({
    seed: '现代悬疑旧案，主角通过读心术瞬间破案，还出现未解释证据。',
    genre: '现代悬疑',
  }, { preferToolBridge: false })

  assert.ok(result.activeConstraints.length > 0)
  assert.ok(result.activeConstraints[0].prohibitedTerms.includes('读心术'))
})
