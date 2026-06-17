import test from 'node:test'
import assert from 'node:assert/strict'
import {
  constraintProfiles,
  evaluatePublicProseHygiene,
  genreKernels,
  resolveConstraints,
  resolveKernels,
} from './constraints.js'
import { agentRuntimeMeta, qualityBrakeWorkflow, socraticCreateWorkflow, statePreviewWorkflow } from './workflows.js'
import { projectPublicSocraticCreateOutput } from './workflows.js'
import { serviceToken, ToolBridgeError } from './toolBridge.js'

function firstText(values: string[] | undefined, fallback: string): string {
  return values?.find(value => value.trim().length > 0) || fallback
}

function seedForProfile(profile: typeof constraintProfiles[number]): string {
  const signal = firstText(profile.signalTerms, profile.displayName)
  const entry = firstText(profile.entryModeSignals, '一个必须立刻处理的开场事件')
  const tone = firstText(profile.toneSignals, '选择代价')
  return `我想写${profile.displayName}，从${entry}开始，${signal}和${tone}会把人物推到选择前。`
}

test('agent runtime exposes shared rulebook metadata', () => {
  assert.equal(agentRuntimeMeta.runtimeRules.version, 2)
  assert.equal(agentRuntimeMeta.runtimeRules.profileCount, constraintProfiles.length)
  assert.equal(agentRuntimeMeta.runtimeRules.kernelCount, genreKernels.length)
  assert.equal(agentRuntimeMeta.runtimeRules.privacy.representativeWorks, 'encrypted_vault_only')
  assert.equal(agentRuntimeMeta.runtimeRules.privacy.publicReferenceField, 'sourceRefs')
})

test('tool bridge service token default is only allowed outside protected deploy env', () => {
  const originalDeployEnv = process.env.NARRATIVEOS_DEPLOY_ENV
  const originalNodeEnv = process.env.NODE_ENV
  const originalToken = process.env.MASTRA_TOOL_BRIDGE_TOKEN
  const originalRequireSecrets = process.env.NARRATIVEOS_REQUIRE_EXPLICIT_SECRETS

  try {
    delete process.env.NARRATIVEOS_DEPLOY_ENV
    delete process.env.NODE_ENV
    delete process.env.MASTRA_TOOL_BRIDGE_TOKEN
    delete process.env.NARRATIVEOS_REQUIRE_EXPLICIT_SECRETS
    assert.equal(serviceToken(), 'dev-local-token')

    process.env.NARRATIVEOS_DEPLOY_ENV = 'production'
    assert.throws(
      () => serviceToken(),
      (error: unknown) => error instanceof ToolBridgeError && error.message === 'tool_bridge_secret_not_configured',
    )

    process.env.MASTRA_TOOL_BRIDGE_TOKEN = 'dev-local-token'
    assert.throws(
      () => serviceToken(),
      (error: unknown) => error instanceof ToolBridgeError && error.message === 'tool_bridge_secret_not_configured',
    )

    process.env.MASTRA_TOOL_BRIDGE_TOKEN = 'prod-secret'
    assert.equal(serviceToken(), 'prod-secret')
  } finally {
    if (originalDeployEnv === undefined) delete process.env.NARRATIVEOS_DEPLOY_ENV
    else process.env.NARRATIVEOS_DEPLOY_ENV = originalDeployEnv
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalToken === undefined) delete process.env.MASTRA_TOOL_BRIDGE_TOKEN
    else process.env.MASTRA_TOOL_BRIDGE_TOKEN = originalToken
    if (originalRequireSecrets === undefined) delete process.env.NARRATIVEOS_REQUIRE_EXPLICIT_SECRETS
    else process.env.NARRATIVEOS_REQUIRE_EXPLICIT_SECRETS = originalRequireSecrets
  }
})

