-- Add quiz_id to user_practice table to allow saving individual quizzes
ALTER TABLE user_practice 
ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE;

-- Drop existing unique constraint to allow flexibility
ALTER TABLE user_practice DROP CONSTRAINT IF EXISTS user_practice_user_id_module_id_key;

-- Add new unique constraint (one entry per user per module OR quiz)
-- This ensures a user can't save the same module/quiz multiple times
-- Note: This simplistic unique constraint might need refinement if we want strict exclusivity,
-- but for now (user_id, module_id, quiz_id) uniqueness works if we treat NULLs carefully or use partial indexes.
-- Given Postgres treats NULL != NULL, a standard unique index on (user_id, module_id, quiz_id) works fine for:
-- (user1, mod1, null) vs (user1, mod1, null) -> Collision
-- (user1, null, quiz1) vs (user1, null, quiz1) -> Collision
-- (user1, mod1, quiz1) -> Valid if we allow linking both at same time (not planned but harmless)

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_practice_item 
ON user_practice (user_id, COALESCE(module_id, '00000000-0000-0000-0000-000000000000'), COALESCE(quiz_id, '00000000-0000-0000-0000-000000000000'));
