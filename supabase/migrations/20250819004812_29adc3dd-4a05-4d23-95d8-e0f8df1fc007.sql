-- Allow anon role to manage clinicas for admin interface
-- Since there's no authentication system, we need to allow basic CRUD operations
-- but we'll restrict sensitive data exposure

CREATE POLICY "Allow anon to manage clinicas for admin interface" 
ON public.clinicas 
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);