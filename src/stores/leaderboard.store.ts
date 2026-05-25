import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/types/app.types'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    const { data } = await supabase.from('leaderboard').select('*')
    entries.value = (data ?? []) as LeaderboardEntry[]
    loading.value = false
  }

  function subscribeToUpdates() {
    return supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_points' }, () => fetch())
      .subscribe()
  }

  return { entries, loading, fetch, subscribeToUpdates }
})
