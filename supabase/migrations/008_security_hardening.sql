-- 008: Endurecimento de segurança (RLS, funções, storage, PII)

-- ---------------------------------------------------------------
-- 1. Tabelas sem RLS (qualquer um com a chave pública lia/escrevia)
-- ---------------------------------------------------------------
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin total financeiro" ON public.financial_transactions;
CREATE POLICY "Admin total financeiro" ON public.financial_transactions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública da galeria" ON public.gallery_media;
DROP POLICY IF EXISTS "Logado envia mídia própria" ON public.gallery_media;
DROP POLICY IF EXISTS "Admin total galeria" ON public.gallery_media;
CREATE POLICY "Leitura pública da galeria" ON public.gallery_media
    FOR SELECT USING (true);
CREATE POLICY "Logado envia mídia própria" ON public.gallery_media
    FOR INSERT TO authenticated WITH CHECK (uploaded_by IS NULL OR uploaded_by = auth.uid());
CREATE POLICY "Admin total galeria" ON public.gallery_media
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------
-- 2. Políticas permissivas demais
-- ---------------------------------------------------------------
-- Anônimos podiam inserir integrantes. Agora só o próprio e-mail, logado.
DROP POLICY IF EXISTS "Cadastro de Usuarios" ON public.members;
CREATE POLICY "Cadastro do próprio integrante" ON public.members
    FOR INSERT TO authenticated
    WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Qualquer um (até anônimo) podia confirmar presença em nome de qualquer integrante.
DROP POLICY IF EXISTS "Usuário confirma própria presença" ON public.racha_attendance;
CREATE POLICY "Usuário confirma própria presença" ON public.racha_attendance
    FOR INSERT TO authenticated
    WITH CHECK (member_id = public.get_member_id());

-- Qualquer usuário logado podia criar campeonatos.
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.championships;

-- Diretores podiam alterar qualquer perfil (inclusive se promover a admin).
CREATE OR REPLACE FUNCTION public.is_full_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_full_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_full_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin Total Perfis" ON public.profiles;
CREATE POLICY "Admin Total Perfis" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_full_admin())
    WITH CHECK (public.is_full_admin());

-- ---------------------------------------------------------------
-- 3. Dados pessoais (CPF, telefone, e-mail) não ficam mais públicos
--    para visitantes anônimos.
-- ---------------------------------------------------------------
REVOKE SELECT ON public.members FROM anon;
GRANT SELECT (id, name, age, photo_url, position, created_at, updated_at, user_id, level, is_active)
    ON public.members TO anon;

-- ---------------------------------------------------------------
-- 4. Funções SECURITY DEFINER
-- ---------------------------------------------------------------
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.get_member_id() SET search_path = public;
ALTER FUNCTION public.set_uploaded_by() SET search_path = public;
ALTER FUNCTION public.update_member_role(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Função de trigger não precisa ser chamável via API.
REVOKE EXECUTE ON FUNCTION public.set_uploaded_by() FROM PUBLIC, anon, authenticated;
-- Troca de papel só por usuário logado (a função ainda valida o admin mestre).
REVOKE EXECUTE ON FUNCTION public.update_member_role(uuid, text) FROM PUBLIC, anon;

-- ---------------------------------------------------------------
-- 5. Views passam a respeitar o RLS de quem consulta
-- ---------------------------------------------------------------
ALTER VIEW public.destaques_com_nomes SET (security_invoker = on);
ALTER VIEW public.scouts_com_nomes SET (security_invoker = on);
ALTER VIEW public.estatisticas_gerais_detalhado SET (security_invoker = on);
ALTER VIEW public.presencas_detalhado SET (security_invoker = on);
ALTER VIEW public.estatisticas_campeonato_detalhado SET (security_invoker = on);

-- ---------------------------------------------------------------
-- 6. Storage: qualquer logado podia apagar/sobrescrever fotos de outros
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir Tudo para Logados  14ixu7_2" ON storage.objects; -- DELETE Fotos
DROP POLICY IF EXISTS "Permitir Tudo para Logados  14ixu7_3" ON storage.objects; -- UPDATE Fotos
DROP POLICY IF EXISTS "Permitir Tudo para Logados 1m9ug2z_0" ON storage.objects; -- DELETE camp-times
DROP POLICY IF EXISTS "Permitir Tudo para Logados 1m9ug2z_2" ON storage.objects; -- UPDATE camp-times
DROP POLICY IF EXISTS "Permitir Tudo para Logados 1m9ug2z_3" ON storage.objects; -- INSERT camp-times

CREATE POLICY "Fotos: dono ou admin altera" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'Fotos' AND (owner_id = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Fotos: dono ou admin apaga" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'Fotos' AND (owner_id = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Camp-times: admin envia" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'Fotos camp-times' AND public.is_admin());
CREATE POLICY "Camp-times: admin altera" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'Fotos camp-times' AND public.is_admin());
CREATE POLICY "Camp-times: admin apaga" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'Fotos camp-times' AND public.is_admin());

-- Só imagens/vídeos, até 50 MB (evita hospedar HTML/JS no domínio do bucket)
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','video/mp4','video/quicktime','video/webm']
WHERE id IN ('Fotos', 'Fotos camp-times');
