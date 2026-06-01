<script setup lang="ts">
import { onMounted, onUnmounted, computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { useAuthStore } from '@/stores/auth.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
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

onMounted(async () => {
  await Promise.all([
    leaderboardStore.fetch(leagueId.value),
    loadMembers(),
  ])
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
    <div class="mb-6">
      <h1 class="text-2xl font-black text-slate-100">{{ league?.name }}</h1>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-slate-500 text-sm">Invite code:</span>
        <span class="font-mono text-gold-400 font-bold tracking-widest">{{ league?.invite_code }}</span>
        <button class="text-slate-500 hover:text-gold-400 transition-colors text-sm" @click="copyInviteCode">📋</button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Rank</div>
        <div class="text-3xl font-black text-gold-500">{{ myRank ? `#${myRank}` : '—' }}</div>
        <div class="text-slate-400 text-sm">out of {{ leaderboardStore.entries.length }} players</div>
      </BaseCard>
      <BaseCard>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Predictor Pts</div>
        <div class="text-3xl font-black text-slate-100">{{ myEntry?.predictor_points ?? 0 }}</div>
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
</template>
