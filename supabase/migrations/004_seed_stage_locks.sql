-- FIFA World Cup 2026 stage lock times (1h before first match of each stage)
-- All times in UTC. Adjust when official schedule is confirmed.
-- Group stage: first match June 11, 2026 ~19:00 UTC → lock at 18:00 UTC
-- Knockout rounds: approximate based on tournament schedule

INSERT INTO stage_locks (stage, locks_at, locked) VALUES
  ('group',  '2026-06-11 18:00:00+00', false),
  ('r32',    '2026-06-28 14:00:00+00', false),
  ('r16',    '2026-07-04 14:00:00+00', false),
  ('qf',     '2026-07-08 14:00:00+00', false),
  ('sf',     '2026-07-13 14:00:00+00', false),
  ('final',  '2026-07-18 14:00:00+00', false);

-- Placeholder knockout matches (team IDs filled in by fetch-results Edge Function)
-- These are created with NULL team IDs and far-future lock times
-- Group stage matches are seeded separately (see seed script or admin panel)
INSERT INTO matches (stage, stage_order, match_date, home_team_id, away_team_id, status, lock_time) VALUES
-- Round of 32 (32 matches)
('r32', 1,  '2026-06-28 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 2,  '2026-06-28 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 3,  '2026-06-28 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 4,  '2026-06-28 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 5,  '2026-06-29 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 6,  '2026-06-29 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 7,  '2026-06-29 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 8,  '2026-06-29 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 9,  '2026-06-30 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 10, '2026-06-30 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 11, '2026-06-30 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 12, '2026-06-30 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 13, '2026-07-01 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 14, '2026-07-01 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 15, '2026-07-01 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 16, '2026-07-01 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 17, '2026-07-02 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 18, '2026-07-02 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 19, '2026-07-02 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 20, '2026-07-02 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 21, '2026-07-03 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 22, '2026-07-03 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 23, '2026-07-03 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 24, '2026-07-03 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 25, '2026-07-04 14:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 26, '2026-07-04 14:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 27, '2026-07-04 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 28, '2026-07-04 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 29, '2026-07-04 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 30, '2026-07-04 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 31, '2026-07-05 17:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),
('r32', 32, '2026-07-05 20:00:00+00', NULL, NULL, 'scheduled', '2026-06-28 14:00:00+00'),

-- Round of 16
('r16', 1, '2026-07-05 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 2, '2026-07-05 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 3, '2026-07-06 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 4, '2026-07-06 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 5, '2026-07-07 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 6, '2026-07-07 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 7, '2026-07-08 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),
('r16', 8, '2026-07-08 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-04 14:00:00+00'),

-- Quarter-Finals
('qf', 1, '2026-07-09 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-08 14:00:00+00'),
('qf', 2, '2026-07-09 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-08 14:00:00+00'),
('qf', 3, '2026-07-10 17:00:00+00', NULL, NULL, 'scheduled', '2026-07-08 14:00:00+00'),
('qf', 4, '2026-07-10 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-08 14:00:00+00'),

-- Semi-Finals
('sf', 1, '2026-07-14 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-13 14:00:00+00'),
('sf', 2, '2026-07-15 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-13 14:00:00+00'),

-- Final
('final', 1, '2026-07-19 20:00:00+00', NULL, NULL, 'scheduled', '2026-07-18 14:00:00+00');
