-- Drop the table if it exists to ensure a clean slate and avoid conflicts
drop table if exists public.profiles;

-- Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text unique,
  role text check (role in ('student', 'teacher', 'admin', 'faculty')),
  avatar_url text,
  preferred_language text default 'English',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Storage Bucket for Avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies

-- 1. Public profiles (username, avatar, role) differ from private data (email)
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

-- 2. Allow users to insert their OWN profile (Critical for Sign Up)
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

-- 3. Allow users to update their own profile
create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Quizzes Table
create table public.quizzes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text check (type in ('master', 'global', 'placement', 'srmist', 'nptel', 'course')),
  code text unique, -- For Master quizzes
  status text default 'active' check (status in ('draft', 'active', 'paused', 'completed')),
  settings jsonb default '{}'::jsonb,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Quizzes
alter table public.quizzes enable row level security;

-- Quiz Policies
create policy "Public global quizzes are viewable by everyone."
  on public.quizzes for select
  using ( type = 'global' );

-- Secure Master Quizzes: Only creator or via RPC (handled at app level by joining)
-- For now, we restrict generic select to creator only for non-global.
-- Students "join" by knowing the code, which we handle via a secure function or specific query.
create policy "Creators can view their own quizzes."
  on public.quizzes for select
  using ( auth.uid() = created_by or type = 'global' );

create policy "Faculty can insert quizzes."
  on public.quizzes for insert
  with check ( auth.uid() = created_by );

create policy "Faculty can update their own quizzes."
  on public.quizzes for update
  using ( auth.uid() = created_by );

create policy "Faculty can delete their own quizzes."
  on public.quizzes for delete
  using ( auth.uid() = created_by );

-- Questions Table
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  text text not null,
  choices jsonb not null, -- Array of strings or objects
  correct_answer text not null,
  tags text[], -- Array of strings for tagging (e.g., ['practice'], ['mock_test'])
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Questions
alter table public.questions enable row level security;

-- Question Policies
-- Only allow viewing questions if you can view the quiz (which is now restricted)
-- AND if the quiz is 'active' (optional hardening)
create policy "Questions are viewable if quiz is accessible."
  on public.questions for select
  using ( exists (select 1 from public.quizzes where id = quiz_id and (type = 'global' or created_by = auth.uid())) );

create policy "Faculty can manage questions."
  on public.questions for all
  using ( auth.uid() in (select created_by from public.quizzes where id = quiz_id) );
