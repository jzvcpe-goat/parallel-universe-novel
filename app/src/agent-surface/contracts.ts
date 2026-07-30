import { z } from 'zod'
import type { CreatorAgentActionName } from './actions'

const creatorRouteSchema = z.string().startsWith('/creator')
const idSchema = z.string().min(1)

function actionInput<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    route: creatorRouteSchema,
    targetId: idSchema,
    ...shape,
  }).strict()
}

function actionOutput<Kind extends string>(kind: Kind) {
  return z.object({
    kind: z.literal(kind),
    targetId: idSchema,
    recordId: idSchema.optional(),
    messageCode: idSchema.optional(),
  }).strict()
}

export const creatorAgentActionSchemas = {
  open_draft: {
    input: actionInput({ draftId: idSchema }),
    output: actionOutput('draft_opened'),
  },
  start_inspiration: {
    input: actionInput({ workId: idSchema }),
    output: actionOutput('inspiration_started'),
  },
  pin_reminder: {
    input: actionInput({ signalId: idSchema, workId: idSchema }),
    output: actionOutput('reminder_pinned'),
  },
  apply_suggestion: {
    input: actionInput({
      candidateId: idSchema,
      draftId: idSchema.optional(),
      adoptionMode: z.enum(['replace', 'insert', 'branch', 'hold']),
    }),
    output: actionOutput('candidate_adopted'),
  },
  select_priority_request: {
    input: actionInput({ candidateId: idSchema, workId: idSchema.optional() }),
    output: actionOutput('priority_selected'),
  },
  convert_echo_to_scene: {
    input: actionInput({ candidateId: idSchema, signalId: idSchema.optional(), workId: idSchema.optional() }),
    output: actionOutput('scene_candidate_created'),
  },
  generate_candidate_from_instruction: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional(), instruction: z.string().min(1) }),
    output: actionOutput('candidate_created'),
  },
  complete_next_beat: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional(), instruction: z.string().optional() }),
    output: actionOutput('candidate_created'),
  },
  rewrite_as_action: {
    input: actionInput({
      draftId: idSchema.optional(),
      candidateId: idSchema,
      selectionStart: z.number().int().nonnegative().optional(),
      selectionEnd: z.number().int().nonnegative().optional(),
    }),
    output: actionOutput('candidate_created'),
  },
  ask_socratic_question: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional(), focus: z.string().optional() }),
    output: actionOutput('question_ready'),
  },
  extract_setting_asset: {
    input: actionInput({
      candidateId: idSchema,
      draftId: idSchema.optional(),
      assetKind: z.enum(['character', 'skill', 'location', 'map', 'faction', 'item', 'rule', 'timeline']),
    }),
    output: actionOutput('asset_candidate_created'),
  },
  branch_sandbox: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional(), branchTitle: z.string().optional() }),
    output: actionOutput('branch_candidate_created'),
  },
  inspect_story_impact: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional() }),
    output: actionOutput('impact_ready'),
  },
  open_suggestion_record: {
    input: actionInput({ candidateId: idSchema, draftId: idSchema.optional() }),
    output: actionOutput('suggestion_record_opened'),
  },
  save_local_draft: {
    input: actionInput({ draftId: idSchema, expectedVersion: z.number().int().nonnegative().optional() }),
    output: actionOutput('draft_saved'),
  },
  edit_local_manuscript: {
    input: actionInput({ draftId: idSchema, expectedVersion: z.number().int().nonnegative().optional() }),
    output: actionOutput('manuscript_edited'),
  },
  start_next_local_chapter: {
    input: actionInput({
      workId: idSchema,
      branchId: idSchema,
      currentChapterNumber: z.number().int().positive(),
    }),
    output: actionOutput('next_local_chapter_started'),
  },
  import_historical_state_candidate: {
    input: actionInput({
      workId: idSchema,
      proposalIds: z.array(idSchema).min(1).max(20),
    }),
    output: actionOutput('historical_state_candidate_imported'),
  },
  start_character_rehearsal: {
    input: actionInput({
      requestId: idSchema,
      contextSnapshotId: idSchema,
      characterIds: z.array(idSchema).min(2).max(8),
      scenario: z.string().min(12).max(2_000),
    }),
    output: actionOutput('character_rehearsal_candidates_ready'),
  },
  save_character_rehearsal_card: {
    input: actionInput({ proposalId: idSchema, simulationRunId: idSchema }),
    output: actionOutput('character_rehearsal_card_saved'),
  },
  save_character_rehearsal_setting: {
    input: actionInput({ proposalId: idSchema, simulationRunId: idSchema }),
    output: actionOutput('character_rehearsal_setting_saved'),
  },
  confirm_historical_state_candidate: {
    input: actionInput({ proposalId: idSchema }),
    output: actionOutput('historical_state_candidate_confirmed'),
  },
  reject_historical_state_candidate: {
    input: actionInput({ proposalId: idSchema }),
    output: actionOutput('historical_state_candidate_rejected'),
  },
  enter_publish_check: {
    input: actionInput({ draftId: idSchema }),
    output: actionOutput('publish_handoff_ready'),
  },
  prepare_publish_bundle: {
    input: actionInput({ draftId: idSchema }),
    output: actionOutput('bundle_prepared'),
  },
  review_publish_bundle: {
    input: actionInput({ bundleId: idSchema }),
    output: actionOutput('bundle_reviewed'),
  },
  check_reader_promise: {
    input: actionInput({ candidateId: idSchema, bundleId: idSchema.optional() }),
    output: actionOutput('reader_promise_checked'),
  },
  export_publish_bundle: {
    input: actionInput({ bundleId: idSchema }),
    output: actionOutput('bundle_exported'),
  },
  confirm_publish_bundle: {
    input: actionInput({ bundleId: idSchema }),
    output: actionOutput('bundle_confirmed'),
  },
  submit_publish_bundle: {
    input: actionInput({ bundleId: idSchema }),
    output: actionOutput('bundle_submitted'),
  },
} as const satisfies Record<CreatorAgentActionName, {
  input: z.ZodType
  output: z.ZodType
}>

export type CreatorAgentActionInput<Name extends CreatorAgentActionName> =
  z.input<(typeof creatorAgentActionSchemas)[Name]['input']>

export type CreatorAgentActionOutput<Name extends CreatorAgentActionName> =
  z.output<(typeof creatorAgentActionSchemas)[Name]['output']>
