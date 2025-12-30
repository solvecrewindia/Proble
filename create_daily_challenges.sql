-- Create table for daily challenges
create table if not exists daily_challenges (
  date date primary key default current_date,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table daily_challenges enable row level security;

-- Policies
-- Allow anyone (authenticated) to read challenges
create policy "Allow read access to authenticated users" 
  on daily_challenges for select 
  using (auth.role() = 'authenticated');

-- Allow authenticated users to insert (to trigger generation)
-- In a stricter production env, this would be a server-side function, but for this app structure:
create policy "Allow insert access to authenticated users" 
  on daily_challenges for insert 
  with check (auth.role() = 'authenticated');
