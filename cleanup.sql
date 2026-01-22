-- Clean up test users from load testing
-- Run this script in the SQL Editor of your Supabase Dashboard

-- 1. Delete the users from the auth.users table.
-- This usually triggers a cascade delete to 'profiles', 'quiz_results', etc., if Foreign Keys are configured correctly.
DELETE FROM auth.users 
WHERE email LIKE 'loadtest_%' 
   OR email LIKE 'scale_%';

-- 2. (Optional) If Foreign Keys do NOT cascade, run these manually:
-- DELETE FROM public.quiz_results 
-- WHERE student_id IN (
--     SELECT id FROM public.profiles 
--     WHERE email LIKE 'loadtest_%' OR email LIKE 'scale_%'
-- );

-- DELETE FROM public.profiles 
-- WHERE email LIKE 'loadtest_%' OR email LIKE 'scale_%';
