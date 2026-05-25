<script setup lang="ts">
import type { Team } from '@/types/app.types'

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
      'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
      picked
        ? 'opacity-30 bg-navy-900 border-navy-700 cursor-not-allowed'
        : selectable
          ? selected
            ? 'bg-gold-500/20 border-gold-500 shadow-gold-500/20 shadow-lg scale-[1.02]'
            : 'bg-navy-800 border-navy-700 hover:border-gold-500/50 hover:bg-navy-700 cursor-pointer active:scale-95'
          : 'bg-navy-800 border-navy-700 cursor-default',
    ]"
    @click="!picked && selectable && $emit('select', team)"
  >
    <!-- Flag or code fallback -->
    <div v-if="team.flag_url" class="w-10 h-7 rounded overflow-hidden flex items-center justify-center">
      <img :src="team.flag_url" :alt="team.name" class="w-full h-full object-cover" />
    </div>
    <div v-else class="w-10 h-7 rounded bg-navy-700 flex items-center justify-center text-xs font-bold text-slate-400">
      {{ team.code }}
    </div>
    <div class="text-xs font-semibold text-slate-200 leading-tight">{{ team.name }}</div>
    <div v-if="team.group_name" class="text-[10px] text-slate-500">Group {{ team.group_name }}</div>
    <div v-if="picked" class="absolute inset-0 flex items-center justify-center text-xl opacity-50">✓</div>
  </button>
</template>
