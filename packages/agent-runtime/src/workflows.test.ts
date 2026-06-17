import test from 'node:test'
import assert from 'node:assert/strict'
import { socraticCreateWorkflow } from './workflows.js'

test('socratic workflow returns candidate draft and at most two questions', async () => {
  const result = await socraticCreateWorkflow({
    seed: '我想写一个穿越到西方玄幻边境地下城的故事，不要游戏系统。',
    genre: '西方玄幻',
  }, { preferToolBridge: false })

  assert.equal(result.candidateDraft.status, 'candidate')
  assert.ok(result.candidateDraft.body.length > 200)
  assert.ok(result.questions.length <= 2)
  assert.ok(result.activeConstraints.some(item => item.profileId === 'western-fantasy-transmigration-non-game'))
  assert.equal(result.qualityPreview.result, 'pass')
  assert.ok(result.ledger[0].inputHash)
})

test('constraint preview blocks prohibited mismatched terms', async () => {
  const result = await socraticCreateWorkflow({
    seed: '西方玄幻穿越，非游戏化，但第一幕出现清河县仵作和系统面板。',
    genre: '西方玄幻',
  }, { preferToolBridge: false })

  assert.ok(result.activeConstraints.length > 0)
  assert.ok(result.activeConstraints[0].prohibitedTerms.includes('系统面板'))
})

