export const creatorAgentRoleNames = Object.freeze([
  'Radar',
  'Planner',
  'Orchestrator',
  'Architect',
  'Writer',
  'Observer',
  'Reflector',
  'Normalizer',
  'Auditor',
  'Reviser',
])

const initialPlans = Object.freeze({
  candidate_search: ['Planner'],
  direct_scene_draft: ['Writer'],
  scene_draft: ['Architect', 'Writer'],
  scene_author_direction_draft_review: ['Auditor'],
  manual_recall_adherence_review: ['Auditor'],
  manual_recall_adherence_review_evidence_revision: ['Auditor'],
  literary_review: ['Auditor'],
  literary_review_revision: ['Auditor'],
  literary_review_verification: ['Auditor'],
  advisory_craft_verification: ['Auditor'],
  paired_literary_comparison: ['Auditor'],
  paired_literary_comparison_revision: ['Auditor'],
  paired_literary_comparison_verification: ['Auditor'],
  paired_literary_comparison_verification_revision: ['Auditor'],
  longform_continuity_review: ['Auditor'],
  longform_continuity_verification: ['Auditor'],
  long_range_story_thread_review: ['Observer'],
  long_range_story_thread_revision: ['Observer'],
  long_range_story_thread_verification: ['Auditor'],
  state_evidence: ['Observer'],
  state_evidence_review: ['Auditor'],
  character_simulation_summary: ['Reflector'],
  character_simulation_review: ['Auditor'],
  local_repair: ['Reviser'],
  local_repair_review: ['Auditor'],
})

export function creatorWorkingAgentExecutionPlan(operation, attempt = 'initial') {
  if (attempt === 'schema_repair') {
    return operation === 'literary_review_verification' ? ['Auditor'] : ['Normalizer']
  }
  const plan = initialPlans[operation]
  if (!plan) throw new Error(`unsupported_creator_working_agent_operation:${operation}`)
  return [...plan]
}

export function creatorWorkingAgentRoleRuntimeSummary() {
  const activeRoles = new Set(Object.values(initialPlans).flat())
  activeRoles.add('Normalizer')
  return creatorAgentRoleNames.map(role => ({
    role,
    status: activeRoles.has(role) ? 'wired' : 'contract_only',
    note: role === 'Radar'
      ? 'Trend discovery stays outside the private chapter-writing request.'
      : role === 'Orchestrator'
        ? 'CreationDecisionWorkflow owns deterministic orchestration without a model call.'
        : null,
  }))
}
