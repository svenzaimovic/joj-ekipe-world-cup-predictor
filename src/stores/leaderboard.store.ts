import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/types/app.types'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  const currentLeagueId = ref<string | null>(null)

  async function fetch(leagueId: string) {
    loading.value = true
    currentLeagueId.value = leagueId
    const { data } = await supabase.rpc('league_leaderboard', { p_league_id: leagueId })
    entries.value = (data ?? []) as LeaderboardEntry[]
    loading.value = false
  }

  function subscribeToUpdates(leagueId: string) {
    return supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_points' }, () => fetch(leagueId))
      .subscribe()
  }

  return { entries, loading, currentLeagueId, fetch, subscribeToUpdates }
})
