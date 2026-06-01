<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useLeagueStore } from '@/stores/league.store'
import { useAuthStore } from '@/stores/auth.store'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const route = useRoute()
const leaderboardStore = useLeaderboardStore()
const leagueStore = useLeagueStore()
const auth = useAuthStore()
const tab = ref<'total' | 'predictor' | 'draft'>('total')

const leagueId = computed(() => route.params.leagueId as string)
const leaderboardChannel = ref<ReturnType<typeof leaderboardStore.subscribeToUpdates> | null>(null)

onMounted(async () => {
  await leaderboardStore.fetch(leagueId.value)
  leaderboardChannel.value = leaderboardStore.subscribeToUpdates(leagueId.value)
})

onUnmounted(() => {
  leaderboardChannel.value?.unsubscribe()
})

const medals = ['🥇', '🥈', '🥉']
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
    <div class="mb-6">
      <h1 class="text-2xl font-black text-slate-100">Standings</h1>
      <p class="text-slate-500 text-sm mt-0.5">{{ leagueStore.activeLeague?.name }}</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-navy-800 p-1 rounded-xl border border-navy-700 mb-6">
      <button
        v-for="t in (['total', 'predictor', 'draft'] as const)"
        :key="t"
        :class="['flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize', tab === t ? 'bg-gold-500 text-navy-900' : 'text-slate-400 hover:text-slate-100']"
        @click="tab = t"
      >
        {{ t === 'total' ? 'Overall' : t === 'predictor' ? 'Predictor' : 'Draft' }}
      </button>
    </div>

    <LoadingSpinner v-if="leaderboardStore.loading" class="py-12" />

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(entry, idx) in leaderboardStore.entries"
        :key="entry.user_id"
        :class="[
          'bg-navy-800 rounded-xl border p-4 flex items-center gap-4 transition-all',
          entry.user_id === auth.user?.id ? 'border-gold-500/40 bg-gold-500/5' : 'border-navy-700',
        ]"
      >
        <div class="w-8 text-center font-black text-lg">
          {{ medals[idx] ?? `#${idx + 1}` }}
        </div>
        <div class="flex-1">
          <div class="font-bold text-slate-100 flex items-center gap-2">
            {{ entry.username }}
            <span v-if="entry.user_id === auth.user?.id" class="text-xs text-gold-500 font-semibold">(you)</span>
          </div>
          <div class="text-xs text-slate-500 flex gap-3 mt-0.5">
            <span>Predictor: {{ entry.predictor_points }}</span>
            <span>Draft: {{ entry.draft_points }}</span>
          </div>
        </div>
        <div class="text-2xl font-black" :class="idx === 0 ? 'text-gold-500' : 'text-slate-100'">
          {{ tab === 'total' ? entry.total_points : tab === 'predictor' ? entry.predictor_points : entry.draft_points }}
          <span class="text-xs font-normal text-slate-500">pts</span>
        </div>
      </div>

      <div v-if="!leaderboardStore.entries.length" class="text-center text-slate-500 py-12">
        No scores yet. Predictions will appear here once matches are played.
      </div>
    </div>
  </div>
</template>
