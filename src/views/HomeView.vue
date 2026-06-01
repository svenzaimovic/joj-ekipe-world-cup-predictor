<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useMatchesStore } from '@/stores/matches.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useLeagueStore } from '@/stores/league.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const leaderboardStore = useLeaderboardStore()
const leagueStore = useLeagueStore()
const router = useRouter()

onMounted(async () => {
  await Promise.all([
    matchesStore.fetchAll(),
    leagueStore.fetchMyLeagues(),
  ])
  // Load leaderboard for first league if available
  const firstLeague = leagueStore.myLeagues[0]
  if (firstLeague) {
    await leaderboardStore.fetch(firstLeague.id)
  }
})

const nextMatches = computed(() =>
  matchesStore.matches
    .filter((m) => m.status === 'scheduled' && m.home_team && m.away_team)
    .slice(0, 3),
)

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
        Welcome back, <span class="text-gold-500">{{ auth.profile?.username }}</span> 👋
      </h1>
      <p class="text-slate-400 mt-1 text-sm">FIFA World Cup 2026 — USA, Canada &amp; Mexico</p>
    </div>

    <!-- No leagues yet -->
    <div v-if="!leagueStore.loading && !leagueStore.myLeagues.length" class="mb-8">
      <BaseCard>
        <div class="text-center py-6">
          <div class="text-4xl mb-3">🏆</div>
          <h2 class="text-lg font-bold text-slate-100 mb-2">Join or create a league to get started</h2>
          <p class="text-slate-400 text-sm mb-5">Leagues let you draft teams and compete with friends.</p>
          <BaseButton @click="router.push({ name: 'leagues' })">Go to My Leagues</BaseButton>
        </div>
      </BaseCard>
    </div>

    <!-- Stats (only when in a league) -->
    <div v-if="firstLeague" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Your Rank
          <span class="normal-case font-normal text-slate-600 ml-1">in {{ firstLeague.name }}</span>
        </div>
        <div class="text-3xl font-black text-gold-500">{{ myRank ? `#${myRank}` : '—' }}</div>
        <div class="text-slate-400 text-sm">out of {{ leaderboardStore.entries.length }} players</div>
      </BaseCard>
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Predictor Pts</div>
        <div class="text-3xl font-black text-slate-100">{{ myEntry?.predictor_points ?? 0 }}</div>
      </BaseCard>
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Draft Pts</div>
        <div class="text-3xl font-black text-slate-100">{{ myEntry?.draft_points ?? 0 }}</div>
      </BaseCard>
    </div>

    <!-- League shortcuts -->
    <div v-if="leagueStore.myLeagues.length > 1" class="mb-8">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">My Leagues</h2>
      <div class="flex flex-col gap-2">
        <button
          v-for="league in leagueStore.myLeagues.slice(0, 3)"
          :key="league.id"
          class="text-left bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between hover:border-gold-500/40 transition-all"
          @click="router.push({ name: 'league-home', params: { leagueId: league.id } })"
        >
          <span class="font-semibold text-slate-100">{{ league.name }}</span>
          <span class="text-slate-600">›</span>
        </button>
      </div>
    </div>

    <!-- Next matches -->
    <div>
      <h2 class="text-lg font-bold text-slate-100 mb-3">Upcoming Matches</h2>
      <div v-if="nextMatches.length" class="flex flex-col gap-3">
        <BaseCard v-for="match in nextMatches" :key="match.id">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1">
              <span class="font-semibold text-slate-100">{{ match.home_team?.name }}</span>
            </div>
            <div class="text-center px-4">
              <div class="text-gold-500 font-bold text-xs">{{ dayjs(match.match_date).fromNow() }}</div>
              <div class="text-slate-400 text-xs">{{ dayjs(match.match_date).format('MMM D, HH:mm') }}</div>
            </div>
            <div class="flex items-center gap-3 flex-1 justify-end">
              <span class="font-semibold text-slate-100">{{ match.away_team?.name }}</span>
            </div>
          </div>
        </BaseCard>
      </div>
      <div v-else class="text-slate-500 text-sm">No upcoming matches.</div>
    </div>
  </div>
</template>
