-- ==========================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- This script safely drops existing policies and enforces strict data access control.
-- Run this in your Supabase SQL Editor to secure your database against unauthorized API access.

-- 1. Enforce RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (safe drops)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

DROP POLICY IF EXISTS "Modules are viewable by everyone." ON public.modules;
DROP POLICY IF EXISTS "Faculty can insert modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can update their own modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can delete their own modules." ON public.modules;

DROP POLICY IF EXISTS "Public global quizzes are viewable by everyone." ON public.quizzes;
DROP POLICY IF EXISTS "Creators can view their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can insert quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can update their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can delete their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view active quizzes." ON public.quizzes;

DROP POLICY IF EXISTS "Questions are viewable if quiz is accessible." ON public.questions;
DROP POLICY IF EXISTS "Faculty can manage questions." ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions." ON public.questions;

DROP POLICY IF EXISTS "Users can view their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Users can update their own attempts." ON public.attempts;

DROP POLICY IF EXISTS "Users can view their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Users can insert their own results." ON public.quiz_results;

DROP POLICY IF EXISTS "Users can manage their practice." ON public.user_practice;


-- ==========================================
-- 3. PROFILES POLICIES
-- ==========================================
-- Everyone logged in can see basic public profiles (e.g. for author names on courses)
CREATE POLICY "Authenticated users can view all profiles."
ON public.profiles FOR SELECT
TO authenticated USING (true);

-- Users can only insert/update THEIR OWN profile
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id);


-- ==========================================
-- 4. MODULES POLICIES
-- ==========================================
-- Students/Authenticated users can read all active/public modules
CREATE POLICY "Authenticated users can view modules."
ON public.modules FOR SELECT
TO authenticated USING (true);

-- Only Faculty / Admin can Insert, Update, Delete modules
CREATE POLICY "Faculty can insert modules."
ON public.modules FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can update modules."
ON public.modules FOR UPDATE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can delete modules."
ON public.modules FOR DELETE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);


-- ==========================================
-- 5. QUIZZES POLICIES
-- ==========================================
-- Students/Authenticated users can read active quizzes
CREATE POLICY "Authenticated users can view active quizzes."
ON public.quizzes FOR SELECT
TO authenticated USING (status = 'active' OR status = 'completed' OR created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher')));

-- Only Faculty / Admin can Insert, Update, Delete
CREATE POLICY "Faculty can insert quizzes."
ON public.quizzes FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can update quizzes."
ON public.quizzes FOR UPDATE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can delete quizzes."
ON public.quizzes FOR DELETE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);


-- ==========================================
-- 6. QUESTIONS POLICIES
-- ==========================================
-- Students can only read questions if they are fetching a quiz they are allowed to see
CREATE POLICY "Authenticated users can view questions."
ON public.questions FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = public.questions.quiz_id)
);

-- Only Faculty / Admin can manage questions
CREATE POLICY "Faculty can insert questions."
ON public.questions FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can update questions."
ON public.questions FOR UPDATE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Faculty can delete questions."
ON public.questions FOR DELETE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);


-- ==========================================
-- 7. ATTEMPTS (Test Tracking) POLICIES
-- ==========================================
-- Users can ONLY see and update their own attempts. Faculty can see all.
CREATE POLICY "Users can view their own attempts."
ON public.attempts FOR SELECT
TO authenticated USING (
    student_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Users can insert their own attempts."
ON public.attempts FOR INSERT
TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update their own attempts."
ON public.attempts FOR UPDATE
TO authenticated USING (student_id = auth.uid());


-- ==========================================
-- 8. QUIZ RESULTS POLICIES
-- ==========================================
-- Users can ONLY see their own results. Faculty can see all.
CREATE POLICY "Users can view their own results."
ON public.quiz_results FOR SELECT
TO authenticated USING (
    student_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'teacher'))
);

CREATE POLICY "Users can insert their own results."
ON public.quiz_results FOR INSERT
TO authenticated WITH CHECK (student_id = auth.uid());


-- ==========================================
-- 9. USER PRACTICE TRACKING POLICIES
-- ==========================================
CREATE POLICY "Users can view their own practice tracking."
ON public.user_practice FOR SELECT
TO authenticated USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
);

CREATE POLICY "Users can edit their own practice tracking."
ON public.user_practice FOR ALL
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
