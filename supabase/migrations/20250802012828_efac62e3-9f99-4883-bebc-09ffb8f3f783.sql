-- Remover triggers e funções dependentes primeiro
DROP TRIGGER IF EXISTS trigger_atualizar_metricas_agendamento ON public.agendamentos;
DROP TRIGGER IF EXISTS update_metricas_diarias_updated_at ON public.metricas_diarias;

-- Remover funções antigas
DROP FUNCTION IF EXISTS public.trigger_atualizar_metricas_agendamento() CASCADE;
DROP FUNCTION IF EXISTS public.atualizar_metricas_diarias(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.calcular_volume_por_profissional(uuid, date, date) CASCADE;

-- Adicionar coluna clinica_nome
ALTER TABLE public.metricas_diarias 
ADD COLUMN IF NOT EXISTS clinica_nome TEXT;

-- Remover colunas desnecessárias
ALTER TABLE public.metricas_diarias 
DROP COLUMN IF EXISTS data,
DROP COLUMN IF EXISTS sentimento_medio,
DROP COLUMN IF EXISTS palavras_chave_frequentes,
DROP COLUMN IF EXISTS taxa_retorno,
DROP COLUMN IF EXISTS tempo_medio_agendamento;

-- Adicionar constraint única para clinica_id (uma linha por clínica)
ALTER TABLE public.metricas_diarias 
DROP CONSTRAINT IF EXISTS unique_clinica_id;

ALTER TABLE public.metricas_diarias 
ADD CONSTRAINT unique_clinica_id UNIQUE (clinica_id);

-- Criar nova função para calcular volume por profissional
CREATE OR REPLACE FUNCTION public.calcular_volume_por_profissional(clinica_uuid uuid)
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
        AND status IN ('agendado', 'confirmado', 'realizado')
        GROUP BY profissional
    LOOP
        resultado := jsonb_set(resultado, ARRAY[rec.profissional], to_jsonb(rec.volume));
    END LOOP;
    
    RETURN resultado;
END;
$$;

-- Criar nova função para atualizar métricas da clínica
CREATE OR REPLACE FUNCTION public.atualizar_metricas_clinica(clinica_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    volume_profissionais jsonb;
    nome_clinica text;
BEGIN
    -- Buscar nome da clínica
    SELECT nome INTO nome_clinica FROM public.clinicas WHERE id = clinica_uuid;
    
    -- Calcular volume por profissional
    volume_profissionais := calcular_volume_por_profissional(clinica_uuid);
    
    -- Inserir ou atualizar métricas da clínica
    INSERT INTO public.metricas_diarias (clinica_id, clinica_nome, volume_por_profissional, faltas_total, origens)
    VALUES (
        clinica_uuid, 
        nome_clinica,
        volume_profissionais, 
        (SELECT COUNT(*) FROM public.agendamentos WHERE clinica_id = clinica_uuid AND status = 'falta'),
        '{}'::jsonb
    )
    ON CONFLICT (clinica_id) 
    DO UPDATE SET 
        volume_por_profissional = EXCLUDED.volume_por_profissional,
        faltas_total = EXCLUDED.faltas_total,
        updated_at = now();
END;
$$;

-- Criar nova função trigger
CREATE OR REPLACE FUNCTION public.trigger_atualizar_metricas_agendamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atualizar métricas para a clínica do agendamento
    PERFORM atualizar_metricas_clinica(COALESCE(NEW.clinica_id, OLD.clinica_id));
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recriar triggers
CREATE TRIGGER update_metricas_diarias_updated_at
BEFORE UPDATE ON public.metricas_diarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_atualizar_metricas_agendamento
AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_atualizar_metricas_agendamento();