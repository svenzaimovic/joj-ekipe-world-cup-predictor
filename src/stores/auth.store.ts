import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/app.types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const isRecovering = ref(false)

  function init(): void {
    // Read the stored session synchronously from localStorage so the router
    // guard can make an auth decision instantly — no lock, no network request.
    // Supabase's internal _initialize() acquires an auth lock and may hold it
    // for several seconds while refreshing an expired token. Any code that
    // calls getSession() (including every data query) queues behind that lock.
    // Reading localStorage directly sidesteps it entirely.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    try {
      const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (raw) user.value = JSON.parse(raw)?.user ?? null
    } catch { /* no stored session or storage unavailable */ }
    initialized.value = true

    // Register the official listener. INITIAL_SESSION will fire once
    // _initialize() completes (possibly after a token refresh) and overwrite
    // the stored value with the authoritative session.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        user.value = session?.user ?? null
        if (session?.user) {
          fetchProfile().catch((e) => console.warn('[auth] fetchProfile:', e))
        } else {
          profile.value = null
        }
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        isRecovering.value = true
        user.value = session?.user ?? null
        return
      }

      // SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT
      isRecovering.value = false
      user.value = session?.user ?? null
      if (user.value) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Set user immediately from the response so the router guard sees it
      // when LoginView calls router.push('/home') — don't wait for onAuthStateChange.
      user.value = data.user
      fetchProfile().catch((e) => console.warn('[auth] fetchProfile error:', e))
    } finally {
      loading.value = false
    }
  }

  async function loginWithOAuth(provider: 'google' | 'facebook') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Redirect to our dedicated callback route. The guard on /home and /login
        // run synchronously before the PKCE code exchange completes, so they
        // would bounce an unauthenticated user away. /auth/callback is unprotected
        // and waits for the exchange before navigating.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  async function signup(email: string, password: string, username: string) {
    loading.value = true
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    loading.value = false
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updateUsername(username: string) {
    if (!user.value) return
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.value.id)
    if (error) throw error
    await fetchProfile()
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    isRecovering.value = false
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  return { user, profile, initialized, loading, isRecovering, init, login, loginWithOAuth, signup, logout, updateUsername, fetchProfile, updatePassword, sendPasswordReset }
})
