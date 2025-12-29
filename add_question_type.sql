-- Add type column to questions if it doesn't exist
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'questions' and column_name = 'type') then
    alter table public.questions add column type text default 'mcq';
  end if;
end $$;
