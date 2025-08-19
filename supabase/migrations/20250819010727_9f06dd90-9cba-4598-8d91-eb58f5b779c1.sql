-- Fix search path for security functions to prevent warnings
CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT clinica_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_clinic(clinic_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND clinica_id = clinic_uuid AND active = true
    );
$$;