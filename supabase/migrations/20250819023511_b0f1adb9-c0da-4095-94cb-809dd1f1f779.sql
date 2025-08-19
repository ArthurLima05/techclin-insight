-- Solução completa: autenticação + acesso aos dados
-- 1. Função que garante perfil do usuário ao fazer login
CREATE OR REPLACE FUNCTION public.ensure_user_profile_on_login(p_clinic_id uuid, p_clinic_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_id uuid;
    user_email text;
BEGIN
    -- Se o usuário não estiver autenticado, retornar NULL
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Pegar email do usuário autenticado
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Inserir ou atualizar perfil
    INSERT INTO public.profiles (user_id, email, clinica_id, role, full_name, active)
    VALUES (
        auth.uid(),
        COALESCE(user_email, 'user_' || auth.uid()::text || '@techclin.com'),
        p_clinic_id,
        'clinic_user',
        'Usuario da ' || p_clinic_name,
        true
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        clinica_id = EXCLUDED.clinica_id,
        full_name = EXCLUDED.full_name,
        active = true,
        updated_at = now()
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$;

-- 2. Políticas RLS simplificadas que funcionam com usuários autenticados
DROP POLICY IF EXISTS "Allow clinic access to agendamentos" ON public.agendamentos;
CREATE POLICY "Authenticated users access agendamentos" 
ON public.agendamentos 
FOR ALL 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow clinic access to feedbacks" ON public.feedbacks;
CREATE POLICY "Authenticated users access feedbacks" 
ON public.feedbacks 
FOR ALL 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow clinic access to medicos" ON public.medicos;
CREATE POLICY "Authenticated users access medicos" 
ON public.medicos 
FOR ALL 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow clinic access to metricas" ON public.metricas_diarias;
CREATE POLICY "Authenticated users access metricas" 
ON public.metricas_diarias 
FOR ALL 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow clinic access to whatsapp" ON public.whatsapp_clinicas;
CREATE POLICY "Authenticated users access whatsapp" 
ON public.whatsapp_clinicas 
FOR ALL 
USING (auth.uid() IS NOT NULL);