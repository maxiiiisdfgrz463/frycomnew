-- Create private_messages table for direct messaging between users
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS private_messages_sender_id_idx ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS private_messages_receiver_id_idx ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS private_messages_created_at_idx ON private_messages(created_at);

-- Set up RLS policies
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to select only messages they sent or received
DROP POLICY IF EXISTS "Users can view their own messages" ON private_messages;
CREATE POLICY "Users can view their own messages"
  ON private_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to insert messages they are sending
DROP POLICY IF EXISTS "Users can insert their own messages" ON private_messages;
CREATE POLICY "Users can insert their own messages"
  ON private_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Allow users to update read status of messages they received
DROP POLICY IF EXISTS "Users can update read status of received messages" ON private_messages;
CREATE POLICY "Users can update read status of received messages"
  ON private_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND (read IS NOT NULL));

-- Enable realtime for private_messages
alter publication supabase_realtime add table private_messages;