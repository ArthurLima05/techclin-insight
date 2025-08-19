-- Corrigir função para gerar emails válidos
CREATE OR REPLACE FUNCTION public.authenticate_clinic_user(p_clinica_id uuid, p_clinic_name text)
RETURNS TABLE(email text, password text, user_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  fixed_email text;
  clean_clinic_name text;
BEGIN
  -- Limpar nome da clínica para usar no email
  clean_clinic_name := lower(regexp_replace(p_clinic_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Email válido simples
  fixed_email := clean_clinic_name || '@techclin.com';
  
  -- Sempre retornar que precisa criar usuário para simplificar
  RETURN QUERY SELECT fixed_email, 'password123'::text, false;
END;
$$;