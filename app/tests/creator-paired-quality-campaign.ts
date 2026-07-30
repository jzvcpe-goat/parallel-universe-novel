import assert from 'node:assert/strict'
import {
  decidePairedQualityCampaignTuning,
  type PairedQualityCampaignTrialResult,
} from '../src/features/creator-decision/pairedQualityCampaign'

function trial(input: {
  fixtureId: string
  workflowWeaknessReasons?: string[]
  rejectedReason?: string
  workflowHardFailureReason?: string
  directHardFailureReason?: string
}): PairedQualityCampaignTrialResult {
  return {
    fixtureId: input.fixtureId,
    confirmedDimensions: [
      ...(input.workflowWeaknessReasons || []).map(reasonCode => ({
        verificationDecision: 'verify' as const,
        confirmedPreference: 'direct_writer' as const,
        confirmedReasonCode: reasonCode,
      })),
      ...(input.rejectedReason ? [{
        verificationDecision: 'reject' as const,
        confirmedPreference: null,
        confirmedReasonCode: null,
      }] : []),
    ],
    hardConstraints: [
      {
        path: 'architect_writer_workflow',
        verificationDecision: 'verify',
        confirmedStatus: input.workflowHardFailureReason ? 'fail' : 'pass',
        confirmedReasonCode: input.workflowHardFailureReason || 'no_violation',
      },
      {
        path: 'direct_writer',
        verificationDecision: 'verify',
        confirmedStatus: input.directHardFailureReason ? 'fail' : 'pass',
        confirmedReasonCode: input.directHardFailureReason || 'no_violation',
      },
    ],
  }
}

const oneFixtureRepeatedDimension = decidePairedQualityCampaignTuning({
  trials: [trial({
    fixtureId: 'fixture:one',
    workflowWeaknessReasons: ['voice_flattened', 'voice_flattened'],
  })],
})
assert.equal(oneFixtureRepeatedDimension.decision, 'hold_current_workflow')
assert.equal(oneFixtureRepeatedDimension.observedWorkflowWeaknesses[0]?.occurrenceCount, 2)
assert.deepEqual(oneFixtureRepeatedDimension.observedWorkflowWeaknesses[0]?.fixtureIds, ['fixture:one'])
assert.deepEqual(oneFixtureRepeatedDimension.repeatedWorkflowWeaknesses, [])

const crossFixtureWeakness = decidePairedQualityCampaignTuning({
  trials: [
    trial({ fixtureId: 'fixture:one', workflowWeaknessReasons: ['voice_flattened'] }),
    trial({ fixtureId: 'fixture:two', workflowWeaknessReasons: ['voice_flattened'] }),
  ],
})
assert.equal(crossFixtureWeakness.decision, 'review_workflow_change')
assert.equal(crossFixtureWeakness.rationaleCode, 'repeated_workflow_weakness')
assert.deepEqual(crossFixtureWeakness.repeatedWorkflowWeaknesses, [{
  reasonCode: 'voice_flattened',
  fixtureIds: ['fixture:one', 'fixture:two'],
  occurrenceCount: 2,
}])
assert.equal(crossFixtureWeakness.policy.automaticPromptMutationAllowed, false)

const hardFailure = decidePairedQualityCampaignTuning({
  trials: [trial({
    fixtureId: 'fixture:hard-failure',
    workflowHardFailureReason: 'required_causal_consequence_omitted',
  })],
})
assert.equal(hardFailure.decision, 'review_workflow_change')
assert.equal(hardFailure.rationaleCode, 'confirmed_workflow_hard_failure')
assert.equal(hardFailure.confirmedWorkflowHardFailures[0]?.fixtureIds.length, 1)

const directOnlyHardFailure = decidePairedQualityCampaignTuning({
  trials: [trial({
    fixtureId: 'fixture:direct-failure',
    directHardFailureReason: 'canon_fact_contradicted',
  })],
})
assert.equal(directOnlyHardFailure.decision, 'hold_current_workflow')
assert.deepEqual(directOnlyHardFailure.confirmedWorkflowHardFailures, [])

assert.throws(() => decidePairedQualityCampaignTuning({
  trials: [trial({ fixtureId: 'fixture:duplicate' }), trial({ fixtureId: 'fixture:duplicate' })],
}), /distinct fixture ids/)
assert.throws(() => decidePairedQualityCampaignTuning({
  trials: [],
  minimumDistinctFixturesForLiteraryWeakness: 1,
}), /integer of at least 2/)

process.stdout.write('creator paired-quality campaign tuning tests passed\n')
