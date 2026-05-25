import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: room } = await supabase
    .from('draft_rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!room) {
    return new Response(JSON.stringify({ error: 'No waiting draft room found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  if (room.pick_order.length < 2) {
    return new Response(JSON.stringify({ error: 'Need at least 2 players to start' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Shuffle draft order
  const shuffledOrder = shuffle(room.pick_order)

  await supabase
    .from('draft_rooms')
    .update({
      status: 'active',
      pick_order: shuffledOrder,
      current_pick_index: 0,
      started_at: new Date().toISOString(),
    })
    .eq('id', room.id)

  return new Response(JSON.stringify({ ok: true, pick_order: shuffledOrder }), { headers: { 'Content-Type': 'application/json' } })
})
