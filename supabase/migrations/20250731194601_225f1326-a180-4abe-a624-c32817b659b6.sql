-- Remover o processamento automático de sentimento
CREATE OR REPLACE FUNCTION public.processar_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Não processar mais o sentimento automaticamente
    -- O sentimento virá já formatado do n8n
    IF NEW.comentario IS NOT NULL THEN
        NEW.palavras_chave := extrair_palavras_chave(NEW.comentario);
    END IF;
    
    RETURN NEW;
END;
$function$;