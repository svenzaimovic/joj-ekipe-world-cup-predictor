<script setup lang="ts">
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

function add(message: string, type: Toast['type'] = 'info') {
  const id = ++nextId
  toasts.value.push({ id, message, type })
  setTimeout(() => remove(id), 4000)
}

function remove(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

defineExpose({ add })
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
    <Transition v-for="toast in toasts" :key="toast.id" name="toast">
      <div
        :class="[
          'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : '',
          toast.type === 'error' ? 'bg-wc-red-600 text-white' : '',
          toast.type === 'info' ? 'bg-navy-700 text-slate-100 border border-navy-600' : '',
        ]"
      >
        {{ toast.message }}
        <button class="ml-2 opacity-70 hover:opacity-100" @click="remove(toast.id)">✕</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
