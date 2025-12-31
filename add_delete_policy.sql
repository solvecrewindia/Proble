-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile."
  ON public.profiles
  FOR DELETE
  USING ( auth.uid() = id );

-- Ensure enabling RLS doesn't block deletion if policy is missing (for safety, though usually enabled)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; -- Already enabled in schema
