-- Criar tabela financeiro
CREATE TABLE public.financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Política para usuários da clínica
CREATE POLICY "Users can only access their clinic financeiro" 
ON public.financeiro 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = financeiro.clinica_id 
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.clinica_id = financeiro.clinica_id 
    AND p.active = true
  )
);

-- Adicionar coluna financeiro_ativo na tabela clinicas
ALTER TABLE public.clinicas 
ADD COLUMN financeiro_ativo BOOLEAN NOT NULL DEFAULT false;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financeiro_updated_at
  BEFORE UPDATE ON public.financeiro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();