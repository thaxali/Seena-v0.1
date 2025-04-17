-- Remove full_name column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name; 