<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { TIER_COLORS, TIER_LABELS } from '@/types/app.types'
import type { Team, TeamTier } from '@/types/app.types'
import BaseCard from '@/components/ui/BaseCard.vue'
import { Shuffle } from 'lucide-vue-next'

const route = useRoute()
const auth = useAuthStore()
const leagueId = route.params.leagueId as string

interface TeamWithPoints extends Team {
  earnedPoints: number
}

const teams = ref<TeamWithPoints[]>([])
const loading = ref(true)
const noDraft = ref(false)

const totalPoints = computed(() => teams.value.reduce((s, t) => s + t.earnedPoints, 0))
const sortedTeams = computed(() =>
  [...teams.value].sort((a, b) => b.earnedPoints - a.earnedPoints || a.name.localeCompare(b.name))
)

onMounted(async () => {
  if (!auth.user) return

  // Find the official draft room for this league
  const { data: room } = await supabase
    .from('draft_rooms')
    .select('id')
    .eq('league_id', leagueId)
    .eq('room_type', 'official')
    .single()

  if (!room) {
    noDraft.value = true
    loading.value = false
    return
  }

  // Get this user's picks from the official room
  const { data: picks } = await supabase
    .from('draft_picks')
    .select('team_id, teams(*)')
    .eq('room_id', room.id)
    .eq('user_id', auth.user.id)

  if (!picks || picks.length === 0) {
    noDraft.value = true
    loading.value = false
    return
  }

  // Get points earned per team for this user in this league
  const { data: points } = await supabase
    .from('draft_points')
    .select('team_id, points')
    .eq('user_id', auth.user.id)
    .eq('league_id', leagueId)

  const pointsByTeam: Record<number, number> = {}
  for (const p of points ?? []) {
    pointsByTeam[p.team_id] = (pointsByTeam[p.team_id] ?? 0) + p.points
  }

  teams.value = picks.map((p) => ({
    ...(p.teams as unknown as Team),
    earnedPoints: pointsByTeam[(p.teams as unknown as Team).id] ?? 0,
  }))

  loading.value = false
})
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-black text-slate-100">My Teams</h1>
      <div v-if="!loading && teams.length" class="text-right">
        <div class="text-2xl font-black text-gold-400">{{ totalPoints }}</div>
        <div class="text-xs text-slate-500 uppercase tracking-wider">total pts</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- No draft yet -->
    <BaseCard v-else-if="noDraft" class="text-center py-10">
      <div class="mb-3"><Shuffle :size="40" class="mx-auto" /></div>
      <p class="text-slate-300 font-semibold">No teams drafted yet</p>
      <p class="text-slate-500 text-sm mt-1">Complete the league draft to see your teams here.</p>
    </BaseCard>

    <!-- Teams list -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="team in sortedTeams"
        :key="team.id"
        :class="['flex items-center gap-4 p-4 rounded-xl border bg-navy-800 transition-all', TIER_COLORS[team.tier as TeamTier].border]"
      >
        <!-- Flag -->
        <img
          :src="team.flag_url ?? ''"
          :alt="team.name"
          class="w-10 h-7 object-cover rounded shadow shrink-0"
        />

        <!-- Name + tier -->
        <div class="flex-1 min-w-0">
          <div class="font-bold text-slate-100 truncate">{{ team.name }}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <div :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[team.tier as TeamTier].dot]" />
            <span :class="['text-xs font-semibold', TIER_COLORS[team.tier as TeamTier].text]">
              T{{ team.tier }} · {{ TIER_LABELS[team.tier as TeamTier] }}
            </span>
            <span class="text-slate-600 text-xs">· Group {{ team.group_name }}</span>
          </div>
        </div>

        <!-- Points -->
        <div class="text-right shrink-0">
          <div :class="['text-xl font-black', team.earnedPoints > 0 ? 'text-gold-400' : 'text-slate-600']">
            {{ team.earnedPoints }}
          </div>
          <div class="text-[10px] text-slate-600 uppercase tracking-wide">pts</div>
        </div>
      </div>
    </div>
  </div>
</template>
