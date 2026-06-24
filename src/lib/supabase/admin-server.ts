import type {
  Banner,
  Brand,
  Category,
  DeliveryZone,
  Product,
  ProductColor,
  StoreSettings,
} from "@/lib/store";
import { getBannerImages } from "@/lib/store";
import { buildEntitySlug, buildProductSlug } from "@/lib/slug";
import { createServiceSupabaseClient } from "./service";

function requireServiceClient() {
  const client = createServiceSupabaseClient();
  if (!client) {
    throw new Error("Service client is unavailable.");
  }
  return client;
}

async function resolveUniqueSlug(table: "brands" | "categories", id: string, baseSlug: string) {
  const client = requireServiceClient();
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .neq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function serverUpsertCategory(category: Category) {
  const client = requireServiceClient();
  const slug = await resolveUniqueSlug(
    "categories",
    category.id,
    buildEntitySlug({ ...category, prefix: "cat" })
  );
  const { error } = await client.from("categories").upsert({
    id: category.id,
    slug,
    name_ar: category.nameAr,
    name_he: category.nameHe,
    description_ar: category.descriptionAr,
    description_he: category.descriptionHe,
    image_url: category.imageUrl || null,
    active: category.active,
  });
  if (error) throw error;
}

export async function serverUpsertBrand(brand: Brand) {
  const client = requireServiceClient();
  const slug = await resolveUniqueSlug("brands", brand.id, buildEntitySlug({ ...brand, prefix: "brand" }));
  const { error } = await client.from("brands").upsert({
    id: brand.id,
    slug,
    name_ar: brand.nameAr,
    name_he: brand.nameHe,
    description_ar: brand.descriptionAr,
    description_he: brand.descriptionHe,
    logo_url: brand.logoUrl || null,
    active: brand.active,
  });
  if (error) throw error;
}

async function resolveUniqueProductSlug(product: Product) {
  const client = requireServiceClient();
  const baseSlug = buildProductSlug(product);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await client
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .neq("id", product.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureDefaultProductColor(productId: string, defaultStock: number) {
  if (defaultStock <= 0) return;

  const client = requireServiceClient();
  const { count, error: countError } = await client
    .from("product_colors")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  const { error } = await client.from("product_colors").upsert({
    id: `color-default-${productId}`,
    product_id: productId,
    color_name_ar: "افتراضي",
    color_name_he: "ברירת מחדל",
    value: "#d4af37",
    stock_quantity: defaultStock,
  });
  if (error) throw error;
}

export async function serverUpsertProduct(product: Product, options?: { defaultStock?: number }) {
  const client = requireServiceClient();
  const slug = await resolveUniqueProductSlug(product);

  const { error: productError } = await client.from("products").upsert({
    id: product.id,
    slug,
    sku: product.sku,
    category_id: product.categoryId,
    brand_id: product.brandId || null,
    name_ar: product.nameAr,
    name_he: product.nameHe,
    description_ar: product.descriptionAr,
    description_he: product.descriptionHe,
    story_ar: product.storyAr,
    story_he: product.storyHe,
    price: product.price,
    sale_price: product.salePrice ?? null,
    best_seller: product.bestSeller,
    featured: product.featured,
    active: product.active,
    created_at: product.createdAt,
  });
  if (productError) throw productError;

  const { error: deleteImagesError } = await client.from("product_images").delete().eq("product_id", product.id);
  if (deleteImagesError) throw deleteImagesError;

  if (product.images.length) {
    const { error: imagesError } = await client.from("product_images").insert(
      product.images.map((image, index) => ({
        product_id: product.id,
        image_url: image,
        sort_order: index,
      }))
    );
    if (imagesError) throw imagesError;
  }

  if (options?.defaultStock !== undefined) {
    await ensureDefaultProductColor(product.id, options.defaultStock);
  }
}

export async function serverRepairCatalogLinks() {
  const client = requireServiceClient();
  const { data: products, error } = await client.from("products").select("id,slug,sku,name_ar,name_he");
  if (error) throw error;

  for (const row of products ?? []) {
    const product = {
      id: row.id,
      slug: row.slug ?? "",
      sku: row.sku ?? "",
      nameAr: row.name_ar ?? "",
      nameHe: row.name_he ?? "",
    } as Product;

    const nextSlug = await resolveUniqueProductSlug(product);
    if (nextSlug !== row.slug) {
      const { error: updateError } = await client.from("products").update({ slug: nextSlug }).eq("id", row.id);
      if (updateError) throw updateError;
    }

    await ensureDefaultProductColor(row.id, 1);
  }
}

export async function serverUpsertColor(color: ProductColor) {
  const client = requireServiceClient();
  const { error } = await client.from("product_colors").upsert({
    id: color.id,
    product_id: color.productId,
    color_name_ar: color.nameAr,
    color_name_he: color.nameHe,
    value: color.value,
    stock_quantity: color.stockQuantity,
  });
  if (error) throw error;
}

export async function serverUpsertDeliveryZone(zone: DeliveryZone) {
  const client = requireServiceClient();
  const { error } = await client.from("delivery_zones").upsert({
    id: zone.id,
    name_ar: zone.nameAr,
    name_he: zone.nameHe,
    delivery_fee: zone.deliveryFee,
    active: zone.active,
  });
  if (error) throw error;
}

export async function serverUpsertBanner(banner: Banner) {
  const client = requireServiceClient();
  const imageUrls = getBannerImages(banner);
  const basePayload = {
    id: banner.id,
    title_ar: banner.titleAr,
    title_he: banner.titleHe,
    subtitle_ar: banner.subtitleAr,
    subtitle_he: banner.subtitleHe,
    image_url: imageUrls[0] ?? banner.imageUrl,
    active: banner.active,
  };

  let { error } = await client.from("banners").upsert({
    ...basePayload,
    image_urls: imageUrls,
  });

  if (error && /image_urls/i.test(error.message)) {
    ({ error } = await client.from("banners").upsert(basePayload));
  }

  if (error) throw error;
}

export async function serverSaveSettings(settings: StoreSettings) {
  const client = requireServiceClient();
  const { error } = await client.from("store_settings").upsert({
    id: 1,
    store_name: settings.storeName,
    whatsapp_number: settings.whatsappNumber,
    instagram_url: settings.instagramUrl,
    facebook_url: settings.facebookUrl,
    tiktok_url: settings.tiktokUrl,
    email: settings.email,
    address_ar: settings.addressAr,
    address_he: settings.addressHe,
  });
  if (error) throw error;
}

export async function serverDeleteEntity(
  table:
    | "products"
    | "categories"
    | "brands"
    | "product_colors"
    | "delivery_zones"
    | "banners"
    | "orders",
  id: string
) {
  const client = requireServiceClient();
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function serverDeleteBrand(id: string) {
  const client = requireServiceClient();
  const { error: unlinkError } = await client.from("products").update({ brand_id: null }).eq("brand_id", id);
  if (unlinkError) throw unlinkError;

  const { error } = await client.from("brands").delete().eq("id", id);
  if (error) throw error;
}

export async function serverClearCatalogAndOrders() {
  const client = requireServiceClient();
  const steps = [
    client.from("order_items").delete().neq("order_id", "__none__"),
    client.from("orders").delete().neq("id", "__none__"),
    client.from("product_images").delete().neq("product_id", "__none__"),
    client.from("product_colors").delete().neq("id", "__none__"),
    client.from("products").delete().neq("id", "__none__"),
  ] as const;

  for (const step of steps) {
    const { error } = await step;
    if (error) throw error;
  }
}
