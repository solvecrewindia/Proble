
-- Add status column to quizzes if it doesn't exist
alter table public.quizzes 
add column if not exists status text default 'active' check (status in ('draft', 'active', 'completed'));

-- Update existing quizzes to have a status
update public.quizzes set status = 'active' where status is null;
