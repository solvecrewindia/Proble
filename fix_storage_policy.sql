-- First, drop existing policies to avoid conflicts
drop policy if exists "Public Access to Quiz Images" on storage.objects;
drop policy if exists "Authenticated Users Can Upload Quiz Images" on storage.objects;
drop policy if exists "Users Can Update Own Quiz Images" on storage.objects;
drop policy if exists "Users Can Delete Own Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Uploads to Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Updates to Quiz Images" on storage.objects;
drop policy if exists "Allow Anonymous Delete in Quiz Images" on storage.objects;

-- Now recreate them
-- Policy to allow ANYONE (public/anon) to view images in 'quiz_images' bucket
create policy "Public Access to Quiz Images"
on storage.objects for select
using ( bucket_id = 'quiz_images' );

-- UPDATE: Allow 'anon' users to upload (Required for 'Fallback' or 'Emergency Bypass' modes)
create policy "Allow Anonymous Uploads to Quiz Images"
on storage.objects for insert
with check (
  bucket_id = 'quiz_images'
);

-- UPDATE: Allow 'anon' users to update their own uploads (loosely defined or just allow all for dev)
create policy "Allow Anonymous Updates to Quiz Images"
on storage.objects for update
using ( bucket_id = 'quiz_images' );

-- UPDATE: Allow 'anon' users to delete images
create policy "Allow Anonymous Delete in Quiz Images"
on storage.objects for delete
using ( bucket_id = 'quiz_images' );
