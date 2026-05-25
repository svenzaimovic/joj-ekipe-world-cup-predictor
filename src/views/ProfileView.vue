<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const auth = useAuthStore()
const router = useRouter()
const username = ref(auth.profile?.username ?? '')
const saving = ref(false)
const saved = ref(false)

async function updateUsername() {
  saving.value = true
  await auth.updateUsername(username.value)
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-lg mx-auto pb-24 md:pb-8">
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

    <BaseButton variant="danger" class="w-full" @click="logout">Sign out</BaseButton>
  </div>
</template>
