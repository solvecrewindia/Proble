-- Run this in your Supabase SQL Editor to fix the constraint issue

-- 1. First, find out if there are any other unexpected types (Optional but helpful)
-- SELECT DISTINCT type FROM public.quizzes;

-- 2. Drop existing constraints
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_type_check;
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_status_check;

-- 3. Add updated, inclusive constraints
-- This includes all values used by both Faculty and Admin flows
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_type_check 
  CHECK (type IN (
    'master', 'global', 'live', 
    'nptel', 'gate', 'srmist', 'placement', 'course'
  ));

ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_status_check 
  CHECK (status IN (
    'draft', 'active', 'paused', 'completed', 
    'ongoing', 'scheduled', 'ended'
  ));

-- NOTE: If this still fails, it means you have a row with a value not listed above.
-- You can run this to find the offending rows:
-- SELECT id, title, type, status FROM public.quizzes 
-- WHERE type NOT IN ('master', 'global', 'live', 'nptel', 'gate', 'srmist', 'placement', 'course')
-- OR status NOT IN ('draft', 'active', 'paused', 'completed', 'ongoing', 'scheduled', 'ended');
