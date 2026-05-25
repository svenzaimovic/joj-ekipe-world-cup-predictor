-- ============================================================
-- World Cup 2026 Predictor & Draft — Full Database Setup
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 001: Schema ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text NOT NULL UNIQUE,
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE teams (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  code        varchar(3) NOT NULL,
  flag_url    text,
  group_name  varchar(1)
);

CREATE TABLE matches (
  id              serial PRIMARY KEY,
  stage           text NOT NULL CHECK (stage IN ('group','r32','r16','qf','sf','final')),
  stage_order     int NOT NULL DEFAULT 0,
  match_date      timestamptz NOT NULL,
  home_team_id    int REFERENCES teams(id),
  away_team_id    int REFERENCES teams(id),
  home_score      int,
  away_score      int,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished')),
  external_id     text UNIQUE,
  venue           text,
  lock_time       timestamptz NOT NULL
);

CREATE TABLE stage_locks (
  stage     text PRIMARY KEY CHECK (stage IN ('group','r32','r16','qf','sf','final')),
  locks_at  timestamptz NOT NULL,
  locked    boolean NOT NULL DEFAULT false
);

CREATE TABLE predictions (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id          int NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score_pred   int NOT NULL,
  away_score_pred   int NOT NULL,
  points_awarded    int,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, match_id)
);

CREATE TABLE draft_rooms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed')),
  pick_order            uuid[] NOT NULL DEFAULT '{}',
  current_pick_index    int NOT NULL DEFAULT 0,
  pick_timer_seconds    int NOT NULL DEFAULT 90,
  created_at            timestamptz DEFAULT now() NOT NULL,
  started_at            timestamptz
);

CREATE TABLE draft_picks (
  id            bigserial PRIMARY KEY,
  room_id       uuid NOT NULL REFERENCES draft_rooms(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id       int NOT NULL REFERENCES teams(id),
  pick_number   int NOT NULL,
  snake_round   int NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (room_id, team_id),
  UNIQUE (room_id, pick_number)
);

CREATE TABLE draft_points (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id     int NOT NULL REFERENCES teams(id),
  match_id    int REFERENCES matches(id),
  points      int NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, team_id, match_id, reason)
);

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  pr.id AS user_id,
  pr.username,
  COALESCE((SELECT SUM(p.points_awarded) FROM predictions p WHERE p.user_id = pr.id AND p.points_awarded IS NOT NULL), 0)::int AS predictor_points,
  COALESCE((SELECT SUM(dp.points) FROM draft_points dp WHERE dp.user_id = pr.id), 0)::int AS draft_points,
  (
    COALESCE((SELECT SUM(p.points_awarded) FROM predictions p WHERE p.user_id = pr.id AND p.points_awarded IS NOT NULL), 0) +
    COALESCE((SELECT SUM(dp.points) FROM draft_points dp WHERE dp.user_id = pr.id), 0)
  )::int AS total_points
FROM profiles pr
ORDER BY total_points DESC;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 002: RLS Policies ─────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "teams_select" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "stage_locks_select" ON stage_locks FOR SELECT TO authenticated USING (true);

CREATE POLICY "predictions_select_own" ON predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "predictions_select_others_after_lock" ON predictions
  FOR SELECT TO authenticated USING (
    auth.uid() != user_id
    AND EXISTS (SELECT 1 FROM matches m WHERE m.id = predictions.match_id AND m.lock_time <= now())
  );
CREATE POLICY "predictions_insert_before_lock" ON predictions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM matches m WHERE m.id = match_id AND m.lock_time > now())
  );
CREATE POLICY "predictions_update_before_lock" ON predictions
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM matches m WHERE m.id = predictions.match_id AND m.lock_time > now())
  );

CREATE POLICY "draft_rooms_select" ON draft_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "draft_picks_select" ON draft_picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "draft_points_select" ON draft_points FOR SELECT TO authenticated USING (true);

