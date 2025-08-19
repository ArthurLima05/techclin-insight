-- Corrigir função para não atualizar coluna gerada automaticamente
CREATE OR REPLACE FUNCTION public.force_confirm_user(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE email = p_email;
END;
$$;