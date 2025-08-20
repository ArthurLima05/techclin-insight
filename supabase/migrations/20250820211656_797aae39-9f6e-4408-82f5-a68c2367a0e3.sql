-- Fix the authenticate_clinic_user_secure function to generate valid emails
CREATE OR REPLACE FUNCTION public.authenticate_clinic_user_secure(p_access_key text)
 RETURNS TABLE(clinic_id uuid, clinic_name text, user_email text, user_password text, clinic_features jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clinic_data record;
  clean_clinic_name text;
  user_email text;
BEGIN
  -- Get clinic data by access key
  SELECT id, nome, dashboard_ativo, feedbacks_ativos, agenda_ativa
  INTO clinic_data
  FROM public.clinicas
  WHERE chave_acesso = p_access_key;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Generate valid email for clinic (remove special characters and spaces)
  clean_clinic_name := lower(regexp_replace(clinic_data.nome, '[^a-zA-Z0-9]', '', 'g'));
  -- Ensure the email has a valid format
  user_email := clean_clinic_name || '@techclin.com';
  
  -- Return clinic authentication data
  RETURN QUERY SELECT 
    clinic_data.id,
    clinic_data.nome,
    user_email,
    'TechClin2024!'::text as user_password,
    jsonb_build_object(
      'dashboard_ativo', clinic_data.dashboard_ativo,
      'feedbacks_ativos', clinic_data.feedbacks_ativos,
      'agenda_ativa', clinic_data.agenda_ativa
    );
END;
$function$;