test('protected deploy fails closed when tool bridge cannot be reached', async () => {
  const originalDeployEnv = process.env.NARRATIVEOS_DEPLOY_ENV
  const originalToken = process.env.MASTRA_TOOL_BRIDGE_TOKEN
  const originalBaseUrl = process.env.MASTRA_TOOL_BRIDGE_BASE_URL

  try {
    process.env.NARRATIVEOS_DEPLOY_ENV = 'production'
    process.env.MASTRA_TOOL_BRIDGE_TOKEN = 'prod-secret'
    process.env.MASTRA_TOOL_BRIDGE_BASE_URL = 'http://127.0.0.1:9'

    await assert.rejects(
      () => socraticCreateWorkflow({
        seed: '现代悬疑旧案，主角收到一份矛盾证据。',
        genre: '现代悬疑',
      }),
      (error: unknown) => error instanceof ToolBridgeError && error.message.startsWith('tool_bridge_unavailable'),
    )
  } finally {
    if (originalDeployEnv === undefined) delete process.env.NARRATIVEOS_DEPLOY_ENV
    else process.env.NARRATIVEOS_DEPLOY_ENV = originalDeployEnv
    if (originalToken === undefined) delete process.env.MASTRA_TOOL_BRIDGE_TOKEN
    else process.env.MASTRA_TOOL_BRIDGE_TOKEN = originalToken
    if (originalBaseUrl === undefined) delete process.env.MASTRA_TOOL_BRIDGE_BASE_URL
    else process.env.MASTRA_TOOL_BRIDGE_BASE_URL = originalBaseUrl
  }
})

test('socratic workflow returns candidate draft and at most two questions', async () => {
  const profile = constraintProfiles.find(item => item.displayName === '仙侠玄幻') || constraintProfiles[0]
  const result = await socraticCreateWorkflow({
    seed: seedForProfile(profile),
    genre: profile.displayName,
  }, { preferToolBridge: false })

  assert.equal(result.candidateDraft.status, 'candidate')
  assert.ok(result.candidateDraft.body.length > 200)
  assert.ok(result.questions.length <= 2)
  assert.ok(result.activeConstraints.some(item => item.profileId === profile.id))
  assert.equal(result.runtimeArtifact.version, 1)
  assert.equal(result.runtimeArtifact.narrativeRun.decision, 'candidate')
  assert.ok(result.runtimeArtifact.scenePlan.beats.length > 0)
  assert.ok(result.runtimeArtifact.stateWritebackPreview.length > 0)
  assert.equal(result.runtimeArtifact.timeConsistencyReport.status, 'pass')
  assert.equal(result.runtimeArtifact.qualityBrakeReport.result, 'pass')
  assert.equal(result.runtimeArtifact.branchGenerationResult.status, 'not_generated')
  assert.equal(result.qualityPreview.result, 'pass')
  assert.ok(result.ledger[0].inputHash)
  assert.ok(result.ledger[0].stateDeltaCandidate?.length)
})

test('public socratic projection hides runtime internals', async () => {
  const profile = constraintProfiles.find(item => item.displayName === '现代悬疑') || constraintProfiles[0]
  const result = await socraticCreateWorkflow({
    seed: seedForProfile(profile),
    genre: profile.displayName,
  }, { preferToolBridge: false })

  const projected = projectPublicSocraticCreateOutput(result) as unknown as Record<string, unknown>
  const text = JSON.stringify(projected)

  assert.equal(projected.responseMode, 'public')
  assert.ok(projected.candidateDraft)
  assert.ok(projected.settingCards)
  assert.ok(!('runtimeArtifact' in projected))
  assert.ok(!('activeConstraints' in projected))
  assert.ok(!('activeKernels' in projected))
  assert.ok(!('sourceLabels' in projected))
  assert.ok(!('runTrace' in projected))
  assert.ok(!('ledger' in projected))
  assert.ok(!('cost' in projected))
  assert.ok(!text.includes('runtimeArtifact'))
  assert.ok(!text.includes('sourceRefs'))
  assert.ok(!text.includes('kernelId'))
  assert.ok(!text.includes('profileId'))
})

