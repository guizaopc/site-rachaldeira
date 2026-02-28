-- Adiciona segundo jogador extra para destaques na tabela de rachas
ALTER TABLE rachas
ADD COLUMN IF NOT EXISTS top1_extra2_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS top2_extra2_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS top3_extra2_id UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS sheriff_extra2_id UUID REFERENCES members(id);
