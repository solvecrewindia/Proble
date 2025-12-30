-- cleanup_challenges.sql
-- This script sets up a scheduled job to delete old daily challenges.
-- Requires pg_cron extension.

-- 1. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule a daily cleanup job
-- Runs every day at 00:00 (Midnight)
-- Deletes challenges where the date is older than today.

SELECT cron.schedule(
    'delete_old_challenges', -- Job Name
    '0 0 * * *',             -- Cron Schedule (Midnight daily)
    $$DELETE FROM daily_challenges WHERE date < CURRENT_DATE$$ -- SQL Command
);

-- NOTE: To verify, run: SELECT * FROM cron.job;
