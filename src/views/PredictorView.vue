<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useMatchesStore } from '@/stores/matches.store'
import { usePredictionsStore } from '@/stores/predictions.store'
import MatchCard from '@/components/predictor/MatchCard.vue'
import StageLockBadge from '@/components/predictor/StageLockBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { STAGE_LABELS, type Stage } from '@/types/app.types'
import type { Ref } from 'vue'
import type BaseToast from '@/components/ui/BaseToast.vue'

const matchesStore = useMatchesStore()
const predictionsStore = usePredictionsStore()
const toast = inject<Ref<InstanceType<typeof BaseToast> | null>>('toast')

const activeStage = ref<Stage>('group')

onMounted(async () => {
  await Promise.all([matchesStore.fetchAll(), predictionsStore.fetchMine()])
  if (matchesStore.availableStages.length) {
    activeStage.value = matchesStore.availableStages[0]
  }
})

const activeMatches = computed(() => matchesStore.matchesByStage[activeStage.value] ?? [])
const isLocked = computed(() => matchesStore.isStageLocked(activeStage.value))
const hasDrafts = computed(() => predictionsStore.drafts.size > 0)

async function save() {
  try {
    await predictionsStore.saveStage(activeStage.value)
    toast?.value?.add('Predictions saved!', 'success')
  } catch (e) {
    toast?.value?.add('Failed to save predictions.', 'error')
  }
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto pb-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-black text-slate-100">Predictor</h1>
      <BaseButton v-if="!isLocked && hasDrafts" :loading="predictionsStore.saving" @click="save">
        Save Predictions
      </BaseButton>
    </div>

    <!-- Stage tabs -->
    <div class="flex gap-1 bg-navy-800 p-1 rounded-xl border border-navy-700 mb-6 overflow-x-auto">
      <button
        v-for="stage in matchesStore.availableStages"
        :key="stage"
        :class="[
          'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
          activeStage === stage
            ? 'bg-gold-500 text-navy-900'
            : 'text-slate-400 hover:text-slate-100',
        ]"
        @click="activeStage = stage"
      >
        {{ STAGE_LABELS[stage] }}
      </button>
    </div>

    <!-- Lock status -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-100">{{ STAGE_LABELS[activeStage] }}</h2>
      <StageLockBadge :stage="activeStage" />
    </div>

    <LoadingSpinner v-if="matchesStore.loading || predictionsStore.loading" class="py-12" />

    <div v-else-if="!predictionsStore.loading" class="flex flex-col gap-3">
      <MatchCard
        v-for="match in activeMatches"
        :key="match.id"
        :match="match"
        :locked="isLocked"
      />
      <div v-if="!activeMatches.length" class="text-center text-slate-500 py-12">
        No matches yet for this stage.
      </div>
    </div>

    <!-- Floating save bar -->
    <Transition name="slide-up">
      <div
        v-if="!isLocked && hasDrafts"
        class="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-navy-800 border border-gold-500/30 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-4 z-30"
      >
        <span class="text-sm text-slate-300">{{ predictionsStore.drafts.size }} unsaved prediction{{ predictionsStore.drafts.size > 1 ? 's' : '' }}</span>
        <BaseButton :loading="predictionsStore.saving" size="sm" @click="save">Save all</BaseButton>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
