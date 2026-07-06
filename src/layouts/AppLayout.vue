<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppNav from '@/components/layout/AppNav.vue'
import MobileMenu from '@/components/layout/MobileMenu.vue'

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

    <!-- Mobile top header + hamburger drawer -->
    <MobileMenu class="md:hidden" />

    <!-- Main content — pt-14 on mobile to clear fixed header bar -->
    <main class="flex-1 overflow-auto pt-14 md:pt-0">
      <RouterView />
    </main>
  </div>
</template>
