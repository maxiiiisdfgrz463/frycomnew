-- Add media_type column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Update existing posts to have a default media_type
UPDATE posts SET media_type = 'image' WHERE media_type IS NULL AND media_urls IS NOT NULL AND array_length(media_urls, 1) > 0;