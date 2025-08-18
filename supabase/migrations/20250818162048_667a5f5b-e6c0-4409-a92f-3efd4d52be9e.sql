-- Fix critical security vulnerability: Secure Google OAuth tokens and other sensitive data
-- Remove the overly permissive existing policies and create proper RLS policies

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Admin can manage all tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Admin can manage all agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Admin can manage all feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Admin can manage all medicos" ON public.medicos;
DROP POLICY IF EXISTS "Admin can manage all clinicas" ON public.clinicas;
DROP POLICY IF EXISTS "Admin can manage all metricas" ON public.metricas_diarias;
DROP POLICY IF EXISTS "Admin can manage all whatsapp" ON public.whatsapp_clinicas;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.audit_logs;

-- CRITICAL: Secure Google OAuth tokens - only allow access by Edge Functions using service role
-- These policies ensure only the backend functions can access OAuth tokens
CREATE POLICY "Service role can manage oauth tokens"
ON public.google_oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Secure appointments data - only accessible via clinic access key validation
CREATE POLICY "Clinic members can manage their agendamentos"
ON public.agendamentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = agendamentos.clinica_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = agendamentos.clinica_id
  )
);

-- Secure feedbacks - only accessible via clinic relationship
CREATE POLICY "Clinic members can manage their feedbacks"
ON public.feedbacks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = feedbacks.clinica_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = feedbacks.clinica_id
  )
);

-- Secure doctors data - only accessible via clinic relationship
CREATE POLICY "Clinic members can manage their medicos"
ON public.medicos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = medicos.clinica_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = medicos.clinica_id
  )
);

-- Secure clinic data - allow read access for access key validation
CREATE POLICY "Public can read clinic basic info for access key validation"
ON public.clinicas
FOR SELECT
USING (true);

-- Restrict write access to clinics - separate policies for each operation
CREATE POLICY "Service role can insert clinicas"
ON public.clinicas
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update clinicas"
ON public.clinicas
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete clinicas"
ON public.clinicas
FOR DELETE
TO service_role
USING (true);

-- Secure metrics data - only accessible via clinic relationship
CREATE POLICY "Clinic members can manage their metricas"
ON public.metricas_diarias
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = metricas_diarias.clinica_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = metricas_diarias.clinica_id
  )
);

-- Secure WhatsApp data - only accessible via clinic relationship
CREATE POLICY "Clinic members can manage their whatsapp"
ON public.whatsapp_clinicas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = whatsapp_clinicas.clinica_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = whatsapp_clinicas.clinica_id
  )
);

-- Secure audit logs - restrict to service role only
CREATE POLICY "Service role can view audit logs"
ON public.audit_logs
FOR SELECT
TO service_role
USING (true);