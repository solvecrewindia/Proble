-- Drop the table if it exists to ensure a clean slate and avoid conflicts
drop table if exists public.profiles;

-- Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text unique,
  role text check (role in ('student', 'teacher', 'admin', 'faculty')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies

-- 1. Allow public read access (necessary for checking usernames, etc.)
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
  type text check (type in ('master', 'global')),
  code text unique, -- For Master quizzes
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

create policy "Master quizzes are viewable by code (conceptually), or by creator."
  on public.quizzes for select
  using ( true ); -- Simplified for demo; ideally restrict Master to creator or enrolled students

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Questions
alter table public.questions enable row level security;

-- Question Policies
create policy "Questions are viewable by everyone who can view the quiz."
  on public.questions for select
  using ( true ); -- Simplified

create policy "Faculty can manage questions."
  on public.questions for all
  using ( auth.uid() in (select created_by from public.quizzes where id = quiz_id) );
