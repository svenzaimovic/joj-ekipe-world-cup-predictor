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

  const { room_id, team_id } = await req.json() as { room_id: string; team_id: number }

  const { data: room } = await supabase
    .from('draft_rooms')
    .select('*')
    .eq('id', room_id)
    .eq('status', 'active')
    .single()

  if (!room) return new Response(JSON.stringify({ error: 'Room not found or not active' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const playerCount = room.pick_order.length
  const teamsPerPlayer = Math.floor(48 / playerCount)
  const totalPicks = teamsPerPlayer * playerCount
  const pickIndex = room.current_pick_index

  if (pickIndex >= totalPicks) {
    // Draft complete
    await supabase.from('draft_rooms').update({ status: 'completed' }).eq('id', room_id)
    return new Response(JSON.stringify({ ok: true, draft_complete: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Determine whose turn it is (snake order)
  const snakeRound = Math.floor(pickIndex / playerCount) // 0-based round
  const posInRound = pickIndex % playerCount
  const forward = snakeRound % 2 === 0
  const playerIndex = forward ? posInRound : playerCount - 1 - posInRound
  const expectedUserId = room.pick_order[playerIndex]

  if (expectedUserId !== user.id) {
    return new Response(JSON.stringify({ error: 'Not your turn' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Check team is still available
  const { data: existingPick } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('room_id', room_id)
    .eq('team_id', team_id)
    .maybeSingle()

  if (existingPick) {
    return new Response(JSON.stringify({ error: 'Team already picked' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Insert pick
  await supabase.from('draft_picks').insert({
    room_id,
    user_id: user.id,
    team_id,
    pick_number: pickIndex + 1,
    snake_round: snakeRound + 1,
  })

  const nextPickIndex = pickIndex + 1
  const isDraftComplete = nextPickIndex >= totalPicks

  // Advance pick index or complete draft
  await supabase
    .from('draft_rooms')
    .update({
      current_pick_index: nextPickIndex,
      status: isDraftComplete ? 'completed' : 'active',
    })
    .eq('id', room_id)

  return new Response(JSON.stringify({ ok: true, draft_complete: isDraftComplete }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
