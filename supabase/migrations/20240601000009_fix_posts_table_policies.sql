-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

-- Recreate the policy
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  TO public
  USING (true);