-- ── 003: Seed Teams (48 WC2026 teams) ────────────────────────

INSERT INTO teams (name, code, group_name, flag_url) VALUES
('United States', 'USA', 'A', 'https://flagcdn.com/w80/us.png'),
('Panama', 'PAN', 'A', 'https://flagcdn.com/w80/pa.png'),
('Honduras', 'HON', 'A', 'https://flagcdn.com/w80/hn.png'),
('Morocco', 'MAR', 'A', 'https://flagcdn.com/w80/ma.png'),
('Mexico', 'MEX', 'B', 'https://flagcdn.com/w80/mx.png'),
('Jamaica', 'JAM', 'B', 'https://flagcdn.com/w80/jm.png'),
('Venezuela', 'VEN', 'B', 'https://flagcdn.com/w80/ve.png'),
('Cameroon', 'CMR', 'B', 'https://flagcdn.com/w80/cm.png'),
('Canada', 'CAN', 'C', 'https://flagcdn.com/w80/ca.png'),
('Uruguay', 'URU', 'C', 'https://flagcdn.com/w80/uy.png'),
('Algeria', 'ALG', 'C', 'https://flagcdn.com/w80/dz.png'),
('Portugal', 'POR', 'C', 'https://flagcdn.com/w80/pt.png'),
('Argentina', 'ARG', 'D', 'https://flagcdn.com/w80/ar.png'),
('Chile', 'CHI', 'D', 'https://flagcdn.com/w80/cl.png'),
('Australia', 'AUS', 'D', 'https://flagcdn.com/w80/au.png'),
('Saudi Arabia', 'KSA', 'D', 'https://flagcdn.com/w80/sa.png'),
('Spain', 'ESP', 'E', 'https://flagcdn.com/w80/es.png'),
('Brazil', 'BRA', 'E', 'https://flagcdn.com/w80/br.png'),
('Nigeria', 'NGA', 'E', 'https://flagcdn.com/w80/ng.png'),
('Czechia', 'CZE', 'E', 'https://flagcdn.com/w80/cz.png'),
('Germany', 'GER', 'F', 'https://flagcdn.com/w80/de.png'),
('Japan', 'JPN', 'F', 'https://flagcdn.com/w80/jp.png'),
('Senegal', 'SEN', 'F', 'https://flagcdn.com/w80/sn.png'),
('Serbia', 'SRB', 'F', 'https://flagcdn.com/w80/rs.png'),
('France', 'FRA', 'G', 'https://flagcdn.com/w80/fr.png'),
('South Korea', 'KOR', 'G', 'https://flagcdn.com/w80/kr.png'),
('Poland', 'POL', 'G', 'https://flagcdn.com/w80/pl.png'),
('Egypt', 'EGY', 'G', 'https://flagcdn.com/w80/eg.png'),
('England', 'ENG', 'H', 'https://flagcdn.com/w80/gb-eng.png'),
('Netherlands', 'NED', 'H', 'https://flagcdn.com/w80/nl.png'),
('Colombia', 'COL', 'H', 'https://flagcdn.com/w80/co.png'),
('Sudan', 'SDN', 'H', 'https://flagcdn.com/w80/sd.png'),
('Italy', 'ITA', 'I', 'https://flagcdn.com/w80/it.png'),
('Ecuador', 'ECU', 'I', 'https://flagcdn.com/w80/ec.png'),
('Ivory Coast', 'CIV', 'I', 'https://flagcdn.com/w80/ci.png'),
('Ukraine', 'UKR', 'I', 'https://flagcdn.com/w80/ua.png'),
('Belgium', 'BEL', 'J', 'https://flagcdn.com/w80/be.png'),
('Costa Rica', 'CRC', 'J', 'https://flagcdn.com/w80/cr.png'),
('Tunisia', 'TUN', 'J', 'https://flagcdn.com/w80/tn.png'),
('New Zealand', 'NZL', 'J', 'https://flagcdn.com/w80/nz.png'),
('Croatia', 'CRO', 'K', 'https://flagcdn.com/w80/hr.png'),
('Paraguay', 'PAR', 'K', 'https://flagcdn.com/w80/py.png'),
('South Africa', 'RSA', 'K', 'https://flagcdn.com/w80/za.png'),
('Romania', 'ROU', 'K', 'https://flagcdn.com/w80/ro.png'),
('Switzerland', 'SUI', 'L', 'https://flagcdn.com/w80/ch.png'),
('Bolivia', 'BOL', 'L', 'https://flagcdn.com/w80/bo.png'),
('Ghana', 'GHA', 'L', 'https://flagcdn.com/w80/gh.png'),
('IR Iran', 'IRN', 'L', 'https://flagcdn.com/w80/ir.png');

