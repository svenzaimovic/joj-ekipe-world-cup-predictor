<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePickTimer } from '@/composables/usePickTimer'

const props = defineProps<{
  totalSeconds: number
  active: boolean
}>()

const emit = defineEmits<{ expire: [] }>()

const { secondsLeft, urgency, circumference, strokeDashoffset, reset, stop } = usePickTimer(
  props.totalSeconds,
  () => emit('expire'),
)

watch(() => props.active, (val) => {
  if (val) reset()
  else stop()
}, { immediate: true })

const strokeColor = computed(() => {
  if (urgency.value === 'critical') return '#D62828'
  if (urgency.value === 'warning') return '#F59E0B'
  return '#C9A84C'
})
</script>

<template>
  <div class="relative inline-flex items-center justify-center">
    <svg width="96" height="96" class="-rotate-90">
      <circle cx="48" cy="48" r="40" fill="none" stroke="#1B2A3B" stroke-width="6" />
      <circle
        cx="48" cy="48" r="40" fill="none"
        :stroke="strokeColor"
        stroke-width="6"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        class="transition-all duration-1000"
      />
    </svg>
    <div class="absolute text-center">
      <div :class="['text-2xl font-black', urgency === 'critical' ? 'text-wc-red-500' : 'text-slate-100']">
        {{ secondsLeft }}
      </div>
      <div class="text-xs text-slate-500">sec</div>
    </div>
  </div>
</template>
