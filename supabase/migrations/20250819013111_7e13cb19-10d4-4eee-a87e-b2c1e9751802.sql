-- Fix the create_clinic_user_profile function security and search path
CREATE OR REPLACE FUNCTION create_clinic_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_clinica_id UUID,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, clinica_id, role, full_name, active)
  VALUES (p_user_id, p_email, p_clinica_id, 'clinic_user', p_full_name, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    clinica_id = EXCLUDED.clinica_id,
    full_name = EXCLUDED.full_name,
    active = EXCLUDED.active,
    updated_at = now();
END;
$$;