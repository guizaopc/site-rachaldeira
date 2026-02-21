# Rachaldeira - Documentação do Schema do Banco de Dados

## Visão Geral

O banco de dados do sistema Rachaldeira foi projetado para ser simples, eficiente e específico para um **único grupo**. Não há conceito de multi-tenancy (`group_id`), tornando a estrutura mais limpa e focada.

---

## Diagrama de Relacionamentos (Conceitual)

```
auth.users (Supabase Auth)
    ↓
profiles (role: admin/user, member_id)
    ↓
members (integrantes)
    ├→ racha_attendance (presença nos rachas)
    ├→ racha_scouts (estatísticas por racha)
    ├→ team_members (integrantes dos times)
    ├→ match_player_stats (estatísticas por partida)
    └→ votes (votos Craque/Xerife)

rachas (eventos)
    ├→ racha_attendance
    └→ racha_scouts

championships (campeonatos)
    ├→ teams
    └→ championship_matches
        └→ match_player_stats

voting_periods
    └→ votes
```

---

## Tabelas Detalhadas

### 1. profiles
**Descrição**: Perfis de usuário vinculados ao Supabase Auth.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK, FK) | ID do usuário (referência para `auth.users.id`) |
| `role` | ENUM | Papel do usuário: `admin` ou `user` |
| `member_id` | UUID (FK) | ID do membro associado (pode ser NULL) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

**Relações:**
- ↔ `auth.users` (1:1)
- → `members` (N:1)

---

### 2. members
**Descrição**: Integrantes do racha com informações pessoais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `name` | TEXT | Nome completo |
| `age` | INTEGER | Idade |
| `phone` | TEXT | Telefone |
| `email` | TEXT (UNIQUE) | E-mail |
| `photo_url` | TEXT | URL da foto (Supabase Storage) |
| `position` | TEXT | Posição (Atacante, Goleiro, etc.) |
| `level` | INTEGER | Nível (1-5) para balanceamento de times (Default: 1) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

**Relações:**
- ← `profiles` (1:N)
- → `racha_attendance` (1:N)
- → `racha_scouts` (1:N)
- → `team_members` (N:M)
- → `match_player_stats` (1:N)
- → `votes` (1:N)

---

