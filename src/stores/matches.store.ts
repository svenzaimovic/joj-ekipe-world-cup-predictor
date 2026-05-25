import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Match, StageLock, Stage } from '@/types/app.types'
import { STAGE_ORDER } from '@/types/app.types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const stageLocks = ref<StageLock[]>([])
  const loading = ref(false)

  const matchesByStage = computed(() => {
    const grouped: Partial<Record<Stage, Match[]>> = {}
    for (const match of matches.value) {
      const stage = match.stage as Stage
      if (!grouped[stage]) grouped[stage] = []
      grouped[stage]!.push(match)
    }
    return grouped
  })

  const availableStages = computed<Stage[]>(() =>
    STAGE_ORDER.filter((s) => matchesByStage.value[s]?.length),
  )

  function isStageLocked(stage: Stage): boolean {
    const lock = stageLocks.value.find((l) => l.stage === stage)
    if (!lock) return false
    return lock.locked || new Date(lock.locks_at) <= new Date()
  }

  function stageLockTime(stage: Stage): string | null {
    return stageLocks.value.find((l) => l.stage === stage)?.locks_at ?? null
  }

  async function fetchAll() {
    loading.value = true
    const [matchesRes, locksRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .order('match_date', { ascending: true }),
      supabase.from('stage_locks').select('*'),
    ])
    matches.value = (matchesRes.data ?? []) as Match[]
    stageLocks.value = (locksRes.data ?? []) as StageLock[]
    loading.value = false
  }

  function subscribeToLiveUpdates() {
    return supabase
      .channel('matches-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        const idx = matches.value.findIndex((m) => m.id === payload.new.id)
        if (idx !== -1) matches.value[idx] = { ...matches.value[idx], ...payload.new } as Match
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stage_locks' }, (payload) => {
        const idx = stageLocks.value.findIndex((l) => l.stage === payload.new.stage)
        if (idx !== -1) stageLocks.value[idx] = payload.new as StageLock
      })
      .subscribe()
  }

  return { matches, stageLocks, matchesByStage, availableStages, loading, isStageLocked, stageLockTime, fetchAll, subscribeToLiveUpdates }
})
