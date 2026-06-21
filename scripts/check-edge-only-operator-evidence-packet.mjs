#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const templateRel = 'deploy/runtime-production/runtime-assignment.intent.env.example'
const localEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const legacyFullRemoteEnvRel = 'deploy/runtime-production/remote-assignment.env.local'
const intentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
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

function latestArtifact(prefix, predicate = null, label = prefix) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run root runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  throw new Error(`missing ${label} artifact`)
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function parseEnvKeys(rel) {
  if (!existsSync(join(root, rel))) return []
  return read(rel)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0])
    .filter(Boolean)
}

function statusFromLocalIntentEnv() {
  if (!existsSync(join(root, localEnvRel))) {
    return {
      present: false,
      providedPublicKeyCount: 0,
      missingPublicKeys: [
        'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
        'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
        'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
      ],
      valuesIncluded: false,
    }
  }
  const text = read(localEnvRel)
  const values = Object.fromEntries(
    text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const index = line.indexOf('=')
        return index >= 0 ? [line.slice(0, index), line.slice(index + 1).trim()] : [line, '']
      }),
  )
  const hasDataId = Boolean(values.RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID || values.SUPABASE_PROJECT_REF)
  const hasDataOrigin = Boolean(values.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN || values.SUPABASE_URL)
  const dataConfigured = values.RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED === 'true'
  const missingPublicKeys = []
  if (!hasDataId) missingPublicKeys.push('RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF')
  if (!hasDataOrigin) missingPublicKeys.push('RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL')
  if (!dataConfigured) missingPublicKeys.push('RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED')
  return {
    present: true,
    providedPublicKeyCount: Object.values(values).filter(value => value !== '').length,
    missingPublicKeys,
    valuesIncluded: false,
  }
}

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

function renderMarkdown(packet) {
  const rows = packet.operatorSteps.map(step => (
    `| ${step.order} | ${step.label} | \`${step.command}\` | ${step.doneWhen} |`
  ))
  const evidenceRows = packet.requiredEvidence.map(item => (
    `| \`${item.key}\` | ${item.meaning} | ${item.source} | ${item.publicSafe ? 'yes' : 'no'} |`
  ))
  return `# P147 Edge-Only Operator Evidence Packet

Generated: ${packet.generatedAt}

Status: \`${packet.status}\`

Decision: \`${packet.decision}\`

Head: \`${packet.headSha}\`

Runtime topology: \`${packet.runtimeTopology}\`

Template: \`${packet.templatePath}\`

Ignored local env: \`${packet.localEnvPath}\`

## Required Evidence

| Key | Meaning | Source | Public-safe |
| --- | --- | --- | --- |
${evidenceRows.join('\n')}

## Operator Steps

| Order | Step | Command | Done when |
| --- | --- | --- | --- |
${rows.join('\n')}

## Current Blocking Stages

${packet.blockedStages.map(stage => `- \`${stage}\``).join('\n') || '- none'}

## Boundary

This is the edge-only handoff packet for GitHub Pages plus managed Data API.
It does not require a remote Agent Runtime, does not use the legacy full-remote
env as primary evidence, does not store Supabase keys, does not write canon,
does not promote live runtime, and does not expose model-routing internals.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:edge-only-operator-evidence-packet'] === 'node scripts/check-edge-only-operator-evidence-packet.mjs',
  'package.json must expose check:edge-only-operator-evidence-packet',
)
assert(
  packageJson.scripts['check:edge-only-operator-evidence-packet-artifact'] === 'node scripts/check-edge-only-operator-evidence-packet-artifact.mjs',
  'package.json must expose check:edge-only-operator-evidence-packet-artifact',
)
assert(
  rootTest.includes('npm run check:operator-assignment-evidence-intake-artifact && npm run check:edge-only-operator-evidence-packet && npm run check:edge-only-operator-evidence-packet-artifact'),
  'root npm run test must run P147 after P124 and before legacy compatibility fixtures',
)

for (const file of [
  templateRel,
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P147 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md', [
  'P147 Edge-Only Operator Evidence Packet',
  'check:edge-only-operator-evidence-packet',
  'check:edge-only-operator-evidence-packet-artifact',
  localEnvRel,
  'prepare:runtime-assignment-intent-env-local',
  'SUPABASE_ANON_KEY',
  'does not require a remote Agent Runtime',
])
assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', [
  'P147',
  'edge-only operator evidence packet',
])
assertIncludes('docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md', [
  'P147',
  'edge-only operator evidence packet',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload edge-only operator evidence packet',
  'edge-only-operator-evidence-packet',
  'artifacts/runtime/edge-only-operator-evidence-packet-*.json',
  'Check edge-only operator evidence packet artifact content',
  'check:edge-only-operator-evidence-packet-artifact',
])
assertIncludes('scripts/check-github-actions-artifacts.mjs', [
  'edge-only-operator-evidence-packet',
])

const headSha = currentHead()
const p123 = latestArtifact(
  'operator-assignment-evidence-intake-',
  payload => payload.gate === 'P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE' && payload.headSha === headSha,
  'current P123 operator assignment evidence intake',
)
const p146 = latestArtifact(
  'runtime-assignment-intent-env-template-',
  payload => payload.gate === 'P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE',
  'P146 edge-only intent env template',
)

const localIntentEnv = statusFromLocalIntentEnv()
const templateKeys = parseEnvKeys(templateRel)
const legacyKeys = parseEnvKeys(legacyFullRemoteEnvRel)
const blockedStages = Array.isArray(p123.payload.blockedStages) ? p123.payload.blockedStages : []
assert(p123.payload.runtimeTopology === 'edge-only-preferred', 'P147 requires P123 edge-only topology')
assert(blockedStages.some(stage => String(stage).startsWith('data-api-')), 'P147 must preserve Data API blockers')
assert(!blockedStages.some(stage => /^agent-/i.test(stage)), 'P147 must not preserve legacy remote Agent blockers as primary path')

