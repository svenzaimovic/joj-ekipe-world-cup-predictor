<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useLeagueStore } from '@/stores/league.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { Crown, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { TIER_COLORS, TIER_LABELS } from '@/types/app.types'
import type { Team, TeamTier } from '@/types/app.types'
import { useElimination } from '@/composables/useElimination'

const route = useRoute()
const leaderboardStore = useLeaderboardStore()
const leagueStore = useLeagueStore()
const auth = useAuthStore()

const leagueId = computed(() => route.params.leagueId as string)
const leaderboardChannel = ref<ReturnType<typeof leaderboardStore.subscribeToUpdates> | null>(null)

// Accordion state
const expanded = ref<Set<string>>(new Set())
const userLoading = ref<Set<string>>(new Set())

interface TeamBreakdown {
  team: Team
  wins: number
  draws: number
  qualify: number
  total: number
}

const userTeams = ref<Map<string, TeamBreakdown[]>>(new Map())

const { fetchElimination, isEliminated } = useElimination()

// Cache official room ID for this league
let officialRoomId: string | null = null

onMounted(async () => {
  await leaderboardStore.fetch(leagueId.value)
  leaderboardChannel.value = leaderboardStore.subscribeToUpdates(leagueId.value)

  // Pre-fetch room id and elimination state in parallel
  const [{ data: room }] = await Promise.all([
    supabase.from('draft_rooms').select('id').eq('league_id', leagueId.value).eq('room_type', 'official').maybeSingle(),
    fetchElimination(leagueId.value),
  ])
  officialRoomId = room?.id ?? null
})

onUnmounted(() => {
  leaderboardChannel.value?.unsubscribe()
})

async function toggleUser(userId: string) {
  if (expanded.value.has(userId)) {
    expanded.value.delete(userId)
    return
  }
  expanded.value.add(userId)

  if (userTeams.value.has(userId) || !officialRoomId) return

  userLoading.value.add(userId)
  try {
    const [picksRes, pointsRes] = await Promise.all([
      supabase
        .from('draft_picks')
        .select('team_id, teams(*)')
        .eq('room_id', officialRoomId)
        .eq('user_id', userId),
      supabase
        .from('draft_points')
        .select('team_id, points, reason')
        .eq('user_id', userId)
        .eq('league_id', leagueId.value),
    ])

    const picks = picksRes.data ?? []
    const points = pointsRes.data ?? []

    const breakdown: TeamBreakdown[] = picks.map((pick: any) => {
      const teamPts = points.filter((p: any) => p.team_id === pick.team_id)
      const wins = teamPts.filter((p: any) => p.reason === 'win').reduce((s: number, p: any) => s + p.points, 0)
      const draws = teamPts.filter((p: any) => p.reason === 'draw').reduce((s: number, p: any) => s + p.points, 0)
      const qualify = teamPts.filter((p: any) => p.reason === 'qualify').reduce((s: number, p: any) => s + p.points, 0)
      return {
        team: pick.teams as Team,
        wins,
        draws,
        qualify,
        total: wins + draws + qualify,
      }
    })

    breakdown.sort((a, b) => b.total - a.total)
    userTeams.value.set(userId, breakdown)
  } finally {
    userLoading.value.delete(userId)
  }
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-8">
    <div class="mb-6">
      <h1 class="text-2xl font-black text-slate-100">Standings</h1>
      <p class="text-slate-500 text-sm mt-0.5">{{ leagueStore.activeLeague?.name }}</p>
    </div>

    <LoadingSpinner v-if="leaderboardStore.loading" class="py-12" />

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(entry, idx) in leaderboardStore.entries"
        :key="entry.user_id"
        :class="[
          'rounded-xl border transition-all overflow-hidden',
          entry.user_id === auth.user?.id ? 'border-gold-500/40 bg-gold-500/5' : 'border-navy-700 bg-navy-800',
        ]"
      >
        <!-- Row header — always visible, click to toggle -->
        <button
          class="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
          @click="toggleUser(entry.user_id)"
        >
          <div class="w-8 text-center font-black text-lg shrink-0">
            <Crown v-if="idx === 0" :size="18" class="text-gold-500 mx-auto" />
            <span v-else class="text-sm font-black text-slate-500">#{{ idx + 1 }}</span>
          </div>
          <div class="flex-1 font-bold text-slate-100 flex items-center gap-2 min-w-0">
            <span class="truncate">{{ entry.username }}</span>
            <span v-if="entry.user_id === auth.user?.id" class="text-xs text-gold-500 font-semibold shrink-0">(you)</span>
          </div>
          <div class="text-2xl font-black shrink-0" :class="idx === 0 ? 'text-gold-500' : 'text-slate-100'">
            {{ entry.draft_points }}
            <span class="text-xs font-normal text-slate-500">pts</span>
          </div>
          <div class="text-slate-500 shrink-0">
            <ChevronUp v-if="expanded.has(entry.user_id)" :size="18" />
            <ChevronDown v-else :size="18" />
          </div>
        </button>

        <!-- Expanded team breakdown -->
        <div v-if="expanded.has(entry.user_id)" class="border-t border-navy-700 px-4 pb-4 pt-3">
          <div v-if="userLoading.has(entry.user_id)" class="flex justify-center py-4">
            <div class="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else-if="userTeams.get(entry.user_id)?.length" class="flex flex-col gap-2">
            <div
              v-for="item in userTeams.get(entry.user_id)"
              :key="item.team.id"
              :class="['flex items-center gap-3 bg-navy-900/60 rounded-lg px-3 py-2', isEliminated(item.team.id) ? 'opacity-50' : '']"
            >
              <img
                v-if="item.team.flag_url"
                :src="item.team.flag_url"
                :alt="item.team.name"
                :class="['w-7 h-5 object-cover rounded-sm shrink-0 shadow', isEliminated(item.team.id) ? 'grayscale' : '']"
              />
              <div v-else class="w-7 h-5 bg-navy-700 rounded-sm shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[item.team.tier as TeamTier]?.dot]" />
                  <span :class="['text-sm font-semibold text-slate-200 truncate', isEliminated(item.team.id) ? 'line-through decoration-slate-500' : '']">{{ item.team.name }}</span>
                  <span :class="['text-xs shrink-0', TIER_COLORS[item.team.tier as TeamTier]?.text]">T{{ item.team.tier }}</span>
                  <span v-if="isEliminated(item.team.id)" class="text-[10px] font-semibold text-slate-500 bg-navy-800 rounded px-1 py-0.5 shrink-0 uppercase tracking-wide">out</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                  <span v-if="item.wins > 0">Win {{ item.wins }}pts</span>
                  <span v-if="item.draws > 0">Draw {{ item.draws }}pts</span>
                  <span v-if="item.qualify > 0">Qualify +{{ item.qualify }}pts</span>
                  <span v-if="item.total === 0" class="text-slate-600">No points yet</span>
                </div>
              </div>
              <div class="font-black text-slate-100 text-sm shrink-0">
                {{ item.total }}<span class="text-xs font-normal text-slate-500">pts</span>
              </div>
            </div>
          </div>
          <div v-else class="text-slate-500 text-sm text-center py-3">No teams drafted yet.</div>
        </div>
      </div>

      <div v-if="!leaderboardStore.entries.length" class="text-center text-slate-500 py-12">
        No scores yet — draft points will appear here once matches are played.
      </div>
    </div>
  </div>
</template>
