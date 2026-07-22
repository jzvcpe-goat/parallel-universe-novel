import {
  getPmfSession,
  sendCreatorMagicLink,
  upsertCreatorProfile,
  type PmfResult,
} from '@/lib/pmfSupabase'

export interface CreatorSessionState {
  status: 'loading' | 'signed_out' | 'signed_in'
  userId?: string
  email?: string
}

export interface CreatorSessionApiPort {
  getSession(): ReturnType<typeof getPmfSession>
  sendMagicLink(email: string): Promise<PmfResult<{ email: string }>>
  upsertProfile(displayName: string): ReturnType<typeof upsertCreatorProfile>
}

export interface CreatorSessionSchedulePort {
  clearTimeout(timer: number): void
  setTimeout(callback: () => void, delayMs: number): number
}

const defaultCreatorSessionApiPort: CreatorSessionApiPort = {
  getSession: getPmfSession,
  sendMagicLink: sendCreatorMagicLink,
  upsertProfile: upsertCreatorProfile,
}

const defaultCreatorSessionSchedulePort: CreatorSessionSchedulePort = {
  clearTimeout: timer => window.clearTimeout(timer),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
}

export async function readCreatorSession(
  api: CreatorSessionApiPort = defaultCreatorSessionApiPort,
): Promise<CreatorSessionState> {
  const current = await api.getSession()
  if (!current?.user?.id) return { status: 'signed_out' }

  await api.upsertProfile(current.user.email || '作者')

  return {
    status: 'signed_in',
    userId: current.user.id,
    email: current.user.email || undefined,
  }
}

export function sendCreatorLoginLink(
  email: string,
  api: CreatorSessionApiPort = defaultCreatorSessionApiPort,
): Promise<PmfResult<{ email: string }>> {
  return api.sendMagicLink(email.trim())
}

export function scheduleCreatorSessionRefresh(
  refresh: () => void | Promise<void>,
  port: CreatorSessionSchedulePort = defaultCreatorSessionSchedulePort,
  delayMs = 0,
) {
  const timer = port.setTimeout(() => {
    void refresh()
  }, delayMs)
  return () => port.clearTimeout(timer)
}
