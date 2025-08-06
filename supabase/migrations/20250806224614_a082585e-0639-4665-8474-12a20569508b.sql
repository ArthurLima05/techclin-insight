-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS trigger_update_dashboard_metrics ON agendamentos;
DROP FUNCTION IF EXISTS update_dashboard_metrics();

-- Create corrected function without CASE statement issues
CREATE OR REPLACE FUNCTION public.update_dashboard_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Para INSERT, sempre processar
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'realizado' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_atendimentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_atendimentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_atendimentos')::int, 0) + 1),
                updated_at = now();
        END IF;
        
        IF NEW.status = 'falta' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, faltas_total)
            VALUES (NEW.clinica_id, NEW.data, 1)
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                faltas_total = metricas_diarias.faltas_total + 1,
                updated_at = now();
        END IF;
        
        IF NEW.status = 'cancelado' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_cancelamentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_cancelamentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_cancelamentos')::int, 0) + 1),
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Para UPDATE, verificar mudança de status
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Decrementar contador do status antigo
        IF OLD.status = 'realizado' THEN
            UPDATE public.metricas_diarias 
            SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_atendimentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_atendimentos')::int, 0) - 1)),
                updated_at = now()
            WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
        END IF;
        
        IF OLD.status = 'falta' THEN
            UPDATE public.metricas_diarias 
            SET faltas_total = GREATEST(0, faltas_total - 1),
                updated_at = now()
            WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
        END IF;
        
        IF OLD.status = 'cancelado' THEN
            UPDATE public.metricas_diarias 
            SET volume_por_profissional = COALESCE(volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_cancelamentos', GREATEST(0, COALESCE((volume_por_profissional->>'total_cancelamentos')::int, 0) - 1)),
                updated_at = now()
            WHERE clinica_id = OLD.clinica_id AND data = OLD.data;
        END IF;
        
        -- Incrementar contador do novo status
        IF NEW.status = 'realizado' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_atendimentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_atendimentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_atendimentos')::int, 0) + 1),
                updated_at = now();
        END IF;
        
        IF NEW.status = 'falta' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, faltas_total)
            VALUES (NEW.clinica_id, NEW.data, 1)
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                faltas_total = metricas_diarias.faltas_total + 1,
                updated_at = now();
        END IF;
        
        IF NEW.status = 'cancelado' THEN
            INSERT INTO public.metricas_diarias (clinica_id, data, volume_por_profissional)
            VALUES (NEW.clinica_id, NEW.data, jsonb_build_object('total_cancelamentos', 1))
            ON CONFLICT (clinica_id, data) 
            DO UPDATE SET 
                volume_por_profissional = COALESCE(metricas_diarias.volume_por_profissional, '{}'::jsonb) || 
                jsonb_build_object('total_cancelamentos', COALESCE((metricas_diarias.volume_por_profissional->>'total_cancelamentos')::int, 0) + 1),
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate trigger
CREATE TRIGGER trigger_update_dashboard_metrics
    AFTER INSERT OR UPDATE ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_metrics();