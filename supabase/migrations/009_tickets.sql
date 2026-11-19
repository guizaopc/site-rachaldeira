-- 009: Tickets (sugestões, bugs, reclamações) enviados pelos jogadores

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('sugestao', 'bug', 'reclamacao', 'outro')),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 5 AND 4000),
    page_url TEXT CHECK (page_url IS NULL OR char_length(page_url) <= 500),
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
    admin_response TEXT CHECK (admin_response IS NULL OR char_length(admin_response) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets (status, created_at DESC);

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Jogador logado abre ticket em nome próprio, sempre com status inicial
DROP POLICY IF EXISTS "Usuário abre ticket próprio" ON public.tickets;
CREATE POLICY "Usuário abre ticket próprio" ON public.tickets
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND status = 'aberto' AND admin_response IS NULL);

-- Jogador vê só os próprios tickets
DROP POLICY IF EXISTS "Usuário lê tickets próprios" ON public.tickets;
CREATE POLICY "Usuário lê tickets próprios" ON public.tickets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admin/diretor vê e gerencia todos
DROP POLICY IF EXISTS "Admin total tickets" ON public.tickets;
CREATE POLICY "Admin total tickets" ON public.tickets
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

REVOKE ALL ON public.tickets FROM anon;
