-- Create the 'avatars' bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create the 'quiz-banners' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('quiz-banners', 'quiz-banners', true)
on conflict (id) do nothing;

-- Create 'quiz_images' bucket if it doesn't exist (previously missing creation step)
insert into storage.buckets (id, name, public)
values ('quiz_images', 'quiz_images', true)
on conflict (id) do nothing;

-- Drop existing policies to ensure clean slate and avoid conflicts
-- Avatars Policies
drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;

-- Quiz Banners Policies
drop policy if exists "Public Access to Quiz Banners" on storage.objects;
drop policy if exists "Allow Authenticated Uploads to Quiz Banners" on storage.objects;
drop policy if exists "Allow Anonymous Uploads to Quiz Banners" on storage.objects;
drop policy if exists "Allow Update Delete to Quiz Banners" on storage.objects;

-- Quiz Images Policies
drop policy if exists "Public Access to Quiz Images" on storage.objects;
drop policy if exists "Authenticated Users Can Upload Quiz Images" on storage.objects;
drop policy if exists "Users Can Update Own Quiz Images" on storage.objects;
drop policy if exists "Users Can Delete Own Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Uploads to Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Updates to Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Delete in Quiz Images" on storage.objects;


-- Recreate Policies

-- 1. AVATARS
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 2. QUIZ BANNERS
create policy "Public Access to Quiz Banners"
  on storage.objects for select
  using ( bucket_id = 'quiz-banners' );

create policy "Allow Authenticated Uploads to Quiz Banners"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'quiz-banners' );

-- 3. QUIZ IMAGES
create policy "Public Access to Quiz Images"
  on storage.objects for select
  using ( bucket_id = 'quiz_images' );

-- Allow authenticated users to upload to quiz_images
create policy "Authenticated Users Can Upload Quiz Images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'quiz_images' );

-- Allow users to update their own uploads (basic ownership check often requires metadata or path conventions, 
-- but for simplicity we often allow auth users to update/delete in their folders if structure is user-based,
-- or we can just rely on the application logic for managing these if RLS is too complex for simple use cases.)
-- For this setup, we'll allow authenticated users to update/delete in this bucket to ensure they can manage their content.
create policy "Authenticated Users Can Update Quiz Images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'quiz_images' );

create policy "Authenticated Users Can Delete Quiz Images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'quiz_images' );
