#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa', 'local-creator-authenticated')
const editorRecallReceiptPath = join(root, 'validation', 'creator-writing', 'creator-editor-manual-recall-context-2026-07-18.json')
const qaBuildDir = join(root, 'app', 'dist-creator-qa')
const children = []
const logs = []

const routes = [
  { path: '/creator', title: '今日创作路径', mustContain: ['今天最值得推进的 3 件事', '最值得回应的一问', '今日写作判断', '今日判断依据', '今日写作路线', '作品准备状态', '准备概览', '最近作品', '当前创作上下文', '今日创作路径', '正在写的一条', '需要确认发布'] },
  { path: '/creator/requests', title: '外界回声', mustContain: ['保存视图', '全部回声', '今天先写', '创作提醒', '读者回声', '本机判断', '回声来源', '提醒状态'] },
  {
    path: '/creator/editor',
    title: '写作台',
    mustContain: ['本章召回', '手动选择', '每轮只确认一件事', '正文不会自动写入'],
  },
  { path: '/creator/works', title: '本机写作智库', mustContain: ['作者公告', '主线', 'IF 支线'] },
  { path: '/creator/publish', title: '发布包', mustContain: ['私密草稿', '读者端展示位置', '发布前最后一问', '作者一问'] },
  { path: '/creator/settings', title: '本机工作区', mustContain: ['本机保存', '导出备份', '备份恢复', '助手权限', '操作记录', '本机记录', '当前状态', '显示偏好', '重置显示偏好'] },
]

const requestedRoute = process.env.CREATOR_QA_ROUTE?.trim()
const routesToCheck = requestedRoute
  ? routes.filter(route => route.path === requestedRoute)
  : routes

if (requestedRoute && routesToCheck.length === 0) {
  throw new Error(`Unknown CREATOR_QA_ROUTE: ${requestedRoute}`)
}

const requiredNav = ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']
const blockedTerms = [
  'Supabase',
  'RLS',
  'trace',
  'provider',
  'fallback',
  'API key',
  '后端',
  '接口',
  '同步',
  '回写',
  '数据库',
  'AI',
  '模型',
  'LLM',
  'localhost',
  '私有初稿',
  '发布边界',
  '敏感凭据',
  '访问凭证',
  '本地创作服务',
  '自带创作服务',
  '创作服务入口',
  '凭据状态',
  '检查服务',
  '预览版',
]
const readerResidueTerms = ['行星', '星云', '粒子', '宇宙书城', '概念图', '世界在你脚下']

function logLine(prefix, chunk) {
  const text = chunk.toString()
  logs.push(`${prefix} ${text}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${text}`)
}

function run(command, args, env = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => logLine(`[${command}]`, chunk))
    child.stderr.on('data', chunk => logLine(`[${command}:err]`, chunk))
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => logLine(`[${name}]`, chunk))
  child.stderr.on('data', chunk => logLine(`[${name}:err]`, chunk))
  children.push(child)
  return child
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
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      lastError = `http_${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(350)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  try {
    const mod = await import(modulePath)
    return mod.default || mod
  } catch (error) {
    throw new Error(`Playwright is required for authenticated Local Creator route QA: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNoForbiddenText(text, routePath) {
  for (const term of [...blockedTerms, ...readerResidueTerms]) {
    assert(!text.includes(term), `${routePath} leaks forbidden visible text: ${term}`)
  }
}

async function waitForRecallSelectionPersistence(page, recallId, expectedSelected) {
  await page.waitForFunction(({ expected, id }) => new Promise(resolve => {
    const request = indexedDB.open('puf_creator_workspace', 10)
    request.onerror = () => resolve(false)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('meta', 'readonly')
      const recordRequest = transaction.objectStore('meta').get('manual-recall-selections')
      recordRequest.onerror = () => {
        db.close()
        resolve(false)
      }
      recordRequest.onsuccess = () => {
        const scopes = recordRequest.result?.value?.scopes || {}
        const values = Object.values(scopes)
        const selected = values.some(scope => Array.isArray(scope?.ids) && scope.ids.includes(id))
        db.close()
        resolve(values.length > 0 && selected === expected)
      }
    }
  }), { expected: expectedSelected, id: recallId }, { timeout: 5000 })
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

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

let browser = null

