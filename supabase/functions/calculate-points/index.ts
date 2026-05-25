import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function calcPredictorPoints(hPred: number, aPred: number, hActual: number, aActual: number): number {
  if (hPred === hActual && aPred === aActual) return 5
  const predResult = hPred > aPred ? 'home' : aPred > hPred ? 'away' : 'draw'
  const actualResult = hActual > aActual ? 'home' : aActual > hActual ? 'away' : 'draw'
  if (predResult !== actualResult) return 0
  if (hPred - aPred === hActual - aActual) return 3
  return 2
}

const ADVANCEMENT_BONUSES: Record<string, number> = {
  r32_advance: 2,
  r16_advance: 3,
  qf_advance: 4,
  sf_advance: 5,
  final_advance: 7,
  champion: 10,
}

Deno.serve(async (req) => {
  const { match_ids } = await req.json() as { match_ids: number[] }

  for (const matchId of match_ids) {
    const { data: match } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .eq('id', matchId)
      .single()

    if (!match || match.home_score === null || match.away_score === null) continue

    // 1. Calculate predictor points
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)

    for (const pred of predictions ?? []) {
      const pts = calcPredictorPoints(pred.home_score_pred, pred.away_score_pred, match.home_score, match.away_score)
      await supabase
        .from('predictions')
        .update({ points_awarded: pts })
        .eq('id', pred.id)
    }

    // 2. Calculate draft points for team owners
    await calculateDraftMatchPoints(matchId, match)

    // 3. Check advancement bonuses
    if (match.stage === 'group') {
      // After all group matches for a group are finished, award r32 advancement to top 2
      await checkGroupAdvancement(match.home_team_id, match.away_team_id)
    } else if (match.stage !== 'final') {
      // In knockout stages, winner advances to next round
      const winnerId = match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
          ? match.away_team_id
          : null // draw goes to penalties — handled separately

      if (winnerId) {
        const nextStageBonus = getAdvancementBonus(match.stage)
        if (nextStageBonus) await awardAdvancementBonus(winnerId, matchId, nextStageBonus)
      }
    } else if (match.stage === 'final') {
      const winnerId = match.home_score >= match.away_score ? match.home_team_id : match.away_team_id
      await awardAdvancementBonus(winnerId, matchId, 'final_advance')
      await awardAdvancementBonus(winnerId, matchId, 'champion')
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})

async function calculateDraftMatchPoints(matchId: number, match: MatchRow) {
  // Find owners of home and away teams
  const { data: picks } = await supabase
    .from('draft_picks')
    .select('user_id, team_id')
    .in('team_id', [match.home_team_id, match.away_team_id].filter(Boolean))

  if (!picks?.length) return

  const homeScore = match.home_score!
  const awayScore = match.away_score!

  for (const pick of picks) {
    let pts = 0
    let reason = ''

    if (pick.team_id === match.home_team_id) {
      if (homeScore > awayScore) { pts = 3; reason = 'win' }
      else if (homeScore === awayScore) { pts = 1; reason = 'draw' }
      else { pts = 0; reason = 'loss' }
    } else {
      if (awayScore > homeScore) { pts = 3; reason = 'win' }
      else if (awayScore === homeScore) { pts = 1; reason = 'draw' }
      else { pts = 0; reason = 'loss' }
    }

    if (pts > 0) {
      await supabase.from('draft_points').upsert({
        user_id: pick.user_id,
        team_id: pick.team_id,
        match_id: matchId,
        points: pts,
        reason,
      }, { onConflict: 'user_id,team_id,match_id,reason', ignoreDuplicates: true })
    }
  }
}

function getAdvancementBonus(currentStage: string): string | null {
  const map: Record<string, string> = {
    r32: 'r32_advance',
    r16: 'r16_advance',
    qf: 'qf_advance',
    sf: 'sf_advance',
  }
  return map[currentStage] ?? null
}

async function awardAdvancementBonus(teamId: number, matchId: number, reason: string) {
  const { data: pick } = await supabase
    .from('draft_picks')
    .select('user_id')
    .eq('team_id', teamId)
    .maybeSingle()

  if (!pick) return

  await supabase.from('draft_points').upsert({
    user_id: pick.user_id,
    team_id: teamId,
    match_id: matchId,
    points: ADVANCEMENT_BONUSES[reason] ?? 0,
    reason,
  }, { onConflict: 'user_id,team_id,match_id,reason', ignoreDuplicates: true })
}

async function checkGroupAdvancement(homeTeamId: number, awayTeamId: number) {
  // Get the group for these teams
  const { data: team } = await supabase.from('teams').select('group_name').eq('id', homeTeamId).single()
  if (!team?.group_name) return

  // Get all teams in the group
  const { data: groupTeams } = await supabase.from('teams').select('id').eq('group_name', team.group_name)
  if (!groupTeams) return

  const groupTeamIds = groupTeams.map((t: { id: number }) => t.id)

  // Count finished group matches for this group
  const { data: groupMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_score, away_score, status')
    .eq('stage', 'group')
    .in('home_team_id', groupTeamIds)
    .eq('status', 'finished')

  // Each group has 6 matches (4 teams, round-robin)
  if ((groupMatches?.length ?? 0) < 6) return

  // Calculate standings
  const points: Record<number, number> = {}
  for (const id of groupTeamIds) points[id] = 0

  for (const m of groupMatches ?? []) {
    if (m.home_score > m.away_score) points[m.home_team_id] += 3
    else if (m.home_score === m.away_score) { points[m.home_team_id] += 1; points[m.away_team_id] += 1 }
    else points[m.away_team_id] += 3
  }

  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1])
  const top2 = sorted.slice(0, 2).map(([id]) => parseInt(id))

  // Award R32 advancement bonus to top 2 teams' owners
  const lastMatchId = groupMatches![groupMatches!.length - 1].id
  for (const teamId of top2) {
    await awardAdvancementBonus(teamId, lastMatchId, 'r32_advance')
  }
}

interface MatchRow {
  id: number
  stage: string
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  home_team: { id: number; name: string }
  away_team: { id: number; name: string }
}
