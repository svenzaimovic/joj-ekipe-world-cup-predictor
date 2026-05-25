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
    const idx = room.value.current_pick_index % order.length
    return order[idx] ?? null
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

  async function fetchAll() {
    loading.value = true
    const [roomRes, teamsRes, profilesRes] = await Promise.all([
      supabase.from('draft_rooms').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
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

  async function joinRoom() {
    const { data, error } = await supabase.functions.invoke('draft-join', {})
    if (error) throw error
    await fetchAll()
    return data
  }

  async function startDraft() {
    const { error } = await supabase.functions.invoke('draft-start', {})
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
    fetchAll, fetchPicks, joinRoom, startDraft, makePick, subscribeToRealtime,
    getProfile, getTeam,
  }
})
