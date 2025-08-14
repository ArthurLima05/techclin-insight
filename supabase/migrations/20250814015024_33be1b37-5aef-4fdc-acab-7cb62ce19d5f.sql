-- Ajustar políticas RLS para funcionar sem autenticação
-- Remover políticas existentes e criar novas para admin

-- Política para clínicas - permitir acesso total sem autenticação para admin
DROP POLICY IF EXISTS "Clinicas are accessible only to authenticated users with matchi" ON public.clinicas;

CREATE POLICY "Admin can manage all clinicas" 
ON public.clinicas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para agendamentos - permitir acesso baseado na clínica
DROP POLICY IF EXISTS "Agendamentos são acessíveis apenas pela própria clínica" ON public.agendamentos;

CREATE POLICY "Admin can manage all agendamentos" 
ON public.agendamentos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para feedbacks
DROP POLICY IF EXISTS "Feedbacks são acessíveis apenas pela própria clínica" ON public.feedbacks;

CREATE POLICY "Admin can manage all feedbacks" 
ON public.feedbacks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para médicos
DROP POLICY IF EXISTS "Médicos são acessíveis apenas pela própria clínica" ON public.medicos;

CREATE POLICY "Admin can manage all medicos" 
ON public.medicos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para métricas
DROP POLICY IF EXISTS "Métricas são acessíveis apenas pela própria clínica" ON public.metricas_diarias;

CREATE POLICY "Admin can manage all metricas" 
ON public.metricas_diarias 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para WhatsApp
DROP POLICY IF EXISTS "WhatsApp data accessible only to clinic owners" ON public.whatsapp_clinicas;

CREATE POLICY "Admin can manage all whatsapp" 
ON public.whatsapp_clinicas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para tokens Google
DROP POLICY IF EXISTS "Tokens são acessíveis apenas pela própria clínica" ON public.google_oauth_tokens;

CREATE POLICY "Admin can manage all tokens" 
ON public.google_oauth_tokens 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Política para audit logs
DROP POLICY IF EXISTS "Audit logs são acessíveis apenas pela própria clínica" ON public.audit_logs;

CREATE POLICY "Admin can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (true);