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

  async function init() {
    // Register the listener FIRST so we never miss auth events that fire
    // while getSession() is still in-flight (e.g. the user logs in during a
    // slow cold-start). INITIAL_SESSION fires once the auth client has
    // determined the starting state — we use it to mark ourselves ready.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        // Supabase has determined the initial session — this is the
        // authoritative source of truth on first load.
        if (session?.user) {
          user.value = session.user
          await fetchProfile()
        } else {
          user.value = null
          profile.value = null
        }
        initialized.value = true
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        isRecovering.value = true
        user.value = session?.user ?? null
        return
      }

      isRecovering.value = false
      user.value = session?.user ?? null
      if (user.value) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })

    // getSession() is kept as a fallback: if INITIAL_SESSION fires first
    // (which it usually does) this becomes a no-op; if not, it ensures we
    // always set initialized even if the listener never fires.
    try {
      const { data } = await supabase.auth.getSession()
      if (!initialized.value) {
        user.value = data.session?.user ?? null
        if (user.value) await fetchProfile()
      }
    } catch (e) {
      console.warn('Failed to get session:', e)
      if (!initialized.value) user.value = null
    } finally {
      initialized.value = true
    }
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    loading.value = false
    if (error) throw error
  }

  async function loginWithOAuth(provider: 'google' | 'facebook') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/home`,
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
