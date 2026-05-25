-- ============================================================
-- WC2026 Group Stage Seed — Run in Supabase SQL Editor
-- Clears old projected teams, inserts official draw teams,
-- then inserts all 72 group stage fixtures.
-- All times in UTC.
-- ============================================================

-- 1. Clear existing teams and group stage matches
--    (knockout placeholders have NULL team IDs so cascade is safe)
TRUNCATE teams CASCADE;

-- 2. Insert official draw teams (flagcdn.com flags)
INSERT INTO teams (name, code, group_name, flag_url) VALUES
-- Group A
('Mexico',        'MEX', 'A', 'https://flagcdn.com/w80/mx.png'),
('South Africa',  'RSA', 'A', 'https://flagcdn.com/w80/za.png'),
('South Korea',   'KOR', 'A', 'https://flagcdn.com/w80/kr.png'),
('Czech Republic','CZE', 'A', 'https://flagcdn.com/w80/cz.png'),
-- Group B
('Canada',              'CAN', 'B', 'https://flagcdn.com/w80/ca.png'),
('Bosnia & Herzegovina','BIH', 'B', 'https://flagcdn.com/w80/ba.png'),
('Qatar',               'QAT', 'B', 'https://flagcdn.com/w80/qa.png'),
('Switzerland',         'SUI', 'B', 'https://flagcdn.com/w80/ch.png'),
-- Group C
('Brazil',   'BRA', 'C', 'https://flagcdn.com/w80/br.png'),
('Morocco',  'MAR', 'C', 'https://flagcdn.com/w80/ma.png'),
('Haiti',    'HAI', 'C', 'https://flagcdn.com/w80/ht.png'),
('Scotland', 'SCO', 'C', 'https://flagcdn.com/w80/gb-sct.png'),
-- Group D
('United States', 'USA', 'D', 'https://flagcdn.com/w80/us.png'),
('Paraguay',      'PAR', 'D', 'https://flagcdn.com/w80/py.png'),
('Australia',     'AUS', 'D', 'https://flagcdn.com/w80/au.png'),
('Turkey',        'TUR', 'D', 'https://flagcdn.com/w80/tr.png'),
-- Group E
('Germany',      'GER', 'E', 'https://flagcdn.com/w80/de.png'),
('Ecuador',      'ECU', 'E', 'https://flagcdn.com/w80/ec.png'),
('Ivory Coast',  'CIV', 'E', 'https://flagcdn.com/w80/ci.png'),
('Curaçao',      'CUW', 'E', 'https://flagcdn.com/w80/cw.png'),
-- Group F
('Netherlands', 'NED', 'F', 'https://flagcdn.com/w80/nl.png'),
('Japan',       'JPN', 'F', 'https://flagcdn.com/w80/jp.png'),
('Sweden',      'SWE', 'F', 'https://flagcdn.com/w80/se.png'),
('Tunisia',     'TUN', 'F', 'https://flagcdn.com/w80/tn.png'),
-- Group G
('Belgium',     'BEL', 'G', 'https://flagcdn.com/w80/be.png'),
('Egypt',       'EGY', 'G', 'https://flagcdn.com/w80/eg.png'),
('Iran',        'IRN', 'G', 'https://flagcdn.com/w80/ir.png'),
('New Zealand', 'NZL', 'G', 'https://flagcdn.com/w80/nz.png'),
-- Group H
('Spain',       'ESP', 'H', 'https://flagcdn.com/w80/es.png'),
('Cape Verde',  'CPV', 'H', 'https://flagcdn.com/w80/cv.png'),
('Saudi Arabia','KSA', 'H', 'https://flagcdn.com/w80/sa.png'),
('Uruguay',     'URU', 'H', 'https://flagcdn.com/w80/uy.png'),
-- Group I
('France',   'FRA', 'I', 'https://flagcdn.com/w80/fr.png'),
('Senegal',  'SEN', 'I', 'https://flagcdn.com/w80/sn.png'),
('Iraq',     'IRQ', 'I', 'https://flagcdn.com/w80/iq.png'),
('Norway',   'NOR', 'I', 'https://flagcdn.com/w80/no.png'),
-- Group J
('Argentina', 'ARG', 'J', 'https://flagcdn.com/w80/ar.png'),
('Algeria',   'ALG', 'J', 'https://flagcdn.com/w80/dz.png'),
('Austria',   'AUT', 'J', 'https://flagcdn.com/w80/at.png'),
('Jordan',    'JOR', 'J', 'https://flagcdn.com/w80/jo.png'),
-- Group K
('Portugal',  'POR', 'K', 'https://flagcdn.com/w80/pt.png'),
('DR Congo',  'COD', 'K', 'https://flagcdn.com/w80/cd.png'),
('Uzbekistan','UZB', 'K', 'https://flagcdn.com/w80/uz.png'),
('Colombia',  'COL', 'K', 'https://flagcdn.com/w80/co.png'),
-- Group L
('England', 'ENG', 'L', 'https://flagcdn.com/w80/gb-eng.png'),
('Croatia', 'CRO', 'L', 'https://flagcdn.com/w80/hr.png'),
('Ghana',   'GHA', 'L', 'https://flagcdn.com/w80/gh.png'),
('Panama',  'PAN', 'L', 'https://flagcdn.com/w80/pa.png');

