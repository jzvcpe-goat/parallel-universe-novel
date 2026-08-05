#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { basename, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { readR1A0RepositoryIdentity } from './lib/r1-a0-repository-identity.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const artifactDir = join(root, 'artifacts', 'qa', 'creator-decision-workbench')
const evidencePath = join(artifactDir, 'creator-decision-workbench.json')
const screenshotPath = join(artifactDir, 'creator-decision-workbench.png')
const children = []
const logs = []

function repositoryIdentity() {
  return readR1A0RepositoryIdentity({
    root,
    expectedHeadSha: process.env.PR_HEAD_SHA,
    branch: process.env.GITHUB_HEAD_REF,
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function record(prefix, chunk) {
  const value = chunk.toString()
  logs.push(`${prefix} ${value}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${value}`)
}

function run(command, args, env = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => record(`[${command}]`, chunk))
    child.stderr.on('data', chunk => record(`[${command}:err]`, chunk))
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => record('[preview]', chunk))
  child.stderr.on('data', chunk => record('[preview:err]', chunk))
  children.push(child)
}

function shutdown() {
  for (const child of children) {
    if (child.killed) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolvePort(port))
    })
  })
}

async function waitForUrl(url, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  const module = await import(modulePath)
  return module.default || module
}

async function cleanOrigin(page, baseUrl) {
  const seedUrl = `${baseUrl}/__creator_decision_seed__`
  await page.route(seedUrl, route => route.fulfill({
    body: '<!doctype html><html><body>seed</body></html>',
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(seedUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    window.localStorage.clear()
    await new Promise((resolveDelete, reject) => {
      const request = window.indexedDB.deleteDatabase('puf_creator_workspace')
      request.onsuccess = () => resolveDelete()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('creator workspace database deletion was blocked'))
    })
    if (!navigator.storage?.getDirectory) return
    const directory = await navigator.storage.getDirectory()
    try {
      await directory.removeEntry('puf-creator', { recursive: true })
    } catch {
      // A clean origin may not have an OPFS directory yet.
    }
  })
  await page.unroute(seedUrl)
}

async function readDecisionState(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolveOpen, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolveOpen(request.result)
      request.onerror = () => reject(request.error)
    })
    const readAll = storeName => new Promise((resolveRead, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolveRead(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const [
        sessions,
        intents,
        contexts,
        candidates,
        drafts,
        reviews,
        repairs,
        patches,
        canons,
        events,
        publishBundles,
        publishReceipts,
        agentOperations,
      ] = await Promise.all([
        readAll('creationSessions'),
        readAll('authorIntents'),
        readAll('contextSnapshots'),
        readAll('narrativeCandidates'),
        readAll('sceneDrafts'),
        readAll('literaryReviews'),
        readAll('repairProposals'),
        readAll('canonPatches'),
        readAll('localCanonStates'),
        readAll('creationDecisionEvents'),
        readAll('publishBundles'),
        readAll('publishReceipts'),
        readAll('agentOperationLog'),
      ])
      const latestContext = contexts.at(-1) || null
      const latestReview = reviews.at(-1) || null
      return {
        databaseVersion: db.version,
        session: sessions[0] || null,
        canon: canons[0] || null,
        latestContext,
        counts: {
          sessions: sessions.length,
          intents: intents.length,
          contexts: contexts.length,
          candidates: candidates.length,
          drafts: drafts.length,
          reviews: reviews.length,
          repairs: repairs.length,
          patches: patches.length,
          canons: canons.length,
          events: events.length,
          publishBundles: publishBundles.length,
          publishReceipts: publishReceipts.length,
        },
        candidateTitles: candidates.map(candidate => candidate.title),
        contextRecallSourceIds: latestContext?.manualRecallItems?.map(item => item.sourceId) || [],
        patchStatuses: patches.map(patch => patch.status),
        eventTypes: events.map(event => event.type),
        reviewEvidenceCount: reviews.reduce((total, review) => (
          total + (review.findings || []).reduce((count, finding) => count + (finding.evidence || []).length, 0)
        ), 0),
        manualRecallAdherence: latestReview?.manualRecallAdherence || null,
        reviewFindings: reviews.flatMap(review => (review.findings || []).map(finding => ({
          dimension: finding.dimension,
          evidenceCount: finding.evidence?.length || 0,
          severity: finding.severity,
          status: finding.status,
        }))),
        repairs: repairs.map(repair => ({
          findingId: repair.findingId,
          operation: repair.operation,
          status: repair.status,
          verificationDecision: repair.verification?.decision || null,
          verificationIssues: repair.verification?.issues || [],
        })),
        publishBundleStatuses: publishBundles.map(bundle => bundle.status),
        agentOperationActions: agentOperations.map(operation => ({
          actionName: operation.actionName,
          status: operation.status,
        })),
      }
    } finally {
      db.close()
    }
  })
}

