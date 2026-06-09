<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

// Supabase JS v2 automatically detects the ?code= param in the OAuth redirect
// URL and exchanges it for a session during _initialize(). Once it completes,
// onAuthStateChange fires with SIGNED_IN, which sets auth.user in our store.
// Watch for it and redirect home (immediate: true handles the race where the
// exchange already finished before this component mounted).
watch(
  () => auth.user,
  (u) => {
    if (u) router.replace({ name: 'home' })
  },
  { immediate: true },
)

// Fallback: if nothing happens in 10 s something went wrong — send to login
const fallbackTimer = setTimeout(() => {
  if (!auth.user) router.replace({ name: 'login' })
}, 10_000)

// Clean up the timer if auth resolves before it fires
watch(() => auth.user, (u) => { if (u) clearTimeout(fallbackTimer) })
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-6">
    <img src="@/assets/logo.png" alt="WC Draft 2026" class="w-32 opacity-90" />
    <div class="relative w-10 h-10">
      <div class="absolute inset-0 rounded-full border-2 border-navy-700" />
      <div class="absolute inset-0 rounded-full border-2 border-t-gold-500 animate-spin" />
    </div>
    <p class="text-slate-400 text-sm">Signing you in…</p>
  </div>
</template>
