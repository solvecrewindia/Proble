-- Enable Realtime for Attempts Table
-- This is critical for the 'postgres_changes' subscription to work!

begin;
  -- Try to add the table to the publication. 
  -- We use 'do' block to avoid error if it's already added.
  do $$
  begin
    if not exists (
      select 1 
      from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and tablename = 'attempts'
    ) then
      alter publication supabase_realtime add table public.attempts;
    end if;
  end;
  $$;
commit;

-- Final Fix for Attempts Table
-- Run this to strictly ensure the table has the right columns and permissions.
-- It will NOT fail if the table already exists.

-- 1. Ensure Columns Exist (Safe Add)
alter table public.attempts add column if not exists answers jsonb default '{}'::jsonb;
alter table public.attempts add column if not exists score numeric default 0;
alter table public.attempts add column if not exists status text default 'in-progress';
alter table public.attempts add column if not exists quiz_id uuid references public.quizzes(id) on delete cascade;
alter table public.attempts add column if not exists student_id uuid references auth.users(id);

-- 2. Reset RLS Policies (Fix "Empty Participants" issue)
alter table public.attempts enable row level security;

-- Drop old policies to prevent duplicates/conflicts
drop policy if exists "Enable full access for all users" on public.attempts;
drop policy if exists "Enable access for anonymous users on attempts" on public.attempts;
drop policy if exists "Students can insert own attempt" on public.attempts;
drop policy if exists "Teachers can view attempts" on public.attempts;

-- Create the one policy we need
create policy "Enable full access for all users"
on public.attempts for all
using ( true )
with check ( true );
