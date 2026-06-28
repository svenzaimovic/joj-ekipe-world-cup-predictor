import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FD_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!
const FD_BASE = 'https://api.football-data.org/v4'

async function fdFetch(path: string) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { 'X-Auth-Token': FD_KEY },
  })
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  return res.json()
}

// Map football-data.org stage names → our DB stage values
function mapStage(apiStage: string): string {
  const m: Record<string, string> = {
    'GROUP_STAGE':   'group',
    'LAST_32':       'r32',
    'LAST_16':       'r16',
    'QUARTER_FINALS':'qf',
    'SEMI_FINALS':   'sf',
    'THIRD_PLACE':   'tp',
    'FINAL':         'final',
  }
  return m[apiStage] ?? 'group'
}

// Display ordering for each stage
const STAGE_ORDER: Record<string, number> = {
  group: 1, r32: 2, r16: 3, qf: 4, sf: 5, tp: 6, final: 7,
}

Deno.serve(async (req) => {
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const forceRecalculate: boolean = body.force_recalculate === true

    // --- 0. Build TLA → team_id lookup from our teams table -----------------
    const { data: dbTeams } = await supabase.from('teams').select('id, code')
    const teamsByTla = new Map<string, number>()
    for (const t of dbTeams ?? []) {
      if (t.code) teamsByTla.set(t.code, t.id)
    }

    // --- 1. Fetch all match states from football-data.org -------------------
    const [finishedData, liveData, scheduledData] = await Promise.all([
      fdFetch('/competitions/WC/matches?season=2026&status=FINISHED'),
      fdFetch('/competitions/WC/matches?season=2026&status=IN_PLAY'),
      fdFetch('/competitions/WC/matches?season=2026&status=SCHEDULED'),
    ])

    const fixtures = [
      ...(finishedData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'finished' as const })),
      ...(liveData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'live' as const })),
      ...(scheduledData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'scheduled' as const })),
    ]

    // --- 2. Auto-insert any fixture not yet in our DB -----------------------
    // Knockout fixtures are determined after the group stage and weren't
    // pre-seeded, so we insert them here when the API first returns them.
    let insertedCount = 0
    for (const fixture of fixtures) {
      const externalId = String(fixture.id)
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (existing) continue // already tracked — will be updated in step 3

      const homeTla = fixture.homeTeam?.tla
      const awayTla = fixture.awayTeam?.tla
      const homeTeamId = homeTla ? (teamsByTla.get(homeTla) ?? null) : null
      const awayTeamId = awayTla ? (teamsByTla.get(awayTla) ?? null) : null
      const stage = mapStage(fixture.stage)
      const kickoff = fixture.utcDate

      await supabase.from('matches').insert({
        external_id: externalId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: kickoff,
        stage,
        status: fixture.newStatus,
        lock_time: kickoff, // lock predictions at kickoff
        stage_order: STAGE_ORDER[stage] ?? 99,
      })
      insertedCount++
    }

    // --- 3. Sync scores/status for active (non-scheduled) matches -----------
    let updatedCount = 0
    const finishedMatchIds: number[] = []

    for (const fixture of fixtures.filter(f => f.newStatus !== 'scheduled')) {
      const externalId = String(fixture.id)
      const homeScore = fixture.score?.fullTime?.home ?? null
      const awayScore = fixture.score?.fullTime?.away ?? null

      const { data: match } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score, home_team_id, away_team_id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (!match) continue

      const wasFinished = match.status === 'finished'
      const hadNullScores = match.home_score === null || match.away_score === null
      const nowHasScores = homeScore !== null && awayScore !== null

      // Fill in team IDs if they became known after bracket propagation
      const homeTla = fixture.homeTeam?.tla
      const awayTla = fixture.awayTeam?.tla
      const homeTeamId = homeTla ? (teamsByTla.get(homeTla) ?? null) : null
      const awayTeamId = awayTla ? (teamsByTla.get(awayTla) ?? null) : null

      // Derive winner from API: 'HOME_TEAM'→'home', 'AWAY_TEAM'→'away', else null
      const apiWinner = fixture.score?.winner
      const winner = apiWinner === 'HOME_TEAM' ? 'home' : apiWinner === 'AWAY_TEAM' ? 'away' : null

      await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: fixture.newStatus,
          winner,
          ...(homeTeamId && !match.home_team_id ? { home_team_id: homeTeamId } : {}),
          ...(awayTeamId && !match.away_team_id ? { away_team_id: awayTeamId } : {}),
        })
        .eq('external_id', externalId)

      updatedCount++

      if (fixture.newStatus === 'finished' && (!wasFinished || (hadNullScores && nowHasScores))) {
        finishedMatchIds.push(match.id)
      }
    }

    // --- 4. Catch-up: finished matches missing points -----------------------
    const { data: allFinishedInDb } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    for (const m of allFinishedInDb ?? []) {
      if (finishedMatchIds.includes(m.id)) continue

      if (forceRecalculate) {
        finishedMatchIds.push(m.id)
      } else {
        const { count } = await supabase
          .from('draft_points')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', m.id)
        if (count === 0) finishedMatchIds.push(m.id)
      }
    }

    // --- 5. Trigger points calculation --------------------------------------
    if (finishedMatchIds.length > 0) {
      await supabase.functions.invoke('calculate-points', {
        body: { match_ids: finishedMatchIds },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: insertedCount,
        updated: updatedCount,
        triggered_calculation: finishedMatchIds.length,
        force: forceRecalculate,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('fetch-results error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

interface FdMatch {
  id: number
  stage: string
  utcDate: string
  status: string
  homeTeam: { tla: string; name: string }
  awayTeam: { tla: string; name: string }
  score: {
    winner: string | null  // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null }
  }
  newStatus: 'finished' | 'live' | 'scheduled'
}
