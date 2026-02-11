-- Create attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed')),
  score integer DEFAULT 0,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone,
  flags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view their own attempts."
  ON public.attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own attempts."
  ON public.attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own attempts."
  ON public.attempts FOR UPDATE
  USING (auth.uid() = student_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attempts_student_quiz ON public.attempts(student_id, quiz_id);
