-- Create an RPC to get the server time synchronously
-- This helps in scenarios where the client's local clock is out of sync.

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated and anonymous users if needed for JoinTest
GRANT EXECUTE ON FUNCTION get_server_time() TO authenticated;
GRANT EXECUTE ON FUNCTION get_server_time() TO anon;
