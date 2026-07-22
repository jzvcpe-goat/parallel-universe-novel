import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  applyEvidencePatches,
  assertArcChapters,
  assertBlueprint,
  commitAcceptedChapter,
  countHanCharacters,
  deterministicChapterReview,
  initialRollingState,
  normalizeRollingState,
  reviewDecision,
  validateModelReview,
  validateStateProposalEvidence,
} from './longform-quality-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VALIDATION_ROOT = path.join(ROOT, 'validation', 'longform')
const SCHEMA_ROOT = path.join(VALIDATION_ROOT, 'schemas')
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'artifacts', 'longform-quality')
const seedsPath = path.join(VALIDATION_ROOT, 'project-seeds.json')
const MODEL_ATTEMPTS = Math.min(5, Math.max(1, Number(process.env.PUF_LONGFORM_MODEL_ATTEMPTS || 3)))

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function parseArgs(argv) {
  const args = {
    command: argv[0] && !argv[0].startsWith('--') ? argv[0] : 'run',
    project: 'all',
    from: 1,
    to: 100,
    workers: 2,
    arcWorkers: 2,
    force: false,
    candidateAttempts: 3,
    outputRoot: process.env.PUF_LONGFORM_OUTPUT_DIR || DEFAULT_OUTPUT_ROOT,
  }
  const start = args.command === argv[0] ? 1 : 0
  for (let index = start; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--force') args.force = true
    else if (token === '--project') args.project = argv[++index]
    else if (token === '--from') args.from = Number(argv[++index])
    else if (token === '--to') args.to = Number(argv[++index])
    else if (token === '--workers') args.workers = Number(argv[++index])
    else if (token === '--arc-workers') args.arcWorkers = Number(argv[++index])
    else if (token === '--candidate-attempts') args.candidateAttempts = Number(argv[++index])
    else if (token === '--output-root') args.outputRoot = path.resolve(argv[++index])
    else throw new Error(`unknown_argument:${token}`)
  }
  if (!['prepare', 'run', 'report'].includes(args.command)) throw new Error(`unknown_command:${args.command}`)
  if (!Number.isInteger(args.from) || !Number.isInteger(args.to) || args.from < 1 || args.to > 100 || args.from > args.to) {
    throw new Error('invalid_chapter_range')
  }
  if (!Number.isInteger(args.workers) || args.workers < 1 || args.workers > 8) throw new Error('invalid_worker_count')
  if (!Number.isInteger(args.arcWorkers) || args.arcWorkers < 1 || args.arcWorkers > 4) throw new Error('invalid_arc_worker_count')
  if (!Number.isInteger(args.candidateAttempts) || args.candidateAttempts < 1 || args.candidateAttempts > 5) {
    throw new Error('invalid_candidate_attempt_count')
  }
  return args
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function listFiles(directory) {
  try {
    return await readdir(directory)
  } catch {
    return []
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, filePath)
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, value, 'utf8')
  await rename(temporary, filePath)
}

function compactJson(value) {
  return JSON.stringify(value, null, 2)
}

