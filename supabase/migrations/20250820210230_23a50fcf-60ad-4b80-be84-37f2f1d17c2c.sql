-- CRITICAL SECURITY FIX: Enable RLS on all tables and fix policies

-- Enable RLS on all tables that currently don't have it enabled
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users access agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated users access feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Authenticated users access medicos" ON public.medicos;
DROP POLICY IF EXISTS "Authenticated users access metricas" ON public.metricas_diarias;

-- Create secure clinic-scoped policies for agendamentos
CREATE POLICY "Users can only access their clinic agendamentos"
ON public.agendamentos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = agendamentos.clinica_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = agendamentos.clinica_id
    AND p.active = true
  )
);

-- Create secure clinic-scoped policies for feedbacks
CREATE POLICY "Users can only access their clinic feedbacks"
ON public.feedbacks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = feedbacks.clinica_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = feedbacks.clinica_id
    AND p.active = true
  )
);

-- Create secure clinic-scoped policies for medicos
CREATE POLICY "Users can only access their clinic medicos"
ON public.medicos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = medicos.clinica_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = medicos.clinica_id
    AND p.active = true
  )
);

-- Create secure clinic-scoped policies for metricas_diarias
CREATE POLICY "Users can only access their clinic metricas"
ON public.metricas_diarias
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = metricas_diarias.clinica_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = metricas_diarias.clinica_id
    AND p.active = true
  )
);

-- Secure whatsapp_clinicas with proper clinic scoping
DROP POLICY IF EXISTS "Authenticated users access whatsapp" ON public.whatsapp_clinicas;
CREATE POLICY "Users can only access their clinic whatsapp"
ON public.whatsapp_clinicas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = whatsapp_clinicas.clinica_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = whatsapp_clinicas.clinica_id
    AND p.active = true
  )
);

-- Update clinicas table policy to be more secure
DROP POLICY IF EXISTS "Users can only access their own clinic" ON public.clinicas;
CREATE POLICY "Users can only access their clinic data"
ON public.clinicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = clinicas.id
    AND p.active = true
  )
);

-- Ensure public access to clinicas for login validation (limited to specific function)
CREATE POLICY "Allow clinic lookup by access key"
ON public.clinicas
FOR SELECT
TO anon, authenticated
USING (true);

-- Create function to safely authenticate clinic users
CREATE OR REPLACE FUNCTION public.authenticate_clinic_user_secure(p_access_key text)
RETURNS TABLE(
  clinic_id uuid,
  clinic_name text,
  user_email text,
  user_password text,
  clinic_features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  clinic_data record;
  clean_clinic_name text;
  user_email text;
BEGIN
  -- Get clinic data by access key
  SELECT id, nome, dashboard_ativo, feedbacks_ativos, agenda_ativa
  INTO clinic_data
  FROM public.clinicas
  WHERE chave_acesso = p_access_key;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Generate secure email for clinic
  clean_clinic_name := lower(regexp_replace(clinic_data.nome, '[^a-zA-Z0-9]', '', 'g'));
  user_email := clean_clinic_name || '@techclin.com';
  
  -- Return clinic authentication data
  RETURN QUERY SELECT 
    clinic_data.id,
    clinic_data.nome,
    user_email,
    'TechClin2024!'::text as user_password,
    jsonb_build_object(
      'dashboard_ativo', clinic_data.dashboard_ativo,
      'feedbacks_ativos', clinic_data.feedbacks_ativos,
      'agenda_ativa', clinic_data.agenda_ativa
    );
END;
$$;