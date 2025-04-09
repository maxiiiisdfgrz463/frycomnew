-- Add missing columns to private_messages table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'attachment_url') THEN
        ALTER TABLE private_messages ADD COLUMN attachment_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'attachment_type') THEN
        ALTER TABLE private_messages ADD COLUMN attachment_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'read') THEN
        ALTER TABLE private_messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Enable realtime for private_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
