export function useSoul() {
  return {
    profile: null,
    isLoading: false,
    error: 'Profile backend not available',
    loadProfile: async () => undefined,
    updatePreferences: async () => undefined,
  }
}
