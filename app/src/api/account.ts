import { api } from './client'
import type {
  AccountDataExportResponse,
  AccountDeleteConfirmResponse,
  AccountDeletePreviewResponse,
  AccountMergeConfirmResponse,
  AccountMergePreview,
  AccountSnapshot,
} from '@/types'

export const accountApi = {
  getSnapshot: (payload?: {
    accountId?: string | null
    readerId?: string | null
    creatorId?: string | null
    includeDiagnostics?: boolean
  }) => {
    const params = new URLSearchParams()
    if (payload?.accountId) params.set('account_id', payload.accountId)
    if (payload?.readerId) params.set('reader_id', payload.readerId)
    if (payload?.creatorId) params.set('creator_id', payload.creatorId)
    if (payload?.includeDiagnostics) params.set('include_diagnostics', 'true')
    const query = params.toString()
    return api.get<AccountSnapshot>('/account/snapshot' + (query ? `?${query}` : ''))
  },

  previewMerge: (payload: {
    guestReaderId: string
    guestCreatorId: string
    includeDiagnostics?: boolean
  }) =>
    api.post<AccountMergePreview>('/account/merge/preview', {
      guest_reader_id: payload.guestReaderId,
      guest_creator_id: payload.guestCreatorId,
      include_diagnostics: Boolean(payload.includeDiagnostics),
    }),

  confirmMerge: (payload: {
    guestReaderId: string
    guestCreatorId: string
    resolution?: string
  }) =>
    api.post<AccountMergeConfirmResponse>('/account/merge/confirm', {
      guest_reader_id: payload.guestReaderId,
      guest_creator_id: payload.guestCreatorId,
      resolution: payload.resolution || 'keep_all_latest_first',
    }),

  exportData: () =>
    api.get<AccountDataExportResponse>('/account/data/export'),

  previewDelete: () =>
    api.post<AccountDeletePreviewResponse>('/account/delete/preview'),

  confirmDelete: (confirmation: string) =>
    api.post<AccountDeleteConfirmResponse>('/account/delete/confirm', {
      confirmation,
    }),
}