let browser = null

try {
  mkdirSync(artifactDir, { recursive: true })
  const playwright = await loadPlaywright()
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  await run('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_ROUTER_MODE: 'hash',
  })
  start('npm', [
    '--prefix',
    'app',
    'run',
    'preview',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--outDir',
    'dist-creator-qa',
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('console', message => logs.push(`[page:${message.type()}] ${message.text()}`))
  page.on('pageerror', error => logs.push(`[page:error] ${error.message}`))

  await cleanOrigin(page, baseUrl)
  const route = '/creator/editor?qa=creator-decision&request=request-fog-if-1'
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'domcontentloaded' })
  const workspace = page.locator('[data-slot="creator-conversation-workspace"]')
  await workspace.waitFor({ timeout: 15000 })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })

  const recallItems = page.locator('[data-slot="creator-recall-item"]')
  await recallItems.first().waitFor({ timeout: 15000 })
  const selectedRecall = recallItems.first()
  const selectedRecallId = await selectedRecall.getAttribute('data-recall-id')
  const selectedRecallSourceId = await selectedRecall.getAttribute('data-recall-source-id')
  assert(Boolean(selectedRecallId && selectedRecallSourceId), 'manual recall must expose stable record and source IDs')
  const recallCheckbox = selectedRecall.getByRole('checkbox')
  if (await recallCheckbox.getAttribute('data-state') === 'checked') {
    await recallCheckbox.click()
    await page.waitForFunction(id => (
      document.querySelector(`[data-recall-id="${id}"] [role="checkbox"]`)?.getAttribute('data-state') === 'unchecked'
    ), selectedRecallId)
  }
  await recallCheckbox.click()
  await page.waitForFunction(id => (
    document.querySelector(`[data-recall-id="${id}"] [role="checkbox"]`)?.getAttribute('data-state') === 'checked'
  ), selectedRecallId)

  const composer = page.locator('[data-slot="creator-conversation-input"]')
  const storySeed = '沈星澜没有公开灯码，幸存者开始绕过灯塔去找旧码头。'
  await composer.fill(storySeed)
  await composer.press('Enter')
  let questionCount = 0
  const intentLock = page.getByRole('button', { name: /锁定本章意图/ })
  while (questionCount < 2 && await intentLock.count() === 0) {
    const question = page.locator('[data-slot="creator-conversation-turn"]')
      .filter({ hasText: '这轮只确认一件事' })
      .last()
    await question.waitFor({ timeout: 10000 })
    const preferredAnswer = questionCount === 0
      ? question.getByRole('button', { name: /克制地确认关系已经改变/ })
      : question.getByRole('button', { name: /主角先行动，对方暂不知情/ })
    await (await preferredAnswer.count() ? preferredAnswer : question.getByRole('button').first()).click()
    questionCount += 1
    await page.waitForTimeout(150)
  }
  assert(questionCount <= 2, `intent discovery exceeded two blocking questions: ${questionCount}`)
  await intentLock.waitFor({ timeout: 10000 })
  await intentLock.click()
  await page.getByText('本章意图已锁定', { exact: true }).first().waitFor({ timeout: 10000 })

  await page.getByRole('button', { name: '比较不同方向' }).click()
  const candidateButtons = page.locator('[data-slot="creator-conversation-candidate"]')
  await candidateButtons.first().waitFor({ timeout: 15000 })
  const candidateCount = await candidateButtons.count()
  assert(candidateCount > 0 && candidateCount <= 3, `candidate search must expose one to three distinct paths, got ${candidateCount}`)
  const candidateTitles = await candidateButtons.evaluateAll(buttons => buttons.map(button => (
    button.querySelector('strong')?.textContent?.trim() || ''
  )))
  assert(new Set(candidateTitles).size === candidateTitles.length, `candidate paths must be distinct: ${candidateTitles.join(', ')}`)
  assert(
    await selectedRecall.getAttribute('data-recall-in-context') === 'true',
    'the author-selected recall must enter the Context Snapshot used for candidate search',
  )
  await candidateButtons.first().click()

  await page.getByRole('button', { name: '写当前场景候选' }).click()
  const preview = page.locator('[data-slot="creator-conversation-preview"]')
  await preview.waitFor({ timeout: 15000 })
  assert(
    await page.locator('[data-slot="creator-conversation-active-draft"]').count() === 0,
    'scene generation must remain candidate-only before author adoption',
  )
  await page.getByRole('button', { name: '采用为草稿' }).click()
  const activeDraft = page.locator('[data-slot="creator-conversation-active-draft"]')
  await activeDraft.waitFor({ timeout: 10000 })
  await activeDraft.getByRole('button', { name: '编辑正文' }).click()
  const manuscript = page.getByRole('textbox', { name: '正文手工编辑' })
  await manuscript.waitFor({ timeout: 5000 })
  const adoptedText = await manuscript.inputValue()
  assert(adoptedText.length > 80, 'adopted scene must contain a substantive local draft')
  const authorEditedText = `${adoptedText}\n\n本章将展示守灯人如何在下一幕查清灯塔玻璃上的名字。`
  await manuscript.fill(authorEditedText)
  await page.getByRole('button', { name: '保存修改' }).click()
  await page.getByText('作者修改已保存，旧审阅和正史差异已失效。', { exact: true }).first().waitFor({ timeout: 10000 })

  await page.getByRole('button', { name: /运行本机规则检查|检查连续性与文学问题/ }).click()
  const reviewSurface = page.locator('[data-slot="creator-conversation-review"]')
  await reviewSurface.waitFor({ timeout: 10000 })
  const reviewState = await readDecisionState(page)
  assert(
    reviewState.reviewFindings.some(finding => (
      ['hard_block', 'revision_candidate'].includes(finding.severity)
      && finding.status === 'active'
      && finding.evidenceCount > 0
    )),
    `expected a locatable revision finding, got ${JSON.stringify({
      reviewText: await reviewSurface.innerText(),
      findings: reviewState.reviewFindings,
    })}`,
  )
  const metaNarrationFinding = page.getByText('元叙事说明进入了候选正文。', { exact: true })
  await metaNarrationFinding.waitFor({ timeout: 10000 })
  await metaNarrationFinding.locator('..').getByRole('button', { name: '看局部修改方向', exact: true }).click()
  const inlineDiff = page.locator('[data-slot="creator-writing-assist-inline-diff"]')
  await page.waitForTimeout(500)
  assert(
    await inlineDiff.count() > 0,
    `local repair candidate was not exposed: ${JSON.stringify({
      notices: await page.getByRole('status').allInnerTexts(),
      state: await readDecisionState(page),
    })}`,
  )
  await page.getByRole('button', { name: '采用这一处修改', exact: true }).click()
  await page.getByText('局部修改已由作者采用，请重新审阅。', { exact: true }).first().waitFor({ timeout: 10000 })
  await activeDraft.getByRole('button', { name: '编辑正文' }).click()
  await manuscript.waitFor({ timeout: 5000 })
  const repairedText = await manuscript.inputValue()
  assert(!repairedText.includes('本章将'), 'local repair must remove the located meta-narration phrase')
  assert(repairedText.startsWith(adoptedText), 'local repair must preserve protected manuscript paragraphs')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: /运行本机规则检查|检查连续性与文学问题/ }).click()
  await page.getByText('本机规则检查完成；未连接独立审阅时只报告确定性问题。', { exact: true }).waitFor({ timeout: 10000 })
  const dismissibleFindings = page.getByRole('button', { name: '本轮忽略', exact: true })
  while (await dismissibleFindings.count() > 0) {
    await dismissibleFindings.first().click()
    await page.waitForTimeout(100)
  }

  await page.getByRole('button', { name: '准备正史差异' }).click()
  await page.getByText('正史差异待确认', { exact: true }).first().waitFor({ timeout: 10000 })

  await activeDraft.getByRole('button', { name: '编辑正文' }).click()
  await manuscript.waitFor({ timeout: 5000 })
  const preCommitAuthorEdit = `${await manuscript.inputValue()}\n\n守灯人把最后一笔潮汐刻度留给下一次核验。`
  await manuscript.fill(preCommitAuthorEdit)
  const saveBeforeCommit = page.getByRole('button', { name: '保存修改', exact: true })
  const openCommitDialog = page.getByRole('button', { name: '确认写入本机主宇宙', exact: true })
  await Promise.allSettled([
    saveBeforeCommit.click(),
    openCommitDialog.click({ force: true }),
  ])
  const staleCommitDialog = page.getByRole('alertdialog')
  if (await staleCommitDialog.count()) {
    await staleCommitDialog.getByRole('button', { name: '确认写入', exact: true }).click({ force: true })
  }
  let afterRacedSave = await readDecisionState(page)
  for (let attempt = 0; attempt < 100 && afterRacedSave.session?.phase !== 'drafting'; attempt += 1) {
    await page.waitForTimeout(100)
    afterRacedSave = await readDecisionState(page)
  }
  assert(
    afterRacedSave.session?.phase === 'drafting',
    `saving an author edit must invalidate an already-open Canon patch, got ${afterRacedSave.session?.phase}`,
  )
  assert(
    afterRacedSave.canon === null,
    'an old Canon patch must not commit while a newer author edit is being saved',
  )
  assert(
    afterRacedSave.session?.proposedCanonPatchId === null,
    'the saved author edit must invalidate the old Canon patch before another confirmation',
  )

  await page.getByRole('button', { name: /运行本机规则检查|检查连续性与文学问题/ }).click()
  await page.getByText('本机规则检查完成；未连接独立审阅时只报告确定性问题。', { exact: true }).waitFor({ timeout: 10000 })
  const postRaceDismissibleFindings = page.getByRole('button', { name: '本轮忽略', exact: true })
  while (await postRaceDismissibleFindings.count() > 0) {
    await postRaceDismissibleFindings.first().click()
    await page.waitForTimeout(100)
  }
  await page.getByRole('button', { name: '准备正史差异' }).click()
  await page.getByText('正史差异待确认', { exact: true }).first().waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: '确认写入本机主宇宙', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.waitFor({ timeout: 5000 })
  await dialog.getByRole('button', { name: '确认写入', exact: true }).click()
  await page.getByText('正文及状态变更已由作者确认并写入本机主宇宙。', { exact: true }).waitFor({ timeout: 10000 })

  const beforeReload = await readDecisionState(page)
  assert(beforeReload.databaseVersion >= 10, `decision workbench requires local DB v10+, got ${beforeReload.databaseVersion}`)
  assert(beforeReload.session?.phase === 'canon_committed', `expected canon_committed, got ${beforeReload.session?.phase}`)
  assert(beforeReload.session?.proposedCanonPatchId === null, 'committed session must not retain an actionable patch ID')
  assert(beforeReload.canon?.revision === 1, `expected local canon revision 1, got ${beforeReload.canon?.revision}`)
  assert(
    Object.keys(beforeReload.canon?.state?.characters || {}).length > 0,
    'the author-confirmed Canon patch must persist manuscript-grounded character state',
  )
  assert(
    Object.keys(beforeReload.canon?.state?.world?.informationBoundaries || {}).length > 0,
    'the author-confirmed Canon patch must persist the manuscript-grounded setting boundary',
  )
  assert(
    Object.keys(beforeReload.canon?.state?.promises || {}).length > 0,
    'the author-confirmed Canon patch must persist the selected long-range promise state',
  )
  assert(beforeReload.patchStatuses.includes('committed'), 'the canon patch must be committed atomically')
  assert(beforeReload.eventTypes.includes('canon_patch_confirmed'), 'the author confirmation event must be durable')
  assert(beforeReload.eventTypes.includes('canon_patch_committed'), 'the canon commit event must be durable')
  assert(
    beforeReload.contextRecallSourceIds.includes(selectedRecallSourceId),
    'the committed workflow must retain the author-selected recall in its durable Context Snapshot',
  )
  assert(beforeReload.reviewEvidenceCount > 0, 'independent literary review must retain locatable manuscript evidence')
  assert(
    beforeReload.manualRecallAdherence?.decision === 'pass'
      && beforeReload.manualRecallAdherence.checks.every(check => (
        ['fulfilled', 'respected'].includes(check.status) && check.evidence.length > 0
      )),
    'the final review must prove every selected recall with locatable manuscript evidence',
  )

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })
  assert(
    await page.getByRole('button', { name: '确认写入本机主宇宙', exact: true }).count() === 0,
    'a restored committed session must not expose a second canon confirmation action',
  )
  const afterReload = await readDecisionState(page)
  assert(afterReload.counts.canons === 1, `refresh must not duplicate canon records: ${JSON.stringify(afterReload.counts)}`)
  assert(afterReload.canon?.revision === 1, 'refresh must not perform a second canon commit')

  const saveDraft = page.locator('[data-agent-action="save_local_draft"]:visible').first()
  await saveDraft.click()
  await page.getByRole('button', { name: '更多创作操作' }).click()
  await Promise.all([
    page.waitForURL(/#\/creator\/bundles\?/, { timeout: 15000 }),
    page.locator('[data-agent-action="enter_publish_check"]:visible').click(),
  ])
  await page.locator('[data-agent-action="prepare_publish_bundle"]').click()
  await page.getByText('发布包已准备，尚未公开。', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="review_publish_bundle"]').click()
  await page.getByText('已审阅', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="confirm_publish_bundle"]').click()
  const publishDialog = page.getByRole('alertdialog')
  await publishDialog.waitFor({ timeout: 5000 })
  await publishDialog.getByRole('button', { name: '确认内容与去向', exact: true }).click()
  await page.getByText('作者已确认', { exact: true }).waitFor({ timeout: 15000 })

  const finalState = await readDecisionState(page)
  assert(
    finalState.publishBundleStatuses.includes('author_confirmed'),
    `R1-A0 must finish with an author-confirmed publish bundle: ${JSON.stringify(finalState.publishBundleStatuses)}`,
  )
  assert(finalState.counts.publishReceipts === 0, 'R1-A0 must not publish publicly or create a public receipt')
  assert(
    !finalState.agentOperationActions.some(operation => (
      operation.actionName === 'submit_publish_bundle'
      && ['started', 'succeeded'].includes(operation.status)
    )),
    'R1-A0 must not execute the public submit action',
  )

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('作者已确认', { exact: true }).waitFor({ timeout: 15000 })
  const restoredFinalState = await readDecisionState(page)
  assert(
    restoredFinalState.publishBundleStatuses.filter(status => status === 'author_confirmed').length === 1,
    'refresh must restore exactly one author-confirmed publish bundle',
  )
  assert(restoredFinalState.counts.publishReceipts === 0, 'refresh must not create a publish receipt')

  await page.screenshot({ path: screenshotPath, fullPage: true })
  const screenshotSha256 = createHash('sha256')
    .update(readFileSync(screenshotPath))
    .digest('hex')
  const evidence = {
    status: 'pass',
    gate: 'R1_A0_WRITING_WORKFLOW_INTEGRATION',
    repository: repositoryIdentity(),
    route,
    questionCount,
    selectedRecallId,
    selectedRecallSourceId,
    candidateCount,
    candidateTitles,
    adoptedLength: adoptedText.length,
    authorEditedLength: authorEditedText.length,
    repairedLength: repairedText.length,
    beforeReload,
    afterReload,
    finalState,
    restoredFinalState,
    publicSubmitExecuted: false,
    screenshot: {
      file: basename(screenshotPath),
      sha256: screenshotSha256,
      sourceCategory: 'synthetic-r1-a0-workflow',
      approval: 'approved-sanitized-synthetic-fixture',
    },
  }
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log('[browser-creator-decision-workbench] PASS')
  console.log(JSON.stringify({ evidencePath, screenshotPath }, null, 2))
} catch (error) {
  mkdirSync(artifactDir, { recursive: true })
  writeFileSync(evidencePath, `${JSON.stringify({
    status: 'fail',
    error: error instanceof Error ? error.message : String(error),
    logs: logs.slice(-120),
  }, null, 2)}\n`)
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
}
