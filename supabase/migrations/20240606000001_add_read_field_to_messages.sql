-- Add read field to private_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'read') THEN
    ALTER TABLE private_messages ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable realtime for private_messages
alter publication supabase_realtime add table private_messages;
