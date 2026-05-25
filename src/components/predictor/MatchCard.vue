<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ScoreInput from './ScoreInput.vue'
import type { Match } from '@/types/app.types'
import { calculatePredictorPoints } from '@/types/app.types'
import { usePredictionsStore } from '@/stores/predictions.store'
import { useMatchesStore } from '@/stores/matches.store'
import dayjs from 'dayjs'

const props = defineProps<{ match: Match; locked: boolean }>()

const predictionsStore = usePredictionsStore()
const matchesStore = useMatchesStore()

const saved = computed(() => predictionsStore.getPrediction(props.match.id))
const draft = computed(() => predictionsStore.getDraft(props.match.id))

const homeScore = ref(draft.value?.home_score_pred ?? saved.value?.home_score_pred ?? 0)
const awayScore = ref(draft.value?.away_score_pred ?? saved.value?.away_score_pred ?? 0)

watch([homeScore, awayScore], () => {
  if (!props.locked) {
    predictionsStore.setDraft(props.match.id, homeScore.value, awayScore.value)
  }
})

const pointsEarned = computed(() => {
  if (!saved.value || props.match.home_score === null || props.match.away_score === null) return null
  return calculatePredictorPoints(saved.value.home_score_pred, saved.value.away_score_pred, props.match.home_score, props.match.away_score)
})

const isFinished = computed(() => props.match.status === 'finished')
const isLive = computed(() => props.match.status === 'live')
</script>

<template>
  <div
    :class="[
      'bg-navy-800 rounded-xl border p-4 transition-all',
      isLive ? 'border-wc-red-500/50 shadow-wc-red-500/10 shadow-lg' : 'border-navy-700',
    ]"
  >
    <!-- Match time -->
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-slate-500">
        {{ match.venue }}
      </span>
      <div class="flex items-center gap-2">
        <span
          v-if="isLive"
          class="text-xs font-bold text-wc-red-500 animate-pulse bg-wc-red-500/10 px-2 py-0.5 rounded-full"
        >LIVE</span>
        <span class="text-xs text-slate-400">{{ dayjs(match.match_date).format('ddd MMM D, HH:mm') }}</span>
      </div>
    </div>

    <!-- Teams + scores -->
    <div class="flex items-center gap-4">
      <!-- Home team -->
      <div class="flex-1 flex flex-col items-end gap-1">
        <span class="font-bold text-slate-100 text-right">{{ match.home_team?.name ?? 'TBD' }}</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider">{{ match.home_team?.code }}</span>
      </div>

      <!-- Score area -->
      <div class="flex flex-col items-center gap-2 min-w-[140px]">
        <div v-if="isFinished || isLive" class="flex items-center gap-2">
          <span class="text-3xl font-black text-slate-100">{{ match.home_score }}</span>
          <span class="text-slate-500 text-xl">–</span>
          <span class="text-3xl font-black text-slate-100">{{ match.away_score }}</span>
        </div>
        <div v-else class="flex items-center gap-3">
          <ScoreInput v-model="homeScore" :disabled="locked" />
          <span class="text-slate-500">–</span>
          <ScoreInput v-model="awayScore" :disabled="locked" />
        </div>

        <!-- Points badge -->
        <div v-if="pointsEarned !== null" :class="[
          'text-xs font-bold px-2 py-0.5 rounded-full',
          pointsEarned === 5 ? 'bg-gold-500/20 text-gold-400' :
          pointsEarned > 0 ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-navy-700 text-slate-500'
        ]">
          {{ pointsEarned === 5 ? '⭐ ' : '' }}{{ pointsEarned }} pts
        </div>
        <div v-else-if="saved && !isFinished" class="text-xs text-slate-500">
          Saved: {{ saved.home_score_pred }}–{{ saved.away_score_pred }}
        </div>
        <div v-else-if="!locked && !isFinished" class="text-xs text-slate-500 italic">
          Not predicted
        </div>
      </div>

      <!-- Away team -->
      <div class="flex-1 flex flex-col items-start gap-1">
        <span class="font-bold text-slate-100">{{ match.away_team?.name ?? 'TBD' }}</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider">{{ match.away_team?.code }}</span>
      </div>
    </div>
  </div>
</template>
