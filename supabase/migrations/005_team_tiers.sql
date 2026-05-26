-- Add tier column to teams (1=Favorites, 2=Contenders, 3=Solid outsiders, 4=Underdogs)
-- Tier determines win point value: T1=3, T2=4, T3=5, T4=7
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tier integer NOT NULL DEFAULT 2;

-- Tier 1 — Favorites (win = 3 pts)
UPDATE teams SET tier = 1 WHERE name IN (
  'Argentina', 'France', 'England', 'Brazil',
  'Spain', 'Portugal', 'Germany', 'Netherlands'
);

-- Tier 2 — Contenders (win = 4 pts)
UPDATE teams SET tier = 2 WHERE name IN (
  'Colombia', 'Morocco', 'Belgium', 'Croatia',
  'Uruguay', 'Japan', 'United States', 'Senegal',
  'Switzerland', 'Norway', 'South Korea', 'Turkey'
);

-- Tier 3 — Solid outsiders (win = 5 pts)
UPDATE teams SET tier = 3 WHERE name IN (
  'Mexico', 'Ecuador', 'Australia', 'Canada',
  'Scotland', 'Sweden', 'Algeria', 'Czech Republic',
  'Bosnia & Herzegovina', 'Austria', 'Ghana', 'Ivory Coast',
  'Egypt', 'Tunisia', 'Paraguay', 'South Africa'
);

-- Tier 4 — Underdogs (win = 7 pts)
UPDATE teams SET tier = 4 WHERE name IN (
  'Panama', 'Qatar', 'Haiti', 'Curaçao',
  'Iraq', 'Jordan', 'Saudi Arabia', 'Cape Verde',
  'New Zealand', 'Uzbekistan', 'DR Congo', 'Iran'
);
