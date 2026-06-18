#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    env: process.env,
  })
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function latest(prefix, predicate = null, label = prefix, options = {}) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run npm run test or the remote runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  assert(files.length > 0, `missing latest ${label} artifact; run the corresponding gate first`)
  let selected = null
  let fallback = null
  for (const filename of files.toReversed()) {
    const payload = JSON.parse(readFileSync(join(artifactDir, filename), 'utf8'))
    if (!fallback) fallback = { filename, payload, predicateMatched: false }
    if (!predicate || predicate(payload)) {
      selected = { filename, payload, predicateMatched: true }
      break
    }
  }
  if (!selected && options.allowFallback) selected = fallback
  assert(selected, `missing latest ${label} artifact matching expected predicate`)
  const { filename, payload, predicateMatched } = selected
  return {
    filename,
    path: join(artifactDir, filename),
    payload,
    predicateMatched,
  }
}

function array(value) {
  return Array.isArray(value) ? value : []
}

function simpleBlockedIds(value) {
  return array(value)
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return String(item.id || item.check || item.stage || 'unknown')
      return 'unknown'
    })
    .filter(Boolean)
}

function readinessBlockedIds(payload) {
  return simpleBlockedIds(payload?.blockedChecks || [])
}

function statusIsReady(payload, readyStatus = 'ready') {
  return payload?.status === readyStatus || payload?.status === 'passed'
}

function stage({
  id,
  label,
  owner,
  gate,
  ready,
  currentDecision,
  blocked,
  requiredInputs,
  nextAction,
  strictCommand,
}) {
  return {
    id,
    label,
    owner,
    gate,
    status: ready ? 'ready' : 'blocked',
    currentDecision: currentDecision || null,
    blocked: ready ? [] : Array.from(new Set(blocked.filter(Boolean))),
    requiredInputs,
    nextAction: ready ? 'No action needed for this stage.' : nextAction,
    strictCommand,
  }
}

function markdownTable(rows) {
  const header = '| Stage | Owner | Status | Gate | Next action |\n| --- | --- | --- | --- | --- |'
  const body = rows.map(item => [
    item.label,
    item.owner,
    item.status,
    item.gate,
    item.nextAction.replace(/\n/g, ' '),
  ].map(value => String(value).replace(/\|/g, '/')).join(' | '))
  return [header, ...body.map(row => `| ${row} |`)].join('\n')
}

function renderMarkdown(artifact) {
  return `# P85 Remote Runtime Blocker Ledger

Generated: ${artifact.generatedAt}

Decision: \`${artifact.decision}\`

Status: \`${artifact.status}\`

## Current Blockers

${markdownTable(artifact.stages)}

## Evidence Sources

${artifact.evidence.map(item => `- \`${item.name}\`: \`${item.file}\``).join('\n')}

## Strict Promotion Command

\`\`\`bash
${artifact.strictPromotionCommand}
\`\`\`

## Public Boundary

This ledger is safe to share with deployment operators. It contains blocker ids,
owners, gate names and non-secret next actions only. It does not contain
database URLs, Tool Bridge token values, model keys, provider API tokens,
private keys, private prompt plumbing, raw runtime state, reference-work vault contents
or representative work names.
`
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY=(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-runtime-blockers'] === 'node scripts/check-remote-runtime-blockers.mjs',
  'package.json must expose check:remote-runtime-blockers',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-blockers'),
  'root npm run test must include check:remote-runtime-blockers',
)

