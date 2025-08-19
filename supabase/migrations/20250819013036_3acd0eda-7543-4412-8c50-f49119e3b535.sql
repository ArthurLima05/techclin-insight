-- Fix RLS policies for profiles table to allow anonymous users to create their profiles

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Anonymous users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users can update their own profile" ON public.profiles;

-- Create correct policies for clinic users
CREATE POLICY "Clinic users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Clinic users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Update the login flow to handle authentication properly
-- Create a function to properly handle clinic user creation
CREATE OR REPLACE FUNCTION create_clinic_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_clinica_id UUID,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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