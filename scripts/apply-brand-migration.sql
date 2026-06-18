-- Run once in Supabase SQL Editor.
-- Keeps products and their images when a brand is deleted.

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;
ALTER TABLE products ALTER COLUMN brand_id DROP NOT NULL;
ALTER TABLE products
    ADD CONSTRAINT products_brand_id_fkey
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
