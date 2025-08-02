-- Add missing updated_at column to metricas_diarias table
ALTER TABLE public.metricas_diarias 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_metricas_diarias_updated_at
BEFORE UPDATE ON public.metricas_diarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();