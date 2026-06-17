const TOKEN_KEY = 'qi_token'

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('qi_refresh')
  },
}
