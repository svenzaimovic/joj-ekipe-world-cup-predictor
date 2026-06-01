import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types/app.types'

export const useLeagueStore = defineStore('league', () => {
  const myLeagues = ref<League[]>([])
  const activeLeague = ref<League | null>(null)
  const loading = ref(false)

  async function fetchMyLeagues() {
    loading.value = true
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: true })
    myLeagues.value = (data ?? []) as League[]
    loading.value = false
  }

  async function setActiveLeague(leagueId: string): Promise<boolean> {
    // Check if we already have it loaded
    const cached = myLeagues.value.find((l) => l.id === leagueId)
    if (cached) {
      activeLeague.value = cached
      return true
    }
    // Fetch from DB (will only succeed if user is a member per RLS)
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .maybeSingle()
    if (!data) {
      activeLeague.value = null
      return false
    }
    activeLeague.value = data as League
    // Add to myLeagues if not present
    if (!myLeagues.value.find((l) => l.id === leagueId)) {
      myLeagues.value.push(data as League)
    }
    return true
  }

  async function createLeague(name: string): Promise<{ league_id: string; invite_code: string }> {
    const { data, error } = await supabase.functions.invoke('league-create', {
      body: { name },
    })
    if (error) throw error
    await fetchMyLeagues()
    return data as { league_id: string; invite_code: string }
  }

  async function joinLeague(inviteCode: string): Promise<{ league_id: string; league_name: string }> {
    const { data, error } = await supabase.functions.invoke('league-join', {
      body: { invite_code: inviteCode },
    })
    if (error) throw error
    await fetchMyLeagues()
    return data as { league_id: string; league_name: string }
  }

  async function deleteLeague(leagueId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('league-delete', {
      body: { league_id: leagueId },
    })
    if (error) throw error
    myLeagues.value = myLeagues.value.filter((l) => l.id !== leagueId)
    if (activeLeague.value?.id === leagueId) activeLeague.value = null
  }

  function getLeagueMemberUserIds(leagueId: string): Promise<string[]> {
    return supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)
      .then(({ data }) => (data ?? []).map((m: { user_id: string }) => m.user_id))
  }

  return {
    myLeagues, activeLeague, loading,
    fetchMyLeagues, setActiveLeague, createLeague, joinLeague, deleteLeague, getLeagueMemberUserIds,
  }
})
