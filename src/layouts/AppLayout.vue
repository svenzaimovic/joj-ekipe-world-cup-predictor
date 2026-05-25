<script setup lang="ts">
import AppNav from '@/components/layout/AppNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex flex-col">
    <AppHeader />
    <div class="flex flex-1">
      <AppNav class="hidden md:flex" />
      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
    <!-- Mobile bottom nav -->
    <AppNav class="md:hidden" :mobile="true" />
  </div>
</template>
