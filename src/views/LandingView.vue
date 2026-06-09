<script setup lang="ts">
import ScoringGuide from '@/components/ui/ScoringGuide.vue'
import { useRouter } from 'vue-router'
import { Users, Shuffle, Trophy } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-navy-900 text-slate-100">

    <!-- HERO -->
    <section class="flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
      <img src="@/assets/logo.png" alt="WC Draft 2026" class="w-56 mb-6" />
      <p class="text-slate-300 text-lg max-w-md mb-8 leading-relaxed">
        Draft national teams, earn points as they win, climb the standings. Play with friends all tournament long.
      </p>
      <div class="flex gap-3 flex-wrap justify-center">
        <button
          class="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-navy-900 font-black rounded-xl text-sm transition-all shadow-lg"
          @click="router.push({ name: 'login', query: { tab: 'signup' } })"
        >
          Create account
        </button>
        <button
          class="px-6 py-3 bg-navy-700 hover:bg-navy-600 text-slate-100 font-semibold rounded-xl text-sm transition-all border border-navy-600"
          @click="router.push({ name: 'login' })"
        >
          Sign in
        </button>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="max-w-2xl mx-auto px-4 py-10">
      <h2 class="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-8">How it works</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="bg-navy-800 rounded-2xl border border-navy-700 p-5 flex flex-col items-center text-center gap-3">
          <div class="mb-2"><Users :size="40" /></div>
          <div class="font-black text-slate-100">1. Join a league</div>
          <p class="text-slate-400 text-sm">Create a private league and share the invite code with friends.</p>
        </div>
        <div class="bg-navy-800 rounded-2xl border border-navy-700 p-5 flex flex-col items-center text-center gap-3">
          <div class="mb-2"><Shuffle :size="40" /></div>
          <div class="font-black text-slate-100">2. Snake draft</div>
          <p class="text-slate-400 text-sm">Take turns picking national teams in snake order until every team is claimed.</p>
        </div>
        <div class="bg-navy-800 rounded-2xl border border-navy-700 p-5 flex flex-col items-center text-center gap-3">
          <div class="mb-2"><Trophy :size="40" /></div>
          <div class="font-black text-slate-100">3. Earn points</div>
          <p class="text-slate-400 text-sm">Score points for every win, draw, and qualification. Most points at the end wins.</p>
        </div>
      </div>
    </section>

    <!-- SCORING -->
    <section class="max-w-lg mx-auto px-4 py-8">
      <h2 class="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Scoring</h2>
      <div class="bg-navy-800 rounded-2xl border border-navy-700 p-5">
        <ScoringGuide />
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="text-center py-10 text-slate-600 text-xs">
      WC Draft 2026
    </footer>

  </div>
</template>
