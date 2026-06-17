import { unsupportedFeature } from './client'

const reason = '当前节点画布和实时创作变更没有对应后端契约，只保留明确不可用提示。'

export const studioApi = {
  getProject: () => unsupportedFeature('studio_unavailable', reason),
  addNode: () => unsupportedFeature('studio_unavailable', reason),
  updateNode: () => unsupportedFeature('studio_unavailable', reason),
  runPreview: () => unsupportedFeature('studio_unavailable', reason),
  exportScript: () => unsupportedFeature('studio_unavailable', reason),
  setEngine: () => unsupportedFeature('studio_unavailable', reason),
  updateWorldRules: () => unsupportedFeature('studio_unavailable', reason),
}
