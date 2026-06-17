export function useShowcase() {
  return {
    items: [],
    comments: [],
    sort: 'hot' as const,
    isLoading: false,
    error: 'Public sharing service is outside this reader prototype',
    loadItems: async () => undefined,
    loadComments: async () => undefined,
    tipWork: async () => undefined,
    likeWork: async () => undefined,
    changeSort: () => undefined,
  }
}
