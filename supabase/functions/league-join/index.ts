import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { invite_code } = await req.json() as { invite_code: string }
  if (!invite_code?.trim()) {
    return new Response(JSON.stringify({ error: 'Invite code is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Look up league by invite code using service role (user may not be a member yet)
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .maybeSingle()

  if (!league) {
    return new Response(JSON.stringify({ error: 'Invalid invite code' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return new Response(
      JSON.stringify({ ok: true, league_id: league.id, league_name: league.name, already_member: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  return new Response(
    JSON.stringify({ ok: true, league_id: league.id, league_name: league.name, already_member: false }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
