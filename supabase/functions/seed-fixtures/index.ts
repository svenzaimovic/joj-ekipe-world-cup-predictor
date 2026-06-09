/**
 * seed-fixtures — one-time admin function
 *
 * Calls the API-Football API, fetches every WC 2026 fixture,
 * and upserts them into the matches table with the correct
 * external_id and team IDs from our DB.
 *
 * Call once before the tournament (or re-call to refresh).
 * Idempotent — safe to run multiple times.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const API_KEY = Deno.env.get('API_FOOTBALL_KEY')!
const API_BASE = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1
const SEASON = 2026

// Maps API team names → our team codes (for tricky mismatches)
const NAME_MAP: Record<string, string> = {
  'United States': 'USA',
  'USA': 'USA',
  'Korea Republic': 'KOR',
  'South Korea': 'KOR',
  'Czech Republic': 'CZE',
  'Czechia': 'CZE',
  'Bosnia and Herzegovina': 'BIH',
  'Bosnia & Herzegovina': 'BIH',
  'Ivory Coast': 'CIV',
  "Côte d'Ivoire": 'CIV',
  'Cote d\'Ivoire': 'CIV',
  'Cape Verde': 'CPV',
  'Cape Verde Islands': 'CPV',
  'DR Congo': 'COD',
  'Congo DR': 'COD',
  'Democratic Republic of the Congo': 'COD',
  'Curacao': 'CUW',
  'Curaçao': 'CUW',
  'Saudi Arabia': 'KSA',
  'New Zealand': 'NZL',
  'South Africa': 'RSA',
  'Scotland': 'SCO',
  'England': 'ENG',
  'Portugal': 'POR',
  'Germany': 'GER',
  'France': 'FRA',
  'Spain': 'ESP',
  'Brazil': 'BRA',
  'Argentina': 'ARG',
  'Uruguay': 'URU',
  'Netherlands': 'NED',
  'Belgium': 'BEL',
  'Croatia': 'CRO',
  'Japan': 'JPN',
  'Senegal': 'SEN',
  'Morocco': 'MAR',
  'Mexico': 'MEX',
  'Colombia': 'COL',
  'Ecuador': 'ECU',
  'Paraguay': 'PAR',
  'Canada': 'CAN',
  'Switzerland': 'SUI',
  'Sweden': 'SWE',
  'Norway': 'NOR',
  'Turkey': 'TUR',
  'Austria': 'AUT',
  'Algeria': 'ALG',
  'Ghana': 'GHA',
  'Egypt': 'EGY',
  'Tunisia': 'TUN',
  'Iran': 'IRN',
  'Iraq': 'IRQ',
  'Jordan': 'JOR',
  'Qatar': 'QAT',
  'Haiti': 'HAI',
  'Panama': 'PAN',
  'Honduras': 'HON',
  'Jamaica': 'JAM',
  'Australia': 'AUS',
  'Chile': 'CHI',
  'Serbia': 'SRB',
  'Poland': 'POL',
  'Ukraine': 'UKR',
  'Romania': 'ROU',
  'Uzbekistan': 'UZB',
  'Bolivia': 'BOL',
  'Venezuela': 'VEN',
  'Cameroon': 'CMR',
  'Nigeria': 'NGA',
  'Sudan': 'SDN',
  'Costa Rica': 'CRC',
  'Italy': 'ITA',
  'Greece': 'GRE',
  'Russia': 'RUS',
}

const STAGE_MAP: Record<string, string> = {
  'Group Stage': 'group',
  '3rd Round': 'r32',   // WC 2026 Round of 32
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  'Quarter-finals': 'qf',
  'Semi-finals': 'sf',
  'Final': 'final',
  '3rd Place Final': 'final',
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  })
  return res.json()
}

Deno.serve(async () => {
  try {
    // Load all our teams indexed by code
    const { data: dbTeams } = await supabase.from('teams').select('id, name, code')
    if (!dbTeams?.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No teams in DB — run migrations first' }), { status: 400 })
    }

    const teamByCode: Record<string, number> = {}
    const teamByName: Record<string, number> = {}
    for (const t of dbTeams) {
      teamByCode[t.code] = t.id
      teamByName[t.name.toLowerCase()] = t.id
    }

    function resolveTeam(apiName: string): number | null {
      // Try direct name map → code → id
      const code = NAME_MAP[apiName]
      if (code && teamByCode[code]) return teamByCode[code]
      // Try lowercase name match
      return teamByName[apiName.toLowerCase()] ?? null
    }

    // Fetch all fixtures for WC 2026
    const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`)
    const fixtures: ApiFixture[] = data.response ?? []

    if (!fixtures.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No fixtures returned from API', raw: data }), { status: 200 })
    }

    let inserted = 0
    let updated = 0
    let skipped = 0
    const unmatchedTeams = new Set<string>()

    for (const f of fixtures) {
      const externalId = String(f.fixture.id)
      const apiStage = f.league.round ?? 'Group Stage'
      const stage = STAGE_MAP[apiStage] ?? 'group'
      const matchDate = f.fixture.date
      const venue = f.fixture.venue?.name ?? null

      const homeId = resolveTeam(f.teams.home.name)
      const awayId = resolveTeam(f.teams.away.name)

      if (!homeId) unmatchedTeams.add(f.teams.home.name)
      if (!awayId) unmatchedTeams.add(f.teams.away.name)

      // For group stage: lock 1 hour before kickoff
      // For knockouts: lock at match time
      const kickoff = new Date(matchDate)
      const lockTime = stage === 'group'
        ? new Date(kickoff.getTime() - 60 * 60 * 1000).toISOString()
        : kickoff.toISOString()

      const homeScore = f.goals.home
      const awayScore = f.goals.away
      const apiStatus = f.fixture.status?.short ?? 'NS'
      const status = apiStatus === 'FT' || apiStatus === 'AET' || apiStatus === 'PEN' ? 'finished'
        : ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(apiStatus) ? 'live'
        : 'scheduled'

      const payload = {
        external_id: externalId,
        stage,
        stage_order: 0,
        match_date: matchDate,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: homeScore,
        away_score: awayScore,
        status,
        lock_time: lockTime,
        venue,
      }

      // Check if match already exists
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (existing) {
        await supabase.from('matches').update(payload).eq('external_id', externalId)
        updated++
      } else {
        await supabase.from('matches').insert(payload)
        inserted++
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total: fixtures.length,
      inserted,
      updated,
      skipped,
      unmatchedTeams: [...unmatchedTeams],
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('seed-fixtures error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string }
    venue: { name: string }
  }
  league: { round: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
}
