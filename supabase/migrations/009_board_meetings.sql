-- 009: Pautas de reunião da diretoria
-- Reuniões, itens de pauta (com banco de pautas sugeridas), participantes e encaminhamentos.
-- Acesso restrito a admin/diretor via public.is_admin().

-- ---------------------------------------------------------------
-- Reuniões
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    meeting_date TIMESTAMPTZ NOT NULL,
    format TEXT NOT NULL DEFAULT 'presencial' CHECK (format IN ('presencial', 'online', 'hibrida')),
    location TEXT CHECK (char_length(location) <= 300),
    meeting_link TEXT CHECK (char_length(meeting_link) <= 500),
    objective TEXT CHECK (char_length(objective) <= 2000),
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('rascunho', 'agendada', 'em_andamento', 'realizada', 'cancelada')),
    minutes TEXT CHECK (char_length(minutes) <= 50000),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_meetings_date_idx ON public.board_meetings (meeting_date DESC);

-- ---------------------------------------------------------------
-- Itens de pauta (meeting_id NULL = banco de pautas sugeridas)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.board_meetings(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT CHECK (char_length(description) <= 5000),
    category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'financeiro', 'eventos', 'campeonatos', 'disciplina', 'integrantes', 'estrutura', 'comunicacao')),
    priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    item_type TEXT NOT NULL DEFAULT 'discussao' CHECK (item_type IN ('informe', 'discussao', 'deliberacao')),
    presenter_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'discutido', 'aprovado', 'rejeitado', 'adiado')),
    decision TEXT CHECK (char_length(decision) <= 5000),
    votes_for INTEGER CHECK (votes_for IS NULL OR votes_for >= 0),
    votes_against INTEGER CHECK (votes_against IS NULL OR votes_against >= 0),
    votes_abstain INTEGER CHECK (votes_abstain IS NULL OR votes_abstain >= 0),
    suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_agenda_items_meeting_idx ON public.board_agenda_items (meeting_id, position);

-- ---------------------------------------------------------------
-- Participantes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_meeting_attendees (
    meeting_id UUID NOT NULL REFERENCES public.board_meetings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    attendance TEXT NOT NULL DEFAULT 'convidado' CHECK (attendance IN ('convidado', 'presente', 'ausente', 'justificado')),
    PRIMARY KEY (meeting_id, member_id)
);

-- ---------------------------------------------------------------
-- Encaminhamentos / tarefas
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.board_meetings(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES public.board_agenda_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
    responsible_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_action_items_meeting_idx ON public.board_action_items (meeting_id);
CREATE INDEX IF NOT EXISTS board_action_items_status_idx ON public.board_action_items (status, due_date);

-- ---------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS board_meetings_updated_at ON public.board_meetings;
CREATE TRIGGER board_meetings_updated_at BEFORE UPDATE ON public.board_meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS board_agenda_items_updated_at ON public.board_agenda_items;
CREATE TRIGGER board_agenda_items_updated_at BEFORE UPDATE ON public.board_agenda_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS board_action_items_updated_at ON public.board_action_items;
CREATE TRIGGER board_action_items_updated_at BEFORE UPDATE ON public.board_action_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------
-- RLS: somente admin/diretor
-- ---------------------------------------------------------------
ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_action_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.board_meetings, public.board_agenda_items,
    public.board_meeting_attendees, public.board_action_items FROM anon;

DROP POLICY IF EXISTS "Diretoria gerencia reuniões" ON public.board_meetings;
CREATE POLICY "Diretoria gerencia reuniões" ON public.board_meetings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Diretoria gerencia pautas" ON public.board_agenda_items;
CREATE POLICY "Diretoria gerencia pautas" ON public.board_agenda_items
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Diretoria gerencia participantes" ON public.board_meeting_attendees;
CREATE POLICY "Diretoria gerencia participantes" ON public.board_meeting_attendees
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Diretoria gerencia encaminhamentos" ON public.board_action_items;
CREATE POLICY "Diretoria gerencia encaminhamentos" ON public.board_action_items
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
