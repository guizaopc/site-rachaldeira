-- Adiciona coluna is_active na tabela members
ALTER TABLE members
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
