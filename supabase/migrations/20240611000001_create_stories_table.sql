-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  viewed_by JSONB DEFAULT '[]'
);

-- Add RLS policies for stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Allow users to view all stories
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;
CREATE POLICY "Anyone can view stories"
  ON stories FOR SELECT
  USING (true);

-- Allow users to insert their own stories
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own stories
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own stories
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for stories
alter publication supabase_realtime add table stories;
