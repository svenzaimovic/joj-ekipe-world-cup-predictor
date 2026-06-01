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

  const { league_id } = await req.json() as { league_id: string }

  // Verify the user is a league member
  const { data: membership } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('league_id', league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Not a member of this league' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Find the practice room for this league
  const { data: room } = await supabase
    .from('draft_rooms')
    .select('id')
    .eq('league_id', league_id)
    .eq('room_type', 'practice')
    .maybeSingle()

  if (!room) {
    return new Response(JSON.stringify({ error: 'Practice room not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Delete all picks for this room (room row keeps its ID so realtime subs stay intact)
  await supabase.from('draft_picks').delete().eq('room_id', room.id)

  // Reset room state back to waiting lobby
  await supabase
    .from('draft_rooms')
    .update({
      status: 'waiting',
      pick_order: [],
      current_pick_index: 0,
      started_at: null,
    })
    .eq('id', room.id)

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
