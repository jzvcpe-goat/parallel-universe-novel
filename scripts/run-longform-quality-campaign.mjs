import { spawn } from 'node:child_process'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNNER = path.join(ROOT, 'scripts', 'run-longform-quality.mjs')
const OUTPUT_ROOT = process.env.PUF_LONGFORM_OUTPUT_DIR
  ? path.resolve(process.env.PUF_LONGFORM_OUTPUT_DIR)
  : path.join(ROOT, 'artifacts', 'longform-quality')
const CAMPAIGN_PATH = path.join(OUTPUT_ROOT, 'campaign.json')
const activeChildren = new Set()

function parseArgs(argv) {
  const args = { project: 'all', workers: 3, maxRounds: 30, candidateAttempts: 3 }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--project') args.project = argv[++index]
    else if (token === '--workers') args.workers = Number(argv[++index])
    else if (token === '--max-rounds') args.maxRounds = Number(argv[++index])
    else if (token === '--candidate-attempts') args.candidateAttempts = Number(argv[++index])
    else throw new Error(`unknown_argument:${token}`)
  }
  if (!Number.isInteger(args.workers) || args.workers < 1 || args.workers > 6) throw new Error('invalid_worker_count')
  if (!Number.isInteger(args.maxRounds) || args.maxRounds < 1 || args.maxRounds > 100) throw new Error('invalid_max_rounds')
  if (!Number.isInteger(args.candidateAttempts) || args.candidateAttempts < 1 || args.candidateAttempts > 5) {
    throw new Error('invalid_candidate_attempt_count')
  }
  return args
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, filePath)
}

async function updateCampaign(projectId, patch) {
  const current = await readJson(CAMPAIGN_PATH, {
    schemaVersion: 'longform-quality-campaign.v1',
    claimBoundary: 'Only locally accepted validation chapters count. No public publication is performed.',
    createdAt: new Date().toISOString(),
    projects: {},
  })
  current.projects[projectId] = { ...(current.projects[projectId] || {}), ...patch }
  current.updatedAt = new Date().toISOString()
  await writeJson(CAMPAIGN_PATH, current)
}

function runChild(argumentsList) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [RUNNER, ...argumentsList], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    })
    activeChildren.add(child)
    child.on('error', error => {
      activeChildren.delete(child)
      resolve({ code: -1, error })
    })
    child.on('close', code => {
      activeChildren.delete(child)
      resolve({ code, error: null })
    })
  })
}

async function runProject(project, args) {
  const manifestPath = path.join(OUTPUT_ROOT, 'projects', project.id, 'manifest.json')
  for (let round = 1; round <= args.maxRounds; round += 1) {
    const before = await readJson(manifestPath, {})
    if (before.acceptedChapterCount === 100) {
      await updateCampaign(project.id, { status: 'complete', acceptedChapterCount: 100, rounds: round - 1 })
      return
    }
    await updateCampaign(project.id, {
      status: 'running',
      round,
      acceptedChapterCount: before.acceptedChapterCount || 0,
    })
    const result = await runChild([
      'run',
      '--project', project.id,
      '--from', '1',
      '--to', '100',
      '--workers', '1',
      '--arc-workers', '1',
      '--candidate-attempts', String(args.candidateAttempts),
    ])
    const after = await readJson(manifestPath, {})
    if (result.code === 0 && after.acceptedChapterCount === 100) {
      await updateCampaign(project.id, { status: 'complete', acceptedChapterCount: 100, rounds: round })
      return
    }
    await updateCampaign(project.id, {
      status: 'retrying',
      round,
      acceptedChapterCount: after.acceptedChapterCount || 0,
      blockedChapter: after.blockedChapter || null,
      lastExitCode: result.code,
      lastError: result.error?.message || null,
    })
    if (round < args.maxRounds) await new Promise(resolve => setTimeout(resolve, Math.min(60_000, round * 5_000)))
  }
  const finalManifest = await readJson(manifestPath, {})
  await updateCampaign(project.id, {
    status: 'blocked',
    acceptedChapterCount: finalManifest.acceptedChapterCount || 0,
    blockedChapter: finalManifest.blockedChapter || null,
    rounds: args.maxRounds,
  })
  throw new Error(`campaign_rounds_exhausted:${project.id}:${finalManifest.acceptedChapterCount || 0}`)
}

async function runPool(projects, workers, task) {
  const queue = [...projects]
  const failures = []
  await Promise.all(Array.from({ length: Math.min(workers, queue.length) }, async () => {
    while (queue.length) {
      const project = queue.shift()
      try {
        await task(project)
      } catch (error) {
        failures.push({ projectId: project.id, error: error.message })
      }
    }
  }))
  if (failures.length) throw new Error(`campaign_failed:${JSON.stringify(failures)}`)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of activeChildren) child.kill(signal)
    process.exitCode = 1
  })
}

const args = parseArgs(process.argv.slice(2))
const seedSet = await readJson(path.join(ROOT, 'validation', 'longform', 'project-seeds.json'))
const projects = args.project === 'all'
  ? seedSet.projects
  : seedSet.projects.filter(project => project.id === args.project)
if (!projects.length) throw new Error(`unknown_project:${args.project}`)
await runPool(projects, args.workers, project => runProject(project, args))
const reportResult = await runChild(['report', '--project', args.project])
if (reportResult.code !== 0) {
  throw new Error(`campaign_report_failed:${args.project}:${reportResult.code}`)
}
