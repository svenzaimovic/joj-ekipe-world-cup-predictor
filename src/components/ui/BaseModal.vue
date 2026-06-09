<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{ title?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="emit('close')">
      <div class="bg-navy-800 rounded-2xl border border-navy-700 shadow-2xl w-full max-w-md">
        <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 class="text-lg font-bold text-slate-100">{{ title }}</h2>
          <button class="text-slate-400 hover:text-white" @click="emit('close')"><X :size="16" /></button>
        </div>
        <div class="p-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
