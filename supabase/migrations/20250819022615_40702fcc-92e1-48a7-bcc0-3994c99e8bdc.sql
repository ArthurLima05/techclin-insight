-- Limpar dados antigos e criar usuários de teste confirmados
-- Primeiro, vamos verificar e limpar perfis antigos
DELETE FROM public.profiles WHERE email LIKE 'clinic_%@techclin.com';

-- Criar usuários de teste já confirmados para cada clínica
DO $$
DECLARE
    clinic_record RECORD;
    clinic_email TEXT;
    new_user_id UUID;
BEGIN
    -- Para cada clínica, criar um usuário
    FOR clinic_record IN 
        SELECT id, nome FROM public.clinicas 
        WHERE chave_acesso IN ('CLINICA_A_2024', 'CLINICA_B_2024', 'CLINICA_C_2024')
    LOOP
        clinic_email := 'clinic_' || clinic_record.id || '@techclin.com';
        
        -- Inserir usuário no auth.users (já confirmado)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            clinic_email,
            crypt('password123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) 
        ON CONFLICT (email) DO UPDATE SET
            encrypted_password = crypt('password123', gen_salt('bf')),
            email_confirmed_at = now(),
            updated_at = now()
        RETURNING id INTO new_user_id;
        
        -- Se foi UPDATE, pegar o ID existente
        IF new_user_id IS NULL THEN
            SELECT id INTO new_user_id FROM auth.users WHERE email = clinic_email;
        END IF;
        
        -- Criar perfil correspondente
        INSERT INTO public.profiles (
            user_id,
            email,
            clinica_id,
            role,
            full_name,
            active
        ) VALUES (
            new_user_id,
            clinic_email,
            clinic_record.id,
            'clinic_user',
            'Usuario da ' || clinic_record.nome,
            true
        ) ON CONFLICT (user_id) DO UPDATE SET
            clinica_id = EXCLUDED.clinica_id,
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            active = true,
            updated_at = now();
    END LOOP;
END $$;