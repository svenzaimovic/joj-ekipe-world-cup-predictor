<script setup lang="ts">
import AppNav from '@/components/layout/AppNav.vue'
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex">
    <!-- Desktop sidebar -->
    <AppNav class="hidden md:flex" />

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>

    <!-- Mobile bottom nav -->
    <AppNav class="md:hidden" :mobile="true" />
  </div>
</template>
