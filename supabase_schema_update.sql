
-- Quiz Results Table
create table public.quiz_results (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  percentage float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Quiz Results
alter table public.quiz_results enable row level security;

-- Quiz Results Policies

-- 1. Students can insert their own results
create policy "Students can insert their own results."
  on public.quiz_results for insert
  with check ( auth.uid() = student_id );

-- 2. Students can view their own results
create policy "Students can view their own results."
  on public.quiz_results for select
  using ( auth.uid() = student_id );

-- 3. Faculty can view results for quizzes they created
create policy "Faculty can view results of their quizzes."
  on public.quiz_results for select
  using ( 
    exists (
      select 1 from public.quizzes
      where public.quizzes.id = public.quiz_results.quiz_id
      and public.quizzes.created_by = auth.uid()
    )
  );
