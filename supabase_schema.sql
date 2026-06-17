-- Flora Style - Full Supabase schema, auth policies, admin policies and initial seed

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    store_name TEXT NOT NULL DEFAULT 'Flora Style',
    whatsapp_number TEXT NOT NULL DEFAULT '970599000000',
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    email TEXT,
    address_ar TEXT,
    address_he TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_user_id_unique
ON admins(user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_unique
ON admins(email)
WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT DEFAULT '',
    description_he TEXT DEFAULT '',
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT DEFAULT '',
    description_he TEXT DEFAULT '',
    logo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    description_ar TEXT DEFAULT '',
    description_he TEXT DEFAULT '',
    story_ar TEXT DEFAULT '',
    story_he TEXT DEFAULT '',
    price NUMERIC(10,2) NOT NULL,
    sale_price NUMERIC(10,2),
    best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_colors (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_name_ar TEXT NOT NULL,
    color_name_he TEXT NOT NULL,
    value TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_he TEXT NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title_ar TEXT NOT NULL,
    title_he TEXT NOT NULL,
    subtitle_ar TEXT DEFAULT '',
    subtitle_he TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    delivery_zone_id TEXT REFERENCES delivery_zones(id) ON DELETE SET NULL,
    detailed_address TEXT NOT NULL,
    notes TEXT DEFAULT '',
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled')),
    stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    color_id TEXT REFERENCES product_colors(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_settings_modtime ON store_settings;
CREATE TRIGGER update_store_settings_modtime BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_categories_modtime ON categories;
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_brands_modtime ON brands;
CREATE TRIGGER update_brands_modtime BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_product_colors_modtime ON product_colors;
CREATE TRIGGER update_product_colors_modtime BEFORE UPDATE ON product_colors FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_delivery_zones_modtime ON delivery_zones;
CREATE TRIGGER update_delivery_zones_modtime BEFORE UPDATE ON delivery_zones FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_banners_modtime ON banners;
CREATE TRIGGER update_banners_modtime BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS update_orders_modtime ON orders;
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE FUNCTION is_admin_user(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id = check_user
    );
$$;

GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION bootstrap_admin_account(p_display_name TEXT DEFAULT 'Primary Admin')
RETURNS public.admins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_email TEXT := auth.jwt() ->> 'email';
    resolved_display_name TEXT := COALESCE(NULLIF(BTRIM(p_display_name), ''), 'Primary Admin');
    existing_admin public.admins;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be signed in to bootstrap the first admin account';
    END IF;

    IF current_email IS NULL OR BTRIM(current_email) = '' THEN
        RAISE EXCEPTION 'Signed-in account must have an email address';
    END IF;

    SELECT *
    INTO existing_admin
    FROM public.admins
    WHERE user_id = current_user_id
    LIMIT 1;

    IF existing_admin.user_id IS NOT NULL THEN
        RETURN existing_admin;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'An admin account already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id IS NULL
          AND email IS NOT NULL
          AND LOWER(email) = LOWER(current_email)
    ) THEN
        UPDATE public.admins
        SET user_id = current_user_id,
            email = current_email,
            display_name = COALESCE(display_name, resolved_display_name)
        WHERE user_id IS NULL
          AND email IS NOT NULL
          AND LOWER(email) = LOWER(current_email)
        RETURNING * INTO existing_admin;

        RETURN existing_admin;
    END IF;

    INSERT INTO public.admins (user_id, email, display_name)
    VALUES (current_user_id, current_email, resolved_display_name)
    RETURNING * INTO existing_admin;

    RETURN existing_admin;
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_admin_account(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION set_order_status(p_order_id TEXT, p_status TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_order public.orders;
BEGIN
    IF NOT is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can update order status';
    END IF;

    SELECT * INTO current_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF current_order.id IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF p_status = 'Confirmed' AND current_order.stock_deducted = FALSE THEN
        UPDATE public.product_colors c
        SET stock_quantity = GREATEST(0, c.stock_quantity - oi.quantity)
        FROM public.order_items oi
        WHERE oi.order_id = current_order.id
          AND oi.color_id = c.id;

        UPDATE public.orders
        SET status = p_status,
            stock_deducted = TRUE
        WHERE id = current_order.id
        RETURNING * INTO current_order;
    ELSIF p_status <> 'Confirmed' AND current_order.stock_deducted = TRUE THEN
        UPDATE public.product_colors c
        SET stock_quantity = c.stock_quantity + oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = current_order.id
          AND oi.color_id = c.id;

        UPDATE public.orders
        SET status = p_status,
            stock_deducted = FALSE
        WHERE id = current_order.id
        RETURNING * INTO current_order;
    ELSE
        UPDATE public.orders
        SET status = p_status
        WHERE id = current_order.id
        RETURNING * INTO current_order;
    END IF;

    RETURN current_order;
END;
$$;

GRANT EXECUTE ON FUNCTION set_order_status(TEXT, TEXT) TO authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE
    store_settings,
    categories,
    brands,
    products,
    product_images,
    product_colors,
    delivery_zones,
    banners
TO anon, authenticated;

GRANT INSERT ON TABLE
    orders,
    order_items
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    admins,
    store_settings,
    categories,
    brands,
    products,
    product_images,
    product_colors,
    delivery_zones,
    banners,
    orders,
    order_items
TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'flora-assets',
    'flora-assets',
    TRUE,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_own" ON admins;
CREATE POLICY "admins_select_own" ON admins
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_bootstrap_first_admin" ON admins;
CREATE POLICY "admins_bootstrap_first_admin" ON admins
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND email = COALESCE(auth.jwt() ->> 'email', email)
    AND NOT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id IS NOT NULL
    )
);

DROP POLICY IF EXISTS "admins_full_access_for_admins" ON admins;
CREATE POLICY "admins_full_access_for_admins" ON admins
FOR ALL TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_store_settings" ON store_settings;
CREATE POLICY "public_read_store_settings" ON store_settings FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_store_settings" ON store_settings;
CREATE POLICY "admin_write_store_settings" ON store_settings FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories" ON categories FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_brands" ON brands;
CREATE POLICY "public_read_brands" ON brands FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_brands" ON brands;
CREATE POLICY "admin_write_brands" ON brands FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_products" ON products;
CREATE POLICY "admin_write_products" ON products FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_product_images" ON product_images;
CREATE POLICY "admin_write_product_images" ON product_images FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_product_colors" ON product_colors;
CREATE POLICY "public_read_product_colors" ON product_colors FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_product_colors" ON product_colors;
CREATE POLICY "admin_write_product_colors" ON product_colors FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_delivery_zones" ON delivery_zones;
CREATE POLICY "public_read_delivery_zones" ON delivery_zones FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_delivery_zones" ON delivery_zones;
CREATE POLICY "admin_write_delivery_zones" ON delivery_zones FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_banners" ON banners;
CREATE POLICY "public_read_banners" ON banners FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "admin_write_banners" ON banners;
CREATE POLICY "admin_write_banners" ON banners FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "admin_write_orders" ON orders;
CREATE POLICY "admin_write_orders" ON orders FOR UPDATE TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "admin_delete_orders" ON orders;
CREATE POLICY "admin_delete_orders" ON orders FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "admin_read_order_items" ON order_items;
CREATE POLICY "admin_read_order_items" ON order_items FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "admin_write_order_items" ON order_items;
CREATE POLICY "admin_write_order_items" ON order_items FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "public_read_flora_assets" ON storage.objects;
CREATE POLICY "public_read_flora_assets" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'flora-assets');

DROP POLICY IF EXISTS "admin_insert_flora_assets" ON storage.objects;
CREATE POLICY "admin_insert_flora_assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flora-assets' AND is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_update_flora_assets" ON storage.objects;
CREATE POLICY "admin_update_flora_assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'flora-assets' AND is_admin_user(auth.uid()))
WITH CHECK (bucket_id = 'flora-assets' AND is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_flora_assets" ON storage.objects;
CREATE POLICY "admin_delete_flora_assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'flora-assets' AND is_admin_user(auth.uid()));

INSERT INTO store_settings (id, store_name, whatsapp_number, instagram_url, facebook_url, tiktok_url, email, address_ar, address_he)
VALUES
    (1, 'Flora Style', '970599000000', 'https://instagram.com/florastyle', 'https://facebook.com/florastyle', 'https://tiktok.com/@florastyle', 'hello@florastyle.store', 'فلسطين', 'פלסטין')
ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    whatsapp_number = EXCLUDED.whatsapp_number,
    instagram_url = EXCLUDED.instagram_url,
    facebook_url = EXCLUDED.facebook_url,
    tiktok_url = EXCLUDED.tiktok_url,
    email = EXCLUDED.email,
    address_ar = EXCLUDED.address_ar,
    address_he = EXCLUDED.address_he;

INSERT INTO categories (id, slug, name_ar, name_he, description_ar, description_he, image_url, active)
VALUES
    ('cat-bags', 'handbags', 'حقائب', 'תיקים', 'حقائب مصممة لترافق اليوم من الصباح حتى المساء.', 'תיקים שנבחרו ללוות את היום מבוקר עד ערב.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=88', TRUE),
    ('cat-accessories', 'accessories', 'إكسسوارات', 'אביזרים', 'تفاصيل دقيقة تضيف حضوراً هادئاً وفاخراً.', 'פרטים מדויקים שמוסיפים נוכחות שקטה ויוקרתית.', 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=88', TRUE),
    ('cat-watches', 'watches', 'ساعات', 'שעונים', 'ساعات أنيقة بخطوط نظيفة وملمس فاخر.', 'שעונים אלגנטיים עם קווים נקיים ותחושה יוקרתית.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=88', TRUE),
    ('cat-sunglasses', 'sunglasses', 'نظارات شمسية', 'משקפי שמש', 'إطارات عصرية تمنح الإطلالة لمسة نهائية.', 'מסגרות מודרניות שמעניקות למראה סיום מדויק.', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=88', TRUE)
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name_ar = EXCLUDED.name_ar,
    name_he = EXCLUDED.name_he,
    description_ar = EXCLUDED.description_ar,
    description_he = EXCLUDED.description_he,
    image_url = EXCLUDED.image_url,
    active = EXCLUDED.active;

INSERT INTO brands (id, slug, name_ar, name_he, description_ar, description_he, logo_url, active)
VALUES
    ('brand-celine', 'celine', 'سيلين', 'סלין', 'أناقة باريسية مينيمال بخطوط نظيفة وحضور هادئ.', 'אלגנטיות פריזאית מינימליסטית עם קווים נקיים.', '/brands/celine.png', TRUE),
    ('brand-chloe', 'chloe', 'كلوي', 'קלואה', 'أنوثة ناعمة بروح بوهيمية راقية.', 'נשיות עדינה ברוח בוהמית מעודנת.', '/brands/chloe.png', TRUE),
    ('brand-marc-jacobs', 'marc-jacobs', 'مارك جايكوبس', 'מארק ג''ייקובס', 'جرأة عصرية بلمسة أمريكية مميزة.', 'נועזות מודרנית בנגיעה אמריקאית ייחודית.', '/brands/marc-jacobs.png', TRUE),
    ('brand-coach', 'coach', 'كوتش', 'קואץ''', 'حِرفية جلدية أمريكية بتفاصيل كلاسيكية.', 'אומנות עור אמריקאית עם פרטים קלאסיים.', '/brands/coach.png', TRUE),
    ('brand-prada', 'prada', 'برادا', 'פראדה', 'حضور عصري وخطوط عملية راقية.', 'נוכחות מודרנית וקווים פרקטיים יוקרתיים.', '/brands/prada.png', TRUE),
    ('brand-jacquemus', 'jacquemus', 'جاكموس', 'ז''קמוס', 'تصاميم جريئة بروح متوسطية معاصرة.', 'עיצובים נועזים ברוח ים-תיכונית עכשווית.', '/brands/jacquemus.png', TRUE),
    ('brand-miu-miu', 'miu-miu', 'ميو ميو', 'מיו מיו', 'أنوثة عصرية مرحة بتفاصيل لافتة.', 'נשיות מודרנית ושובבה עם פרטים בולטים.', '/brands/miu-miu.png', TRUE),
    ('brand-hermes', 'hermes', 'هيرميس', 'הרמס', 'أيقونة الفخامة والحِرفية الفرنسية النادرة.', 'סמל היוקרה והאומנות הצרפתית הנדירה.', '/brands/hermes.png', TRUE),
    ('brand-guess', 'guess', 'غيس', 'גס', 'ستايل يومي عصري بإطلالة جذابة.', 'סטייל יומיומי מודרני ומראה מושך.', '/brands/guess.png', TRUE),
    ('brand-lacoste', 'lacoste', 'لاكوست', 'לקוסט', 'أناقة رياضية كلاسيكية بروح فرنسية.', 'אלגנטיות ספורטיבית קלאסית ברוח צרפתית.', '/brands/lacoste.png', TRUE),
    ('brand-rolex', 'rolex', 'رولكس', 'רולקס', 'رمز الساعات الفاخرة والدقة عبر الزمن.', 'סמל שעוני היוקרה והדיוק לאורך זמן.', '/brands/rolex.png', TRUE),
    ('brand-balmain', 'balmain', 'بالمان', 'בלמיין', 'فخامة باريسية جريئة بتفاصيل قوية.', 'יוקרה פריזאית נועזת עם פרטים חזקים.', '/brands/balmain.png', TRUE),
    ('brand-michael-kors', 'michael-kors', 'مايكل كورس', 'מייקל קורס', 'أناقة عملية بلمسة أمريكية فاخرة.', 'אלגנטיות פרקטית בנגיעה אמריקאית יוקרתית.', '/brands/michael-kors.png', TRUE),
    ('brand-dior', 'dior', 'ديور', 'דיור', 'أناقة كلاسيكية بتفاصيل ناعمة.', 'אלגנטיות קלאסית עם פרטים עדינים.', '/brands/dior.png', TRUE),
    ('brand-fendi', 'fendi', 'فندي', 'פנדי', 'حِرفية إيطالية بروح عصرية لافتة.', 'אומנות איטלקית ברוח מודרנית בולטת.', '/brands/fendi.png', TRUE),
    ('brand-valentino', 'valentino', 'فالنتينو', 'ולנטינו', 'رومانسية إيطالية فاخرة بتفاصيل دقيقة.', 'רומנטיקה איטלקית יוקרתית עם פרטים מדויקים.', '/brands/valentino.png', TRUE),
    ('brand-balenciaga', 'balenciaga', 'بالنسياغا', 'בלנסיאגה', 'تصاميم جريئة تعيد تعريف الفخامة الحديثة.', 'עיצובים נועזים שמגדירים מחדש יוקרה מודרנית.', '/brands/balenciaga.png', TRUE),
    ('brand-gucci', 'gucci', 'غوتشي', 'גוצ''י', 'فخامة إيطالية أيقونية بحضور جريء.', 'יוקרה איטלקית איקונית עם נוכחות נועזת.', '/brands/gucci.png', TRUE),
    ('brand-louis-vuitton', 'louis-vuitton', 'لويس فيتون', 'לואי ויטון', 'أيقونة السفر والفخامة الفرنسية الخالدة.', 'סמל הנסיעות והיוקרה הצרפתית הנצחית.', '/brands/louis-vuitton.png', TRUE),
    ('brand-chanel', 'chanel', 'شانيل', 'שאנל', 'تصاميم فاخرة بتوازن بين الجرأة والهدوء.', 'עיצובים יוקרתיים עם איזון בין נועזות ושקט.', '/brands/chanel.png', TRUE),
    ('brand-ysl', 'ysl', 'إيف سان لوران', 'איב סן לורן', 'أناقة باريسية أيقونية بحضور جريء وخالد.', 'אלגנטיות פריזאית איקונית עם נוכחות נצחית.', '/brands/ysl.png', TRUE)
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name_ar = EXCLUDED.name_ar,
    name_he = EXCLUDED.name_he,
    description_ar = EXCLUDED.description_ar,
    description_he = EXCLUDED.description_he,
    logo_url = EXCLUDED.logo_url,
    active = EXCLUDED.active;

INSERT INTO products (id, slug, sku, category_id, brand_id, name_ar, name_he, description_ar, description_he, story_ar, story_he, price, sale_price, best_seller, featured, active, created_at)
VALUES
    ('prod-black-bag', 'dior-black-handbag', 'FL-BAG-001', 'cat-bags', 'brand-celine', 'حقيبة سيلين سوداء', 'תיק סלין שחור', 'حقيبة سوداء بخطوط كلاسيكية وملمس فاخر، مصممة للاستخدام اليومي والمناسبات.', 'תיק שחור בקווים קלאסיים ובמרקם יוקרתי, מתאים ליומיום ולאירועים.', 'صُممت لتبدو هادئة من بعيد وغنية بالتفاصيل عند الاقتراب. مساحة منظمة، حضور أنثوي، وتشطيب يليق بإطلالة فاخرة.', 'עוצב להיראות שקט מרחוק ועשיר בפרטים מקרוב. חלל מאורגן, נוכחות נשית וגימור שמתאים למראה יוקרתי.', 290, 249, TRUE, TRUE, TRUE, '2026-06-01'),
    ('prod-gold-set', 'chanel-gold-accessory-set', 'FL-ACC-014', 'cat-accessories', 'brand-chanel', 'طقم شانيل الذهبي', 'סט שאנל זהב', 'طقم إكسسوارات ذهبي ناعم يمنح الإطلالة لمعة راقية دون مبالغة.', 'סט אביזרי זהב עדין שמוסיף ברק יוקרתי בלי עומס.', 'اختيار مناسب للهدايا والإطلالات المسائية؛ قطع خفيفة يمكن ارتداؤها مع أكثر من ستايل.', 'בחירה מתאימה למתנות ולמראה ערב; פריטים קלים שניתן לשלב עם כמה סגנונות.', 120, NULL, FALSE, TRUE, TRUE, '2026-06-08'),
    ('prod-minimal-watch', 'dior-minimal-watch', 'FL-WAT-021', 'cat-watches', 'brand-rolex', 'ساعة رولكس مينيمال', 'שעון רולקס מינימלי', 'ساعة بتصميم نظيف وسوار أنيق يناسب العمل والمناسبات.', 'שעון בעיצוב נקי ורצועה אלגנטית שמתאים לעבודה ולאירועים.', 'تفاصيل قليلة، تأثير كبير. ساعة مريحة وخفيفة مع قراءة واضحة ولمسة معدنية راقية.', 'מעט פרטים, השפעה גדולה. שעון נוח וקל עם קריאה ברורה ונגיעה מתכתית יוקרתית.', 180, 159, TRUE, FALSE, TRUE, '2026-06-12'),
    ('prod-prada-sunglasses', 'prada-beige-sunglasses', 'FL-SUN-032', 'cat-sunglasses', 'brand-prada', 'نظارات برادا بيج', 'משקפי פראדה בז''', 'نظارات شمسية بإطار بيج دافئ وعدسات أنيقة لإطلالة نهارية فاخرة.', 'משקפי שמש במסגרת בז'' חמימה ועדשות אלגנטיות למראה יום יוקרתי.', 'قطعة خفيفة تغير الإطلالة فوراً؛ مثالية للسفر، المشاوير اليومية، وصور إنستغرام الناعمة.', 'פריט קל שמשנה את המראה מיד; מושלם לנסיעות, סידורים יומיים ותמונות אינסטגרם עדינות.', 165, NULL, FALSE, TRUE, TRUE, '2026-06-14')
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    sku = EXCLUDED.sku,
    category_id = EXCLUDED.category_id,
    brand_id = EXCLUDED.brand_id,
    name_ar = EXCLUDED.name_ar,
    name_he = EXCLUDED.name_he,
    description_ar = EXCLUDED.description_ar,
    description_he = EXCLUDED.description_he,
    story_ar = EXCLUDED.story_ar,
    story_he = EXCLUDED.story_he,
    price = EXCLUDED.price,
    sale_price = EXCLUDED.sale_price,
    best_seller = EXCLUDED.best_seller,
    featured = EXCLUDED.featured,
    active = EXCLUDED.active,
    created_at = EXCLUDED.created_at;

DELETE FROM product_images
WHERE product_id IN ('prod-black-bag', 'prod-gold-set', 'prod-minimal-watch', 'prod-prada-sunglasses');

INSERT INTO product_images (product_id, image_url, sort_order)
VALUES
    ('prod-black-bag', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=88', 0),
    ('prod-black-bag', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1400&q=88', 1),
    ('prod-black-bag', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1400&q=88', 2),
    ('prod-gold-set', 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=88', 0),
    ('prod-gold-set', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1400&q=88', 1),
    ('prod-gold-set', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=88', 2),
    ('prod-minimal-watch', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=88', 0),
    ('prod-minimal-watch', 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1400&q=88', 1),
    ('prod-minimal-watch', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=88', 2),
    ('prod-prada-sunglasses', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=88', 0),
    ('prod-prada-sunglasses', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=88', 1),
    ('prod-prada-sunglasses', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=88', 2);

INSERT INTO product_colors (id, product_id, color_name_ar, color_name_he, value, stock_quantity)
VALUES
    ('color-black', 'prod-black-bag', 'أسود', 'שחור', '#1A1A1A', 10),
    ('color-beige', 'prod-black-bag', 'بيج', 'בז''', '#D4C1A7', 3),
    ('color-gold', 'prod-gold-set', 'ذهبي', 'זהב', '#B89B72', 7),
    ('color-silver', 'prod-gold-set', 'فضي', 'כסף', '#BDB8AF', 0),
    ('color-white', 'prod-minimal-watch', 'أبيض', 'לבן', '#F8F5F0', 12),
    ('color-brown', 'prod-minimal-watch', 'بني', 'חום', '#6D5644', 4),
    ('color-pink', 'prod-prada-sunglasses', 'موكا', 'מוקה', '#A78D78', 6),
    ('color-sand', 'prod-prada-sunglasses', 'رملي', 'חול', '#E8DFD3', 25)
ON CONFLICT (id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    color_name_ar = EXCLUDED.color_name_ar,
    color_name_he = EXCLUDED.color_name_he,
    value = EXCLUDED.value,
    stock_quantity = EXCLUDED.stock_quantity;

INSERT INTO delivery_zones (id, name_ar, name_he, delivery_fee, active)
VALUES
    ('zone-west-bank', 'الضفة الغربية', 'הגדה המערבית', 20, TRUE),
    ('zone-jerusalem', 'القدس', 'ירושלים', 30, TRUE),
    ('zone-abu-ghosh', 'أبو غوش', 'אבו גוש', 35, TRUE),
    ('zone-48', 'مناطق 48', 'אזורי 48', 40, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_he = EXCLUDED.name_he,
    delivery_fee = EXCLUDED.delivery_fee,
    active = EXCLUDED.active;

INSERT INTO banners (id, title_ar, title_he, subtitle_ar, subtitle_he, image_url, active)
VALUES
    ('banner-main', 'أناقة تشبهك، بتفاصيل عالمية', 'אלגנטיות שמרגישה אישית', 'مجموعة مختارة من الحقائب والإكسسوارات والساعات. تصفّحي بسهولة وأرسلي طلبك مباشرة من الموقع.', 'אוסף נבחר של תיקים, אביזרים ושעונים. גלשי בנוחות ושלחי את ההזמנה ישירות מהאתר.', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=88', TRUE)
ON CONFLICT (id) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    title_he = EXCLUDED.title_he,
    subtitle_ar = EXCLUDED.subtitle_ar,
    subtitle_he = EXCLUDED.subtitle_he,
    image_url = EXCLUDED.image_url,
    active = EXCLUDED.active;
