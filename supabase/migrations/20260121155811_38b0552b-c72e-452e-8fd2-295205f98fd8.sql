-- Promover usuário existente para super_admin
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscar o user_id pelo email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'joaoavelar.mdia@gmail.com';

  IF target_user_id IS NOT NULL THEN
    -- Inserir role super_admin (ignora se já existir)
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (target_user_id, 'super_admin', NULL)
    ON CONFLICT DO NOTHING;

    -- Atualizar status do profile para approved
    UPDATE public.profiles
    SET status = 'approved'
    WHERE user_id = target_user_id;
  END IF;
END $$;