/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { authApi, settingsApi } from '@/api'
import { ApiError } from '@/api/client'
import { mapIdentityToUser } from '@/lib/adapters'
import { authStorage } from '@/lib/storage'
import type { AuthIdentity, LoginRequest, RegisterRequest, User } from '@/types'

export type AuthState =
  | { status: 'UNAUTHENTICATED' }
  | { status: 'GUEST'; sessionId: string }
  | { status: 'PENDING_VERIFICATION'; email: string }
  | { status: 'AUTHENTICATED'; user: User }

interface AuthContextValue {
  state: AuthState
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  clearLocalSession: () => void
  clearError: () => void
  refreshMe: () => Promise<void>
  setGuestSession: (sessionId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function identityToUser(identity: AuthIdentity): Promise<User> {
  try {
    const subscription = await settingsApi.getSubscriptionStatus()
    return mapIdentityToUser(identity, subscription)
  } catch {
    return mapIdentityToUser(identity, null)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'UNAUTHENTICATED' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const refreshMe = useCallback(async () => {
    const token = authStorage.getToken()
    if (!token) return
    setIsLoading(true)
    try {
      const payload = await authApi.me()
      const user = await identityToUser(payload.identity)
      setState({ status: 'AUTHENTICATED', user })
    } catch {
      authStorage.clear()
      setState({ status: 'UNAUTHENTICATED' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login(data)
      authStorage.setToken(response.token.access_token)
      const user = await identityToUser(response.identity)
      setState({ status: 'AUTHENTICATED', user })
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState({ status: 'PENDING_VERIFICATION', email: data.identifier })
      }
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      await authApi.register(data)
      await login({ identifier: data.email, password: data.password })
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [login])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Local cleanup is enough for this prototype shell.
    }
    authStorage.clear()
    setState({ status: 'UNAUTHENTICATED' })
    navigate('/')
  }, [navigate])

  const clearLocalSession = useCallback(() => {
    authStorage.clear()
    setState({ status: 'UNAUTHENTICATED' })
  }, [])

  const setGuestSession = useCallback((sessionId: string) => {
    setState({ status: 'GUEST', sessionId })
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = state.status === 'AUTHENTICATED' ? state.user : null
    return {
      state,
      user,
      isLoading,
      isAuthenticated: state.status === 'AUTHENTICATED',
      error,
      login,
      register,
      logout,
      clearLocalSession,
      clearError: () => setError(null),
      refreshMe,
      setGuestSession,
    }
  }, [clearLocalSession, error, isLoading, login, logout, refreshMe, register, setGuestSession, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
