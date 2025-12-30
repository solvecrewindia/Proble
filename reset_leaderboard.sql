-- Clear all entries from the leaderboard table
TRUNCATE TABLE public.leaderboard;

-- Alternatively, if you want to keep the rows but reset scores to 0:
-- UPDATE public.leaderboard SET total_xp = 0;