try {
  const playwright = await loadPlaywright()
  const appPort = await freePort()
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  await run('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_ROUTER_MODE: 'hash',
    VITE_CREATOR_WORKING_AGENT_URL: '',
  })

  start('creator-auth-preview', 'npm', [
    '--prefix',
    'app',
    'run',
    'preview',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(appPort),
    '--outDir',
    'dist-creator-qa',
  ])
  await waitForUrl(appBaseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }

  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  mkdirSync(artifactDir, { recursive: true })

  const evidence = []
  let editorRecallEvidence = null

  for (const route of routesToCheck) {
    await page.goto(`${appBaseUrl}/#${route.path}?qa=local-creator-authenticated`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => {
      const root = document.querySelector('#root')
      return Boolean(root && root.textContent && root.textContent.trim().length > 0)
    }, null, { timeout: 15000 })
    await page.waitForTimeout(250)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(80)

    const bodyText = await page.evaluate(() => document.body.innerText || document.body.textContent || '')

    if (route.path !== '/creator/editor') {
      assert(bodyText.includes(route.title), `${route.path} missing route title: ${route.title}`)
    }
    if (route.path !== '/creator/editor') {
      for (const label of requiredNav) {
        assert(bodyText.includes(label), `${route.path} missing Creator nav label: ${label}`)
      }
    } else {
      const workspaceCount = await page.locator('[data-slot="creator-conversation-workspace"]').count()
      const timelineCount = await page.locator('[data-slot="creator-conversation-timeline-region"]').count()
      const composerInputCount = await page.locator('[data-slot="creator-conversation-input"]').count()
      const recallRailCount = await page.locator('[data-slot="creator-recall-rail"]').count()
      assert(workspaceCount === 1, '/creator/editor focus mode must expose one conversation workspace')
      assert(timelineCount === 1, '/creator/editor focus mode must expose one conversation timeline')
      assert(composerInputCount === 1, '/creator/editor focus mode must expose one stable conversation input')
      assert(recallRailCount === 1, '/creator/editor focus mode must expose one manual recall rail')
    }
    for (const fragment of route.mustContain) {
      assert(bodyText.includes(fragment), `${route.path} missing signed-in product fragment: ${fragment}`)
    }
    assert(!bodyText.includes('工作台已锁定'), `${route.path} still shows signed-out locked preview`)
    assert(!bodyText.includes('登录后开始处理读者请求'), `${route.path} still shows signed-out gate`)
    assertNoForbiddenText(bodyText, route.path)
    assert(!bodyText.includes('开始阅读'), `${route.path} shows Reader CTA residue`)
    assert(!bodyText.includes('进入书城'), `${route.path} shows Reader library residue`)

    if (route.path === '/creator') {
      assert(!bodyText.includes('今日节奏'), '/creator must not restore the redundant static Today loop copy')
      assert(await page.locator('.local-creator-loop').count() === 0, '/creator must not restore the retired static Today loop surface')

      const todayNextStepsPanel = page.locator('[data-slot="creator-today-next-steps-panel"]')
      assert(await todayNextStepsPanel.count() === 1, '/creator should render one Today next-steps panel')
      const todayNextStepsMetrics = await todayNextStepsPanel.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-next-steps-list"]')
        const actions = [...panel.querySelectorAll('[data-slot="creator-today-next-step-action"]')]
        const tracked = [
          panel,
          list,
          ...panel.querySelectorAll('[data-slot="creator-today-next-step"]'),
          ...actions,
        ].filter(node => node instanceof HTMLElement)
        const text = panel.textContent || ''
        return {
          rootTag: panel.tagName,
          listTag: list?.tagName || '',
          itemCount: panel.querySelectorAll('[data-slot="creator-today-next-step"]').length,
          actionCount: actions.length,
          primaryCount: panel.querySelectorAll('[data-slot="creator-today-next-step"][data-priority="primary"]').length,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
          actionMinHeight: actions.length
            ? Math.min(...actions.map(action => action.getBoundingClientRect().height))
            : 0,
          hasProductCopy: ['今天最值得推进的 3 件事', '最值得回应的一问', '正在写的一条', '需要确认发布'].every(value => text.includes(value)),
        }
      })
      assert(
        todayNextStepsMetrics.rootTag === 'DIV'
          && todayNextStepsMetrics.listTag === 'OL'
          && todayNextStepsMetrics.itemCount === 3
          && todayNextStepsMetrics.actionCount === 3
          && todayNextStepsMetrics.primaryCount >= 1
          && todayNextStepsMetrics.listColumns === 3
          && todayNextStepsMetrics.nestedGlassCount === 0
          && todayNextStepsMetrics.maxHorizontalOverflow <= 1
          && todayNextStepsMetrics.panelRadius <= 10
          && todayNextStepsMetrics.actionMinHeight >= 40
          && todayNextStepsMetrics.hasProductCopy,
        `/creator Today next-steps panel lost its atomic shadcn contract: ${JSON.stringify(todayNextStepsMetrics)}`,
      )
      await todayNextStepsPanel.screenshot({
        path: join(artifactDir, 'creator-today-next-steps-atomic.png'),
      })

      const previousTodayNextStepsTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedTodayNextSteps = await todayNextStepsPanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedTodayNextSteps.backdrop === 'none'
          && (!reducedTodayNextSteps.webkitBackdrop || reducedTodayNextSteps.webkitBackdrop === 'none'),
        `/creator Today next-steps panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedTodayNextSteps)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTodayNextStepsTransparency)

      await page.setViewportSize({ width: 560, height: 1200 })
      const narrowTodayNextSteps = await todayNextStepsPanel.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-next-steps-list"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowTodayNextSteps.panelOverflow <= 1
          && narrowTodayNextSteps.panelRight <= narrowTodayNextSteps.viewportWidth
          && narrowTodayNextSteps.listColumns === 1,
        `/creator narrow Today next-steps panel lost its responsive containment: ${JSON.stringify(narrowTodayNextSteps)}`,
      )
      await todayNextStepsPanel.screenshot({
        path: join(artifactDir, 'creator-today-next-steps-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const todayPriorityPanel = page.locator('[data-slot="creator-today-priority-panel"]')
      const todayPriorityMetrics = await todayPriorityPanel.evaluate(panel => {
        const focus = panel.querySelector('[data-slot="creator-today-focus"]')
        const metricGroup = panel.querySelector('[data-slot="creator-today-metrics"] dl')
        const route = panel.querySelector('[data-slot="creator-today-route"] ol')
        const action = panel.querySelector('[data-slot="creator-today-primary-action"]')
        const tracked = [panel, focus, metricGroup, route, action, ...panel.querySelectorAll('[data-slot="creator-today-metric"], [data-slot="creator-today-route-step"]')]
          .filter(node => node instanceof HTMLElement)
        const style = getComputedStyle(panel)
        return {
          rootTag: panel.tagName,
          metricGroupTag: metricGroup?.tagName || '',
          routeTag: route?.tagName || '',
          metricCount: panel.querySelectorAll('[data-slot="creator-today-metric"]').length,
          routeStepCount: panel.querySelectorAll('[data-slot="creator-today-route-step"]').length,
          activeStepCount: panel.querySelectorAll('[data-slot="creator-today-route-step"][data-state="active"]').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(style.borderRadius),
          actionMinHeight: action instanceof HTMLElement ? Number.parseFloat(getComputedStyle(action).minHeight) : 0,
        }
      })
      assert(
        todayPriorityMetrics.rootTag === 'DIV'
          && todayPriorityMetrics.metricGroupTag === 'DL'
          && todayPriorityMetrics.routeTag === 'OL'
          && todayPriorityMetrics.metricCount === 3
          && todayPriorityMetrics.routeStepCount === 4
          && todayPriorityMetrics.activeStepCount === 1
          && todayPriorityMetrics.maxHorizontalOverflow <= 1
          && todayPriorityMetrics.panelRadius <= 10
          && todayPriorityMetrics.actionMinHeight >= 48,
        `/creator Today priority panel lost its atomic shadcn contract: ${JSON.stringify(todayPriorityMetrics)}`,
      )
      await todayPriorityPanel.screenshot({
        path: join(artifactDir, 'creator-today-priority-atomic.png'),
      })

      const previousTodayTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedTodayPriority = await todayPriorityPanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedTodayPriority.backdrop === 'none'
          && (!reducedTodayPriority.webkitBackdrop || reducedTodayPriority.webkitBackdrop === 'none'),
        `/creator Today priority panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedTodayPriority)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTodayTransparency)

      const todayPathPanel = page.locator('[data-slot="creator-today-path-panel"]')
      assert(await todayPathPanel.count() === 1, '/creator should render one Today path panel')
      const todayPathMetrics = await todayPathPanel.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-path-list"]')
        const actions = [...panel.querySelectorAll('[data-slot="creator-today-path-action"]')]
        const tracked = [
          panel,
          list,
          ...panel.querySelectorAll('[data-slot="creator-today-path-item"]'),
          ...actions,
        ].filter(node => node instanceof HTMLElement)
        return {
          rootTag: panel.tagName,
          listTag: list?.tagName || '',
          itemCount: panel.querySelectorAll('[data-slot="creator-today-path-item"]').length,
          actionCount: actions.length,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
          actionMinHeight: actions.length
            ? Math.min(...actions.map(action => action.getBoundingClientRect().height))
            : 0,
        }
      })
      assert(
        todayPathMetrics.rootTag === 'DIV'
          && todayPathMetrics.listTag === 'OL'
          && todayPathMetrics.itemCount === 4
          && todayPathMetrics.actionCount === 4
          && todayPathMetrics.listColumns === 4
          && todayPathMetrics.nestedGlassCount === 0
          && todayPathMetrics.maxHorizontalOverflow <= 1
          && todayPathMetrics.panelRadius <= 10
          && todayPathMetrics.actionMinHeight >= 40,
        `/creator Today path panel lost its atomic shadcn contract: ${JSON.stringify(todayPathMetrics)}`,
      )
      await todayPathPanel.screenshot({
        path: join(artifactDir, 'creator-today-path-atomic.png'),
      })

      const previousTodayPathTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedTodayPath = await todayPathPanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedTodayPath.backdrop === 'none'
          && (!reducedTodayPath.webkitBackdrop || reducedTodayPath.webkitBackdrop === 'none'),
        `/creator Today path panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedTodayPath)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTodayPathTransparency)

      await page.setViewportSize({ width: 560, height: 760 })
      const narrowTodayPath = await todayPathPanel.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-path-list"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: document.documentElement.clientWidth,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowTodayPath.panelOverflow <= 1
          && narrowTodayPath.panelRight <= narrowTodayPath.viewportWidth
          && narrowTodayPath.listColumns === 1,
        `/creator narrow Today path panel lost its responsive containment: ${JSON.stringify(narrowTodayPath)}`,
      )
      await todayPathPanel.screenshot({
        path: join(artifactDir, 'creator-today-path-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const todayEchoStatusPanel = page.locator('[data-slot="creator-today-echo-status-panel"]')
      assert(await todayEchoStatusPanel.count() === 1, '/creator should render one Today Echo status panel')
      const todayEchoStatusMetrics = await todayEchoStatusPanel.evaluate(panel => {
        const metricGroup = panel.querySelector('[data-slot="creator-today-echo-status-metrics"]')
        const tracked = [
          panel,
          metricGroup,
          ...panel.querySelectorAll('[data-slot="creator-today-echo-status-metric"]'),
        ].filter(node => node instanceof HTMLElement)
        const text = panel.textContent || ''
        return {
          rootTag: panel.tagName,
          metricGroupTag: metricGroup?.tagName || '',
          metricCount: panel.querySelectorAll('[data-slot="creator-today-echo-status-metric"]').length,
          metricColumns: metricGroup ? getComputedStyle(metricGroup).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
          hasProductCopy: ['回声走向', '等待判断', '进入创作', '公开回应', '暂不采用'].every(value => text.includes(value)),
        }
      })
      assert(
        todayEchoStatusMetrics.rootTag === 'DIV'
          && todayEchoStatusMetrics.metricGroupTag === 'DL'
          && todayEchoStatusMetrics.metricCount === 3
          && todayEchoStatusMetrics.metricColumns === 3
          && todayEchoStatusMetrics.nestedGlassCount === 0
          && todayEchoStatusMetrics.maxHorizontalOverflow <= 1
          && todayEchoStatusMetrics.panelRadius <= 10
          && todayEchoStatusMetrics.hasProductCopy,
        `/creator Today Echo status panel lost its atomic shadcn contract: ${JSON.stringify(todayEchoStatusMetrics)}`,
      )
      await todayEchoStatusPanel.screenshot({
        path: join(artifactDir, 'creator-today-echo-status-atomic.png'),
      })

      const previousTodayEchoTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedTodayEchoStatus = await todayEchoStatusPanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedTodayEchoStatus.backdrop === 'none'
          && (!reducedTodayEchoStatus.webkitBackdrop || reducedTodayEchoStatus.webkitBackdrop === 'none'),
        `/creator Today Echo status panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedTodayEchoStatus)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTodayEchoTransparency)

      await page.setViewportSize({ width: 560, height: 760 })
      const narrowTodayEchoStatus = await todayEchoStatusPanel.evaluate(panel => {
        const metricGroup = panel.querySelector('[data-slot="creator-today-echo-status-metrics"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: document.documentElement.clientWidth,
          metricColumns: metricGroup ? getComputedStyle(metricGroup).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowTodayEchoStatus.panelOverflow <= 1
          && narrowTodayEchoStatus.panelRight <= narrowTodayEchoStatus.viewportWidth
          && narrowTodayEchoStatus.metricColumns === 1,
        `/creator narrow Today Echo status panel lost its responsive containment: ${JSON.stringify(narrowTodayEchoStatus)}`,
      )
      await todayEchoStatusPanel.screenshot({
        path: join(artifactDir, 'creator-today-echo-status-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const workReadinessPanel = page.locator('[data-slot="creator-work-readiness-panel"]')
      assert(await workReadinessPanel.count() === 1, '/creator should render one work-readiness panel')
      const workReadinessMetrics = await workReadinessPanel.evaluate(panel => {
        const metricGroup = panel.querySelector('[data-slot="creator-work-readiness-metrics"] dl')
        const workList = panel.querySelector('[data-slot="creator-work-readiness-list"] ul')
        const action = panel.querySelector('[data-slot="creator-work-readiness-action"]')
        const tracked = [
          panel,
          metricGroup,
          workList,
          action,
          ...panel.querySelectorAll('[data-slot="creator-work-readiness-metric"], [data-slot="creator-work-readiness-item"]'),
        ].filter(node => node instanceof HTMLElement)
        const style = getComputedStyle(panel)
        return {
          rootTag: panel.tagName,
          metricGroupTag: metricGroup?.tagName || '',
          workListTag: workList?.tagName || '',
          metricCount: panel.querySelectorAll('[data-slot="creator-work-readiness-metric"]').length,
          itemCount: panel.querySelectorAll('[data-slot="creator-work-readiness-item"]').length,
          metricColumns: metricGroup ? getComputedStyle(metricGroup).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(style.borderRadius),
          actionMinHeight: action instanceof HTMLElement ? Number.parseFloat(getComputedStyle(action).minHeight) : 0,
        }
      })
      assert(
        workReadinessMetrics.rootTag === 'DIV'
          && workReadinessMetrics.metricGroupTag === 'DL'
          && workReadinessMetrics.workListTag === 'UL'
          && workReadinessMetrics.metricCount === 4
          && workReadinessMetrics.itemCount >= 1
          && workReadinessMetrics.itemCount <= 3
          && workReadinessMetrics.metricColumns === 4
          && workReadinessMetrics.nestedGlassCount === 0
          && workReadinessMetrics.maxHorizontalOverflow <= 1
          && workReadinessMetrics.panelRadius <= 10
          && workReadinessMetrics.actionMinHeight >= 40,
        `/creator work-readiness panel lost its atomic shadcn contract: ${JSON.stringify(workReadinessMetrics)}`,
      )
      await workReadinessPanel.screenshot({
        path: join(artifactDir, 'creator-work-readiness-atomic.png'),
      })

      const previousWorkReadinessTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedWorkReadiness = await workReadinessPanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedWorkReadiness.backdrop === 'none'
          && (!reducedWorkReadiness.webkitBackdrop || reducedWorkReadiness.webkitBackdrop === 'none'),
        `/creator work-readiness panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedWorkReadiness)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousWorkReadinessTransparency)

      await page.setViewportSize({ width: 560, height: 760 })
      const narrowWorkReadiness = await workReadinessPanel.evaluate(panel => {
        const metricGroup = panel.querySelector('[data-slot="creator-work-readiness-metrics"] dl')
        const firstItem = panel.querySelector('[data-slot="creator-work-readiness-item"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          metricColumns: metricGroup ? getComputedStyle(metricGroup).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          itemColumns: firstItem ? getComputedStyle(firstItem).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowWorkReadiness.panelOverflow <= 1
          && narrowWorkReadiness.panelRight <= narrowWorkReadiness.viewportWidth
          && narrowWorkReadiness.metricColumns === 2
          && narrowWorkReadiness.itemColumns === 1,
        `/creator narrow work-readiness panel lost its responsive containment: ${JSON.stringify(narrowWorkReadiness)}`,
      )
      await workReadinessPanel.screenshot({
        path: join(artifactDir, 'creator-work-readiness-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const todayContextRail = page.locator('[data-slot="creator-today-context-rail"]')
      const todayContextColumn = page.locator('[data-slot="creator-today-context-column"]')
      assert(await todayContextRail.count() === 1, '/creator should render one Today context rail')
      assert(await todayContextColumn.count() === 1, '/creator should render one Today context column')
      const desktopTodayContextColumnPosition = await todayContextColumn.evaluate(column => getComputedStyle(column).position)
      assert(desktopTodayContextColumnPosition === 'sticky', `/creator desktop context column must stay sticky: ${desktopTodayContextColumnPosition}`)
      const todayContextMetrics = await todayContextRail.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-context-list"]')
        const tracked = [
          panel,
          list,
          ...panel.querySelectorAll('[data-slot="creator-today-context-item"]'),
        ].filter(node => node instanceof HTMLElement)
        const text = panel.textContent || ''
        return {
          rootTag: panel.tagName,
          listTag: list?.tagName || '',
          itemCount: panel.querySelectorAll('[data-slot="creator-today-context-item"]').length,
          phaseCount: panel.querySelectorAll('[data-slot="creator-today-context-phase"]').length,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
          hasProductCopy: ['当前创作上下文', '工作状态', '最近作品', '最近支线', '写作方式'].every(value => text.includes(value)),
        }
      })
      assert(
        todayContextMetrics.rootTag === 'DIV'
          && todayContextMetrics.listTag === 'DL'
          && todayContextMetrics.itemCount === 4
          && todayContextMetrics.phaseCount === 1
          && todayContextMetrics.listColumns === 1
          && todayContextMetrics.nestedGlassCount === 0
          && todayContextMetrics.maxHorizontalOverflow <= 1
          && todayContextMetrics.panelRadius <= 10
          && todayContextMetrics.hasProductCopy,
        `/creator Today context rail lost its atomic shadcn contract: ${JSON.stringify(todayContextMetrics)}`,
      )
      await todayContextRail.screenshot({
        path: join(artifactDir, 'creator-today-context-rail-atomic.png'),
      })

      const previousTodayContextTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedTodayContext = await todayContextRail.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedTodayContext.backdrop === 'none'
          && (!reducedTodayContext.webkitBackdrop || reducedTodayContext.webkitBackdrop === 'none'),
        `/creator Today context rail must disable glass blur under reduced transparency: ${JSON.stringify(reducedTodayContext)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTodayContextTransparency)

      await page.setViewportSize({ width: 560, height: 760 })
      const narrowTodayContext = await todayContextRail.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-today-context-list"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowTodayContext.panelOverflow <= 1
          && narrowTodayContext.panelRight <= narrowTodayContext.viewportWidth
          && narrowTodayContext.listColumns === 1,
        `/creator narrow Today context rail lost its responsive containment: ${JSON.stringify(narrowTodayContext)}`,
      )
      const narrowTodayContextColumnPosition = await todayContextColumn.evaluate(column => getComputedStyle(column).position)
      assert(narrowTodayContextColumnPosition !== 'sticky', `/creator narrow context column must return to document flow: ${narrowTodayContextColumnPosition}`)
      await todayContextRail.screenshot({
        path: join(artifactDir, 'creator-today-context-rail-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const scrollTodayToEnd = () => page.evaluate(() => {
        const scrollHost = document.querySelector('.creator-workbench-main')
        if (!(scrollHost instanceof HTMLElement)) return null
        scrollHost.scrollTo(0, scrollHost.scrollHeight)
        return {
          scrollTop: scrollHost.scrollTop,
          clientHeight: scrollHost.clientHeight,
          scrollHeight: scrollHost.scrollHeight,
        }
      })
      const todayEndMetrics = await scrollTodayToEnd()
      assert(
        todayEndMetrics
          && todayEndMetrics.scrollTop > 0
          && todayEndMetrics.scrollTop + todayEndMetrics.clientHeight >= todayEndMetrics.scrollHeight - 2,
        `/creator desktop route did not reach the end after static-loop deletion: ${JSON.stringify(todayEndMetrics)}`,
      )
      await page.waitForTimeout(80)
      await page.screenshot({
        path: join(artifactDir, 'creator-today-data-surfaces-end.png'),
      })

      await page.setViewportSize({ width: 560, height: 900 })
      const narrowTodayEndMetrics = await scrollTodayToEnd()
      assert(
        narrowTodayEndMetrics
          && narrowTodayEndMetrics.scrollTop > 0
          && narrowTodayEndMetrics.scrollTop + narrowTodayEndMetrics.clientHeight >= narrowTodayEndMetrics.scrollHeight - 2,
        `/creator narrow route did not reach the end after static-loop deletion: ${JSON.stringify(narrowTodayEndMetrics)}`,
      )
      await page.waitForTimeout(80)
      await page.screenshot({
        path: join(artifactDir, 'creator-today-data-surfaces-end-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.evaluate(() => {
        const scrollHost = document.querySelector('.creator-workbench-main')
        if (scrollHost instanceof HTMLElement) scrollHost.scrollTo(0, 0)
      })

      await page.getByRole('button', { name: /快捷创作/ }).click()
      const commandDialog = page.getByRole('dialog', { name: '一句话说需求' })
      const commandOverlay = page.locator('[data-slot="creator-command-overlay"]')
      const commandPanel = page.locator('[data-slot="creator-command-panel"]')
      await commandDialog.waitFor({ state: 'visible', timeout: 5000 })
      const commandPaletteMetrics = await commandPanel.evaluate(panel => {
        const intent = panel.querySelector('[data-slot="creator-command-intent-summary"]')
        const context = panel.querySelector('[data-slot="creator-command-context"]')
        const input = panel.querySelector('[data-slot="creator-command-input"]')
        const items = [...panel.querySelectorAll('[data-slot="creator-command-item"]')]
        const tracked = [
          panel,
          intent,
          context,
          ...panel.querySelectorAll('[data-slot="creator-command-intent-item"]'),
          ...panel.querySelectorAll('[data-slot="creator-command-context-item"]'),
          ...panel.querySelectorAll('[data-slot="creator-command-example"]'),
          ...panel.querySelectorAll('[data-slot="creator-command-suggestion"]'),
          ...items,
        ].filter(node => node instanceof HTMLElement)
        const style = getComputedStyle(panel)
        return {
          intentTag: intent?.tagName || '',
          contextTag: context?.tagName || '',
          listTag: panel.querySelector('[data-slot="creator-command-list"]')?.tagName || '',
          intentCount: panel.querySelectorAll('[data-slot="creator-command-intent-item"]').length,
          contextCount: panel.querySelectorAll('[data-slot="creator-command-context-item"]').length,
          exampleCount: panel.querySelectorAll('[data-slot="creator-command-example"]').length,
          suggestionCount: panel.querySelectorAll('[data-slot="creator-command-suggestion"]').length,
          commandCount: items.length,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
          panelRadius: Number.parseFloat(style.borderRadius),
          panelBackgroundImage: style.backgroundImage,
          panelMaxHeight: Number.parseFloat(style.maxHeight),
          viewportHeight: window.innerHeight,
          inputFocused: input === document.activeElement,
          dialogLabelled: Boolean(panel.closest('[role="dialog"]')?.getAttribute('aria-labelledby')),
        }
      })
      assert(
        commandPaletteMetrics.intentTag === 'DL'
          && commandPaletteMetrics.contextTag === 'DL'
          && commandPaletteMetrics.listTag === 'UL'
          && commandPaletteMetrics.intentCount === 3
          && commandPaletteMetrics.contextCount === 3
          && commandPaletteMetrics.exampleCount === 3
          && commandPaletteMetrics.suggestionCount === 2
          && commandPaletteMetrics.commandCount === 2
          && commandPaletteMetrics.maxHorizontalOverflow <= 1
          && commandPaletteMetrics.panelRadius <= 8
          && commandPaletteMetrics.panelBackgroundImage !== 'none'
          && commandPaletteMetrics.panelMaxHeight < commandPaletteMetrics.viewportHeight
          && commandPaletteMetrics.inputFocused
          && commandPaletteMetrics.dialogLabelled,
        `/creator command palette lost its atomic shadcn contract: ${JSON.stringify(commandPaletteMetrics)}`,
      )
      await commandPanel.screenshot({
        path: join(artifactDir, 'creator-command-palette-atomic.png'),
      })

      const previousTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedCommandPalette = await page.evaluate(() => {
        const overlay = document.querySelector('[data-slot="creator-command-overlay"]')
        const panel = document.querySelector('[data-slot="creator-command-panel"]')
        const inset = document.querySelector('[data-slot="creator-command-intent-item"]')
        const style = node => node instanceof HTMLElement ? getComputedStyle(node) : null
        return {
          overlayBackgroundImage: style(overlay)?.backgroundImage || '',
          overlayBackdrop: style(overlay)?.backdropFilter || '',
          panelBackgroundImage: style(panel)?.backgroundImage || '',
          panelBackdrop: style(panel)?.backdropFilter || '',
          insetBackgroundImage: style(inset)?.backgroundImage || '',
        }
      })
      assert(
        reducedCommandPalette.overlayBackgroundImage === 'none'
          && reducedCommandPalette.overlayBackdrop === 'none'
          && reducedCommandPalette.panelBackgroundImage === 'none'
          && reducedCommandPalette.panelBackdrop === 'none'
          && reducedCommandPalette.insetBackgroundImage === 'none',
        `/creator reduced-transparency command palette must use solid surfaces: ${JSON.stringify(reducedCommandPalette)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousTransparency)

      await page.setViewportSize({ width: 680, height: 760 })
      const narrowCommandPalette = await commandPanel.evaluate(panel => {
        const intent = panel.querySelector('[data-slot="creator-command-intent-summary"]')
        const context = panel.querySelector('[data-slot="creator-command-context"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          intentColumns: intent ? getComputedStyle(intent).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          contextColumns: context ? getComputedStyle(context).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowCommandPalette.panelOverflow <= 1
          && narrowCommandPalette.panelRight <= narrowCommandPalette.viewportWidth
          && narrowCommandPalette.intentColumns === 1
          && narrowCommandPalette.contextColumns === 1,
        `/creator narrow command palette lost its one-column containment: ${JSON.stringify(narrowCommandPalette)}`,
      )
      await commandPanel.screenshot({
        path: join(artifactDir, 'creator-command-palette-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })
      await commandDialog.getByRole('button', { name: /关闭快捷创作/ }).click()
      await commandOverlay.waitFor({ state: 'detached', timeout: 5000 })
    }

    if (route.path === '/creator/requests') {
      const echoStatusStrip = page.locator('[data-slot="creator-echo-status-strip"]')
      assert(await echoStatusStrip.count() === 1, '/creator/requests should render one External Echo status strip')
      assert(await echoStatusStrip.locator('[data-slot="creator-echo-status-chip"]').count() >= 5, '/creator/requests status strip should render the source overview chips')
      const echoStatusLayout = await echoStatusStrip.evaluate((node) => {
        const content = node.querySelector('[data-slot="creator-echo-status-content"]')
        const grid = node.querySelector('[data-slot="creator-echo-status-grid"]')
        return {
          contentDirection: content ? getComputedStyle(content).flexDirection : '',
          gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(echoStatusLayout.contentDirection === 'row' && echoStatusLayout.gridColumns === 5, `/creator/requests status strip lost desktop containment: ${JSON.stringify(echoStatusLayout)}`)
      await echoStatusStrip.screenshot({
        path: join(artifactDir, 'creator-requests-status-strip-atomic.png'),
      })
      const normalizedCards = page.locator('[data-reader-signal-id]')
      assert(await normalizedCards.count() > 0, '/creator/requests missing normalized External Echo cards')
      const canonicalEchoCards = page.locator('[data-slot="creator-external-echo-card"]')
      const canonicalEchoDetail = page.locator('[data-slot="creator-external-echo-detail"]')
      assert(await canonicalEchoCards.count() === await normalizedCards.count(), '/creator/requests normalized rows must use the canonical External Echo card owner')
      assert(await canonicalEchoDetail.count() === 1, '/creator/requests should render one canonical External Echo detail owner')
      const detailText = await canonicalEchoDetail.innerText()
      for (const fragment of ['创作提醒', '读者回声', '本机判断']) {
        assert(detailText.includes(fragment), `/creator/requests detail boundary missing ${fragment}`)
      }
      const nextAction = page.locator('[data-slot="creator-echo-next-action"]')
      assert(await nextAction.count() === 1, '/creator/requests should render one atomic next action')
      assert(await nextAction.getAttribute('data-state') === 'ready', '/creator/requests next action should expose the ready state')
      const nextActionText = await nextAction.innerText()
      for (const fragment of ['今天先写', '读者原话', '作者一问', '带着这一问去写']) {
        assert(nextActionText.includes(fragment), `/creator/requests next action missing ${fragment}`)
      }
      for (const fragment of ['下一步建议', '处理路径', '请求决策队列', '整理成写作任务']) {
        assert(!nextActionText.includes(fragment), `/creator/requests next action still shows legacy copy: ${fragment}`)
      }
      const nextActionDesktop = await nextAction.evaluate((node) => {
        const context = node.querySelector('[data-slot="creator-echo-next-action-context"]')
        const path = node.querySelector('[data-slot="creator-echo-next-action-path"]')
        const actions = node.querySelector('[data-slot="creator-echo-next-action-actions"] > div:last-child')
        const actionButtons = Array.from(node.querySelectorAll('[data-slot="creator-echo-next-action-actions"] button'))
        return {
          tag: node.tagName,
          figureCount: node.querySelectorAll('[data-slot="creator-echo-next-action-quote"] figure, figure[data-slot="creator-echo-next-action-quote"]').length,
          contextTag: context?.tagName || '',
          contextColumns: context ? getComputedStyle(context).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          pathTag: path?.tagName || '',
          pathColumns: path ? getComputedStyle(path).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          actionCount: actionButtons.length,
          minActionHeight: actionButtons.length ? Math.min(...actionButtons.map(button => button.getBoundingClientRect().height)) : 0,
          nestedGlassCount: node.querySelectorAll('.pu-liquid-glass').length,
          backdropFilter: getComputedStyle(node).backdropFilter,
          radius: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
          overflow: node.scrollWidth - node.clientWidth,
        }
      })
      assert(
        nextActionDesktop.figureCount === 1
          && nextActionDesktop.contextTag === 'DL'
          && nextActionDesktop.contextColumns === 3
          && nextActionDesktop.pathTag === 'OL'
          && nextActionDesktop.pathColumns === 3
          && nextActionDesktop.actionColumns === 3
          && nextActionDesktop.actionCount === 3
          && nextActionDesktop.minActionHeight >= 40
          && nextActionDesktop.nestedGlassCount === 0
          && (nextActionDesktop.backdropFilter === 'none' || nextActionDesktop.backdropFilter === '')
          && nextActionDesktop.radius <= 8
          && nextActionDesktop.overflow <= 1,
        `/creator/requests next action lost its atomic desktop contract: ${JSON.stringify(nextActionDesktop)}`,
      )
      await nextAction.screenshot({
        path: join(artifactDir, 'creator-requests-next-action-atomic.png'),
      })

      await page.setViewportSize({ width: 560, height: 900 })
      const nextActionNarrow = await nextAction.evaluate((node) => {
        const context = node.querySelector('[data-slot="creator-echo-next-action-context"]')
        const path = node.querySelector('[data-slot="creator-echo-next-action-path"]')
        const actions = node.querySelector('[data-slot="creator-echo-next-action-actions"] > div:last-child')
        return {
          contextColumns: context ? getComputedStyle(context).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          pathColumns: path ? getComputedStyle(path).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          right: node.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          overflow: node.scrollWidth - node.clientWidth,
        }
      })
      assert(
        nextActionNarrow.contextColumns === 1
          && nextActionNarrow.pathColumns === 1
          && nextActionNarrow.actionColumns === 1
          && nextActionNarrow.right <= nextActionNarrow.viewportWidth
          && nextActionNarrow.overflow <= 1,
        `/creator/requests next action lost its narrow containment: ${JSON.stringify(nextActionNarrow)}`,
      )
      const lastNextActionButton = nextAction.getByRole('button').last()
      await lastNextActionButton.evaluate(node => node.scrollIntoView({ block: 'center' }))
      const narrowActionReachability = await page.evaluate(() => {
        const nav = document.querySelector('nav.workspace-nav')
        const buttons = document.querySelectorAll('[data-slot="creator-echo-next-action-actions"] button')
        const lastButton = buttons.item(buttons.length - 1)
        return {
          buttonBottom: lastButton?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
          navTop: nav?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
        }
      })
      assert(
        narrowActionReachability.buttonBottom <= narrowActionReachability.navTop,
        `/creator/requests last next action is obscured by mobile navigation: ${JSON.stringify(narrowActionReachability)}`,
      )
      await page.setViewportSize({ width: 560, height: 1200 })
      await nextAction.screenshot({
        path: join(artifactDir, 'creator-requests-next-action-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const requestCard = page.locator('[data-reader-signal-source="想看"]').first()
      assert(await requestCard.count() > 0, '/creator/requests missing request-backed compatibility signal')
      await requestCard.getByRole('button', { name: /查看|正在看/ }).click()
      await page.locator('.creator-echo-decision-panel').waitFor({ state: 'visible' })
      const decisionText = await page.locator('.creator-echo-decision-panel').innerText()
      for (const fragment of ['动笔前判断', '读者原话', '可写场景', '作者一问']) {
        assert(decisionText.includes(fragment), `/creator/requests decision queue missing ${fragment}`)
      }
      for (const fragment of ['请求决策队列', '处理路径', '整理成写作任务']) {
        assert(!decisionText.includes(fragment), `/creator/requests decision panel still shows legacy copy: ${fragment}`)
      }
      await page.locator('.creator-echo-decision-panel').screenshot({
        path: join(artifactDir, 'creator-requests-decision-queue.png'),
      })
    }

    if (route.path === '/creator/editor') {
      const workspace = page.locator('[data-slot="creator-conversation-workspace"]')
      const input = page.locator('[data-slot="creator-conversation-input"]')
      const recallItems = page.locator('[data-slot="creator-recall-item"]')
      const activeDrafts = page.locator('[data-slot="creator-conversation-active-draft"]')
      assert(await workspace.getAttribute('data-agent-ready') === 'true', '/creator/editor must finish restoring before author input')
      assert(await recallItems.count() >= 1, '/creator/editor must expose real selectable recall records')

      let authorSelectableRecall = recallItems
        .filter({ has: page.locator('[role="checkbox"][data-state="unchecked"]') })
        .first()
      let beganSelected = false
      if (await authorSelectableRecall.count() === 0) {
        beganSelected = true
        authorSelectableRecall = recallItems.first()
      }
      const selectedRecallId = await authorSelectableRecall.getAttribute('data-recall-id')
      const selectedRecallSourceId = await authorSelectableRecall.getAttribute('data-recall-source-id')
      assert(Boolean(selectedRecallId && selectedRecallSourceId), '/creator/editor manual recall needs stable candidate and source identities')
      authorSelectableRecall = page.locator(`[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`)
      const manuscriptBefore = await activeDrafts.allInnerTexts()
      if (beganSelected) {
        await authorSelectableRecall.getByRole('checkbox').click()
        await waitForRecallSelectionPersistence(page, selectedRecallId, false)
      } else {
        await authorSelectableRecall.getByRole('checkbox').click()
        await waitForRecallSelectionPersistence(page, selectedRecallId, true)
        await authorSelectableRecall.getByRole('checkbox').click()
        await waitForRecallSelectionPersistence(page, selectedRecallId, false)
      }
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('[data-slot="creator-conversation-workspace"][data-agent-ready="true"]').waitFor({ timeout: 15000 })
      authorSelectableRecall = page.locator(`[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`)
      assert(await authorSelectableRecall.getByRole('checkbox').getAttribute('data-state') === 'unchecked', '/creator/editor author recall deselection must survive refresh')
      const authorRecallCheckbox = authorSelectableRecall.getByRole('checkbox')
      await authorRecallCheckbox.click()
      await page.keyboard.press('Tab')
      const recallKeyboardTarget = page.locator(':focus')
      assert(
        (await recallKeyboardTarget.getAttribute('aria-label'))?.startsWith('定位到'),
        '/creator/editor Tab from a recall checkbox must reach its source locator action',
      )
      await waitForRecallSelectionPersistence(page, selectedRecallId, true)
      assert(await authorRecallCheckbox.getAttribute('data-state') === 'checked', '/creator/editor recall selection must change through a real click')
      assert(JSON.stringify(await activeDrafts.allInnerTexts()) === JSON.stringify(manuscriptBefore), '/creator/editor recall selection must not mutate accepted prose')

      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('[data-slot="creator-conversation-workspace"][data-agent-ready="true"]').waitFor({ timeout: 15000 })
      const persistedRecall = page.locator(`[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`)
      assert(await persistedRecall.count() === 1, '/creator/editor persisted recall must be restored after refresh')
      assert(await persistedRecall.getByRole('checkbox').getAttribute('data-state') === 'checked', '/creator/editor author recall selection must survive refresh')
      assert(await persistedRecall.getAttribute('data-recall-in-context') === 'false', '/creator/editor selected recall must not claim Context inclusion before the next comparison')

      const storySeed = '雾港停电后，守灯人发现失踪者的名字正在灯塔玻璃上逐个亮起。'
      const authorTurnCountBefore = await page.locator('[data-turn-kind="author"]').count()
      await input.click()
      await page.keyboard.type(storySeed)
      assert(await input.inputValue() === storySeed, '/creator/editor Google Chrome keyboard input must preserve the full natural-language seed')
      await page.keyboard.press('Enter')
      await page.waitForFunction(expected => document.querySelectorAll('[data-turn-kind="author"]').length > expected, authorTurnCountBefore, { timeout: 5000 })
      assert(await input.inputValue() === '', '/creator/editor must consume the submitted natural-language seed')
      assert(await page.locator('[data-slot="creator-conversation-preview"]').count() === 0, '/creator/editor natural-language seed must not auto-generate prose')
      assert(await activeDrafts.count() === 0, '/creator/editor natural-language seed must not auto-adopt a draft')

      let answeredQuestions = 0
      while (answeredQuestions < 2 && await page.getByRole('button', { name: /锁定本章意图/ }).count() === 0) {
        const blockingTurn = page.locator('[data-slot="creator-conversation-turn"]').filter({ hasText: '这轮只确认一件事' }).last()
        const options = blockingTurn.getByRole('button')
        assert(await options.count() >= 1, '/creator/editor must offer an answer path for each blocking intent question')
        await options.first().click()
        answeredQuestions += 1
        await page.waitForTimeout(120)
      }
      const lockIntent = page.getByRole('button', { name: /锁定本章意图/ })
      assert(await lockIntent.count() === 1, '/creator/editor must reach an intent lock after no more than two blocking questions')
      await lockIntent.click()
      await page.getByText('本章意图已锁定', { exact: true }).waitFor({ timeout: 5000 })
      assert(await page.locator('[data-slot="creator-conversation-candidate"]').count() === 0, '/creator/editor intent lock must not auto-search or auto-select a route')

      await page.getByRole('button', { name: '比较不同方向' }).click()
      await page.waitForTimeout(1200)
      const candidateWaitDeadline = Date.now() + 18800
      while (await page.locator('[data-slot="creator-conversation-candidate"]').count() === 0 && Date.now() < candidateWaitDeadline) {
        if (await workspace.getAttribute('data-agent-workspace-state') === 'ready') break
        await page.waitForTimeout(150)
      }
      const candidates = page.locator('[data-slot="creator-conversation-candidate"]')
      const candidateCount = await candidates.count()
      if (candidateCount === 0) {
        const statusText = await page.locator('[role="status"]').allInnerTexts()
        throw new Error(`/creator/editor candidate search completed without candidates: ${JSON.stringify(statusText)}`)
      }
      assert(candidateCount <= 3, `/creator/editor must show at most three distinct routes, got ${candidateCount}`)
      const candidateIds = await candidates.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-candidate-id')))
      assert(new Set(candidateIds).size === candidateIds.length, '/creator/editor must not use duplicate candidates to fill the list')
      assert(await page.locator('[data-slot="creator-conversation-candidate"][aria-pressed="true"]').count() === 0, '/creator/editor candidate search must not choose for the author')
      assert(await persistedRecall.getAttribute('data-recall-in-context') === 'true', '/creator/editor author-selected recall must enter the Context used by candidate search')
      const durableContextEvidence = await page.evaluate(async ({ sourceId }) => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('puf_creator_workspace', 10)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
        })
        try {
          const records = await new Promise((resolve, reject) => {
            const transaction = db.transaction('contextSnapshots', 'readonly')
            const request = transaction.objectStore('contextSnapshots').getAll()
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
          })
          const matching = records.filter(record => (
            record?.status === 'active'
            && Array.isArray(record?.manualRecallItems)
            && record.manualRecallItems.some(item => item?.sourceId === sourceId)
          ))
          return {
            matchingContextCount: matching.length,
            selectedRecallCount: matching.at(-1)?.manualRecallItems?.length || 0,
          }
        } finally {
          db.close()
        }
      }, { sourceId: selectedRecallSourceId })
      assert(durableContextEvidence.matchingContextCount >= 1, '/creator/editor Context Snapshot must durably contain the author-selected recall source')

      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('[data-slot="creator-conversation-workspace"][data-agent-ready="true"]').waitFor({ timeout: 15000 })
      const restoredContextRecall = page.locator(`[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`)
      assert(await restoredContextRecall.getAttribute('data-recall-in-context') === 'true', '/creator/editor active Context recall must survive a second refresh')
      assert(await page.locator('[data-slot="creator-conversation-candidate"]').count() === candidateCount, '/creator/editor candidate comparison must restore with the same candidate count')

      editorRecallEvidence = {
        selectedRecallId,
        selectedRecallSourceId,
        explicitDeselectionVerified: true,
        explicitSelectionVerified: true,
        selectionPersistedAcrossRefresh: true,
        enteredCandidateSearchContext: true,
        contextPersistedAcrossRefresh: true,
        matchingDurableContextCount: durableContextEvidence.matchingContextCount,
        contextManualRecallCount: durableContextEvidence.selectedRecallCount,
        candidateCount,
        duplicateCandidateCount: candidateIds.length - new Set(candidateIds).size,
        proseMutationObserved: false,
        candidateAutoSelected: false,
        canonCommitObserved: false,
        publicWriteObserved: false,
      }

      const restoredCandidates = page.locator('[data-slot="creator-conversation-candidate"]')
      await restoredCandidates.first().click()
      await page.waitForFunction(() => document.querySelectorAll('[data-slot="creator-conversation-candidate"][aria-pressed="true"]').length === 1, null, { timeout: 5000 })
      assert(await page.locator('[data-slot="creator-conversation-candidate"][aria-pressed="true"]').count() === 1, '/creator/editor must select exactly the route clicked by the author')
      assert(await page.locator('[data-slot="creator-conversation-preview"]').count() === 0, '/creator/editor route selection must not auto-generate a scene')
      assert(await activeDrafts.count() === 0, '/creator/editor route selection must not auto-adopt prose')
      assert(!(await page.locator('body').innerText()).includes('本章正文与状态已经写入本机主宇宙'), '/creator/editor QA must not cross the author Canon confirmation boundary')

      await workspace.screenshot({
        path: join(artifactDir, 'creator-editor-conversation-candidate-first.png'),
      })
    }


    if (route.path === '/creator/works') {
      const branchCards = page.locator('[data-slot="creator-branch-line-card"]')
      assert(await branchCards.count() >= 2, '/creator/works should render main and IF branch cards')
      assert(await page.locator('[data-slot="creator-branch-line-card"][data-line-kind="main"]').count() >= 1, '/creator/works should render a main-line card')
      assert(await page.locator('[data-slot="creator-branch-line-card"][data-line-kind="if"]').count() >= 1, '/creator/works should render an IF-line card')
      const authorDecisionCard = page.locator('[data-slot="creator-author-decision-card"]')
      assert(await authorDecisionCard.count() === 1, '/creator/works should render one CreatorAuthorDecisionCard')
      const authorDecisionText = await authorDecisionCard.innerText()
      for (const fragment of ['这条线下一步', '创作助手', '作者一问', '当前线', '读者愿望', '章节', '去这条线写正文']) {
        assert(authorDecisionText.includes(fragment), `/creator/works author decision card missing ${fragment}: ${authorDecisionText}`)
      }
    }

    if (route.path === '/creator/publish') {
      const authorDecisionCard = page.locator('[data-slot="creator-author-decision-card"]')
      assert(await authorDecisionCard.count() === 1, '/creator/publish should render one CreatorAuthorDecisionCard')
      const authorDecisionText = await authorDecisionCard.innerText()
      for (const fragment of ['发布前最后一问', '创作助手', '作者一问', '正文', '读者愿望', '公开位置', '回到写作台调整']) {
        assert(authorDecisionText.includes(fragment), `/creator/publish author decision card missing ${fragment}: ${authorDecisionText}`)
      }
      assert(!authorDecisionText.includes('回写'), `/creator/publish author decision card leaks implementation copy: ${authorDecisionText}`)
    }

    if (route.path === '/creator/settings') {
      const boundaryStrip = page.locator('[data-slot="creator-settings-boundary-strip"]')
      assert(await boundaryStrip.count() === 1, '/creator/settings should render one Local Workspace boundary strip')
      const boundaryMetrics = await boundaryStrip.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-settings-boundary-list"]')
        const items = [...panel.querySelectorAll('[data-slot="creator-settings-boundary-item"]')]
        const tracked = [
          panel,
          list,
          ...items,
          ...panel.querySelectorAll('[data-slot="creator-settings-boundary-value"], [data-slot="creator-settings-boundary-detail"]'),
        ].filter(node => node instanceof HTMLElement)
        const style = getComputedStyle(panel)
        return {
          rootTag: panel.tagName,
          listTag: list?.tagName || '',
          itemCount: items.length,
          statusCount: panel.querySelectorAll('[data-slot="creator-settings-boundary-status"]').length,
          valueCount: panel.querySelectorAll('[data-slot="creator-settings-boundary-value"]').length,
          detailCount: panel.querySelectorAll('[data-slot="creator-settings-boundary-detail"]').length,
          stateCount: items.filter(item => item.getAttribute('data-state') === 'ready' || item.getAttribute('data-state') === 'pending').length,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          hasLift: panel.classList.contains('pu-motion-lift') || Boolean(panel.querySelector('.pu-motion-lift')),
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
          panelRadius: Number.parseFloat(style.borderTopLeftRadius) || 0,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
        }
      })
      assert(
        boundaryMetrics.rootTag === 'DIV'
          && boundaryMetrics.listTag === 'DL'
          && boundaryMetrics.itemCount === 4
          && boundaryMetrics.statusCount === 4
          && boundaryMetrics.valueCount === 4
          && boundaryMetrics.detailCount === 4
          && boundaryMetrics.stateCount === 4
          && boundaryMetrics.listColumns === 4
          && boundaryMetrics.nestedGlassCount === 0
          && !boundaryMetrics.hasLift
          && boundaryMetrics.backdrop === 'none'
          && (!boundaryMetrics.webkitBackdrop || boundaryMetrics.webkitBackdrop === 'none')
          && boundaryMetrics.panelRadius <= 8
          && boundaryMetrics.maxHorizontalOverflow <= 1,
        `/creator/settings boundary strip lost its atomic solid-card contract: ${JSON.stringify(boundaryMetrics)}`,
      )
      await boundaryStrip.screenshot({
        path: join(artifactDir, 'creator-settings-boundary-strip-atomic.png'),
      })

      await page.setViewportSize({ width: 560, height: 900 })
      const narrowBoundaryMetrics = await boundaryStrip.evaluate(panel => {
        const list = panel.querySelector('[data-slot="creator-settings-boundary-list"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: document.documentElement.clientWidth,
          listColumns: list ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        }
      })
      assert(
        narrowBoundaryMetrics.panelOverflow <= 1
          && narrowBoundaryMetrics.panelRight <= narrowBoundaryMetrics.viewportWidth
          && narrowBoundaryMetrics.listColumns === 1,
        `/creator/settings narrow boundary strip lost its responsive containment: ${JSON.stringify(narrowBoundaryMetrics)}`,
      )
      await boundaryStrip.screenshot({
        path: join(artifactDir, 'creator-settings-boundary-strip-atomic-narrow.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })

      const localWorkspacePanel = page.locator('[data-slot="creator-local-workspace-panel"]')
      assert(await localWorkspacePanel.count() === 1, '/creator/settings should render one Local Workspace panel')
      const workspaceMetrics = await localWorkspacePanel.evaluate(panel => {
        const content = panel.querySelector('[data-slot="creator-local-workspace-content"]')
        const summary = panel.querySelector('[data-slot="creator-local-workspace-summary-list"]')
        const permissions = panel.querySelector('[data-slot="creator-local-workspace-permission-list"]')
        const operations = panel.querySelector('[data-slot="creator-local-workspace-operation-list"]')
        const operationEmpty = panel.querySelector('[data-slot="creator-local-workspace-operation-empty"]')
        const backupActions = panel.querySelector('[data-slot="creator-local-workspace-backup-actions"]')
        const exportAction = panel.querySelector('[data-slot="creator-local-workspace-export-action"]')
        const importAction = panel.querySelector('[data-slot="creator-local-workspace-import-action"]')
        const tracked = [
          panel,
          content,
          summary,
          permissions,
          operations,
          operationEmpty,
          backupActions,
          ...panel.querySelectorAll('[data-slot^="creator-local-workspace-summary-"]'),
          ...panel.querySelectorAll('[data-slot^="creator-local-workspace-permission-"]'),
          ...panel.querySelectorAll('[data-slot^="creator-local-workspace-operation-"]'),
        ].filter(node => node instanceof HTMLElement)
        const actions = [...panel.querySelectorAll('[data-slot="creator-local-workspace-export-action"], [data-slot="creator-local-workspace-import-action"]')]
        const style = getComputedStyle(panel)
        return {
          rootTag: panel.tagName,
          contentColumns: content ? getComputedStyle(content).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          summaryTag: summary?.tagName || '',
          summaryColumns: summary ? getComputedStyle(summary).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          summaryCount: panel.querySelectorAll('[data-slot="creator-local-workspace-summary-item"]').length,
          summaryValueCount: panel.querySelectorAll('[data-slot="creator-local-workspace-summary-value"]').length,
          summaryDetailCount: panel.querySelectorAll('[data-slot="creator-local-workspace-summary-detail"]').length,
          permissionTag: permissions?.tagName || '',
          permissionCount: panel.querySelectorAll('[data-slot="creator-local-workspace-permission-item"]').length,
          permissionStatusCount: panel.querySelectorAll('[data-slot="creator-local-workspace-permission-status"]').length,
          operationTag: operations?.tagName || '',
          operationCount: panel.querySelectorAll('[data-slot="creator-local-workspace-operation-item"]').length,
          operationEmptyCount: operationEmpty ? 1 : 0,
          operationEmptyRole: operationEmpty?.getAttribute('role') || '',
          backupDirection: backupActions ? getComputedStyle(backupActions).flexDirection : '',
          actionCount: actions.length,
          minActionHeight: actions.length ? Math.min(...actions.map(action => action.getBoundingClientRect().height)) : 0,
          exportDisabled: exportAction?.hasAttribute('disabled') ?? true,
          importDisabled: importAction?.hasAttribute('disabled') ?? false,
          nestedGlassCount: panel.querySelectorAll('.pu-liquid-glass').length,
          panelRadius: Number.parseFloat(style.borderTopLeftRadius) || 0,
          maxHorizontalOverflow: Math.max(0, ...tracked.map(node => node.scrollWidth - node.clientWidth)),
        }
      })
      assert(
        workspaceMetrics.rootTag === 'DIV'
          && workspaceMetrics.contentColumns === 2
          && workspaceMetrics.summaryTag === 'DL'
          && workspaceMetrics.summaryColumns === 3
          && workspaceMetrics.summaryCount === 7
          && workspaceMetrics.summaryValueCount === 7
          && workspaceMetrics.summaryDetailCount === 7
          && workspaceMetrics.permissionTag === 'UL'
          && workspaceMetrics.permissionCount === 3
          && workspaceMetrics.permissionStatusCount === 3
          && (workspaceMetrics.operationTag === 'OL' || (workspaceMetrics.operationEmptyCount === 1 && workspaceMetrics.operationEmptyRole === 'alert'))
          && workspaceMetrics.operationCount + workspaceMetrics.operationEmptyCount >= 1
          && workspaceMetrics.backupDirection === 'row'
          && workspaceMetrics.actionCount === 2
          && workspaceMetrics.minActionHeight >= 40
          && !workspaceMetrics.exportDisabled
          && workspaceMetrics.importDisabled
          && workspaceMetrics.nestedGlassCount === 0
          && workspaceMetrics.panelRadius <= 8
          && workspaceMetrics.maxHorizontalOverflow <= 1,
        `/creator/settings Local Workspace panel lost its atomic shadcn contract: ${JSON.stringify(workspaceMetrics)}`,
      )
      await localWorkspacePanel.screenshot({
        path: join(artifactDir, 'creator-local-workspace-panel-atomic.png'),
      })

      const previousWorkspaceTransparency = await page.evaluate(() => document.documentElement.dataset.creatorTransparency || '')
      await page.evaluate(() => { document.documentElement.dataset.creatorTransparency = 'reduced' })
      const reducedWorkspace = await localWorkspacePanel.evaluate(panel => {
        const style = getComputedStyle(panel)
        return {
          backdrop: style.backdropFilter,
          webkitBackdrop: style.webkitBackdropFilter,
        }
      })
      assert(
        reducedWorkspace.backdrop === 'none'
          && (!reducedWorkspace.webkitBackdrop || reducedWorkspace.webkitBackdrop === 'none'),
        `/creator/settings Local Workspace panel must disable glass blur under reduced transparency: ${JSON.stringify(reducedWorkspace)}`,
      )
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.creatorTransparency = value
        else delete document.documentElement.dataset.creatorTransparency
      }, previousWorkspaceTransparency)

      await page.setViewportSize({ width: 560, height: 900 })
      const narrowWorkspaceMetrics = await localWorkspacePanel.evaluate(panel => {
        const content = panel.querySelector('[data-slot="creator-local-workspace-content"]')
        const summary = panel.querySelector('[data-slot="creator-local-workspace-summary-list"]')
        const backupActions = panel.querySelector('[data-slot="creator-local-workspace-backup-actions"]')
        return {
          panelOverflow: panel.scrollWidth - panel.clientWidth,
          panelRight: panel.getBoundingClientRect().right,
          viewportWidth: document.documentElement.clientWidth,
          contentColumns: content ? getComputedStyle(content).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          summaryColumns: summary ? getComputedStyle(summary).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
          backupDirection: backupActions ? getComputedStyle(backupActions).flexDirection : '',
        }
      })
      assert(
        narrowWorkspaceMetrics.panelOverflow <= 1
          && narrowWorkspaceMetrics.panelRight <= narrowWorkspaceMetrics.viewportWidth
          && narrowWorkspaceMetrics.contentColumns === 1
          && narrowWorkspaceMetrics.summaryColumns === 1
          && narrowWorkspaceMetrics.backupDirection === 'column',
        `/creator/settings narrow Local Workspace panel lost its responsive containment: ${JSON.stringify(narrowWorkspaceMetrics)}`,
      )
      await localWorkspacePanel.screenshot({
        path: join(artifactDir, 'creator-local-workspace-panel-atomic-narrow.png'),
      })
      const narrowWorkspaceEnd = await page.evaluate(() => {
        const scrollHost = document.querySelector('.creator-workbench-main')
        const footer = document.querySelector('[data-slot="creator-local-workspace-backup-actions"]')
        if (!(scrollHost instanceof HTMLElement) || !(footer instanceof HTMLElement)) return null
        footer.scrollIntoView({ block: 'center' })
        const footerRect = footer.getBoundingClientRect()
        return {
          scrollTop: scrollHost.scrollTop,
          footerTop: footerRect.top,
          footerBottom: footerRect.bottom,
          viewportHeight: window.innerHeight,
        }
      })
      assert(
        narrowWorkspaceEnd
          && narrowWorkspaceEnd.scrollTop > 0
          && narrowWorkspaceEnd.footerTop >= 0
          && narrowWorkspaceEnd.footerBottom <= narrowWorkspaceEnd.viewportHeight - 72,
        `/creator/settings narrow Local Workspace footer is not reachable above the fixed navigation: ${JSON.stringify(narrowWorkspaceEnd)}`,
      )
      await page.waitForTimeout(80)
      await page.screenshot({
        path: join(artifactDir, 'creator-local-workspace-panel-atomic-narrow-end.png'),
      })
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.evaluate(() => {
        const scrollHost = document.querySelector('.creator-workbench-main')
        if (scrollHost instanceof HTMLElement) scrollHost.scrollTo(0, 0)
      })
    }

    const screenshotPath = join(artifactDir, `route-${route.path.replaceAll('/', '-').replace(/^-/, '') || 'creator'}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    evidence.push({ path: route.path, screenshot: screenshotPath })
  }

  if (routesToCheck.some(route => route.path === '/creator/editor')) {
    assert(editorRecallEvidence, 'authenticated Creator QA must record the manual-recall-to-Context proof')
    const receipt = {
      schemaVersion: 'creator-editor-manual-recall-context.v1',
      generatedAt: new Date().toISOString(),
      browser: 'Google Chrome',
      sourceKind: 'authenticated_creator_qa_fixture',
      longRangeThreadSelectionClaimed: false,
      boundary: {
        chapter21Accessed: false,
        proseGenerated: false,
        proseAdopted: false,
        canonCommitted: false,
        cloudWritten: false,
        published: false,
      },
      evidence: editorRecallEvidence,
    }
    const receiptText = `${JSON.stringify(receipt, null, 2)}\n`
    writeFileSync(join(artifactDir, 'creator-editor-manual-recall-context.json'), receiptText)
    writeFileSync(editorRecallReceiptPath, receiptText)
  }

  console.log('[browser-local-creator-authenticated-routes] PASS')
  console.log(JSON.stringify({ baseUrl: appBaseUrl, evidence }, null, 2))
} catch (error) {
  console.error(error)
  console.error(logs.slice(-80).join('\n'))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(qaBuildDir, { recursive: true, force: true })
}
