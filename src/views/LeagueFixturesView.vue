<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { TIER_COLORS, TIER_LABELS } from '@/types/app.types'
import type { Team, TeamTier } from '@/types/app.types'
import { Star, ChevronDown, ChevronUp } from 'lucide-vue-next'

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

interface DateGroup {
  key: string
  label: string
  matches: MatchRow[]
}

interface StageSection {
  stage: string
  label: string
  dateGroups: DateGroup[]  // only used when stage === 'group'
  matches: MatchRow[]      // used for knockout stages
  totalMatches: number
  allFinished: boolean
  hasLive: boolean
}

// ── State ────────────────────────────────────────────────────────────────────

const matches = ref<MatchRow[]>([])
const myTeamIds = ref<Set<number>>(new Set())
const teamOwners = ref<Map<number, string>>(new Map())
const pointsByMatch = ref<Map<number, PointsRow[]>>(new Map())
const loading = ref(true)
const collapsedStages = ref<Set<string>>(new Set())

// ── Data fetching ─────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!auth.user) return

  const { data: matchData } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
    .order('match_date', { ascending: true })

  matches.value = (matchData ?? []) as MatchRow[]

  const { data: room } = await supabase
    .from('draft_rooms')
    .select('id')
    .eq('league_id', leagueId)
    .eq('room_type', 'official')
    .maybeSingle()

  if (room) {
    const { data: allPicks } = await supabase
      .from('draft_picks')
      .select('team_id, user_id, profiles(username)')
      .eq('room_id', room.id)

    const ownerMap = new Map<number, string>()
    for (const p of allPicks ?? []) {
      const pick = p as { team_id: number; user_id: string; profiles: { username: string } | null }
      if (pick.profiles?.username) ownerMap.set(pick.team_id, pick.profiles.username)
    }
    teamOwners.value = ownerMap
    myTeamIds.value = new Set(
      (allPicks ?? [])
        .filter((p: { user_id: string }) => p.user_id === auth.user!.id)
        .map((p: { team_id: number }) => p.team_id),
    )
  }

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

  // Collapse any stage where all matches are finished (no need to show by default)
  await nextTick()
  const toCollapse = new Set<string>()
  for (const section of stageSections.value) {
    if (section.allFinished && !section.hasLive) {
      toCollapse.add(section.stage)
    }
  }
  collapsedStages.value = toCollapse

  // Scroll to first non-collapsed stage
  await nextTick()
  scrollToFirstActive()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  r32:   'Round of 32',
  r16:   'Round of 16',
  qf:    'Quarter-Finals',
  sf:    'Semi-Finals',
  tp:    'Third Place',
  final: 'Final',
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'tp', 'final']

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
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function matchPoints(match: MatchRow): number {
  return (pointsByMatch.value.get(match.id) ?? []).reduce((s, r) => s + r.points, 0)
}

function ownsTeam(teamId: number) {
  return myTeamIds.value.has(teamId)
}

function teamOwner(teamId: number): string | null {
  if (ownsTeam(teamId)) return null
  return teamOwners.value.get(teamId) ?? null
}

function toggleStage(stage: string) {
  if (collapsedStages.value.has(stage)) {
    collapsedStages.value.delete(stage)
  } else {
    collapsedStages.value.add(stage)
  }
}

