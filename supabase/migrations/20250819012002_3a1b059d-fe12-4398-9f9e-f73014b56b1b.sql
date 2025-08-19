-- Habilitar autenticação anônima e ajustar políticas RLS
-- Primeiro, vamos garantir que a autenticação anônima está habilitada (isso é feito via dashboard)

-- Criar função para obter ou criar perfil do usuário da clínica
CREATE OR REPLACE FUNCTION public.ensure_clinic_user_profile(clinic_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Verificar se já existe um perfil para este usuário
    SELECT id INTO profile_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Se não existir, criar um
    IF profile_id IS NULL THEN
        INSERT INTO public.profiles (
            user_id,
            email,
            clinica_id,
            role,
            full_name,
            active
        ) VALUES (
            auth.uid(),
            COALESCE(auth.email(), 'clinic_user_' || auth.uid()::text || '@temp.com'),
            clinic_uuid,
            'clinic_user',
            'Usuário da Clínica',
            true
        ) RETURNING id INTO profile_id;
    ELSE
        -- Atualizar a clínica se necessário
        UPDATE public.profiles 
        SET clinica_id = clinic_uuid,
            updated_at = now()
        WHERE id = profile_id;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- Criar trigger para criar perfil automaticamente quando necessário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- O perfil será criado quando necessário pela função ensure_clinic_user_profile
    RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar política específica para usuários anônimos
CREATE POLICY "Anonymous users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários anônimos vejam apenas seu próprio perfil
CREATE POLICY "Anonymous users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Permitir que usuários anônimos atualizem apenas seu próprio perfil
CREATE POLICY "Anonymous users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Garantir que as tabelas tenham RLS habilitada
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;