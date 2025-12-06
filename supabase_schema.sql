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