for (const file of [
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
  'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md',
  'docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P85 prerequisite file: ${file}`)
}

assertContains('docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md', [
  'P85 Remote Runtime Blocker Normalization',
  'remote-runtime-blockers',
  'REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true',
])
assertContains('.github/workflows/pages.yml', [
  'Upload remote runtime blocker ledger',
  'remote-runtime-blockers',
  'artifacts/runtime/remote-runtime-blockers-*.json',
])

const localAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const fixtureAssignmentPath = 'deploy/runtime-production/remote-assignment.fixture.json'
const isLocalAssignment = payload => payload?.assignmentPath === localAssignmentPath
const isFixtureAssignment = payload => payload?.assignmentPath === fixtureAssignmentPath
const headSha = currentHead()
const matchesCurrentHead = payload => payload?.headSha === headSha
const imageEvidenceArtifact = latest(
  'runtime-image-publish-evidence-',
  matchesCurrentHead,
  'runtime-image-publish-evidence current head',
  { allowFallback: true },
)
const imageEvidenceHead = imageEvidenceArtifact.payload?.headSha || null
const handoffArtifactHeadTarget = imageEvidenceHead || headSha
const matchesImageEvidenceHead = payload => payload?.expectedHeadSha === handoffArtifactHeadTarget
const handoffArtifactEvidence = latest(
  'remote-handoff-artifact-attestation-',
  matchesImageEvidenceHead,
  `remote-handoff-artifact-attestation for ${handoffArtifactHeadTarget}`,
  { allowFallback: true },
)

const evidence = {
  readiness: latest('live-runtime-readiness-'),
  remoteTrace: latest('remote-live-runtime-trace-'),
  originProvisioning: latest('remote-origin-provisioning-'),
  originExecution: latest('remote-origin-execution-'),
  imageEvidence: imageEvidenceArtifact,
  assignmentIntake: latest('remote-runtime-assignment-intake-', isLocalAssignment, 'remote-runtime-assignment-intake local assignment'),
  assignmentPack: latest('remote-assignment-execution-pack-', isLocalAssignment, 'remote-assignment-execution-pack local assignment'),
  cutover: latest('live-cutover-attestation-'),
  rollback: latest('live-rollback-rehearsal-'),
  activationControl: latest('remote-activation-control-'),
  handoffArtifact: handoffArtifactEvidence,
  assignmentFixture: latest('remote-assignment-fixture-gate-'),
  fixtureAssignmentIntake: latest('remote-runtime-assignment-intake-', isFixtureAssignment, 'remote-runtime-assignment-intake fixture'),
  fixtureAssignmentPack: latest('remote-assignment-execution-pack-', isFixtureAssignment, 'remote-assignment-execution-pack fixture'),
  referencePrivacy: latest('reference-privacy-'),
  publicProjectionPrivacy: latest('public-projection-privacy-'),
}

const readiness = evidence.readiness.payload
const remoteTrace = evidence.remoteTrace.payload
const originProvisioning = evidence.originProvisioning.payload
const originExecution = evidence.originExecution.payload
const imageEvidence = evidence.imageEvidence.payload
const assignmentIntake = evidence.assignmentIntake.payload
const assignmentPack = evidence.assignmentPack.payload
const cutover = evidence.cutover.payload
const rollback = evidence.rollback.payload
const activationControl = evidence.activationControl.payload
const handoffArtifact = evidence.handoffArtifact.payload
const assignmentFixture = evidence.assignmentFixture.payload
const fixtureAssignmentIntake = evidence.fixtureAssignmentIntake.payload
const fixtureAssignmentPack = evidence.fixtureAssignmentPack.payload
const referencePrivacy = evidence.referencePrivacy.payload
const publicProjectionPrivacy = evidence.publicProjectionPrivacy.payload
const handoffArtifactPassed = (
  handoffArtifact.status === 'passed'
  || handoffArtifact.handoff?.decision === 'assignment_handoff_ready_for_operator'
)
const imageEvidenceMatchesCurrentHead = imageEvidence.headSha === headSha
const handoffArtifactMatchesImageEvidence = Boolean(
  imageEvidence.headSha && handoffArtifact.expectedHeadSha === imageEvidence.headSha,
)

const stages = [
  stage({
    id: 'runtime-images-published',
    label: 'Runtime images published',
    owner: 'release engineering',
    gate: 'P72 / check:runtime-image-publish-evidence',
    ready: imageEvidence.status === 'passed' && imageEvidenceMatchesCurrentHead,
    currentDecision: `${imageEvidence.status || 'unknown'} / ${imageEvidence.headSha || 'no-head'}`,
    blocked: [
      imageEvidence.status === 'passed' ? '' : imageEvidence.reason || 'runtime-image-evidence-missing',
      imageEvidenceMatchesCurrentHead ? '' : 'runtime-image-evidence-current-head',
    ],
    requiredInputs: ['successful Publish Runtime Images run for current commit'],
    nextAction: 'Run the Publish Runtime Images workflow for the current HEAD, then run P72 in strict mode.',
    strictCommand: 'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
  }),
  stage({
    id: 'remote-assignment-file-present',
    label: 'Remote service assignment exists',
    owner: 'deployment operator',
    gate: 'P75/P79 assignment file',
    ready: assignmentIntake.decision !== 'remote_assignment_missing'
      && assignmentPack.decision !== 'assignment_execution_waiting_for_assignment',
    currentDecision: `${assignmentIntake.decision || 'unknown'} / ${assignmentPack.decision || 'unknown'}`,
    blocked: [
      ...simpleBlockedIds(assignmentIntake.blockedStages),
      ...simpleBlockedIds(assignmentPack.blockedStages),
    ],
    requiredInputs: ['deploy/runtime-production/remote-assignment.local.json with non-secret service evidence'],
    nextAction: 'Copy the assignment example to the ignored local assignment file and fill service ids, origins, image refs and secret-store confirmation flags.',
    strictCommand: 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-assignment-execution-pack',
  }),
  stage({
    id: 'remote-assignment-health-ready',
    label: 'Remote assignment health ready',
    owner: 'backend runtime owner',
    gate: 'P75 / check:remote-runtime-assignment-intake',
    ready: assignmentIntake.decision === 'remote_assignment_ready',
    currentDecision: assignmentIntake.decision,
    blocked: simpleBlockedIds(assignmentIntake.blockedStages),
    requiredInputs: ['remote API /health ready', 'remote Agent /health ready', 'provider-secret-store flags attested'],
    nextAction: 'Make both remote /health endpoints pass and rerun P75 strict with the assignment file.',
    strictCommand: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
  }),
  stage({
    id: 'remote-origin-executed',
    label: 'Remote origin execution ready',
    owner: 'platform operator',
    gate: 'P73 / check:remote-origin-execution',
    ready: originExecution.executionDecision === 'remote_origin_execution_ready',
    currentDecision: originExecution.executionDecision,
    blocked: simpleBlockedIds(originExecution.blockedStages),
    requiredInputs: ['service ids', 'HTTPS origins', 'provider-secret-store flags', 'health checks'],
    nextAction: 'Provision the remote API and Agent services, configure provider secret stores, and expose healthy HTTPS origins.',
    strictCommand: 'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
  }),
  stage({
    id: 'remote-origin-provisioned',
    label: 'Remote origin provisioned',
    owner: 'platform operator',
    gate: 'P66 / check:remote-origin-provisioning',
    ready: originProvisioning.provisioningDecision === 'ready_for_public_live_runtime',
    currentDecision: originProvisioning.provisioningDecision,
    blocked: simpleBlockedIds(originProvisioning.blockedStages),
    requiredInputs: ['VITE_API_ORIGIN', 'VITE_AGENT_RUNTIME_BASE_URL', 'VITE_PUBLIC_RUNTIME_MODE=live'],
    nextAction: 'Set non-secret live runtime variables only after both origins are healthy.',
    strictCommand: 'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
  }),
  stage({
    id: 'live-readiness',
    label: 'Public live readiness',
    owner: 'release operator',
    gate: 'P23 / audit:live-runtime-readiness',
    ready: readiness.status === 'ready',
    currentDecision: readiness.status,
    blocked: readinessBlockedIds(readiness),
    requiredInputs: ['live mode', 'API origin', 'Agent origin', 'remote health', 'Creator workflow preflight'],
    nextAction: 'Clear every blocked check in the live readiness ledger before enabling public live runtime.',
    strictCommand: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  }),
  stage({
    id: 'remote-live-trace',
    label: 'Remote live runtime trace',
    owner: 'runtime owner',
    gate: 'P65 / check:remote-live-runtime-trace',
    ready: remoteTrace.traceDecision === 'remote_live_trace_ready',
    currentDecision: remoteTrace.traceDecision,
    blocked: simpleBlockedIds(remoteTrace.blockedChecks),
    requiredInputs: ['remote Creator preflight returns public candidate', 'Reader trace remains non-internal'],
    nextAction: 'Run the remote Creator seed-to-candidate path through the Agent Runtime and Tool Bridge until public projection passes.',
    strictCommand: 'REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace',
  }),
  stage({
    id: 'live-cutover-attested',
    label: 'Live cutover attested',
    owner: 'release owner',
    gate: 'P76 / check:live-cutover-attestation',
    ready: cutover.decision === 'live_cutover_attested',
    currentDecision: cutover.decision,
    blocked: simpleBlockedIds(cutover.blockedStages),
    requiredInputs: ['assignment attestation', 'origin execution', 'origin provisioning', 'readiness ledger'],
    nextAction: 'Attest service ids and secret-store flags, then rerun P76 strict after P73/P66/P23 are ready.',
    strictCommand: 'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
  }),
  stage({
    id: 'rollback-rehearsed',
    label: 'Rollback rehearsal ready',
    owner: 'release owner',
    gate: 'P77 / check:live-rollback-rehearsal',
    ready: rollback.decision === 'live_rollback_rehearsed' || rollback.decision === 'live_rollback_static_preview_verified',
    currentDecision: rollback.decision,
    blocked: simpleBlockedIds(rollback.blockedStages),
    requiredInputs: ['static preview health', 'rollback owner/run id before strict live cutover'],
    nextAction: 'Keep static rollback evidence green and add owner/run confirmation before strict live mode.',
    strictCommand: 'REQUIRE_LIVE_ROLLBACK_REHEARSED=true npm run check:live-rollback-rehearsal',
  }),
  stage({
    id: 'privacy-release-evidence',
    label: 'Privacy release evidence',
    owner: 'privacy/release reviewer',
    gate: 'P80/P83 / privacy scans',
    ready: referencePrivacy.status === 'passed' && publicProjectionPrivacy.status === 'passed',
    currentDecision: `${referencePrivacy.status || 'unknown'} / ${publicProjectionPrivacy.status || 'unknown'}`,
    blocked: [
      referencePrivacy.status === 'passed' ? '' : 'reference-privacy',
      publicProjectionPrivacy.status === 'passed' ? '' : 'public-projection-privacy',
    ],
    requiredInputs: ['reference privacy scan', 'public projection privacy scan'],
    nextAction: 'Fix any public rule, artifact or built Pages leak before live release.',
    strictCommand: 'npm run scan:reference-privacy && npm run check:public-projection-privacy',
  }),
  stage({
    id: 'assignment-fixture-contract',
    label: 'Assignment fixture contract',
    owner: 'release engineering',
    gate: 'P81 / check:remote-assignment-fixture',
    ready: assignmentFixture.status === 'passed'
      && fixtureAssignmentPack.decision === 'assignment_execution_pack_ready'
      && fixtureAssignmentIntake.decision === 'remote_assignment_pending_health',
    currentDecision: `${assignmentFixture.status || 'unknown'} / ${fixtureAssignmentPack.decision || 'unknown'} / ${fixtureAssignmentIntake.decision || 'unknown'}`,
    blocked: [
      ...simpleBlockedIds(assignmentFixture.blockedStages),
      fixtureAssignmentPack.decision === 'assignment_execution_pack_ready' ? '' : 'fixture-pack-not-ready',
      fixtureAssignmentIntake.decision === 'remote_assignment_pending_health' ? '' : 'fixture-health-boundary-not-held',
    ],
    requiredInputs: ['reserved .invalid fixture remains safe', 'P79 ready on fixture', 'P75 pending health on fixture'],
    nextAction: 'Fix the fixture if it can no longer prove command generation without claiming remote health.',
    strictCommand: 'npm run check:remote-assignment-fixture',
  }),
  stage({
    id: 'handoff-artifact-content',
    label: 'Handoff artifact content',
    owner: 'release engineering',
    gate: 'P89 / check:remote-assignment-handoff-artifact',
    ready: handoffArtifactPassed
      && handoffArtifact.gate === 'P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION'
      && handoffArtifactMatchesImageEvidence,
    currentDecision: `${handoffArtifact.status || 'legacy_no_status'} / ${handoffArtifact.handoff?.decision || 'unknown'}`,
    blocked: [
      ...simpleBlockedIds(handoffArtifact.handoff?.blockedStages),
      handoffArtifactMatchesImageEvidence ? '' : 'handoff-artifact-image-head-mismatch',
    ],
    requiredInputs: ['current-run remote assignment handoff artifact', 'P89 attestation for current image head'],
    nextAction: 'Regenerate the remote assignment handoff after current images are published, then rerun P89 before publishing the blocker ledger.',
    strictCommand: 'REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_READY=true npm run check:remote-assignment-handoff-artifact',
  }),
  stage({
    id: 'activation-control',
    label: 'Activation control board',
    owner: 'release owner',
    gate: 'P78 / check:remote-runtime-activation-control',
    ready: activationControl.decision === 'remote_activation_ready_for_cutover',
    currentDecision: activationControl.decision,
    blocked: simpleBlockedIds(activationControl.blockedStages),
    requiredInputs: ['images', 'assignment', 'cutover attestation', 'rollback evidence'],
    nextAction: 'Clear the P78 blocked stages in order; do not switch public live mode from frontend code.',
    strictCommand: 'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
  }),
]

const blockedStages = stages.filter(item => item.status !== 'ready')
const decision = blockedStages.length
  ? 'remote_runtime_waiting_for_operator_inputs'
  : 'remote_runtime_ready_for_strict_cutover'
const artifact = {
  version: 1,
  gate: 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION',
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha,
  required,
  status: blockedStages.length ? 'blocked' : 'ready',
  decision,
  blockerCount: blockedStages.length,
  stages,
  evidence: Object.entries(evidence).map(([name, item]) => ({ name, file: item.filename })),
  sourceEvidence: {
    imagePublishEvidence: {
      status: imageEvidence.status,
      headSha: imageEvidence.headSha || null,
      runId: imageEvidence.runId || null,
      file: evidence.imageEvidence.filename,
      currentHead: headSha,
      headMatchesCurrent: imageEvidenceMatchesCurrentHead,
      selectedByCurrentHead: evidence.imageEvidence.predicateMatched,
    },
    handoffArtifact: {
      status: handoffArtifact.status || (handoffArtifactPassed ? 'passed' : null),
      expectedHeadSha: handoffArtifact.expectedHeadSha || null,
      decision: handoffArtifact.handoff?.decision || null,
      file: evidence.handoffArtifact.filename,
      targetHeadSha: handoffArtifactHeadTarget,
      headMatchesImageEvidence: handoffArtifactMatchesImageEvidence,
      selectedByImageEvidenceHead: evidence.handoffArtifact.predicateMatched,
    },
  },
  strictPromotionCommand: 'REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers',
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `remote runtime blocker ledger leaked private terms: ${privateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `remote-runtime-blockers-${stamp}.json`)
const mdPath = join(artifactDir, `remote-runtime-blockers-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`)
writeFileSync(mdPath, renderMarkdown(artifact))

if (required && artifact.status !== 'ready') {
  console.error(JSON.stringify({ ...artifact, artifactPath: jsonPath, markdownArtifactPath: mdPath }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_remote_runtime_blockers',
  decision,
  blockerCount: artifact.blockerCount,
  artifactPath: jsonPath,
  markdownArtifactPath: mdPath,
  blockedStages: blockedStages.map(item => item.id),
}, null, 2))