-- ── 004: Stage Locks + Knockout Placeholders ─────────────────

INSERT INTO stage_locks (stage, locks_at, locked) VALUES
  ('group',  '2026-06-11 18:00:00+00', false),
  ('r32',    '2026-06-28 14:00:00+00', false),
  ('r16',    '2026-07-04 14:00:00+00', false),
  ('qf',     '2026-07-08 14:00:00+00', false),
  ('sf',     '2026-07-13 14:00:00+00', false),
  ('final',  '2026-07-18 14:00:00+00', false);

-- Knockout placeholders (teams filled in by fetch-results after each round)
INSERT INTO matches (stage, stage_order, match_date, status, lock_time) VALUES
('r32',   1,  '2026-06-28 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   2,  '2026-06-28 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   3,  '2026-06-28 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   4,  '2026-06-28 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   5,  '2026-06-29 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   6,  '2026-06-29 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   7,  '2026-06-29 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   8,  '2026-06-29 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',   9,  '2026-06-30 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  10,  '2026-06-30 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  11,  '2026-06-30 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  12,  '2026-06-30 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  13,  '2026-07-01 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  14,  '2026-07-01 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  15,  '2026-07-01 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  16,  '2026-07-01 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  17,  '2026-07-02 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  18,  '2026-07-02 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  19,  '2026-07-02 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  20,  '2026-07-02 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  21,  '2026-07-03 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  22,  '2026-07-03 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  23,  '2026-07-03 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  24,  '2026-07-03 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  25,  '2026-07-04 14:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  26,  '2026-07-04 14:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  27,  '2026-07-04 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  28,  '2026-07-04 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  29,  '2026-07-04 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  30,  '2026-07-04 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  31,  '2026-07-05 17:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r32',  32,  '2026-07-05 20:00:00+00', 'scheduled', '2026-06-28 14:00:00+00'),
('r16',   1,  '2026-07-05 17:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   2,  '2026-07-05 20:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   3,  '2026-07-06 17:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   4,  '2026-07-06 20:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   5,  '2026-07-07 17:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   6,  '2026-07-07 20:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   7,  '2026-07-08 17:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('r16',   8,  '2026-07-08 20:00:00+00', 'scheduled', '2026-07-04 14:00:00+00'),
('qf',    1,  '2026-07-09 17:00:00+00', 'scheduled', '2026-07-08 14:00:00+00'),
('qf',    2,  '2026-07-09 20:00:00+00', 'scheduled', '2026-07-08 14:00:00+00'),
('qf',    3,  '2026-07-10 17:00:00+00', 'scheduled', '2026-07-08 14:00:00+00'),
('qf',    4,  '2026-07-10 20:00:00+00', 'scheduled', '2026-07-08 14:00:00+00'),
('sf',    1,  '2026-07-14 20:00:00+00', 'scheduled', '2026-07-13 14:00:00+00'),
('sf',    2,  '2026-07-15 20:00:00+00', 'scheduled', '2026-07-13 14:00:00+00'),
('final', 1,  '2026-07-19 20:00:00+00', 'scheduled', '2026-07-18 14:00:00+00');
