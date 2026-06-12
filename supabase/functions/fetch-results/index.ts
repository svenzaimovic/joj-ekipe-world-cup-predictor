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

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  try {
    // football-data.org free tier: the ?status=FINISHED filter is unreliable —
    // it returns 0 results even for matches that are clearly finished when fetched
    // by date. Instead we fetch a rolling 3-day window (yesterday → tomorrow) so
    // we always catch matches that finished recently.
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setUTCDate(now.getUTCDate() - 1)
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(now.getUTCDate() + 1)

    const data = await fdFetch(
      `/competitions/WC/matches?season=2026&dateFrom=${toDateStr(yesterday)}&dateTo=${toDateStr(tomorrow)}`,
    )

    const allMatches: FdMatch[] = data.matches ?? []

    // Only process matches that have a result or are live
    const fixtures = allMatches
      .filter((m) => m.status === 'FINISHED' || m.status === 'IN_PLAY')
      .map((m) => ({
        ...m,
        newStatus: m.status === 'FINISHED' ? ('finished' as const) : ('live' as const),
      }))

    let updatedCount = 0
    const finishedMatchIds: number[] = []
    let calcResult: unknown = null

    for (const fixture of fixtures) {
      const externalId = String(fixture.id)
      const homeScore = fixture.score?.fullTime?.home ?? null
      const awayScore = fixture.score?.fullTime?.away ?? null

      const { data: match } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score')
        .eq('external_id', externalId)
        .maybeSingle()

      if (!match) continue

      const wasFinished = match.status === 'finished'
      // Scores were null on a previous run (API published status before scores)
      const hadNullScores = match.home_score === null || match.away_score === null
      const nowHasScores = homeScore !== null && awayScore !== null

      await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore, status: fixture.newStatus })
        .eq('external_id', externalId)

      updatedCount++

      // Trigger points if: just flipped to finished, OR was already finished but
      // scores just arrived (API published status before scores on a prior run)
      if (fixture.newStatus === 'finished' && (!wasFinished || (hadNullScores && nowHasScores))) {
        finishedMatchIds.push(match.id)
      }
    }

    // Catch-up: find finished+scored matches in DB that have no draft_points yet.
    // This handles cases where calculate-points previously failed (e.g. after a bug fix).
    // It's safe to re-trigger because calculate-points uses ignoreDuplicates on upsert.
    const { data: unpointedMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    for (const m of unpointedMatches ?? []) {
      if (finishedMatchIds.includes(m.id)) continue // already queued above
      const { count } = await supabase
        .from('draft_points')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', m.id)
      // count===0 means either no picks won/drew (fine to re-run, will insert nothing)
      // or calculate-points never ran — so always safe to retry
      if (count === 0) finishedMatchIds.push(m.id)
    }

    // Trigger points calculation for newly finished matches (and any catch-up)
    if (finishedMatchIds.length > 0) {
      const { data: cpData, error: cpErr } = await supabase.functions.invoke('calculate-points', {
        body: { match_ids: finishedMatchIds },
      })
      calcResult = { data: cpData, error: cpErr ? cpErr.message : null }
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updatedCount, triggered_calculation: finishedMatchIds.length, calc: calcResult }),
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
  status: string
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}
