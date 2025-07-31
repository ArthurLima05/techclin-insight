-- Criar trigger para processar feedback automaticamente
CREATE TRIGGER processar_feedback_trigger
    BEFORE INSERT OR UPDATE ON public.feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_feedback();