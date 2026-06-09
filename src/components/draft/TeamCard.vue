<script setup lang="ts">
import type { Team } from '@/types/app.types'
import { TIER_COLORS } from '@/types/app.types'
import { Check } from 'lucide-vue-next'

defineProps<{
  team: Team
  picked?: boolean
  selectable?: boolean
  selected?: boolean
}>()

defineEmits<{ select: [team: Team] }>()
</script>

<template>
  <button
    :disabled="picked || !selectable"
    :class="[
      'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150 overflow-hidden',
      picked
        ? 'opacity-30 bg-navy-900 border-navy-700 cursor-not-allowed'
        : selectable
          ? selected
            ? 'bg-gold-500/20 border-gold-500 shadow-gold-500/20 shadow-lg scale-[1.02]'
            : `bg-navy-800 ${TIER_COLORS[team.tier].border} hover:${TIER_COLORS[team.tier].bg} cursor-pointer active:scale-95`
          : `bg-navy-800 ${TIER_COLORS[team.tier].border} cursor-default`,
    ]"
    @click="!picked && selectable && $emit('select', team)"
  >
    <!-- Tier color strip at top -->
    <div :class="['absolute top-0 left-0 right-0 h-0.5', TIER_COLORS[team.tier].dot]" />

    <!-- Flag or code fallback -->
    <div v-if="team.flag_url" class="w-10 h-7 rounded overflow-hidden flex items-center justify-center mt-1">
      <img :src="team.flag_url" :alt="team.name" class="w-full h-full object-cover" />
    </div>
    <div v-else class="w-10 h-7 rounded bg-navy-700 flex items-center justify-center text-xs font-bold text-slate-400 mt-1">
      {{ team.code }}
    </div>

    <div class="text-xs font-semibold text-slate-200 leading-tight">{{ team.name }}</div>

    <!-- Tier badge -->
    <div :class="['text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full', TIER_COLORS[team.tier].text, TIER_COLORS[team.tier].bg]">
      Tier {{ team.tier }}
    </div>

    <div v-if="picked" class="absolute inset-0 flex items-center justify-center opacity-50"><Check :size="20" /></div>
  </button>
</template>
