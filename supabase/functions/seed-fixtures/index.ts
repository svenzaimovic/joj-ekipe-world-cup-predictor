/**
 * seed-fixtures — one-time admin function
 *
 * Calls football-data.org, fetches every WC 2026 fixture,
 * and upserts them into the matches table with the correct
 * external_id and team IDs from our DB.
 *
 * Idempotent — safe to run multiple times.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FD_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!
const FD_BASE = 'https://api.football-data.org/v4'

// Maps football-data.org team names / TLAs → our team codes
const NAME_MAP: Record<string, string> = {
  // By full name
  'United States': 'USA',
  'Korea Republic': 'KOR',
  'South Korea': 'KOR',
  'Bosnia and Herzegovina': 'BIH',
  'Bosnia & Herzegovina': 'BIH',
  "Côte d'Ivoire": 'CIV',
  'Ivory Coast': 'CIV',
  'Curaçao': 'CUW',
  'Curacao': 'CUW',
  'Cape Verde': 'CPV',
  'Cape Verde Islands': 'CPV',
  'DR Congo': 'COD',
  'Congo DR': 'COD',
  'Democratic Republic of the Congo': 'COD',
  'Saudi Arabia': 'KSA',
  'New Zealand': 'NZL',
  'South Africa': 'RSA',
  // By TLA (football-data.org 3-letter codes that differ from ours)
  'USA': 'USA',
  'KOR': 'KOR',
  'BIH': 'BIH',
  'CIV': 'CIV',
  'CUW': 'CUW',
  'CPV': 'CPV',
  'COD': 'COD',
  'KSA': 'KSA',
  'NZL': 'NZL',
  'RSA': 'RSA',
  'ENG': 'ENG',
  'SCO': 'SCO',
  'HAI': 'HAI',
  'IRQ': 'IRQ',
  'IRN': 'IRN',
}

const STAGE_MAP: Record<string, string> = {
  'Group Stage': 'group',
  'Round of 32': 'r32',
  'Last 32': 'r32',
  'Round of 16': 'r16',
  'Last 16': 'r16',
  'Quarter-finals': 'qf',
  'Semi-finals': 'sf',
  'Final': 'final',
  '3rd Place Final': 'final',
}

async function fdFetch(path: string) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { 'X-Auth-Token': FD_KEY },
  })
  if (!res.ok) throw new Error(`football-data.org error: ${res.status} ${await res.text()}`)
  return res.json()
}

Deno.serve(async () => {
  try {
    // Load all our teams indexed by code and name
    const { data: dbTeams } = await supabase.from('teams').select('id, name, code')
    if (!dbTeams?.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No teams in DB — run migrations first' }), { status: 400 })
    }

    const teamByCode: Record<string, number> = {}
    const teamByName: Record<string, number> = {}
    for (const t of dbTeams) {
      teamByCode[t.code.toUpperCase()] = t.id
      teamByName[t.name.toLowerCase()] = t.id
    }

    function resolveTeam(name: string, tla: string): number | null {
      // Try name map
      const mappedCode = NAME_MAP[name] || NAME_MAP[tla]
      if (mappedCode && teamByCode[mappedCode]) return teamByCode[mappedCode]
      // Try our own code match
      if (teamByCode[tla?.toUpperCase()]) return teamByCode[tla?.toUpperCase()]
      // Try lowercase name match
      return teamByName[name?.toLowerCase()] ?? null
    }

    // Fetch all WC 2026 fixtures
    const data = await fdFetch('/competitions/WC/matches?season=2026')
    const matches: FdMatch[] = data.matches ?? []

    if (!matches.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No matches returned', raw: data }), { status: 200 })
    }

    let inserted = 0
    let updated = 0
    const unmatchedTeams = new Set<string>()

    for (const m of matches) {
      const externalId = String(m.id)
      const apiStage = m.stage ?? m.matchday ? 'Group Stage' : 'Group Stage'
      // football-data.org uses m.stage like "GROUP_STAGE", "ROUND_OF_32" etc
      const stageRaw = m.stage ?? 'GROUP_STAGE'
      let stage = 'group'
      if (stageRaw === 'GROUP_STAGE') stage = 'group'
      else if (stageRaw === 'ROUND_OF_32' || stageRaw === 'LAST_32') stage = 'r32'
      else if (stageRaw === 'ROUND_OF_16' || stageRaw === 'LAST_16') stage = 'r16'
      else if (stageRaw === 'QUARTER_FINALS') stage = 'qf'
      else if (stageRaw === 'SEMI_FINALS') stage = 'sf'
      else if (stageRaw === 'FINAL' || stageRaw === 'THIRD_PLACE') stage = 'final'
      else {
        // Try the round string
        stage = STAGE_MAP[stageRaw] ?? 'group'
      }

      const homeId = resolveTeam(m.homeTeam.name, m.homeTeam.tla)
      const awayId = resolveTeam(m.awayTeam.name, m.awayTeam.tla)

      if (!homeId && m.homeTeam.name) unmatchedTeams.add(`${m.homeTeam.name} (${m.homeTeam.tla})`)
      if (!awayId && m.awayTeam.name) unmatchedTeams.add(`${m.awayTeam.name} (${m.awayTeam.tla})`)

      const matchDate = m.utcDate
      const kickoff = new Date(matchDate)
      const lockTime = stage === 'group'
        ? new Date(kickoff.getTime() - 60 * 60 * 1000).toISOString()
        : kickoff.toISOString()

      const homeScore = m.score?.fullTime?.home ?? null
      const awayScore = m.score?.fullTime?.away ?? null
      const status = m.status === 'FINISHED' || m.status === 'AWARDED'
        ? 'finished'
        : m.status === 'IN_PLAY' || m.status === 'PAUSED'
        ? 'live'
        : 'scheduled'

      const payload = {
        external_id: externalId,
        stage,
        stage_order: m.matchday ?? 0,
        match_date: matchDate,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: homeScore,
        away_score: awayScore,
        status,
        lock_time: lockTime,
        venue: m.venue ?? null,
      }

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
      total: matches.length,
      inserted,
      updated,
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

interface FdMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  matchday: number | null
  venue: string | null
  homeTeam: { id: number; name: string; tla: string }
  awayTeam: { id: number; name: string; tla: string }
  score: {
    winner: string | null
    fullTime: { home: number | null; away: number | null }
  }
}
