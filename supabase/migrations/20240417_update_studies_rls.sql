-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own studies" ON public.studies;

-- Create new insert policy that allows both authenticated users and service role
CREATE POLICY "Users can insert their own studies"
    ON public.studies FOR INSERT
    WITH CHECK (
        (auth.role() = 'authenticated' AND auth.uid() = user_id) OR
        auth.role() = 'service_role'
    ); 