<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useMatchesStore } from '@/stores/matches.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const leaderboardStore = useLeaderboardStore()

onMounted(async () => {
  await Promise.all([matchesStore.fetchAll(), leaderboardStore.fetch()])
})

const nextMatches = computed(() =>
  matchesStore.matches
    .filter((m) => m.status === 'scheduled' && m.home_team && m.away_team)
    .slice(0, 3),
)

const myRank = computed(() => {
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
      <p class="text-slate-400 mt-1 text-sm">FIFA World Cup 2026 — USA, Canada & Mexico</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Rank</div>
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
