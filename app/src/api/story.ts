import { api } from './client'
import type {
  ReaderContinueResponse,
  ReaderPrefillResponse,
  ReaderQuoteResponse,
  ReaderReplayResponse,
  ReaderSessionResponse,
  ReaderWorld,
  ReaderWorldDetail,
} from '@/types'

export const storyApi = {
  listWorlds: () =>
    api.get<{ worlds: ReaderWorld[] }>('/reader/library/worlds'),

  getWorldDetail: (worldId: string) =>
    api.get<ReaderWorldDetail>(`/reader/library/worlds/${worldId}`),

  createSession: (payload: { worldId: string; accountId?: string | null }) =>
    api.post<ReaderSessionResponse>('/reader/sessions', {
      world_id: payload.worldId,
      account_id: payload.accountId || undefined,
    }),

  continueSession: (payload: {
    sessionId: string
    accountId?: string | null
    choiceId?: string
    freeformIntent?: string
  }) =>
    api.post<ReaderContinueResponse>('/reader/continue', {
      session_id: payload.sessionId,
      account_id: payload.accountId || undefined,
      choice_id: payload.choiceId || undefined,
      freeform_intent: payload.freeformIntent || undefined,
    }),

  getReplay: (sessionId: string) =>
    api.get<ReaderReplayResponse>(`/reader/sessions/${sessionId}/replay`),

  getQuote: (sessionId: string) =>
    api.get<ReaderQuoteResponse>(`/reader/sessions/${sessionId}/quote`),

  getPrefill: (sessionId: string) =>
    api.get<ReaderPrefillResponse>(`/reader/sessions/${sessionId}/prefill`),
}
