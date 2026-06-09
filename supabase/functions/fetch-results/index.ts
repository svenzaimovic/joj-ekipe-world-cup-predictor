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

Deno.serve(async () => {
  try {
    // Fetch all live + finished WC matches
    const [finishedData, liveData] = await Promise.all([
      fdFetch('/competitions/WC/matches?season=2026&status=FINISHED'),
      fdFetch('/competitions/WC/matches?season=2026&status=IN_PLAY'),
    ])

    const fixtures = [
      ...(finishedData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'finished' as const })),
      ...(liveData.matches ?? []).map((m: FdMatch) => ({ ...m, newStatus: 'live' as const })),
    ]

    let updatedCount = 0
    const finishedMatchIds: number[] = []

    for (const fixture of fixtures) {
      const externalId = String(fixture.id)
      const homeScore = fixture.score?.fullTime?.home ?? null
      const awayScore = fixture.score?.fullTime?.away ?? null

      const { data: match } = await supabase
        .from('matches')
        .select('id, status')
        .eq('external_id', externalId)
        .maybeSingle()

      if (!match) continue

      const wasFinished = match.status === 'finished'

      await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore, status: fixture.newStatus })
        .eq('external_id', externalId)

      updatedCount++

      if (fixture.newStatus === 'finished' && !wasFinished) {
        finishedMatchIds.push(match.id)
      }
    }

    // Trigger points calculation for newly finished matches
    if (finishedMatchIds.length > 0) {
      await supabase.functions.invoke('calculate-points', {
        body: { match_ids: finishedMatchIds },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updatedCount, triggered_calculation: finishedMatchIds.length }),
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
