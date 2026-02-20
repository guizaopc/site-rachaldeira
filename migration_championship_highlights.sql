-- Adiciona colunas de destaque na tabela de campeonatos (incluindo Artilheiro)
ALTER TABLE championships
ADD COLUMN IF NOT EXISTS craque_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS xerifao_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS paredao_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS garcom_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS artilheiro_id UUID REFERENCES members(id);