test('constraint preview blocks prohibited mismatched terms', async () => {
  const result = await socraticCreateWorkflow({
    seed: '现代悬疑旧案，主角通过读心术瞬间破案，还出现未解释证据。',
    genre: '现代悬疑',
  }, { preferToolBridge: false })

  assert.ok(result.activeConstraints.length > 0)
  assert.ok(result.activeConstraints[0].prohibitedTerms.includes('读心术'))
})

test('every document profile can be explicitly selected as the primary active profile and kernel', async () => {
  for (const profile of constraintProfiles) {
    const expectedKernel = resolveKernels([profile])[0]
    assert.ok(expectedKernel, `${profile.id} must resolve at least one compatible kernel`)

    const result = await socraticCreateWorkflow({
      seed: seedForProfile(profile),
      genre: profile.displayName,
      context: {
        story_direction: {
          label: profile.displayName,
          tone: firstText(profile.toneSignals, profile.displayName),
          keywords: [
            profile.displayName,
            firstText(profile.signalTerms, profile.displayName),
            firstText(profile.entryModeSignals, profile.displayName),
          ].join(' '),
        },
        main_universe_template: {
          title: `${profile.displayName}开场`,
          genre: profile.displayName,
        },
      },
    }, { preferToolBridge: false })

    assert.equal(result.candidateDraft.status, 'candidate', `${profile.id} must produce a candidate`)
    assert.equal(result.candidateDraft.title, `${profile.displayName}开场`.slice(0, 16))
    assert.ok(result.candidateDraft.body.length > 200, `${profile.id} must produce readable prose`)
    assert.equal(result.activeConstraints[0].profileId, profile.id, `${profile.id} must be primary`)
    assert.equal(result.activeKernels[0].kernelId, expectedKernel.id, `${expectedKernel.id} must be primary`)
    assert.equal(result.runtimeArtifact.kernelSelection[0].kernelId, expectedKernel.id, `${expectedKernel.id} must enter runtime artifact`)
    assert.equal(result.runtimeArtifact.constraintSet[0].profileId, profile.id, `${profile.id} must enter runtime artifact`)
    assert.ok(result.runtimeArtifact.scenePlan.choiceSlots.length <= 2, `${profile.id} must keep choice slots Socratic`)
    assert.ok(result.questions.length <= 2, `${profile.id} must stay Socratic`)
    assert.equal(result.qualityPreview.result, 'pass', `${profile.id} generated candidate should pass its own rules`)
  }
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
  const profile = constraintProfiles.find(item =>
    item.rules.some(rule => (rule.prohibitedTerms || []).includes('读心术')),
  ) || constraintProfiles[0]
  const prohibitedTerms = profile.rules.flatMap(rule => rule.prohibitedTerms || []).slice(0, 2)
  const ruleIds = profile.rules.map(rule => rule.id)
  const violatingBody = `旧案重启当晚，那个人通过${prohibitedTerms[0]}瞬间逼近真相，还拿出${prohibitedTerms[1]}。`
  const result = await qualityBrakeWorkflow({
    seed: `${profile.displayName}，${violatingBody}`,
    genre: profile.displayName,
    context: {
      mastra_local_output: {
        runId: 'run_quality_demo',
        projectId: 'project_demo',
        sessionId: 'session_demo',
        candidateDraft: {
          status: 'candidate',
          title: '雨夜证据',
          body: violatingBody,
        },
        activeConstraints: [
          {
            profileId: profile.id,
            ruleIds,
            prohibitedTerms,
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
  for (const term of prohibitedTerms) {
    assert.ok(!String(revisedCandidate.body || '').includes(term))
  }
  assert.equal(writeback.canon_written, false)
  assert.equal(writeback.branch_written, false)
})
