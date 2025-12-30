-- Resets the Leaderboard (XP) for all users
TRUNCATE TABLE leaderboard;

-- Note: We now DELETE daily_challenges as requested to wipe all content.
TRUNCATE TABLE daily_challenges;

-- Verify deletion
SELECT count(*) as total_scores FROM leaderboard;
