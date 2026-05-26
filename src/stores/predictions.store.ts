import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { Prediction } from '@/types/app.types'

interface PredictionDraft {
  match_id: number
  home_score_pred: number
  away_score_pred: number
}

export const usePredictionsStore = defineStore('predictions', () => {
  const myPredictions = ref<Map<number, Prediction>>(new Map())
  const allPredictions = ref<Prediction[]>([])
  const drafts = ref<Map<number, PredictionDraft>>(new Map())
  const saving = ref(false)
  const loading = ref(false)

  async function fetchMine() {
    const auth = useAuthStore()
    if (!auth.user) return
    loading.value = true
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', auth.user.id)
    for (const p of data ?? []) {
      myPredictions.value.set(p.match_id, p as Prediction)
    }
    loading.value = false
  }

  async function fetchAllForStage(stage: string) {
    const { data } = await supabase
      .from('predictions')
      .select('*, match:matches!inner(stage)')
      .eq('match.stage', stage)
    allPredictions.value = (data ?? []) as Prediction[]
  }

  function setDraft(matchId: number, homeScore: number, awayScore: number) {
    drafts.value.set(matchId, { match_id: matchId, home_score_pred: homeScore, away_score_pred: awayScore })
  }

  async function saveStage(stage: string) {
    const auth = useAuthStore()
    if (!auth.user) return
    saving.value = true

    const stageDrafts = [...drafts.value.values()]
    if (!stageDrafts.length) {
      saving.value = false
      return
    }

    const upserts = stageDrafts.map((d) => ({
      user_id: auth.user!.id,
      match_id: d.match_id,
      home_score_pred: d.home_score_pred,
      away_score_pred: d.away_score_pred,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('predictions')
      .upsert(upserts, { onConflict: 'user_id,match_id' })
      .select()

    if (!error && data) {
      for (const p of data) {
        myPredictions.value.set(p.match_id, p as Prediction)
      }
      for (const d of stageDrafts) {
        drafts.value.delete(d.match_id)
      }
    }

    saving.value = false
    if (error) throw error
  }

  function getPrediction(matchId: number): Prediction | undefined {
    return myPredictions.value.get(matchId)
  }

  function getDraft(matchId: number): PredictionDraft | undefined {
    return drafts.value.get(matchId)
  }

  return { myPredictions, allPredictions, drafts, saving, loading, fetchMine, fetchAllForStage, setDraft, saveStage, getPrediction, getDraft }
})
