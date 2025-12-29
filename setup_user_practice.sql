-- Create user_practice table to store user's saved modules/quizzes
CREATE TABLE IF NOT EXISTS user_practice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE user_practice ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own practice list" 
ON user_practice FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their practice list" 
ON user_practice FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their practice list" 
ON user_practice FOR DELETE 
USING (auth.uid() = user_id);
