CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Add RLS policies
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Allow users to like comments
DROP POLICY IF EXISTS "Users can create their own likes" ON comment_likes;
CREATE POLICY "Users can create their own likes"
  ON comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
DROP POLICY IF EXISTS "Users can delete their own likes" ON comment_likes;
CREATE POLICY "Users can delete their own likes"
  ON comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to read all likes
DROP POLICY IF EXISTS "Everyone can read likes" ON comment_likes;
CREATE POLICY "Everyone can read likes"
  ON comment_likes
  FOR SELECT
  USING (true);

-- Add to realtime publication
alter publication supabase_realtime add table comment_likes;