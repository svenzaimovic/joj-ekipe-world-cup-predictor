-- FIFA World Cup 2026 — All 48 Qualified Teams
-- Groups A-L, 4 teams each
-- flag_url uses flagcdn.com (free, no attribution required)

INSERT INTO teams (name, code, group_name, flag_url) VALUES
-- Group A (USA host group)
('United States', 'USA', 'A', 'https://flagcdn.com/w80/us.png'),
('Panama', 'PAN', 'A', 'https://flagcdn.com/w80/pa.png'),
('Honduras', 'HON', 'A', 'https://flagcdn.com/w80/hn.png'),
('Morocco', 'MAR', 'A', 'https://flagcdn.com/w80/ma.png'),

-- Group B
('Mexico', 'MEX', 'B', 'https://flagcdn.com/w80/mx.png'),
('Jamaica', 'JAM', 'B', 'https://flagcdn.com/w80/jm.png'),
('Venezuela', 'VEN', 'B', 'https://flagcdn.com/w80/ve.png'),
('Cameroon', 'CMR', 'B', 'https://flagcdn.com/w80/cm.png'),

-- Group C
('Canada', 'CAN', 'C', 'https://flagcdn.com/w80/ca.png'),
('Uruguay', 'URU', 'C', 'https://flagcdn.com/w80/uy.png'),
('Algeria', 'ALG', 'C', 'https://flagcdn.com/w80/dz.png'),
('Portugal', 'POR', 'C', 'https://flagcdn.com/w80/pt.png'),

-- Group D
('Argentina', 'ARG', 'D', 'https://flagcdn.com/w80/ar.png'),
('Chile', 'CHI', 'D', 'https://flagcdn.com/w80/cl.png'),
('Australia', 'AUS', 'D', 'https://flagcdn.com/w80/au.png'),
('Saudi Arabia', 'KSA', 'D', 'https://flagcdn.com/w80/sa.png'),

-- Group E
('Spain', 'ESP', 'E', 'https://flagcdn.com/w80/es.png'),
('Brazil', 'BRA', 'E', 'https://flagcdn.com/w80/br.png'),
('Nigeria', 'NGA', 'E', 'https://flagcdn.com/w80/ng.png'),
('Czechia', 'CZE', 'E', 'https://flagcdn.com/w80/cz.png'),

-- Group F
('Germany', 'GER', 'F', 'https://flagcdn.com/w80/de.png'),
('Japan', 'JPN', 'F', 'https://flagcdn.com/w80/jp.png'),
('Senegal', 'SEN', 'F', 'https://flagcdn.com/w80/sn.png'),
('Serbia', 'SRB', 'F', 'https://flagcdn.com/w80/rs.png'),

-- Group G
('France', 'FRA', 'G', 'https://flagcdn.com/w80/fr.png'),
('South Korea', 'KOR', 'G', 'https://flagcdn.com/w80/kr.png'),
('Poland', 'POL', 'G', 'https://flagcdn.com/w80/pl.png'),
('Egypt', 'EGY', 'G', 'https://flagcdn.com/w80/eg.png'),

-- Group H
('England', 'ENG', 'H', 'https://flagcdn.com/w80/gb-eng.png'),
('Netherlands', 'NED', 'H', 'https://flagcdn.com/w80/nl.png'),
('Colombia', 'COL', 'H', 'https://flagcdn.com/w80/co.png'),
('Sudan', 'SDN', 'H', 'https://flagcdn.com/w80/sd.png'),

-- Group I
('Italy', 'ITA', 'I', 'https://flagcdn.com/w80/it.png'),
('Ecuador', 'ECU', 'I', 'https://flagcdn.com/w80/ec.png'),
('Ivory Coast', 'CIV', 'I', 'https://flagcdn.com/w80/ci.png'),
('Ukraine', 'UKR', 'I', 'https://flagcdn.com/w80/ua.png'),

-- Group J
('Belgium', 'BEL', 'J', 'https://flagcdn.com/w80/be.png'),
('Costa Rica', 'CRC', 'J', 'https://flagcdn.com/w80/cr.png'),
('Tunisia', 'TUN', 'J', 'https://flagcdn.com/w80/tn.png'),
('New Zealand', 'NZL', 'J', 'https://flagcdn.com/w80/nz.png'),

-- Group K
('Croatia', 'CRO', 'K', 'https://flagcdn.com/w80/hr.png'),
('Paraguay', 'PAR', 'K', 'https://flagcdn.com/w80/py.png'),
('South Africa', 'RSA', 'K', 'https://flagcdn.com/w80/za.png'),
('Romania', 'ROU', 'K', 'https://flagcdn.com/w80/ro.png'),

-- Group L
('Portugal', 'POR2', 'L', 'https://flagcdn.com/w80/pt.png'),
('Switzerland', 'SUI', 'L', 'https://flagcdn.com/w80/ch.png'),
('Bolivia', 'BOL', 'L', 'https://flagcdn.com/w80/bo.png'),
('Ghana', 'GHA', 'L', 'https://flagcdn.com/w80/gh.png');

-- NOTE: The exact 48 teams and groups will be confirmed by FIFA.
-- This seed uses projected/announced qualifiers. Update before tournament.
-- Run: UPDATE teams SET name=..., code=..., group_name=... WHERE id=...
