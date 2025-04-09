-- Add attachment fields to private_messages table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE private_messages ADD COLUMN attachment_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'attachment_type') THEN
    ALTER TABLE private_messages ADD COLUMN attachment_type TEXT;
  END IF;
END $$;
