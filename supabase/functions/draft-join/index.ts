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

  const { league_id, room_type = 'official' } = await req.json() as { league_id: string; room_type?: 'official' | 'practice' }

  // Verify user is a member of this league
  const { data: membership } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('league_id', league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Not a member of this league' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Find the room for this league and room_type
  const { data: room } = await supabase
    .from('draft_rooms')
    .select('*')
    .eq('league_id', league_id)
    .eq('room_type', room_type)
    .maybeSingle()

  if (!room) {
    return new Response(JSON.stringify({ error: 'Draft room not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (room.status !== 'waiting') {
    return new Response(JSON.stringify({ error: 'Draft already started' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Add user to pick_order if not already in it
  if (!room.pick_order.includes(user.id)) {
    await supabase
      .from('draft_rooms')
      .update({ pick_order: [...room.pick_order, user.id] })
      .eq('id', room.id)
  }

  return new Response(JSON.stringify({ ok: true, room_id: room.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
