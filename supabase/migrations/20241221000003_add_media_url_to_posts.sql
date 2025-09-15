-- Add media_url column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;