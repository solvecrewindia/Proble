-- ==============================================================================
-- PROBLE 3.0: COMPLETE & IDEMPOTENT SUPABASE DATABASE SETUP SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor.
-- It is safe to run multiple times (uses IF NOT EXISTS, DROP IF EXISTS, ADD IF NOT EXISTS).
-- ==============================================================================

-- 1. PROFILES TABLE & EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  name TEXT,
  full_name TEXT,
  registration_number TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'faculty')),
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'English',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add any missing columns to profiles if table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English';

-- 2. MODULES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Global',
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. QUIZZES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'global' CHECK (type IN ('master', 'global', 'placement', 'originals', 'course')),
  code TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  settings JSONB DEFAULT '{}'::jsonb,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  type TEXT DEFAULT 'mcq',
  image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'mcq';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. ATTEMPTS TABLE (Tracks live & in-progress participation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed')),
  score INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_student_quiz ON public.attempts(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON public.attempts(quiz_id);

-- 6. QUIZ_RESULTS TABLE (Authoritative test submissions & scores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Clean up duplicates before applying unique constraint if any exist
DELETE FROM public.quiz_results
WHERE id NOT IN (
    SELECT DISTINCT ON (student_id, quiz_id) id
    FROM public.quiz_results
    ORDER BY student_id, quiz_id, created_at ASC
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_quiz_results_student_quiz'
    ) THEN
        ALTER TABLE public.quiz_results ADD CONSTRAINT uq_quiz_results_student_quiz UNIQUE (student_id, quiz_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON public.quiz_results(student_id);

-- 7. USER_PRACTICE & QUIZ_RATINGS TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_practice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_quiz_ratings_user_quiz UNIQUE (user_id, quiz_id)
);

-- 8. PROBLEM_REQUESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.problem_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT DEFAULT 'Student',
  type TEXT,
  description TEXT,
  details TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. DAILY_CHALLENGES & LEADERBOARD TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  date DATE PRIMARY KEY DEFAULT current_date,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.leaderboard (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_id TEXT DEFAULT '2025-W1' NOT NULL,
  total_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, week_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users see own, Admins see all, others see basic" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Modules Policies
DROP POLICY IF EXISTS "Modules are viewable by everyone." ON public.modules;
DROP POLICY IF EXISTS "Faculty and admin can manage modules." ON public.modules;

CREATE POLICY "Modules are viewable by everyone." ON public.modules FOR SELECT USING (true);
CREATE POLICY "Faculty and admin can manage modules." ON public.modules FOR ALL USING (
  auth.role() = 'authenticated'
);

-- 3. Quizzes Policies
DROP POLICY IF EXISTS "Public global quizzes are viewable by everyone." ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes viewable by authenticated users" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can manage quizzes." ON public.quizzes;

CREATE POLICY "Quizzes viewable by authenticated users" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Faculty can manage quizzes." ON public.quizzes FOR ALL USING (
  auth.role() = 'authenticated'
);

-- 4. Questions Policies
DROP POLICY IF EXISTS "Questions are viewable by everyone who can view the quiz." ON public.questions;
DROP POLICY IF EXISTS "Faculty can manage questions." ON public.questions;

CREATE POLICY "Questions are viewable by everyone who can view the quiz." ON public.questions FOR SELECT USING (true);
CREATE POLICY "Faculty can manage questions." ON public.questions FOR ALL USING (
  auth.role() = 'authenticated'
);

-- 5. Attempts Policies
DROP POLICY IF EXISTS "Students can view their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Faculty can view all attempts for their quizzes." ON public.attempts;
DROP POLICY IF EXISTS "Attempts viewable by authenticated users" ON public.attempts;
DROP POLICY IF EXISTS "Students can insert their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Students can update their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Faculty and admin can manage attempts." ON public.attempts;

CREATE POLICY "Attempts viewable by authenticated users" ON public.attempts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Students can insert their own attempts." ON public.attempts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update their own attempts." ON public.attempts FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Faculty and admin can manage attempts." ON public.attempts FOR ALL USING (auth.role() = 'authenticated');

-- 6. Quiz Results Policies
DROP POLICY IF EXISTS "Leaderboard: all authenticated users can read quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Students can insert their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Students can update their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Faculty and admin can manage results." ON public.quiz_results;

CREATE POLICY "Leaderboard: all authenticated users can read quiz results" ON public.quiz_results FOR SELECT USING (true);
CREATE POLICY "Students can insert their own results." ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update their own results." ON public.quiz_results FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Faculty and admin can manage results." ON public.quiz_results FOR ALL USING (auth.role() = 'authenticated');

-- 7. User Practice Policies
DROP POLICY IF EXISTS "Users can manage their practice list" ON public.user_practice;
CREATE POLICY "Users can manage their practice list" ON public.user_practice FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Quiz Ratings Policies
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.quiz_ratings;
DROP POLICY IF EXISTS "Users can manage their own rating" ON public.quiz_ratings;
CREATE POLICY "Ratings are viewable by everyone" ON public.quiz_ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own rating" ON public.quiz_ratings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Daily Challenges & Leaderboard Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.daily_challenges;
DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON public.daily_challenges;
CREATE POLICY "Allow read access to authenticated users" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "Allow insert access to authenticated users" ON public.daily_challenges FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access" ON public.leaderboard;
DROP POLICY IF EXISTS "User update own score" ON public.leaderboard;
CREATE POLICY "Public read access" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "User update own score" ON public.leaderboard FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Problem Requests Policies
DROP POLICY IF EXISTS "Problem requests viewable and manageable" ON public.problem_requests;
CREATE POLICY "Problem requests viewable and manageable" ON public.problem_requests FOR ALL USING (auth.role() = 'authenticated');

-- ==============================================================================
-- STORED PROCEDURES / RPC FUNCTIONS
-- ==============================================================================

-- RPC: Zero-Trust Server-Side Answer Evaluation Function
CREATE OR REPLACE FUNCTION public.evaluate_quiz_answers(
    p_quiz_id UUID,
    p_student_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question RECORD;
    v_score INTEGER := 0;
    v_total_questions INTEGER := 0;
    v_student_answer JSONB;
    v_correct_answer TEXT;
BEGIN
    FOR v_question IN 
        SELECT id, correct_answer, type
        FROM public.questions
        WHERE quiz_id::text = p_quiz_id::text
    LOOP
        v_total_questions := v_total_questions + 1;
        v_student_answer := p_student_answers->(v_question.id::TEXT);
        v_correct_answer := v_question.correct_answer;

        IF v_student_answer IS NOT NULL THEN
            IF TRIM(BOTH '"' FROM v_student_answer::TEXT) = v_correct_answer THEN
                v_score := v_score + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'score', v_score,
        'total_questions', v_total_questions,
        'percentage', CASE WHEN v_total_questions > 0 THEN (v_score::NUMERIC / v_total_questions::NUMERIC) * 100 ELSE 0 END
    );
END;
$$;

-- RPC: Get Safe Questions (Excludes correct answers for students)
CREATE OR REPLACE FUNCTION public.get_safe_questions(p_quiz_id UUID)
RETURNS TABLE (
  id UUID,
  text TEXT,
  choices JSONB,
  type TEXT,
  image_url TEXT,
  tags TEXT[]
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.choices, q.type, q.image_url, q.tags
  FROM public.questions q
  WHERE q.quiz_id::text = p_quiz_id::text;
END;
$$ LANGUAGE plpgsql;
