import type {
  AuthorIntentContract,
  LocalRepairCandidate,
  LocalRepairReviewIssue,
} from './types'

export interface LocalRepairIntentPreservationRequirement {
  fieldPath: string
  statement: string
  sourceEvidenceQuote: string
  requiredAnchors: string[]
}

const enumeratedListPattern = /(?:给|向|对|把)([\p{Script=Han}·]{1,8}?(?:、[\p{Script=Han}·]{1,8}?)+(?:和|与|及)[\p{Script=Han}·]{1,8}?)(?=的|，|。|；|：|！|？|\s|汇报|报告|说明|交代|传达|喊|说|下令|$)/gu
const pairedRecipientPattern = /(?:给|向|对)([\p{Script=Han}·]{1,8}?)(?:和|与|及)([\p{Script=Han}·]{1,8}?)(?=，|。|；|：|！|？|\s|汇报|报告|说明|交代|传达|喊|说|下令|$)/gu

function intentStatements(intent: AuthorIntentContract) {
  const entries: Array<{ fieldPath: string; statement: string }> = [
    { fieldPath: 'narrativeDelta.mustChange', statement: intent.narrativeDelta.mustChange },
    { fieldPath: 'characterAgency.currentGoal', statement: intent.characterAgency.currentGoal },
    { fieldPath: 'characterAgency.requiredChoice', statement: intent.characterAgency.requiredChoice },
    { fieldPath: 'characterAgency.expectedCost', statement: intent.characterAgency.expectedCost },
    ...intent.narrativeDelta.mustNotResolve.map((statement, index) => ({
      fieldPath: `narrativeDelta.mustNotResolve.${index}`,
      statement,
    })),
    ...intent.boundaries.requiredElements.map((statement, index) => ({
      fieldPath: `boundaries.requiredElements.${index}`,
      statement,
    })),
    ...intent.boundaries.forbiddenEffects.map((statement, index) => ({
      fieldPath: `boundaries.forbiddenEffects.${index}`,
      statement,
    })),
    ...intent.boundaries.protectedCharacterTraits.map((statement, index) => ({
      fieldPath: `boundaries.protectedCharacterTraits.${index}`,
      statement,
    })),
    ...(intent.sceneMechanismDirection?.preservedAuthorIntent || []).map((statement, index) => ({
      fieldPath: `sceneMechanismDirection.preservedAuthorIntent.${index}`,
      statement,
    })),
  ]
  return entries.filter(entry => entry.statement.trim())
}

function splitAnchors(value: string) {
  return value
    .split(/、|和|与|及/u)
    .map(anchor => anchor.trim())
    .filter(anchor => anchor.length > 0)
}

export function extractLockedIntentListAnchors(statement: string) {
  const groups: string[][] = []
  for (const match of statement.matchAll(enumeratedListPattern)) {
    const anchors = splitAnchors(match[1] || '')
    if (anchors.length >= 3) groups.push(anchors)
  }
  for (const match of statement.matchAll(pairedRecipientPattern)) {
    const anchors = [match[1], match[2]].filter((value): value is string => Boolean(value?.trim()))
    if (anchors.length === 2) groups.push(anchors)
  }
  const seen = new Set<string>()
  return groups.filter(anchors => {
    const key = anchors.join('\u0000')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function evidenceWindow(sourceText: string, anchors: string[]) {
  const positions = anchors.map(anchor => sourceText.indexOf(anchor))
  if (positions.some(position => position < 0)) return null
  const start = Math.min(...positions)
  const end = Math.max(...positions.map((position, index) => position + anchors[index]!.length))
  const left = Math.max(0, start - 36)
  const right = Math.min(sourceText.length, end + 36)
  const window = sourceText.slice(left, right).trim()
  if (window.length <= 240) return window
  const exactSpan = sourceText.slice(start, end).trim()
  return exactSpan.length <= 240 ? exactSpan : null
}

export function buildLocalRepairIntentPreservationRequirements(input: {
  intent: AuthorIntentContract
  targetBlockText: string
}) {
  const requirements: LocalRepairIntentPreservationRequirement[] = []
  const seen = new Set<string>()
  for (const entry of intentStatements(input.intent)) {
    for (const anchors of extractLockedIntentListAnchors(entry.statement)) {
      const sourceEvidenceQuote = evidenceWindow(input.targetBlockText, anchors)
      const requirementGroups = sourceEvidenceQuote
        ? [{ sourceEvidenceQuote, requiredAnchors: anchors }]
        : anchors.flatMap(anchor => {
            const anchorEvidenceQuote = evidenceWindow(input.targetBlockText, [anchor])
            return anchorEvidenceQuote
              ? [{ sourceEvidenceQuote: anchorEvidenceQuote, requiredAnchors: [anchor] }]
              : []
          })
      for (const requirement of requirementGroups) {
        const key = requirement.requiredAnchors.join('\u0000')
        if (seen.has(key)) continue
        seen.add(key)
        requirements.push({
          fieldPath: entry.fieldPath,
          statement: entry.statement,
          ...requirement,
        })
      }
    }
  }
  return requirements
}

function trackedByPreservedFact(candidate: LocalRepairCandidate, anchors: string[]) {
  return candidate.preservedFacts.some(item => anchors.every(anchor => (
    item.sourceEvidenceQuote.includes(anchor)
    && item.candidateEvidenceQuote.includes(anchor)
  )))
}

export function localRepairIntentPreservationIssues(input: {
  candidate: LocalRepairCandidate
  requirements: LocalRepairIntentPreservationRequirement[]
}) {
  const issues: LocalRepairReviewIssue[] = []
  for (const requirement of input.requirements) {
    const missingAnchors = requirement.requiredAnchors.filter(anchor => (
      !input.candidate.proposedContent.includes(anchor)
    ))
    if (missingAnchors.length > 0) {
      issues.push({
        dimension: 'author_intent',
        severity: 'hard_block',
        sourceEvidenceQuote: requirement.sourceEvidenceQuote,
        candidateEvidenceQuote: null,
        diagnosis: `作者锁定意图要求逐项保留“${requirement.requiredAnchors.join('、')}”，候选缺少“${missingAnchors.join('、')}”，不得把多对象或多物件约束缩窄。`,
      })
      continue
    }
    if (!trackedByPreservedFact(input.candidate, requirement.requiredAnchors)) {
      const candidateEvidenceQuote = evidenceWindow(
        input.candidate.proposedContent,
        requirement.requiredAnchors,
      )
      issues.push({
        dimension: 'fact_preservation',
        severity: 'hard_block',
        sourceEvidenceQuote: requirement.sourceEvidenceQuote,
        candidateEvidenceQuote,
        diagnosis: `候选虽包含“${requirement.requiredAnchors.join('、')}”，但 preservedFacts 没有用同一证据对逐项证明作者锁定意图仍被保留。`,
      })
    }
  }
  return issues
}
