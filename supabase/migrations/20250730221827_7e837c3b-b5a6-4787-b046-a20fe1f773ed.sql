-- Adicionar coluna tipo_servico na tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN tipo_servico text DEFAULT 'Consulta Geral';

-- Atualizar registros existentes com alguns tipos de serviço simulados
UPDATE public.agendamentos 
SET tipo_servico = CASE 
  WHEN random() < 0.3 THEN 'Consulta Geral'
  WHEN random() < 0.5 THEN 'Exame de Rotina'
  WHEN random() < 0.7 THEN 'Retorno'
  WHEN random() < 0.85 THEN 'Urgência'
  ELSE 'Procedimento'
END;