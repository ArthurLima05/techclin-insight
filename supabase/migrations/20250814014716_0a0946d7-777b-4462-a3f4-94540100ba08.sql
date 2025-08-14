-- Remover tabelas criadas hoje
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Remover funções relacionadas ao sistema de autenticação
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);
DROP FUNCTION IF EXISTS public.create_user_session(uuid, inet, text);
DROP FUNCTION IF EXISTS public.validate_session(text);
DROP FUNCTION IF EXISTS public.enhanced_audit_trigger();

-- Manter apenas as funções necessárias para o sistema original
-- Voltar ao sistema simples apenas com chave de acesso