const packet = {
  version: 1,
  gate: 'P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET',
  status: 'passed_waiting_for_edge_only_operator_evidence',
  decision: 'edge_only_operator_packet_ready_waiting_for_data_api_evidence',
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha,
  runtimeTopology: 'edge-only-preferred',
  templatePath: templateRel,
  localEnvPath: localEnvRel,
  intentPath: intentRel,
  blockedStages,
  templateKeyCount: templateKeys.length,
  localIntentEnv,
  legacyFullRemoteEnv: {
    present: legacyKeys.length > 0,
    keyCount: legacyKeys.length,
    valuesIncluded: false,
    primaryEvidence: false,
    reason: 'legacy full-remote env is kept only for explicit full-remote fallback and must not satisfy edge-only Supabase/Data API evidence',
  },
  requiredEvidence: [
    {
      key: 'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
      meaning: 'managed Data API service id or Supabase project ref',
      source: localEnvRel,
      publicSafe: true,
    },
    {
      key: 'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
      meaning: 'managed Data API HTTPS origin',
      source: localEnvRel,
      publicSafe: true,
    },
    {
      key: 'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
      meaning: 'publishable key and RLS/read policy are configured',
      source: localEnvRel,
      publicSafe: true,
    },
    {
      key: 'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY',
      meaning: 'local-only publishable key for health check',
      source: '.env.local or .env.local.sync',
      publicSafe: false,
    },
    {
      key: 'health_probe reader row',
      meaning: 'Data API returns status ok for the reader probe',
      source: 'Supabase table data',
      publicSafe: true,
    },
  ],
  operatorSteps: [
    {
      order: 1,
      label: 'Create ignored edge-only intent env',
      command: 'npm run prepare:runtime-assignment-intent-env-local',
      doneWhen: `${localEnvRel} exists and stays ignored by Git`,
    },
    {
      order: 2,
      label: 'Fill managed Data API public evidence',
      command: `edit ${localEnvRel}`,
      doneWhen: 'Data API service id/origin are non-empty and DATA_API_CONFIGURED is true',
    },
    {
      order: 3,
      label: 'Compile edge-only runtime intent',
      command: `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localEnvRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`,
      doneWhen: `${intentRel} has concrete data_api.service_id and origin`,
    },
    {
      order: 4,
      label: 'Compile public contract and operator evidence',
      command: 'npm run remote-assignment:prepare',
      doneWhen: 'generated runtime assignment contract exists without secrets',
    },
    {
      order: 5,
      label: 'Validate edge-only assignment intake',
      command: 'npm run check:remote-runtime-assignment-intake',
      doneWhen: 'only data-api-health-ready remains, or all P75 assignment blockers are cleared',
    },
    {
      order: 6,
      label: 'Run remote health from local publishable key',
      command: 'npm run remote-health:check',
      doneWhen: 'health_probe reader row returns status ok',
    },
    {
      order: 7,
      label: 'Run sealed Data API strict intake',
      command: 'npm run prepare:edge-only-data-api-strict-intake',
      doneWhen: 'P151 passes strict intake with redacted artifact and no missing Data API stages',
    },
    {
      order: 8,
      label: 'Recompute loop goal',
      command: 'npm run check:remote-operator-return-intake && npm run check:loop-next-goal-ledger',
      doneWhen: 'ledger advances to remote-health-evidence-intake or strict activation proof',
    },
  ],
  sourceEvidence: {
    operatorAssignmentEvidenceIntake: {
      file: relative(root, p123.file),
      gate: p123.payload.gate,
      status: p123.payload.status,
      blockedStages,
    },
    intentEnvTemplate: {
      file: relative(root, p146.file),
      gate: p146.payload.gate,
      status: p146.payload.status,
      localTargetPath: p146.payload.localTargetPath,
    },
  },
  boundary: {
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    storesSupabaseKeys: false,
    promotesLiveRuntime: false,
    treatsLegacyFullRemoteEnvAsPrimary: false,
    requiresRemoteAgentRuntime: false,
    containsSecrets: false,
    containsPrivateResearchMaterial: false,
    exposesProviderPlumbing: false,
    containsCandidateText: false,
  },
  nextCommand: `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localEnvRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`,
  nextStrictCommand: 'npm run prepare:edge-only-data-api-strict-intake',
}

const jsonPrivateMatches = scanNoPrivateTerms(packet)
assert(jsonPrivateMatches.length === 0, `P147 packet leaked private terms: ${jsonPrivateMatches.join(', ')}`)
const markdown = renderMarkdown(packet)
const markdownPrivateMatches = scanNoPrivateTerms(markdown)
assert(markdownPrivateMatches.length === 0, `P147 Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
assert(!JSON.stringify(packet.requiredEvidence).includes('REMOTE_AGENT'), 'P147 must not require legacy remote Agent evidence')
assert(!JSON.stringify(packet.operatorSteps).includes('apply:remote-assignment-env'), 'P147 primary sequence must not use legacy full-remote env apply')

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `edge-only-operator-evidence-packet-${stamp}.json`)
const mdPath = join(artifactDir, `edge-only-operator-evidence-packet-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`)
writeFileSync(mdPath, markdown)

console.log(JSON.stringify({
  status: packet.status,
  gate: packet.gate,
  decision: packet.decision,
  blockedStages: packet.blockedStages,
  localIntentEnvPresent: packet.localIntentEnv.present,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, mdPath),
}, null, 2))
