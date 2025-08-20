-- Fix remaining RLS issues detected by linter

-- Enable RLS on google_oauth_tokens table
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_logs table  
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create proper policies for google_oauth_tokens
CREATE POLICY "Service role can manage oauth tokens"
ON public.google_oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can access their clinic oauth tokens"
ON public.google_oauth_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = google_oauth_tokens.clinica_id
    AND p.active = true
  )
);

-- Create proper policies for audit_logs
CREATE POLICY "Users can view their clinic audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = audit_logs.clinica_id
    AND p.active = true
  )
);

CREATE POLICY "Service role can manage audit logs"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);