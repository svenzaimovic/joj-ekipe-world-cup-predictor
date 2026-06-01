<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useDraftStore } from '@/stores/draft.store'
import { useAuthStore } from '@/stores/auth.store'
import TeamGrid from '@/components/draft/TeamGrid.vue'
import DraftBoard from '@/components/draft/DraftBoard.vue'
import PickTimer from '@/components/draft/PickTimer.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import type { Team, TeamTier } from '@/types/app.types'
import { TIER_COLORS } from '@/types/app.types'
import type { Ref } from 'vue'
import type BaseToast from '@/components/ui/BaseToast.vue'

const props = withDefaults(defineProps<{ isPractice?: boolean }>(), { isPractice: false })

const route = useRoute()
const draftStore = useDraftStore()
const auth = useAuthStore()
const toast = inject<Ref<InstanceType<typeof BaseToast> | null>>('toast')

const leagueId = computed(() => route.params.leagueId as string)
const roomType = computed(() => (props.isPractice ? 'practice' : 'official') as 'official' | 'practice')

const pendingTeam = ref<Team | null>(null)
const realtimeChannel = ref<ReturnType<typeof draftStore.subscribeToRealtime>>(null)
const resetLoading = ref(false)

onMounted(async () => {
  await draftStore.fetchAll(leagueId.value, roomType.value)
  realtimeChannel.value = draftStore.subscribeToRealtime()
})

onUnmounted(() => {
  realtimeChannel.value?.unsubscribe()
})

const currentPicker = computed(() =>
  draftStore.currentPickerUserId
    ? draftStore.getProfile(draftStore.currentPickerUserId)
    : null,
)

async function joinDraft() {
  try {
    await draftStore.joinRoom(leagueId.value, roomType.value)
    toast?.value?.add('Joined the draft room!', 'success')
  } catch {
    toast?.value?.add('Failed to join draft room.', 'error')
  }
}

async function startDraft() {
  try {
    await draftStore.startDraft()
    toast?.value?.add('Draft started!', 'success')
  } catch {
    toast?.value?.add('Failed to start draft.', 'error')
  }
}

async function resetPractice() {
  resetLoading.value = true
  try {
    await draftStore.resetPractice(leagueId.value)
    toast?.value?.add('Practice draft reset.', 'success')
  } catch {
    toast?.value?.add('Failed to reset practice draft.', 'error')
  }
  resetLoading.value = false
}

function onTeamSelect(team: Team) {
  if (draftStore.isMyTurn) pendingTeam.value = team
}

async function confirmPick() {
  if (!pendingTeam.value) return
  const team = pendingTeam.value
  pendingTeam.value = null
  try {
    await draftStore.makePick(team.id)
    toast?.value?.add(`Picked ${team.name}!`, 'success')
  } catch {
    toast?.value?.add('Pick failed. Try again.', 'error')
  }
}

const hasJoined = computed(() =>
  draftStore.room?.pick_order.includes(auth.user?.id ?? '') ?? false,
)
</script>

