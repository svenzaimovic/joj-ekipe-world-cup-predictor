<script setup lang="ts">
import { ref, computed } from 'vue'
import TeamCard from './TeamCard.vue'
import type { Team, TeamTier } from '@/types/app.types'
import { TIER_LABELS, TIER_COLORS } from '@/types/app.types'
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

const tierGroups = computed(() => {
  const tiers: TeamTier[] = [1, 2, 3, 4]
  return tiers
    .map((tier) => ({ tier, teams: filteredTeams.value.filter((t) => t.tier === tier) }))
    .filter((g) => g.teams.length > 0)
})
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

    <div class="flex flex-col gap-5">
      <div v-for="group in tierGroups" :key="group.tier">
        <!-- Tier header -->
        <div class="flex items-center gap-2 mb-2">
          <div :class="['w-2 h-2 rounded-full shrink-0', TIER_COLORS[group.tier].dot]" />
          <span :class="['text-xs font-bold uppercase tracking-wider', TIER_COLORS[group.tier].text]">
            Tier {{ group.tier }} · {{ TIER_LABELS[group.tier] }}
          </span>
          <div class="flex-1 h-px bg-navy-700" />
          <span class="text-[10px] text-slate-600">{{ group.teams.filter(t => !draftStore.pickedTeamIds.has(t.id)).length }} left</span>
        </div>

        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          <TeamCard
            v-for="team in group.teams"
            :key="team.id"
            :team="team"
            :picked="draftStore.pickedTeamIds.has(team.id)"
            :selectable="draftStore.isMyTurn"
            @select="emit('pick', team)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
