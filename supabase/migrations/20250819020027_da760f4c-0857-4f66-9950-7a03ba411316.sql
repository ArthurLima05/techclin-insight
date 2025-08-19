-- Remover todas as políticas existentes que estão conflitando
DROP POLICY IF EXISTS "Users can only access agendamentos from their clinic" ON public.agendamentos;
DROP POLICY IF EXISTS "Public access to clinic data for clinic users" ON public.agendamentos;

DROP POLICY IF EXISTS "Users can only access feedbacks from their clinic" ON public.feedbacks;
DROP POLICY IF EXISTS "Public access to feedback data for clinic users" ON public.feedbacks;

DROP POLICY IF EXISTS "Users can only access medicos from their clinic" ON public.medicos;
DROP POLICY IF EXISTS "Public access to medicos data for clinic users" ON public.medicos;

DROP POLICY IF EXISTS "Users can only access metricas from their clinic" ON public.metricas_diarias;
DROP POLICY IF EXISTS "Public access to metricas data for clinic users" ON public.metricas_diarias;

DROP POLICY IF EXISTS "Users can only access whatsapp from their clinic" ON public.whatsapp_clinicas;
DROP POLICY IF EXISTS "Public access to whatsapp data for clinic users" ON public.whatsapp_clinicas;

-- Criar políticas simples que funcionem para usuários autenticados
CREATE POLICY "Authenticated users can access all agendamentos" ON public.agendamentos
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all feedbacks" ON public.feedbacks  
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all medicos" ON public.medicos
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all metricas" ON public.metricas_diarias
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all whatsapp" ON public.whatsapp_clinicas
FOR ALL USING (auth.role() = 'authenticated');