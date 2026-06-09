<script setup lang="ts">
import { useCountdown } from '@/composables/useCountdown'
import type { Stage } from '@/types/app.types'
import { useMatchesStore } from '@/stores/matches.store'
import { Lock, Clock } from 'lucide-vue-next'

const props = defineProps<{ stage: Stage }>()
const matchesStore = useMatchesStore()

const { formatted, urgency, isExpired } = useCountdown(() => matchesStore.stageLockTime(props.stage))
</script>

<template>
  <div
    :class="[
      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
      matchesStore.isStageLocked(stage)
        ? 'bg-navy-700 text-slate-400'
        : urgency === 'critical'
          ? 'bg-wc-red-600/20 text-wc-red-500 border border-wc-red-600/30'
          : urgency === 'warning'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    ]"
  >
    <template v-if="matchesStore.isStageLocked(stage)">
      <Lock :size="12" class="shrink-0" /> Locked
    </template>
    <template v-else>
      <Clock :size="12" class="shrink-0" /> Closes {{ formatted }}
    </template>
  </div>
</template>
