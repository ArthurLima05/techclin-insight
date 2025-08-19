-- Atualizar a função para confirmar o usuário automaticamente e reutilizar usuários existentes
CREATE OR REPLACE FUNCTION public.create_clinic_user_profile(p_user_id uuid, p_email text, p_clinica_id uuid, p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Confirmar o usuário automaticamente se não estiver confirmado
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()), 
      confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = p_user_id;
  
  -- Inserir ou atualizar perfil
  INSERT INTO public.profiles (user_id, email, clinica_id, role, full_name, active)
  VALUES (p_user_id, p_email, p_clinica_id, 'clinic_user', p_full_name, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    clinica_id = EXCLUDED.clinica_id,
    full_name = EXCLUDED.full_name,
    active = EXCLUDED.active,
    updated_at = now();
END;
$$;

-- Função para reutilizar usuário existente da clínica
CREATE OR REPLACE FUNCTION public.get_or_create_clinic_user(p_clinica_id uuid, p_clinic_name text)
RETURNS TABLE(user_id uuid, email text, needs_signup boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_user_id uuid;
  existing_email text;
  fixed_email text;
BEGIN
  -- Email fixo por clínica
  fixed_email := 'clinic_' || p_clinica_id || '@techclin.com';
  
  -- Verificar se já existe um usuário para esta clínica
  SELECT p.user_id, p.email INTO existing_user_id, existing_email
  FROM public.profiles p
  WHERE p.clinica_id = p_clinica_id AND p.active = true
  LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    -- Retornar usuário existente
    RETURN QUERY SELECT existing_user_id, existing_email, false;
  ELSE
    -- Retornar dados para criar novo usuário
    RETURN QUERY SELECT NULL::uuid, fixed_email, true;
  END IF;
END;
$$;