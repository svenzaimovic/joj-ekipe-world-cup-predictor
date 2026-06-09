<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useLeagueStore } from '@/stores/league.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Trophy, Shuffle } from 'lucide-vue-next'

const auth = useAuthStore()
const leaderboardStore = useLeaderboardStore()
const leagueStore = useLeagueStore()
const router = useRouter()

onMounted(async () => {
  await leagueStore.fetchMyLeagues()
  const firstLeague = leagueStore.myLeagues[0]
  if (firstLeague) {
    await leaderboardStore.fetch(firstLeague.id)
  }
})

const firstLeague = computed(() => leagueStore.myLeagues[0] ?? null)

const myRank = computed(() => {
  if (!firstLeague.value) return null
  const idx = leaderboardStore.entries.findIndex((e) => e.user_id === auth.user?.id)
  return idx === -1 ? null : idx + 1
})

const myEntry = computed(() =>
  leaderboardStore.entries.find((e) => e.user_id === auth.user?.id),
)
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-black text-slate-100">
        Welcome back, <span class="text-gold-500">{{ auth.profile?.username }}</span>
      </h1>
      <p class="text-slate-400 mt-1 text-sm">FIFA World Cup 2026 — USA, Canada &amp; Mexico</p>
    </div>

    <!-- No leagues yet -->
    <div v-if="!leagueStore.loading && !leagueStore.myLeagues.length" class="mb-8">
      <BaseCard>
        <div class="text-center py-6">
          <div class="mb-3"><Trophy :size="40" class="mx-auto" /></div>
          <h2 class="text-lg font-bold text-slate-100 mb-2">Join or create a league to get started</h2>
          <p class="text-slate-400 text-sm mb-5">Leagues let you draft teams and compete with friends.</p>
          <BaseButton @click="router.push({ name: 'leagues' })">Go to My Leagues</BaseButton>
        </div>
      </BaseCard>
    </div>

    <!-- Stats -->
    <div v-if="firstLeague" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Your Rank
          <span class="normal-case font-normal text-slate-600 ml-1">in {{ firstLeague.name }}</span>
        </div>
        <div class="text-3xl font-black text-gold-500">{{ myRank ? `#${myRank}` : '—' }}</div>
        <div class="text-slate-400 text-sm">out of {{ leaderboardStore.entries.length }} players</div>
      </BaseCard>
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Draft Pts</div>
        <div class="text-3xl font-black text-slate-100">{{ myEntry?.draft_points ?? 0 }}</div>
      </BaseCard>
    </div>

    <!-- League shortcuts (when in multiple leagues) -->
    <div v-if="leagueStore.myLeagues.length > 1" class="mb-8">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">My Leagues</h2>
      <div class="flex flex-col gap-2">
        <button
          v-for="league in leagueStore.myLeagues"
          :key="league.id"
          class="text-left bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between hover:border-gold-500/40 transition-all"
          @click="router.push({ name: 'league-home', params: { leagueId: league.id } })"
        >
          <span class="font-semibold text-slate-100">{{ league.name }}</span>
          <span class="text-slate-600">›</span>
        </button>
      </div>
    </div>

    <!-- Single league shortcut -->
    <div v-else-if="firstLeague" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        class="bg-navy-800 border border-navy-700 rounded-2xl p-5 text-left hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-draft', params: { leagueId: firstLeague.id } })"
      >
        <div class="mb-2"><Shuffle :size="40" /></div>
        <div class="font-bold text-slate-100">Draft</div>
        <div class="text-xs text-slate-500 mt-0.5">Pick your teams</div>
      </button>
      <button
        class="bg-navy-800 border border-navy-700 rounded-2xl p-5 text-left hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-leaderboard', params: { leagueId: firstLeague.id } })"
      >
        <div class="mb-2"><Trophy :size="40" /></div>
        <div class="font-bold text-slate-100">Standings</div>
        <div class="text-xs text-slate-500 mt-0.5">League leaderboard</div>
      </button>
    </div>
  </div>
</template>
