-- Atualizar políticas RLS para permitir acesso mais flexível aos dados da clínica
-- Política mais permissiva para agendamentos
DROP POLICY IF EXISTS "Users can access agendamentos from their clinic" ON public.agendamentos;
CREATE POLICY "Allow clinic access to agendamentos" 
ON public.agendamentos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = agendamentos.clinica_id 
    AND p.active = true
  )
  OR 
  -- Fallback: permitir acesso se o usuário estiver autenticado e a clínica existir
  (auth.uid() IS NOT NULL AND clinica_id IN (SELECT id FROM public.clinicas))
);

-- Política mais permissiva para feedbacks
DROP POLICY IF EXISTS "Users can access feedbacks from their clinic" ON public.feedbacks;
CREATE POLICY "Allow clinic access to feedbacks" 
ON public.feedbacks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = feedbacks.clinica_id 
    AND p.active = true
  )
  OR 
  -- Fallback: permitir acesso se o usuário estiver autenticado e a clínica existir
  (auth.uid() IS NOT NULL AND clinica_id IN (SELECT id FROM public.clinicas))
);

-- Política mais permissiva para medicos
DROP POLICY IF EXISTS "Users can access medicos from their clinic" ON public.medicos;
CREATE POLICY "Allow clinic access to medicos" 
ON public.medicos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = medicos.clinica_id 
    AND p.active = true
  )
  OR 
  -- Fallback: permitir acesso se o usuário estiver autenticado e a clínica existir
  (auth.uid() IS NOT NULL AND clinica_id IN (SELECT id FROM public.clinicas))
);

-- Política mais permissiva para métricas
DROP POLICY IF EXISTS "Users can access metricas from their clinic" ON public.metricas_diarias;
CREATE POLICY "Allow clinic access to metricas" 
ON public.metricas_diarias 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = metricas_diarias.clinica_id 
    AND p.active = true
  )
  OR 
  -- Fallback: permitir acesso se o usuário estiver autenticado e a clínica existir
  (auth.uid() IS NOT NULL AND clinica_id IN (SELECT id FROM public.clinicas))
);

-- Política mais permissiva para whatsapp
DROP POLICY IF EXISTS "Users can access whatsapp from their clinic" ON public.whatsapp_clinicas;
CREATE POLICY "Allow clinic access to whatsapp" 
ON public.whatsapp_clinicas 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = whatsapp_clinicas.clinica_id 
    AND p.active = true
  )
  OR 
  -- Fallback: permitir acesso se o usuário estiver autenticado e a clínica existir
  (auth.uid() IS NOT NULL AND clinica_id IN (SELECT id FROM public.clinicas))
);