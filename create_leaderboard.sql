
-- Create leaderboard table to store user scores
CREATE TABLE IF NOT EXISTS public.leaderboard (
    user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read the leaderboard
CREATE POLICY "Public read access" 
ON public.leaderboard FOR SELECT 
USING (true);

-- Allow authenticated users to insert/update their OWN score
CREATE POLICY "User update own score" 
ON public.leaderboard FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Create a view if you want easy joins, 
-- but we can just do a select(..., profiles(username, avatar_url)) in JS
