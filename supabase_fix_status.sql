-- Drop the potentially restrictive constraint
alter table public.quizzes drop constraint if exists quizzes_status_check;

-- Add the correct constraint including 'paused'
alter table public.quizzes add constraint quizzes_status_check 
  check (status in ('draft', 'active', 'paused', 'completed'));
