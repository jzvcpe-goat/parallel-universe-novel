export function useStudio() {
  return {
    project: null,
    isLoading: false,
    error: 'Canvas authoring backend not available',
    loadProject: async () => undefined,
    addNode: async () => undefined,
    switchEngine: async () => undefined,
    updateRules: async () => undefined,
  }
}
