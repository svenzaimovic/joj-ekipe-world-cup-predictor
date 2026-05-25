<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const mode = ref<'login' | 'forgot'>('login')
const resetSent = ref(false)
const resetting = ref(false)

async function submit() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  }
}

async function sendReset() {
  if (!email.value) {
    error.value = 'Enter your email address above first'
    return
  }
  error.value = ''
  resetting.value = true
  try {
    await auth.sendPasswordReset(email.value)
    resetSent.value = true
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to send reset email'
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">⚽</div>
        <h1 class="text-3xl font-black text-slate-100">World Cup <span class="text-gold-500">2026</span></h1>
        <p class="text-slate-400 mt-1 text-sm">Predictor & Draft</p>
      </div>

      <div class="bg-navy-800 rounded-2xl border border-navy-700 p-6 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-100 mb-5">Sign in</h2>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <p v-if="error" class="text-wc-red-500 text-sm">{{ error }}</p>

          <BaseButton type="submit" :loading="auth.loading" size="lg" class="w-full mt-1">
            Sign in
          </BaseButton>
        </form>

        <div v-if="resetSent" class="mt-4 text-center">
          <p class="text-green-400 text-sm">✓ Reset link sent — check your email.</p>
          <button class="text-slate-500 text-xs mt-2 hover:text-slate-300 transition-colors" @click="mode = 'login'; resetSent = false">Back to sign in</button>
        </div>

        <div v-else class="mt-4 text-center">
          <button
            v-if="mode === 'login'"
            class="text-slate-500 text-xs hover:text-slate-300 transition-colors"
            @click="mode = 'forgot'; error = ''"
          >Forgot password?</button>

          <div v-else class="flex flex-col items-center gap-2">
            <BaseButton variant="secondary" size="sm" :loading="resetting" @click="sendReset">
              Send reset link
            </BaseButton>
            <button class="text-slate-500 text-xs hover:text-slate-300 transition-colors" @click="mode = 'login'; error = ''">Cancel</button>
          </div>
        </div>

        <p v-if="mode === 'login'" class="text-slate-500 text-xs text-center mt-3">
          Access is by invite only. Contact Sven to get access.
        </p>
      </div>
    </div>
  </div>
</template>
