import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { DraftRoom, DraftPick, Team, Profile } from '@/types/app.types'

export const useDraftStore = defineStore('draft', () => {
  const room = ref<DraftRoom | null>(null)
  const picks = ref<DraftPick[]>([])
  const teams = ref<Team[]>([])
  const profiles = ref<Profile[]>([])
  const loading = ref(false)
  const pickLoading = ref(false)
  const timerStart = ref<Date | null>(null)

  const pickedTeamIds = computed(() => new Set(picks.value.map((p) => p.team_id)))

  const availableTeams = computed(() =>
    teams.value.filter((t) => !pickedTeamIds.value.has(t.id)),
  )

  const currentPickerUserId = computed<string | null>(() => {
    if (!room.value || room.value.status !== 'active') return null
    const order = room.value.pick_order
    if (!order.length) return null
    const pickIndex = room.value.current_pick_index
    const playerCount = order.length
    const snakeRound = Math.floor(pickIndex / playerCount)
    const posInRound = pickIndex % playerCount
    const forward = snakeRound % 2 === 0
    const playerIndex = forward ? posInRound : playerCount - 1 - posInRound
    return order[playerIndex] ?? null
  })

  const isMyTurn = computed(() => {
    const auth = useAuthStore()
    return currentPickerUserId.value === auth.user?.id
  })

  const teamsPerPlayer = computed(() => {
    if (!room.value?.pick_order.length) return 0
    return Math.floor(48 / room.value.pick_order.length)
  })

  const totalPicks = computed(() => teamsPerPlayer.value * (room.value?.pick_order.length ?? 0))

  const isDraftComplete = computed(() => picks.value.length >= totalPicks.value && totalPicks.value > 0)

  const picksByUser = computed(() => {
    const map = new Map<string, DraftPick[]>()
    for (const pick of picks.value) {
      if (!map.has(pick.user_id)) map.set(pick.user_id, [])
      map.get(pick.user_id)!.push(pick)
    }
    return map
  })

  async function fetchAll(leagueId: string, roomType: 'official' | 'practice' = 'official') {
    loading.value = true
    const [roomRes, teamsRes, profilesRes] = await Promise.all([
      supabase
        .from('draft_rooms')
        .select('*')
        .eq('league_id', leagueId)
        .eq('room_type', roomType)
        .maybeSingle(),
      supabase.from('teams').select('*').order('group_name').order('name'),
      supabase.from('profiles').select('*'),
    ])
    room.value = roomRes.data as DraftRoom | null
    teams.value = (teamsRes.data ?? []) as Team[]
    profiles.value = (profilesRes.data ?? []) as Profile[]

    if (room.value) {
      await fetchPicks()
    }
    loading.value = false
  }

  async function fetchPicks() {
    if (!room.value) return
    const { data } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('room_id', room.value.id)
      .order('pick_number', { ascending: true })
    picks.value = (data ?? []) as DraftPick[]
  }

  async function joinRoom(leagueId: string, roomType: 'official' | 'practice' = 'official') {
    const { data, error } = await supabase.functions.invoke('draft-join', {
      body: { league_id: leagueId, room_type: roomType },
    })
    if (error) throw error
    await fetchAll(leagueId, roomType)
    return data
  }

  async function startDraft() {
    if (!room.value) return
    const { error } = await supabase.functions.invoke('draft-start', {
      body: { room_id: room.value.id },
    })
    if (error) throw error
  }

  async function makePick(teamId: number) {
    if (!room.value || !isMyTurn.value) return
    pickLoading.value = true
    const { error } = await supabase.functions.invoke('draft-pick', {
      body: { room_id: room.value.id, team_id: teamId },
    })
    pickLoading.value = false
    if (error) throw error
  }

  async function resetPractice(leagueId: string) {
    const { error } = await supabase.functions.invoke('practice-reset', {
      body: { league_id: leagueId },
    })
    if (error) throw error
    // Room state is updated via realtime; picks cleared by the UPDATE handler below
  }

  function subscribeToRealtime() {
    if (!room.value) return null

    return supabase
      .channel(`draft-room-${room.value.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `room_id=eq.${room.value.id}` }, async (payload) => {
        picks.value.push(payload.new as DraftPick)
        timerStart.value = new Date()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_rooms', filter: `id=eq.${room.value!.id}` }, (payload) => {
        room.value = { ...room.value!, ...payload.new }
        if (payload.new.status === 'active' && !timerStart.value) {
          timerStart.value = new Date()
        }
        // Practice room was reset — clear local picks and timer
        if (payload.new.status === 'waiting') {
          picks.value = []
          timerStart.value = null
        }
      })
      .subscribe()
  }

  function getProfile(userId: string): Profile | undefined {
    return profiles.value.find((p) => p.id === userId)
  }

  function getTeam(teamId: number): Team | undefined {
    return teams.value.find((t) => t.id === teamId)
  }

  return {
    room, picks, teams, profiles, loading, pickLoading, timerStart,
    pickedTeamIds, availableTeams, currentPickerUserId, isMyTurn,
    teamsPerPlayer, totalPicks, isDraftComplete, picksByUser,
    fetchAll, fetchPicks, joinRoom, startDraft, makePick, resetPractice,
    subscribeToRealtime, getProfile, getTeam,
  }
})
