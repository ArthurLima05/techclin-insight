-- Simplificar processo de autenticação - sempre criar novo usuário se necessário
CREATE OR REPLACE FUNCTION public.authenticate_clinic_user(p_clinica_id uuid, p_clinic_name text)
RETURNS TABLE(email text, password text, user_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  fixed_email text;
BEGIN
  -- Email fixo por clínica
  fixed_email := 'clinic_' || p_clinica_id || '@techclin.com';
  
  -- Sempre retornar que precisa criar usuário para simplificar
  RETURN QUERY SELECT fixed_email, 'password123'::text, false;
END;
$$;