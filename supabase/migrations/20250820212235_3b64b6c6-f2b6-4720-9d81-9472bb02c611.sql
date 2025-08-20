-- Fix email generation to handle Portuguese characters and ensure valid format
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
  
  -- Generate valid email for clinic with better character handling
  clean_clinic_name := lower(clinic_data.nome);
  -- Replace Portuguese characters
  clean_clinic_name := replace(clean_clinic_name, 'ã', 'a');
  clean_clinic_name := replace(clean_clinic_name, 'á', 'a');
  clean_clinic_name := replace(clean_clinic_name, 'à', 'a');
  clean_clinic_name := replace(clean_clinic_name, 'â', 'a');
  clean_clinic_name := replace(clean_clinic_name, 'é', 'e');
  clean_clinic_name := replace(clean_clinic_name, 'ê', 'e');
  clean_clinic_name := replace(clean_clinic_name, 'í', 'i');
  clean_clinic_name := replace(clean_clinic_name, 'ó', 'o');
  clean_clinic_name := replace(clean_clinic_name, 'ô', 'o');
  clean_clinic_name := replace(clean_clinic_name, 'õ', 'o');
  clean_clinic_name := replace(clean_clinic_name, 'ú', 'u');
  clean_clinic_name := replace(clean_clinic_name, 'ü', 'u');
  clean_clinic_name := replace(clean_clinic_name, 'ç', 'c');
  -- Remove all non-alphanumeric characters
  clean_clinic_name := regexp_replace(clean_clinic_name, '[^a-zA-Z0-9]', '', 'g');
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