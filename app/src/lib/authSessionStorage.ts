const ACCESS_TOKEN_KEY = 'qi_token'
const LEGACY_REFRESH_TOKEN_KEY = 'qi_refresh'

export const authSessionStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY)
  },
}
