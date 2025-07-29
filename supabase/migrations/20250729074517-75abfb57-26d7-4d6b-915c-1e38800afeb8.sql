-- Remover a política atual restritiva da tabela clinicas
DROP POLICY IF EXISTS "Clínicas são acessíveis publicamente" ON public.clinicas;

-- Criar nova política que permite todas as operações CRUD na tabela clinicas
CREATE POLICY "Clínicas são acessíveis publicamente para todas as operações" 
ON public.clinicas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Remover a política atual restritiva da tabela whatsapp_clinicas
DROP POLICY IF EXISTS "WhatsApp mapping é visível pela própria clínica" ON public.whatsapp_clinicas;

-- Criar nova política que permite todas as operações CRUD na tabela whatsapp_clinicas
CREATE POLICY "WhatsApp mapping é acessível publicamente para todas as operações" 
ON public.whatsapp_clinicas 
FOR ALL 
USING (true) 
WITH CHECK (true);