import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FD_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!
const FD_BASE = 'https://api.football-data.org/v4'

async function fdFetch(path: string) {
  const res = await fetch(`${FD_BASE}${path}`, { headers: { 'X-Auth-Token': FD_KEY } })
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  return res.json()
}

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

// Qualify bonus: +2 for advancing from group stage (top 2 per group + 8 best 3rd-place)
const QUALIFY_BONUS = 2

// WC 2026: 12 groups × 4 teams × 3 matches each / 2 = 72 group stage matches total
const TOTAL_GROUP_MATCHES = 72

Deno.serve(async (req) => {
  try {
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

      // 2. Calculate draft points for team owners — official rooms only
      await calculateDraftMatchPoints(matchId, match)

      // 3. Group qualify bonus — checked each time a group stage match finishes
      if (match.stage === 'group') {
        await checkGroupAdvancement(match.home_team_id, match.away_team_id, matchId)
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[calculate-points] unhandled error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function calculateDraftMatchPoints(matchId: number, match: MatchRow) {
  // Only picks from official (non-practice) rooms earn points
  const { data: allPicks } = await supabase
    .from('draft_picks')
    .select('user_id, team_id, room_id, draft_rooms!inner(league_id, room_type)')
    .in('team_id', [match.home_team_id, match.away_team_id].filter(Boolean))

  const picks = (allPicks ?? []).filter((p: any) => p.draft_rooms?.room_type === 'official')
  if (!picks.length) return

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
      const leagueId = (pick as any).draft_rooms?.league_id ?? null
      // Select-then-insert: avoids relying on a unique constraint for idempotency
      const { data: existing } = await supabase
        .from('draft_points')
        .select('id')
        .eq('user_id', pick.user_id)
        .eq('team_id', pick.team_id)
        .eq('match_id', matchId)
        .eq('reason', reason)
        .maybeSingle()
      if (!existing) {
        await supabase.from('draft_points').insert({
          user_id: pick.user_id,
          team_id: pick.team_id,
          match_id: matchId,
          points: pts,
          reason,
          league_id: leagueId,
        })
      }
    }
  }
}

// Fetch the combined standings table from football-data.org and build a map
// of team TLA (e.g. 'MEX') → standing row (pts, goalDifference, goalsFor).
// The API applies FIFA tiebreakers so the sort order is authoritative.
async function fetchStandingsByTla(): Promise<Map<string, FdStanding>> {
  const data = await fdFetch('/competitions/WC/standings?season=2026')
  const table: FdStanding[] = data.standings?.find((s: any) => s.type === 'TOTAL')?.table ?? []
  const map = new Map<string, FdStanding>()
  for (const row of table) map.set(row.team.tla, row)
  return map
}

async function checkGroupAdvancement(homeTeamId: number, awayTeamId: number, matchId: number) {
  // Find which group these teams belong to
  const { data: team } = await supabase.from('teams').select('group_name').eq('id', homeTeamId).single()
  if (!team?.group_name) return

  // Get all 4 teams in the group with their TLA codes (for API mapping)
  const { data: groupTeams } = await supabase
    .from('teams')
    .select('id, code')
    .eq('group_name', team.group_name)
  if (!groupTeams?.length) return

  const groupTeamIds = groupTeams.map((t: any) => t.id)

  // Only proceed once all 6 group matches are finished
  const { count: finishedCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('stage', 'group')
    .in('home_team_id', groupTeamIds)
    .eq('status', 'finished')

  if ((finishedCount ?? 0) < 6) return

  // Fetch API standings to get FIFA-correct sort order (pts → GD → GF)
  const standingByTla = await fetchStandingsByTla()

  // Rank the 4 group teams using API data
  const ranked = groupTeams
    .map((t: any) => ({ id: t.id, standing: standingByTla.get(t.code) }))
    .filter((t: any) => t.standing != null)
    .sort((a: any, b: any) => {
      const ptsDiff = b.standing.points - a.standing.points
      if (ptsDiff !== 0) return ptsDiff
      const gdDiff = b.standing.goalDifference - a.standing.goalDifference
      if (gdDiff !== 0) return gdDiff
      return b.standing.goalsFor - a.standing.goalsFor
    })

  // Award +2 to the top 2 teams in this group
  const top2 = ranked.slice(0, 2).map((t: any) => t.id)
  for (const teamId of top2) {
    await awardQualifyBonus(teamId, matchId)
  }

  // Once ALL group stage matches are done, award the 8 best third-place teams
  await checkBestThirdPlace(matchId, standingByTla)
}

// Called after every group completes. When all 72 group matches are done,
// collect the 12 third-place teams, rank them globally, and award +2 to the best 8.
async function checkBestThirdPlace(matchId: number, standingByTla: Map<string, FdStanding>) {
  // Count unfinished group matches across ALL groups
  const { count: remaining } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('stage', 'group')
    .neq('status', 'finished')

  if ((remaining ?? 1) > 0) return // Not all groups done yet

  // Fetch all 12 groups from our DB
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, code, group_name')
    .not('group_name', 'is', null)

  if (!allTeams?.length) return

  // Group teams by group_name
  const byGroup = new Map<string, Array<{ id: number; code: string }>>()
  for (const t of allTeams) {
    if (!byGroup.has(t.group_name)) byGroup.set(t.group_name, [])
    byGroup.get(t.group_name)!.push({ id: t.id, code: t.code })
  }

  // For each group, find the third-place team using API standings
  const thirdPlaceTeams: Array<{ id: number; standing: FdStanding }> = []

  for (const [, teams] of byGroup) {
    const ranked = teams
      .map(t => ({ id: t.id, standing: standingByTla.get(t.code) }))
      .filter(t => t.standing != null)
      .sort((a: any, b: any) => {
        const ptsDiff = b.standing.points - a.standing.points
        if (ptsDiff !== 0) return ptsDiff
        const gdDiff = b.standing.goalDifference - a.standing.goalDifference
        if (gdDiff !== 0) return gdDiff
        return b.standing.goalsFor - a.standing.goalsFor
      })

    if (ranked[2]) thirdPlaceTeams.push(ranked[2] as { id: number; standing: FdStanding })
  }

  // Rank the 12 third-place teams globally, award +2 to best 8
  const best8 = thirdPlaceTeams
    .sort((a, b) => {
      const ptsDiff = b.standing.points - a.standing.points
      if (ptsDiff !== 0) return ptsDiff
      const gdDiff = b.standing.goalDifference - a.standing.goalDifference
      if (gdDiff !== 0) return gdDiff
      return b.standing.goalsFor - a.standing.goalsFor
    })
    .slice(0, 8)

  for (const { id: teamId } of best8) {
    await awardQualifyBonus(teamId, matchId)
  }
}

// Insert a qualify bonus for every official-room owner of the given team,
// idempotent via select-before-insert.
// Dedup key: (user_id, team_id, league_id, reason='qualify') — NOT match_id,
// because checkGroupAdvancement is called once per group match so each of the
// 6 completed-group matches would produce a separate row if match_id were
// included in the check. One qualify bonus per team per player per league.
async function awardQualifyBonus(teamId: number, matchId: number) {
  const { data: allPicks } = await supabase
    .from('draft_picks')
    .select('user_id, team_id, room_id, draft_rooms!inner(league_id, room_type)')
    .eq('team_id', teamId)

  const officialPicks = (allPicks ?? []).filter((p: any) => p.draft_rooms?.room_type === 'official')

  for (const pick of officialPicks) {
    const leagueId = (pick as any).draft_rooms?.league_id ?? null

    // Check: has this user already received a qualify bonus for this team in this league?
    const existingQuery = supabase
      .from('draft_points')
      .select('id')
      .eq('user_id', pick.user_id)
      .eq('team_id', teamId)
      .eq('reason', 'qualify')
    if (leagueId != null) existingQuery.eq('league_id', leagueId)
    else existingQuery.is('league_id', null)

    const { data: existing } = await existingQuery.maybeSingle()

    if (!existing) {
      await supabase.from('draft_points').insert({
        user_id: pick.user_id,
        team_id: teamId,
        match_id: matchId,
        points: QUALIFY_BONUS,
        reason: 'qualify',
        league_id: leagueId,
      })
    }
  }
}

interface FdStanding {
  position: number
  team: { id: number; tla: string; name: string }
  points: number
  goalDifference: number
  goalsFor: number
  goalsAgainst: number
  playedGames: number
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
