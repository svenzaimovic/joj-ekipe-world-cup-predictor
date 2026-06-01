import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { name } = await req.json() as { name: string }
  if (!name?.trim()) {
    return new Response(JSON.stringify({ error: 'League name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Generate unique invite code with up to 5 retries
  let inviteCode = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode()
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', candidate)
      .maybeSingle()
    if (!existing) {
      inviteCode = candidate
      break
    }
  }
  if (!inviteCode) {
    return new Response(JSON.stringify({ error: 'Failed to generate invite code, try again' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Create league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), invite_code: inviteCode, owner_id: user.id })
    .select('id')
    .single()

  if (leagueError || !league) {
    return new Response(JSON.stringify({ error: 'Failed to create league' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Add creator as member
  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  // Create official and practice draft rooms
  await supabase.from('draft_rooms').insert([
    { league_id: league.id, room_type: 'official', status: 'waiting', pick_order: [], pick_timer_seconds: 90 },
    { league_id: league.id, room_type: 'practice', status: 'waiting', pick_order: [], pick_timer_seconds: 90 },
  ])

  return new Response(
    JSON.stringify({ ok: true, league_id: league.id, invite_code: inviteCode }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
