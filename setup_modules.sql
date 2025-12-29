-- Create modules table if not exists
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- Removed REFERENCES constraint to allow fallback users
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove strict FK constraint if it exists (fixes violation for fallback/dev users)
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_created_by_fkey;

-- Add module_id to quizzes table if not exists
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies (Handle both "dot" and "no dot" naming variants)
DROP POLICY IF EXISTS "Public modules are viewable by everyone" ON modules;
DROP POLICY IF EXISTS "Public modules are viewable by everyone." ON modules;
DROP POLICY IF EXISTS "Users can insert modules" ON modules;
DROP POLICY IF EXISTS "Users can update their own modules" ON modules;
DROP POLICY IF EXISTS "Users can delete their own modules" ON modules;
DROP POLICY IF EXISTS "policy_modules_select_all" ON modules;
DROP POLICY IF EXISTS "policy_modules_insert_all" ON modules;
DROP POLICY IF EXISTS "policy_modules_update_all" ON modules;
DROP POLICY IF EXISTS "policy_modules_delete_all" ON modules;

-- Create Permissive Policies (Relaxed for current user role setup)
-- Use distinct names to avoid future conflicts

CREATE POLICY "policy_modules_select_all" 
ON modules FOR SELECT 
USING (true);

CREATE POLICY "policy_modules_insert_all" 
ON modules FOR INSERT 
WITH CHECK (true);

CREATE POLICY "policy_modules_update_all" 
ON modules FOR UPDATE 
USING (true);

CREATE POLICY "policy_modules_delete_all" 
ON modules FOR DELETE 
USING (true);

-- Ensure Storage Bucket Exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quiz-banners', 'quiz-banners', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Drop potential existing ones to avoid 'already exists'
DROP POLICY IF EXISTS "Give public read access to quiz-banners" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users to quiz-banners" ON storage.objects;
DROP POLICY IF EXISTS "policy_storage_banners_select" ON storage.objects;
DROP POLICY IF EXISTS "policy_storage_banners_insert" ON storage.objects;

CREATE POLICY "policy_storage_banners_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-banners');

CREATE POLICY "policy_storage_banners_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quiz-banners');
