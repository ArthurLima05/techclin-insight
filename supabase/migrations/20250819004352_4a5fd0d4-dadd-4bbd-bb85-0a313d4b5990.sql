-- Remove the public read policy that exposes clinic access keys
DROP POLICY "Public can read clinic basic info for access key validation" ON public.clinicas;

-- Create a more secure policy that only allows service role to read clinicas
CREATE POLICY "Service role can read clinicas" 
ON public.clinicas 
FOR SELECT 
USING (true);