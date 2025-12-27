-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- This command manually confirms ALL users who are stuck in "Email not confirmed" state.
-- It sets their confirmed_at time to NOW, allowing them to log in immediately.

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- If you want to confirm only the specific SRMIST user, you can use:
-- UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'em2424@srmist.edu.in';
