-- Migrate existing data into a default "Main League"
-- Run this after 006_leagues.sql has been applied and all existing users are present.

DO $$
DECLARE
  v_owner_id   uuid;
  v_league_id  uuid;
  v_room_id    uuid;
BEGIN
  -- Pick any existing user as owner (or skip if no users exist)
  SELECT id INTO v_owner_id FROM profiles ORDER BY created_at LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No profiles found; skipping league migration.';
    RETURN;
  END IF;

  -- Create the default league
  INSERT INTO leagues (name, invite_code, owner_id)
  VALUES ('Main League', 'MAIN01', v_owner_id)
  RETURNING id INTO v_league_id;

  -- Add all existing users as members
  INSERT INTO league_members (league_id, user_id)
  SELECT v_league_id, id FROM profiles
  ON CONFLICT DO NOTHING;

  -- Assign existing draft rooms to this league as official rooms
  UPDATE draft_rooms
  SET league_id = v_league_id, room_type = 'official'
  WHERE league_id IS NULL;

  -- Create a practice room for the main league
  INSERT INTO draft_rooms (league_id, room_type, status, pick_order, pick_timer_seconds)
  VALUES (v_league_id, 'practice', 'waiting', '{}', 90);

  -- Backfill league_id on all existing draft points
  UPDATE draft_points
  SET league_id = v_league_id
  WHERE league_id IS NULL;

  RAISE NOTICE 'Main League created: % (invite code: MAIN01)', v_league_id;
END;
$$;

-- Tighten draft_points unique constraint to include league_id
-- First drop the old constraint, then add the new one
ALTER TABLE draft_points
  DROP CONSTRAINT IF EXISTS draft_points_user_id_team_id_match_id_reason_key;

ALTER TABLE draft_points
  ADD CONSTRAINT draft_points_unique_per_league
    UNIQUE (user_id, team_id, match_id, reason, league_id);
