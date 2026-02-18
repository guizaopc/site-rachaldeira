-- Script para tornar um usuário Admin
-- Substitua 'email@exemplo.com' abaixo pelo email do usuário que você quer promover

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'email@exemplo.com' -- <--- COLOCA O EMAIL DO USUÁRIO AQUI
);

-- Se quiser conferir se deu certo:
-- SELECT * FROM public.profiles WHERE role = 'admin';
