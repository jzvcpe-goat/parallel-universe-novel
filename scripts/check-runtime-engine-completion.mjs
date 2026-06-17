#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function latestReadinessLedger() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => /^live-runtime-readiness-.+\.json$/.test(name))
    .sort()
  if (!files.length) return null
  const file = join(artifactDir, files.at(-1))
  return {
    path: file,
    payload: JSON.parse(readFileSync(file, 'utf8')),
  }
}

const runtimeRules = readJson('docs/product/rules/genre-runtime-rules.v1.json')
const packageJson = readJson('package.json')
const readinessLedger = latestReadinessLedger()

const componentStatuses = new Set(['ready', 'partial', 'blocked'])
const requiredComponentIds = [
  'narrative-runtime-engine',
  'world-engine',
  'genre-kernel',
  'time-engine',
  'state-writeback',
  'model-orchestration',
  'quality-brake',
  'agent-eval',
  'codex-harness',
  'web-reader-entry',
  'creator-studio',
  'commercial-release-chain',
]

const components = [
  {
    id: 'narrative-runtime-engine',
    name: 'Narrative Runtime Engine',
    status: 'partial',
    evidence: [
      'packages/agent-runtime/src/types.ts',
      'packages/agent-runtime/src/workflows.ts',
      'packages/agent-runtime/src/workflows.test.ts',
      'backend/src/narrativeos/services/product_runtime.py',
      'scripts/check-studio-canon-trace.mjs',
      'scripts/check-world-instance-writeback.mjs',
      'scripts/check-reader-branch-publish.mjs',
      'scripts/check-branch-publish-rollback-fixture.mjs',
      'scripts/check-branch-publish-authorization.mjs',
      'scripts/check-branch-commit-draft.mjs',
      'scripts/check-runtime-artifact-contract.mjs',
      'scripts/smoke-creator-chain.mjs',
      'docs/backend/P56_STUDIO_CANON_TRACE_GATE.md',
      'docs/backend/P58_READER_BRANCH_PUBLISH_CANDIDATE_GATE.md',
      'docs/backend/P59_DATABASE_TRANSACTION_ROLLBACK_FIXTURE.md',
      'docs/backend/P60_BRANCH_PUBLISH_AUTHORIZATION_GATE.md',
      'docs/backend/P61_BRANCH_COMMIT_DRAFT_GATE.md',
      'docs/product/breakpoints/00_NARRATIVE_RUNTIME_ENGINE.md',
    ],
    requiredText: [
      ['packages/agent-runtime/src/types.ts', 'RuntimeArtifact'],
      ['packages/agent-runtime/src/types.ts', 'stateWritebackPreview'],
      ['packages/agent-runtime/src/types.ts', 'timeConsistencyReport'],
      ['packages/agent-runtime/src/types.ts', 'qualityBrakeReport'],
      ['packages/agent-runtime/src/types.ts', 'branchGenerationResult'],
      ['backend/src/narrativeos/services/product_runtime.py', 'world_instance_patch_candidate'],
      ['backend/src/narrativeos/services/product_runtime.py', 'studio_trace'],
      ['backend/src/narrativeos/services/product_runtime.py', 'quality_report_hash'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_candidate_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'database_transaction_rollback_fixture'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_authorization_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_commit_draft_ledger_only'],
      ['scripts/check-studio-canon-trace.mjs', 'Studio quality evaluation to confirmed canon ledger trace'],
      ['scripts/check-world-instance-writeback.mjs', 'world instance writeback candidate gate'],
      ['scripts/check-reader-branch-publish.mjs', 'reader branch publish candidate gate'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'branch publish database transaction rollback fixture'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch publish authorization gate'],
      ['scripts/check-branch-commit-draft.mjs', 'branch commit draft gate'],
      ['scripts/check-runtime-artifact-contract.mjs', 'checkedProfiles'],
    ],
    openGaps: [
      'Studio canon confirmation and Reader branch publish candidate are proven locally, but production public branch publish is not yet proven against the same remote runtime run trace.',
      'Production branch table persistence remains outside the current ledger-only, candidate-ledger, rollback-fixture, authorization-ledger and commit-draft proof.',
    ],
    nextGate: 'Add reader/studio runtime facade E2E after remote Runtime is live.',
  },
  {
    id: 'world-engine',
    name: '世界引擎',
    status: 'partial',
    evidence: [
      'backend/src/narrativeos/worldpacks/registry.py',
      'backend/src/narrativeos/models.py',
      'backend/src/narrativeos/persistence/repositories.py',
      'backend/src/narrativeos/services/product_runtime.py',
      'backend/tests/test_product_runtime_api.py',
      'scripts/check-reader-branch-publish.mjs',
      'scripts/check-branch-publish-rollback-fixture.mjs',
      'scripts/check-branch-publish-authorization.mjs',
      'scripts/check-branch-commit-draft.mjs',
      'scripts/check-world-instance-writeback.mjs',
      'backend/specs/worldpack.schema.json',
      'app/src/features/parallel-universe/types.ts',
      'app/src/features/parallel-universe/data.ts',
    ],
    requiredText: [
      ['backend/src/narrativeos/worldpacks/registry.py', 'FileSystemWorldRegistry'],
      ['backend/src/narrativeos/models.py', 'WorldBible'],
      ['backend/src/narrativeos/persistence/repositories.py', 'save_route_choice'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_writeback_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'world_instance_writeback_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'world_instance_patch_candidate_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_candidate_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'database_transaction_rollback_fixture'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_authorization_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_commit_draft_ledger_only'],
      ['backend/tests/test_product_runtime_api.py', 'test_scene_advance_persists_reader_branch_trace'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_candidate_consumes_route_choice_and_time_engine'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_rollback_fixture_proves_database_transaction_boundary'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_authorization_requires_operator_quality_and_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_commit_draft_requires_authorization_and_proves_multitable_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'world_instance_patch_candidate'],
      ['scripts/check-reader-branch-publish.mjs', 'branch_publish_candidate_ledger_only'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'rollback_fixture_only'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch_publish_authorization_ledger_only'],
      ['scripts/check-branch-commit-draft.mjs', 'branch_commit_draft_ledger_only'],
      ['scripts/check-world-instance-writeback.mjs', 'WorldInstance patch candidate'],
      ['app/src/features/parallel-universe/types.ts', 'WorldTemplate'],
    ],
    openGaps: [
      'Reader route-choice ledger, TimeEngine consumption, branch publish candidates, authorization candidates and commit drafts are proven, but production public branch publish is still not part of the same P45 runtime proof.',
      'Production branch tables and public publish are not yet proven through runtime facade.',
    ],
    nextGate: 'Add production release owner gate and production branch table migration plan.',
  },
  {
    id: 'genre-kernel',
    name: '类型内核',
    status: 'ready',
    evidence: [
      'docs/product/rules/genre-runtime-rules.v1.json',
      'docs/product/rules/GENRE_KERNEL_RULES.md',
      'packages/agent-runtime/src/constraints.ts',
      'packages/agent-runtime/src/workflows.test.ts',
      'scripts/scan-p4-rule-source.mjs',
      'scripts/check-runtime-rule-handshake.mjs',
    ],
    requiredText: [
      ['docs/product/rules/genre-runtime-rules.v1.json', 'genreKernels'],
      ['packages/agent-runtime/src/workflows.test.ts', 'every document profile can be explicitly selected'],
      ['scripts/scan-p4-rule-source.mjs', 'GenreKernel'],
    ],
    openGaps: [],
    nextGate: 'Keep scan:p4-rule-source and check:runtime-rule-handshake required in root test.',
  },
  {
    id: 'time-engine',
    name: '时间引擎',
    status: 'partial',
    evidence: [
      'packages/agent-runtime/src/types.ts',
      'packages/agent-runtime/src/workflows.ts',
      'packages/agent-runtime/src/timeEngine.ts',
      'packages/agent-runtime/src/timeEngine.test.ts',
      'backend/src/narrativeos/api/product_runtime.py',
      'backend/src/narrativeos/services/product_runtime.py',
      'backend/tests/test_product_runtime_api.py',
      'scripts/check-runtime-artifact-contract.mjs',
      'scripts/check-time-engine-contract.mjs',
      'docs/backend/P49_TIME_ENGINE_CONTRACT.md',
      'docs/backend/P57_FASTAPI_TIME_ENGINE_SERVICE.md',
      'docs/product/breakpoints/00_NARRATIVE_RUNTIME_ENGINE.md',
    ],
    requiredText: [
      ['packages/agent-runtime/src/types.ts', 'timeControls'],
      ['packages/agent-runtime/src/types.ts', 'timeConsistencyReport'],
      ['packages/agent-runtime/src/timeEngine.ts', 'simulateKernelEventDensity'],
      ['packages/agent-runtime/src/timeEngine.test.ts', 'Poisson and Hawkes'],
      ['backend/src/narrativeos/api/product_runtime.py', '/v1/timeline/worldlines/{worldline_id}/time-engine/candidates'],
      ['backend/src/narrativeos/services/product_runtime.py', 'plan_time_events'],
      ['backend/src/narrativeos/services/product_runtime.py', 'time_event_candidate_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'fastapi_durable_time_engine'],
      ['backend/tests/test_product_runtime_api.py', 'test_time_engine_persists_durable_candidate_events'],
      ['scripts/check-time-engine-contract.mjs', 'time-engine-contract'],
      ['scripts/check-runtime-artifact-contract.mjs', 'timeConsistencyReport must pass'],
    ],
    openGaps: [
      'FastAPI TimeEngine persists candidate density and Reader branch publish candidate consumes it, but production public branch publish does not yet apply fitted event-density or aftershock state.',
      'Production telemetry fitting remains a future gate.',
    ],
    nextGate: 'Add fitted TimeEngine telemetry consumption to production branch publish.',
  },
  {
    id: 'state-writeback',
    name: '状态回写',
    status: 'partial',
    evidence: [
      'packages/agent-runtime/src/types.ts',
      'packages/agent-runtime/src/workflows.ts',
      'backend/src/narrativeos/api/tool_bridge.py',
      'backend/src/narrativeos/api/product_runtime.py',
      'backend/src/narrativeos/services/product_runtime.py',
      'backend/src/narrativeos/persistence/repositories.py',
      'backend/tests/test_tool_bridge_api.py',
      'backend/tests/test_product_runtime_api.py',
      'scripts/smoke-creator-chain.mjs',
      'scripts/check-state-writeback-safety.mjs',
      'scripts/check-reader-branch-trace.mjs',
      'scripts/check-reader-branch-publish.mjs',
      'scripts/check-branch-publish-rollback-fixture.mjs',
      'scripts/check-branch-publish-authorization.mjs',
      'scripts/check-branch-commit-draft.mjs',
      'scripts/check-world-instance-writeback.mjs',
      'scripts/check-studio-canon-trace.mjs',
      'docs/backend/P51_STATE_WRITEBACK_SAFETY_GATE.md',
      'docs/backend/P53_READER_BRANCH_TRACE_GATE.md',
      'docs/backend/P55_WORLD_INSTANCE_WRITEBACK_GATE.md',
      'docs/backend/P56_STUDIO_CANON_TRACE_GATE.md',
      'docs/backend/P58_READER_BRANCH_PUBLISH_CANDIDATE_GATE.md',
      'docs/backend/P59_DATABASE_TRANSACTION_ROLLBACK_FIXTURE.md',
      'docs/backend/P60_BRANCH_PUBLISH_AUTHORIZATION_GATE.md',
      'docs/backend/P61_BRANCH_COMMIT_DRAFT_GATE.md',
    ],
    requiredText: [
      ['packages/agent-runtime/src/types.ts', 'stateWritebackPreview'],
      ['backend/tests/test_tool_bridge_api.py', 'stateDeltaCandidate'],
      ['backend/src/narrativeos/api/product_runtime.py', 'Idempotency-Key'],
      ['backend/src/narrativeos/services/product_runtime.py', 'route_choice_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'idempotent_replay'],
      ['backend/src/narrativeos/services/product_runtime.py', 'rollback_plan'],
      ['backend/src/narrativeos/services/product_runtime.py', 'studio_trace'],
      ['backend/src/narrativeos/services/product_runtime.py', 'quality_report_hash'],
      ['backend/src/narrativeos/persistence/repositories.py', 'list_route_choices'],
      ['backend/src/narrativeos/services/product_runtime.py', 'world_instance_patch_candidate'],
      ['backend/src/narrativeos/services/product_runtime.py', 'world_instance_patch_candidate_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_candidate_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'database_transaction_rollback_fixture'],
      ['backend/src/narrativeos/services/product_runtime.py', 'rollback_fixture_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_publish_authorization_ledger_only'],
      ['backend/src/narrativeos/services/product_runtime.py', 'branch_commit_draft_ledger_only'],
      ['backend/src/narrativeos/persistence/repositories.py', 'prove_analytics_event_transaction_rollback'],
      ['backend/src/narrativeos/persistence/repositories.py', 'prove_branch_commit_multitable_transaction_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'idempotency_key_required'],
      ['backend/tests/test_product_runtime_api.py', 'test_scene_advance_persists_reader_branch_trace'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_candidate_consumes_route_choice_and_time_engine'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_rollback_fixture_proves_database_transaction_boundary'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_authorization_requires_operator_quality_and_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_commit_draft_requires_authorization_and_proves_multitable_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'world_instance_writeback_summary'],
      ['scripts/check-state-writeback-safety.mjs', 'state writeback commit safety'],
      ['scripts/check-reader-branch-trace.mjs', 'reader branch trace gate'],
      ['scripts/check-reader-branch-publish.mjs', 'reader branch publish candidate gate'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'branch publish database transaction rollback fixture'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch publish authorization gate'],
      ['scripts/check-branch-commit-draft.mjs', 'branch commit draft gate'],
      ['scripts/check-world-instance-writeback.mjs', 'world instance writeback candidate gate'],
      ['scripts/check-studio-canon-trace.mjs', 'Studio quality evaluation to confirmed canon ledger trace'],
      ['scripts/smoke-creator-chain.mjs', 'canon_written'],
      ['scripts/smoke-creator-chain.mjs', 'branch_written'],
    ],
    openGaps: [
      'Canon ledger commit now has idempotency and rollback-plan proof, but transactional multi-table write is not proven.',
      'Reader branch publish candidate now consumes route-choice and TimeEngine candidate ledgers; P59 proves rollback; P60 proves authorization; P61 proves commit draft; production public branch publish is still not proven.',
    ],
    nextGate: 'Add production public publish release owner gate and production branch table migration plan.',
  },
  {
    id: 'model-orchestration',
    name: '多模型编排',
    status: 'partial',
    evidence: [
      'packages/agent-runtime/src/agents.ts',
      'packages/agent-runtime/src/workflows.ts',
      'backend/src/narrativeos/providers.py',
      'backend/src/narrativeos/services/provider_routing.py',
      'scripts/check-provider-agnostic-config.mjs',
      'docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md',
    ],
    requiredText: [
      ['packages/agent-runtime/src/agents.ts', 'AgentContract'],
      ['backend/src/narrativeos/providers.py', 'LLMBackend'],
      ['scripts/check-provider-agnostic-config.mjs', 'openai_compatible'],
    ],
    openGaps: [
      'Provider abstraction is model-agnostic, but public remote live mode is still disabled.',
      'Cost-aware multi-provider routing is not proven in public Creator flow.',
    ],
    nextGate: 'Add remote provider smoke with budget/cost ledger after API and Agent origins are configured.',
  },
  {
    id: 'quality-brake',
    name: '质量刹车',
    status: 'partial',
    evidence: [
      'packages/agent-runtime/src/workflows.ts',
      'packages/agent-runtime/src/workflows.test.ts',
      'backend/src/narrativeos/api/product_runtime.py',
      'backend/src/narrativeos/services/product_runtime.py',
      'backend/src/narrativeos/services/quality_gate.py',
      'backend/tests/test_product_runtime_api.py',
      'scripts/check-state-writeback-safety.mjs',
      'scripts/check-branch-publish-authorization.mjs',
      'scripts/check-studio-canon-trace.mjs',
      'scripts/check-runtime-artifact-contract.mjs',
    ],
    requiredText: [
      ['packages/agent-runtime/src/workflows.ts', 'qualityBrakeWorkflow'],
      ['packages/agent-runtime/src/types.ts', 'qualityBrakeReport'],
      ['packages/agent-runtime/src/workflows.test.ts', 'quality brake suggests repair without committing candidate text'],
      ['backend/tests/test_product_runtime_api.py', 'quality_gate_passed'],
      ['backend/tests/test_product_runtime_api.py', 'quality_report_hash'],
      ['backend/tests/test_product_runtime_api.py', 'operator_confirmation_required'],
      ['backend/src/narrativeos/services/product_runtime.py', 'can_authorize_branch_publish'],
      ['scripts/check-state-writeback-safety.mjs', 'confirmed canon commit requires Idempotency-Key'],
      ['scripts/check-branch-publish-authorization.mjs', 'requires structural quality gate and rollback fixture'],
      ['scripts/check-studio-canon-trace.mjs', 'quality_report_hash'],
    ],
    openGaps: [
      'Canon ledger publishing is gated by quality, confirmation and idempotency; branch authorization is gated by operator confirmation and structural quality, but production public publish is not proven.',
      'Reader-facing live generation text quality is not yet gated by the same production quality brake.',
    ],
    nextGate: 'Add Reader live-generation text quality gate and production public publish hard gate.',
  },
  {
    id: 'agent-eval',
    name: 'Agent Eval',
    status: 'partial',
    evidence: [
      'backend/src/narrativeos/eval/service.py',
      'backend/src/narrativeos/eval/gating.py',
      'backend/tests/test_eval_scorers.py',
      'backend/tests/test_learned_assisted_gate.py',
      'scripts/check-dependency-audit.mjs',
    ],
    requiredText: [
      ['backend/src/narrativeos/eval/service.py', 'evaluate_chapter'],
      ['backend/src/narrativeos/eval/gating.py', 'decide_evaluation'],
      ['scripts/check-dependency-audit.mjs', 'upstreamMastraChain'],
    ],
    openGaps: [
      'Eval assets exist, but learned evaluator/reranker are not promoted into the public live release gate.',
      'Mastra upstream advisories are documented and monitored, not resolved upstream.',
    ],
    nextGate: 'Promote selected eval gates into runtime publish decision after dependency and model rollout are stable.',
  },
  {
    id: 'codex-harness',
    name: 'Codex Harness',
    status: 'ready',
    evidence: [
      'package.json',
      '.github/workflows/pages.yml',
      'scripts/smoke-creator-chain.mjs',
      'scripts/check-github-actions-artifacts.mjs',
      'docs/baseline/RELEASE_SYNC_MANIFEST.json',
      'docs/design-system/DEVELOPMENT_NOTES.md',
    ],
    requiredText: [
      ['package.json', 'smoke:creator-chain'],
      ['package.json', 'check:github-actions-artifacts'],
      ['.github/workflows/pages.yml', 'Check current run evidence artifacts'],
      ['docs/baseline/RELEASE_SYNC_MANIFEST.json', 'managedWithReleaseOverrides'],
    ],
    openGaps: [],
    nextGate: 'Keep root npm run test and GitHub artifact evidence gate green on every release.',
  },
  {
    id: 'web-reader-entry',
    name: 'Web 阅读入口',
    status: 'partial',
    evidence: [
      'app/src/pages/Home.tsx',
      'app/src/pages/Story.tsx',
      'app/src/pages/Library.tsx',
      'app/src/hooks/useStory.ts',
      'scripts/browser-pages-preview-e2e.mjs',
      'scripts/check-reader-branch-trace.mjs',
      'scripts/check-reader-branch-publish.mjs',
      'scripts/scan-public-ui-boundary.mjs',
    ],
    requiredText: [
      ['app/src/pages/Story.tsx', 'ReadingPaper'],
      ['app/src/pages/Story.tsx', 'source_run_id'],
      ['app/src/hooks/useStory.ts', 'useStory'],
      ['scripts/check-reader-branch-trace.mjs', 'branch_writeback_summary'],
      ['scripts/check-reader-branch-publish.mjs', 'branch_publish_candidate_ledger_only'],
      ['scripts/browser-pages-preview-e2e.mjs', '#/create'],
    ],
    openGaps: [
      'Reader Web is published as a public page, but remote live reader generation is out of scope and not proven.',
      'Reader branch publish candidate is backend-only; remote public runtime facade and production public branch publish are still disabled.',
    ],
    nextGate: 'Add reader choice remote runtime facade smoke after API/Agent deployment.',
  },
  {
    id: 'creator-studio',
    name: '创作者工作台',
    status: 'partial',
    evidence: [
      'app/src/pages/Create.tsx',
      'app/src/api/creator.ts',
      'scripts/browser-creator-e2e.mjs',
      'scripts/browser-live-runtime-local-e2e.mjs',
      'scripts/browser-live-runtime-e2e.mjs',
      'docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md',
    ],
    requiredText: [
      ['app/src/pages/Create.tsx', 'CreatorConversationPanel'],
      ['app/src/api/creator.ts', 'socratic-create'],
      ['scripts/browser-live-runtime-e2e.mjs', 'draftLength >= 300'],
      ['scripts/browser-live-runtime-e2e.mjs', 'questionCount <= 2'],
    ],
    openGaps: [
      'Local live-mode Creator chain is proven.',
      'Public Pages still reports remote runtime disabled until API and Agent HTTPS origins are configured.',
    ],
    nextGate: 'Set remote runtime GitHub variables and run required live browser QA.',
  },
  {
    id: 'commercial-release-chain',
    name: '商业化发布链路',
    status: readinessLedger?.payload?.status === 'ready' ? 'partial' : 'blocked',
    evidence: [
      '.github/workflows/pages.yml',
      'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
      'docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md',
      'scripts/check-github-actions-artifacts.mjs',
      'backend/tests/test_payment_provider_hardening.py',
      'backend/tests/test_monetization_m0.py',
    ],
    requiredText: [
      ['.github/workflows/pages.yml', 'Deploy to GitHub Pages'],
      ['docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md', 'GitHub repository variables'],
      ['scripts/check-github-actions-artifacts.mjs', 'github-pages'],
      ['backend/tests/test_payment_provider_hardening.py', 'provider-callback'],
    ],
    openGaps: readinessLedger?.payload?.blockedChecks?.length
      ? readinessLedger.payload.blockedChecks.map(id => `Public live readiness blocked: ${id}`)
      : [
          'Real payment provider, legal/privacy, and production rollback ownership must still be confirmed before paid public launch.',
        ],
    nextGate: 'Clear P23 readiness ledger blockers and production payment/legal/security owners before paid launch.',
  },
]

const violations = []

function checkFile(rel) {
  const ok = existsSync(join(root, rel))
  if (!ok) violations.push(`missing evidence file: ${rel}`)
  return ok
}

for (const id of requiredComponentIds) {
  if (!components.some(component => component.id === id)) {
    violations.push(`missing P45 component: ${id}`)
  }
}

for (const component of components) {
  if (!componentStatuses.has(component.status)) {
    violations.push(`${component.id} has invalid status ${component.status}`)
  }
  if (!component.evidence?.length) {
    violations.push(`${component.id} must list evidence files`)
  }
  if (component.status !== 'ready' && !component.openGaps?.length) {
    violations.push(`${component.id} is ${component.status} but has no open gaps`)
  }
  if (!component.nextGate) {
    violations.push(`${component.id} must define nextGate`)
  }
  for (const rel of component.evidence || []) checkFile(rel)
  for (const [rel, fragment] of component.requiredText || []) {
    if (!checkFile(rel)) continue
    const text = read(rel)
    if (!text.includes(fragment)) {
      violations.push(`${component.id} evidence ${rel} must include ${fragment}`)
    }
  }
}

assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime rules must keep representative works in encrypted vault only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime rules public reference field must stay sourceRefs')
assert(runtimeRules.constraintProfiles?.length >= 21, 'P45 expects the document registry to expose all active ConstraintProfile entries')
assert(runtimeRules.genreKernels?.length >= 21, 'P45 expects the document registry to expose all active GenreKernel entries')
assert(packageJson.scripts['check:runtime-engine-completion'] === 'node scripts/check-runtime-engine-completion.mjs', 'package.json must expose check:runtime-engine-completion')
assert(String(packageJson.scripts.test).includes('npm run check:runtime-engine-completion'), 'npm run test must include check:runtime-engine-completion')

const p45DocPath = 'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md'
if (existsSync(join(root, p45DocPath))) {
  const doc = read(p45DocPath)
  for (const component of components) {
    if (!doc.includes(`\`${component.id}\``)) {
      violations.push(`${p45DocPath} must include component id ${component.id}`)
    }
  }
  for (const required of [
    'ready',
    'partial',
    'blocked',
    'check:runtime-engine-completion',
    'runtime-readiness-ledger',
    'local-live-runtime-visual-qa',
    'github-pages',
  ]) {
    if (!doc.includes(required)) violations.push(`${p45DocPath} must include ${required}`)
  }
} else {
  violations.push(`missing ${p45DocPath}`)
}

if (violations.length) {
  console.error(`P45 runtime engine completion check failed (${violations.length})`)
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

const summary = {
  ready: components.filter(component => component.status === 'ready').length,
  partial: components.filter(component => component.status === 'partial').length,
  blocked: components.filter(component => component.status === 'blocked').length,
}

const payload = {
  status: summary.blocked > 0 ? 'passed_with_blocked_gaps' : summary.partial > 0 ? 'passed_with_open_gaps' : 'passed',
  generatedAt: new Date().toISOString(),
  summary,
  readinessLedger: readinessLedger
    ? {
        path: readinessLedger.path,
        status: readinessLedger.payload.status,
        blockedChecks: readinessLedger.payload.blockedChecks || [],
        publicUrl: readinessLedger.payload.publicUrl,
      }
    : null,
  privacy: {
    representativeWorks: runtimeRules.privacy.representativeWorks,
    publicReferenceField: runtimeRules.privacy.publicReferenceField,
  },
  components: components.map(component => ({
    id: component.id,
    name: component.name,
    status: component.status,
    evidence: component.evidence,
    openGaps: component.openGaps,
    nextGate: component.nextGate,
  })),
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-engine-completion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: payload.status,
  artifactPath,
  summary,
  components: payload.components.map(component => ({
    id: component.id,
    status: component.status,
    openGapCount: component.openGaps.length,
  })),
}, null, 2))
