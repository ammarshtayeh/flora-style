-- Run once in Supabase SQL Editor.

DROP POLICY IF EXISTS "admins_bootstrap_first_admin" ON admins;

REVOKE EXECUTE ON FUNCTION bootstrap_admin_account(TEXT) FROM authenticated;

UPDATE storage.buckets
SET
    allowed_mime_types = ARRAY[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/pjpeg',
        'image/webp',
        'image/svg+xml',
        'image/heic',
        'image/heif',
        'image/avif'
    ],
    file_size_limit = 10485760,
    public = TRUE
WHERE id = 'flora-assets';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'flora-assets',
    'flora-assets',
    TRUE,
    10485760,
    ARRAY[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/pjpeg',
        'image/webp',
        'image/svg+xml',
        'image/heic',
        'image/heif',
        'image/avif'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
