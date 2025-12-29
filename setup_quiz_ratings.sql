-- Create quiz_ratings table
CREATE TABLE IF NOT EXISTS public.quiz_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quiz_id) -- One rating per user per quiz
);

-- Enable RLS
ALTER TABLE public.quiz_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public ratings are viewable by everyone"
    ON public.quiz_ratings FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own ratings"
    ON public.quiz_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
    ON public.quiz_ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
    ON public.quiz_ratings FOR DELETE
    USING (auth.uid() = user_id);
