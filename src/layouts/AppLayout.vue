<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppNav from '@/components/layout/AppNav.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// Nudge users whose username looks auto-generated (= email prefix) to set a real name
watchEffect(() => {
  if (!auth.profile || !auth.user) return
  if (route.name === 'profile') return
  const emailPrefix = auth.user.email?.split('@')[0] ?? ''
  if (auth.profile.username === emailPrefix) {
    router.push({ name: 'profile', query: { onboarding: 'true' } })
  }
})
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex">
    <!-- Desktop sidebar -->
    <AppNav class="hidden md:flex" />

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>

    <!-- Mobile bottom nav -->
    <AppNav class="md:hidden" :mobile="true" />
  </div>
</template>
