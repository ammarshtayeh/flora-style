-- Run once in Supabase SQL Editor.
-- Allows every image MIME type in the flora-assets bucket (no whitelist).

UPDATE storage.buckets
SET
    allowed_mime_types = NULL,
    file_size_limit = 10485760,
    public = TRUE
WHERE id = 'flora-assets';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('flora-assets', 'flora-assets', TRUE, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
