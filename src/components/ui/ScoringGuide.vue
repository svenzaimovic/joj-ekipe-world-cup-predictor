<script setup lang="ts">
import { TIER_LABELS, TIER_COLORS, TIER_WIN_POINTS, TIER_DRAW_POINTS } from '@/types/app.types'
import type { TeamTier } from '@/types/app.types'

const tiers: TeamTier[] = [1, 2, 3, 4]
</script>

<template>
  <div>
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Draft Points (per match)</h3>
    <div class="rounded-xl overflow-hidden border border-navy-700">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-navy-900 text-xs text-slate-500 uppercase tracking-wide">
            <th class="text-left px-3 py-2">Tier</th>
            <th class="px-3 py-2 text-center">Win</th>
            <th class="px-3 py-2 text-center">Draw<span class="normal-case text-[10px] ml-0.5">(groups)</span></th>
            <th class="px-3 py-2 text-center">Loss</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tier in tiers" :key="tier" class="border-t border-navy-700 bg-navy-800">
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <div :class="['w-2 h-2 rounded-full shrink-0', TIER_COLORS[tier].dot]" />
                <span :class="['font-semibold text-xs', TIER_COLORS[tier].text]">T{{ tier }} · {{ TIER_LABELS[tier] }}</span>
              </div>
            </td>
            <td :class="['px-3 py-2.5 text-center font-black', TIER_COLORS[tier].text]">{{ TIER_WIN_POINTS[tier] }}</td>
            <td class="px-3 py-2.5 text-center text-slate-400 font-semibold">{{ TIER_DRAW_POINTS[tier] || '—' }}</td>
            <td class="px-3 py-2.5 text-center text-slate-600">0</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-2 flex flex-col gap-1">
      <p class="text-[11px] text-slate-500">
        <span class="text-emerald-400 font-bold">+2 pts</span> — Group stage qualification bonus (top 2 in group)
      </p>
      <p class="text-[11px] text-slate-500">Knockout round draws go to penalties → 0 draw pts, win pts go to match winner</p>
      <p class="text-[11px] text-slate-500 italic mt-1">
        Points scale inversely with tier — picking a lower-ranked team is riskier, so each win is worth more. Favourites earn steadily; underdogs can swing the standings with a single result.
      </p>
    </div>
  </div>
</template>
