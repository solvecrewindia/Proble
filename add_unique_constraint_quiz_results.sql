-- ============================================================
-- Migration: Enforce single attempt per student per quiz
-- ============================================================
-- This adds a UNIQUE constraint on (student_id, quiz_id) to the
-- quiz_results table so that even if someone bypasses the frontend
-- check (incognito, cleared localStorage, etc.), the database
-- itself will reject a second submission.
-- ============================================================

-- 1. Clean up any existing duplicate rows BEFORE adding the constraint.
--    Keep only the FIRST submission (earliest created_at) for each student+quiz.
DELETE FROM public.quiz_results
WHERE id NOT IN (
    SELECT DISTINCT ON (student_id, quiz_id) id
    FROM public.quiz_results
    ORDER BY student_id, quiz_id, created_at ASC
);

-- 2. Add the unique constraint.
--    ON CONFLICT with this constraint will be used by the frontend upsert.
ALTER TABLE public.quiz_results
ADD CONSTRAINT uq_quiz_results_student_quiz UNIQUE (student_id, quiz_id);

-- 3. (Optional) Add an index for fast lookups when checking attempts.
--    The unique constraint already creates an index, but this is explicit.
-- CREATE INDEX IF NOT EXISTS idx_quiz_results_student_quiz
--     ON public.quiz_results(student_id, quiz_id);
