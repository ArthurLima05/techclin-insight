-- Adicionar campo para como conheceu a clínica na tabela feedbacks
ALTER TABLE public.feedbacks 
ADD COLUMN como_conheceu TEXT;

-- Comentário para documentar o novo campo
COMMENT ON COLUMN public.feedbacks.como_conheceu IS 'Como o paciente conheceu a clínica (redes sociais, indicação, etc.)';