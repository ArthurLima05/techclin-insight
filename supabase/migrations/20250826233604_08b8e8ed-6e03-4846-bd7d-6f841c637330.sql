-- Remover as políticas existentes que só permitem service_role
DROP POLICY IF EXISTS "Only service role can access oauth tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Service role can manage oauth tokens" ON public.google_oauth_tokens;

-- Criar novas políticas que permitem acesso baseado na clínica do usuário
-- Política para leitura: usuários podem ler tokens de sua própria clínica
CREATE POLICY "Users can read their clinic oauth tokens" 
ON public.google_oauth_tokens 
FOR SELECT 
TO authenticated
USING (
  clinica_id::text IN (
    SELECT (p.clinica_id)::text 
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.active = true
  )
);

-- Política para inserção: edge functions podem inserir tokens
CREATE POLICY "Service role can insert oauth tokens" 
ON public.google_oauth_tokens 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Política para atualização: edge functions podem atualizar tokens
CREATE POLICY "Service role can update oauth tokens" 
ON public.google_oauth_tokens 
FOR UPDATE 
TO service_role
USING (true);

-- Política para exclusão: usuários podem deletar tokens de sua própria clínica
CREATE POLICY "Users can delete their clinic oauth tokens" 
ON public.google_oauth_tokens 
FOR DELETE 
TO authenticated
USING (
  clinica_id::text IN (
    SELECT (p.clinica_id)::text 
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.active = true
  )
);