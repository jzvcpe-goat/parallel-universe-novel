import type {
  CandidateAssessment,
  CandidateSearchResult,
  ContextSnapshot,
  NarrativeCandidate,
} from './types'
import { CreationDecisionError } from './types'

const assessmentDimensions: Array<keyof Omit<CandidateAssessment, 'candidateId'>> = [
  'intentFit',
  'characterAgency',
  'tensionPotential',
  'informationControl',
  'continuitySafety',
  'freshness',
  'futureDebtFitness',
]

export function candidateDistance(left: NarrativeCandidate, right: NarrativeCandidate) {
  const keys = Object.keys(left.strategyAxes) as Array<keyof NarrativeCandidate['strategyAxes']>
  return keys.filter(key => left.strategyAxes[key] !== right.strategyAxes[key]).length
}

export function validateCandidateAgainstContext(
  candidate: NarrativeCandidate,
  context: ContextSnapshot,
): NarrativeCandidate {
  const violations = [...candidate.validation.violations]
  const characterIds = new Set(context.activeCharacters.map(character => character.id))
  if (!characterIds.has(candidate.strategyAxes.agencyOwnerId)) {
    violations.push(`unknown_agency_owner:${candidate.strategyAxes.agencyOwnerId}`)
  }
  if (candidate.beats.length < 3 || candidate.beats.length > 7) {
    violations.push(`invalid_beat_count:${candidate.beats.length}`)
  }
  if (candidate.beats.some(beat => beat.actingCharacterId !== candidate.strategyAxes.agencyOwnerId)) {
    violations.push('agency_chain_break')
  }
  if (candidate.beats.some(beat => !beat.action.trim() || !beat.resistance.trim() || !beat.consequence.trim())) {
    violations.push('incomplete_beat_causality')
  }
  for (const constraint of context.hardConstraints) {
    if (candidate.projectedEffects.irreversibleChanges.some(change => change.includes(constraint))) {
      violations.push(`hard_constraint:${constraint}`)
    }
  }
  return {
    ...candidate,
    validation: {
      hardConstraintPassed: violations.length === 0,
      violations: Array.from(new Set(violations)),
    },
  }
}

function dominates(left: CandidateAssessment, right: CandidateAssessment) {
  const neverWorse = assessmentDimensions.every(key => left[key] >= right[key])
  const betterSomewhere = assessmentDimensions.some(key => left[key] > right[key])
  return neverWorse && betterSomewhere
}

export function selectNonDominatedCandidates(
  candidates: NarrativeCandidate[],
  assessments: CandidateAssessment[],
  limit = 3,
) {
  const assessmentById = new Map(assessments.map(item => [item.candidateId, item]))
  const frontier = candidates.filter(candidate => {
    const assessment = assessmentById.get(candidate.id)
    if (!assessment) return false
    return !candidates.some(other => {
      if (other.id === candidate.id) return false
      const otherAssessment = assessmentById.get(other.id)
      return Boolean(otherAssessment && dominates(otherAssessment, assessment))
    })
  })
  const distinct: NarrativeCandidate[] = []
  for (const candidate of frontier) {
    if (distinct.every(current => candidateDistance(current, candidate) >= 2)) distinct.push(candidate)
    if (distinct.length === limit) break
  }
  return distinct
}

export function finalizeCandidateSearch(input: {
  rawCandidates: NarrativeCandidate[]
  assessments: CandidateAssessment[]
  context: ContextSnapshot
}): CandidateSearchResult {
  const validated = input.rawCandidates.map(candidate => validateCandidateAgainstContext(candidate, input.context))
  const valid = validated.filter(candidate => candidate.validation.hardConstraintPassed)
  const candidates = selectNonDominatedCandidates(valid, input.assessments, 3)
  return {
    rawCandidateCount: input.rawCandidates.length,
    validCandidateCount: valid.length,
    candidates,
    assessments: input.assessments.filter(item => candidates.some(candidate => candidate.id === item.candidateId)),
    notice: candidates.length < 3
      ? `Only ${candidates.length} independent narrative paths passed the hard constraints.`
      : null,
  }
}

