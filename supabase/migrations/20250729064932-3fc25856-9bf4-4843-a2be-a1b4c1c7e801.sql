-- Create table to map WhatsApp numbers to clinics
CREATE TABLE public.whatsapp_clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_whatsapp TEXT NOT NULL UNIQUE,
  clinica_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_clinicas ENABLE ROW LEVEL SECURITY;

-- Create policies for WhatsApp-clinic mapping access
CREATE POLICY "WhatsApp mapping é visível pela própria clínica" 
ON public.whatsapp_clinicas 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_clinicas_updated_at
BEFORE UPDATE ON public.whatsapp_clinicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on WhatsApp number lookups
CREATE INDEX idx_whatsapp_clinicas_numero ON public.whatsapp_clinicas(numero_whatsapp);
CREATE INDEX idx_whatsapp_clinicas_clinica_id ON public.whatsapp_clinicas(clinica_id);