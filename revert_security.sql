-- ==========================================
-- REVERT SECURITY FIXES (ROBUST VERSION)
-- ==========================================

-- 1. Profiles
DROP POLICY IF EXISTS "Profiles: Users see own, Admins see all, others see basic" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

-- 2. Quizzes: Allow ALL types to be visible (srmist, nptel, placement, etc.)
DROP POLICY IF EXISTS "Quizzes: Global are public, Master are restricted" ON public.quizzes;
DROP POLICY IF EXISTS "Public global quizzes are viewable by everyone." ON public.quizzes;
DROP POLICY IF EXISTS "Master quizzes are viewable by code (conceptually), or by creator." ON public.quizzes;

CREATE POLICY "Public quizzes are viewable by everyone."
  ON public.quizzes FOR SELECT
  USING ( true );

-- 3. Questions
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions: Faculty can manage" ON public.questions;
DROP POLICY IF EXISTS "Questions are viewable by everyone who can view the quiz." ON public.questions;

CREATE POLICY "Questions are viewable by everyone who can view the quiz."
  ON public.questions FOR SELECT
  USING ( true );

-- 4. Leaderboard
DROP POLICY IF EXISTS "Leaderboard: Read-Only for Users" ON public.leaderboard;
DROP POLICY IF EXISTS "User update own score" ON public.leaderboard;

CREATE POLICY "User update own score" 
ON public.leaderboard FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Cleanup trigger
DROP TRIGGER IF EXISTS tr_on_quiz_submit ON public.quiz_results;
DROP FUNCTION IF EXISTS public.handle_new_score();

-- 5. Daily Challenges
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_challenges') THEN
        DROP POLICY IF EXISTS "Challenges: Faculty manage, Students read" ON daily_challenges;
        DROP POLICY IF EXISTS "Challenges: Authenticated users can read" ON daily_challenges;
        DROP POLICY IF EXISTS "Allow read access to authenticated users" ON daily_challenges;
        DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON daily_challenges;

        CREATE POLICY "Allow read access to authenticated users" ON daily_challenges FOR SELECT USING (auth.role() = 'authenticated');
        CREATE POLICY "Allow insert access to authenticated users" ON daily_challenges FOR insert WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Cleanup Functions
DROP FUNCTION IF EXISTS public.get_safe_questions(uuid);
