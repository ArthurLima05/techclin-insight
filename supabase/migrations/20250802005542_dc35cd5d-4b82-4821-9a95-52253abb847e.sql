-- Função para validar se profissional existe na tabela médicos
CREATE OR REPLACE FUNCTION public.validar_profissional_existe(profissional_nome text, clinica_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
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

-- Trigger function para validar profissional em agendamentos
CREATE OR REPLACE FUNCTION public.trigger_validar_profissional_agendamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT validar_profissional_existe(NEW.profissional, NEW.clinica_id) THEN
        RAISE EXCEPTION 'Profissional "%" não encontrado na clínica', NEW.profissional;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger function para validar profissional em feedbacks
CREATE OR REPLACE FUNCTION public.trigger_validar_profissional_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT validar_profissional_existe(NEW.profissional, NEW.clinica_id) THEN
        RAISE EXCEPTION 'Profissional "%" não encontrado na clínica', NEW.profissional;
    END IF;
    RETURN NEW;
END;
$$;

-- Função para calcular volume por profissional
CREATE OR REPLACE FUNCTION public.calcular_volume_por_profissional(clinica_uuid uuid, data_inicio date, data_fim date)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    resultado jsonb := '{}';
    rec record;
BEGIN
    FOR rec IN 
        SELECT 
            profissional,
            COUNT(*) as volume
        FROM public.agendamentos 
        WHERE clinica_id = clinica_uuid 
        AND data BETWEEN data_inicio AND data_fim
        AND status IN ('agendado', 'confirmado', 'realizado')
        GROUP BY profissional
    LOOP
        resultado := jsonb_set(resultado, ARRAY[rec.profissional], to_jsonb(rec.volume));
    END LOOP;
    
    RETURN resultado;
END;
$$;

-- Função para atualizar métricas diárias
CREATE OR REPLACE FUNCTION public.atualizar_metricas_diarias(clinica_uuid uuid, data_agendamento date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    volume_profissionais jsonb;
BEGIN
    -- Calcular volume por profissional
    volume_profissionais := calcular_volume_por_profissional(clinica_uuid, data_agendamento, data_agendamento);
    
    -- Inserir ou atualizar métricas diárias
    INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
    VALUES (clinica_uuid, data_agendamento, volume_profissionais)
    ON CONFLICT (clinica_id, data) 
    DO UPDATE SET 
        volume_por_profissional = EXCLUDED.volume_por_profissional,
        updated_at = now();
END;
$$;

-- Trigger function para atualizar métricas quando agendamento muda
CREATE OR REPLACE FUNCTION public.trigger_atualizar_metricas_agendamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atualizar métricas para a data do agendamento
    PERFORM atualizar_metricas_diarias(COALESCE(NEW.clinica_id, OLD.clinica_id), COALESCE(NEW.data, OLD.data));
    
    -- Se a data mudou, atualizar métricas para a data antiga também
    IF OLD.data IS NOT NULL AND NEW.data IS NOT NULL AND OLD.data != NEW.data THEN
        PERFORM atualizar_metricas_diarias(OLD.clinica_id, OLD.data);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_validar_profissional_agendamento ON public.agendamentos;
CREATE TRIGGER trigger_validar_profissional_agendamento
    BEFORE INSERT OR UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validar_profissional_agendamento();

DROP TRIGGER IF EXISTS trigger_validar_profissional_feedback ON public.feedbacks;
CREATE TRIGGER trigger_validar_profissional_feedback
    BEFORE INSERT OR UPDATE ON public.feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validar_profissional_feedback();

DROP TRIGGER IF EXISTS trigger_atualizar_metricas_agendamento ON public.agendamentos;
CREATE TRIGGER trigger_atualizar_metricas_agendamento
    AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_metricas_agendamento();

-- Adicionar constraint unique para métricas diárias (clinica_id, data)
ALTER TABLE public.metricas_diarias DROP CONSTRAINT IF EXISTS metricas_diarias_clinica_data_unique;
ALTER TABLE public.metricas_diarias ADD CONSTRAINT metricas_diarias_clinica_data_unique UNIQUE (clinica_id, data);