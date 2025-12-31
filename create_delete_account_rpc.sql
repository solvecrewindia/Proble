-- Create a function that allows users to delete their own account from auth.users
create or replace function delete_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users
  where id = auth.uid();
end;
$$;

-- Grant functionality to authenticated users
GRANT EXECUTE ON FUNCTION delete_account() TO authenticated;
