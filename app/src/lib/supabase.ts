import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined

export type ReaderHealthProbe =
  | {
      status: 'unconfigured'
    }
  | {
      status: 'ok'
      data: {
        id: string
        status: string
        updated_at: string | null
      }
    }
  | {
      status: 'error'
      message: string
    }

let browserClient: SupabaseClient | null = null

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabasePublishableKey) return null

  browserClient ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

export async function readReaderHealthProbe(): Promise<ReaderHealthProbe> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { status: 'unconfigured' }

  const { data, error } = await supabase
    .from('health_probe')
    .select('id,status,updated_at')
    .eq('id', 'reader')
    .single()

  if (error) return { status: 'error', message: error.message }

  return {
    status: 'ok',
    data: {
      id: String(data.id),
      status: String(data.status),
      updated_at: data.updated_at ? String(data.updated_at) : null,
    },
  }
}
