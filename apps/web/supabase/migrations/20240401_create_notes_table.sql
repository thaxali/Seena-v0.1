-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    interview_id UUID REFERENCES public.interviews(id) NOT NULL,
    question_id TEXT,
    sub_question_id TEXT,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view notes for their interviews"
    ON public.notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = notes.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert notes for their interviews"
    ON public.notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = notes.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update notes for their interviews"
    ON public.notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = notes.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete notes for their interviews"
    ON public.notes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = notes.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Create a trigger to set updated_at on update
CREATE TRIGGER handle_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 