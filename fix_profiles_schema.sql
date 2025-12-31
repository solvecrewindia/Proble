-- Ensure all required columns exist in the profiles table

-- 1. Add full_name if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Add avatar_url if missing (based on the error message)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Add other potentially missing columns just in case
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'English';

-- 4. Notifying PostgREST to reload schema is usually automatic on DDL changes,
-- but if using the Dashboard, you might need to click "Reload Schema Cache" in Settings > API if issues persist.
