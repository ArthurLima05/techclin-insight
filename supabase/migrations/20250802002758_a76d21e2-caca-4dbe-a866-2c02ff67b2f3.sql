-- Remover a coluna tipo_servico da tabela agendamentos
ALTER TABLE public.agendamentos DROP COLUMN tipo_servico;

-- Atualizar o valor padrão do status para "agendado"
ALTER TABLE public.agendamentos ALTER COLUMN status SET DEFAULT 'agendado';

-- Adicionar uma constraint para validar os valores de status permitidos
ALTER TABLE public.agendamentos ADD CONSTRAINT check_status_values 
CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'falta'));