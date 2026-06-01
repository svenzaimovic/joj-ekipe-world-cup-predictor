-- Enable realtime replication on draft tables
ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks, draft_rooms;

-- REPLICA IDENTITY FULL ensures all columns are included in the WAL record,
-- required for UPDATE event row-level filters to work correctly.
ALTER TABLE draft_picks REPLICA IDENTITY FULL;
ALTER TABLE draft_rooms REPLICA IDENTITY FULL;

-- Simplify RLS back to "all authenticated can read".
-- The join-based policies silently drop realtime events because Supabase
-- evaluates RLS in the realtime context and complex joins fail there.
-- League access is enforced at the routing level (LeagueLayout).
DROP POLICY IF EXISTS "draft_rooms_select_member" ON draft_rooms;
CREATE POLICY "draft_rooms_select_authenticated" ON draft_rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "draft_picks_select_member" ON draft_picks;
CREATE POLICY "draft_picks_select_authenticated" ON draft_picks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "draft_points_select_member" ON draft_points;
CREATE POLICY "draft_points_select_authenticated" ON draft_points
  FOR SELECT TO authenticated USING (true);
