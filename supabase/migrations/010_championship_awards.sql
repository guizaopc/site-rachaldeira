-- 010: Destaques de campeonato com mais de um jogador por prêmio
--
-- Antes cada prêmio era uma coluna em championships (craque_id, artilheiro_id...),
-- o que limitava a 1 jogador. Agora cada indicação é uma linha nesta tabela.
-- As colunas antigas ficam no lugar só como histórico; o site não lê mais delas.

CREATE TABLE IF NOT EXISTS public.championship_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
    award TEXT NOT NULL CHECK (award IN ('craque', 'artilheiro', 'paredao', 'garcom', 'xerifao')),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (championship_id, award, member_id)
);

CREATE INDEX IF NOT EXISTS championship_awards_championship_idx ON public.championship_awards (championship_id);
CREATE INDEX IF NOT EXISTS championship_awards_member_idx ON public.championship_awards (member_id);

-- Copia os destaques que já existiam
INSERT INTO public.championship_awards (championship_id, award, member_id)
SELECT id, 'craque', craque_id FROM public.championships WHERE craque_id IS NOT NULL
UNION ALL
SELECT id, 'artilheiro', artilheiro_id FROM public.championships WHERE artilheiro_id IS NOT NULL
UNION ALL
SELECT id, 'paredao', paredao_id FROM public.championships WHERE paredao_id IS NOT NULL
UNION ALL
SELECT id, 'garcom', garcom_id FROM public.championships WHERE garcom_id IS NOT NULL
UNION ALL
SELECT id, 'xerifao', xerifao_id FROM public.championships WHERE xerifao_id IS NOT NULL
ON CONFLICT (championship_id, award, member_id) DO NOTHING;

ALTER TABLE public.championship_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de destaques de campeonato" ON public.championship_awards;
CREATE POLICY "Leitura pública de destaques de campeonato" ON public.championship_awards
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin gerencia destaques de campeonato" ON public.championship_awards;
CREATE POLICY "Admin gerencia destaques de campeonato" ON public.championship_awards
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

GRANT SELECT ON public.championship_awards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.championship_awards TO authenticated;
