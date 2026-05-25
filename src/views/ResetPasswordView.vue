<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

const password = ref('')
const confirm = ref('')
const error = ref('')
const saving = ref(false)
const done = ref(false)

// If the user lands here without a recovery session, send them to login
onMounted(() => {
  if (!auth.isRecovering && !auth.user) {
    router.replace('/login')
  }
})

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  saving.value = true
  try {
    await auth.updatePassword(password.value)
    done.value = true
    setTimeout(() => router.push('/'), 1500)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update password'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">⚽</div>
        <h1 class="text-3xl font-black text-slate-100">World Cup <span class="text-gold-500">2026</span></h1>
        <p class="text-slate-400 mt-1 text-sm">Predictor & Draft</p>
      </div>

      <div class="bg-navy-800 rounded-2xl border border-navy-700 p-6 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-100 mb-5">Set new password</h2>

        <div v-if="done" class="text-center py-4">
          <div class="text-3xl mb-2">✓</div>
          <p class="text-slate-300 text-sm">Password updated! Redirecting…</p>
        </div>

        <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New password</label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Min. 6 characters"
              class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirm password</label>
            <input
              v-model="confirm"
              type="password"
              required
              autocomplete="new-password"
              placeholder="••••••••"
              class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <p v-if="error" class="text-wc-red-500 text-sm">{{ error }}</p>

          <BaseButton type="submit" :loading="saving" size="lg" class="w-full mt-1">
            Set password
          </BaseButton>
        </form>
      </div>
    </div>
  </div>
</template>
