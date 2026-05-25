<script setup lang="ts">
import { ref, computed } from 'vue'
import TeamCard from './TeamCard.vue'
import type { Team } from '@/types/app.types'
import { useDraftStore } from '@/stores/draft.store'

const emit = defineEmits<{ pick: [team: Team] }>()

const draftStore = useDraftStore()
const search = ref('')
const groupFilter = ref<string>('all')

const groups = computed(() => {
  const gs = new Set(draftStore.teams.map((t) => t.group_name).filter(Boolean) as string[])
  return ['all', ...Array.from(gs).sort()]
})

const filteredTeams = computed(() =>
  draftStore.teams.filter((t) => {
    const matchesSearch = !search.value || t.name.toLowerCase().includes(search.value.toLowerCase()) || t.code.toLowerCase().includes(search.value.toLowerCase())
    const matchesGroup = groupFilter.value === 'all' || t.group_name === groupFilter.value
    return matchesSearch && matchesGroup
  }),
)
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <input
        v-model="search"
        placeholder="Search teams..."
        class="flex-1 min-w-40 bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500"
      />
      <select
        v-model="groupFilter"
        class="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-gold-500"
      >
        <option v-for="g in groups" :key="g" :value="g">{{ g === 'all' ? 'All groups' : `Group ${g}` }}</option>
      </select>
    </div>

    <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      <TeamCard
        v-for="team in filteredTeams"
        :key="team.id"
        :team="team"
        :picked="draftStore.pickedTeamIds.has(team.id)"
        :selectable="draftStore.isMyTurn"
        @select="emit('pick', team)"
      />
    </div>
  </div>
</template>
