-- Track when the current pick slot started so clients can sync the timer after a refresh.
ALTER TABLE draft_rooms ADD COLUMN IF NOT EXISTS current_pick_started_at timestamptz;
