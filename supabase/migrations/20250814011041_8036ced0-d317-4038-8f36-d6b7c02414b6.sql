-- Fix critical security vulnerabilities

-- 1. Fix Google OAuth tokens security - restrict to clinic owners only
DROP POLICY IF EXISTS "Tokens são visíveis pela própria clínica" ON public.google_oauth_tokens;

CREATE POLICY "Tokens são acessíveis apenas pela própria clínica"
ON public.google_oauth_tokens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = google_oauth_tokens.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 2. Fix doctors data security - restrict to authenticated clinic users
DROP POLICY IF EXISTS "Médicos são visíveis pela própria clínica" ON public.medicos;

CREATE POLICY "Médicos são acessíveis apenas pela própria clínica"
ON public.medicos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = medicos.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 3. Fix appointments security - restrict to clinic users only
DROP POLICY IF EXISTS "Agendamentos são visíveis pela própria clínica" ON public.agendamentos;

CREATE POLICY "Agendamentos são acessíveis apenas pela própria clínica"
ON public.agendamentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = agendamentos.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 4. Fix feedbacks security - restrict to clinic users only
DROP POLICY IF EXISTS "Feedbacks são visíveis pela própria clínica" ON public.feedbacks;

CREATE POLICY "Feedbacks são acessíveis apenas pela própria clínica"
ON public.feedbacks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = feedbacks.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 5. Fix metrics security - restrict to clinic users only
DROP POLICY IF EXISTS "Métricas são visíveis pela própria clínica" ON public.metricas_diarias;

CREATE POLICY "Métricas são acessíveis apenas pela própria clínica"
ON public.metricas_diarias
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = metricas_diarias.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 6. Secure database functions with proper search_path
CREATE OR REPLACE FUNCTION public.validar_profissional_existe(profissional_nome text, clinica_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.medicos 
        WHERE nome = profissional_nome 
        AND clinica_id = clinica_uuid 
        AND ativo = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.analisar_sentimento(texto text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    palavras_positivas TEXT[] := ARRAY['ótimo', 'excelente', 'bom', 'boa', 'perfeito', 'maravilhoso', 'fantástico', 'incrível', 'satisfeito', 'recomendo', 'gostei', 'adorei', 'feliz', 'contente', 'positivo', 'sucesso'];
    palavras_negativas TEXT[] := ARRAY['ruim', 'péssimo', 'horrível', 'terrível', 'insatisfeito', 'descontente', 'raiva', 'irritado', 'decepcionado', 'problema', 'dificuldade', 'demora', 'atraso', 'chateado', 'triste'];
    score NUMERIC := 0;
    palavra TEXT;
    texto_lower TEXT;
BEGIN
    texto_lower := lower(texto);
    
    -- Contar palavras positivas
    FOREACH palavra IN ARRAY palavras_positivas LOOP
        IF position(palavra IN texto_lower) > 0 THEN
            score := score + 1;
        END IF;
    END LOOP;
    
    -- Contar palavras negativas
    FOREACH palavra IN ARRAY palavras_negativas LOOP
        IF position(palavra IN texto_lower) > 0 THEN
            score := score - 1;
        END IF;
    END LOOP;
    
    -- Normalizar o score entre -1 e 1
    IF score > 5 THEN score := 1;
    ELSIF score < -5 THEN score := -1;
    ELSE score := score / 5.0;
    END IF;
    
    RETURN score;
END;
$$;

CREATE OR REPLACE FUNCTION public.extrair_palavras_chave(texto text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    palavras_relevantes TEXT[] := ARRAY['atendimento', 'médico', 'enfermeiro', 'recepção', 'consulta', 'exame', 'tratamento', 'medicamento', 'diagnóstico', 'horário', 'pontualidade', 'atraso', 'demora', 'rapidez', 'qualidade', 'preço', 'custo', 'estrutura', 'limpeza', 'organização', 'equipamento', 'tecnologia', 'profissional', 'competente', 'educado', 'gentil', 'atenção', 'cuidado', 'explicação', 'esclarecimento'];
    resultado TEXT[] := ARRAY[]::TEXT[];
    palavra TEXT;
    texto_lower TEXT;
BEGIN
    texto_lower := lower(texto);
    
    FOREACH palavra IN ARRAY palavras_relevantes LOOP
        IF position(palavra IN texto_lower) > 0 THEN
            resultado := array_append(resultado, palavra);
        END IF;
    END LOOP;
    
    RETURN resultado;
END;
$$;

-- 7. Create audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    clinica_id uuid,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs são acessíveis apenas pela própria clínica"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinicas 
    WHERE id = audit_logs.clinica_id 
    AND auth.uid()::text = chave_acesso::text
  )
);

-- 8. Add triggers for audit logging on sensitive tables
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        clinica_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        COALESCE(NEW.clinica_id, OLD.clinica_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_agendamentos ON public.agendamentos;
CREATE TRIGGER audit_agendamentos
    AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_medicos ON public.medicos;
CREATE TRIGGER audit_medicos
    AFTER INSERT OR UPDATE OR DELETE ON public.medicos
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_feedbacks ON public.feedbacks;
CREATE TRIGGER audit_feedbacks
    AFTER INSERT OR UPDATE OR DELETE ON public.feedbacks
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();