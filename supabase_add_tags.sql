-- Add tags column to questions table if it doesn't exist
alter table public.questions add column if not exists tags text[];
