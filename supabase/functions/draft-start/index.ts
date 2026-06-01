import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { room_id } = await req.json() as { room_id: string }

  const { data: room } = await supabase
    .from('draft_rooms')
    .select('*')
    .eq('id', room_id)
    .eq('status', 'waiting')
    .maybeSingle()

  if (!room) {
    return new Response(JSON.stringify({ error: 'No waiting draft room found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (room.pick_order.length < 2) {
    return new Response(JSON.stringify({ error: 'Need at least 2 players to start' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const shuffledOrder = shuffle(room.pick_order)

  const now = new Date().toISOString()
  await supabase
    .from('draft_rooms')
    .update({
      status: 'active',
      pick_order: shuffledOrder,
      current_pick_index: 0,
      started_at: now,
      current_pick_started_at: now,
    })
    .eq('id', room.id)

  return new Response(JSON.stringify({ ok: true, pick_order: shuffledOrder }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
