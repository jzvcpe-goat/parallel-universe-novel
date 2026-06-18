import { api } from './client'

export interface ReaderRuntimeSnapshot {
  status: string
  capability_mode: 'service_contract' | string
  session_id: string
  world_id: string
  world_version_id?: string
  reader_id?: string | null
  chapter_index: number
  current_state: Record<string, unknown>
  latest_chapter?: Record<string, unknown> | null
  worldline: WorldlineRuntimeEvents
  quality_brake: QualityGate
  canon_status: 'seed' | 'candidate' | 'canon' | 'branch' | string
  paywall?: Record<string, unknown>
}

export interface SceneAdvanceRequest {
  session_id: string
  choice_id?: string
  freeform_intent?: string
  account_id?: string
  reader_id?: string
  worldline_id?: string
  branch_id?: string
  source_run_id?: string
}

export interface SceneAdvanceResponse {
  status: string
  session_id: string
  world_id?: string
  world_version_id?: string
  candidate_scene: {
    status: 'candidate' | 'blocked' | string
    chapter_view?: Record<string, unknown> | null
    reader_view?: Record<string, unknown> | null
  }
  quality_brake: QualityGate
  harness_trace: Array<{ step: string; status: string; detail: string }>
  branch_writeback?: {
    status: string
    branch_written: boolean
    write_scope: string
    source_run_id?: string
    session_id?: string
    worldline_id?: string
    branch_id?: string
    choice_id?: string
    chapter_id?: string
    choice_event_id?: number
    selected_at?: string
    rollback_plan?: Record<string, unknown>
  }
  raw_continue?: Record<string, unknown>
}

export interface WorldlineRuntimeEvents {
  worldline_id: string
  world_id: string
  source: string
  event_count: number
  route_choice_count?: number
  events: Array<Record<string, unknown>>
  branch_writeback_summary?: Record<string, unknown>
  density_summary: Record<string, unknown>
}

export interface QualityGateScores {
  content_safety?: number | null
  language_naturalness?: number | null
  pacing?: number | null
  character_consistency?: number | null
  foreshadowing_continuity?: number | null
  timeline_consistency?: number | null
  release_readiness?: number | null
  overall_score?: number | null
}

export interface QualityGateIssue {
  code: string
  severity: string
  message: string
  evidence?: string[]
  source?: string
  layer?: 'realtime_blocker' | 'warning' | 'shadow'
}

export interface AgentEvalPublishDecision {
  contract: 'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY' | string
  decision_source: 'deterministic_quality_gate' | string
  production_publish_allowed: boolean
  release_decision: 'pass' | 'rewrite' | 'block' | 'hold' | string
  blocking_reasons: string[]
  eligible_production_gates: Array<Record<string, unknown>>
  shadow_only_checks: Array<Record<string, unknown>>
  learned_gate_policy: 'shadow_until_promotion_workflow_green' | string
}

export interface QualityGate {
  status: 'waiting' | 'passed' | 'blocked' | string
  candidate_status: 'candidate' | 'canon_ready' | string
  can_commit_canon: boolean
  decision: string
  overall_score?: number | null
  blocking_reasons: string[]
  summary?: string
  scores?: QualityGateScores
  blockers?: QualityGateIssue[]
  warnings?: QualityGateIssue[]
  suggested_fixes?: string[]
  public_safe_message?: string
  studio_debug?: Record<string, unknown>
  release_decision?: 'pass' | 'rewrite' | 'block' | 'hold' | 'shadow_only' | string
  canon_commit_readiness?: {
    ready: boolean
    required_confirmation: boolean
    missing: string[]
  }
  agent_eval_publish_decision?: AgentEvalPublishDecision
}

export interface QualityEvaluateRequest {
  body: string
  candidate_id?: string
  session_id?: string
  project_id?: string
  world_id?: string
  world_version_id?: string
  source_run_id?: string
  choices?: string[]
  character_fidelity_score?: number
  ending_ready?: boolean
  paywall_required?: boolean
}

export interface QualityEvaluateResponse {
  status: 'evaluated'
  report: Record<string, unknown>
  quality_gate: QualityGate
  studio_trace?: Record<string, unknown>
}

export interface CanonCommitRequest {
  candidate_id?: string
  session_id?: string
  project_id?: string
  world_id?: string
  world_version_id?: string
  chapter_id?: string
  source_run_id?: string
  studio_trace?: Record<string, unknown>
  target_status?: 'canon' | 'branch'
  confirmed?: boolean
  confirmed_by?: string
  quality_report?: Record<string, unknown>
  idempotencyKey?: string
}

export interface CanonCommitResponse {
  status: 'blocked' | 'committed' | string
  reason?: string
  commit_id?: string
  quality_gate: QualityGate
  ledger_path?: string
  idempotent_replay?: boolean
  write_scope?: string
  rollback_plan?: Record<string, unknown>
  studio_trace?: Record<string, unknown>
  source_run_id?: string
  quality_report_hash?: string
}

export const runtimeApi = {
  getReaderSnapshot: (sessionId: string) =>
    api.post<ReaderRuntimeSnapshot>('/reader/snapshot', { session_id: sessionId }),
  advanceScene: (payload: SceneAdvanceRequest) =>
    api.post<SceneAdvanceResponse>('/scene/advance', payload),
  getWorldlineEvents: (worldlineId: string) =>
    api.get<WorldlineRuntimeEvents>(`/timeline/worldlines/${worldlineId}/loom`),
  evaluateQuality: (payload: QualityEvaluateRequest) =>
    api.post<QualityEvaluateResponse>('/quality/evaluate', payload),
  commitCanon: ({ idempotencyKey, ...payload }: CanonCommitRequest) => {
    const key = idempotencyKey
      || `studio-${payload.candidate_id || payload.chapter_id || 'candidate'}-${payload.target_status || 'canon'}`
    return api.post<CanonCommitResponse>('/canon/commit', payload, {
      headers: {
        'Idempotency-Key': key,
      },
    })
  },
}
