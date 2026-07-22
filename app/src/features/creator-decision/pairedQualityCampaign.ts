export type PairedQualityGenerationPath = 'direct_writer' | 'architect_writer_workflow'

export interface PairedQualityCampaignDimensionResult {
  verificationDecision: 'verify' | 'reject'
  confirmedPreference: PairedQualityGenerationPath | 'tie' | null
  confirmedReasonCode: string | null
}

export interface PairedQualityCampaignHardConstraintResult {
  path: PairedQualityGenerationPath
  verificationDecision: 'verify' | 'reject'
  confirmedStatus: 'pass' | 'fail' | null
  confirmedReasonCode: string | null
}

export interface PairedQualityCampaignTrialResult {
  fixtureId: string
  confirmedDimensions: PairedQualityCampaignDimensionResult[]
  hardConstraints: PairedQualityCampaignHardConstraintResult[]
}

export interface PairedQualityCampaignSignal {
  reasonCode: string
  fixtureIds: string[]
  occurrenceCount: number
}

export interface PairedQualityCampaignTuningDecision {
  schemaVersion: 'creator-paired-quality-tuning-decision.v1'
  policy: {
    minimumDistinctFixturesForLiteraryWeakness: number
    confirmedWorkflowHardFailureRequiresImmediateReview: true
    automaticPromptMutationAllowed: false
  }
  observedWorkflowWeaknesses: PairedQualityCampaignSignal[]
  repeatedWorkflowWeaknesses: PairedQualityCampaignSignal[]
  confirmedWorkflowHardFailures: PairedQualityCampaignSignal[]
  decision: 'hold_current_workflow' | 'review_workflow_change'
  rationaleCode: 'no_repeated_workflow_weakness' | 'repeated_workflow_weakness' | 'confirmed_workflow_hard_failure'
}

function collectSignals(entries: Array<{ fixtureId: string; reasonCode: string }>) {
  const signals = new Map<string, { fixtureIds: Set<string>; occurrenceCount: number }>()
  for (const entry of entries) {
    const current = signals.get(entry.reasonCode) || { fixtureIds: new Set<string>(), occurrenceCount: 0 }
    current.fixtureIds.add(entry.fixtureId)
    current.occurrenceCount += 1
    signals.set(entry.reasonCode, current)
  }
  return [...signals.entries()]
    .map(([reasonCode, signal]) => ({
      reasonCode,
      fixtureIds: [...signal.fixtureIds].sort(),
      occurrenceCount: signal.occurrenceCount,
    }))
    .sort((left, right) => left.reasonCode.localeCompare(right.reasonCode))
}

export function decidePairedQualityCampaignTuning(input: {
  trials: PairedQualityCampaignTrialResult[]
  minimumDistinctFixturesForLiteraryWeakness?: number
}): PairedQualityCampaignTuningDecision {
  const minimumDistinctFixtures = input.minimumDistinctFixturesForLiteraryWeakness ?? 2
  if (!Number.isInteger(minimumDistinctFixtures) || minimumDistinctFixtures < 2) {
    throw new Error('minimumDistinctFixturesForLiteraryWeakness must be an integer of at least 2.')
  }
  if (new Set(input.trials.map(trial => trial.fixtureId)).size !== input.trials.length) {
    throw new Error('Paired-quality campaign trials must have distinct fixture ids.')
  }

  const observedWorkflowWeaknesses = collectSignals(input.trials.flatMap(trial => (
    trial.confirmedDimensions
      .filter(item => (
        item.verificationDecision === 'verify'
        && item.confirmedPreference === 'direct_writer'
        && item.confirmedReasonCode
      ))
      .map(item => ({ fixtureId: trial.fixtureId, reasonCode: item.confirmedReasonCode! }))
  )))
  const repeatedWorkflowWeaknesses = observedWorkflowWeaknesses.filter(
    signal => signal.fixtureIds.length >= minimumDistinctFixtures,
  )
  const confirmedWorkflowHardFailures = collectSignals(input.trials.flatMap(trial => (
    trial.hardConstraints
      .filter(item => (
        item.path === 'architect_writer_workflow'
        && item.verificationDecision === 'verify'
        && item.confirmedStatus === 'fail'
        && item.confirmedReasonCode
      ))
      .map(item => ({ fixtureId: trial.fixtureId, reasonCode: item.confirmedReasonCode! }))
  )))

  const hardFailureRequiresReview = confirmedWorkflowHardFailures.length > 0
  const repeatedWeaknessRequiresReview = repeatedWorkflowWeaknesses.length > 0
  return {
    schemaVersion: 'creator-paired-quality-tuning-decision.v1',
    policy: {
      minimumDistinctFixturesForLiteraryWeakness: minimumDistinctFixtures,
      confirmedWorkflowHardFailureRequiresImmediateReview: true,
      automaticPromptMutationAllowed: false,
    },
    observedWorkflowWeaknesses,
    repeatedWorkflowWeaknesses,
    confirmedWorkflowHardFailures,
    decision: hardFailureRequiresReview || repeatedWeaknessRequiresReview
      ? 'review_workflow_change'
      : 'hold_current_workflow',
    rationaleCode: hardFailureRequiresReview
      ? 'confirmed_workflow_hard_failure'
      : repeatedWeaknessRequiresReview
        ? 'repeated_workflow_weakness'
        : 'no_repeated_workflow_weakness',
  }
}
