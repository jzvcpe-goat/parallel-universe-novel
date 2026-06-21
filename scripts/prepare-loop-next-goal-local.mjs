#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const localAssignmentRel = 'deploy/runtime-production/remote-assignment.local.json'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'))
}

function currentHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function run(script, extraEnv = {}) {
  const startedAt = Date.now()
  execFileSync('npm', ['run', script], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    timeout: 180000,
  })
  return { script, durationMs: Date.now() - startedAt }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

assert(process.env.CI !== 'true' || process.env.ALLOW_CI_LOOP_PREPARE === 'true', 'prepare:loop-next-goal-local is a local-only helper because it refreshes an ignored assignment draft')

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['prepare:loop-next-goal-local'] === 'node scripts/prepare-loop-next-goal-local.mjs',
  'package.json must expose prepare:loop-next-goal-local',
)
assert(
  !String(packageJson.scripts.test || '').includes('prepare:loop-next-goal-local'),
  'root npm run test must not run prepare:loop-next-goal-local because it may refresh ignored local assignment state',
)
assert(readFileSync(join(root, '.gitignore'), 'utf8').includes(localAssignmentRel), `${localAssignmentRel} must stay ignored`)
for (const [file, terms] of [
  ['docs/backend/P137_LOOP_NEXT_GOAL_LOCAL_REHYDRATION.md', [
    'P137 Loop Next Goal Local Rehydration',
    'prepare:loop-next-goal-local',
    'local-only',
    'not part of root `npm run test`',
    'weaken P121/P132 current-head coherence',
  ]],
  ['docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', [
    'prepare:loop-next-goal-local',
    'local-only',
    'not part of root `npm run test`',
  ]],
]) {
  assert(existsSync(join(root, file)), `missing P137 document: ${file}`)
  const text = readFileSync(join(root, file), 'utf8')
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

const steps = [
  ['check:p4-document-core'],
  ['check:p4-deprecated-case-logic'],
  ['check:public-projection-privacy'],
  ['check:backward-consistency-sweep'],
  ['scan:reference-privacy'],
  ['check:runtime-completion-refresh'],
  ['check:runtime-image-publish-evidence'],
  ['prepare:remote-assignment-local', { REMOTE_ASSIGNMENT_DRAFT_FORCE: 'true' }],
  ['check:release-workflow-ordering'],
  ['check:remote-assignment-handoff'],
  ['check:remote-assignment-handoff-artifact'],
  ['check:remote-assignment-schema'],
  ['check:remote-origin-operator-pack'],
  ['check:remote-runtime-assignment-intake'],
  ['check:remote-origin-execution'],
  ['check:live-cutover-attestation'],
  ['check:live-rollback-rehearsal'],
  ['check:remote-runtime-activation-control'],
  ['check:remote-assignment-execution-pack'],
  ['check:remote-assignment-fixture'],
  ['check:remote-assignment-artifacts'],
  ['check:remote-runtime-blockers'],
  ['check:remote-runtime-blockers-artifact'],
  ['check:runtime-completion-blocker-convergence'],
  ['check:remote-assignment-fill-plan'],
  ['check:remote-assignment-fill-plan-artifact'],
  ['check:remote-assignment-env-apply'],
  ['check:remote-assignment-env-dry-run'],
  ['check:runtime-assignment-intent-env-template'],
  ['check:remote-assignment-image-drift'],
  ['check:remote-assignment-strict-run-package'],
  ['check:remote-assignment-strict-run-package-artifact'],
  ['check:remote-operator-readiness-packet'],
  ['check:remote-operator-readiness-packet-artifact'],
  ['check:remote-operator-return-intake'],
  ['check:remote-operator-return-intake-artifact'],
  ['check:ci-artifact-content-coverage'],
  ['check:loop-next-goal-ledger'],
]

const executed = []
for (const [script, extraEnv] of steps) executed.push(run(script, extraEnv))

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate: 'P137_LOOP_NEXT_GOAL_LOCAL_REHYDRATION',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  localOnly: true,
  writesTrackedFiles: false,
  refreshesIgnoredAssignmentDraft: true,
  assignmentPath: localAssignmentRel,
  commands: executed.map(item => item.script),
  nextCommand: 'npm run check:operator-return-fixture-isolation',
}
const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `P137 artifact leaked private terms: ${privateHits.join(', ')}`)

const artifactPath = join(artifactDir, `loop-next-goal-local-rehydration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  headSha: artifact.headSha,
  steps: executed.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
