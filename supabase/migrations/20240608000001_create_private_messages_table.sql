-- Create private_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  attachment_type TEXT
);

-- Enable row level security
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own messages (sent or received)
DROP POLICY IF EXISTS "Users can see their own messages" ON private_messages;
CREATE POLICY "Users can see their own messages"
  ON private_messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create policy to allow users to insert their own messages
DROP POLICY IF EXISTS "Users can insert their own messages" ON private_messages;
CREATE POLICY "Users can insert their own messages"
  ON private_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Create policy to allow users to update messages they received (for read status)
DROP POLICY IF EXISTS "Users can update messages they received" ON private_messages;
CREATE POLICY "Users can update messages they received"
  ON private_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Enable realtime for private_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
