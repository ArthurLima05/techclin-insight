-- Criar política para permitir que aplicação frontend acesse tokens OAuth
CREATE POLICY "Clinic members can read their oauth tokens" 
ON public.google_oauth_tokens 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.clinicas 
  WHERE clinicas.id = google_oauth_tokens.clinica_id
));