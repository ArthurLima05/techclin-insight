-- Fix remaining database functions security issues

CREATE OR REPLACE FUNCTION public.calcular_tempo_medio_agendamento(clinica_uuid uuid, data_inicio date, data_fim date)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    tempo_medio numeric;
BEGIN
    SELECT AVG(EXTRACT(EPOCH FROM (data::timestamp + horario::interval - created_at)) / 86400.0)
    INTO tempo_medio
    FROM public.agendamentos
    WHERE clinica_id = clinica_uuid
      AND data BETWEEN data_inicio AND data_fim
      AND status IN ('agendado', 'confirmado', 'realizado')
      AND created_at IS NOT NULL;
    
    RETURN COALESCE(tempo_medio, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_validar_profissional_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.validar_profissional_existe(NEW.profissional, NEW.clinica_id) THEN
        RAISE EXCEPTION 'Profissional "%" não encontrado na clínica', NEW.profissional;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_validar_profissional_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.validar_profissional_existe(NEW.profissional, NEW.clinica_id) THEN
        RAISE EXCEPTION 'Profissional "%" não encontrado na clínica', NEW.profissional;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_volume_por_profissional(clinica_uuid uuid, data_inicio date, data_fim date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.processar_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Não processar mais sentimento nem palavras-chave
    -- Ambos vêm já formatados do n8n
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_metricas_diarias(clinica_uuid uuid, data_agendamento date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    volume_profissionais jsonb;
BEGIN
    -- Calcular volume por profissional
    volume_profissionais := public.calcular_volume_por_profissional(clinica_uuid, data_agendamento, data_agendamento);
    
    -- Inserir ou atualizar métricas diárias
    INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
    VALUES (clinica_uuid, data_agendamento, volume_profissionais)
    ON CONFLICT (clinica_id, data) 
    DO UPDATE SET 
        volume_por_profissional = EXCLUDED.volume_por_profissional,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_atualizar_metricas_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Atualizar métricas para a data do agendamento
    PERFORM public.atualizar_metricas_diarias(COALESCE(NEW.clinica_id, OLD.clinica_id), COALESCE(NEW.data, OLD.data));
    
    -- Se a data mudou, atualizar métricas para a data antiga também
    IF OLD.data IS NOT NULL AND NEW.data IS NOT NULL AND OLD.data != NEW.data THEN
        PERFORM public.atualizar_metricas_diarias(OLD.clinica_id, OLD.data);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dashboard_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Verificar se é INSERT ou UPDATE com mudança de status
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Atualizar métricas baseado no novo status
        IF NEW.status = 'realizado' THEN
            -- Incrementar total de atendimentos
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_atendimentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_atendimentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_atendimentos')::int, 0) + 1),
                updated_at = now();
        ELSIF NEW.status = 'falta' THEN
            -- Incrementar total de faltas
            INSERT INTO public.metricas_diarias (clinica_id, data, faltas_total)
            VALUES (NEW.clinica_id, NEW.data, 1)
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                faltas_total = metricas_diarias.faltas_total + 1,
                updated_at = now();
        ELSIF NEW.status = 'cancelado' THEN
            -- Incrementar total de cancelamentos
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_cancelamentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_cancelamentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_cancelamentos')::int, 0) + 1),
                updated_at = now();
        END IF;
        
        -- Se era UPDATE, decrementar contadores do status antigo
        IF TG_OP = 'UPDATE' AND OLD.status IS NOT NULL THEN
            IF OLD.status = 'realizado' THEN
                UPDATE public.metricas_diarias 
                SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_atendimentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_atendimentos')::int, 0) - 1)),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
            ELSIF OLD.status = 'falta' THEN
                UPDATE public.metricas_diarias 
                SET faltas_total = GREATEST(0, faltas_total - 1),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
            ELSIF OLD.status = 'cancelado' THEN
                UPDATE public.metricas_diarias 
                SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_cancelamentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_cancelamentos')::int, 0) - 1)),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;