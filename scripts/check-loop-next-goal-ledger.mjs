#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

function summarize(item) {
  return {
    file: relative(root, item.file),
    gate: item.payload.gate || null,
    status: item.payload.status || null,
    decision: item.payload.decision
      || item.payload.releaseDecision
      || item.payload.traceDecision
      || item.payload.provisioningDecision
      || null,
    headSha: item.payload.headSha || null,
    currentHead: item.payload.currentHead || null,
    targetAssignmentPath: item.payload.targetAssignmentPath || null,
  }
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function selectNextGoal({ p120, p85, completion }) {
  const decision = p120.payload.decision
  const blockerCount = Number(p85.payload.blockerCount || 0)
  const remainingGaps = Array.isArray(completion.payload.remainingGaps)
    ? completion.payload.remainingGaps
    : []

  if (decision === 'operator_return_waiting_for_assignment') {
    return {
      id: 'operator-assignment-evidence-intake',
      title: 'Collect operator assignment evidence',
      reason: 'P120 says the operator return is still waiting for complete non-secret assignment evidence.',
      requiredHumanInputs: [
        'deployment owner',
        'hosting provider',
        'API service id',
        'Agent Runtime service id',
        'API HTTPS origin',
        'Agent Runtime HTTPS origin',
        'provider-side secret-store confirmation',
      ],
      acceptanceGates: [
        'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run',
        'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
        'npm run check:remote-runtime-assignment-intake',
        'npm run check:remote-operator-return-intake',
        'npm run check:loop-next-goal-ledger',
      ],
    }
  }

  if (decision === 'operator_return_waiting_for_health') {
    return {
      id: 'remote-health-evidence-intake',
      title: 'Verify remote API and Agent Runtime health',
      reason: 'P120 says assignment shape exists, but remote health and strict activation proof are not ready.',
      requiredHumanInputs: [
        'reachable API /health over HTTPS',
        'reachable Agent Runtime /health over HTTPS',
        'confirmed provider-side secret stores',
        'operator attestation that images match current release evidence',
      ],
      acceptanceGates: [
        'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
        'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
        'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
        'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
        'REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace',
        'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
        'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
      ],
    }
  }

  if (decision === 'operator_return_ready_for_strict_activation') {
    return {
      id: 'strict-live-activation-proof',
      title: 'Run strict live activation proof',
      reason: 'P120 says the operator return is ready for strict activation checks.',
      requiredHumanInputs: [
        'release owner approval',
        'rollback owner approval',
        'legal/privacy release confirmation',
      ],
      acceptanceGates: [
        'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
        'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
        'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
        'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
      ],
    }
  }

  if (blockerCount === 0 && remainingGaps.length === 0) {
    return {
      id: 'paid-launch-and-ownership-readiness',
      title: 'Prepare paid launch ownership readiness',
      reason: 'Runtime blockers appear clear; move to commercial ownership, rollback and paid launch gates.',
      requiredHumanInputs: [
        'payment provider owner',
        'legal owner',
        'support owner',
      ],
      acceptanceGates: [
        'npm run check:runtime-engine-completion',
        'npm run check:runtime-completion-refresh',
      ],
    }
  }

  return {
    id: 'runtime-blocker-ledger-reconciliation',
    title: 'Reconcile runtime blocker ledger',
    reason: 'P120 decision did not match a known next-goal branch; reconcile P85 and P120 evidence first.',
    requiredHumanInputs: [],
    acceptanceGates: [
      'npm run check:remote-runtime-blockers',
      'npm run check:runtime-completion-blocker-convergence',
      'npm run check:remote-operator-return-intake',
    ],
  }
}

function renderMarkdown(ledger) {
  return `# P121 Loop Next Goal Ledger

Generated: ${ledger.generatedAt}

Status: \`${ledger.status}\`

Selected goal: \`${ledger.selectedGoal.id}\`

## Why

${ledger.selectedGoal.reason}

## Acceptance Gates

${ledger.selectedGoal.acceptanceGates.map(item => `- \`${item}\``).join('\n')}

## Required Human Inputs

${ledger.selectedGoal.requiredHumanInputs.map(item => `- ${item}`).join('\n') || '- none'}

## Non-Goals

${ledger.nonGoals.map(item => `- ${item}`).join('\n')}

## Evidence

