<script setup lang="ts">
import { computed } from 'vue'
import { useDraftStore } from '@/stores/draft.store'

const draftStore = useDraftStore()

const rounds = computed(() => {
  if (!draftStore.room?.pick_order.length) return []
  const playerCount = draftStore.room.pick_order.length
  const totalRounds = draftStore.teamsPerPlayer
  const result: Array<Array<{ userId: string; pick: ReturnType<typeof draftStore.picks>[0] | null; isCurrent: boolean }>> = []

  for (let r = 0; r < totalRounds; r++) {
    const row: typeof result[0] = []
    const forward = r % 2 === 0
    const playerOrder = forward
      ? draftStore.room.pick_order
      : [...draftStore.room.pick_order].reverse()

    for (let p = 0; p < playerCount; p++) {
      const pickNumber = r * playerCount + p + 1
      const userId = playerOrder[p]
      const pick = draftStore.picks.find((pk) => pk.pick_number === pickNumber) ?? null
      const isCurrent = draftStore.room!.current_pick_index === pickNumber - 1
      row.push({ userId, pick, isCurrent })
    }
    result.push(row)
  }
  return result
})
</script>

<template>
  <div class="overflow-x-auto">
    <div class="min-w-max">
      <!-- Header row -->
      <div class="flex gap-1 mb-1" v-if="draftStore.room?.pick_order.length">
        <div class="w-10 text-xs text-slate-500 flex items-center justify-center">#</div>
        <div
          v-for="userId in draftStore.room.pick_order"
          :key="userId"
          class="w-24 text-xs text-slate-400 font-semibold text-center truncate"
        >
          {{ draftStore.getProfile(userId)?.username ?? '…' }}
        </div>
      </div>

      <!-- Rounds -->
      <div v-for="(row, rIdx) in rounds" :key="rIdx" class="flex gap-1 mb-1">
        <div class="w-10 text-xs text-slate-600 flex items-center justify-center font-bold">{{ rIdx + 1 }}</div>
        <div
          v-for="cell in row"
          :key="cell.userId"
          :class="[
            'w-24 h-14 rounded-lg border text-center flex flex-col items-center justify-center text-xs transition-all',
            cell.isCurrent && !cell.pick
              ? 'border-gold-500 bg-gold-500/10 animate-pulse'
              : cell.pick
                ? 'border-navy-600 bg-navy-800'
                : 'border-navy-700 bg-navy-900/50',
          ]"
        >
          <template v-if="cell.pick">
            <span class="font-bold text-slate-200 leading-tight truncate px-1 w-full text-center">
              {{ draftStore.getTeam(cell.pick.team_id)?.name }}
            </span>
            <span class="text-slate-500 text-[10px]">{{ draftStore.getTeam(cell.pick.team_id)?.code }}</span>
          </template>
          <template v-else-if="cell.isCurrent">
            <span class="text-gold-500 text-[10px] font-semibold">Picking…</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