<template>
  <div class="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
    <div class="flex items-center gap-3 mb-6">
      <h1 class="text-2xl font-black text-slate-100">{{ isPractice ? 'Practice Draft' : 'Draft Room' }}</h1>
      <span
        v-if="isPractice"
        class="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full"
      >
        PRACTICE · No scoring
      </span>
    </div>

    <LoadingSpinner v-if="draftStore.loading" class="py-24" />

    <!-- WAITING LOBBY -->
    <div v-else-if="!draftStore.room || draftStore.room.status === 'waiting'" class="max-w-lg mx-auto">
      <BaseCard>
        <div class="text-center py-4">
          <div class="text-5xl mb-4">{{ isPractice ? '🧪' : '🎲' }}</div>
          <h2 class="text-xl font-black text-slate-100 mb-2">{{ isPractice ? 'Practice Lobby' : 'Draft Lobby' }}</h2>
          <p class="text-slate-400 text-sm mb-6">
            <template v-if="isPractice">
              This is a practice run — picks won't count towards scoring. Great for testing the format before the real draft!
            </template>
            <template v-else>
              Join the lobby and wait for everyone. When ready, any player can start the draft.
              Pick order will be randomised at start time.
            </template>
          </p>

          <!-- Connected players -->
          <div class="bg-navy-900 rounded-xl p-4 mb-6">
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Joined ({{ draftStore.room?.pick_order.length ?? 0 }})
            </div>
            <div class="flex flex-wrap gap-2 justify-center">
              <div
                v-for="userId in (draftStore.room?.pick_order ?? [])"
                :key="userId"
                class="flex items-center gap-1.5 bg-navy-800 border border-navy-700 rounded-full px-3 py-1 text-sm text-slate-300"
              >
                <div class="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 text-xs font-bold">
                  {{ draftStore.getProfile(userId)?.username?.[0]?.toUpperCase() }}
                </div>
                {{ draftStore.getProfile(userId)?.username }}
              </div>
              <div v-if="!draftStore.room?.pick_order.length" class="text-slate-600 text-sm">No one yet</div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <BaseButton v-if="!hasJoined" size="lg" class="w-full" @click="joinDraft">
              Join {{ isPractice ? 'Practice' : 'Draft' }} Room
            </BaseButton>
            <BaseButton
              v-if="hasJoined && (draftStore.room?.pick_order.length ?? 0) >= 2"
              variant="secondary"
              size="lg"
              class="w-full"
              @click="startDraft"
            >
              Start {{ isPractice ? 'Practice' : 'Draft' }}
            </BaseButton>
            <p v-if="hasJoined" class="text-emerald-400 text-sm">✓ You're in the lobby</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- ACTIVE DRAFT -->
    <div v-else-if="draftStore.room.status === 'active'">
      <!-- Status bar -->
      <div class="bg-navy-800 border border-navy-700 rounded-2xl p-4 mb-6 flex items-center gap-6 flex-wrap">
        <PickTimer
          :total-seconds="draftStore.room.pick_timer_seconds"
          :active="draftStore.room.status === 'active'"
        />
        <div class="flex-1">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Now picking</div>
          <div :class="['text-xl font-black', draftStore.isMyTurn ? 'text-gold-500' : 'text-slate-100']">
            {{ draftStore.isMyTurn ? 'YOUR TURN!' : (currentPicker?.username ?? '…') }}
          </div>
          <div class="text-sm text-slate-400">
            Pick {{ draftStore.picks.length + 1 }} of {{ draftStore.totalPicks }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 mb-1">Teams each</div>
          <div class="text-2xl font-black text-slate-100">{{ draftStore.teamsPerPlayer }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Team grid -->
        <div class="lg:col-span-3">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {{ draftStore.isMyTurn ? 'Select your team' : 'Available teams' }}
          </h2>
          <TeamGrid @pick="onTeamSelect" />
        </div>

        <!-- Draft board -->
        <div class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Draft board</h2>
          <DraftBoard />
        </div>
      </div>
    </div>

    <!-- COMPLETED -->
    <div v-else-if="draftStore.room.status === 'completed'">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">{{ isPractice ? '🧪' : '🏆' }}</div>
        <h2 class="text-2xl font-black text-slate-100">{{ isPractice ? 'Practice Complete!' : 'Draft Complete!' }}</h2>
        <p class="text-slate-400 mt-1">
          {{ isPractice ? 'This was a practice run — no points awarded.' : "Here's who owns which teams" }}
        </p>
        <BaseButton
          v-if="isPractice"
          variant="secondary"
          class="mt-4"
          :loading="resetLoading"
          @click="resetPractice"
        >
          Reset &amp; Play Again
        </BaseButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BaseCard v-for="userId in draftStore.room.pick_order" :key="userId">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">
              {{ draftStore.getProfile(userId)?.username?.[0]?.toUpperCase() }}
            </div>
            <div class="font-bold text-slate-100">{{ draftStore.getProfile(userId)?.username }}</div>
            <span v-if="userId === auth.user?.id" class="text-xs text-gold-500">(you)</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="pick in draftStore.picksByUser.get(userId) ?? []"
              :key="pick.id"
              class="flex items-center gap-2 text-sm"
            >
              <span class="text-xs font-bold text-slate-500 w-8 shrink-0">{{ pick.snake_round }}.</span>
              <span class="text-slate-300 flex-1">{{ draftStore.getTeam(pick.team_id)?.name }}</span>
              <span
                :class="['text-[10px] font-bold px-1.5 py-0.5 rounded-full', TIER_COLORS[draftStore.getTeam(pick.team_id)?.tier as TeamTier ?? 1].text, TIER_COLORS[draftStore.getTeam(pick.team_id)?.tier as TeamTier ?? 1].bg]"
              >T{{ draftStore.getTeam(pick.team_id)?.tier }}</span>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Reset button also shown in lobby when practice room has been completed -->
      <div v-if="isPractice" class="text-center mt-8">
        <BaseButton variant="secondary" :loading="resetLoading" @click="resetPractice">
          Reset &amp; Play Again
        </BaseButton>
      </div>
    </div>

    <!-- Confirm pick modal -->
    <BaseModal v-if="pendingTeam" title="Confirm pick" @close="pendingTeam = null">
      <div class="text-center py-2">
        <div class="text-4xl mb-3">🎯</div>
        <p class="text-slate-300 mb-6">
          Draft <span class="font-black text-gold-500">{{ pendingTeam.name }}</span>?
          <span v-if="isPractice" class="block text-xs text-amber-400 mt-1">(Practice — no scoring)</span>
        </p>
        <div class="flex gap-3">
          <BaseButton variant="secondary" class="flex-1" @click="pendingTeam = null">Cancel</BaseButton>
          <BaseButton :loading="draftStore.pickLoading" class="flex-1" @click="confirmPick">Confirm</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
