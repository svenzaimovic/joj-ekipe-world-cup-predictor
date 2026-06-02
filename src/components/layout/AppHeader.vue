<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
</script>

<template>
  <header class="bg-navy-800 border-b border-navy-700 px-4 py-3 flex items-center justify-between">
    <RouterLink to="/">
      <img src="@/assets/logo.png" alt="WC Draft 2026" class="h-9" />
    </RouterLink>

    <div class="flex items-center gap-3">
      <RouterLink to="/profile" class="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
        <div class="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-sm">
          {{ auth.profile?.username?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <span class="hidden sm:block text-sm font-medium">{{ auth.profile?.username ?? 'Profile' }}</span>
      </RouterLink>
    </div>
  </header>
</template>
