import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, type OAuthProviderId } from './supabase'

const NOT_CONFIGURED =
  "Sign-in isn't configured for this deployment yet — your progress is still being saved locally in this browser."

interface AuthState {
  user: User | null
  ready: boolean
}

const AuthContext = createContext<AuthState>({ user: null, ready: false })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false })

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setState({ user: null, ready: true })
      return
    }
    let mounted = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setState({ user: data?.session?.user ?? null, ready: true })
      })
      .catch(() => {
        if (mounted) setState({ user: null, ready: true })
      })
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, user: session?.user ?? null }))
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

async function ensureProfile(user: User) {
  const supabase = getSupabase()
  if (!supabase) return
  try {
    await supabase
      .from('profiles')
      .upsert(
        { id: user.id, display_name: user.email?.split('@')[0] || 'Learner' },
        { onConflict: 'id', ignoreDuplicates: true }
      )
  } catch {
    /* non-critical — profile is optional */
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error(NOT_CONFIGURED)
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data?.session?.user) await ensureProfile(data.session.user)
  return data
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error(NOT_CONFIGURED)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  if (data?.user) await ensureProfile(data.user)
  return data
}

export async function signInWithProvider(provider: OAuthProviderId) {
  const supabase = getSupabase()
  if (!supabase) throw new Error(NOT_CONFIGURED)
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}

export async function signOut() {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}
