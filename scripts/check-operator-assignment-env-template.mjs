#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const templateRel = 'deploy/runtime-production/remote-assignment.env.example'
const localRel = 'deploy/runtime-production/remote-assignment.env.local'

const requiredKeys = [
  'REMOTE_OPERATOR_OWNER',
  'REMOTE_OPERATOR_PROVIDER',
  'REMOTE_RUNTIME_ENVIRONMENT',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_ORIGIN',
  'REMOTE_AGENT_ORIGIN',
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
]

const blankKeys = new Set([
  'REMOTE_OPERATOR_OWNER',
  'REMOTE_OPERATOR_PROVIDER',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_ORIGIN',
  'REMOTE_AGENT_ORIGIN',
])

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function gitCheckIgnore(rel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', rel], {
      cwd: root,
      stdio: 'ignore',
      timeout: 8000,
    })
    return true
  } catch {
    return false
  }
}

function parseEnvTemplate(text) {
  const entries = []
  const seen = new Set()
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    assert(!line.startsWith('export '), `template line ${index + 1} must not use export`)
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `template line ${index + 1} must be KEY=value`)
    const [, key, value] = match
    assert(!seen.has(key), `duplicate env key ${key}`)
    seen.add(key)
    entries.push({ key, value })
  }
  return entries
}

function privateMatches(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL\s*=/i,
    /postgres(ql)?:\/\//i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*=/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*=/i,
    /NARRATIVEOS_CREATOR_API_KEY\s*=/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
    /https?:\/\/[^\s<]+/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

for (const file of [
  templateRel,
  'docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P126_OPERATOR_ASSIGNMENT_ENV_APPLY_FIXTURE.md',
  'scripts/check-remote-assignment-env-dry-run.mjs',
  'scripts/apply-remote-assignment-env.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P128 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:operator-assignment-env-template'] === 'node scripts/check-operator-assignment-env-template.mjs',
  'package.json must expose check:operator-assignment-env-template',
)
assert(
  rootTest.includes('npm run check:operator-assignment-env-apply-fixture && npm run check:operator-assignment-env-template && npm run audit:dependencies'),
  'root test must run P128 after P126 and before dependency audit',
)

const gitignore = read('.gitignore')
assert(gitignore.includes(localRel), `.gitignore must ignore ${localRel}`)
assert(gitignore.includes('deploy/runtime-production/remote-assignment.*.env.local'), '.gitignore must ignore local assignment env variants')
assert(gitCheckIgnore(localRel), `${localRel} must be ignored by Git`)

assertIncludes('docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md', [
  'P128 Operator Assignment Env Template Gate',
  'check:operator-assignment-env-template',
  templateRel,
  localRel,
  'does not write',
])
assertIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', ['P128'])
assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', ['P128'])
assertIncludes('docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md', ['P128'])
assertIncludes('docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md', ['P128'])
assertIncludes('docs/backend/P126_OPERATOR_ASSIGNMENT_ENV_APPLY_FIXTURE.md', ['P128'])

const templateText = read(templateRel)
const entries = parseEnvTemplate(templateText)
const keys = entries.map(entry => entry.key)
assert(keys.length === requiredKeys.length, `template must contain exactly ${requiredKeys.length} env entries`)
for (const key of requiredKeys) assert(keys.includes(key), `template missing ${key}`)
for (const key of keys) assert(requiredKeys.includes(key), `template contains unexpected key ${key}`)
for (const { key, value } of entries) {
  if (blankKeys.has(key)) assert(value === '', `${key} must be blank in the tracked template`)
  if (key === 'REMOTE_RUNTIME_ENVIRONMENT') assert(value === 'production', `${key} must default to production`)
  if (key === 'REMOTE_API_SECRETS_CONFIGURED') assert(value === 'false', `${key} must default to false`)
  if (key === 'REMOTE_AGENT_SECRETS_CONFIGURED') assert(value === 'false', `${key} must default to false`)
}
const templatePrivateHits = privateMatches(templateText)
assert(templatePrivateHits.length === 0, `template leaked private terms: ${templatePrivateHits.join(', ')}`)

const payload = {
  version: 1,
  gate: 'P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  templatePath: templateRel,
  localTargetPath: localRel,
  requiredEnvCount: requiredKeys.length,
  blankValueKeys: [...blankKeys],
  defaultedKeys: {
    REMOTE_RUNTIME_ENVIRONMENT: 'production',
    REMOTE_API_SECRETS_CONFIGURED: 'false',
    REMOTE_AGENT_SECRETS_CONFIGURED: 'false',
  },
  boundaries: {
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    containsConcreteServiceIds: false,
    containsConcreteOrigins: false,
    containsProviderCredentials: false,
    containsPromptPlumbing: false,
    containsPrivateTitleMaterial: false,
    containsRuleIdentifiers: false,
  },
  nextCommands: [
    'copy template to ignored local env file',
    'load ignored local env file in the current shell',
    'npm run check:remote-assignment-env-dry-run',
    'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
    'npm run check:remote-runtime-assignment-intake',
    'npm run check:remote-operator-return-intake',
    'npm run check:loop-next-goal-ledger',
  ],
}

const payloadPrivateHits = privateMatches(payload)
assert(payloadPrivateHits.length === 0, `P128 artifact leaked private terms: ${payloadPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `operator-assignment-env-template-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: payload.gate,
  templatePath: templateRel,
  localTargetPath: localRel,
  requiredEnvCount: requiredKeys.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
