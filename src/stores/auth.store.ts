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

  function init(): Promise<void> {
    // Do NOT call getSession() here. In Supabase JS v2, getSession() acquires
    // an internal auth lock that blocks every subsequent Supabase call
    // (including all data queries) until it releases. Instead we rely solely
    // on onAuthStateChange which fires INITIAL_SESSION almost immediately
    // without lock contention, giving us the same session info.
    return new Promise<void>((resolve) => {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          user.value = session?.user ?? null
          initialized.value = true
          if (session?.user) {
            fetchProfile().catch((e) => console.warn('[auth] fetchProfile error:', e))
          } else {
            profile.value = null
          }
          resolve() // unblock the router guard
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
