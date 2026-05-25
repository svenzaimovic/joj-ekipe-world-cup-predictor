<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="['bg-navy-800 rounded-xl border border-navy-700 p-4', $attrs.class]">
    <slot />
  </div>
</template>