function promptState(state) {
  return {
    acceptedChapterCount: state.acceptedChapterCount,
    timeline: state.timeline,
    characters: state.characters,
    knowledgeByCharacter: state.knowledgeByCharacter || {},
    entityHistory: state.entityHistory.slice(-20),
    knowledgeHistory: state.knowledgeHistory.slice(-20),
    unresolvedPromises: state.unresolvedPromises.slice(-20),
    resolvedPromises: state.resolvedPromises.slice(-20),
    foreshadowing: state.foreshadowing.slice(-20),
    unplannedFacts: state.unplannedFacts.slice(-16),
    recentSummaries: state.recentSummaries,
    lastChapterTail: state.lastChapterTail,
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function codexArgs(schemaPath, outputPath) {
  const args = [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--ignore-user-config',
    '--ignore-rules',
    '-C',
    tmpdir(),
    '--output-schema',
    schemaPath,
    '-o',
    outputPath,
    '-',
  ]
  if (process.env.PUF_LONGFORM_MODEL) args.splice(1, 0, '--model', process.env.PUF_LONGFORM_MODEL)
  return args
}

async function invokeCodexJson({ prompt, schemaName, logDirectory, label }) {
  const schemaPath = path.join(SCHEMA_ROOT, schemaName)
  await mkdir(logDirectory, { recursive: true })
  let lastError = null
  let previousFailure = null
  for (let attempt = 1; attempt <= MODEL_ATTEMPTS; attempt += 1) {
    const stem = `${label}-model-${attempt}`
    const outputPath = path.join(logDirectory, `${stem}.json`)
    const logPath = path.join(logDirectory, `${stem}.log`)
    const invocationPrompt = previousFailure === 'invalid_json'
      ? `${prompt}\n\n上一次返回未通过结构校验。只修复 JSON 结构并完整返回，不要解释。`
      : prompt
    const result = await new Promise(resolve => {
      const child = spawn('codex', codexArgs(schemaPath, outputPath), {
        cwd: tmpdir(),
        env: process.env,
        stdio: ['pipe', 'ignore', 'pipe'],
      })
      let stderr = ''
      const timer = setTimeout(() => child.kill('SIGTERM'), 12 * 60 * 1000)
      child.stderr.on('data', chunk => { stderr += chunk.toString() })
      child.on('error', error => {
        clearTimeout(timer)
        resolve({ code: -1, stderr: `${stderr}\n${error.stack || error.message}` })
      })
      child.on('close', code => {
        clearTimeout(timer)
        resolve({ code, stderr })
      })
      child.stdin.end(invocationPrompt)
    })
    await writeText(logPath, result.stderr || '')
    if (result.code !== 0) {
      lastError = new Error(`working_agent_failed:${label}:exit_${result.code}`)
      previousFailure = 'execution'
      if (attempt < MODEL_ATTEMPTS) await wait(Math.min(30_000, attempt * 5_000))
      continue
    }
    try {
      return await readJson(outputPath)
    } catch (error) {
      lastError = new Error(`working_agent_invalid_json:${label}:${error.message}`)
      previousFailure = 'invalid_json'
      if (attempt < MODEL_ATTEMPTS) await wait(Math.min(30_000, attempt * 5_000))
    }
  }
  throw lastError || new Error(`working_agent_failed:${label}`)
}

function blueprintPrompt(project, reservedCharacterNames) {
  return `你是一名资深中文长篇小说策划编辑。请把下面的原创创作种子发展成可支撑 100 章的故事蓝图。

必须遵守：
1. 只借题材趋势，不模仿任何现有作品、作者、角色、专名或句子。
2. 先服从作者已经回答的两个问题和锁定意图，不自行改写主题。
3. 规划 10 个故事弧，每弧严格 10 章，范围依次为 1-10、11-20，直到 91-100。
4. 每个故事弧都要改变人物、关系、知识或资源状态，并把未解决债务带到下一弧。
5. 人物必须有欲望、恐惧、创伤、防御机制、秘密、可区分声线和弧光，不能是功能标签。
6. 终局方向清楚，但不得让前六十章过早解决核心谜题。
7. 其他项目已保留的主角名不得用于本项目任何人物：${compactJson(reservedCharacterNames)}。
8. 不输出正文，不输出解释，只返回符合 schema 的 JSON。

创作种子：
${compactJson(project)}`
}

function arcPrompt(project, blueprint, arc) {
  return `你是一名长篇小说分章策划。请把指定故事弧拆成严格 10 张章节卡。

章节卡约束：
1. 章节号必须从 ${arc.chapterStart} 到 ${arc.chapterEnd}，不缺号、不重复。
2. 每章是一场可独立生成的核心场景，具有目标、阻力、转折、人物选择、代价、信息变化和结尾钩子。
3. 不能连续重复地点、冲突机制或同一种结尾。
4. 每章至少给出三个可直接写进正文的感官锚点。
5. promise 字段用简短稳定的中文描述；后续章节需要原样引用才能推进或回收。
6. 前一章的后果必须成为后一章的开场压力，不能靠旁白跳过关键因果。
7. 不写正文，不解释，只返回 JSON。

项目与锁定意图：
${compactJson({ id: project.id, category: project.category, title: project.title, intent: project.intent, style: project.style })}

故事蓝图：
${compactJson({
    logline: blueprint.logline,
    themeStatement: blueprint.themeStatement,
    storyPromise: blueprint.storyPromise,
    endingDirection: blueprint.endingDirection,
    worldRules: blueprint.worldRules,
    characters: blueprint.characters,
    locations: blueprint.locations,
    relationshipAxes: blueprint.relationshipAxes,
    styleContract: blueprint.styleContract,
  })}

当前故事弧：
${compactJson(arc)}

相邻弧线：
${compactJson({
    previous: blueprint.arcs.find(item => item.number === arc.number - 1) || null,
    next: blueprint.arcs.find(item => item.number === arc.number + 1) || null,
  })}`
}

function titleRepairPrompt(project, duplicates, reservedTitles) {
  return `你是一名中文长篇小说的分章编辑。下面的百章计划中出现了跨故事弧重名标题，请只修改重复项的标题。

规则：
1. 每个重复章节必须返回且只能返回一次，chapterNumber 和 previousTitle 不得改变。
2. newTitle 必须根据该章自己的场景目标、冲突、选择、代价和结尾钩子命名，不能只加序号或同义词后缀。
3. newTitle 不能与保留标题重复，彼此也不能重复。
4. 不修改任何情节、人物、地点、章节号或其他章节标题。
5. 不解释，只返回 JSON。

项目：
${compactJson({ id: project.id, category: project.category, title: project.title })}

需要改名的章节：
${compactJson(duplicates.map(item => ({
    chapterNumber: item.card.number,
    previousTitle: item.card.title,
    sceneGoal: item.card.sceneGoal,
    conflict: item.card.conflict,
    requiredChoice: item.card.requiredChoice,
    cost: item.card.cost,
    endingHook: item.card.endingHook,
  })))}

已经保留、不得重复的标题：
${compactJson(reservedTitles)}`
}

function duplicateChapterTitles(arcPlans) {
  const seen = new Map()
  const duplicates = []
  for (const arcPlan of arcPlans) {
    for (const card of arcPlan.chapters) {
      const key = card.title.trim()
      if (seen.has(key)) duplicates.push({ card, arcPlan, firstChapterNumber: seen.get(key) })
      else seen.set(key, card.number)
    }
  }
  return { duplicates, reservedTitles: [...seen.keys()] }
}

async function repairDuplicateChapterTitles({ project, blueprint, projectDirectory, runtimeDirectory, arcPlans }) {
  const { duplicates, reservedTitles } = duplicateChapterTitles(arcPlans)
  if (!duplicates.length) return []
  const response = await invokeCodexJson({
    prompt: titleRepairPrompt(project, duplicates, reservedTitles),
    schemaName: 'chapter-title-repair.schema.json',
    logDirectory: runtimeDirectory,
    label: 'chapter-title-repair',
  })
  const expected = new Map(duplicates.map(item => [item.card.number, item]))
  if (response.repairs.length !== duplicates.length) throw new Error(`invalid_title_repair_count:${project.id}`)
  const nextTitles = new Set(reservedTitles)
  const applied = []
  for (const repair of response.repairs) {
    const duplicate = expected.get(repair.chapterNumber)
    const nextTitle = repair.newTitle.trim()
    if (!duplicate || duplicate.card.title !== repair.previousTitle || nextTitle === repair.previousTitle.trim()) {
      throw new Error(`invalid_title_repair_target:${project.id}:${repair.chapterNumber}`)
    }
    if (nextTitles.has(nextTitle)) throw new Error(`duplicate_repaired_title:${project.id}:${nextTitle}`)
    duplicate.card.title = nextTitle
    nextTitles.add(nextTitle)
    expected.delete(repair.chapterNumber)
    applied.push({ ...repair, newTitle: nextTitle, firstDuplicateChapterNumber: duplicate.firstChapterNumber })
  }
  if (expected.size) throw new Error(`missing_title_repairs:${project.id}`)
  for (const arcPlan of arcPlans) {
    assertArcChapters(project.id, arcPlan.arcNumber, arcPlan, blueprint)
    await writeJson(
      path.join(projectDirectory, 'outline', `arc-${String(arcPlan.arcNumber).padStart(2, '0')}.json`),
      arcPlan,
    )
  }
  await writeJson(path.join(projectDirectory, 'outline', 'title-repairs.json'), {
    schemaVersion: 'chapter-title-repair-record.v1',
    projectId: project.id,
    applied,
  })
  return applied
}

function chapterPrompt({ project, blueprint, card, state, rejectionNotes }) {
  const pov = blueprint.characters.find(item => item.id === card.povCharacterId)
  const location = blueprint.locations.find(item => item.id === card.locationId)
  return `你是一名成熟的中文长篇小说作者。请写第 ${card.number} 章的一个核心场景候选。

硬性规则：
1. 正文约 3000 个汉字，必须在 2700-3400 个汉字之间；正文只写小说，不加小标题、提纲、点评或创作说明。
2. 本次只写章节卡规定的一场核心场景，不跨章，不总结后续，不一次解决整个故事弧。
3. 使用第三人称限知并严格停留在指定视点；人物通过行动、反应、误读和选择显露内心。
4. 开场立即承接上一章留下的具体压力；中段必须有阻力升级和一次信息或立场转折；结尾让后果到达并留下新压力。
5. 至少自然落实两个感官锚点。解释性段落必须转成动作、物件、对白或环境反馈。
6. 人物声线遵守蓝图，不能让所有人说同一种完整、正确、善解人意的话。
   只让本场景因果需要的人物出场；正文出现的蓝图人物必须遵守其欲望、恐惧、防御、秘密边界和声线。
7. 不得写工程词、章节功能说明、套话式总结、万能系统、无代价解决或现有作品风格仿写。
8. stateProposal 只是候选状态差异，不是正史提交。所有 evidenceQuote 必须逐字出现在 body 中。
9. promise 与 foreshadowing 若推进或回收，必须原样复制已有描述；不能假装回收不存在的承诺。
10. projectId 必须逐字复制为 "${project.id}"，chapterNumber 必须是 ${card.number}，title 必须逐字复制章节卡标题 "${card.title}"；三者都不得翻译、改写或另造标识。
11. 只返回 schema JSON，不解释。

锁定意图：
${compactJson(project.intent)}

全书蓝图摘要：
${compactJson({
    title: blueprint.title,
    logline: blueprint.logline,
    themeStatement: blueprint.themeStatement,
    storyPromise: blueprint.storyPromise,
    worldRules: blueprint.worldRules,
    styleContract: blueprint.styleContract,
  })}

视点人物：
${compactJson(pov)}

人物组（只作为人物逻辑与声线合同，不要求全员出场）：
${compactJson(blueprint.characters)}

场景地点：
${compactJson(location)}

本章卡：
${compactJson(card)}

当前连续性状态：
${compactJson(promptState(state))}

上次候选拒绝原因：
${compactJson(rejectionNotes || [])}`
}

function reviewPrompt({ project, blueprint, card, state, draft }) {
  return `你是一名独立中文小说编辑。只审阅下面这一章，不替作者重写全文，也不计算综合文学分数。

审阅规则：
1. 只报告会真实影响连续性、张力、信息控制、人物能动性、声线、新鲜度、类型兑现、重复、解释、现场细节或节奏的问题。
2. 每条 finding 的 evidenceQuote 必须逐字复制正文中的短句；无法定位证据就不要提出。
3. 局部可修的问题标 revision_candidate；违反锁定信息、人物核心或前后状态标 hard_block；纯偏好标 taste_note。
4. 同时选择最多四处应该保护、不应被修订覆盖的正文原句。
5. 若没有实质问题，decision 必须为 pass。不要为了凑数量制造意见。
6. 不模仿任何现有作者，不输出正文，只返回 JSON。
7. 章节卡中的 requiredChoice、cost、reveal 和 endingHook 是作者锁定内容；正文准确兑现它们本身不是“过度揭示”。只有它们与写前状态、锁定信息边界或正文因果真正冲突时才能报告。

项目意图、世界规则与风格：
${compactJson({
    intent: project.intent,
    worldRules: blueprint.worldRules,
    style: blueprint.styleContract,
  })}

人物组（用于核对行动逻辑、信息边界和声线）：
${compactJson(blueprint.characters)}

场景地点：
${compactJson(blueprint.locations.find(item => item.id === card.locationId))}

本章卡：
${compactJson(card)}

写前状态：
${compactJson(promptState(state))}

候选正文：
${draft.body}`
}

function repairPrompt({ project, blueprint, card, body, findings, preserveExcerpts }) {
  return `你是一名中文小说修订编辑。请只针对有正文证据的问题提出局部替换 Patch。

规则：
1. evidenceQuote 必须逐字复制正文，且在正文中只出现一次。
2. replacement 只修这一小段，不得重写全文，不得顺手改变后续事实。
3. 不得改动 preserveExcerpts 中的任何文字。
4. 最多三个 Patch；没有可靠局部修法时返回空数组。
5. 保持视点、人物声线、章节卡和作者锁定意图。
6. 只返回 JSON。

章节卡：
${compactJson(card)}

风格合同：
${compactJson(blueprint.styleContract)}

人物组（只用于保持局部修订前后的人物逻辑与声线）：
${compactJson(blueprint.characters)}

作者边界：
${compactJson(project.intent)}

需要修复的问题：
${compactJson(findings)}

保护原句：
${compactJson(preserveExcerpts)}

正文：
${body}`
}

async function prepareProject({ project, seedSet, outputRoot, force, arcWorkers = 2 }) {
  const projectDirectory = path.join(outputRoot, 'projects', project.id)
  const runtimeDirectory = path.join(projectDirectory, 'runtime')
  const seedOutput = path.join(projectDirectory, 'seed.json')
  const blueprintPath = path.join(projectDirectory, 'story-blueprint.json')
  const reservedCharacterNames = seedSet.projects
    .filter(item => item.id !== project.id)
    .map(item => item.protagonistName)
  await writeJson(seedOutput, project)

  let blueprint
  if (!force && await exists(blueprintPath)) {
    blueprint = await readJson(blueprintPath)
  } else {
    blueprint = await invokeCodexJson({
      prompt: blueprintPrompt(project, reservedCharacterNames),
      schemaName: 'story-blueprint.schema.json',
      logDirectory: runtimeDirectory,
      label: 'story-blueprint',
    })
    assertBlueprint(project, blueprint, { reservedCharacterNames })
    await writeJson(blueprintPath, blueprint)
  }
  assertBlueprint(project, blueprint, { reservedCharacterNames })

  const arcPlans = new Array(blueprint.arcs.length)
  const arcQueue = blueprint.arcs.map((arc, index) => ({ arc, index }))
  await Promise.all(Array.from({ length: Math.min(arcWorkers, arcQueue.length) }, async () => {
    while (arcQueue.length) {
      const { arc, index } = arcQueue.shift()
    const arcPath = path.join(projectDirectory, 'outline', `arc-${String(arc.number).padStart(2, '0')}.json`)
    let arcPlan
    if (!force && await exists(arcPath)) {
      arcPlan = await readJson(arcPath)
    } else {
      arcPlan = await invokeCodexJson({
        prompt: arcPrompt(project, blueprint, arc),
        schemaName: 'arc-chapters.schema.json',
        logDirectory: runtimeDirectory,
        label: `arc-${String(arc.number).padStart(2, '0')}`,
      })
      assertArcChapters(project.id, arc.number, arcPlan, blueprint)
      await writeJson(arcPath, arcPlan)
    }
    assertArcChapters(project.id, arc.number, arcPlan, blueprint)
      arcPlans[index] = arcPlan
    }
  }))
  await repairDuplicateChapterTitles({
    project,
    blueprint,
    projectDirectory,
    runtimeDirectory,
    arcPlans,
  })
  const chapterCards = arcPlans.flatMap(arcPlan => arcPlan.chapters)
  if (chapterCards.length !== 100 || new Set(chapterCards.map(card => card.number)).size !== 100) {
    throw new Error(`invalid_project_outline:${project.id}`)
  }
  if (new Set(chapterCards.map(card => card.title.trim())).size !== 100) {
    throw new Error(`duplicate_project_chapter_titles:${project.id}`)
  }
  await writeJson(path.join(projectDirectory, 'chapter-plan.json'), {
    schemaVersion: 'chapter-plan.v1',
    projectId: project.id,
    chapterCount: chapterCards.length,
    chapters: chapterCards,
  })
  const statePath = path.join(projectDirectory, 'state', 'current.json')
  if (!await exists(statePath)) await writeJson(statePath, initialRollingState(project, blueprint))
  await updateManifest(projectDirectory, {
    projectId: project.id,
    category: project.category,
    title: project.title,
    preparation: 'complete',
    plannedChapterCount: 100,
    acceptedChapterCount: (await readJson(statePath)).acceptedChapterCount,
  })
  await updateWorkflowTrace(projectDirectory, {
    projectId: project.id,
    category: project.category,
    title: project.title,
    currentStage: 'chapter_generation_ready',
    completedStages: [
      'current_genre_research',
      'original_seed',
      'two_author_questions',
      'intent_lock',
      'story_blueprint',
      'ten_story_arcs',
      'one_hundred_chapter_cards',
    ],
    trendSources: seedSet.sources,
    seed: project.initialIdea,
    authorQuestions: [project.questionOne, project.questionTwo],
    lockedIntent: project.intent,
    plannedChapterCount: chapterCards.length,
    acceptedChapterCount: (await readJson(statePath)).acceptedChapterCount,
  })
  return { projectDirectory, blueprint, chapterCards }
}

async function updateManifest(projectDirectory, patch) {
  const manifestPath = path.join(projectDirectory, 'manifest.json')
  const current = await exists(manifestPath) ? await readJson(manifestPath) : {
    schemaVersion: 'longform-project-run.v1',
    createdAt: new Date().toISOString(),
    claimBoundary: 'simulated_author_validation_only',
    publicWriteAllowed: false,
  }
  await writeJson(manifestPath, { ...current, ...patch, updatedAt: new Date().toISOString() })
}

async function updateWorkflowTrace(projectDirectory, patch) {
  const tracePath = path.join(projectDirectory, 'workflow-trace.json')
  const current = await exists(tracePath) ? await readJson(tracePath) : {
    schemaVersion: 'longform-human-workflow-simulation.v1',
    actor: 'simulated_validation_author',
    claimBoundary: 'This trace simulates the product workflow and is not evidence of real user behavior.',
    publicWriteAllowed: false,
    createdAt: new Date().toISOString(),
  }
  await writeJson(tracePath, { ...current, ...patch, updatedAt: new Date().toISOString() })
}

function reviewNotes(deterministic, modelReview, invalidStateEvidence) {
  return [
    ...deterministic.findings.map(item => `${item.code}: ${item.diagnosis}`),
    ...modelReview.findings.filter(item => ['hard_block', 'revision_candidate'].includes(item.severity)).map(item => `${item.dimension}: ${item.diagnosis}`),
    ...invalidStateEvidence.map(item => `Q06: 状态差异缺少正文证据 ${item}`),
  ]
}

function stateEvidenceFindings(body, invalidStateEvidence) {
  if (!invalidStateEvidence.length) return []
  const startOffset = body.search(/\S/u)
  const quote = startOffset < 0 ? '' : body.slice(startOffset, startOffset + 36)
  if (!quote) return []
  return [{
    code: 'Q06',
    dimension: 'continuity',
    severity: 'hard_block',
    evidence: {
      quote,
      startOffset,
      endOffset: startOffset + quote.length,
      excerptHash: sha256(quote).slice(0, 16),
    },
    diagnosis: `状态差异缺少正文证据：${invalidStateEvidence.join(', ')}`,
    repairDirection: '删除无证据状态差异，或让状态变化在当前场景中实际发生。',
    readerImpact: '后续章节会建立在正文未发生的事实之上。',
  }]
}

function stateEvidenceExcerpts(stateProposal) {
  return Array.from(new Set([
    ...(stateProposal.entityChanges || []).map(change => change.evidenceQuote),
    ...(stateProposal.knowledgeChanges || []).map(change => change.evidenceQuote),
  ].filter(Boolean)))
}

async function evaluateCandidate({ project, blueprint, card, state, draft, projectDirectory, label }) {
  const deterministic = deterministicChapterReview({
    body: draft.body,
    card,
    policy: (await readJson(seedsPath)).generationPolicy,
    state,
  })
  const invalidStateEvidence = validateStateProposalEvidence(draft.body, draft.stateProposal)
  deterministic.findings.push(...stateEvidenceFindings(draft.body, invalidStateEvidence))
  const rawModelReview = await invokeCodexJson({
    prompt: reviewPrompt({ project, blueprint, card, state, draft }),
    schemaName: 'chapter-review.schema.json',
    logDirectory: path.join(projectDirectory, 'runtime'),
    label,
  })
  const modelReview = validateModelReview(draft.body, rawModelReview)
  const decision = reviewDecision(deterministic, modelReview)
  return { deterministic, modelReview, decision, invalidStateEvidence }
}

async function nextCandidateSequence(projectDirectory, chapterStem) {
  for (let sequence = 1; sequence < 10_000; sequence += 1) {
    const candidateBase = path.join(projectDirectory, 'candidates', `${chapterStem}-attempt-${sequence}`)
    const occupied = await Promise.all([
      exists(`${candidateBase}.json`),
      exists(`${candidateBase}-identity-rejected.json`),
      exists(path.join(projectDirectory, 'runtime', `chapter-${chapterStem}-candidate-${sequence}-model-1.json`)),
    ])
    if (occupied.every(value => !value)) return sequence
  }
  throw new Error(`candidate_sequence_exhausted:${chapterStem}`)
}

async function generateChapter({ project, blueprint, card, state, projectDirectory, policy, candidateAttempts }) {
  const chapterStem = String(card.number).padStart(3, '0')
  const priorGatePath = path.join(projectDirectory, 'author-gates', `${chapterStem}.json`)
  const priorGate = await exists(priorGatePath) ? await readJson(priorGatePath) : null
  let rejectionNotes = priorGate?.candidateStatus === 'rejected' ? priorGate.reasons : []
  const firstSequence = await nextCandidateSequence(projectDirectory, chapterStem)
  for (let attemptIndex = 0; attemptIndex < candidateAttempts; attemptIndex += 1) {
    const candidateSequence = firstSequence + attemptIndex
    const candidateLabel = `chapter-${chapterStem}-candidate-${candidateSequence}`
    let draft = await invokeCodexJson({
      prompt: chapterPrompt({ project, blueprint, card, state, rejectionNotes }),
      schemaName: 'chapter-draft.schema.json',
      logDirectory: path.join(projectDirectory, 'runtime'),
      label: candidateLabel,
    })
    if (draft.projectId !== project.id || draft.chapterNumber !== card.number || draft.title.trim() !== card.title.trim()) {
      rejectionNotes = ['候选的 projectId、chapterNumber 或 title 与本章卡不一致。']
      await writeJson(
        path.join(projectDirectory, 'candidates', `${chapterStem}-attempt-${candidateSequence}-identity-rejected.json`),
        { ...draft, rejectionNotes },
      )
      continue
    }
    const candidatePath = path.join(projectDirectory, 'candidates', `${chapterStem}-attempt-${candidateSequence}.json`)
    await writeJson(candidatePath, draft)
    let evaluation = await evaluateCandidate({
      project,
      blueprint,
      card,
      state,
      draft,
      projectDirectory,
      label: `chapter-${chapterStem}-review-${candidateSequence}`,
    })
    let finalReviewFileName = `${chapterStem}-attempt-${candidateSequence}.json`
    await writeJson(path.join(projectDirectory, 'reviews', finalReviewFileName), evaluation)

    if (evaluation.decision === 'revise') {
      const protectedExcerpts = Array.from(new Set([
        ...evaluation.modelReview.preserveExcerpts,
        ...stateEvidenceExcerpts(draft.stateProposal),
      ]))
      const materialFindings = [
        ...evaluation.deterministic.findings,
        ...evaluation.modelReview.findings.filter(item => item.severity === 'revision_candidate'),
      ].filter(item => item.code !== 'Q09')
      if (materialFindings.length) {
        const repair = await invokeCodexJson({
          prompt: repairPrompt({
            project,
            blueprint,
            card,
            body: draft.body,
            findings: materialFindings,
            preserveExcerpts: protectedExcerpts,
          }),
          schemaName: 'chapter-repair.schema.json',
          logDirectory: path.join(projectDirectory, 'runtime'),
          label: `chapter-${chapterStem}-repair-${candidateSequence}`,
        })
        const patched = applyEvidencePatches(draft.body, repair.patches, protectedExcerpts)
        await writeJson(path.join(projectDirectory, 'repairs', `${chapterStem}-attempt-${candidateSequence}.json`), { ...repair, ...patched })
        if (patched.applied.length) {
          draft = { ...draft, body: patched.body }
          await writeJson(path.join(projectDirectory, 'candidates', `${chapterStem}-attempt-${candidateSequence}-repaired.json`), draft)
          evaluation = await evaluateCandidate({
            project,
            blueprint,
            card,
            state,
            draft,
            projectDirectory,
            label: `chapter-${chapterStem}-review-${candidateSequence}-after-repair`,
          })
          finalReviewFileName = `${chapterStem}-attempt-${candidateSequence}-after-repair.json`
          await writeJson(path.join(projectDirectory, 'reviews', finalReviewFileName), evaluation)
        }
      }
    }

    if (evaluation.decision === 'pass') {
      const acceptedBody = draft.body.trim()
      const bodyHanCharacters = countHanCharacters(acceptedBody)
      if (bodyHanCharacters < policy.minimumHanCharacters || bodyHanCharacters > policy.maximumHanCharacters) {
        rejectionNotes = [`Q09: 正文汉字数 ${bodyHanCharacters} 不在 ${policy.minimumHanCharacters}-${policy.maximumHanCharacters}。`]
        continue
      }
      const acceptedAt = new Date().toISOString()
      const chapterPath = path.join(projectDirectory, 'chapters', `${chapterStem}.md`)
      await writeText(chapterPath, `# 第${card.number}章 ${draft.title}\n\n${acceptedBody}\n`)
      const gate = {
        schemaVersion: 'simulated-author-gate.v1',
        projectId: project.id,
        chapterNumber: card.number,
        candidateStatus: 'accepted_to_local_validation_canon',
        authorType: 'simulated_validation_author',
        authorConfirmed: true,
        publicWriteAllowed: false,
        confirmedAt: acceptedAt,
        reasons: [
          '正文长度位于冻结范围内。',
          '独立审阅没有剩余 hard_block 或 revision_candidate。',
          '所有状态差异均能定位到候选正文证据。',
        ],
        claimBoundary: 'This records a deterministic simulated-author gate, not real user adoption or professional editorial approval.',
      }
      await writeJson(path.join(projectDirectory, 'author-gates', `${chapterStem}.json`), gate)
      await writeJson(path.join(projectDirectory, 'chapters', `${chapterStem}.json`), {
        schemaVersion: 'accepted-validation-chapter.v1',
        projectId: project.id,
        chapterNumber: card.number,
        title: draft.title,
        hanCharacters: bodyHanCharacters,
        bodyChecksum: sha256(acceptedBody),
        candidateAttempt: candidateSequence,
        finalReviewArtifact: `reviews/${finalReviewFileName}`,
        sceneSummary: draft.sceneSummary,
        focalChoice: draft.focalChoice,
        irreversibleCost: draft.irreversibleCost,
        acceptedAt,
      })
      return { accepted: true, draft: { ...draft, body: acceptedBody }, evaluation, gate }
    }
    rejectionNotes = reviewNotes(evaluation.deterministic, evaluation.modelReview, evaluation.invalidStateEvidence)
  }

  const gate = {
    schemaVersion: 'simulated-author-gate.v1',
    projectId: project.id,
    chapterNumber: card.number,
    candidateStatus: 'rejected',
    authorType: 'simulated_validation_author',
    authorConfirmed: false,
    publicWriteAllowed: false,
    confirmedAt: null,
    reasons: rejectionNotes,
    claimBoundary: 'No candidate was promoted to local validation canon.',
  }
  await writeJson(path.join(projectDirectory, 'author-gates', `${chapterStem}.json`), gate)
  return { accepted: false, gate }
}

async function runProject({ project, args, seedSet }) {
  const prepared = await prepareProject({
    project,
    seedSet,
    outputRoot: args.outputRoot,
    force: false,
    arcWorkers: args.arcWorkers,
  })
  const { projectDirectory, blueprint, chapterCards } = prepared
  const statePath = path.join(projectDirectory, 'state', 'current.json')
  let state = normalizeRollingState(await readJson(statePath))
  await writeJson(statePath, state)
  if (args.from > state.acceptedChapterCount + 1) {
    throw new Error(`non_sequential_start:${project.id}:state_${state.acceptedChapterCount}:requested_${args.from}`)
  }
  for (const card of chapterCards.filter(item => item.number >= args.from && item.number <= args.to)) {
    const metadataPath = path.join(projectDirectory, 'chapters', `${String(card.number).padStart(3, '0')}.json`)
    if (!args.force && await exists(metadataPath)) {
      if (state.acceptedChapterCount < card.number) {
        const afterPath = path.join(projectDirectory, 'state', `after-${String(card.number).padStart(3, '0')}.json`)
        if (!await exists(afterPath)) throw new Error(`accepted_chapter_without_state:${project.id}:${card.number}`)
        state = await readJson(afterPath)
        await writeJson(statePath, state)
      }
      continue
    }
    if (state.acceptedChapterCount !== card.number - 1) {
      throw new Error(`state_sequence_conflict:${project.id}:${card.number}:state_${state.acceptedChapterCount}`)
    }
    const result = await generateChapter({
      project,
      blueprint,
      card,
      state,
      projectDirectory,
      policy: seedSet.generationPolicy,
      candidateAttempts: args.candidateAttempts,
    })
    if (!result.accepted) {
      await updateManifest(projectDirectory, {
        status: 'blocked_on_rejected_candidate',
        blockedChapter: card.number,
        acceptedChapterCount: state.acceptedChapterCount,
      })
      await updateWorkflowTrace(projectDirectory, {
        currentStage: 'blocked_on_rejected_candidate',
        blockedChapter: card.number,
        acceptedChapterCount: state.acceptedChapterCount,
      })
      throw new Error(`chapter_rejected:${project.id}:${card.number}`)
    }
    state = commitAcceptedChapter(state, result.draft)
    await writeJson(path.join(projectDirectory, 'state', `after-${String(card.number).padStart(3, '0')}.json`), state)
    await writeJson(statePath, state)
    await updateManifest(projectDirectory, {
      status: state.acceptedChapterCount === 100 ? 'complete' : 'in_progress',
      acceptedChapterCount: state.acceptedChapterCount,
      lastAcceptedChapter: card.number,
    })
    await updateWorkflowTrace(projectDirectory, {
      currentStage: state.acceptedChapterCount === 100 ? 'local_validation_complete' : 'chapter_generation_in_progress',
      acceptedChapterCount: state.acceptedChapterCount,
      lastAcceptedChapter: card.number,
      lastAcceptedCandidateStatus: 'accepted_to_local_validation_canon',
    })
    process.stdout.write(`[${project.id}] accepted chapter ${card.number}/100 (${countHanCharacters(result.draft.body)} Han characters)\n`)
  }
  return { projectId: project.id, acceptedChapterCount: state.acceptedChapterCount }
}

async function runPool(items, workers, task) {
  const queue = [...items]
  const results = []
  const failures = []
  await Promise.all(Array.from({ length: Math.min(workers, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      try {
        results.push(await task(item))
      } catch (error) {
        failures.push({ item: item.id, error: error.stack || error.message })
      }
    }
  }))
  if (failures.length) {
    const error = new Error(`longform_pool_failed:${failures.map(item => `${item.item}:${item.error.split('\n')[0]}`).join('|')}`)
    error.failures = failures
    throw error
  }
  return results
}

async function inspectAcceptedArtifacts(projectDirectory, targetChapterCount) {
  const verified = []
  const invalid = []
  const chapterPlanPath = path.join(projectDirectory, 'chapter-plan.json')
  const chapterPlan = await exists(chapterPlanPath)
    ? await readJson(chapterPlanPath)
    : { chapters: [] }
  const plannedByNumber = new Map(chapterPlan.chapters.map(chapter => [chapter.number, chapter]))
  for (let number = 1; number <= targetChapterCount; number += 1) {
    const stem = String(number).padStart(3, '0')
    const paths = {
      markdown: path.join(projectDirectory, 'chapters', `${stem}.md`),
      metadata: path.join(projectDirectory, 'chapters', `${stem}.json`),
      gate: path.join(projectDirectory, 'author-gates', `${stem}.json`),
      state: path.join(projectDirectory, 'state', `after-${stem}.json`),
    }
    const present = await Promise.all(Object.values(paths).map(exists))
    if (present.every(value => !value)) continue
    if (present.some(value => !value)) {
      invalid.push({ chapterNumber: number, reason: 'incomplete_acceptance_artifacts' })
      continue
    }
    try {
      const [markdown, metadata, gate, state] = await Promise.all([
        readFile(paths.markdown, 'utf8'),
        readJson(paths.metadata),
        readJson(paths.gate),
        readJson(paths.state),
      ])
      const bodySeparator = markdown.indexOf('\n\n')
      const body = bodySeparator < 0 ? '' : markdown.slice(bodySeparator + 2).trim()
      const plannedChapter = plannedByNumber.get(number)
      const defaultReviewFile = `${stem}-attempt-${metadata.candidateAttempt}.json`
      const repairedReviewFile = `${stem}-attempt-${metadata.candidateAttempt}-after-repair.json`
      const reviewPath = metadata.finalReviewArtifact
        ? path.join(projectDirectory, metadata.finalReviewArtifact)
        : await exists(path.join(projectDirectory, 'reviews', repairedReviewFile))
          ? path.join(projectDirectory, 'reviews', repairedReviewFile)
          : path.join(projectDirectory, 'reviews', defaultReviewFile)
      const review = await readJson(reviewPath)
      const unresolvedReviewFindings = [
        ...(review.deterministic?.findings || []),
        ...(review.modelReview?.findings || []),
      ].filter(finding => ['hard_block', 'revision_candidate'].includes(finding.severity))
      const checks = [
        metadata.chapterNumber === number,
        metadata.title === plannedChapter?.title,
        markdown.startsWith(`# 第${number}章 ${metadata.title}\n\n`),
        metadata.bodyChecksum === sha256(body),
        metadata.hanCharacters === countHanCharacters(body),
        gate.chapterNumber === number,
        gate.candidateStatus === 'accepted_to_local_validation_canon',
        gate.authorConfirmed === true,
        gate.publicWriteAllowed === false,
        state.acceptedChapterCount === number,
        review.decision === 'pass',
        unresolvedReviewFindings.length === 0,
        (review.invalidStateEvidence || []).length === 0,
      ]
      if (checks.some(value => !value)) {
        invalid.push({ chapterNumber: number, reason: 'acceptance_evidence_mismatch' })
        continue
      }
      verified.push({ chapterNumber: number, hanCharacters: metadata.hanCharacters })
    } catch (error) {
      invalid.push({ chapterNumber: number, reason: `artifact_parse_error:${error.message}` })
    }
  }
  const contiguous = verified.every((chapter, index) => chapter.chapterNumber === index + 1)
  const characterCounts = verified.map(chapter => chapter.hanCharacters)
  const [candidateFiles, repairFiles, reviewFiles] = await Promise.all([
    listFiles(path.join(projectDirectory, 'candidates')),
    listFiles(path.join(projectDirectory, 'repairs')),
    listFiles(path.join(projectDirectory, 'reviews')),
  ])
  let repairPassesApplied = 0
  for (const file of repairFiles.filter(file => file.endsWith('.json'))) {
    try {
      const repair = await readJson(path.join(projectDirectory, 'repairs', file))
      if ((repair.applied || []).length) repairPassesApplied += 1
    } catch {
      // Invalid repair evidence is surfaced by the accepted artifact checks when relevant.
    }
  }
  return {
    verifiedAcceptedChapterCount: contiguous ? verified.length : 0,
    averageHanCharacters: characterCounts.length
      ? Math.round(characterCounts.reduce((sum, value) => sum + value, 0) / characterCounts.length)
      : 0,
    minimumHanCharacters: characterCounts.length ? Math.min(...characterCounts) : 0,
    maximumHanCharacters: characterCounts.length ? Math.max(...characterCounts) : 0,
    acceptanceEvidenceValid: contiguous && invalid.length === 0,
    invalidArtifacts: invalid,
    candidateAttemptsRecorded: candidateFiles.filter(file => /^\d{3}-attempt-\d+\.json$/.test(file)).length,
    identityRejectedCandidates: candidateFiles.filter(file => file.endsWith('-identity-rejected.json')).length,
    repairPassesApplied,
    reviewArtifactsRecorded: reviewFiles.filter(file => file.endsWith('.json')).length,
  }
}

async function report(seedSet, projects, outputRoot) {
  const rows = []
  for (const project of projects) {
    const projectDirectory = path.join(outputRoot, 'projects', project.id)
    const manifestPath = path.join(projectDirectory, 'manifest.json')
    const manifest = await exists(manifestPath) ? await readJson(manifestPath) : null
    const chapterPlanPath = path.join(projectDirectory, 'chapter-plan.json')
    const chapterPlan = await exists(chapterPlanPath) ? await readJson(chapterPlanPath) : null
    const artifacts = await inspectAcceptedArtifacts(
      projectDirectory,
      seedSet.generationPolicy.chapterCountPerProject,
    )
    rows.push({
      projectId: project.id,
      category: project.category,
      title: project.title,
      prepared: manifest?.preparation === 'complete'
        && chapterPlan?.chapterCount === seedSet.generationPolicy.chapterCountPerProject
        && new Set((chapterPlan?.chapters || []).map(chapter => chapter.number)).size === seedSet.generationPolicy.chapterCountPerProject,
      acceptedChapterCount: artifacts.verifiedAcceptedChapterCount,
      manifestAcceptedChapterCount: manifest?.acceptedChapterCount || 0,
      averageHanCharacters: artifacts.averageHanCharacters,
      minimumHanCharacters: artifacts.minimumHanCharacters,
      maximumHanCharacters: artifacts.maximumHanCharacters,
      acceptanceEvidenceValid: artifacts.acceptanceEvidenceValid,
      invalidArtifacts: artifacts.invalidArtifacts,
      candidateAttemptsRecorded: artifacts.candidateAttemptsRecorded,
      identityRejectedCandidates: artifacts.identityRejectedCandidates,
      repairPassesApplied: artifacts.repairPassesApplied,
      reviewArtifactsRecorded: artifacts.reviewArtifactsRecorded,
      status: manifest?.status || 'not_started',
    })
  }
  const payload = {
    schemaVersion: 'longform-quality-report.v1',
    generatedAt: new Date().toISOString(),
    targetPerProject: seedSet.generationPolicy.chapterCountPerProject,
    targetHanCharacters: seedSet.generationPolicy.targetHanCharacters,
    projects: rows,
    totalAcceptedChapters: rows.reduce((sum, item) => sum + item.acceptedChapterCount, 0),
    allTargetsMet: rows.every(item => item.prepared
      && item.acceptanceEvidenceValid
      && item.acceptedChapterCount === seedSet.generationPolicy.chapterCountPerProject),
    claimBoundary: 'Counts only accepted local validation chapters. This is not production publication or real-user adoption.',
  }
  await writeJson(path.join(outputRoot, 'report.json'), payload)
  console.log(JSON.stringify(payload, null, 2))
  return payload
}

async function assertCrossProjectCharacterIndependence(projects, outputRoot) {
  if (projects.length < 2) return
  const owners = new Map()
  const conflicts = []
  for (const project of projects) {
    const blueprintPath = path.join(outputRoot, 'projects', project.id, 'story-blueprint.json')
    if (!await exists(blueprintPath)) continue
    const blueprint = await readJson(blueprintPath)
    for (const character of blueprint.characters || []) {
      const previousOwner = owners.get(character.name)
      if (previousOwner && previousOwner !== project.id) {
        conflicts.push(`${character.name}:${previousOwner}:${project.id}`)
      } else {
        owners.set(character.name, project.id)
      }
    }
  }
  if (conflicts.length) throw new Error(`cross_project_character_reuse:${conflicts.join(',')}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const seedSet = await readJson(seedsPath)
  const selected = args.project === 'all'
    ? seedSet.projects
    : seedSet.projects.filter(project => project.id === args.project)
  if (!selected.length) throw new Error(`unknown_project:${args.project}`)
  await mkdir(args.outputRoot, { recursive: true })

  if (args.command === 'prepare') {
    await runPool(selected, args.workers, project => prepareProject({
      project,
      seedSet,
      outputRoot: args.outputRoot,
      force: args.force,
      arcWorkers: args.arcWorkers,
    }))
  } else if (args.command === 'run') {
    await runPool(selected, args.workers, project => runProject({ project, args, seedSet }))
  }
  await assertCrossProjectCharacterIndependence(selected, args.outputRoot)
  await report(seedSet, selected, args.outputRoot)
}

main().catch(error => {
  console.error(error.stack || error.message)
  if (error.failures) console.error(JSON.stringify(error.failures, null, 2))
  process.exitCode = 1
})
