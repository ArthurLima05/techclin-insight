-- Criar tabela de médicos
CREATE TABLE public.medicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  nome TEXT NOT NULL,
  especialidade TEXT NOT NULL,
  crm TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Médicos são visíveis pela própria clínica" 
ON public.medicos 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medicos_updated_at
BEFORE UPDATE ON public.medicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();