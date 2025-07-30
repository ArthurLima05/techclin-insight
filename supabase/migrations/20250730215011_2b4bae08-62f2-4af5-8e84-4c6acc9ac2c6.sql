-- Adicionar campos para análise de sentimento nos feedbacks
ALTER TABLE public.feedbacks 
ADD COLUMN sentimento NUMERIC,
ADD COLUMN palavras_chave TEXT[];

-- Adicionar campos para métricas de sentimento nas métricas diárias
ALTER TABLE public.metricas_diarias 
ADD COLUMN sentimento_medio NUMERIC,
ADD COLUMN palavras_chave_frequentes JSONB;

-- Criar índice para palavras-chave nos feedbacks
CREATE INDEX idx_feedbacks_palavras_chave ON public.feedbacks USING GIN(palavras_chave);

-- Criar função para calcular sentimento médio de uma string
CREATE OR REPLACE FUNCTION public.analisar_sentimento(texto TEXT)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql;

-- Criar função para extrair palavras-chave
CREATE OR REPLACE FUNCTION public.extrair_palavras_chave(texto TEXT)
RETURNS TEXT[] AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para automaticamente analisar sentimento e extrair palavras-chave quando um feedback é inserido
CREATE OR REPLACE FUNCTION public.processar_feedback()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.comentario IS NOT NULL THEN
        NEW.sentimento := analisar_sentimento(NEW.comentario);
        NEW.palavras_chave := extrair_palavras_chave(NEW.comentario);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER trigger_processar_feedback
    BEFORE INSERT OR UPDATE ON public.feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_feedback();