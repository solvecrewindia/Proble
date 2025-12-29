-- Create the 'quiz-banners' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('quiz-banners', 'quiz-banners', true)
on conflict (id) do nothing;

-- Drop existing policies for cleanup (optional but good for idempotency)
drop policy if exists "Public Access to Quiz Banners" on storage.objects;
drop policy if exists "Allow Authenticated Uploads to Quiz Banners" on storage.objects;
drop policy if exists "Allow Anonymous Uploads to Quiz Banners" on storage.objects;

-- Policy 1: Allow Public Read Access (Required for homepage display)
create policy "Public Access to Quiz Banners"
on storage.objects for select
using ( bucket_id = 'quiz-banners' );

-- Policy 2: Allow Authenticated Users to Upload
create policy "Allow Authenticated Uploads to Quiz Banners"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'quiz-banners' );

-- Policy 3: Allow Anonymous Uploads (If falling back/dev mode needed, requested by user previously)
create policy "Allow Anonymous Uploads to Quiz Banners"
on storage.objects for insert
to anon
with check ( bucket_id = 'quiz-banners' );

-- Policy 4: Update/Delete (Optional, generally good for admin)
create policy "Allow Update Delete to Quiz Banners"
on storage.objects for all
using ( bucket_id = 'quiz-banners' );
