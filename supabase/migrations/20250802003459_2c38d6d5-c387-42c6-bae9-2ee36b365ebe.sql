-- Remover a constraint antiga que não inclui "agendado"
ALTER TABLE public.agendamentos DROP CONSTRAINT agendamentos_status_check;