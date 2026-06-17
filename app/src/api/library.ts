import { api } from './client'
import type { ReaderWorld, ReaderWorldDetail } from '@/types'

export type LibraryFilter = 'published'

export const libraryApi = {
  getWorlds: () =>
    api.get<{ worlds: ReaderWorld[] }>('/reader/library/worlds'),

  getWorldDetail: (worldId: string) =>
    api.get<ReaderWorldDetail>(`/reader/library/worlds/${worldId}`),
}
