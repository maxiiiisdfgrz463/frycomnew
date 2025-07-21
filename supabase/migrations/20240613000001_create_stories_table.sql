-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  viewed_by JSONB DEFAULT '[]'::jsonb
);

-- Enable realtime
alter publication supabase_realtime add table stories;

-- Create policies for stories table
DROP POLICY IF EXISTS "Users can view all stories" ON stories;
CREATE POLICY "Users can view all stories"
ON stories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories"
ON stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories"
ON stories FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories"
ON stories FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;