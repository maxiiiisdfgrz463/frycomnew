-- Ensure private_messages table has all required fields
ALTER TABLE IF EXISTS private_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Enable realtime for private_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
