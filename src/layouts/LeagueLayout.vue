<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league.store'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const leagueStore = useLeagueStore()

async function resolveLeague() {
  const leagueId = route.params.leagueId as string
  const found = await leagueStore.setActiveLeague(leagueId)
  if (!found) {
    router.replace({ name: 'leagues' })
  }
}

onMounted(resolveLeague)
watch(() => route.params.leagueId, resolveLeague)
</script>

<template>
  <div v-if="leagueStore.activeLeague" class="h-full">
    <RouterView />
  </div>
  <LoadingSpinner v-else class="py-24" />
</template>
