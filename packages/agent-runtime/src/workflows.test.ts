import test from 'node:test'
import assert from 'node:assert/strict'
import {
  constraintProfiles,
  evaluatePublicProseHygiene,
  genreKernels,
  resolveConstraints,
} from './constraints.js'
import { agentRuntimeMeta, qualityBrakeWorkflow, socraticCreateWorkflow, statePreviewWorkflow } from './workflows.js'

test('agent runtime exposes shared rulebook metadata', () => {
  assert.equal(agentRuntimeMeta.runtimeRules.version, 2)
  assert.equal(agentRuntimeMeta.runtimeRules.profileCount, constraintProfiles.length)
  assert.equal(agentRuntimeMeta.runtimeRules.kernelCount, genreKernels.length)
  assert.equal(agentRuntimeMeta.runtimeRules.privacy.representativeWorks, 'encrypted_vault_only')
  assert.equal(agentRuntimeMeta.runtimeRules.privacy.publicReferenceField, 'sourceRefs')
})

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

test('selected system genre produces a full candidate and remains primary', async () => {
  const result = await socraticCreateWorkflow({
    seed: '主角每完成一次任务都会拿回一段不属于自己的记忆。',
    genre: '系统流',
    context: {
      story_direction: {
        label: '系统流',
        keywords: '系统流 任务代价 记忆回声 身份反噬',
      },
      main_universe_template: {
        title: '任务回声',
        genre: '系统流',
      },
    },
  }, { preferToolBridge: false })

  assert.equal(result.candidateDraft.status, 'candidate')
  assert.equal(result.candidateDraft.title, '任务回声')
  assert.ok(result.candidateDraft.body.length > 200)
  assert.equal(result.activeConstraints[0].profileId, 'system-litrpg')
  assert.equal(result.activeKernels[0].kernelId, 'kernel-system-litrpg')
  assert.ok(result.questions.length <= 2)
})

test('candidate opening is generated from the active document kernel instead of hardcoded profile branches', async () => {
  const result = await socraticCreateWorkflow({
    seed: '年代女强，主角重回改革初期，用粮票和政策窗口救下家里的小厂。',
    genre: '年代女强',
  }, { preferToolBridge: false })

  assert.equal(result.activeConstraints[0].profileId, 'era-female')
  assert.equal(result.activeKernels[0].kernelId, 'kernel-era-female')
  assert.ok(result.candidateDraft.body.includes('政策'))
  assert.ok(result.candidateDraft.body.includes('粮票'))
  assert.ok(result.questions[0].includes('具体落在'))
  assert.equal(result.qualityPreview.result, 'pass')
})

test('candidate prose does not expose planning scaffolds', async () => {
  const cases = [
    ['仙侠玄幻', '我想写仙侠玄幻，主角突破前必须先还一笔因果债。'],
    ['现代悬疑', '现代悬疑旧案，主角收到一份矛盾证据。'],
    ['系统流', '系统流故事，主角每次完成任务都会拿回一段记忆。'],
    ['轻喜剧', '轻喜剧误会，主角一句话把审问现场带偏。'],
  ]

  for (const [genre, seed] of cases) {
    const result = await socraticCreateWorkflow({ genre, seed }, { preferToolBridge: false })
    const body = result.candidateDraft.body
    assert.ok(!body.includes('本轮节拍'), `${genre} leaked beat plan label`)
    assert.ok(!body.includes(' -> '), `${genre} leaked machine planning delimiter`)
    assert.ok(!body.includes('BeatPlan'), `${genre} leaked internal planning term`)
    assert.ok(!body.includes('故事种子'), `${genre} leaked seed scaffold`)
    assert.ok(!body.includes('这不是一句设定'), `${genre} leaked setup explanation`)
    assert.ok(!body.includes('故事里'), `${genre} leaked genre explanation`)
    assert.ok(!body.includes('应该停在'), `${genre} leaked author-facing planning advice`)
    assert.ok(!body.includes('主角'), `${genre} leaked protagonist placeholder instead of prose`)
  }
})

test('follow-up questions stay conversational and avoid backend planning labels', async () => {
  const result = await socraticCreateWorkflow({
    seed: '现代悬疑旧案，主角收到一份矛盾证据。',
    genre: '现代悬疑',
  }, { preferToolBridge: false })

  const questionText = result.questions.join(' ')
  assert.ok(!questionText.includes('kernel'))
  assert.ok(!questionText.includes('constraint'))
  assert.ok(!questionText.includes('主角'))
  assert.ok(result.questions.length <= 2)
})

test('public prose hygiene follows active genre rules without global genre bans', () => {
  const modernProfiles = resolveConstraints({
    seed: '现代悬疑旧案，主角收到一份矛盾证据。',
    genre: '现代悬疑',
  })
  const modernViolations = evaluatePublicProseHygiene(
    '主角通过读心术瞬间破案，还拿出未解释证据。',
    modernProfiles,
  )

  assert.ok(
    modernViolations.some(item => item.ruleId === 'logical-evidence-required'),
    'modern mystery should reject unearned evidence shortcuts from the active profile',
  )

  const gameProfiles = resolveConstraints({
    seed: '游戏异界，团队进入副本，职业配合决定成败。',
    genre: '游戏异界',
  })
  const gameViolations = evaluatePublicProseHygiene(
    '任务日志刷新，技能树亮起，排行榜上的名字向前跳了一位。',
    gameProfiles,
  )

  assert.equal(
    gameViolations.length,
    0,
    'game-facing terms must not be globally banned when the active profile expects them',
  )

  const scaffoldViolations = evaluatePublicProseHygiene('本轮节拍：开局 -> 反转。', [])

  assert.ok(
    scaffoldViolations.some(item => item.ruleId === 'public-prose-no-scaffold'),
    'public candidate prose should never expose planning scaffolds',
  )
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

test('quality brake suggests repair without committing candidate text', async () => {
  const result = await qualityBrakeWorkflow({
    seed: '现代悬疑旧案，主角通过读心术瞬间破案，还出现未解释证据。',
    genre: '现代悬疑',
    context: {
      mastra_local_output: {
        runId: 'run_quality_demo',
        projectId: 'project_demo',
        sessionId: 'session_demo',
        candidateDraft: {
          status: 'candidate',
          title: '雨夜证据',
          body: '旧案重启当晚，主角通过读心术瞬间破案，还拿出未解释证据逼近真相。',
        },
        activeConstraints: [
          {
            profileId: 'modern-other',
            ruleIds: ['modern_other_no_unearned_supernatural'],
            prohibitedTerms: ['读心术', '未解释证据'],
          },
        ],
        runTrace: [],
      },
    },
  })

  assert.equal(result.status, 'repair_suggested')
  const qualityPreview = result.qualityPreview as Record<string, unknown>
  const revisedCandidate = result.revisedCandidate as Record<string, unknown>
  const writeback = result.writeback as Record<string, unknown>
  assert.equal(qualityPreview.result, 'block')
  assert.ok(Array.isArray(qualityPreview.violations))
  assert.ok(!String(revisedCandidate.body || '').includes('读心术'))
  assert.ok(!String(revisedCandidate.body || '').includes('未解释证据'))
  assert.equal(writeback.canon_written, false)
  assert.equal(writeback.branch_written, false)
})
