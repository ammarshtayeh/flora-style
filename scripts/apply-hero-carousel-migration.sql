-- Hero carousel: multiple images per banner
-- Run once in Supabase SQL Editor

ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE banners
SET image_urls = jsonb_build_array(image_url)
WHERE image_urls = '[]'::jsonb
  AND image_url IS NOT NULL
  AND image_url <> '';
