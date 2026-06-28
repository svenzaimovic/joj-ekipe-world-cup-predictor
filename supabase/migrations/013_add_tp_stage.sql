-- Add 'tp' (third-place playoff) as a valid stage value.
-- The initial schema only had group/r32/r16/qf/sf/final; the 3rd-place
-- match needs its own stage so it doesn't affect group-stage logic.
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_stage_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_stage_check
    CHECK (stage IN ('group','r32','r16','qf','sf','tp','final'));
