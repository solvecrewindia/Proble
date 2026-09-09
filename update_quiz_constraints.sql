-- =========================================================================
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR
-- Dashboard URL: https://supabase.com/dashboard/project/brtdqrzmsylfqvsyzfaf/sql
-- =========================================================================

-- 1. Drop the old restrictive check constraints on quizzes
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_type_check;
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_status_check;

-- 2. Re-create the type constraint with ALL supported quiz types
-- (Including 'live', 'originals', 'master', 'global', etc.)
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_type_check 
  CHECK (type IN (
    'master', 
    'global', 
    'live', 
    'originals',
    'course', 
    'srmist', 
    'gate', 
    'nptel', 
    'placement'
  ));

-- 3. Re-create the status constraint with ALL supported statuses
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_status_check 
  CHECK (status IN (
    'draft', 
    'active', 
    'ongoing', 
    'scheduled', 
    'paused', 
    'completed', 
    'ended'
  ));

-- 4. Enable Realtime replication for quizzes and attempts (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quizzes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
  END IF;
END $$;
