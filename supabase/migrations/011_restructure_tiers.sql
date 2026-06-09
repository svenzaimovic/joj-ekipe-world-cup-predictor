-- Restructure team tiers per updated classification
-- T1: 8 elite teams (user-specified)
-- T2: 14 strong contenders
-- T3: 13 solid outsiders
-- T4: 1 weakest team per group (12 teams total, one per group A-L)

-- Reset everything to tier 3 as baseline
UPDATE teams SET tier = 3;

-- Tier 1 — Elite (win = 3 pts)
UPDATE teams SET tier = 1 WHERE name IN (
  'Brazil', 'Argentina', 'England', 'Germany',
  'Spain', 'France', 'Portugal', 'Uruguay'
);

-- Tier 2 — Strong contenders (win = 4 pts)
UPDATE teams SET tier = 2 WHERE name IN (
  'Netherlands', 'Belgium', 'Croatia', 'Italy',
  'United States', 'Morocco', 'Japan', 'Colombia',
  'Mexico', 'Senegal', 'South Korea', 'Ecuador',
  'Canada', 'Switzerland'
);

-- Tier 4 — Weakest per group (win = 7 pts)
-- Group A: Honduras, B: Jamaica, C: Algeria, D: Saudi Arabia,
-- E: Czechia, F: Serbia, G: Egypt, H: Sudan,
-- I: Ukraine, J: New Zealand, K: South Africa, L: Bolivia
UPDATE teams SET tier = 4 WHERE name IN (
  'Honduras', 'Jamaica', 'Algeria', 'Saudi Arabia',
  'Czechia', 'Serbia', 'Egypt', 'Sudan',
  'Ukraine', 'New Zealand', 'South Africa', 'Bolivia'
);
