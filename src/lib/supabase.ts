import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null
let resolved = false

export function getSupabase(): SupabaseClient | null {
  if (resolved) return cached
  resolved = true
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  if (!url || !key) return null
  try {
    cached = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  } catch {
    cached = null
  }
  return cached
}

export const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' }
] as const

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]['id']
