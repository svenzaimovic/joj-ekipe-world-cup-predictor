-- Add a 'winner' column so knockout matches that go to extra time / penalties
-- can still be scored correctly. The fullTime score alone is ambiguous (1-1 at
-- 90 mins gives no winner), but the API always sets score.winner for FINISHED
-- knockout matches.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS winner text CHECK (winner IN ('home', 'away'));
