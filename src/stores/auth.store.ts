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
    try {
      const { data } = await supabase.auth.getSession()
      user.value = data.session?.user ?? null
      if (user.value) await fetchProfile()
    } catch (e) {
      console.warn('Failed to get session:', e)
      user.value = null
    } finally {
      initialized.value = true
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
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
