import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Fetches elimination state for a league.
 *
 * A team is considered eliminated when:
 *   1. They lost a finished knockout match (r32/r16/qf/sf/tp/final), OR
 *   2. All group-stage matches are done (qualify bonuses issued) and the team
 *      never received a qualify bonus — meaning they finished 3rd/4th in their
 *      group and weren't among the 8 best third-place qualifiers.
 */
export function useElimination() {
  const knockoutEliminatedIds = ref<Set<number>>(new Set())
  const qualifiedIds = ref<Set<number>>(new Set())
  const qualifyBonusIssued = ref(false)

  async function fetchElimination(leagueId: string) {
    // 1. Find teams that lost a finished knockout match
    const { data: knockoutMatches } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, winner')
      .neq('stage', 'group')
      .eq('status', 'finished')
      .not('winner', 'is', null)

    const eliminated = new Set<number>()
    for (const m of knockoutMatches ?? []) {
      if (m.winner === 'home' && m.away_team_id) eliminated.add(m.away_team_id)
      if (m.winner === 'away' && m.home_team_id) eliminated.add(m.home_team_id)
    }
    knockoutEliminatedIds.value = eliminated

    // 2. Check if qualify bonuses have been issued for this league
    const { data: qualifyRows } = await supabase
      .from('draft_points')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('reason', 'qualify')

    const qualified = new Set<number>((qualifyRows ?? []).map((r) => r.team_id))
    qualifiedIds.value = qualified
    qualifyBonusIssued.value = qualified.size > 0
  }

  function isEliminated(teamId: number): boolean {
    if (knockoutEliminatedIds.value.has(teamId)) return true
    // If group stage is fully resolved and this team has no qualify bonus → group exit
    if (qualifyBonusIssued.value && !qualifiedIds.value.has(teamId)) return true
    return false
  }

  return { fetchElimination, isEliminated, qualifyBonusIssued }
}
