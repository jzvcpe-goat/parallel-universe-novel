import { api, unsupportedFeature } from './client'
import type {
  AuthIdentity,
  AuthLoginResponse,
  AuthRegisterResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types'

function registerPayload(data: RegisterRequest) {
  const actorId = data.email.trim()
  return {
    actor_id: actorId,
    actor_role: 'customer',
    account_id: actorId,
    password: data.password,
    display_name: data.displayName.trim() || data.username.trim() || actorId,
  }
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthLoginResponse>('/auth/login', {
      actor_id: data.identifier.trim(),
      password: data.password,
    }),

  register: (data: RegisterRequest) =>
    api.post<AuthRegisterResponse>('/auth/register', registerPayload(data)),

  me: () =>
    api.get<{ identity: AuthIdentity }>('/auth/me'),

  logout: () =>
    api.post<{ session?: Record<string, unknown> }>('/auth/logout'),

  requestVerification: (actorId?: string) => {
    void actorId
    return unsupportedFeature(
      'verification_unavailable',
      'The committed backend baseline does not expose an email verification endpoint.',
    )
  },
}
