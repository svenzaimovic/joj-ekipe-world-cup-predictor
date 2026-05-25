import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const API_KEY = Deno.env.get('API_FOOTBALL_KEY')!
const API_BASE = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1   // FIFA World Cup
const SEASON = 2026

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  })
  return res.json()
}

Deno.serve(async () => {
  try {
    // Fetch finished fixtures
    const [finishedData, liveData] = await Promise.all([
      apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT`),
      apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=LIVE`),
    ])

    const fixtures = [
      ...(finishedData.response ?? []).map((f: ApiFixture) => ({ ...f, newStatus: 'finished' })),
      ...(liveData.response ?? []).map((f: ApiFixture) => ({ ...f, newStatus: 'live' })),
    ]

    let updatedCount = 0
    const finishedMatchIds: number[] = []

    for (const fixture of fixtures) {
      const externalId = String(fixture.fixture.id)
      const homeScore = fixture.goals.home
      const awayScore = fixture.goals.away

      const { data: match } = await supabase
        .from('matches')
        .select('id, status, home_team_id, away_team_id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (!match) continue

      const wasFinished = match.status === 'finished'

      await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: fixture.newStatus,
        })
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

interface ApiFixture {
  fixture: { id: number; date: string; venue: { name: string } }
  teams: { home: { id: number; name: string }; away: { id: number; name: string } }
  goals: { home: number | null; away: number | null }
  newStatus?: string
}
