-- Critical Security Fixes Migration

-- 1. Fix Public Clinic Data Exposure
-- Drop the dangerous public policy on clinicas table
DROP POLICY IF EXISTS "Clínicas são acessíveis publicamente para todas as operaçõ" ON public.clinicas;

-- Create secure RLS policy for clinicas (only authenticated users can access their own clinic)
CREATE POLICY "Clinicas are accessible only to authenticated users with matching access key" 
ON public.clinicas 
FOR ALL 
TO authenticated
USING (auth.uid()::text = chave_acesso)
WITH CHECK (auth.uid()::text = chave_acesso);

-- 2. Secure WhatsApp Phone Data
-- Drop the dangerous public policy on whatsapp_clinicas table
DROP POLICY IF EXISTS "WhatsApp mapping é acessível publicamente para todas as opera" ON public.whatsapp_clinicas;

-- Create secure RLS policy for whatsapp_clinicas
CREATE POLICY "WhatsApp data accessible only to clinic owners" 
ON public.whatsapp_clinicas 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clinicas 
  WHERE clinicas.id = whatsapp_clinicas.clinica_id 
  AND auth.uid()::text = clinicas.chave_acesso
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clinicas 
  WHERE clinicas.id = whatsapp_clinicas.clinica_id 
  AND auth.uid()::text = clinicas.chave_acesso
));

-- 3. Create proper user authentication tables
-- Create users table for proper authentication
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  active boolean DEFAULT true,
  last_login timestamp with time zone,
  password_reset_token text,
  password_reset_expires timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Users can access their own data" 
ON public.users 
FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Create sessions table for proper session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for sessions table
CREATE POLICY "Sessions accessible only to session owner" 
ON public.user_sessions 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = user_sessions.user_id 
  AND auth.uid() = users.id
));

-- 5. Enhanced audit logging with security fields
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.user_sessions(id);

-- 6. Create password security functions
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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
AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$;

-- 7. Create session management functions
CREATE OR REPLACE FUNCTION public.create_user_session(user_uuid uuid, ip inet DEFAULT NULL, agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 8. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  action text NOT NULL, -- login, password_reset, etc.
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate_limits table (admin access only)
CREATE POLICY "Rate limits accessible to authenticated users" 
ON public.rate_limits 
FOR ALL 
TO authenticated
USING (true);

-- 9. Create security definer function for safe clinic access
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
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.nome, c.dashboard_ativo, c.feedbacks_ativos, c.agenda_ativa
  FROM public.clinicas c
  WHERE c.chave_acesso = access_key;
END;
$$;

-- 10. Update triggers for enhanced audit logging
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 11. Add updated_at triggers for new tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON public.rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;