export function mergeCandidateSearchAttempts(
  first: CandidateSearchResult,
  second: CandidateSearchResult,
): CandidateSearchResult {
  const candidates: NarrativeCandidate[] = []
  for (const candidate of [...first.candidates, ...second.candidates]) {
    if (!candidate.validation.hardConstraintPassed) continue
    if (candidates.some(current => current.id === candidate.id)) continue
    if (!candidates.every(current => candidateDistance(current, candidate) >= 2)) continue
    candidates.push(candidate)
    if (candidates.length === 3) break
  }
  const candidateIds = new Set(candidates.map(candidate => candidate.id))
  const assessments = [...first.assessments, ...second.assessments]
    .filter((assessment, index, all) => (
      candidateIds.has(assessment.candidateId)
      && all.findIndex(item => item.candidateId === assessment.candidateId) === index
    ))
  return {
    rawCandidateCount: first.rawCandidateCount + second.rawCandidateCount,
    validCandidateCount: first.validCandidateCount + second.validCandidateCount,
    candidates,
    assessments,
    notice: candidates.length < 3
      ? `Only ${candidates.length} independent narrative paths passed the hard constraints after one retry.`
      : null,
  }
}

function uniqueValues<T>(left: T[], right: T[]) {
  return Array.from(new Set([...left, ...right]))
}

function uniqueStateChanges(
  left: NarrativeCandidate['projectedEffects']['stateChanges'],
  right: NarrativeCandidate['projectedEffects']['stateChanges'],
) {
  const values = [...left, ...right]
  return values.filter((operation, index) => (
    values.findIndex(current => JSON.stringify(current) === JSON.stringify(operation)) === index
  ))
}

export function mixNarrativeCandidates(input: {
  left: NarrativeCandidate
  right: NarrativeCandidate
  revision: number
}): NarrativeCandidate {
  if (
    input.left.id === input.right.id
    || input.left.sessionId !== input.right.sessionId
    || input.left.intentRevision !== input.right.intentRevision
    || input.left.contextSnapshotId !== input.right.contextSnapshotId
  ) {
    throw new CreationDecisionError('candidate_not_selected', 'Two current paths from the same decision context are required.')
  }
  const sourceBeats = [
    ...input.left.beats.slice(0, 2),
    ...input.right.beats.slice(-2),
  ].slice(0, 7)
  if (sourceBeats.length < 3) {
    throw new CreationDecisionError('candidate_not_selected', 'The selected paths do not contain enough causal beats to mix.')
  }
  const idSeed = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const violations = uniqueValues(input.left.validation.violations, input.right.validation.violations)
  return {
    schemaVersion: 'narrative-candidate.v1',
    id: `narrative-candidate:mixed:${idSeed}`,
    sessionId: input.left.sessionId,
    intentRevision: input.left.intentRevision,
    contextSnapshotId: input.left.contextSnapshotId,
    revision: input.revision,
    status: 'active',
    title: `融合：${input.left.title} × ${input.right.title}`,
    oneSentenceMechanism: `${input.left.oneSentenceMechanism}；同时采用“${input.right.title}”的信息释放方式。`,
    strategyAxes: {
      ...input.left.strategyAxes,
      informationMode: input.right.strategyAxes.informationMode,
      costType: input.right.strategyAxes.costType,
    },
    beats: sourceBeats.map((beat, index) => ({
      ...beat,
      id: `mixed-beat:${idSeed}:${index + 1}`,
      order: index + 1,
    })),
    projectedEffects: {
      stateChanges: uniqueStateChanges(input.left.projectedEffects.stateChanges, input.right.projectedEffects.stateChanges),
      irreversibleChanges: uniqueValues(input.left.projectedEffects.irreversibleChanges, input.right.projectedEffects.irreversibleChanges),
      promisesCreated: uniqueValues(input.left.projectedEffects.promisesCreated, input.right.projectedEffects.promisesCreated),
      promisesConsumed: uniqueValues(input.left.projectedEffects.promisesConsumed, input.right.projectedEffects.promisesConsumed),
      futureDebts: uniqueValues(input.left.projectedEffects.futureDebts, input.right.projectedEffects.futureDebts),
      characterCosts: uniqueValues(input.left.projectedEffects.characterCosts, input.right.projectedEffects.characterCosts),
    },
    tradeoffs: {
      strengths: uniqueValues(input.left.tradeoffs.strengths, input.right.tradeoffs.strengths),
      risks: uniqueValues(input.left.tradeoffs.risks, input.right.tradeoffs.risks),
      clicheRisks: uniqueValues(input.left.tradeoffs.clicheRisks, input.right.tradeoffs.clicheRisks),
      uncertainties: uniqueValues(input.left.tradeoffs.uncertainties, input.right.tradeoffs.uncertainties),
    },
    validation: {
      hardConstraintPassed: input.left.validation.hardConstraintPassed
        && input.right.validation.hardConstraintPassed
        && violations.length === 0,
      violations,
    },
  }
}

export function selectNarrativeCandidate(
  candidates: NarrativeCandidate[],
  candidateId: string,
) {
  return candidates.map(candidate => ({
    ...candidate,
    status: candidate.id === candidateId ? 'selected' as const : candidate.status === 'selected' ? 'active' as const : candidate.status,
  }))
}
