-- Campeão definido manualmente pelo admin (opcional).
-- Quando NULL, o site usa o vencedor da final (ou o 1º da tabela, se não houver final).
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS champion_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
