<script setup lang="ts">
import { ref, provide } from 'vue'
import BaseToast from '@/components/ui/BaseToast.vue'

const toast = ref<InstanceType<typeof BaseToast> | null>(null)
provide('toast', toast)
</script>

<template>
  <RouterView />
  <BaseToast ref="toast" />
</template>
