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
      'scripts/check-production-branch-commit.mjs',
      'scripts/check-public-branch-publish.mjs',
      'scripts/check-time-engine-telemetry-fit.mjs',
      'scripts/check-remote-live-runtime-trace.mjs',
      'scripts/check-runtime-artifact-contract.mjs',
      'scripts/smoke-creator-chain.mjs',
      'docs/backend/P56_STUDIO_CANON_TRACE_GATE.md',
      'docs/backend/P58_READER_BRANCH_PUBLISH_CANDIDATE_GATE.md',
      'docs/backend/P59_DATABASE_TRANSACTION_ROLLBACK_FIXTURE.md',
      'docs/backend/P60_BRANCH_PUBLISH_AUTHORIZATION_GATE.md',
      'docs/backend/P61_BRANCH_COMMIT_DRAFT_GATE.md',
      'docs/backend/P62_PRODUCTION_BRANCH_COMMIT_GATE.md',
      'docs/backend/P63_PRODUCTION_PUBLIC_PUBLISH_GATE.md',
      'docs/backend/P64_TIME_ENGINE_TELEMETRY_FIT_GATE.md',
      'docs/backend/P65_REMOTE_LIVE_RUNTIME_TRACE_GATE.md',
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
      ['backend/src/narrativeos/services/product_runtime.py', 'production_branch_table_private'],
      ['backend/src/narrativeos/services/product_runtime.py', 'production_branch_commit_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'reader_visible_branch_release'],
      ['backend/src/narrativeos/services/product_runtime.py', 'public_branch_release_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'production_time_engine_fit'],
      ['backend/src/narrativeos/services/product_runtime.py', 'time_engine_fit_summary'],
      ['scripts/check-studio-canon-trace.mjs', 'Studio quality evaluation to confirmed canon ledger trace'],
      ['scripts/check-world-instance-writeback.mjs', 'world instance writeback candidate gate'],
      ['scripts/check-reader-branch-publish.mjs', 'reader branch publish candidate gate'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'branch publish database transaction rollback fixture'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch publish authorization gate'],
      ['scripts/check-branch-commit-draft.mjs', 'branch commit draft gate'],
      ['scripts/check-production-branch-commit.mjs', 'production branch commit persistence gate'],
      ['scripts/check-public-branch-publish.mjs', 'production public branch publish gate'],
      ['scripts/check-time-engine-telemetry-fit.mjs', 'production TimeEngine telemetry fit gate'],
      ['scripts/check-remote-live-runtime-trace.mjs', 'hold_remote_live_trace_unproven'],
      ['scripts/check-runtime-artifact-contract.mjs', 'checkedProfiles'],
    ],
    openGaps: [
      'Studio canon confirmation, Reader branch publish candidate, private production branch persistence, Reader-visible release and TimeEngine telemetry fitting are proven locally; P65 currently holds remote live runtime trace until public origins are configured.',
      'Paid commercial launch packet remains a future product gate.',
    ],
    nextGate: 'Clear P65 remote live runtime trace blockers after remote Runtime is live.',
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
      'scripts/check-production-branch-commit.mjs',
      'scripts/check-public-branch-publish.mjs',
      'scripts/check-time-engine-telemetry-fit.mjs',
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
      ['backend/src/narrativeos/services/product_runtime.py', 'production_branch_table_private'],
      ['backend/src/narrativeos/services/product_runtime.py', 'reader_visible_branch_release'],
      ['backend/src/narrativeos/services/product_runtime.py', 'production_time_engine_fit'],
      ['backend/tests/test_product_runtime_api.py', 'test_scene_advance_persists_reader_branch_trace'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_candidate_consumes_route_choice_and_time_engine'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_rollback_fixture_proves_database_transaction_boundary'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_authorization_requires_operator_quality_and_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_commit_draft_requires_authorization_and_proves_multitable_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_production_branch_commit_requires_draft_and_release_owner'],
      ['backend/tests/test_product_runtime_api.py', 'test_public_branch_publish_requires_private_commit_and_release_controls'],
      ['backend/tests/test_product_runtime_api.py', 'test_time_engine_telemetry_fit_requires_public_release_and_operator'],
      ['backend/tests/test_product_runtime_api.py', 'world_instance_patch_candidate'],
      ['scripts/check-reader-branch-publish.mjs', 'branch_publish_candidate_ledger_only'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'rollback_fixture_only'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch_publish_authorization_ledger_only'],
      ['scripts/check-branch-commit-draft.mjs', 'branch_commit_draft_ledger_only'],
      ['scripts/check-production-branch-commit.mjs', 'production_branch_table_private'],
      ['scripts/check-public-branch-publish.mjs', 'reader_visible_branch_release'],
      ['scripts/check-time-engine-telemetry-fit.mjs', 'production_time_engine_fit'],
      ['scripts/check-world-instance-writeback.mjs', 'WorldInstance patch candidate'],
      ['app/src/features/parallel-universe/types.ts', 'WorldTemplate'],
    ],
    openGaps: [
      'Reader route-choice ledger, TimeEngine consumption, branch publish candidates, authorization candidates, commit drafts, private production branch rows, Reader-visible release rows and production TimeEngine fit rows are proven.',
      'Remote public runtime facade remains disabled.',
    ],
    nextGate: 'Add remote runtime facade proof.',
  },
  {
    id: 'genre-kernel',
    name: '类型内核',
    status: 'ready',
    evidence: [
      'docs/product/rules/genre-runtime-rules.v1.json',
      'docs/product/rules/GENRE_KERNEL_RULES.md',
      'docs/backend/P67_REFERENCE_VAULT_ACCESS_HARDENING_GATE.md',
      'scripts/check-reference-vault-access.mjs',
      'scripts/scan-reference-privacy.mjs',
      'packages/agent-runtime/src/constraints.ts',
      'packages/agent-runtime/src/workflows.test.ts',
      'scripts/scan-p4-rule-source.mjs',
      'scripts/check-runtime-rule-handshake.mjs',
    ],
    requiredText: [
      ['docs/product/rules/genre-runtime-rules.v1.json', 'genreKernels'],
      ['docs/product/rules/genre-runtime-rules.v1.json', 'encrypted_vault_only'],
      ['docs/backend/P67_REFERENCE_VAULT_ACCESS_HARDENING_GATE.md', 'team_only_decryption'],
      ['scripts/check-reference-vault-access.mjs', 'zero_plaintext_public_refs'],
      ['scripts/scan-reference-privacy.mjs', 'validateGitHistoryPrivacy'],
      ['packages/agent-runtime/src/workflows.test.ts', 'every document profile can be explicitly selected'],
      ['scripts/scan-p4-rule-source.mjs', 'GenreKernel'],
    ],
    openGaps: [],
    nextGate: 'Keep scan:p4-rule-source, check:runtime-rule-handshake, check:reference-vault-access and scan:reference-privacy required in root test.',
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
      'FastAPI TimeEngine persists candidate density, Reader branch publish candidate consumes it, and P64 persists production telemetry fitting.',
      'P65 remote live runtime trace remains held until remote origins and public runtime variables are configured.',
    ],
    nextGate: 'Clear P65 remote live runtime trace blockers.',
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
      'scripts/check-production-branch-commit.mjs',
      'scripts/check-public-branch-publish.mjs',
      'scripts/check-time-engine-telemetry-fit.mjs',
      'scripts/check-remote-live-runtime-trace.mjs',
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
      'docs/backend/P62_PRODUCTION_BRANCH_COMMIT_GATE.md',
      'docs/backend/P63_PRODUCTION_PUBLIC_PUBLISH_GATE.md',
      'docs/backend/P64_TIME_ENGINE_TELEMETRY_FIT_GATE.md',
      'docs/backend/P65_REMOTE_LIVE_RUNTIME_TRACE_GATE.md',
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
      ['backend/src/narrativeos/services/product_runtime.py', 'production_branch_table_private'],
      ['backend/src/narrativeos/services/product_runtime.py', 'production_branch_commit_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'reader_visible_branch_release'],
      ['backend/src/narrativeos/services/product_runtime.py', 'public_branch_release_summary'],
      ['backend/src/narrativeos/services/product_runtime.py', 'production_time_engine_fit'],
      ['backend/src/narrativeos/services/product_runtime.py', 'time_engine_fit_summary'],
      ['backend/src/narrativeos/persistence/repositories.py', 'prove_analytics_event_transaction_rollback'],
      ['backend/src/narrativeos/persistence/repositories.py', 'prove_branch_commit_multitable_transaction_rollback'],
      ['backend/src/narrativeos/persistence/repositories.py', 'persist_production_branch_commit'],
      ['backend/src/narrativeos/persistence/repositories.py', 'persist_public_branch_release'],
      ['backend/src/narrativeos/persistence/repositories.py', 'persist_time_engine_telemetry_fit'],
      ['backend/tests/test_product_runtime_api.py', 'idempotency_key_required'],
      ['backend/tests/test_product_runtime_api.py', 'test_scene_advance_persists_reader_branch_trace'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_candidate_consumes_route_choice_and_time_engine'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_rollback_fixture_proves_database_transaction_boundary'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_publish_authorization_requires_operator_quality_and_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_branch_commit_draft_requires_authorization_and_proves_multitable_rollback'],
      ['backend/tests/test_product_runtime_api.py', 'test_production_branch_commit_requires_draft_and_release_owner'],
      ['backend/tests/test_product_runtime_api.py', 'test_public_branch_publish_requires_private_commit_and_release_controls'],
      ['backend/tests/test_product_runtime_api.py', 'test_time_engine_telemetry_fit_requires_public_release_and_operator'],
      ['backend/tests/test_product_runtime_api.py', 'world_instance_writeback_summary'],
      ['scripts/check-state-writeback-safety.mjs', 'state writeback commit safety'],
      ['scripts/check-reader-branch-trace.mjs', 'reader branch trace gate'],
      ['scripts/check-reader-branch-publish.mjs', 'reader branch publish candidate gate'],
      ['scripts/check-branch-publish-rollback-fixture.mjs', 'branch publish database transaction rollback fixture'],
      ['scripts/check-branch-publish-authorization.mjs', 'branch publish authorization gate'],
      ['scripts/check-branch-commit-draft.mjs', 'branch commit draft gate'],
      ['scripts/check-production-branch-commit.mjs', 'production branch commit persistence gate'],
      ['scripts/check-public-branch-publish.mjs', 'production public branch publish gate'],
      ['scripts/check-time-engine-telemetry-fit.mjs', 'production TimeEngine telemetry fit gate'],
      ['scripts/check-remote-live-runtime-trace.mjs', 'remote_live_trace_ready'],
      ['scripts/check-world-instance-writeback.mjs', 'world instance writeback candidate gate'],
      ['scripts/check-studio-canon-trace.mjs', 'Studio quality evaluation to confirmed canon ledger trace'],
      ['scripts/smoke-creator-chain.mjs', 'canon_written'],
      ['scripts/smoke-creator-chain.mjs', 'branch_written'],
    ],
    openGaps: [
      'Canon ledger commit now has idempotency and rollback-plan proof, but transactional multi-table canon promotion is not proven.',
      'Reader branch publish candidate now consumes route-choice and TimeEngine candidate ledgers; P59 proves rollback; P60 proves authorization; P61 proves commit draft; P62 proves private production branch persistence; P63 proves Reader-visible public release; P64 proves production TimeEngine telemetry fitting; P65 holds remote live trace until remote services are configured.',
    ],
    nextGate: 'Clear P65 remote live runtime trace blockers.',
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
      'Canon ledger publishing is gated by quality, confirmation and idempotency; branch authorization is gated by operator confirmation and structural quality; P63 adds release owner, ops reviewer and rollback owner controls.',
      'Reader-facing live generation text quality is not yet gated by the same production quality brake against a remote runtime.',
    ],
    nextGate: 'Add Reader live-generation text quality gate against remote runtime.',
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
      'scripts/check-public-branch-publish.mjs',
      'scripts/scan-public-ui-boundary.mjs',
    ],
    requiredText: [
      ['app/src/pages/Story.tsx', 'ReadingPaper'],
      ['app/src/pages/Story.tsx', 'source_run_id'],
      ['app/src/hooks/useStory.ts', 'useStory'],
      ['scripts/check-reader-branch-trace.mjs', 'branch_writeback_summary'],
      ['scripts/check-reader-branch-publish.mjs', 'branch_publish_candidate_ledger_only'],
      ['scripts/check-public-branch-publish.mjs', 'reader_visible_branch_release'],
      ['scripts/browser-pages-preview-e2e.mjs', '#/create'],
    ],
    openGaps: [
      'Reader Web is published as a public page, but remote live reader generation is out of scope and not proven.',
      'Reader-visible public branch release is backend-proven; remote public runtime facade remains disabled.',
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
      'scripts/check-remote-live-runtime-trace.mjs',
      'scripts/check-remote-origin-provisioning.mjs',
      'docs/backend/P65_REMOTE_LIVE_RUNTIME_TRACE_GATE.md',
      'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
      'deploy/runtime-production/origin.env.example',
      'backend/tests/test_payment_provider_hardening.py',
      'backend/tests/test_monetization_m0.py',
    ],
    requiredText: [
      ['.github/workflows/pages.yml', 'Deploy to GitHub Pages'],
      ['docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md', 'GitHub repository variables'],
      ['scripts/check-github-actions-artifacts.mjs', 'github-pages'],
      ['scripts/check-remote-live-runtime-trace.mjs', 'remote_live_trace_ready'],
      ['scripts/check-remote-origin-provisioning.mjs', 'remote_origin_unprovisioned'],
      ['scripts/check-remote-origin-provisioning.mjs', 'ready_for_public_live_runtime'],
      ['deploy/runtime-production/origin.env.example', 'VITE_PUBLIC_RUNTIME_MODE=live'],
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