function scrollToFirstActive() {
  for (const section of stageSections.value) {
    if (!collapsedStages.value.has(section.stage)) {
      const el = document.getElementById(`stage-${section.stage}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
  }
}

// ── Computed stage sections ───────────────────────────────────────────────────

const stageSections = computed<StageSection[]>(() => {
  const sections: StageSection[] = []

  for (const stage of STAGE_ORDER) {
    const stageMatches = matches.value.filter(m => m.stage === stage)
    if (!stageMatches.length) continue

    let dateGroups: DateGroup[] = []
    if (stage === 'group') {
      const dateMap = new Map<string, MatchRow[]>()
      for (const m of stageMatches) {
        const key = localDateKey(m.match_date)
        if (!dateMap.has(key)) dateMap.set(key, [])
        dateMap.get(key)!.push(m)
      }
      for (const [key, ms] of dateMap) {
        dateGroups.push({ key, label: formatDate(ms[0].match_date), matches: ms })
      }
    }

    sections.push({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      dateGroups,
      matches: stageMatches,
      totalMatches: stageMatches.length,
      allFinished: stageMatches.every(m => m.status === 'finished'),
      hasLive: stageMatches.some(m => m.status === 'live'),
    })
  }

  return sections
})
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-8">
    <h1 class="text-2xl font-black text-slate-100 mb-6">Fixtures</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <div
        v-for="section in stageSections"
        :key="section.stage"
        :id="`stage-${section.stage}`"
        class="mb-4"
      >
        <!-- Stage header — clickable to collapse/expand -->
        <button
          class="w-full flex items-center gap-3 mb-2 group"
          @click="toggleStage(section.stage)"
        >
          <span class="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors">
            {{ section.label }}
          </span>
          <span v-if="section.allFinished" class="text-[10px] font-semibold text-slate-600 bg-navy-800 border border-navy-700 rounded px-1.5 py-0.5 uppercase tracking-wide shrink-0">
            Done
          </span>
          <span v-else-if="section.hasLive" class="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 uppercase tracking-wide shrink-0 animate-pulse">
            Live
          </span>
          <div class="flex-1 border-t border-navy-700" />
          <span class="text-[10px] text-slate-600 shrink-0">{{ section.totalMatches }} matches</span>
          <ChevronUp v-if="!collapsedStages.has(section.stage)" :size="14" class="text-slate-500 shrink-0" />
          <ChevronDown v-else :size="14" class="text-slate-500 shrink-0" />
        </button>

        <!-- Section content (collapsed when stage is in collapsedStages) -->
        <template v-if="!collapsedStages.has(section.stage)">

          <!-- Group stage: date sub-groups -->
          <template v-if="section.stage === 'group'">
            <div
              v-for="dateGroup in section.dateGroups"
              :key="dateGroup.key"
              :id="`group-${dateGroup.key}`"
              class="mb-4"
            >
              <div class="flex items-center gap-3 mb-2 pl-1">
                <span class="text-[11px] font-semibold text-slate-500">{{ dateGroup.label }}</span>
                <div class="flex-1 border-t border-navy-800" />
              </div>
              <div class="flex flex-col gap-2">
                <div
                  v-for="match in dateGroup.matches"
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
                          <span v-if="ownsTeam(match.home_team?.id)" class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0">mine</span>
                          <div :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.home_team?.tier as TeamTier]?.dot]" />
                          <span :class="['font-semibold text-sm truncate', ownsTeam(match.home_team?.id) ? TIER_COLORS[match.home_team?.tier as TeamTier]?.text : 'text-slate-200']">{{ match.home_team?.name }}</span>
                        </div>
                        <div v-if="match.home_team" class="text-[10px] text-slate-500 text-right">
                          T{{ match.home_team.tier }} · {{ TIER_LABELS[match.home_team.tier as TeamTier] }}
                          <span v-if="teamOwner(match.home_team.id)" class="text-slate-400 font-semibold"> · {{ teamOwner(match.home_team.id) }}</span>
                        </div>
                      </div>
                      <img v-if="match.home_team?.flag_url" :src="match.home_team.flag_url" :alt="match.home_team.name" class="w-8 h-6 object-cover rounded shadow shrink-0" />
                    </div>
                    <!-- Score / Time -->
                    <div class="w-20 shrink-0 text-center">
                      <template v-if="match.status === 'finished'">
                        <div class="text-lg font-black text-slate-100 leading-none">{{ match.home_score }} – {{ match.away_score }}</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">FT</div>
                      </template>
                      <template v-else-if="match.status === 'live'">
                        <div class="text-xs font-black text-emerald-400 animate-pulse">LIVE</div>
                        <div class="text-base font-black text-slate-100 leading-none mt-0.5">{{ match.home_score ?? 0 }} – {{ match.away_score ?? 0 }}</div>
                      </template>
                      <template v-else>
                        <div class="text-sm font-bold text-slate-300">{{ formatTime(match.match_date) }}</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">local</div>
                      </template>
                    </div>
                    <!-- Away team -->
                    <div class="flex-1 flex items-center gap-2 min-w-0">
                      <img v-if="match.away_team?.flag_url" :src="match.away_team.flag_url" :alt="match.away_team.name" class="w-8 h-6 object-cover rounded shadow shrink-0" />
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <div :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.away_team?.tier as TeamTier]?.dot]" />
                          <span :class="['font-semibold text-sm truncate', ownsTeam(match.away_team?.id) ? TIER_COLORS[match.away_team?.tier as TeamTier]?.text : 'text-slate-200']">{{ match.away_team?.name }}</span>
                          <span v-if="ownsTeam(match.away_team?.id)" class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0">mine</span>
                        </div>
                        <div v-if="match.away_team" class="text-[10px] text-slate-500">
                          T{{ match.away_team.tier }} · {{ TIER_LABELS[match.away_team.tier as TeamTier] }}
                          <span v-if="teamOwner(match.away_team.id)" class="text-slate-400 font-semibold"> · {{ teamOwner(match.away_team.id) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Points earned bar -->
                  <div v-if="match.status === 'finished' && matchPoints(match) > 0" class="border-t border-navy-700 px-3 py-1.5 bg-gold-500/5 flex items-center gap-1.5">
                    <Star :size="12" class="inline-block text-gold-400 fill-gold-400 shrink-0" />
                    <span class="text-gold-400 text-xs font-black">+{{ matchPoints(match) }} pts</span>
                    <span class="text-slate-500 text-xs">earned this match</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Knockout stages: flat match list -->
          <template v-else>
            <div class="flex flex-col gap-2 mb-2">
              <div
                v-for="match in section.matches"
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
                        <span v-if="ownsTeam(match.home_team?.id)" class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0">mine</span>
                        <div :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.home_team?.tier as TeamTier]?.dot]" />
                        <span :class="['font-semibold text-sm truncate', ownsTeam(match.home_team?.id) ? TIER_COLORS[match.home_team?.tier as TeamTier]?.text : 'text-slate-200']">{{ match.home_team?.name }}</span>
                      </div>
                      <div v-if="match.home_team" class="text-[10px] text-slate-500 text-right">
                        T{{ match.home_team.tier }} · {{ TIER_LABELS[match.home_team.tier as TeamTier] }}
                        <span v-if="teamOwner(match.home_team.id)" class="text-slate-400 font-semibold"> · {{ teamOwner(match.home_team.id) }}</span>
                      </div>
                    </div>
                    <img v-if="match.home_team?.flag_url" :src="match.home_team.flag_url" :alt="match.home_team.name" class="w-8 h-6 object-cover rounded shadow shrink-0" />
                  </div>
                  <!-- Score / Time -->
                  <div class="w-20 shrink-0 text-center">
                    <template v-if="match.status === 'finished'">
                      <div class="text-lg font-black text-slate-100 leading-none">{{ match.home_score }} – {{ match.away_score }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">FT</div>
                    </template>
                    <template v-else-if="match.status === 'live'">
                      <div class="text-xs font-black text-emerald-400 animate-pulse">LIVE</div>
                      <div class="text-base font-black text-slate-100 leading-none mt-0.5">{{ match.home_score ?? 0 }} – {{ match.away_score ?? 0 }}</div>
                    </template>
                    <template v-else>
                      <div class="text-sm font-bold text-slate-300">{{ formatTime(match.match_date) }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">local</div>
                    </template>
                  </div>
                  <!-- Away team -->
                  <div class="flex-1 flex items-center gap-2 min-w-0">
                    <img v-if="match.away_team?.flag_url" :src="match.away_team.flag_url" :alt="match.away_team.name" class="w-8 h-6 object-cover rounded shadow shrink-0" />
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <div :class="['w-1.5 h-1.5 rounded-full shrink-0', TIER_COLORS[match.away_team?.tier as TeamTier]?.dot]" />
                        <span :class="['font-semibold text-sm truncate', ownsTeam(match.away_team?.id) ? TIER_COLORS[match.away_team?.tier as TeamTier]?.text : 'text-slate-200']">{{ match.away_team?.name }}</span>
                        <span v-if="ownsTeam(match.away_team?.id)" class="text-[10px] font-black text-gold-400 uppercase tracking-wide shrink-0">mine</span>
                      </div>
                      <div v-if="match.away_team" class="text-[10px] text-slate-500">
                        T{{ match.away_team.tier }} · {{ TIER_LABELS[match.away_team.tier as TeamTier] }}
                        <span v-if="teamOwner(match.away_team.id)" class="text-slate-400 font-semibold"> · {{ teamOwner(match.away_team.id) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Points earned bar -->
                <div v-if="match.status === 'finished' && matchPoints(match) > 0" class="border-t border-navy-700 px-3 py-1.5 bg-gold-500/5 flex items-center gap-1.5">
                  <Star :size="12" class="inline-block text-gold-400 fill-gold-400 shrink-0" />
                  <span class="text-gold-400 text-xs font-black">+{{ matchPoints(match) }} pts</span>
                  <span class="text-slate-500 text-xs">earned this match</span>
                </div>
              </div>
            </div>
          </template>

        </template>
      </div>
    </template>
  </div>
</template>
