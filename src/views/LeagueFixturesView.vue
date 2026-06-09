<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { TIER_COLORS, TIER_LABELS } from '@/types/app.types'
import type { Team, TeamTier } from '@/types/app.types'

const route = useRoute()
const auth = useAuthStore()
const leagueId = route.params.leagueId as string

// ── Types ────────────────────────────────────────────────────────────────────

interface MatchRow {
  id: number
  stage: string
  stage_order: number
  match_date: string
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  venue: string | null
  home_team: Team
  away_team: Team
}

interface PointsRow {
  match_id: number
  team_id: number
  points: number
  reason: string
}

// ── State ────────────────────────────────────────────────────────────────────

const matches = ref<MatchRow[]>([])
const myTeamIds = ref<Set<number>>(new Set())
const pointsByMatch = ref<Map<number, PointsRow[]>>(new Map())
const loading = ref(true)

// ── Data fetching ─────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!auth.user) return

  // All WC matches with team info
  const { data: matchData } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
    .order('match_date', { ascending: true })

  matches.value = (matchData ?? []) as MatchRow[]

  // User's drafted teams in this league
  const { data: room } = await supabase
    .from('draft_rooms')
    .select('id')
    .eq('league_id', leagueId)
    .eq('room_type', 'official')
    .maybeSingle()

  if (room) {
    const { data: picks } = await supabase
      .from('draft_picks')
      .select('team_id')
      .eq('room_id', room.id)
      .eq('user_id', auth.user.id)
    myTeamIds.value = new Set((picks ?? []).map((p: { team_id: number }) => p.team_id))
  }

  // Points the user earned per match in this league
  const { data: pts } = await supabase
    .from('draft_points')
    .select('match_id, team_id, points, reason')
    .eq('user_id', auth.user.id)
    .eq('league_id', leagueId)

  const map = new Map<number, PointsRow[]>()
  for (const p of pts ?? []) {
    if (!map.has(p.match_id)) map.set(p.match_id, [])
    map.get(p.match_id)!.push(p)
  }
  pointsByMatch.value = map

  loading.value = false
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  final: 'Final',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(iso))
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function localDateKey(iso: string) {
  // Group by local calendar date
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Points earned from a match for the user's teams
function matchPoints(match: MatchRow): number {
  const rows = pointsByMatch.value.get(match.id) ?? []
  return rows.reduce((s, r) => s + r.points, 0)
}

function ownsTeam(teamId: number) {
  return myTeamIds.value.has(teamId)
}

// ── Grouped matches ───────────────────────────────────────────────────────────

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

interface Group {
  key: string
  label: string
  isDate: boolean
  matches: MatchRow[]
}

const grouped = computed<Group[]>(() => {
  const groups: Group[] = []

  // Group stage: group by local date
  const groupMatches = matches.value.filter(m => m.stage === 'group')
  const dateMap = new Map<string, MatchRow[]>()
  for (const m of groupMatches) {
    const key = localDateKey(m.match_date)
    if (!dateMap.has(key)) dateMap.set(key, [])
    dateMap.get(key)!.push(m)
  }
  for (const [key, ms] of dateMap) {
    groups.push({ key, label: formatDate(ms[0].match_date), isDate: true, matches: ms })
  }

  // Knockout stages: group by stage
  for (const stage of ['r32', 'r16', 'qf', 'sf', 'final']) {
    const ms = matches.value.filter(m => m.stage === stage)
    if (ms.length) {
      groups.push({ key: stage, label: STAGE_LABELS[stage], isDate: false, matches: ms })
    }
  }

  return groups
})

// Scroll to today on load
function scrollToToday() {
  const today = new Date()
  const key = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const el = document.getElementById(`group-${key}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  // Wait for DOM then scroll
  setTimeout(scrollToToday, 300)
})
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
    <h1 class="text-2xl font-black text-slate-100 mb-6">Fixtures</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <div v-for="group in grouped" :key="group.key" :id="`group-${group.key}`" class="mb-6">
        <!-- Group header -->
        <div class="flex items-center gap-3 mb-2">
          <span class="text-xs font-bold uppercase tracking-widest text-slate-500">{{ group.label }}</span>
          <div class="flex-1 border-t border-navy-700" />
        </div>

        <!-- Matches -->
        <div class="flex flex-col gap-2">
          <div
            v-for="match in group.matches"
            :key="match.id"
            :class="[
              'rounded-xl border bg-navy-800 overflow-hidden',
              match.status === 'live' ? 'border-emerald-500/50' : 'border-navy-700',
            ]"
          >
            <div class="flex items-center px-3 py-2.5 gap-2">

              <!-- Home team -->
              <div class="flex-1 flex items-center gap-2 min-w-0 justify-end">
                <div class="text-right min-w-0">
                  <div class="flex items-center justify-end gap-1.5">
                    <span
                      v-if="ownsTeam(match.home_team?.id)"
                      class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0"
                    >mine</span>
                    <div
                      :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.home_team?.tier as TeamTier]?.dot]"
                    />
                    <span
                      :class="[
                        'font-semibold text-sm truncate',
                        ownsTeam(match.home_team?.id) ? TIER_COLORS[match.home_team?.tier as TeamTier]?.text : 'text-slate-200',
                      ]"
                    >{{ match.home_team?.name }}</span>
                  </div>
                  <div
                    v-if="match.home_team"
                    class="text-[10px] text-slate-500 text-right"
                  >T{{ match.home_team.tier }} · {{ TIER_LABELS[match.home_team.tier as TeamTier] }}</div>
                </div>
                <img
                  v-if="match.home_team?.flag_url"
                  :src="match.home_team.flag_url"
                  :alt="match.home_team.name"
                  class="w-8 h-6 object-cover rounded shadow shrink-0"
                />
              </div>

              <!-- Score / Time -->
              <div class="w-20 shrink-0 text-center">
                <template v-if="match.status === 'finished'">
                  <div class="text-lg font-black text-slate-100 leading-none">
                    {{ match.home_score }} – {{ match.away_score }}
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5">FT</div>
                </template>
                <template v-else-if="match.status === 'live'">
                  <div class="text-xs font-black text-emerald-400 animate-pulse">LIVE</div>
                  <div class="text-base font-black text-slate-100 leading-none mt-0.5">
                    {{ match.home_score ?? 0 }} – {{ match.away_score ?? 0 }}
                  </div>
                </template>
                <template v-else>
                  <div class="text-sm font-bold text-slate-300">{{ formatTime(match.match_date) }}</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">local</div>
                </template>
              </div>

              <!-- Away team -->
              <div class="flex-1 flex items-center gap-2 min-w-0">
                <img
                  v-if="match.away_team?.flag_url"
                  :src="match.away_team.flag_url"
                  :alt="match.away_team.name"
                  class="w-8 h-6 object-cover rounded shadow shrink-0"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <div
                      :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.away_team?.tier as TeamTier]?.dot]"
                    />
                    <span
                      :class="[
                        'font-semibold text-sm truncate',
                        ownsTeam(match.away_team?.id) ? TIER_COLORS[match.away_team?.tier as TeamTier]?.text : 'text-slate-200',
                      ]"
                    >{{ match.away_team?.name }}</span>
                    <span
                      v-if="ownsTeam(match.away_team?.id)"
                      class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0"
                    >mine</span>
                  </div>
                  <div
                    v-if="match.away_team"
                    class="text-[10px] text-slate-500"
                  >T{{ match.away_team.tier }} · {{ TIER_LABELS[match.away_team.tier as TeamTier] }}</div>
                </div>
              </div>
            </div>

            <!-- Points earned bar -->
            <div
              v-if="match.status === 'finished' && matchPoints(match) > 0"
              class="border-t border-navy-700 px-3 py-1.5 bg-gold-500/5 flex items-center gap-1.5"
            >
              <span class="text-gold-400 text-xs">⭐</span>
              <span class="text-gold-400 text-xs font-black">+{{ matchPoints(match) }} pts</span>
              <span class="text-slate-500 text-xs">earned this match</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
