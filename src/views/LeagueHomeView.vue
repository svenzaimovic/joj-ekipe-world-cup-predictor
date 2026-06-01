<script setup lang="ts">
import { onMounted, onUnmounted, computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ScoringGuide from '@/components/ui/ScoringGuide.vue'
import { TIER_LABELS, TIER_COLORS } from '@/types/app.types'
import type { Team, TeamTier } from '@/types/app.types'
import type { Ref } from 'vue'
import type BaseToast from '@/components/ui/BaseToast.vue'

const route = useRoute()
const router = useRouter()
const leagueStore = useLeagueStore()
const leaderboardStore = useLeaderboardStore()
const auth = useAuthStore()
const toast = inject<Ref<InstanceType<typeof BaseToast> | null>>('toast')

const leagueId = computed(() => route.params.leagueId as string)
const leaderboardChannel = ref<ReturnType<typeof leaderboardStore.subscribeToUpdates> | null>(null)
const memberUserIds = ref<string[]>([])
const membersLoading = ref(false)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const teams = ref<Team[]>([])

const tierGroups = computed(() => {
  const tiers: TeamTier[] = [1, 2, 3, 4]
  return tiers.map((tier) => ({
    tier,
    teams: teams.value.filter((t) => t.tier === tier).sort((a, b) => a.name.localeCompare(b.name)),
  }))
})

onMounted(async () => {
  const [, , teamsRes] = await Promise.all([
    leaderboardStore.fetch(leagueId.value),
    loadMembers(),
    supabase.from('teams').select('id,name,code,tier,flag_url,group_name').order('name'),
  ])
  teams.value = (teamsRes.data ?? []) as Team[]
  leaderboardChannel.value = leaderboardStore.subscribeToUpdates(leagueId.value)
})

onUnmounted(() => {
  leaderboardChannel.value?.unsubscribe()
})

async function loadMembers() {
  membersLoading.value = true
  memberUserIds.value = await leagueStore.getLeagueMemberUserIds(leagueId.value)
  membersLoading.value = false
}

const isOwner = computed(() => league.value?.owner_id === auth.user?.id)

async function deleteLeague() {
  deleteLoading.value = true
  try {
    await leagueStore.deleteLeague(leagueId.value)
    showDeleteModal.value = false
    router.replace({ name: 'leagues' })
  } catch {
    toast?.value?.add('Failed to delete league.', 'error')
  }
  deleteLoading.value = false
}

const myRank = computed(() => {
  const idx = leaderboardStore.entries.findIndex((e) => e.user_id === auth.user?.id)
  return idx === -1 ? null : idx + 1
})

const myEntry = computed(() =>
  leaderboardStore.entries.find((e) => e.user_id === auth.user?.id),
)

const league = computed(() => leagueStore.activeLeague)

function copyInviteCode() {
  if (!league.value) return
  navigator.clipboard.writeText(league.value.invite_code)
  toast?.value?.add('Invite code copied!', 'success')
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
    <div class="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-100">{{ league?.name }}</h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-slate-500 text-sm">Invite code:</span>
          <span class="font-mono text-gold-400 font-bold tracking-widest">{{ league?.invite_code }}</span>
          <button class="text-slate-500 hover:text-gold-400 transition-colors text-sm" @click="copyInviteCode">📋</button>
        </div>
      </div>
      <button
        v-if="isOwner"
        class="text-xs text-slate-500 hover:text-red-400 transition-colors border border-navy-700 hover:border-red-500/40 rounded-lg px-3 py-1.5 shrink-0"
        @click="showDeleteModal = true"
      >
        Delete league
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 gap-4 mb-8">
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Rank</div>
        <div class="text-3xl font-black text-gold-500">{{ myRank ? `#${myRank}` : '—' }}</div>
        <div class="text-slate-400 text-sm">out of {{ leaderboardStore.entries.length }} players</div>
      </BaseCard>
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Draft Pts</div>
        <div class="text-3xl font-black text-slate-100">{{ myEntry?.draft_points ?? 0 }}</div>
      </BaseCard>
    </div>

    <!-- Quick nav -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
      <button
        class="bg-navy-800 border border-navy-700 rounded-2xl p-5 text-left hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-draft', params: { leagueId } })"
      >
        <div class="text-3xl mb-2">🎲</div>
        <div class="font-bold text-slate-100">Draft</div>
        <div class="text-xs text-slate-500 mt-0.5">Pick your teams</div>
      </button>
      <button
        class="bg-navy-800 border border-navy-700 rounded-2xl p-5 text-left hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-draft-practice', params: { leagueId } })"
      >
        <div class="text-3xl mb-2">🧪</div>
        <div class="font-bold text-slate-100">Practice Draft</div>
        <div class="text-xs text-slate-500 mt-0.5">Trial run — no scoring</div>
      </button>
      <button
        class="bg-navy-800 border border-navy-700 rounded-2xl p-5 text-left hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-leaderboard', params: { leagueId } })"
      >
        <div class="text-3xl mb-2">🏆</div>
        <div class="font-bold text-slate-100">Standings</div>
        <div class="text-xs text-slate-500 mt-0.5">League leaderboard</div>
      </button>
    </div>

    <!-- Teams by tier + scoring guide -->
    <div class="mb-8">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Teams &amp; Points</h2>
      <BaseCard>
        <!-- Tier grid: 4 columns on desktop, 2 on mobile -->
        <div v-if="teams.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-navy-700">
          <div v-for="group in tierGroups" :key="group.tier">
            <div class="flex items-center gap-1.5 mb-2">
              <div :class="['w-2 h-2 rounded-full shrink-0', TIER_COLORS[group.tier].dot]" />
              <span :class="['text-xs font-bold uppercase tracking-wide', TIER_COLORS[group.tier].text]">
                T{{ group.tier }} · {{ TIER_LABELS[group.tier] }}
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="team in group.teams"
                :key="team.id"
                :class="['text-[11px] px-1.5 py-0.5 rounded font-medium text-slate-300', TIER_COLORS[group.tier].bg]"
              >
                {{ team.name }}
              </span>
            </div>
          </div>
        </div>

        <ScoringGuide />
      </BaseCard>
    </div>

    <!-- Member list -->
    <div>
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Members ({{ leaderboardStore.entries.length }})</h2>
      <LoadingSpinner v-if="leaderboardStore.loading" class="py-8" />
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="(entry, idx) in leaderboardStore.entries"
          :key="entry.user_id"
          :class="[
            'bg-navy-800 rounded-xl border p-3 flex items-center gap-3',
            entry.user_id === auth.user?.id ? 'border-gold-500/40' : 'border-navy-700',
          ]"
        >
          <div class="w-7 text-center font-black text-sm text-slate-500">#{{ idx + 1 }}</div>
          <div class="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm shrink-0">
            {{ entry.username[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 font-semibold text-slate-100">
            {{ entry.username }}
            <span v-if="entry.user_id === auth.user?.id" class="text-xs text-gold-500 ml-1">(you)</span>
          </div>
          <div class="text-lg font-black text-slate-100">{{ entry.total_points }}<span class="text-xs font-normal text-slate-500"> pts</span></div>
        </div>
        <div v-if="!leaderboardStore.entries.length" class="text-slate-500 text-sm text-center py-8">
          No scores yet — get everyone to join and draft!
        </div>
      </div>
    </div>
  </div>

  <!-- Delete confirmation modal -->
  <BaseModal v-if="showDeleteModal" title="Delete League" @close="showDeleteModal = false">
    <div class="flex flex-col gap-4">
      <p class="text-slate-300">
        Are you sure you want to delete <strong class="text-slate-100">{{ league?.name }}</strong>?
        This will permanently remove all picks, members, and draft data.
      </p>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton :loading="deleteLoading" class="flex-1 !bg-red-600 hover:!bg-red-500" @click="deleteLeague">
          Delete
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
