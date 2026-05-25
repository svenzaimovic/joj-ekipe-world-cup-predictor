-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_points ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Teams (public read, no user writes)
CREATE POLICY "teams_select_authenticated" ON teams
  FOR SELECT TO authenticated USING (true);

-- Matches (public read, no user writes)
CREATE POLICY "matches_select_authenticated" ON matches
  FOR SELECT TO authenticated USING (true);

-- Stage locks (public read)
CREATE POLICY "stage_locks_select_authenticated" ON stage_locks
  FOR SELECT TO authenticated USING (true);

-- Predictions
-- Own predictions always readable
CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Others' predictions only visible after stage lock_time has passed
CREATE POLICY "predictions_select_others_after_lock" ON predictions
  FOR SELECT TO authenticated USING (
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
        AND m.lock_time <= now()
    )
  );

-- Insert own predictions only before lock
CREATE POLICY "predictions_insert_own_before_lock" ON predictions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.lock_time > now()
    )
  );

-- Update own predictions only before lock
CREATE POLICY "predictions_update_own_before_lock" ON predictions
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
        AND m.lock_time > now()
    )
  );

-- Draft rooms (read all authenticated, writes via service role only)
CREATE POLICY "draft_rooms_select_authenticated" ON draft_rooms
  FOR SELECT TO authenticated USING (true);

-- Draft picks (read all, writes via service role)
CREATE POLICY "draft_picks_select_authenticated" ON draft_picks
  FOR SELECT TO authenticated USING (true);

-- Draft points (read all, writes via service role)
CREATE POLICY "draft_points_select_authenticated" ON draft_points
  FOR SELECT TO authenticated USING (true);
