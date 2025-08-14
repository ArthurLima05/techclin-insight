-- Fix function search path security warnings

-- Update all functions to use secure search_path
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Use pgcrypto extension for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_session(user_uuid uuid, ip inet DEFAULT NULL, agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_token_uuid uuid;
BEGIN
  session_token_uuid := gen_random_uuid();
  
  INSERT INTO public.user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
  VALUES (user_uuid, session_token_uuid::text, now() + interval '24 hours', ip, agent);
  
  RETURN session_token_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_session(token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT user_id INTO user_uuid
  FROM public.user_sessions
  WHERE session_token = token 
  AND expires_at > now();
  
  RETURN user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clinic_by_access_key(access_key text)
RETURNS TABLE(
  id uuid,
  nome text,
  dashboard_ativo boolean,
  feedbacks_ativos boolean,
  agenda_ativa boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.nome, c.dashboard_ativo, c.feedbacks_ativos, c.agenda_ativa
  FROM public.clinicas c
  WHERE c.chave_acesso = access_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    clinica_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.clinica_id, OLD.clinica_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;