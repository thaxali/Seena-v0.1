-- Add missing columns to studies table
ALTER TABLE public.studies
ADD COLUMN IF NOT EXISTS interview_questions TEXT,
ADD COLUMN IF NOT EXISTS research_questions TEXT,
ADD COLUMN IF NOT EXISTS interview_structure TEXT,
ADD COLUMN IF NOT EXISTS interview_format TEXT,
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS locked_fields TEXT[],
ADD COLUMN IF NOT EXISTS inception_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"max_participants": 10, "duration_days": 30, "compensation": ""}'::jsonb; 