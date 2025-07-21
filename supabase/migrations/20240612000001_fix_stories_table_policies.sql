-- Enable row level security for stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own stories
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories"
ON stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own stories
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories"
ON stories
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own stories
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories"
ON stories
FOR DELETE
USING (auth.uid() = user_id);

-- Create policy to allow users to read all stories
DROP POLICY IF EXISTS "Everyone can view all stories" ON stories;
CREATE POLICY "Everyone can view all stories"
ON stories
FOR SELECT
USING (true);

-- Add stories to realtime publication
alter publication supabase_realtime add table stories;