-- 3. Insert all 72 group stage fixtures
--    lock_time = 2026-06-11 18:00 UTC (1h before opening match) for ALL group stage

-- Helper: look up team ID by code
-- We use a DO block to insert matches referencing team IDs by code

DO $$
DECLARE
  lock timestamptz := '2026-06-11 18:00:00+00';

  -- Group A
  mex int := (SELECT id FROM teams WHERE code='MEX');
  rsa int := (SELECT id FROM teams WHERE code='RSA');
  kor int := (SELECT id FROM teams WHERE code='KOR');
  cze int := (SELECT id FROM teams WHERE code='CZE');

  -- Group B
  can int := (SELECT id FROM teams WHERE code='CAN');
  bih int := (SELECT id FROM teams WHERE code='BIH');
  qat int := (SELECT id FROM teams WHERE code='QAT');
  sui int := (SELECT id FROM teams WHERE code='SUI');

  -- Group C
  bra int := (SELECT id FROM teams WHERE code='BRA');
  mar int := (SELECT id FROM teams WHERE code='MAR');
  hai int := (SELECT id FROM teams WHERE code='HAI');
  sco int := (SELECT id FROM teams WHERE code='SCO');

  -- Group D
  usa int := (SELECT id FROM teams WHERE code='USA');
  par int := (SELECT id FROM teams WHERE code='PAR');
  aus int := (SELECT id FROM teams WHERE code='AUS');
  tur int := (SELECT id FROM teams WHERE code='TUR');

  -- Group E
  ger int := (SELECT id FROM teams WHERE code='GER');
  ecu int := (SELECT id FROM teams WHERE code='ECU');
  civ int := (SELECT id FROM teams WHERE code='CIV');
  cuw int := (SELECT id FROM teams WHERE code='CUW');

  -- Group F
  ned int := (SELECT id FROM teams WHERE code='NED');
  jpn int := (SELECT id FROM teams WHERE code='JPN');
  swe int := (SELECT id FROM teams WHERE code='SWE');
  tun int := (SELECT id FROM teams WHERE code='TUN');

  -- Group G
  bel int := (SELECT id FROM teams WHERE code='BEL');
  egy int := (SELECT id FROM teams WHERE code='EGY');
  irn int := (SELECT id FROM teams WHERE code='IRN');
  nzl int := (SELECT id FROM teams WHERE code='NZL');

  -- Group H
  esp int := (SELECT id FROM teams WHERE code='ESP');
  cpv int := (SELECT id FROM teams WHERE code='CPV');
  ksa int := (SELECT id FROM teams WHERE code='KSA');
  uru int := (SELECT id FROM teams WHERE code='URU');

  -- Group I
  fra int := (SELECT id FROM teams WHERE code='FRA');
  sen int := (SELECT id FROM teams WHERE code='SEN');
  irq int := (SELECT id FROM teams WHERE code='IRQ');
  nor int := (SELECT id FROM teams WHERE code='NOR');

  -- Group J
  arg int := (SELECT id FROM teams WHERE code='ARG');
  alg int := (SELECT id FROM teams WHERE code='ALG');
  aut int := (SELECT id FROM teams WHERE code='AUT');
  jor int := (SELECT id FROM teams WHERE code='JOR');

  -- Group K
  por int := (SELECT id FROM teams WHERE code='POR');
  cod int := (SELECT id FROM teams WHERE code='COD');
  uzb int := (SELECT id FROM teams WHERE code='UZB');
  col int := (SELECT id FROM teams WHERE code='COL');

  -- Group L
  eng int := (SELECT id FROM teams WHERE code='ENG');
  cro int := (SELECT id FROM teams WHERE code='CRO');
  gha int := (SELECT id FROM teams WHERE code='GHA');
  pan int := (SELECT id FROM teams WHERE code='PAN');

