-- Add bio, department, location, and website columns to public.profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- (Optional) Update existing faculty profiles with placeholder department if empty
UPDATE public.profiles 
SET department = 'Faculty' 
WHERE role IN ('faculty', 'teacher') AND department IS NULL;
