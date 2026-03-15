-- SQL Script to sync profile deletion with auth.users deletion
-- Run this in your Supabase SQL Editor

-- 1. Create the function that will perform the deletion
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the user from the auth.users table
  -- Note: We must use the security definer modifier to allow this function to access the auth schema
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the profiles table
DROP TRIGGER IF EXISTS tr_delete_auth_user ON public.profiles;
CREATE TRIGGER tr_delete_auth_user
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user();
