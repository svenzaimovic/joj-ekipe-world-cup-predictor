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

// Win points scale inversely with team strength — weaker teams earn more per win
// T1=3, T2=4, T3=5, T4=7 (same rate for group stage and playoffs)
const TIER_WIN_POINTS: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 7 }

// Group stage draw points by tier — draws in knockout rounds award 0 (game goes to penalties)
const TIER_DRAW_POINTS: Record<number, number> = { 1: 0, 2: 1, 3: 1, 4: 2 }

// Only bonus: +2 for qualifying from group stage (top 2)
const QUALIFY_BONUS = 2

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

    // 2. Calculate draft points for team owners (tier-based win points)
    await calculateDraftMatchPoints(matchId, match)

    // 3. Group qualify bonus — only awarded once all 6 group matches are done
    if (match.stage === 'group') {
      await checkGroupAdvancement(match.home_team_id, match.away_team_id, matchId)
    }
    // No per-round advancement bonuses in knockout stages —
    // tier-based win points are the only reward for going deep
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})

async function calculateDraftMatchPoints(matchId: number, match: MatchRow) {
  const { data: picks } = await supabase
    .from('draft_picks')
    .select('user_id, team_id')
    .in('team_id', [match.home_team_id, match.away_team_id].filter(Boolean))

  if (!picks?.length) return

  const homeScore = match.home_score!
  const awayScore = match.away_score!
  const homeTier: number = match.home_team?.tier ?? 2
  const awayTier: number = match.away_team?.tier ?? 2

  for (const pick of picks) {
    const isHome = pick.team_id === match.home_team_id
    const scored = isHome ? homeScore : awayScore
    const conceded = isHome ? awayScore : homeScore
    const tier = isHome ? homeTier : awayTier
    const winPts = TIER_WIN_POINTS[tier] ?? 3
    const drawPts = match.stage === 'group' ? (TIER_DRAW_POINTS[tier] ?? 1) : 0

    let pts = 0
    let reason = ''

    if (scored > conceded)        { pts = winPts; reason = 'win' }
    else if (scored === conceded)  { pts = drawPts; reason = 'draw' }
    else                          { reason = 'loss' }

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

async function checkGroupAdvancement(homeTeamId: number, awayTeamId: number, matchId: number) {
  const { data: team } = await supabase.from('teams').select('group_name').eq('id', homeTeamId).single()
  if (!team?.group_name) return

  const { data: groupTeams } = await supabase.from('teams').select('id').eq('group_name', team.group_name)
  if (!groupTeams) return

  const groupTeamIds = groupTeams.map((t: { id: number }) => t.id)

  const { data: groupMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_score, away_score')
    .eq('stage', 'group')
    .in('home_team_id', groupTeamIds)
    .eq('status', 'finished')

  // Each group has 6 matches — only process once all are done
  if ((groupMatches?.length ?? 0) < 6) return

  // Calculate standings to find top 2
  const pts: Record<number, number> = {}
  for (const id of groupTeamIds) pts[id] = 0

  for (const m of groupMatches ?? []) {
    if (m.home_score > m.away_score)       pts[m.home_team_id] += 3
    else if (m.home_score === m.away_score) { pts[m.home_team_id] += 1; pts[m.away_team_id] += 1 }
    else                                    pts[m.away_team_id] += 3
  }

  const top2 = Object.entries(pts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => parseInt(id))

  for (const teamId of top2) {
    const { data: pick } = await supabase
      .from('draft_picks')
      .select('user_id')
      .eq('team_id', teamId)
      .maybeSingle()

    if (!pick) continue

    await supabase.from('draft_points').upsert({
      user_id: pick.user_id,
      team_id: teamId,
      match_id: matchId,
      points: QUALIFY_BONUS,
      reason: 'qualify',
    }, { onConflict: 'user_id,team_id,match_id,reason', ignoreDuplicates: true })
  }
}

interface TeamRow {
  id: number
  name: string
  tier: number
}

interface MatchRow {
  id: number
  stage: string
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  home_team: TeamRow
  away_team: TeamRow
}
