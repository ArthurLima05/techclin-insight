-- Atualizar a função para não processar palavras-chave
-- As palavras-chave agora chegam prontas do n8n em formato de array
CREATE OR REPLACE FUNCTION public.processar_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Não processar mais sentimento nem palavras-chave
    -- Ambos vêm já formatados do n8n
    RETURN NEW;
END;
$function$;