-- Fix Database Policies and Constraints for Dev/Bypass Mode

-- 1. Remove FK constraints that block our fake 'bypass' user
-- We need to drop constraints on profiles -> auth.users and quizzes -> profiles
-- because our fake user '00000000-0000-0000-0000-000000000000' doesn't exist in auth.users.

-- Try to drop constraint on profiles (name might vary, trying standard generated info)
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'profiles_id_fkey' and table_name = 'profiles') then
    alter table public.profiles drop constraint profiles_id_fkey;
  end if;
  -- Also try generic name just in case
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'profiles_user_id_fkey' and table_name = 'profiles') then
    alter table public.profiles drop constraint profiles_user_id_fkey;
  end if;
end $$;

-- Try to drop constraint on quizzes
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'quizzes_created_by_fkey' and table_name = 'quizzes') then
    alter table public.quizzes drop constraint quizzes_created_by_fkey;
  end if;

  -- Drop type check constraint which limits types to just 'master'/'global'
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'quizzes_type_check' and table_name = 'quizzes') then
    alter table public.quizzes drop constraint quizzes_type_check;
  end if;
end $$;


-- 2. Open up RLS for anonymous/fallback users

-- Quizzes Table
drop policy if exists "Enable access for anonymous users on quizzes" on public.quizzes;
create policy "Enable access for anonymous users on quizzes"
on public.quizzes for all
using ( true )
with check ( true );

-- Questions Table
drop policy if exists "Enable access for anonymous users on questions" on public.questions;
create policy "Enable access for anonymous users on questions"
on public.questions for all
using ( true )
with check ( true );

-- Profiles Table
drop policy if exists "Enable access for anonymous users on profiles" on public.profiles;
create policy "Enable access for anonymous users on profiles"
on public.profiles for all
using ( true )
with check ( true );

-- 3. Insert the Dummy Admin Profile (Safe ID)
-- This ensures that if the code checks for profile existence, it finds one.
insert into public.profiles (id, email, username, role)
values ('00000000-0000-0000-0000-000000000000', 'solvecrewindia@gmail.com', 'Admin', 'admin')
on conflict (id) do nothing;
