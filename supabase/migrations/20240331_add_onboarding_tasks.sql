-- Create onboarding_tasks table
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    task_id TEXT NOT NULL,
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, task_id)
);

-- Enable Row Level Security
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tasks"
    ON public.onboarding_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON public.onboarding_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON public.onboarding_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a trigger to set updated_at on update
CREATE TRIGGER handle_onboarding_tasks_updated_at
    BEFORE UPDATE ON public.onboarding_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 