${Object.entries(ledger.sourceEvidence).map(([key, value]) => `- ${key}: \`${value.file}\` (${value.status || 'n/a'} / ${value.decision || 'n/a'})`).join('\n')}
`
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:loop-next-goal-ledger'] === 'node scripts/check-loop-next-goal-ledger.mjs',
  'package.json must expose check:loop-next-goal-ledger',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:ci-artifact-content-coverage && npm run check:loop-next-goal-ledger && npm run check:operator-return-fixture-isolation && npm run check:operator-assignment-evidence-intake && npm run check:operator-assignment-evidence-intake-artifact && npm run check:operator-assignment-env-validation-fixture && npm run check:operator-assignment-env-apply-fixture && npm run check:operator-assignment-env-template && npm run check:operator-assignment-env-file-loader && npm run check:operator-assignment-loop-command-consistency && npm run check:operator-assignment-loop-command-consistency-artifact && npm run check:operator-assignment-current-head-coherence && npm run audit:dependencies'),
  'root npm run test must run P121 after CI artifact coverage, then P122, P123, P124, P125, P126, P128, P129, P130, P131 and P132 before dependency audit',
)

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P120_REMOTE_OPERATOR_RETURN_INTAKE.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md',
  'docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md',
  'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
  'docs/product/rules/REFERENCE_WORK_PRIVACY.md',
]) {
  assert(existsSync(join(root, file)), `missing P121 prerequisite: ${file}`)
}

const p121Doc = read('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md')
for (const term of [
  'P121 Loop Next Goal Ledger',
  'check:loop-next-goal-ledger',
  'remote-health-evidence-intake',
  'operator-assignment-evidence-intake',
  'P123',
  'P128',
  'P129',
  'P130',
  'P131',
  'P132',
  'does not create services',
  'does not write',
]) {
  assert(p121Doc.includes(term), `P121 doc must include ${term}`)
}

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const p4Core = latestArtifact('p4-document-core-', payload => payload.status === 'passed', 'P4 document core')
const p4Deprecated = latestArtifact('p4-deprecated-case-logic-', payload => payload.status === 'passed', 'P4 deprecated case logic')
const publicProjection = latestArtifact('public-projection-privacy-', payload => payload.status === 'passed', 'public projection privacy')
const backwardConsistency = latestArtifact('backward-consistency-sweep-', payload => payload.status === 'passed', 'backward consistency sweep')
const referencePrivacy = latestArtifact('reference-privacy-', payload => payload.status === 'passed', 'reference privacy')
const p85 = latestArtifact('remote-runtime-blockers-', payload => payload.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'P85 blocker ledger')
const imageDrift = latestArtifact(
  'remote-assignment-image-drift-',
  payload => payload.gate === 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE'
    && (sourceWorkspaceNoGit || payload.currentHead === headSha),
  'current P113 image drift',
)
const p119 = latestArtifact(
  'remote-operator-readiness-packet-',
  payload => payload.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET'
    && (sourceWorkspaceNoGit || payload.headSha === headSha),
  'current P119 operator packet',
)
const p120 = latestArtifact(
  'remote-operator-return-intake-',
  payload => payload.gate === 'P120_REMOTE_OPERATOR_RETURN_INTAKE'
    && (sourceWorkspaceNoGit || payload.headSha === headSha),
  'current P120 operator return intake',
)
const completion = latestArtifact('runtime-completion-refresh-', payload => payload.status === 'passed', 'runtime completion refresh')

const selectedGoal = selectNextGoal({ p120, p85, completion })
const nonGoals = [
  'do not merge another frontend',
  'do not rewrite P4 constraints or kernels outside the approved rule documents',
  'do not vendor an alternate agent framework',
  'do not create remote services from CI',
  'do not write ignored assignment files from this gate',
  'do not set GitHub runtime variables before strict health proof',
  'do not promote public live runtime from fixture evidence',
  'do not expose private title lists or internal rule identifiers to public UI',
]

const ledger = {
  version: 1,
  gate: 'P121_LOOP_NEXT_GOAL_LEDGER',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  decision: 'next_goal_selected',
  headSha,
  selectedGoal,
  nonGoals,
  guardrails: {
    duplicateFrontend: 'blocked',
    ruleRewriteWithoutDocs: 'blocked',
    providerPromptPlumbingPublic: 'blocked',
    publicRuleIdentifiers: 'blocked',
    privateTitleExposure: 'blocked',
    secretWrites: 'blocked',
    livePromotionWithoutStrictProof: 'blocked',
  },
  sourceEvidence: {
    p4DocumentCore: summarize(p4Core),
    p4DeprecatedCaseLogic: summarize(p4Deprecated),
    publicProjectionPrivacy: summarize(publicProjection),
    backwardConsistencySweep: summarize(backwardConsistency),
    referencePrivacy: summarize(referencePrivacy),
    remoteRuntimeBlockers: summarize(p85),
    imageDrift: summarize(imageDrift),
    operatorReadinessPacket: summarize(p119),
    operatorReturnIntake: summarize(p120),
    runtimeCompletionRefresh: summarize(completion),
  },
}

assert(selectedGoal.id !== 'runtime-blocker-ledger-reconciliation', 'P121 could not derive a concrete next goal')
assert(
  selectedGoal.id !== 'remote-health-evidence-intake'
    || p120.payload.decision === 'operator_return_waiting_for_health',
  'remote health evidence intake must only be selected from P120 waiting-for-health evidence',
)
assert(nonGoals.length >= 8, 'P121 must carry explicit no-duplicate-work guardrails')
const jsonPrivateHits = scanNoPrivateTerms(ledger)
assert(jsonPrivateHits.length === 0, `P121 ledger leaked private terms: ${jsonPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `loop-next-goal-ledger-${stamp}.json`)
const markdownPath = join(artifactDir, `loop-next-goal-ledger-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(ledger, null, 2)}\n`)
writeFileSync(markdownPath, renderMarkdown(ledger))

const markdownPrivateHits = scanNoPrivateTerms(readFileSync(markdownPath, 'utf8'))
assert(markdownPrivateHits.length === 0, `P121 Markdown leaked private terms: ${markdownPrivateHits.join(', ')}`)

console.log(JSON.stringify({
  status: 'passed',
  gate: ledger.gate,
  selectedGoal: selectedGoal.id,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, markdownPath),
}, null, 2))
