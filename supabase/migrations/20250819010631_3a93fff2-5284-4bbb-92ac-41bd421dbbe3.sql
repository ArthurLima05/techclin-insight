-- Remove the dangerous policy that allows anonymous access to all clinics data
DROP POLICY IF EXISTS "Allow anon to manage clinicas for admin interface" ON public.clinicas;

-- Remove existing policies that allow public access to patient data
DROP POLICY IF EXISTS "Clinic members can manage their agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Clinic members can manage their feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Clinic members can manage their medicos" ON public.medicos;
DROP POLICY IF EXISTS "Clinic members can manage their whatsapp" ON public.whatsapp_clinicas;
DROP POLICY IF EXISTS "Clinic members can manage their metricas" ON public.metricas_diarias;
DROP POLICY IF EXISTS "Clinic members can read their oauth tokens" ON public.google_oauth_tokens;

-- Create a profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email text NOT NULL,
    full_name text,
    clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'clinic_user',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's clinic ID
CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT clinica_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

-- Create security definer function to check if user belongs to clinic
CREATE OR REPLACE FUNCTION public.user_belongs_to_clinic(clinic_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND clinica_id = clinic_uuid AND active = true
    );
$$;

-- Create new secure RLS policies for agendamentos
CREATE POLICY "Users can only access agendamentos from their clinic"
ON public.agendamentos
FOR ALL
TO authenticated
USING (public.user_belongs_to_clinic(clinica_id))
WITH CHECK (public.user_belongs_to_clinic(clinica_id));

-- Create new secure RLS policies for feedbacks  
CREATE POLICY "Users can only access feedbacks from their clinic"
ON public.feedbacks
FOR ALL
TO authenticated
USING (public.user_belongs_to_clinic(clinica_id))
WITH CHECK (public.user_belongs_to_clinic(clinica_id));

-- Create new secure RLS policies for medicos
CREATE POLICY "Users can only access medicos from their clinic"
ON public.medicos
FOR ALL
TO authenticated
USING (public.user_belongs_to_clinic(clinica_id))
WITH CHECK (public.user_belongs_to_clinic(clinica_id));

-- Create new secure RLS policies for whatsapp_clinicas
CREATE POLICY "Users can only access whatsapp from their clinic"
ON public.whatsapp_clinicas
FOR ALL
TO authenticated
USING (public.user_belongs_to_clinic(clinica_id))
WITH CHECK (public.user_belongs_to_clinic(clinica_id));

-- Create new secure RLS policies for metricas_diarias
CREATE POLICY "Users can only access metricas from their clinic"
ON public.metricas_diarias
FOR ALL
TO authenticated
USING (public.user_belongs_to_clinic(clinica_id))
WITH CHECK (public.user_belongs_to_clinic(clinica_id));

-- Create new secure RLS policies for clinicas (only authenticated users from that clinic)
CREATE POLICY "Users can only access their own clinic"
ON public.clinicas
FOR SELECT
TO authenticated
USING (id = public.get_user_clinica_id());

CREATE POLICY "Admins can manage clinicas"
ON public.clinicas
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Create secure RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Restrict google_oauth_tokens to service role only (remove public access)
CREATE POLICY "Only service role can access oauth tokens"
ON public.google_oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger for updating profiles updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();