<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Check, MailCheck } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()

const route = useRoute()
const tab = ref<'login' | 'signup'>(route.query.tab === 'signup' ? 'signup' : 'login')
const email = ref('')
const password = ref('')
const username = ref('')
const error = ref('')
const mode = ref<'login' | 'forgot'>('login')
const resetSent = ref(false)
const resetting = ref(false)
const signupDone = ref(false)

async function submit() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/home')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  }
}

async function submitSignup() {
  error.value = ''
  const u = username.value.trim()
  if (u.length < 3 || u.length > 20) {
    error.value = 'Username must be 3–20 characters'
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(u)) {
    error.value = 'Username can only contain letters, numbers, and underscores'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  try {
    await auth.signup(email.value, password.value, u)
    signupDone.value = true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sign up failed'
    // Surface uniqueness error clearly
    error.value = msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')
      ? 'That username is already taken — try another.'
      : msg
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

function switchTab(t: 'login' | 'signup') {
  tab.value = t
  error.value = ''
  mode.value = 'login'
  resetSent.value = false
  signupDone.value = false
}
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex justify-center mb-8">
        <img src="@/assets/logo.png" alt="WC Draft 2026" class="w-64" />
      </div>

      <div class="bg-navy-800 rounded-2xl border border-navy-700 p-6 shadow-2xl">
        <!-- Tabs -->
        <div class="flex rounded-lg bg-navy-900 p-1 mb-5">
          <button
            :class="['flex-1 py-1.5 text-sm font-semibold rounded-md transition-all', tab === 'login' ? 'bg-navy-700 text-slate-100' : 'text-slate-400 hover:text-slate-300']"
            @click="switchTab('login')"
          >Sign in</button>
          <button
            :class="['flex-1 py-1.5 text-sm font-semibold rounded-md transition-all', tab === 'signup' ? 'bg-navy-700 text-slate-100' : 'text-slate-400 hover:text-slate-300']"
            @click="switchTab('signup')"
          >Create account</button>
        </div>

        <!-- SOCIAL BUTTONS (both tabs) -->
        <div class="flex flex-col gap-2 mb-4">
          <button
            type="button"
            class="flex items-center justify-center gap-3 w-full py-2.5 rounded-lg bg-white hover:bg-gray-100 text-gray-800 font-semibold text-sm transition-all"
            @click="auth.loginWithOAuth('google')"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 border-t border-navy-700" />
          <span class="text-xs text-slate-500">or</span>
          <div class="flex-1 border-t border-navy-700" />
        </div>

        <!-- LOGIN TAB -->
        <template v-if="tab === 'login'">
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
            <p class="text-green-400 text-sm flex items-center gap-1 justify-center"><Check :size="15" class="shrink-0" /> Reset link sent — check your email.</p>
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
        </template>

        <!-- SIGN UP TAB -->
        <template v-else>
          <div v-if="signupDone" class="text-center py-4">
            <div class="mb-3"><MailCheck :size="40" class="mx-auto" /></div>
            <p class="text-slate-100 font-semibold mb-1">Check your email</p>
            <p class="text-slate-400 text-sm">We sent a confirmation link to <span class="text-slate-200">{{ email }}</span>. Click it to activate your account, then sign in.</p>
            <button class="mt-4 text-gold-400 text-sm hover:text-gold-300 transition-colors" @click="switchTab('login')">Back to sign in</button>
          </div>

          <form v-else class="flex flex-col gap-4" @submit.prevent="submitSignup">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
              <input
                v-model="username"
                type="text"
                required
                minlength="3"
                maxlength="20"
                autocomplete="username"
                placeholder="your_name"
                class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
              />
              <p class="text-xs text-slate-500 mt-1">3–20 characters, letters/numbers/underscores</p>
            </div>

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
                autocomplete="new-password"
                placeholder="Min. 8 characters"
                class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <p v-if="error" class="text-wc-red-500 text-sm">{{ error }}</p>

            <BaseButton type="submit" :loading="auth.loading" size="lg" class="w-full mt-1">
              Create account
            </BaseButton>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
