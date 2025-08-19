-- Desabilitar confirmação de email temporariamente para usuários de clínica
-- e melhorar as políticas RLS

-- Atualizar a função de criação de perfil para confirmar automaticamente o usuário
CREATE OR REPLACE FUNCTION public.create_clinic_user_profile(p_user_id uuid, p_email text, p_clinica_id uuid, p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Confirmar o usuário automaticamente
  UPDATE auth.users 
  SET email_confirmed_at = now(), 
      confirmed_at = now()
  WHERE id = p_user_id AND email_confirmed_at IS NULL;
  
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

-- Melhorar as políticas para permitir acesso mesmo sem confirmação de email
CREATE POLICY "Public access to clinic data for clinic users" ON public.agendamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = agendamentos.clinica_id 
    AND p.active = true
  )
);

CREATE POLICY "Public access to feedback data for clinic users" ON public.feedbacks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = feedbacks.clinica_id 
    AND p.active = true
  )
);

CREATE POLICY "Public access to medicos data for clinic users" ON public.medicos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = medicos.clinica_id 
    AND p.active = true
  )
);

CREATE POLICY "Public access to metricas data for clinic users" ON public.metricas_diarias
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = metricas_diarias.clinica_id 
    AND p.active = true
  )
);

CREATE POLICY "Public access to whatsapp data for clinic users" ON public.whatsapp_clinicas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = whatsapp_clinicas.clinica_id 
    AND p.active = true
  )
);