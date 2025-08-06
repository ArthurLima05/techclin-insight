-- Trigger para atualizar métricas quando status de agendamento muda
CREATE OR REPLACE FUNCTION public.update_dashboard_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se houve mudança de status
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) OR TG_OP = 'INSERT' THEN
        -- Atualizar contadores baseados no novo status
        CASE NEW.status
            WHEN 'realizado' THEN
                -- Incrementar total de atendimentos
                INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
                VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_atendimentos', 1))
                ON CONFLICT (clinica_id, data) 
                DO UPDATE SET 
                    volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_atendimentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_atendimentos')::int, 0) + 1),
                    updated_at = now();
            WHEN 'falta' THEN
                -- Incrementar total de faltas
                INSERT INTO public.metricas_diarias (clinica_id, data, faltas_total)
                VALUES (NEW.clinica_id, NEW.data, 1)
                ON CONFLICT (clinica_id, data) 
                DO UPDATE SET 
                    faltas_total = metricas_diarias.faltas_total + 1,
                    updated_at = now();
            WHEN 'cancelado' THEN
                -- Incrementar total de cancelamentos
                INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
                VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_cancelamentos', 1))
                ON CONFLICT (clinica_id, data) 
                DO UPDATE SET 
                    volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_cancelamentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_cancelamentos')::int, 0) + 1),
                    updated_at = now();
        END CASE;
    END IF;
    
    -- Se status antigo foi 'realizado', 'falta' ou 'cancelado', decrementar contadores
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        CASE OLD.status
            WHEN 'realizado' THEN
                UPDATE public.metricas_diarias 
                SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_atendimentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_atendimentos')::int, 0) - 1)),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
            WHEN 'falta' THEN
                UPDATE public.metricas_diarias 
                SET faltas_total = GREATEST(0, faltas_total - 1),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
            WHEN 'cancelado' THEN
                UPDATE public.metricas_diarias 
                SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                    jsonb_build_object('total_cancelamentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_cancelamentos')::int, 0) - 1)),
                    updated_at = now()
                WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
        END CASE;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para agendamentos
CREATE TRIGGER update_dashboard_metrics_trigger
    AFTER INSERT OR UPDATE OF status ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_dashboard_metrics();

-- Função para calcular tempo médio entre agendamento e consulta
CREATE OR REPLACE FUNCTION public.calcular_tempo_medio_agendamento(clinica_uuid uuid, data_inicio date, data_fim date)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql;