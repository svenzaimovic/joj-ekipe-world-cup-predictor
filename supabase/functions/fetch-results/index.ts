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

Deno.serve(async (req) => {
  try {
    // force_recalculate: skip the count=0 guard and re-run calculate-points
    // for every finished match in the DB. Safe because calculate-points uses
    // select-then-insert (idempotent). Use this to fix missing points after
    // a bug fix or DB inconsistency.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const forceRecalculate: boolean = body.force_recalculate === true

    // --- 1. Fetch finished matches (full history) ----------------------------
    // The ?status=FINISHED filter on football-data.org covers all completed
    // matches regardless of date. This replaces the 3-day window approach
    // which missed historical matches.
    const [finishedData, liveData] = await Promise.all([
      fdFetch('/competitions/WC/matches?season=2026&status=FINISHED'),
      fdFetch('/competitions/WC/matches?season=2026&status=IN_PLAY'),
    ])

    const fixtures = [
      ...(finishedData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'finished' as const })),
      ...(liveData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'live' as const })),
    ]

    // --- 2. Sync scores/status to DB ----------------------------------------
    let updatedCount = 0
    const finishedMatchIds: number[] = []

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
      const hadNullScores = match.home_score === null || match.away_score === null
      const nowHasScores = homeScore !== null && awayScore !== null

      await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore, status: fixture.newStatus })
        .eq('external_id', externalId)

      updatedCount++

      // Trigger points: newly finished, or scores just arrived after a null-score run
      if (fixture.newStatus === 'finished' && (!wasFinished || (hadNullScores && nowHasScores))) {
        finishedMatchIds.push(match.id)
      }
    }

    // --- 3. Catch-up: find finished matches that are missing points ----------
    // On force_recalculate we skip the count check entirely — safe because
    // calculate-points uses select-then-insert (won't double-award).
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
        // Normal mode: only re-trigger if no draft_points exist yet
        const { count } = await supabase
          .from('draft_points')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', m.id)
        if (count === 0) finishedMatchIds.push(m.id)
      }
    }

    // --- 4. Trigger points calculation --------------------------------------
    if (finishedMatchIds.length > 0) {
      await supabase.functions.invoke('calculate-points', {
        body: { match_ids: finishedMatchIds },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updatedCount, triggered_calculation: finishedMatchIds.length, force: forceRecalculate }),
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
