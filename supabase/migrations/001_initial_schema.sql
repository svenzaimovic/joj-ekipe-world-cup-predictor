-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text NOT NULL UNIQUE,
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Teams
CREATE TABLE teams (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  code        varchar(3) NOT NULL,
  flag_url    text,
  group_name  varchar(1)
);

-- Matches
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

-- Stage locks (convenience table for quick lock-state lookup)
CREATE TABLE stage_locks (
  stage     text PRIMARY KEY CHECK (stage IN ('group','r32','r16','qf','sf','final')),
  locks_at  timestamptz NOT NULL,
  locked    boolean NOT NULL DEFAULT false
);

-- Predictions
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

-- Draft rooms
CREATE TABLE draft_rooms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed')),
  pick_order            uuid[] NOT NULL DEFAULT '{}',
  current_pick_index    int NOT NULL DEFAULT 0,
  pick_timer_seconds    int NOT NULL DEFAULT 90,
  created_at            timestamptz DEFAULT now() NOT NULL,
  started_at            timestamptz
);

-- Draft picks
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

-- Draft points (per match, per team owner)
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

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  pr.id AS user_id,
  pr.username,
  COALESCE(SUM(DISTINCT p.points_awarded) FILTER (WHERE p.points_awarded IS NOT NULL), 0)::int AS predictor_points,
  COALESCE((SELECT SUM(dp.points) FROM draft_points dp WHERE dp.user_id = pr.id), 0)::int AS draft_points,
  (
    COALESCE(SUM(DISTINCT p.points_awarded) FILTER (WHERE p.points_awarded IS NOT NULL), 0) +
    COALESCE((SELECT SUM(dp.points) FROM draft_points dp WHERE dp.user_id = pr.id), 0)
  )::int AS total_points
FROM profiles pr
LEFT JOIN predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.username
ORDER BY total_points DESC;

-- Auto-create profile on signup
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

-- Update updated_at on predictions
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
