-- Completely replace team data with correct 2026 FIFA World Cup groups
-- Source: Official FIFA draw
-- Tiers:
--   T1 (win=3): Elite 8 — user specified
--   T2 (win=4): Strong contenders
--   T3 (win=5): Solid outsiders
--   T4 (win=7): Weakest team per group (one per group A–L)

-- Wipe existing teams (cascades to draft_picks etc. — safe pre-tournament)
TRUNCATE TABLE teams RESTART IDENTITY CASCADE;

INSERT INTO teams (name, code, group_name, flag_url, tier) VALUES

-- Group A
('Mexico',       'MEX', 'A', 'https://flagcdn.com/w80/mx.png', 2),
('South Korea',  'KOR', 'A', 'https://flagcdn.com/w80/kr.png', 2),
('Czechia',      'CZE', 'A', 'https://flagcdn.com/w80/cz.png', 3),
('South Africa', 'RSA', 'A', 'https://flagcdn.com/w80/za.png', 4),

-- Group B
('Canada',                'CAN', 'B', 'https://flagcdn.com/w80/ca.png', 3),
('Bosnia & Herzegovina',  'BIH', 'B', 'https://flagcdn.com/w80/ba.png', 3),
('Switzerland',           'SUI', 'B', 'https://flagcdn.com/w80/ch.png', 2),
('Qatar',                 'QAT', 'B', 'https://flagcdn.com/w80/qa.png', 4),

-- Group C
('Brazil',   'BRA', 'C', 'https://flagcdn.com/w80/br.png', 1),
('Morocco',  'MAR', 'C', 'https://flagcdn.com/w80/ma.png', 2),
('Scotland', 'SCO', 'C', 'https://flagcdn.com/w80/gb-sct.png', 3),
('Haiti',    'HAI', 'C', 'https://flagcdn.com/w80/ht.png', 4),

-- Group D
('United States', 'USA', 'D', 'https://flagcdn.com/w80/us.png', 2),
('Paraguay',      'PAR', 'D', 'https://flagcdn.com/w80/py.png', 3),
('Turkey',        'TUR', 'D', 'https://flagcdn.com/w80/tr.png', 3),
('Australia',     'AUS', 'D', 'https://flagcdn.com/w80/au.png', 4),

-- Group E
('Germany',      'GER', 'E', 'https://flagcdn.com/w80/de.png', 1),
('Ecuador',      'ECU', 'E', 'https://flagcdn.com/w80/ec.png', 3),
('Ivory Coast',  'CIV', 'E', 'https://flagcdn.com/w80/ci.png', 3),
('Curaçao',      'CUW', 'E', 'https://flagcdn.com/w80/cw.png', 4),

-- Group F
('Netherlands', 'NED', 'F', 'https://flagcdn.com/w80/nl.png', 2),
('Japan',       'JPN', 'F', 'https://flagcdn.com/w80/jp.png', 2),
('Sweden',      'SWE', 'F', 'https://flagcdn.com/w80/se.png', 3),
('Tunisia',     'TUN', 'F', 'https://flagcdn.com/w80/tn.png', 4),

-- Group G
('Belgium',     'BEL', 'G', 'https://flagcdn.com/w80/be.png', 2),
('Egypt',       'EGY', 'G', 'https://flagcdn.com/w80/eg.png', 3),
('Iran',        'IRN', 'G', 'https://flagcdn.com/w80/ir.png', 3),
('New Zealand', 'NZL', 'G', 'https://flagcdn.com/w80/nz.png', 4),

-- Group H
('Spain',      'ESP', 'H', 'https://flagcdn.com/w80/es.png', 1),
('Uruguay',    'URU', 'H', 'https://flagcdn.com/w80/uy.png', 1),
('Saudi Arabia','KSA', 'H', 'https://flagcdn.com/w80/sa.png', 3),
('Cape Verde', 'CPV', 'H', 'https://flagcdn.com/w80/cv.png', 4),

-- Group I
('France',   'FRA', 'I', 'https://flagcdn.com/w80/fr.png', 1),
('Senegal',  'SEN', 'I', 'https://flagcdn.com/w80/sn.png', 2),
('Norway',   'NOR', 'I', 'https://flagcdn.com/w80/no.png', 2),
('Iraq',     'IRQ', 'I', 'https://flagcdn.com/w80/iq.png', 4),

-- Group J
('Argentina', 'ARG', 'J', 'https://flagcdn.com/w80/ar.png', 1),
('Algeria',   'ALG', 'J', 'https://flagcdn.com/w80/dz.png', 3),
('Austria',   'AUT', 'J', 'https://flagcdn.com/w80/at.png', 3),
('Jordan',    'JOR', 'J', 'https://flagcdn.com/w80/jo.png', 4),

-- Group K
('Portugal',   'POR', 'K', 'https://flagcdn.com/w80/pt.png', 1),
('Colombia',   'COL', 'K', 'https://flagcdn.com/w80/co.png', 2),
('DR Congo',   'COD', 'K', 'https://flagcdn.com/w80/cd.png', 3),
('Uzbekistan', 'UZB', 'K', 'https://flagcdn.com/w80/uz.png', 4),

-- Group L
('England',  'ENG', 'L', 'https://flagcdn.com/w80/gb-eng.png', 1),
('Croatia',  'CRO', 'L', 'https://flagcdn.com/w80/hr.png', 2),
('Ghana',    'GHA', 'L', 'https://flagcdn.com/w80/gh.png', 3),
('Panama',   'PAN', 'L', 'https://flagcdn.com/w80/pa.png', 4);
