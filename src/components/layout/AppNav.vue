<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

defineProps<{ mobile?: boolean }>()

const auth = useAuthStore()
const router = useRouter()

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/predictor', label: 'Predictor', icon: '🎯' },
  { to: '/leaderboard', label: 'Standings', icon: '🏆' },
  { to: '/draft', label: 'Draft', icon: '🎲' },
]

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Mobile bottom nav -->
  <nav
    v-if="mobile"
    class="fixed bottom-0 left-0 right-0 bg-navy-800 border-t border-navy-700 flex items-center justify-around py-2 z-40"
  >
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-gold-400 transition-colors"
      active-class="text-gold-500"
      :exact="item.to === '/'"
    >
      <span class="text-xl">{{ item.icon }}</span>
      <span class="text-xs">{{ item.label }}</span>
    </RouterLink>
  </nav>

  <!-- Desktop sidebar nav -->
  <nav v-else class="w-56 bg-navy-800 border-r border-navy-700 flex flex-col py-6 px-3 gap-1 min-h-0">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium"
      active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
      :exact="item.to === '/'"
    >
      <span class="text-lg">{{ item.icon }}</span>
      {{ item.label }}
    </RouterLink>

    <div class="flex-1" />

    <button
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-wc-red-500 hover:bg-navy-700 transition-all text-sm font-medium w-full"
      @click="logout"
    >
      <span class="text-lg">🚪</span>
      Sign out
    </button>
  </nav>
</template>
