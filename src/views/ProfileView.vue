<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const isOnboarding = route.query.onboarding === 'true'
const username = ref(auth.profile?.username ?? '')
const saving = ref(false)
const saved = ref(false)

const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const passwordSaved = ref(false)
const passwordError = ref('')

async function updateUsername() {
  saving.value = true
  await auth.updateUsername(username.value)
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function changePassword() {
  passwordError.value = ''
  if (newPassword.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  passwordSaving.value = true
  try {
    await auth.updatePassword(newPassword.value)
    passwordSaved.value = true
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => { passwordSaved.value = false }, 2000)
  } catch (e: unknown) {
    passwordError.value = e instanceof Error ? e.message : 'Failed to update password'
  } finally {
    passwordSaving.value = false
  }
}

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-lg mx-auto pb-24 md:pb-8">
    <!-- Onboarding banner -->
    <div v-if="isOnboarding" class="bg-gold-500/10 border border-gold-500/30 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
      <span class="text-xl mt-0.5">👋</span>
      <div>
        <p class="text-gold-400 font-semibold text-sm">Welcome! Set a display name before you start.</p>
        <p class="text-slate-400 text-xs mt-0.5">This is what other players will see in the draft and standings.</p>
      </div>
    </div>

    <h1 class="text-2xl font-black text-slate-100 mb-6">Profile</h1>

    <BaseCard class="mb-4">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-2xl">
          {{ auth.profile?.username?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <div>
          <div class="font-black text-slate-100 text-lg">{{ auth.profile?.username }}</div>
          <div class="text-slate-400 text-sm">{{ auth.user?.email }}</div>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Display name</label>
        <input
          v-model="username"
          type="text"
          maxlength="20"
          class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-gold-500 transition-colors"
        />
      </div>

      <BaseButton :loading="saving" @click="updateUsername">
        {{ saved ? '✓ Saved' : 'Save' }}
      </BaseButton>
    </BaseCard>

    <BaseCard class="mb-4">
      <h3 class="text-sm font-bold text-slate-300 mb-4">Change password</h3>
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New password</label>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Min. 6 characters"
            class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirm password</label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            class="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>
        <p v-if="passwordError" class="text-wc-red-500 text-sm">{{ passwordError }}</p>
        <BaseButton :loading="passwordSaving" @click="changePassword">
          {{ passwordSaved ? '✓ Password updated' : 'Update password' }}
        </BaseButton>
      </div>
    </BaseCard>

    <BaseButton variant="danger" class="w-full" @click="logout">Sign out</BaseButton>
  </div>
</template>
