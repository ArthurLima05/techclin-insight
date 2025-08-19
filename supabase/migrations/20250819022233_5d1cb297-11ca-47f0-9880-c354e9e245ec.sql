-- Criar função que sempre funciona para autenticação de clínicas
CREATE OR REPLACE FUNCTION public.authenticate_clinic_user(p_clinica_id uuid, p_clinic_name text)
RETURNS TABLE(email text, password text, user_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  fixed_email text;
  existing_user_id uuid;
BEGIN
  -- Email e senha fixos por clínica
  fixed_email := 'clinic_' || p_clinica_id || '@techclin.com';
  
  -- Verificar se já existe usuário autenticado para esta clínica
  SELECT p.user_id INTO existing_user_id
  FROM public.profiles p
  WHERE p.clinica_id = p_clinica_id AND p.active = true
  LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    -- Retornar usuário existente
    RETURN QUERY SELECT fixed_email, 'password123'::text, true;
  ELSE
    -- Retornar dados para criar novo usuário
    RETURN QUERY SELECT fixed_email, 'password123'::text, false;
  END IF;
END;
$$;

-- Função para forçar confirmação do usuário
CREATE OR REPLACE FUNCTION public.force_confirm_user(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users 
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
  WHERE email = p_email;
END;
$$;