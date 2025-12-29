-- Add image_url column to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional: Comment on the column
COMMENT ON COLUMN quizzes.image_url IS 'URL of the quiz banner image uploaded to quiz-banners bucket';
