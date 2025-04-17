-- Enable Row Level Security
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

-- Create policies for studies table
CREATE POLICY "Users can view their own studies"
    ON public.studies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own studies"
    ON public.studies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own studies"
    ON public.studies FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own studies"
    ON public.studies FOR DELETE
    USING (auth.uid() = user_id); 