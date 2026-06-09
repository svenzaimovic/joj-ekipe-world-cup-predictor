<script setup lang="ts">
import { onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import type { Ref } from 'vue'
import type BaseToast from '@/components/ui/BaseToast.vue'
import { Trophy, CheckCircle, Copy } from 'lucide-vue-next'

const leagueStore = useLeagueStore()
const router = useRouter()
const toast = inject<Ref<InstanceType<typeof BaseToast> | null>>('toast')

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const newLeagueName = ref('')
const inviteCodeInput = ref('')
const actionLoading = ref(false)
const createdInviteCode = ref('')

onMounted(() => leagueStore.fetchMyLeagues())

async function createLeague() {
  if (!newLeagueName.value.trim()) return
  actionLoading.value = true
  try {
    const { invite_code, league_id } = await leagueStore.createLeague(newLeagueName.value)
    createdInviteCode.value = invite_code
    newLeagueName.value = ''
    // Keep modal open to show the invite code, user closes it manually
    setTimeout(() => {
      showCreateModal.value = false
      createdInviteCode.value = ''
      router.push({ name: 'league-home', params: { leagueId: league_id } })
    }, 3000)
  } catch {
    toast?.value?.add('Failed to create league. Try again.', 'error')
  }
  actionLoading.value = false
}

async function joinLeague() {
  if (!inviteCodeInput.value.trim()) return
  actionLoading.value = true
  try {
    const { league_id } = await leagueStore.joinLeague(inviteCodeInput.value)
    showJoinModal.value = false
    inviteCodeInput.value = ''
    router.push({ name: 'league-home', params: { leagueId: league_id } })
  } catch (e: any) {
    const msg = e?.message?.includes('Invalid') ? 'Invalid invite code.' : 'Failed to join league.'
    toast?.value?.add(msg, 'error')
  }
  actionLoading.value = false
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast?.value?.add('Invite code copied!', 'success')
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-black text-slate-100">My Leagues</h1>
      <div class="flex gap-2">
        <BaseButton variant="secondary" size="sm" @click="showJoinModal = true">Join</BaseButton>
        <BaseButton size="sm" @click="showCreateModal = true">Create</BaseButton>
      </div>
    </div>

    <LoadingSpinner v-if="leagueStore.loading" class="py-16" />

    <div v-else-if="!leagueStore.myLeagues.length" class="text-center py-16">
      <div class="mb-4"><Trophy :size="40" class="mx-auto" /></div>
      <h2 class="text-lg font-bold text-slate-100 mb-2">No leagues yet</h2>
      <p class="text-slate-400 text-sm mb-6">Create a league and invite your friends, or join one with an invite code.</p>
      <div class="flex gap-3 justify-center">
        <BaseButton variant="secondary" @click="showJoinModal = true">Join with code</BaseButton>
        <BaseButton @click="showCreateModal = true">Create league</BaseButton>
      </div>
    </div>

    <div v-else class="flex flex-col gap-3">
      <button
        v-for="league in leagueStore.myLeagues"
        :key="league.id"
        class="text-left bg-navy-800 border border-navy-700 rounded-2xl p-5 hover:border-gold-500/40 hover:bg-navy-700 transition-all"
        @click="router.push({ name: 'league-home', params: { leagueId: league.id } })"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-slate-100 text-lg">{{ league.name }}</div>
            <div class="text-sm text-slate-500 mt-0.5 font-mono tracking-widest">{{ league.invite_code }}</div>
          </div>
          <div class="text-slate-600 text-xl">›</div>
        </div>
      </button>
    </div>

    <!-- Create League Modal -->
    <BaseModal v-if="showCreateModal" title="Create League" @close="showCreateModal = false; createdInviteCode = ''">
      <div v-if="createdInviteCode" class="text-center py-4">
        <div class="mb-3"><CheckCircle :size="40" class="mx-auto" /></div>
        <p class="text-slate-300 mb-3">League created! Share this code with your friends:</p>
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="font-mono text-3xl font-black text-gold-500 tracking-widest">{{ createdInviteCode }}</span>
          <button class="text-slate-400 hover:text-gold-400 transition-colors" @click="copyToClipboard(createdInviteCode)"><Copy :size="15" class="shrink-0" /></button>
        </div>
        <p class="text-xs text-slate-500">Redirecting you to your league…</p>
      </div>
      <div v-else class="flex flex-col gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">League Name</label>
          <input
            v-model="newLeagueName"
            type="text"
            placeholder="e.g. Friends League 2026"
            maxlength="40"
            class="w-full bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 transition-colors"
            @keydown.enter="createLeague"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton variant="secondary" class="flex-1" @click="showCreateModal = false">Cancel</BaseButton>
          <BaseButton :loading="actionLoading" :disabled="!newLeagueName.trim()" class="flex-1" @click="createLeague">
            Create
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Join League Modal -->
    <BaseModal v-if="showJoinModal" title="Join League" @close="showJoinModal = false">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Invite Code</label>
          <input
            v-model="inviteCodeInput"
            type="text"
            placeholder="e.g. AB3XY7"
            maxlength="6"
            class="w-full bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 transition-colors font-mono text-xl text-center uppercase tracking-widest"
            @keydown.enter="joinLeague"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton variant="secondary" class="flex-1" @click="showJoinModal = false">Cancel</BaseButton>
          <BaseButton :loading="actionLoading" :disabled="inviteCodeInput.length < 6" class="flex-1" @click="joinLeague">
            Join
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
