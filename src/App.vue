<script setup lang="ts">
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseToast from '@/components/ui/BaseToast.vue'

const toast = ref<InstanceType<typeof BaseToast> | null>(null)
provide('toast', toast)

const auth = useAuthStore()
const router = useRouter()

// True once the very first navigation has settled (guard resolved + component loaded)
const appReady = ref(false)
// Belt-and-suspenders: catch any navigation rejection so the overlay never hangs
router.isReady().then(() => { appReady.value = true }).catch(() => { appReady.value = true })
</script>

<template>
  <!-- Full-screen loading overlay shown while auth initialises -->
  <Transition name="fade">
    <div
      v-if="!appReady"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-900 gap-6"
    >
      <img src="@/assets/logo.png" alt="WC Draft 2026" class="w-32 opacity-90" />
      <!-- Spinner -->
      <div class="relative w-10 h-10">
        <div class="absolute inset-0 rounded-full border-2 border-navy-700" />
        <div class="absolute inset-0 rounded-full border-2 border-t-gold-500 animate-spin" />
      </div>
    </div>
  </Transition>

  <RouterView />
  <BaseToast ref="toast" />
</template>

<style scoped>
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
