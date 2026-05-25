import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Get or create the single draft room
  let { data: room } = await supabase
    .from('draft_rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!room) {
    const { data: newRoom } = await supabase
      .from('draft_rooms')
      .insert({ status: 'waiting', pick_order: [], pick_timer_seconds: 90 })
      .select()
      .single()
    room = newRoom
  }

  if (room.status !== 'waiting') {
    return new Response(JSON.stringify({ error: 'Draft already started' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Add user to pick_order if not already in it
  if (!room.pick_order.includes(user.id)) {
    await supabase
      .from('draft_rooms')
      .update({ pick_order: [...room.pick_order, user.id] })
      .eq('id', room.id)
  }

  return new Response(JSON.stringify({ ok: true, room_id: room.id }), { headers: { 'Content-Type': 'application/json' } })
})