BEGIN
  INSERT INTO matches (stage, stage_order, match_date, home_team_id, away_team_id, status, lock_time, venue) VALUES

  -- ── GROUP A ──────────────────────────────────────────────────
  ('group',  1, '2026-06-11 19:00:00+00', mex, rsa, 'scheduled', lock, 'Estadio Azteca, Mexico City'),
  ('group',  2, '2026-06-12 02:00:00+00', kor, cze, 'scheduled', lock, 'Estadio Akron, Guadalajara'),
  ('group',  3, '2026-06-18 16:00:00+00', cze, rsa, 'scheduled', lock, 'Mercedes-Benz Stadium, Atlanta'),
  ('group',  4, '2026-06-19 01:00:00+00', mex, kor, 'scheduled', lock, 'Estadio Akron, Guadalajara'),
  ('group',  5, '2026-06-25 01:00:00+00', cze, mex, 'scheduled', lock, 'Estadio Azteca, Mexico City'),
  ('group',  6, '2026-06-25 01:00:00+00', rsa, kor, 'scheduled', lock, 'Estadio BBVA, Monterrey'),

  -- ── GROUP B ──────────────────────────────────────────────────
  ('group',  7, '2026-06-12 19:00:00+00', can, bih, 'scheduled', lock, 'BMO Field, Toronto'),
  ('group',  8, '2026-06-13 19:00:00+00', qat, sui, 'scheduled', lock, 'Levi''s Stadium, Santa Clara'),
  ('group',  9, '2026-06-18 19:00:00+00', sui, bih, 'scheduled', lock, 'SoFi Stadium, Los Angeles'),
  ('group', 10, '2026-06-18 22:00:00+00', can, qat, 'scheduled', lock, 'BC Place, Vancouver'),
  ('group', 11, '2026-06-24 19:00:00+00', sui, can, 'scheduled', lock, 'BC Place, Vancouver'),
  ('group', 12, '2026-06-24 19:00:00+00', bih, qat, 'scheduled', lock, 'Lumen Field, Seattle'),

  -- ── GROUP C ──────────────────────────────────────────────────
  ('group', 13, '2026-06-13 22:00:00+00', bra, mar, 'scheduled', lock, 'MetLife Stadium, New York/New Jersey'),
  ('group', 14, '2026-06-14 01:00:00+00', hai, sco, 'scheduled', lock, 'Gillette Stadium, Boston'),
  ('group', 15, '2026-06-19 22:00:00+00', sco, mar, 'scheduled', lock, 'Gillette Stadium, Boston'),
  ('group', 16, '2026-06-20 00:30:00+00', bra, hai, 'scheduled', lock, 'Lincoln Financial Field, Philadelphia'),
  ('group', 17, '2026-06-24 22:00:00+00', sco, bra, 'scheduled', lock, 'Hard Rock Stadium, Miami'),
  ('group', 18, '2026-06-24 22:00:00+00', mar, hai, 'scheduled', lock, 'Mercedes-Benz Stadium, Atlanta'),

  -- ── GROUP D ──────────────────────────────────────────────────
  ('group', 19, '2026-06-13 01:00:00+00', usa, par, 'scheduled', lock, 'SoFi Stadium, Los Angeles'),
  ('group', 20, '2026-06-14 04:00:00+00', aus, tur, 'scheduled', lock, 'BC Place, Vancouver'),
  ('group', 21, '2026-06-19 19:00:00+00', usa, aus, 'scheduled', lock, 'Lumen Field, Seattle'),
  ('group', 22, '2026-06-20 03:00:00+00', tur, par, 'scheduled', lock, 'Levi''s Stadium, Santa Clara'),
  ('group', 23, '2026-06-26 02:00:00+00', tur, usa, 'scheduled', lock, 'SoFi Stadium, Los Angeles'),
  ('group', 24, '2026-06-26 02:00:00+00', par, aus, 'scheduled', lock, 'Levi''s Stadium, Santa Clara'),

  -- ── GROUP E ──────────────────────────────────────────────────
  ('group', 25, '2026-06-14 17:00:00+00', ger, cuw, 'scheduled', lock, 'NRG Stadium, Houston'),
  ('group', 26, '2026-06-14 23:00:00+00', civ, ecu, 'scheduled', lock, 'Lincoln Financial Field, Philadelphia'),
  ('group', 27, '2026-06-20 20:00:00+00', ger, civ, 'scheduled', lock, 'BMO Field, Toronto'),
  ('group', 28, '2026-06-21 00:00:00+00', ecu, cuw, 'scheduled', lock, 'Arrowhead Stadium, Kansas City'),
  ('group', 29, '2026-06-25 20:00:00+00', cuw, civ, 'scheduled', lock, 'Lincoln Financial Field, Philadelphia'),
  ('group', 30, '2026-06-25 20:00:00+00', ecu, ger, 'scheduled', lock, 'MetLife Stadium, New York/New Jersey'),

  -- ── GROUP F ──────────────────────────────────────────────────
  ('group', 31, '2026-06-14 20:00:00+00', ned, jpn, 'scheduled', lock, 'AT&T Stadium, Dallas'),
  ('group', 32, '2026-06-15 02:00:00+00', swe, tun, 'scheduled', lock, 'Estadio BBVA, Monterrey'),
  ('group', 33, '2026-06-20 17:00:00+00', ned, swe, 'scheduled', lock, 'NRG Stadium, Houston'),
  ('group', 34, '2026-06-21 04:00:00+00', tun, jpn, 'scheduled', lock, 'Estadio BBVA, Monterrey'),
  ('group', 35, '2026-06-25 23:00:00+00', jpn, swe, 'scheduled', lock, 'AT&T Stadium, Dallas'),
  ('group', 36, '2026-06-25 23:00:00+00', tun, ned, 'scheduled', lock, 'Arrowhead Stadium, Kansas City'),

  -- ── GROUP G ──────────────────────────────────────────────────
  ('group', 37, '2026-06-15 19:00:00+00', bel, egy, 'scheduled', lock, 'Lumen Field, Seattle'),
  ('group', 38, '2026-06-16 01:00:00+00', irn, nzl, 'scheduled', lock, 'SoFi Stadium, Los Angeles'),
  ('group', 39, '2026-06-21 19:00:00+00', bel, irn, 'scheduled', lock, 'SoFi Stadium, Los Angeles'),
  ('group', 40, '2026-06-22 01:00:00+00', nzl, egy, 'scheduled', lock, 'BC Place, Vancouver'),
  ('group', 41, '2026-06-27 03:00:00+00', egy, irn, 'scheduled', lock, 'Lumen Field, Seattle'),
  ('group', 42, '2026-06-27 03:00:00+00', nzl, bel, 'scheduled', lock, 'BC Place, Vancouver'),

  -- ── GROUP H ──────────────────────────────────────────────────
  ('group', 43, '2026-06-15 16:00:00+00', esp, cpv, 'scheduled', lock, 'Mercedes-Benz Stadium, Atlanta'),
  ('group', 44, '2026-06-15 22:00:00+00', ksa, uru, 'scheduled', lock, 'Hard Rock Stadium, Miami'),
  ('group', 45, '2026-06-21 16:00:00+00', esp, ksa, 'scheduled', lock, 'Mercedes-Benz Stadium, Atlanta'),
  ('group', 46, '2026-06-21 22:00:00+00', uru, cpv, 'scheduled', lock, 'Hard Rock Stadium, Miami'),
  ('group', 47, '2026-06-27 00:00:00+00', cpv, ksa, 'scheduled', lock, 'NRG Stadium, Houston'),
  ('group', 48, '2026-06-27 00:00:00+00', uru, esp, 'scheduled', lock, 'Estadio Akron, Guadalajara'),

  -- ── GROUP I ──────────────────────────────────────────────────
  ('group', 49, '2026-06-16 19:00:00+00', fra, sen, 'scheduled', lock, 'MetLife Stadium, New York/New Jersey'),
  ('group', 50, '2026-06-16 22:00:00+00', irq, nor, 'scheduled', lock, 'Gillette Stadium, Boston'),
  ('group', 51, '2026-06-22 21:00:00+00', fra, irq, 'scheduled', lock, 'Lincoln Financial Field, Philadelphia'),
  ('group', 52, '2026-06-23 00:00:00+00', nor, sen, 'scheduled', lock, 'MetLife Stadium, New York/New Jersey'),
  ('group', 53, '2026-06-26 19:00:00+00', nor, fra, 'scheduled', lock, 'Gillette Stadium, Boston'),
  ('group', 54, '2026-06-26 19:00:00+00', sen, irq, 'scheduled', lock, 'BMO Field, Toronto'),

  -- ── GROUP J ──────────────────────────────────────────────────
  ('group', 55, '2026-06-17 01:00:00+00', arg, alg, 'scheduled', lock, 'Arrowhead Stadium, Kansas City'),
  ('group', 56, '2026-06-17 04:00:00+00', aut, jor, 'scheduled', lock, 'Levi''s Stadium, Santa Clara'),
  ('group', 57, '2026-06-22 17:00:00+00', arg, aut, 'scheduled', lock, 'AT&T Stadium, Dallas'),
  ('group', 58, '2026-06-23 03:00:00+00', jor, alg, 'scheduled', lock, 'Levi''s Stadium, Santa Clara'),
  ('group', 59, '2026-06-28 02:00:00+00', alg, aut, 'scheduled', lock, 'Arrowhead Stadium, Kansas City'),
  ('group', 60, '2026-06-28 02:00:00+00', jor, arg, 'scheduled', lock, 'AT&T Stadium, Dallas'),

  -- ── GROUP K ──────────────────────────────────────────────────
  ('group', 61, '2026-06-17 17:00:00+00', por, cod, 'scheduled', lock, 'NRG Stadium, Houston'),
  ('group', 62, '2026-06-18 02:00:00+00', uzb, col, 'scheduled', lock, 'Estadio Azteca, Mexico City'),
  ('group', 63, '2026-06-23 17:00:00+00', por, uzb, 'scheduled', lock, 'NRG Stadium, Houston'),
  ('group', 64, '2026-06-24 02:00:00+00', col, cod, 'scheduled', lock, 'Estadio Akron, Guadalajara'),
  ('group', 65, '2026-06-27 23:30:00+00', col, por, 'scheduled', lock, 'Hard Rock Stadium, Miami'),
  ('group', 66, '2026-06-27 23:30:00+00', cod, uzb, 'scheduled', lock, 'Mercedes-Benz Stadium, Atlanta'),

  -- ── GROUP L ──────────────────────────────────────────────────
  ('group', 67, '2026-06-17 20:00:00+00', eng, cro, 'scheduled', lock, 'AT&T Stadium, Dallas'),
  ('group', 68, '2026-06-17 23:00:00+00', gha, pan, 'scheduled', lock, 'BMO Field, Toronto'),
  ('group', 69, '2026-06-23 20:00:00+00', eng, gha, 'scheduled', lock, 'Gillette Stadium, Boston'),
  ('group', 70, '2026-06-23 23:00:00+00', pan, cro, 'scheduled', lock, 'BMO Field, Toronto'),
  ('group', 71, '2026-06-27 21:00:00+00', pan, eng, 'scheduled', lock, 'MetLife Stadium, New York/New Jersey'),
  ('group', 72, '2026-06-27 21:00:00+00', cro, gha, 'scheduled', lock, 'Lincoln Financial Field, Philadelphia');

END $$;

-- Verify
SELECT COUNT(*) AS group_stage_matches FROM matches WHERE stage = 'group';
SELECT COUNT(*) AS total_teams FROM teams;
