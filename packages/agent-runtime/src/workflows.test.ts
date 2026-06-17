import test from 'node:test'
import assert from 'node:assert/strict'
import { socraticCreateWorkflow, statePreviewWorkflow } from './workflows.js'

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

test('state preview workflow never writes canon when tool bridge is unavailable', async () => {
  const result = await statePreviewWorkflow({
    seed: '主角把裂纹玉简放回问灵台，暂时不确认这段正文。',
    genre: '仙侠玄幻',
    context: {
      mastra_local_output: {
        runId: 'run_preview_demo',
        projectId: 'project_demo',
        sessionId: 'session_demo',
        candidateDraft: {
          status: 'candidate',
          title: '问灵台',
          body: '问灵台的铜铃响到第三声。',
        },
        settingCards: {
          confirmed: ['裂纹玉简', '问灵台', '因果债'],
        },
        runTrace: [],
      },
    },
  })

  const writeback = result.writeback as Record<string, unknown>
  assert.equal(result.status, 'preview_only')
  assert.equal(writeback.canon_written, false)
  assert.equal(writeback.branch_written, false)
})
