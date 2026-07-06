<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useLeagueStore } from '@/stores/league.store'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X, Home, Shuffle, FlaskConical, Calendar, Star, Trophy, LayoutGrid, User, LogOut, ChevronLeft } from 'lucide-vue-next'

const auth = useAuthStore()
const leagueStore = useLeagueStore()
const route = useRoute()
const router = useRouter()

const isOpen = ref(false)
const leagueId = computed(() => route.params.leagueId as string | undefined)

const leagueNavItems = computed(() => {
  if (!leagueId.value) return []
  return [
    { name: 'league-home', params: { leagueId: leagueId.value }, label: 'League Home', icon: Home },
    { name: 'league-draft', params: { leagueId: leagueId.value }, label: 'Draft', icon: Shuffle },
    { name: 'league-draft-practice', params: { leagueId: leagueId.value }, label: 'Practice Draft', icon: FlaskConical },
    { name: 'league-fixtures', params: { leagueId: leagueId.value }, label: 'Fixtures', icon: Calendar },
    { name: 'league-my-teams', params: { leagueId: leagueId.value }, label: 'My Teams', icon: Star },
    { name: 'league-leaderboard', params: { leagueId: leagueId.value }, label: 'Standings', icon: Trophy },
  ]
})

function close() {
  isOpen.value = false
}

async function logout() {
  await auth.logout()
  router.push('/login')
  close()
}
</script>

<template>
  <div>
  <!-- Fixed top header bar -->
  <header class="fixed top-0 left-0 right-0 h-14 bg-navy-800 border-b border-navy-700 flex items-center justify-between px-4 z-40">
    <RouterLink to="/" class="flex items-center">
      <img src="@/assets/logo.png" alt="WC Draft 2026" class="h-8" />
    </RouterLink>
    <div class="flex items-center gap-2">
      <span v-if="leagueStore.activeLeague && leagueId" class="text-gold-400 text-sm font-semibold truncate max-w-[160px]">
        {{ leagueStore.activeLeague.name }}
      </span>
      <button
        class="w-9 h-9 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-300 hover:text-white hover:bg-navy-600 transition-all"
        @click="isOpen = !isOpen"
      >
        <X v-if="isOpen" :size="20" />
        <Menu v-else :size="20" />
      </button>
    </div>
  </header>

  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/60 z-40"
      @click="close"
    />
  </Transition>

  <!-- Slide-in drawer from right -->
  <Transition name="slide">
    <nav
      v-if="isOpen"
      class="fixed right-0 top-0 bottom-0 w-72 bg-navy-800 border-l border-navy-700 z-50 flex flex-col py-4 px-3 overflow-y-auto"
    >
      <!-- Drawer header with close button -->
      <div class="flex items-center justify-between px-3 mb-4 pt-2">
        <span class="text-sm font-semibold text-slate-300">Menu</span>
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700 transition-all"
          @click="close"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- League context -->
      <template v-if="leagueId && leagueStore.activeLeague">
        <div class="px-3 mb-2">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Current League</div>
          <div class="font-bold text-gold-400 text-sm truncate">{{ leagueStore.activeLeague.name }}</div>
        </div>

        <!-- Back to leagues -->
        <RouterLink
          :to="{ name: 'leagues' }"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-all text-sm mb-1"
          @click="close"
        >
          <ChevronLeft :size="16" class="shrink-0" />
          All Leagues
        </RouterLink>

        <!-- League nav items -->
        <RouterLink
          v-for="item in leagueNavItems"
          :key="item.name"
          :to="{ name: item.name, params: item.params }"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium mb-1"
          exact-active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
          @click="close"
        >
          <component :is="item.icon" :size="18" class="shrink-0" />
          {{ item.label }}
        </RouterLink>

        <div class="border-t border-navy-700 my-3" />
      </template>

      <!-- Global nav -->
      <RouterLink
        :to="{ name: 'home' }"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium mb-1"
        exact-active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
        @click="close"
      >
        <Home :size="18" class="shrink-0" />
        Home
      </RouterLink>
      <RouterLink
        :to="{ name: 'leagues' }"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all text-sm font-medium mb-1"
        active-class="bg-gold-500/10 text-gold-400 border border-gold-500/20"
        @click="close"
      >
        <LayoutGrid :size="18" class="shrink-0" />
        All Leagues
      </RouterLink>

      <div class="flex-1" />

      <!-- User block -->
      <div class="border-t border-navy-700 pt-3 mt-2 flex flex-col gap-1">
        <RouterLink
          to="/profile"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-navy-700 transition-all"
          active-class="bg-gold-500/10"
          @click="close"
        >
          <div class="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm shrink-0">
            {{ auth.profile?.username?.[0]?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-slate-100 truncate">{{ auth.profile?.username ?? 'Profile' }}</div>
            <div class="text-xs text-slate-500">View profile</div>
          </div>
        </RouterLink>

        <button
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-navy-700 transition-all text-sm font-medium w-full"
          @click="logout"
        >
          <LogOut :size="18" class="shrink-0" />
          Sign out
        </button>
      </div>
    </nav>
  </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
