-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  invite_code  varchar(6) NOT NULL UNIQUE,
  owner_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS leagues_invite_code_idx ON leagues (invite_code);

-- League members
CREATE TABLE IF NOT EXISTS league_members (
  league_id  uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (league_id, user_id)
);

-- Add league context to draft rooms (safe to rerun)
ALTER TABLE draft_rooms
  ADD COLUMN IF NOT EXISTS league_id  uuid REFERENCES leagues(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS room_type  text NOT NULL DEFAULT 'official'
    CHECK (room_type IN ('official', 'practice'));

-- Add league scoping to draft points (nullable until data migration in 007)
ALTER TABLE draft_points
  ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES leagues(id) ON DELETE CASCADE;

-- RLS for new tables
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Leagues: members can see their own leagues; writes via service role only
DROP POLICY IF EXISTS "leagues_select_member" ON leagues;
CREATE POLICY "leagues_select_member" ON leagues
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = leagues.id
        AND lm.user_id = auth.uid()
    )
  );

-- League members: can see peers in shared leagues; writes via service role only
DROP POLICY IF EXISTS "league_members_select" ON league_members;
CREATE POLICY "league_members_select" ON league_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM league_members lm2
      WHERE lm2.league_id = league_members.league_id
        AND lm2.user_id = auth.uid()
    )
  );

-- Update draft_rooms policy: allow legacy rooms (league_id IS NULL) for backward compat
DROP POLICY IF EXISTS "draft_rooms_select_authenticated" ON draft_rooms;
DROP POLICY IF EXISTS "draft_rooms_select_member" ON draft_rooms;
CREATE POLICY "draft_rooms_select_member" ON draft_rooms
  FOR SELECT TO authenticated USING (
    league_id IS NULL
    OR EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = draft_rooms.league_id
        AND lm.user_id = auth.uid()
    )
  );

-- Update draft_picks policy: allow picks from legacy rooms (no league)
DROP POLICY IF EXISTS "draft_picks_select_authenticated" ON draft_picks;
DROP POLICY IF EXISTS "draft_picks_select_member" ON draft_picks;
CREATE POLICY "draft_picks_select_member" ON draft_picks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM draft_rooms dr
      WHERE dr.id = draft_picks.room_id
        AND (
          dr.league_id IS NULL
          OR EXISTS (
            SELECT 1 FROM league_members lm
            WHERE lm.league_id = dr.league_id
              AND lm.user_id = auth.uid()
          )
        )
    )
  );

-- Update draft_points policy: allow legacy points (no league) for backward compat
DROP POLICY IF EXISTS "draft_points_select_authenticated" ON draft_points;
DROP POLICY IF EXISTS "draft_points_select_member" ON draft_points;
CREATE POLICY "draft_points_select_member" ON draft_points
  FOR SELECT TO authenticated USING (
    league_id IS NULL
    OR EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = draft_points.league_id
        AND lm.user_id = auth.uid()
    )
  );

-- League-scoped leaderboard function
CREATE OR REPLACE FUNCTION league_leaderboard(p_league_id uuid)
RETURNS TABLE (
  user_id          uuid,
  username         text,
  predictor_points int,
  draft_points     int,
  total_points     int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    pr.id AS user_id,
    pr.username,
    COALESCE((
      SELECT SUM(pred.points_awarded)
      FROM predictions pred
      WHERE pred.user_id = pr.id
        AND pred.points_awarded IS NOT NULL
    ), 0)::int AS predictor_points,
    COALESCE((
      SELECT SUM(dp.points)
      FROM draft_points dp
      WHERE dp.user_id = pr.id
        AND dp.league_id = p_league_id
    ), 0)::int AS draft_points,
    (
      COALESCE((
        SELECT SUM(pred.points_awarded)
        FROM predictions pred
        WHERE pred.user_id = pr.id
          AND pred.points_awarded IS NOT NULL
      ), 0)
      +
      COALESCE((
        SELECT SUM(dp.points)
        FROM draft_points dp
        WHERE dp.user_id = pr.id
          AND dp.league_id = p_league_id
      ), 0)
    )::int AS total_points
  FROM profiles pr
  WHERE EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = p_league_id
      AND lm.user_id = pr.id
  )
  ORDER BY total_points DESC;
$$;
