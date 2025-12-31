-- Add full_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- Update RLS policies if needed (usually select * policies cover new columns automatically)
-- Ensuring policies allow update of this new column
-- (The existing "Users can update own profile" policy should cover it)
