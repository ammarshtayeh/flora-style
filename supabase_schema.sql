-- Flora Style E-Commerce Platform - Supabase PostgreSQL Schema
-- Version: 1.0

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. store_settings
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    store_name TEXT NOT NULL DEFAULT 'Flora Style',
    whatsapp_number TEXT NOT NULL DEFAULT '970599000000',
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    email TEXT,
    address_ar TEXT,
    address_he TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, -- Supports text IDs like 'cat-bags' or UUIDs
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT,
    description_he TEXT,
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. brands
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT,
    description_he TEXT,
    logo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT,
    description_he TEXT,
    story_ar TEXT,
    story_he TEXT,
    price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    best_seller BOOLEAN NOT NULL DEFAULT false,
    featured BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. product_images
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. product_colors
CREATE TABLE IF NOT EXISTS product_colors (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    color_name_ar TEXT NOT NULL,
    color_name_he TEXT NOT NULL,
    value TEXT NOT NULL, -- hex code e.g. '#FFFFFF'
    stock_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_quantity_non_negative CHECK (stock_quantity >= 0)
);

-- 8. delivery_zones
CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. banners
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title_ar TEXT NOT NULL,
    title_he TEXT NOT NULL,
    subtitle_ar TEXT,
    subtitle_he TEXT,
    image_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    delivery_zone_id TEXT REFERENCES delivery_zones(id) ON DELETE SET NULL,
    detailed_address TEXT NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Confirmed' | 'Processing' | 'Delivered' | 'Cancelled'
    stock_deducted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    color_id TEXT REFERENCES product_colors(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(10, 2) NOT NULL,
    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Auto Update triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_orders_modtime
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_settings_modtime
    BEFORE UPDATE ON store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Insert Initial Store Settings
INSERT INTO store_settings (id, store_name, whatsapp_number, instagram_url, facebook_url, tiktok_url, email, address_ar, address_he)
VALUES (1, 'Flora Style', '970599000000', 'https://instagram.com/florastyle', 'https://facebook.com/florastyle', 'https://tiktok.com/@florastyle', 'hello@florastyle.store', 'فلسطين', 'פלסטין')
ON CONFLICT (id) DO NOTHING;
