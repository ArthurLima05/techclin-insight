-- Reabilitar RLS em todas as tabelas
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_clinicas ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que não funcionam
DROP POLICY IF EXISTS "Authenticated users can access all agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated users can access all feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Authenticated users can access all medicos" ON public.medicos;
DROP POLICY IF EXISTS "Authenticated users can access all metricas" ON public.metricas_diarias;
DROP POLICY IF EXISTS "Authenticated users can access all whatsapp" ON public.whatsapp_clinicas;

-- Criar políticas seguras baseadas no perfil do usuário
CREATE POLICY "Users can access agendamentos from their clinic" ON public.agendamentos
FOR ALL USING (
  clinica_id IN (
    SELECT clinica_id FROM public.profiles 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can access feedbacks from their clinic" ON public.feedbacks
FOR ALL USING (
  clinica_id IN (
    SELECT clinica_id FROM public.profiles 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can access medicos from their clinic" ON public.medicos
FOR ALL USING (
  clinica_id IN (
    SELECT clinica_id FROM public.profiles 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can access metricas from their clinic" ON public.metricas_diarias
FOR ALL USING (
  clinica_id IN (
    SELECT clinica_id FROM public.profiles 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can access whatsapp from their clinic" ON public.whatsapp_clinicas
FOR ALL USING (
  clinica_id IN (
    SELECT clinica_id FROM public.profiles 
    WHERE user_id = auth.uid() AND active = true
  )
);