-- ==========================================
-- SECURE SCHEMA FIXES FOR "PROBLE" (v2)
-- ==========================================

-- 1. Profiles: Protect sensitive data (Emails)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles: Users see own, Admins see all, others see basic"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('teacher', 'faculty', 'admin')
);

-- 2. Quizzes: Hide "Master" quizzes from public discovery
DROP POLICY IF EXISTS "Master quizzes are viewable by code (conceptually), or by creator." ON public.quizzes;
DROP POLICY IF EXISTS "Public global quizzes are viewable by everyone." ON public.quizzes;

CREATE POLICY "Quizzes: Global are public, Master are restricted"
ON public.quizzes FOR SELECT
USING (
  type = 'global' 
  OR created_by = auth.uid()
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('teacher', 'faculty', 'admin')
);

-- 3. Questions: STOP ANSWER LEAKING
DROP POLICY IF EXISTS "Questions are viewable by everyone who can view the quiz." ON public.questions;

-- Deny all direct student SELECT on questions table
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Questions: Faculty can manage"
ON public.questions FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('teacher', 'faculty', 'admin') );

-- 4. Leaderboard: PREVENT SCORE FORGERY
DROP POLICY IF EXISTS "User update own score" ON public.leaderboard;
CREATE POLICY "Leaderboard: Read-Only for Users"
ON public.leaderboard FOR SELECT
USING (true);

-- Trigger to automate XP updates when a Quiz is finished
CREATE OR REPLACE FUNCTION public.handle_new_score() 
RETURNS TRIGGER 
SECURITY DEFINER 
AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id, total_xp, updated_at, week_id)
  VALUES (NEW.student_id, NEW.score, now(), '2025-W1')
  ON CONFLICT (user_id, week_id) 
  DO UPDATE SET 
    total_xp = leaderboard.total_xp + EXCLUDED.total_xp,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_quiz_submit ON public.quiz_results;
CREATE TRIGGER tr_on_quiz_submit
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_score();

-- 5. Daily Challenges: Secure Modification (Robust Check)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_challenges') THEN
        EXECUTE 'ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY';
        DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON daily_challenges;
        DROP POLICY IF EXISTS "Allow read access to authenticated users" ON daily_challenges;
        DROP POLICY IF EXISTS "Challenges: Faculty manage, Students read" ON daily_challenges;
        DROP POLICY IF EXISTS "Challenges: Authenticated users can read" ON daily_challenges;

        EXECUTE 'CREATE POLICY "Challenges: Faculty manage, Students read" ON daily_challenges FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN (''teacher'', ''faculty'', ''admin''))';
        EXECUTE 'CREATE POLICY "Challenges: Authenticated users can read" ON daily_challenges FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- 6. SECURE FUNCTION: Fetch Questions without answers
CREATE OR REPLACE FUNCTION public.get_safe_questions(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  text text,
  choices jsonb,
  type text,
  image_url text,
  tags text[]
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.choices, q.type, q.image_url, q.tags
  FROM public.questions q
  WHERE q.quiz_id = p_quiz_id;
END;
$$ LANGUAGE plpgsql;
