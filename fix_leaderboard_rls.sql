-- ============================================================
-- FIX: Leaderboard RLS - Allow students to see all results
-- ============================================================
-- The leaderboard was showing only 1 player because RLS on
-- quiz_results blocked students from reading other students' rows.
-- This adds a public read policy so ALL authenticated users can
-- see scores for any quiz (names are still only shown via the
-- profiles join which itself has public read access).
-- ============================================================

-- 1. Drop any existing restrictive SELECT policy on quiz_results
DROP POLICY IF EXISTS "Students can view their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Users can view their own quiz results." ON public.quiz_results;
DROP POLICY IF EXISTS "Students can only see their own results" ON public.quiz_results;

-- 2. Allow ALL authenticated users to read quiz_results (needed for leaderboard)
CREATE POLICY "Leaderboard: all authenticated users can read quiz results"
  ON public.quiz_results FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Keep insert/update restricted to the student's own row
DROP POLICY IF EXISTS "Students can insert their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Students can update their own results." ON public.quiz_results;

CREATE POLICY "Students can insert their own results."
  ON public.quiz_results FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own results."
  ON public.quiz_results FOR UPDATE
  USING (auth.uid() = student_id);

-- ============================================================
-- ALSO FIX: attempts table RLS so faculty can see all attempts
-- (needed for the teacher-side participation stats)
-- ============================================================
DROP POLICY IF EXISTS "Faculty can view all attempts for their quizzes." ON public.attempts;

CREATE POLICY "Faculty can view all attempts for their quizzes."
  ON public.attempts FOR SELECT
  USING (
    -- Student sees own attempts
    auth.uid() = student_id
    OR
    -- Faculty/teacher sees all attempts for quizzes they created
    auth.uid() IN (SELECT created_by FROM public.quizzes WHERE id = quiz_id)
  );
