<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function increment() {
  if (!props.disabled) emit('update:modelValue', Math.min(props.modelValue + 1, 20))
}

function decrement() {
  if (!props.disabled) emit('update:modelValue', Math.max(props.modelValue - 1, 0))
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      :disabled="disabled || modelValue <= 0"
      class="w-7 h-7 rounded-md bg-navy-700 text-slate-300 hover:bg-navy-600 hover:text-white disabled:opacity-30 font-bold text-base transition-colors flex items-center justify-center"
      @click="decrement"
    >−</button>
    <div class="w-9 text-center font-black text-xl text-slate-100">{{ modelValue }}</div>
    <button
      type="button"
      :disabled="disabled || modelValue >= 20"
      class="w-7 h-7 rounded-md bg-navy-700 text-slate-300 hover:bg-navy-600 hover:text-white disabled:opacity-30 font-bold text-base transition-colors flex items-center justify-center"
      @click="increment"
    >+</button>
  </div>
</template>
