-- Criar tabela de clínicas
CREATE TABLE public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  chave_acesso TEXT NOT NULL UNIQUE,
  agenda_ativa BOOLEAN NOT NULL DEFAULT false,
  feedbacks_ativos BOOLEAN NOT NULL DEFAULT false,
  dashboard_ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de feedbacks
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente TEXT NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  profissional TEXT NOT NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de agendamentos
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente TEXT NOT NULL,
  profissional TEXT NOT NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  origem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'cancelado', 'falta', 'realizado')),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de métricas diárias
CREATE TABLE public.metricas_diarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  faltas_total INTEGER NOT NULL DEFAULT 0,
  volume_por_profissional JSONB,
  taxa_retorno DECIMAL(5,2),
  tempo_medio_agendamento INTEGER, -- em horas
  origens JSONB,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data, clinica_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clínicas (acesso público para login)
CREATE POLICY "Clínicas são acessíveis publicamente" 
ON public.clinicas 
FOR SELECT 
USING (true);

-- Políticas RLS para feedbacks
CREATE POLICY "Feedbacks são visíveis pela própria clínica" 
ON public.feedbacks 
FOR ALL 
USING (true); -- Permitindo acesso total por enquanto, será refinado com autenticação

-- Políticas RLS para agendamentos
CREATE POLICY "Agendamentos são visíveis pela própria clínica" 
ON public.agendamentos 
FOR ALL 
USING (true); -- Permitindo acesso total por enquanto, será refinado com autenticação

-- Políticas RLS para métricas
CREATE POLICY "Métricas são visíveis pela própria clínica" 
ON public.metricas_diarias 
FOR ALL 
USING (true); -- Permitindo acesso total por enquanto, será refinado com autenticação

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO public.clinicas (nome, chave_acesso, dashboard_ativo, feedbacks_ativos, agenda_ativa) VALUES
('Clínica São Paulo', 'CLINICA_A_2024', true, false, false),
('Clínica Bem Estar', 'CLINICA_B_2024', true, true, false),
('Clínica Complete Care', 'CLINICA_C_2024', true, true, true);

-- Inserir feedbacks de exemplo
INSERT INTO public.feedbacks (paciente, nota, comentario, profissional, clinica_id) VALUES
('Maria Silva', 5, 'Excelente atendimento, muito satisfeita!', 'Dr. João Santos', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_B_2024')),
('José Oliveira', 2, 'Atendimento demorado, não gostei.', 'Dra. Ana Costa', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_B_2024')),
('Carlos Ferreira', 4, 'Bom atendimento, recomendo.', 'Dr. João Santos', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_C_2024')),
('Ana Rodrigues', 1, 'Muito insatisfeita com o atendimento.', 'Dra. Ana Costa', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_C_2024'));

-- Inserir agendamentos de exemplo
INSERT INTO public.agendamentos (paciente, profissional, data, horario, origem, status, clinica_id) VALUES
('Maria Silva', 'Dr. João Santos', '2024-01-15', '09:00', 'Instagram', 'realizado', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_A_2024')),
('José Oliveira', 'Dra. Ana Costa', '2024-01-16', '14:30', 'WhatsApp', 'falta', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_B_2024')),
('Carlos Ferreira', 'Dr. João Santos', '2024-01-17', '10:15', 'Indicação', 'confirmado', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_C_2024')),
('Ana Rodrigues', 'Dra. Ana Costa', '2024-01-18', '16:00', 'WhatsApp', 'cancelado', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_C_2024'));

-- Inserir métricas de exemplo
INSERT INTO public.metricas_diarias (data, faltas_total, volume_por_profissional, taxa_retorno, tempo_medio_agendamento, origens, clinica_id) VALUES
('2024-01-15', 1, '{"Dr. João Santos": 3, "Dra. Ana Costa": 2}', 75.50, 48, '{"Instagram": 2, "WhatsApp": 2, "Indicação": 1}', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_A_2024')),
('2024-01-16', 2, '{"Dr. João Santos": 4, "Dra. Ana Costa": 3}', 80.25, 36, '{"Instagram": 1, "WhatsApp": 4, "Indicação": 2}', (SELECT id FROM public.clinicas WHERE chave_acesso = 'CLINICA_B_2024'));