import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = path => readFileSync(resolve(root, path), 'utf8')

const types = read('app/src/features/creator-decision/types.ts')
const schemas = read('app/src/features/creator-decision/schemas.ts')
const recommendation = read('app/src/features/creator-decision/writingAssistance.ts')
const gate = read('app/src/features/creator-decision/candidateQualityGate.ts')
const workflow = read('app/src/features/creator-decision/creationDecisionWorkflow.ts')
const repairAdapter = read('app/src/features/creator-decision/advisoryCraftRepairAdapter.ts')
const localAgent = read('app/src/features/creator-decision/localWorkingAgent.ts')
const bridge = read('scripts/creator-working-agent-bridge.mjs')
const timeline = read('app/src/components/creator/workspace/CreatorConversationTimeline.tsx')
const findingCard = read('app/src/components/creator/workspace/CreatorWritingAssistFindingCard.tsx')
const inlineDiff = read('app/src/components/creator/workspace/CreatorWritingAssistInlineDiff.tsx')
const nextChapterGate = read('app/src/features/creator-decision/nextChapterQualityGate.ts')
const settingsRoute = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const settingsHydration = read('app/src/apps/creator/routes/creatorSettingsHydrationService.ts')
const settings = read('app/src/local-db/creatorLocalSettingsRepository.ts')
const workspace = read('app/src/local-db/creatorLocalWorkspacePackage.ts')
const literaryReviewOutputSchema = JSON.parse(read('validation/creator-ui/schemas/literary-review.schema.json'))

for (const contract of [
  'CreatorWritingAssistPreferences',
  'WritingAssistRecommendation',
  'AdvisoryCraftFinding',
  'ExtendedCraftReview',
]) {
  assert(types.includes(`interface ${contract}`), `missing writing assistance contract: ${contract}`)
}
assert(!types.match(/AdvisoryCraftFinding[\s\S]{0,500}severity:[^\n]*hard_block/u), 'advisory severity must not contain hard_block')
assert(schemas.includes('lensIds: z.array(writingAssistLensIdSchema).max(2)'), 'recommendation schema must enforce the two-lens budget')
assert(schemas.includes('evidence: z.array(sceneDraftDirectionEvidenceSchema).min(1)'), 'advisory findings must require manuscript evidence')
assert(recommendation.includes("if (!input.preferences.enabled) return null"), 'disabled assistance must return before recommendation work')
assert(recommendation.includes('.slice(0, 2)'), 'bounded recommender must select at most two lenses')
assert(!recommendation.match(/set(?:Timeout|Interval)\s*\(/u), 'writing assistance must not use timer-based triggers')
assert(!gate.includes('extendedCraft'), 'candidate quality gate must not read advisory findings')
assert(gate.includes("repair.findingSource?.kind !== 'advisory_lens'"), 'advisory repair choices must not block Canon')
assert(nextChapterGate.includes("repair.findingSource?.kind !== 'advisory_lens'"), 'advisory repair choices must not block the next confirmed chapter')
assert(workflow.includes('recommendWritingAssistLenses'), 'review workflow must own bounded recommendation routing')
assert(workflow.includes('writingAssistRecommendation: recommendation'), 'review event must persist recommendation metadata without prose')
assert(workflow.includes('requestedAdvisoryLensIds'), 'review workflow must route selected advisory lenses separately from hard dimensions')
assert(localAgent.includes("operation: 'advisory_craft_verification'"), 'active advisory revision candidates must receive an independent Auditor pass')
assert(localAgent.includes('validateAdvisoryCraftVerification'), 'advisory verification must validate exact manuscript evidence')
assert(repairAdapter.includes("source: 'advisory_lens'"), 'advisory local repair must retain its explicit source')
assert(repairAdapter.includes("finding.verification !== 'verified'"), 'unverified advisory findings must not reach the Reviser')
assert(!repairAdapter.includes('as LiteraryFinding'), 'advisory local repair must not coerce the suggestion into a hard literary finding')
assert(bridge.includes('advisory_craft_verification'), 'the local working-agent bridge must expose the advisory Auditor operation')
assert.deepEqual(
  [...literaryReviewOutputSchema.required].sort(),
  Object.keys(literaryReviewOutputSchema.properties).sort(),
  'strict literary-review output must require every root property',
)
const extendedCraftObject = literaryReviewOutputSchema.properties.extendedCraft.anyOf
  .find(option => option.type === 'object')
assert(
  literaryReviewOutputSchema.properties.extendedCraft.anyOf.some(option => option.type === 'null'),
  'disabled advisory output must use an explicit null instead of an omitted strict-schema property',
)
assert.deepEqual(
  [...extendedCraftObject.required].sort(),
  Object.keys(extendedCraftObject.properties).sort(),
  'strict extendedCraft output must require every object property',
)
assert(timeline.includes('<CreatorWritingAssistRecommendationCard'), 'the conversation timeline must expose one bounded recommendation card')
assert(timeline.includes('<CreatorWritingAssistFindingCard'), 'the conversation timeline must expose one advisory finding at a time')
assert(timeline.includes('<CreatorWritingAssistInlineDiff'), 'the conversation timeline must expose one bounded source/candidate diff')
assert(findingCard.includes('看一个局部方案'), 'verified advisory findings must offer one local candidate action')
assert(findingCard.includes('稍后处理'), 'advisory findings must support a non-destructive later decision')
assert(inlineDiff.includes('采用这一处修改'), 'a local candidate requires explicit author adoption')
assert(inlineDiff.includes('不采用'), 'a local candidate requires an explicit rejection path')
assert(workflow.includes("type: 'finding_deferred'"), 'later decisions must leave a metadata-only local event')
assert(workflow.includes("reason: 'later'"), 'later decisions must record their reason without prose')
assert(settingsRoute.includes('<CreatorWritingAssistancePreferencesPanel'), 'Creator settings must expose the explicit opt-in and lens selection')
assert(settingsRoute.includes('setWritingAssistPreferences(result.writingAssistPreferences)'), 'Creator settings must restore persisted assistance preferences after hydration')
assert(settingsHydration.includes('await local.hydrateWorkspace()'), 'writing assistance preferences must be read only after local workspace hydration')
assert(settings.includes('readCreatorWritingAssistPreferences'), 'local settings owner must read writing assistance preferences')
assert(settings.includes('writeCreatorWritingAssistPreferences'), 'local settings owner must write writing assistance preferences')
assert(workspace.includes('writingAssistPreferences: readCreatorWritingAssistPreferences()'), 'workspace export must include writing assistance preferences')
assert(workspace.includes('writeCreatorWritingAssistPreferences(settings.writingAssistPreferences)'), 'workspace import must restore writing assistance preferences')

console.log('[creator-writing-assistance] PASS')
