-- Primeiro, vamos dropar os triggers problemáticos e recriar com correções
DROP TRIGGER IF EXISTS trigger_update_dashboard_metrics ON public.agendamentos;
DROP TRIGGER IF EXISTS trigger_atualizar_metricas_agendamento ON public.agendamentos;

-- Recriar a função de atualização de métricas de forma mais simples e segura
CREATE OR REPLACE FUNCTION public.update_dashboard_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- Recriar o trigger
CREATE TRIGGER trigger_update_dashboard_metrics
    AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_dashboard_metrics();