### 3. rachas
**Descrição**: Eventos de racha (partidas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `date_time` | TIMESTAMP | Data e hora do racha |
| `location` | TEXT | Local do racha |
| `periodicity` | ENUM | Periodicidade: `weekly`, `monthly`, `once` |
| `status` | ENUM | Status: `open`, `locked`, `in_progress`, `closed` |
| `is_next` | BOOLEAN | Se é o próximo racha (flag) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

**Regras:**
- `is_next = true` deve existir em no máximo 1 registro
- `status` inicia como `open` e muda para `locked` 30min antes

**Relações:**
- → `racha_attendance` (1:N)
- → `racha_scouts` (1:N)

---

### 4. racha_attendance
**Descrição**: Confirmação de presença dos integrantes nos rachas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `racha_id` | UUID (FK) | ID do racha |
| `member_id` | UUID (FK) | ID do integrante |
| `status` | ENUM | Status: `in` (dentro) ou `out` (fora) |
| `confirmed_at` | TIMESTAMP | Data/hora da confirmação |

**Constraints:**
- UNIQUE (`racha_id`, `member_id`) - um integrante só pode confirmar uma vez por racha

**Relações:**
- ← `rachas` (N:1)
- ← `members` (N:1)

---

### 5. racha_scouts
**Descrição**: Estatísticas individuais dos jogadores por racha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `racha_id` | UUID (FK) | ID do racha |
| `member_id` | UUID (FK) | ID do jogador |
| `goals` | INTEGER | Gols marcados |
| `assists` | INTEGER | Assistências |
| `difficult_saves` | INTEGER | Defesas difíceis |
| `warnings` | INTEGER | Advertências |
| `updated_at` | TIMESTAMP | Última atualização |

**Constraints:**
- UNIQUE (`racha_id`, `member_id`)

**Relações:**
- ← `rachas` (N:1)
- ← `members` (N:1)

---

### 6. championships
**Descrição**: Campeonatos organizados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `name` | TEXT | Nome do campeonato |
| `start_date` | DATE | Data de início |
| `location` | TEXT | Local do campeonato |
| `format` | ENUM | Formato: `round_robin` (pontos corridos) ou `bracket` (chaveamento) |
| `bracket_type` | ENUM | Tipo de chaveamento: `auto` ou `manual` (NULL se pontos corridos) |
| `rounds` | INTEGER | Número de turnos (1 ou 2 para pontos corridos) |
| `status` | ENUM | Status: `not_started`, `in_progress`, `completed` |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

**Relações:**
- → `teams` (1:N)
- → `championship_matches` (1:N)

---

### 7. teams
**Descrição**: Times participantes dos campeonatos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `championship_id` | UUID (FK) | ID do campeonato |
| `name` | TEXT | Nome do time |
| `logo_url` | TEXT | URL do logo (Supabase Storage) |
| `created_at` | TIMESTAMP | Data de criação |

**Relações:**
- ← `championships` (N:1)
- → `team_members` (1:N)
- → `championship_matches` (1:N - team_a ou team_b)

---

### 8. team_members
**Descrição**: Relação N:M entre times e integrantes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `team_id` | UUID (FK, PK) | ID do time |
| `member_id` | UUID (FK, PK) | ID do integrante |

**Constraints:**
- PRIMARY KEY (`team_id`, `member_id`)

**Relações:**
- ← `teams` (N:1)
- ← `members` (N:1)

---

### 9. championship_matches
**Descrição**: Partidas dos campeonatos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `championship_id` | UUID (FK) | ID do campeonato |
| `round` | INTEGER | Número da rodada (NULL para chaveamento) |
| `bracket_position` | TEXT | Posição no bracket (ex: 'semi-1', 'final') |
| `team_a_id` | UUID (FK) | ID do time A |
| `team_b_id` | UUID (FK) | ID do time B |
| `score_a` | INTEGER | Placar do time A |
| `score_b` | INTEGER | Placar do time B |
| `status` | ENUM | Status: `scheduled` ou `completed` |
| `played_at` | TIMESTAMP | Data/hora que foi jogado |
| `created_at` | TIMESTAMP | Data de criação |

**Lógica:**
- **Pontos corridos**: `round` preenchido, `bracket_position` NULL
- **Chaveamento**: `bracket_position` preenchido, `round` NULL

**Relações:**
- ← `championships` (N:1)
- ← `teams` (N:1 para team_a e team_b)
- → `match_player_stats` (1:N)

---

### 10. match_player_stats
**Descrição**: Estatísticas individuais dos jogadores por partida de campeonato.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `match_id` | UUID (FK) | ID da partida |
| `member_id` | UUID (FK) | ID do jogador |
| `team_id` | UUID (FK) | ID do time |
| `goals` | INTEGER | Gols marcados |
| `assists` | INTEGER | Assistências |
| `difficult_saves` | INTEGER | Defesas difíceis |
| `warnings` | INTEGER | Advertências |

**Relações:**
- ← `championship_matches` (N:1)
- ← `members` (N:1)
- ← `teams` (N:1)

---

### 11. voting_periods
**Descrição**: Períodos de votação abertos pelo admin.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `name` | TEXT | Nome do período (ex: "Semana 7 - Fevereiro 2026") |
| `period_type` | ENUM | Tipo: `weekly`, `monthly`, `annual` |
| `start_date` | DATE | Data de início |
| `end_date` | DATE | Data de término |
| `is_open` | BOOLEAN | Se está aberto para votação |
| `created_at` | TIMESTAMP | Data de criação |

**Regras:**
- Apenas 1 período pode estar `is_open = true` por vez

**Relações:**
- → `votes` (1:N)

---

### 12. financial_transactions
**Descrição**: Registros financeiros de receitas e despesas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `type` | ENUM | `income` (receita) ou `expense` (despesa) |
| `category` | ENUM | `monthly_fee`, `game_fee`, `field_rental`, etc. |
| `amount` | DECIMAL | Valor da transação |
| `description` | TEXT | Detalhes opcional |
| `transaction_date` | DATE | Data da transação |
| `member_id` | UUID (FK) | ID do membro (opcional) |
| `status` | ENUM | `pending`, `completed`, `cancelled` |
| `payment_method` | ENUM | `pix`, `money`, etc. |
| `created_at` | TIMESTAMP | Data de criação |

**Relações:**
- ← `members` (N:1 - member_id)

---

### 13. votes
**Descrição**: Votos de Craque e Xerife por período.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | ID único |
| `voting_period_id` | UUID (FK) | ID do período de votação |
| `voter_id` | UUID (FK) | ID do votante (member) |
| `craque_member_id` | UUID (FK) | ID do jogador votado como Craque |
| `xerife_member_id` | UUID (FK) | ID do jogador votado como Xerife |
| `voted_at` | TIMESTAMP | Data/hora do voto |

**Constraints:**
- UNIQUE (`voting_period_id`, `voter_id`) - 1 voto por período

**Relações:**
- ← `voting_periods` (N:1)
- ← `members` (N:1 para voter, craque e xerife)

---

## Badges Automáticas (Calculadas por Queries)

As badges NÃO são armazenadas em tabela. São calculadas dinamicamente:

- **Artilheiro**: MAX(`goals`) de `racha_scouts` + `match_player_stats`
- **Garçom**: MAX(`assists`)
- **Paredão**: MAX(`difficult_saves`)
- **Fominha**: COUNT distinct `racha_id` em `racha_attendance` WHERE `status = 'in'`
- **Craque**: MAX count de `craque_member_id` em `votes` por período
- **Xerife**: MAX count de `xerife_member_id` em `votes` por período

---

## RLS (Row Level Security) Policies

### Regras Gerais
1. **SELECT**: Todos os usuários autenticados podem ler
2. **INSERT/UPDATE/DELETE**: Apenas admin, com exceções:

### Exceções
- **racha_attendance**: Usuário pode inserir/atualizar apenas seus próprios registros
- **votes**: Usuário pode inserir 1 voto por período (via policy com check)

### Funções Auxiliares
- `is_admin()`: Retorna `true` se `auth.uid()` tem `role = 'admin'`
- `get_member_id()`: Retorna `member_id` do profile do `auth.uid()`

---

## Indexes Criados

```sql
CREATE INDEX idx_profiles_member_id ON profiles(member_id);
CREATE INDEX idx_racha_attendance_racha_id ON racha_attendance(racha_id);
CREATE INDEX idx_racha_attendance_member_id ON racha_attendance(member_id);
CREATE INDEX idx_racha_scouts_racha_id ON racha_scouts(racha_id);
CREATE INDEX idx_racha_scouts_member_id ON racha_scouts(member_id);
CREATE INDEX idx_teams_championship_id ON teams(championship_id);
CREATE INDEX idx_championship_matches_championship_id ON championship_matches(championship_id);
CREATE INDEX idx_match_player_stats_match_id ON match_player_stats(match_id);
CREATE INDEX idx_match_player_stats_member_id ON match_player_stats(member_id);
CREATE INDEX idx_votes_period_id ON votes(voting_period_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_rachas_is_next ON rachas(is_next) WHERE is_next = TRUE;
```

---

## Triggers

### update_updated_at_column()
Atualiza automaticamente o campo `updated_at` nas tabelas:
- profiles
- members
- rachas
- racha_scouts
- championships

---

## Queries Comuns

### Estatísticas Anuais (2026)
```sql
SELECT 
  m.id,
  m.name,
  COALESCE(SUM(rs.goals), 0) + COALESCE(SUM(mps.goals), 0) as total_goals,
  COALESCE(SUM(rs.assists), 0) + COALESCE(SUM(mps.assists), 0) as total_assists,
  COALESCE(SUM(rs.difficult_saves), 0) + COALESCE(SUM(mps.difficult_saves), 0) as total_saves,
  COUNT(DISTINCT ra.racha_id) as participations
FROM members m
LEFT JOIN racha_scouts rs ON m.id = rs.member_id
LEFT JOIN racha_attendance ra ON m.id = ra.member_id AND ra.status = 'in'
LEFT JOIN rachas r ON ra.racha_id = r.id AND EXTRACT(YEAR FROM r.date_time) = 2026
LEFT JOIN match_player_stats mps ON m.id = mps.member_id
WHERE EXTRACT(YEAR FROM r.date_time) = 2026 OR r.id IS NULL
GROUP BY m.id, m.name
ORDER BY total_goals DESC;
```

### Classificação de Campeonato (Pontos Corridos)
```sql
SELECT 
  t.id,
  t.name,
  SUM(CASE 
    WHEN (cm.team_a_id = t.id AND cm.score_a > cm.score_b) OR 
         (cm.team_b_id = t.id AND cm.score_b > cm.score_a) THEN 3
    WHEN cm.score_a = cm.score_b THEN 1
    ELSE 0
  END) as points,
  COUNT(*) as played,
  SUM(CASE 
    WHEN (cm.team_a_id = t.id AND cm.score_a > cm.score_b) OR 
         (cm.team_b_id = t.id AND cm.score_b > cm.score_a) THEN 1
    ELSE 0
  END) as wins,
  SUM(CASE WHEN cm.score_a = cm.score_b THEN 1 ELSE 0 END) as draws,
  SUM(CASE 
    WHEN (cm.team_a_id = t.id AND cm.score_a < cm.score_b) OR 
         (cm.team_b_id = t.id AND cm.score_b < cm.score_a) THEN 1
    ELSE 0
  END) as losses,
  SUM(CASE 
    WHEN cm.team_a_id = t.id THEN cm.score_a
    ELSE cm.score_b
  END) as goals_for,
  SUM(CASE 
    WHEN cm.team_a_id = t.id THEN cm.score_b
    ELSE cm.score_a
  END) as goals_against
FROM teams t
JOIN championship_matches cm ON cm.championship_id = t.championship_id 
  AND (cm.team_a_id = t.id OR cm.team_b_id = t.id)
  AND cm.status = 'completed'
WHERE t.championship_id = :championship_id
GROUP BY t.id, t.name
ORDER BY points DESC, (goals_for - goals_against) DESC;
```

---

## Notas de Migração

### Primeira Execução
1. Execute `001_initial_schema.sql` - cria todas as tabelas e funções
2. Execute `002_rls_policies.sql` - habilita RLS e cria policies
3. (Opcional) Execute `seed.sql` - insere dados de exemplo

### Criando Primeiro Admin
```sql
-- Após criar usuário via /signup
UPDATE profiles 
SET role = 'admin', member_id = 'ID_DO_MEMBER_AQUI' 
WHERE id = 'ID_DO_USER_DO_AUTH_AQUI';
```

---

**Versão do Schema**: 1.0  
**Última Atualização**: 2026-02-16
