# Instruções para Organizar o Supabase

Copie o código abaixo e cole no **SQL Editor** do seu painel do Supabase. Isso vai criar "Views" (Visualizações) que mostram nomes em vez de IDs, facilitando muito a sua leitura dos dados.

```sql
-- 1. View de Estatísticas Unificadas (Ver quem marcou gols com nome)
CREATE OR REPLACE VIEW estatisticas_gerais_detalhado AS
SELECT 
    m.name AS jogador,
    rs.goals AS gols_racha,
    rs.assists AS assistencias_racha,
    rs.difficult_saves AS defesas_racha,
    r.date_time AS data_racha,
    r.location AS local
FROM racha_scouts rs
JOIN members m ON rs.member_id = m.id
JOIN rachas r ON rs.racha_id = r.id
ORDER BY r.date_time DESC;

-- 2. View de Presenças (Ver quem confirmou com nome)
CREATE OR REPLACE VIEW presencas_detalhado AS
SELECT 
    m.name AS jogador,
    ra.status AS presenca,
    r.date_time AS data_racha,
    ra.confirmed_at
FROM racha_attendance ra
JOIN members m ON ra.member_id = m.id
JOIN rachas r ON ra.racha_id = r.id
ORDER BY r.date_time DESC;

-- 3. View de Estatísticas de Campeonato
CREATE OR REPLACE VIEW estatisticas_campeonato_detalhado AS
SELECT 
    m.name AS jogador,
    t.name AS time,
    c.name AS campeonato,
    mps.goals,
    mps.assists,
    mps.difficult_saves
FROM match_player_stats mps
JOIN members m ON mps.member_id = m.id
JOIN teams t ON mps.team_id = t.id
JOIN championships c ON t.championship_id = c.id;
```

### 4. Adicionar colunas para destaques extras (Duplicados)
Se você precisar de dois jogadores na mesma posição de destaque (ex: dois Top 1 ou dois Top 2), rode este comando:

```sql
-- Adiciona colunas extras para destaques duplicados
ALTER TABLE rachas ADD COLUMN IF NOT EXISTS top1_extra_id UUID REFERENCES members(id);
ALTER TABLE rachas ADD COLUMN IF NOT EXISTS top2_extra_id UUID REFERENCES members(id);
ALTER TABLE rachas ADD COLUMN IF NOT EXISTS top3_extra_id UUID REFERENCES members(id);
ALTER TABLE rachas ADD COLUMN IF NOT EXISTS sheriff_extra_id UUID REFERENCES members(id);
```

Após rodar isso, procure pela aba **"Views"** no menu lateral do Supabase (abaixo de Tables). Lá os dados estarão limpos e fáceis de ler!
