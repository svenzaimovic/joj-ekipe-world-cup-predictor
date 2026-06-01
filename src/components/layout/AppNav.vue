<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useLeagueStore } from '@/stores/league.store'
import { useRoute, useRouter } from 'vue-router'

defineProps<{ mobile?: boolean }>()

const auth = useAuthStore()
const leagueStore = useLeagueStore()
const route = useRoute()
const router = useRouter()

// Detect if we're inside a specific league
const leagueId = computed(() => route.params.leagueId as string | undefined)

const leagueNavItems = computed(() => {
  if (!leagueId.value) return []
  return [
    { name: 'league-home', params: { leagueId: leagueId.value }, label: 'League', icon: '🏠' },
    { name: 'league-draft', params: { leagueId: leagueId.value }, label: 'Draft', icon: '🎲' },
    { name: 'league-draft-practice', params: { leagueId: leagueId.value }, label: 'Practice', icon: '🧪' },
    { name: 'league-leaderboard', params: { leagueId: leagueId.value }, label: 'Standings', icon: '🏆' },
  ]
})

const globalNavItems = [
  { name: 'home', params: {}, label: 'Home', icon: '🏠' },
  { name: 'predictor', params: {}, label: 'Predictor', icon: '🎯' },
  { name: 'leagues', params: {}, label: 'Leagues', icon: '🏆' },
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
    <template v-if="leagueId">
      <RouterLink
        v-for="item in leagueNavItems"
        :key="item.name"
        :to="{ name: item.name, params: item.params }"
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-gold-400 transition-colors"
        exact-active-class="text-gold-500"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span class="text-xs">{{ item.label }}</span>
      </RouterLink>
    </template>
    <template v-else>
      <RouterLink
        v-for="item in globalNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-gold-400 transition-colors"
        active-class="text-gold-500"
        :exact="item.name === 'home'"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span class="text-xs">{{ item.label }}</span>
      </RouterLink>
    </template>
  </nav>

  <!-- Desktop sidebar nav -->
  <nav v-else class="w-56 bg-navy-800 border-r border-navy-700 flex flex-col py-6 px-3 gap-1 min-h-0">
    <!-- League context header -->
    <div v-if="leagueId && leagueStore.activeLeague" class="px-3 py-2 mb-2 border-b border-navy-700">
      <div class="text-xs text-slate-500 uppercase tracking-wider mb-0.5">League</div>
      <div class="font-bold text-gold-400 text-sm truncate">{{ leagueStore.activeLeague.name }}</div>
    </div>

    <template v-if="leagueId">
      <RouterLink
        v-for="item in leagueNavItems"
        :key="item.name"
        :to="{ name: item.name, params: item.params }"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium"
        exact-active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
      >
        <span class="text-lg">{{ item.icon }}</span>
        {{ item.label }}
      </RouterLink>
      <div class="border-t border-navy-700 my-2" />
    </template>

    <RouterLink
      v-for="item in globalNavItems"
      :key="item.name"
      :to="{ name: item.name }"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium"
      active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
      :exact="item.name === 'home'"
    >
      <span class="text-lg">{{ item.icon }}</span>
      {{ item.label }}
    </RouterLink>

    <div class="flex-1" />

    <RouterLink
      to="/profile"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium"
      active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
    >
      <span class="text-lg">👤</span>
      Profile
    </RouterLink>

    <button
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-wc-red-500 hover:bg-navy-700 transition-all text-sm font-medium w-full"
      @click="logout"
    >
      <span class="text-lg">🚪</span>
      Sign out
    </button>
  </nav>
</template>
