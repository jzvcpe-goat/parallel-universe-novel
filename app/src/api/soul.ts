import { unsupportedFeature } from './client'

const reason = '当前后端没有灵魂档案 API，首页改为显式提示该能力暂未接入。'

export const soulApi = {
  getProfile: () => unsupportedFeature('soul_unavailable', reason),
  getProfileById: () => unsupportedFeature('soul_unavailable', reason),
  updatePreferences: () => unsupportedFeature('soul_unavailable', reason),
}
