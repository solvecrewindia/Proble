-- Add week_id column to leaderboard for weekly resets
ALTER TABLE public.leaderboard 
ADD COLUMN IF NOT EXISTS week_id TEXT DEFAULT '2025-W1';

-- Update the primary key to be composite (user_id + week_id)
-- This allows a user to have different scores for different weeks
ALTER TABLE public.leaderboard 
DROP CONSTRAINT leaderboard_pkey;

ALTER TABLE public.leaderboard 
ADD PRIMARY KEY (user_id, week_id);
