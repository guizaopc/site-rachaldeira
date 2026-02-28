-- Function to update a member's role securely
-- Only allows execution if the caller's email is 'gr96445@gmail.com'

CREATE OR REPLACE FUNCTION update_member_role(target_member_id UUID, new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually postgres/admin), bypassing RLS for the update itself, but we check email manually
AS $$
DECLARE
  caller_email TEXT;
  target_user_id UUID;
BEGIN
  -- 1. Get the email of the user executing the function
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  -- 2. Verify if the caller is the allowed super-admin
  IF caller_email IS NULL OR caller_email <> 'gr96445@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o administrador mestre pode realizar esta ação.';
  END IF;

  -- 3. Validate the new role
  IF new_role NOT IN ('admin', 'director', 'user') THEN
    RAISE EXCEPTION 'Papel inválido. Use: admin, director ou user.';
  END IF;

  -- 4. Find the auth.users ID associated with the member
  -- First try via profiles.member_id
  SELECT id INTO target_user_id FROM public.profiles WHERE member_id = target_member_id;

  -- If not found, try to find an auth user with the same email as the member (auto-healing)
  IF target_user_id IS NULL THEN
     SELECT id INTO target_user_id FROM auth.users WHERE email = (SELECT email FROM public.members WHERE id = target_member_id);
     
     -- If found an auth user, ensure they have a profile linked to this member
     IF target_user_id IS NOT NULL THEN
        -- Link existing auth user to this member
        INSERT INTO public.profiles (id, role, member_id)
        VALUES (target_user_id, new_role::user_role, target_member_id)
        ON CONFLICT (id) DO UPDATE 
        SET member_id = target_member_id, role = EXCLUDED.role;
     END IF;
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Este integrante ainda não possui um usuário (email não encontrado no sistema de autenticação). Crie um usuário para ele primeiro ou peça para ele se cadastrar com o email %', (SELECT email FROM public.members WHERE id = target_member_id);
  END IF;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
  -- 5. Update the role (ensuring it is set correctly)
  UPDATE public.profiles
  SET role = new_role::user_role
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Papel atualizado com sucesso para ' || new_role
  );

END;
$$;
