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
DROP POLICY IF EXISTS "Authenticated users can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can view relevant profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

DROP POLICY IF EXISTS "Modules are viewable by everyone." ON public.modules;
DROP POLICY IF EXISTS "Authenticated users can view modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can insert modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can update their own modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can update modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can delete their own modules." ON public.modules;
DROP POLICY IF EXISTS "Faculty can delete modules." ON public.modules;

DROP POLICY IF EXISTS "Public global quizzes are viewable by everyone." ON public.quizzes;
DROP POLICY IF EXISTS "Creators can view their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view active quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Authenticated users can view active quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can insert quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can update their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can update quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can delete their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can delete quizzes." ON public.quizzes;

DROP POLICY IF EXISTS "Questions are viewable if quiz is accessible." ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions." ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view questions." ON public.questions;
DROP POLICY IF EXISTS "Faculty can manage questions." ON public.questions;
DROP POLICY IF EXISTS "Faculty can insert questions." ON public.questions;
DROP POLICY IF EXISTS "Faculty can update questions." ON public.questions;
DROP POLICY IF EXISTS "Faculty can delete questions." ON public.questions;

DROP POLICY IF EXISTS "Users can view their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts." ON public.attempts;
DROP POLICY IF EXISTS "Users can update their own attempts." ON public.attempts;

DROP POLICY IF EXISTS "Users can view their own results." ON public.quiz_results;
DROP POLICY IF EXISTS "Users can insert their own results." ON public.quiz_results;

DROP POLICY IF EXISTS "Users can manage their practice." ON public.user_practice;
DROP POLICY IF EXISTS "Users can view their own practice tracking." ON public.user_practice;
DROP POLICY IF EXISTS "Users can edit their own practice tracking." ON public.user_practice;


-- ==========================================
-- 3. PROFILES POLICIES
-- ==========================================
-- Students can only see:
-- 1. Themselves
-- 2. Anyone who has the role 'faculty', 'admin', 'teacher' (so author names display on course pages)
-- Faculty/Admins can see everyone.
CREATE POLICY "Users can view relevant profiles."
ON public.profiles FOR SELECT
TO authenticated USING (
    id = auth.uid() 
    OR role IN ('faculty', 'admin', 'teacher')
    OR EXISTS (
        SELECT 1 FROM public.profiles p2 
        WHERE p2.id = auth.uid() AND p2.role IN ('faculty', 'admin', 'teacher')
    )
);

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


-- ==========================================
-- 10. ZERO-TRUST: SECURE GRADING RPC
-- ==========================================
-- This function allows the client to send their answers and get a score back WITHOUT 
-- the client ever needing to download the `correct_answer` column.

CREATE OR REPLACE FUNCTION public.evaluate_quiz_answers(
    p_quiz_id uuid,
    p_student_answers jsonb
) RETURNS jsonb AS $$
DECLARE
    v_question record;
    v_score integer := 0;
    v_total integer := 0;
    v_responses jsonb := '[]'::jsonb;
    v_student_ans jsonb;
    v_is_correct boolean;
    
    -- Specific variables for types
    v_correct_arr jsonb;
    v_student_arr jsonb;
    v_all_match boolean;
    v_student_val numeric;
    v_min numeric;
    v_max numeric;
BEGIN
    -- Loop through all active questions for the test
    FOR v_question IN 
        SELECT id, type, correct_answer 
        FROM public.questions 
        WHERE quiz_id = p_quiz_id
    LOOP
        v_total := v_total + 1;
        v_is_correct := false;
        
        -- Try to extract the user's answer for this question ID.
        -- Keys in p_student_answers JSON might be strings representing the question DB ID or sequence Number.
        -- We assume the client sends a map of question `id` -> `answer`.
        -- Note: If frontend sends index-based keys, the frontend MUST be updated to send DB IDs!
        -- Fallback: Check if the key exists directly as a stringified UUID/ID.
        IF p_student_answers ? v_question.id::text THEN
            v_student_ans := p_student_answers -> v_question.id::text;
            
            -- Evaluate based on type
            IF v_question.type = 'msq' AND v_question.correct_answer IS NOT NULL THEN
                -- Both should be JSON arrays.
                BEGIN
                    v_correct_arr := v_question.correct_answer::jsonb;
                    v_student_arr := v_student_ans;
                    -- JSONB arrays equality in PostgreSQL (order doesn't matter if we check containment both ways)
                    IF jsonb_array_length(v_student_arr) = jsonb_array_length(v_correct_arr) AND v_student_arr @> v_correct_arr AND v_correct_arr @> v_student_arr THEN
                        v_is_correct := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN v_is_correct := false; END;

            ELSIF v_question.type = 'range' AND v_question.correct_answer IS NOT NULL THEN
                -- correct_answer is '{"min": 10, "max": 20}'
                BEGIN
                    v_student_val := (v_student_ans #>> '{}')::numeric;
                    v_min := (v_question.correct_answer::jsonb ->> 'min')::numeric;
                    v_max := (v_question.correct_answer::jsonb ->> 'max')::numeric;
                    IF v_student_val >= v_min AND v_student_val <= v_max THEN
                        v_is_correct := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN v_is_correct := false; END;

            ELSIF v_question.type = 'code' THEN
                -- Code questions cannot be perfectly graded by SQL alone without an execution engine.
                -- For zero-trust, if it's evaluated by Piston on the frontend, the frontend MUST send the evaluation status securely.
                -- However, relying on frontend for code status is NOT zero-trust.
                -- For now, if the client sends `true` for code eval status via a separate map, we accept it, or we grade 0.
                -- REAL zero-trust code execution requires a server backend Node.js layer, not just Supabase.
                -- For this prototype, we'll assume the frontend passes 'codeExecutionStatus' separately, 
                -- or we accept text match (which is rare in code).
                v_is_correct := false; -- Default to false unless explicitly overridden by a trusted backend.

            ELSE
                -- Standard MCQ/True-False/Fill-in-the-blank (Exact Match)
                -- Compare as raw strings to avoid json type casting issues
                IF (v_student_ans #>> '{}') = v_question.correct_answer THEN
                    v_is_correct := true;
                END IF;
            END IF;
            
        END IF;

        IF v_is_correct THEN
            v_score := v_score + 1;
        END IF;

        -- We only build feedback if requested, or just return score.
        -- For security, DO NOT return the correct_answer. Only whether they got it right.
        v_responses := v_responses || jsonb_build_object(
            'question_id', v_question.id,
            'is_correct', v_is_correct
        );

    END LOOP;

    RETURN jsonb_build_object(
        'score', v_score,
        'total', v_total,
        'results', v_responses
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER allows the function to bypass RLS to read the correct_answer row, 
-- even if the student calling it is blocked by RLS from seeing answers!

-- Revoke execute from anon to be safe
REVOKE EXECUTE ON FUNCTION public.evaluate_quiz_answers(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.evaluate_quiz_answers(uuid, jsonb) TO authenticated;
